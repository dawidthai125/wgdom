/**
 * PAYROLL — unacked scoped hours-intent ledger (persistent).
 *
 * TYPE A: lifetime/persistence for existing field intents — NOT a sync engine.
 *
 * Survives: settlement, freshness, debounce flush, CAS retry, hard reload (LS).
 * Guard still verifies fromHours vs Cloud, toHours vs outgoing, emp/week/slot.
 *
 * Multi-edit before ACK: preserve original fromHours (Cloud baseline), update toHours.
 * Net-zero reverse (10→9→10): remove entry.
 * TTL: 7 days — expiry discards intent; stale write stays BLOCKED until fresh edit.
 */
import {
  findMatchingEmployee,
  normalizeHoursIntents,
  slotHours,
  type PayrollHoursSlot,
  type PayrollScopedHoursIntent,
} from "@/lib/payroll-hours-intent";
import type { WeekEmployee } from "@/app/app-domain";

export const PAYROLL_HOURS_INTENT_LEDGER_LS_KEY = "kw-payroll-hours-intent-ledger";
export const PAYROLL_HOURS_INTENT_LEDGER_SCHEMA = 1 as const;
/** Owner-approved bounded TTL — not indefinite. */
export const PAYROLL_HOURS_INTENT_LEDGER_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const EPS = 0.05;

export type PayrollHoursIntentLedgerEntry = PayrollScopedHoursIntent & {
  createdAt: number;
  updatedAt: number;
};

type LedgerFile = {
  schema: typeof PAYROLL_HOURS_INTENT_LEDGER_SCHEMA;
  entries: PayrollHoursIntentLedgerEntry[];
};

let ledger: PayrollHoursIntentLedgerEntry[] = [];
let hydrated = false;

function hoursClose(a: number, b: number): boolean {
  return Math.abs(a - b) <= EPS;
}

function intentKey(i: Pick<PayrollScopedHoursIntent, "employeeId" | "directoryId" | "slot" | "weekFrom" | "weekTo">): string {
  return `${i.employeeId}|${i.directoryId ?? ""}|${i.slot}|${i.weekFrom}|${i.weekTo}`;
}

function nowMs(): number {
  return Date.now();
}

function isValidSlot(slot: unknown): slot is PayrollHoursSlot {
  return (
    slot === "prevSaturday"
    || slot === "Pn"
    || slot === "Wt"
    || slot === "Sr"
    || slot === "Cz"
    || slot === "Pt"
    || slot === "So"
  );
}

function sanitizeEntry(raw: unknown, now: number): PayrollHoursIntentLedgerEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!isValidSlot(o.slot)) return null;
  const employeeId = typeof o.employeeId === "string" ? o.employeeId : "";
  if (!employeeId) return null;
  const fromHours = Number(o.fromHours);
  const toHours = Number(o.toHours);
  if (!Number.isFinite(fromHours) || !Number.isFinite(toHours)) return null;
  const weekFrom = typeof o.weekFrom === "string" ? o.weekFrom : "";
  const weekTo = typeof o.weekTo === "string" ? o.weekTo : "";
  const createdAt = typeof o.createdAt === "number" && Number.isFinite(o.createdAt) ? o.createdAt : now;
  const updatedAt = typeof o.updatedAt === "number" && Number.isFinite(o.updatedAt) ? o.updatedAt : createdAt;
  if (now - updatedAt > PAYROLL_HOURS_INTENT_LEDGER_TTL_MS) return null;
  if (now - createdAt > PAYROLL_HOURS_INTENT_LEDGER_TTL_MS) return null;
  return {
    weekFrom,
    weekTo,
    employeeId,
    directoryId: typeof o.directoryId === "string" ? o.directoryId : undefined,
    slot: o.slot,
    fromHours,
    toHours,
    createdAt,
    updatedAt,
  };
}

function persistLedger(): void {
  if (typeof localStorage === "undefined") return;
  try {
    const file: LedgerFile = {
      schema: PAYROLL_HOURS_INTENT_LEDGER_SCHEMA,
      entries: ledger,
    };
    localStorage.setItem(PAYROLL_HOURS_INTENT_LEDGER_LS_KEY, JSON.stringify(file));
  } catch {
    /* quota / private mode — memory ledger still works for session */
  }
}

function pruneExpired(entries: PayrollHoursIntentLedgerEntry[], now: number): PayrollHoursIntentLedgerEntry[] {
  return entries.filter(
    (e) =>
      now - e.updatedAt <= PAYROLL_HOURS_INTENT_LEDGER_TTL_MS
      && now - e.createdAt <= PAYROLL_HOURS_INTENT_LEDGER_TTL_MS,
  );
}

/** Load LS → validate → drop expired/invalid → coalesce by key. */
export function hydratePayrollHoursIntentLedger(now = nowMs()): void {
  hydrated = true;
  if (typeof localStorage === "undefined") {
    ledger = pruneExpired(ledger, now);
    return;
  }
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(PAYROLL_HOURS_INTENT_LEDGER_LS_KEY);
  } catch {
    ledger = [];
    return;
  }
  if (raw == null || raw === "") {
    ledger = [];
    return;
  }
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      ledger = [];
      persistLedger();
      return;
    }
    const file = parsed as Partial<LedgerFile>;
    if (file.schema !== PAYROLL_HOURS_INTENT_LEDGER_SCHEMA || !Array.isArray(file.entries)) {
      ledger = [];
      persistLedger();
      return;
    }
    const map = new Map<string, PayrollHoursIntentLedgerEntry>();
    for (const item of file.entries) {
      const e = sanitizeEntry(item, now);
      if (!e) continue;
      map.set(intentKey(e), e);
    }
    ledger = pruneExpired([...map.values()], now);
    persistLedger();
  } catch {
    ledger = [];
    try {
      localStorage.removeItem(PAYROLL_HOURS_INTENT_LEDGER_LS_KEY);
    } catch { /* ignore */ }
  }
}

function ensureHydrated(): void {
  if (!hydrated) hydratePayrollHoursIntentLedger();
}

function toScoped(e: PayrollHoursIntentLedgerEntry): PayrollScopedHoursIntent {
  return {
    weekFrom: e.weekFrom,
    weekTo: e.weekTo,
    employeeId: e.employeeId,
    directoryId: e.directoryId,
    slot: e.slot,
    fromHours: e.fromHours,
    toHours: e.toHours,
  };
}

/**
 * Register / coalesce fresh edit intents.
 * Unacked chain: keep original fromHours, update toHours.
 * Net-zero vs original baseline: remove.
 */
export function registerPayrollHoursIntents(
  intents?: PayrollScopedHoursIntent[] | null,
): void {
  ensureHydrated();
  const next = normalizeHoursIntents(intents);
  if (next.length === 0) return;
  const now = nowMs();
  const map = new Map<string, PayrollHoursIntentLedgerEntry>();
  for (const e of ledger) map.set(intentKey(e), e);

  for (const intent of next) {
    const key = intentKey(intent);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...intent,
        createdAt: now,
        updatedAt: now,
      });
      continue;
    }
    // Chain before ACK: preserve Cloud baseline (existing.fromHours).
    if (hoursClose(intent.toHours, existing.fromHours)) {
      map.delete(key);
      continue;
    }
    map.set(key, {
      ...existing,
      directoryId: intent.directoryId ?? existing.directoryId,
      toHours: intent.toHours,
      updatedAt: now,
    });
  }

  ledger = pruneExpired([...map.values()], now);
  persistLedger();
}

export function peekPayrollHoursIntentLedger(): PayrollScopedHoursIntent[] {
  ensureHydrated();
  const now = nowMs();
  const pruned = pruneExpired(ledger, now);
  if (pruned.length !== ledger.length) {
    ledger = pruned;
    persistLedger();
  }
  return ledger.map(toScoped);
}

export function mergePayrollHoursIntentsWithLedger(
  intents?: PayrollScopedHoursIntent[] | null,
): PayrollScopedHoursIntent[] {
  registerPayrollHoursIntents(intents);
  return peekPayrollHoursIntentLedger();
}

/**
 * Drop intents whose Cloud slot already equals requested `toHours`
 * after a successful existing Cloud write path.
 * Value-level ACK (documented limitation — not write-id protocol).
 */
export function ackPayrollHoursIntentsAgainstCloud(
  cloud: unknown,
  weekFrom = "",
  weekTo = "",
): void {
  ensureHydrated();
  const cloudList = Array.isArray(cloud) ? (cloud as WeekEmployee[]) : [];
  if (cloudList.length === 0 || ledger.length === 0) return;
  const wf = String(weekFrom ?? "").trim();
  const wt = String(weekTo ?? "").trim();
  const before = ledger.length;
  ledger = ledger.filter((intent) => {
    if (wf && intent.weekFrom && intent.weekFrom !== wf) return true;
    if (wt && intent.weekTo && intent.weekTo !== wt) return true;
    const emp = findMatchingEmployee(cloudList, {
      id: intent.employeeId,
      directoryId: intent.directoryId,
    });
    if (!emp) return true;
    const cloudH = slotHours(emp, intent.slot);
    if (hoursClose(cloudH, intent.toHours)) return false;
    return true;
  });
  if (ledger.length !== before) persistLedger();
}

/** Test helper — clear memory + LS. */
export function resetPayrollHoursIntentLedgerForTests(): void {
  ledger = [];
  hydrated = true;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.removeItem(PAYROLL_HOURS_INTENT_LEDGER_LS_KEY);
    } catch { /* ignore */ }
  }
}

/** Test helper — force re-read from LS (simulates reload). */
export function rehydratePayrollHoursIntentLedgerForTests(): void {
  hydrated = false;
  ledger = [];
  hydratePayrollHoursIntentLedger();
}
