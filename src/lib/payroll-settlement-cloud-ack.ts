/**
 * PAYROLL GO3 — client-only settlement → cloud acknowledgement ledger.
 *
 * NOT a KV field. Session memory (+ sessionStorage) so LS settled=true is never
 * treated as proof that cloud write succeeded.
 *
 * States: pending | success | failure (retryable).
 */

import { normalizePayrollSettlement } from "@/lib/payroll-settlement";
import { payrollTraceEmitWritePath } from "@/lib/payroll-runtime-trace";

export type SettlementCloudAckStatus = "pending" | "success" | "failure";

export type SettlementCloudAckEntry = {
  empId: string;
  weekFrom: string;
  weekTo: string;
  settled: boolean;
  settledUpdatedAt: string;
  /** Pre-edit settlement slice — required for idempotent retry intents. */
  beforeSettled: boolean;
  beforeSettledUpdatedAt?: string;
  beforePayrollSettlement?: unknown;
  status: SettlementCloudAckStatus;
  attempts: number;
  lastError?: string;
  updatedAt: number;
};

const SS_KEY = "wg-payroll-settlement-cloud-ack-v1";

type SettlementSlice = {
  id?: string;
  settled?: boolean;
  settledUpdatedAt?: string;
  payrollSettlement?: unknown;
};

let entries: SettlementCloudAckEntry[] = loadEntries();
const listeners = new Set<() => void>();

function loadEntries(): SettlementCloudAckEntry[] {
  try {
    if (typeof sessionStorage === "undefined") return [];
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((e) => e && typeof e === "object" && typeof (e as SettlementCloudAckEntry).empId === "string")
      .map((e) => e as SettlementCloudAckEntry);
  } catch {
    return [];
  }
}

function persist(): void {
  try {
    if (typeof sessionStorage === "undefined") return;
    const keep = entries.filter((e) => e.status === "pending" || e.status === "failure");
    sessionStorage.setItem(SS_KEY, JSON.stringify(keep.slice(-40)));
  } catch {
    /* ignore */
  }
}

function notify(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* ignore */
    }
  }
}

function emitAck(event: string, extra: Record<string, unknown>): void {
  try {
    payrollTraceEmitWritePath(event, "PUSH", "info", extra);
  } catch {
    /* ignore */
  }
}

export function clearSettlementCloudAckForTests(): void {
  entries = [];
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(SS_KEY);
  } catch {
    /* ignore */
  }
  notify();
}

export function subscribeSettlementCloudAck(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function listSettlementCloudAck(): SettlementCloudAckEntry[] {
  return entries.map((e) => ({ ...e }));
}

export function settlementCloudAckSummary(): {
  pending: number;
  failure: number;
  success: number;
  unresolved: number;
} {
  let pending = 0;
  let failure = 0;
  let success = 0;
  for (const e of entries) {
    if (e.status === "pending") pending += 1;
    else if (e.status === "failure") failure += 1;
    else if (e.status === "success") success += 1;
  }
  return { pending, failure, success, unresolved: pending + failure };
}

export function hasUnresolvedSettlementCloudAck(): boolean {
  return entries.some((e) => e.status === "pending" || e.status === "failure");
}

export function listUnresolvedSettlementCloudAcks(): SettlementCloudAckEntry[] {
  return entries.filter((e) => e.status === "pending" || e.status === "failure").map((e) => ({ ...e }));
}

function settlementBundleEqual(a: SettlementSlice, b: SettlementSlice): boolean {
  if (Boolean(a.settled) !== Boolean(b.settled)) return false;
  if (String(a.settledUpdatedAt ?? "") !== String(b.settledUpdatedAt ?? "")) return false;
  return (
    JSON.stringify(normalizePayrollSettlement(a.payrollSettlement) ?? null)
    === JSON.stringify(normalizePayrollSettlement(b.payrollSettlement) ?? null)
  );
}

/** True when any employee settlement triple changed between snapshots. */
export function rosterHasSettlementFieldChange(
  before: SettlementSlice[] | null | undefined,
  after: SettlementSlice[] | null | undefined,
): boolean {
  const b = Array.isArray(before) ? before : [];
  const a = Array.isArray(after) ? after : [];
  const bById = new Map(b.map((e) => [String(e.id ?? ""), e]));
  for (const emp of a) {
    const id = String(emp.id ?? "");
    if (!id) continue;
    const prev = bById.get(id);
    if (!prev) {
      if (emp.settled === true || emp.settledUpdatedAt) return true;
      continue;
    }
    if (!settlementBundleEqual(prev, emp)) return true;
  }
  return false;
}

export function extractSettlementCloudIntents(
  before: SettlementSlice[] | null | undefined,
  after: SettlementSlice[] | null | undefined,
  weekFrom: string,
  weekTo: string,
): Array<{
  empId: string;
  settled: boolean;
  settledUpdatedAt: string;
  beforeSettled: boolean;
  beforeSettledUpdatedAt?: string;
  beforePayrollSettlement?: unknown;
  weekFrom: string;
  weekTo: string;
}> {
  const b = Array.isArray(before) ? before : [];
  const a = Array.isArray(after) ? after : [];
  const bById = new Map(b.map((e) => [String(e.id ?? ""), e]));
  const out: Array<{
    empId: string;
    settled: boolean;
    settledUpdatedAt: string;
    beforeSettled: boolean;
    beforeSettledUpdatedAt?: string;
    beforePayrollSettlement?: unknown;
    weekFrom: string;
    weekTo: string;
  }> = [];
  for (const emp of a) {
    const id = String(emp.id ?? "");
    if (!id) continue;
    const prev = bById.get(id);
    if (prev && settlementBundleEqual(prev, emp)) continue;
    if (!prev && emp.settled !== true && !emp.settledUpdatedAt) continue;
    const settledUpdatedAt = String(emp.settledUpdatedAt ?? "").trim();
    if (!settledUpdatedAt) continue;
    out.push({
      empId: id,
      settled: Boolean(emp.settled),
      settledUpdatedAt,
      beforeSettled: Boolean(prev?.settled),
      beforeSettledUpdatedAt: prev?.settledUpdatedAt,
      beforePayrollSettlement: prev?.payrollSettlement ?? null,
      weekFrom,
      weekTo,
    });
  }
  return out;
}

export function markSettlementCloudPending(
  intents: Array<{
    empId: string;
    settled: boolean;
    settledUpdatedAt: string;
    beforeSettled: boolean;
    beforeSettledUpdatedAt?: string;
    beforePayrollSettlement?: unknown;
    weekFrom: string;
    weekTo: string;
  }>,
): void {
  if (!intents.length) return;
  const now = Date.now();
  for (const intent of intents) {
    const idx = entries.findIndex(
      (e) =>
        e.empId === intent.empId
        && e.weekFrom === intent.weekFrom
        && e.weekTo === intent.weekTo,
    );
    const prev = idx >= 0 ? entries[idx] : null;
    const next: SettlementCloudAckEntry = {
      empId: intent.empId,
      weekFrom: intent.weekFrom,
      weekTo: intent.weekTo,
      settled: intent.settled,
      settledUpdatedAt: intent.settledUpdatedAt,
      beforeSettled: intent.beforeSettled,
      beforeSettledUpdatedAt: intent.beforeSettledUpdatedAt,
      beforePayrollSettlement: intent.beforePayrollSettlement ?? null,
      status: "pending",
      attempts: prev ? prev.attempts : 0,
      updatedAt: now,
    };
    if (idx >= 0) entries[idx] = next;
    else entries.push(next);
  }
  persist();
  notify();
  emitAck("payroll.settlement.cloud_ack.pending", {
    count: intents.length,
    empIds: intents.map((i) => i.empId),
  });
}

/**
 * Rebuild rosterBefore for retry so applySettlementFieldIntent still sees a real edit
 * vs current after (local LS), while baseline aligns with pre-edit / expected cloud.
 */
export function buildSettlementRetryRosterBefore<T extends SettlementSlice>(
  currentRoster: T[],
  weekFrom: string,
  weekTo: string,
): T[] {
  const unresolved = listUnresolvedSettlementCloudAcks().filter(
    (e) => e.weekFrom === weekFrom && e.weekTo === weekTo,
  );
  if (!unresolved.length) return currentRoster.map((e) => ({ ...e }));
  const byId = new Map(unresolved.map((u) => [u.empId, u]));
  return currentRoster.map((emp) => {
    const id = String(emp.id ?? "");
    const u = byId.get(id);
    if (!u) return { ...emp };
    return {
      ...emp,
      settled: u.beforeSettled,
      settledUpdatedAt: u.beforeSettledUpdatedAt,
      payrollSettlement: u.beforePayrollSettlement ?? undefined,
    };
  });
}

export function markSettlementCloudPushAttempt(weekFrom: string, weekTo: string): void {
  const now = Date.now();
  let bumped = 0;
  entries = entries.map((e) => {
    if (e.weekFrom !== weekFrom || e.weekTo !== weekTo) return e;
    if (e.status !== "pending" && e.status !== "failure") return e;
    bumped += 1;
    return { ...e, status: "pending" as const, attempts: e.attempts + 1, updatedAt: now };
  });
  if (bumped > 0) {
    persist();
    notify();
    emitAck("payroll.settlement.cloud_ack.attempt", { count: bumped, weekFrom, weekTo });
  }
}

export function markSettlementCloudSuccess(weekFrom: string, weekTo: string): void {
  const now = Date.now();
  let n = 0;
  entries = entries.map((e) => {
    if (e.weekFrom !== weekFrom || e.weekTo !== weekTo) return e;
    if (e.status !== "pending" && e.status !== "failure") return e;
    n += 1;
    return { ...e, status: "success" as const, lastError: undefined, updatedAt: now };
  });
  // Drop successes from durable session ledger (keep memory briefly via notify).
  entries = entries.filter((e) => e.status !== "success");
  persist();
  notify();
  if (n > 0) {
    emitAck("payroll.settlement.cloud_ack.success", { count: n, weekFrom, weekTo });
  }
}

export function markSettlementCloudFailure(
  weekFrom: string,
  weekTo: string,
  error: string,
): void {
  const now = Date.now();
  const msg = String(error || "cloud_push_failed").slice(0, 240);
  let n = 0;
  entries = entries.map((e) => {
    if (e.weekFrom !== weekFrom || e.weekTo !== weekTo) return e;
    if (e.status !== "pending" && e.status !== "failure") return e;
    n += 1;
    return { ...e, status: "failure" as const, lastError: msg, updatedAt: now };
  });
  persist();
  notify();
  if (n > 0) {
    emitAck("payroll.settlement.cloud_ack.failure", {
      count: n,
      weekFrom,
      weekTo,
      error: msg,
    });
  }
}
