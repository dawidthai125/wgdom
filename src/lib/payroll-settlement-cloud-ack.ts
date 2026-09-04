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
  /** P0 — stable across retries for the same settle click. */
  settlementIdempotencyKey?: string;
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

/**
 * GO8.2 — empIds whose settlement write is not cloud-confirmed (pending | failure).
 * Week bounds filter only when both are provided (rebase callers pass "").
 * Union with explicit ids so callers/tests can inject without touching the ledger.
 */
export function resolveUnresolvedSettlementAckEmpIds(
  extra?: Set<string> | null,
  weekFrom?: string,
  weekTo?: string,
): Set<string> {
  const wf = String(weekFrom ?? "").trim();
  const wt = String(weekTo ?? "").trim();
  const out = new Set<string>();
  for (const e of entries) {
    if (e.status !== "pending" && e.status !== "failure") continue;
    if (wf && wt && (e.weekFrom !== wf || e.weekTo !== wt)) continue;
    const id = String(e.empId ?? "").trim();
    if (id) out.add(id);
  }
  if (extra) {
    for (const id of extra) {
      const trimmed = String(id ?? "").trim();
      if (trimmed) out.add(trimmed);
    }
  }
  return out;
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
    settlementIdempotencyKey?: string;
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
      // Preserve key across retries; only assign new when first pending.
      settlementIdempotencyKey:
        intent.settlementIdempotencyKey
        || prev?.settlementIdempotencyKey
        || undefined,
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

/** Resolve stable idempotency key for settle targets (reuse pending ACK keys). */
export function resolveSettlementIdempotencyKeysForTargets(
  empIds: string[],
  weekFrom: string,
  weekTo: string,
  createKey: () => string,
): { key: string; targetEmpIds: string[] } {
  const targets = [...new Set(empIds.map((id) => String(id ?? "").trim()).filter(Boolean))];
  if (targets.length === 0) {
    return { key: createKey(), targetEmpIds: [] };
  }
  for (const empId of targets) {
    const existing = entries.find(
      (e) =>
        e.empId === empId
        && e.weekFrom === weekFrom
        && e.weekTo === weekTo
        && (e.status === "pending" || e.status === "failure")
        && e.settlementIdempotencyKey,
    );
    if (existing?.settlementIdempotencyKey) {
      return { key: existing.settlementIdempotencyKey, targetEmpIds: targets };
    }
  }
  return { key: createKey(), targetEmpIds: targets };
}

/** Mark unresolved settle ACK as terminal already-settled (no retry with new key). */
export function markSettlementCloudAlreadySettled(
  weekFrom: string,
  weekTo: string,
  message = "already_settled",
): void {
  const now = Date.now();
  let hit = 0;
  entries = entries.map((e) => {
    if (e.weekFrom !== weekFrom || e.weekTo !== weekTo) return e;
    if (e.status !== "pending" && e.status !== "failure") return e;
    if (e.settled !== true) return e;
    hit += 1;
    return {
      ...e,
      status: "failure" as const,
      lastError: message,
      updatedAt: now,
    };
  });
  if (hit > 0) {
    persist();
    notify();
    emitAck("payroll.settlement.cloud_ack.already_settled", { count: hit, weekFrom, weekTo });
  }
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

/** GO4 — fail-loud message when push 2xx but settlement missing from outgoing. */
export const PAYROLL_SETTLEMENT_OUTGOING_MISMATCH =
  "Rozliczenie nie zostało potwierdzone w wyniku zapisu (outgoing bez oczekiwanego settlement).";

export type SettlementOutgoingAssertOk = { ok: true; checked: number };
export type SettlementOutgoingAssertFail = {
  ok: false;
  reason: string;
  empId?: string;
  expected?: {
    settled: boolean;
    settledUpdatedAt: string;
    payrollSettlement: unknown;
  };
  actual?: {
    settled: boolean;
    settledUpdatedAt: string | null;
    payrollSettlement: unknown;
  };
};

/**
 * GO4 — verify settlement intents from before→after actually appear on outgoing roster
 * returned by pwrPush (Cloud ⊕ intents). Prevents false-success when baselineOk no-ops.
 */
export function assertSettlementIntentsPresentInRoster(params: {
  intentBefore: SettlementSlice[] | null | undefined;
  intentAfter: SettlementSlice[] | null | undefined;
  outgoingRoster: SettlementSlice[] | null | undefined;
}): SettlementOutgoingAssertOk | SettlementOutgoingAssertFail {
  const intents = extractSettlementCloudIntents(
    params.intentBefore,
    params.intentAfter,
    "",
    "",
  );
  if (intents.length === 0) {
    return { ok: true, checked: 0 };
  }
  const afterById = new Map(
    (Array.isArray(params.intentAfter) ? params.intentAfter : []).map((e) => [
      String(e.id ?? ""),
      e,
    ]),
  );
  const outById = new Map(
    (Array.isArray(params.outgoingRoster) ? params.outgoingRoster : []).map((e) => [
      String(e.id ?? ""),
      e,
    ]),
  );

  for (const intent of intents) {
    const afterEmp = afterById.get(intent.empId);
    const outEmp = outById.get(intent.empId);
    const expectedMeta = normalizePayrollSettlement(afterEmp?.payrollSettlement);
    const expected = {
      settled: intent.settled,
      settledUpdatedAt: intent.settledUpdatedAt,
      payrollSettlement: expectedMeta ?? null,
    };

    if (!outEmp) {
      return {
        ok: false,
        reason: "outgoing_missing_employee",
        empId: intent.empId,
        expected,
      };
    }

    const actualSettled = Boolean(outEmp.settled);
    const actualAt = String(outEmp.settledUpdatedAt ?? "").trim();
    const actualMeta = normalizePayrollSettlement(outEmp.payrollSettlement) ?? null;

    if (actualSettled !== expected.settled) {
      return {
        ok: false,
        reason: "outgoing_settled_mismatch",
        empId: intent.empId,
        expected,
        actual: {
          settled: actualSettled,
          settledUpdatedAt: actualAt || null,
          payrollSettlement: actualMeta,
        },
      };
    }
    if (actualAt !== expected.settledUpdatedAt) {
      return {
        ok: false,
        reason: "outgoing_settledUpdatedAt_mismatch",
        empId: intent.empId,
        expected,
        actual: {
          settled: actualSettled,
          settledUpdatedAt: actualAt || null,
          payrollSettlement: actualMeta,
        },
      };
    }
    if (JSON.stringify(actualMeta) !== JSON.stringify(expected.payrollSettlement)) {
      return {
        ok: false,
        reason: "outgoing_payrollSettlement_mismatch",
        empId: intent.empId,
        expected,
        actual: {
          settled: actualSettled,
          settledUpdatedAt: actualAt || null,
          payrollSettlement: actualMeta,
        },
      };
    }
  }

  return { ok: true, checked: intents.length };
}

/**
 * GO4 — mark success only when outgoing confirms settlement intents; else failure.
 */
export function finalizeSettlementCloudAckAfterPush(params: {
  weekFrom: string;
  weekTo: string;
  intentBefore: SettlementSlice[] | null | undefined;
  intentAfter: SettlementSlice[] | null | undefined;
  outgoingRoster: SettlementSlice[] | null | undefined;
}): SettlementOutgoingAssertOk | SettlementOutgoingAssertFail {
  const asserted = assertSettlementIntentsPresentInRoster(params);
  if (asserted.ok) {
    markSettlementCloudSuccess(params.weekFrom, params.weekTo);
    return asserted;
  }
  const detail = [
    asserted.reason,
    asserted.empId ? `emp=${asserted.empId}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  markSettlementCloudFailure(
    params.weekFrom,
    params.weekTo,
    `${PAYROLL_SETTLEMENT_OUTGOING_MISMATCH} (${detail})`,
  );
  return asserted;
}
