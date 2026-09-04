/**
 * P0 SETTLEMENT SAFETY — markPaidIfUnpaid (server + client SSOT).
 *
 * After roster merge, enforce:
 * - false → true: allow once (first settle)
 * - true → true: never overwrite settlement metadata (silent keep-prev)
 * - with settlementIntent + already settled: ALREADY_SETTLED (caller returns 409)
 *
 * Unsettle (true → false): out of P0 — left unchanged.
 * Idempotency map ≠ settlement ledger (short-lived KV only).
 */

import { weekEmployeeMergeKey } from "@/lib/payroll-week-employee-merge";

export const PAYROLL_ALREADY_SETTLED_CODE = "payroll_already_settled" as const;

export const SETTLEMENT_IDEMPOTENCY_KV_PREFIX = "kw-payroll-settlement-idem:" as const;

/** Max age for idempotency replay (7d). Not a settlement history ledger. */
export const SETTLEMENT_IDEMPOTENCY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SettlementSliceLike = {
  id?: string;
  directoryId?: string;
  name?: string;
  settled?: boolean;
  settledUpdatedAt?: string;
  payrollSettlement?: unknown;
};

export type SettlementMarkPaidGuardOpts = {
  /** New client: intentional settle write. Old clients omit → silent keep-prev only. */
  settlementIntent?: boolean;
  /** Emp ids (or directoryIds) this settle operation targets. Empty = any settle conflict. */
  settlementTargetEmpIds?: string[];
};

export type SettlementMarkPaidGuardResult =
  | {
      action: "allow";
      roster: SettlementSliceLike[];
      firstSettleCount: number;
      preservedAlreadySettledCount: number;
    }
  | {
      action: "already_settled";
      roster: SettlementSliceLike[];
      conflictEmpIds: string[];
      firstSettleCount: number;
      preservedAlreadySettledCount: number;
    };

export type SettlementIdempotencyRecord = {
  result: "success" | "already_settled";
  empId?: string;
  weekFrom?: string;
  weekTo?: string;
  serverRevision?: number;
  settledUpdatedAt?: string;
  createdAt: number;
};

function settlementBundleEqual(a: SettlementSliceLike, b: SettlementSliceLike): boolean {
  if (Boolean(a.settled) !== Boolean(b.settled)) return false;
  if (String(a.settledUpdatedAt ?? "") !== String(b.settledUpdatedAt ?? "")) return false;
  return JSON.stringify(a.payrollSettlement ?? null) === JSON.stringify(b.payrollSettlement ?? null);
}

function restorePrevSettlement(
  next: SettlementSliceLike,
  prev: SettlementSliceLike,
): SettlementSliceLike {
  return {
    ...next,
    settled: Boolean(prev.settled),
    settledUpdatedAt: prev.settledUpdatedAt,
    payrollSettlement: prev.payrollSettlement,
  };
}

function matchesTarget(
  emp: SettlementSliceLike,
  targets: string[] | undefined,
): boolean {
  if (!targets || targets.length === 0) return true;
  const id = String(emp.id ?? "").trim();
  const dir = String(emp.directoryId ?? "").trim();
  return targets.some((t) => {
    const x = String(t ?? "").trim();
    return (id && x === id) || (dir && x === dir);
  });
}

/**
 * Apply markPaidIfUnpaid semantics onto merged next roster vs prev (Cloud) roster.
 */
export function applySettlementMarkPaidIfUnpaidGuard(
  prevList: unknown[],
  nextList: unknown[],
  opts?: SettlementMarkPaidGuardOpts,
): SettlementMarkPaidGuardResult {
  const prevArr = Array.isArray(prevList) ? prevList : [];
  const nextArr = Array.isArray(nextList) ? nextList : [];
  const prevByKey = new Map<string, SettlementSliceLike>();
  for (const item of prevArr) {
    if (!item || typeof item !== "object") continue;
    const emp = item as SettlementSliceLike;
    prevByKey.set(weekEmployeeMergeKey(emp), emp);
  }

  const intent = opts?.settlementIntent === true;
  const targets = opts?.settlementTargetEmpIds;
  const out: SettlementSliceLike[] = [];
  const conflictEmpIds: string[] = [];
  let firstSettleCount = 0;
  let preservedAlreadySettledCount = 0;

  for (const item of nextArr) {
    if (!item || typeof item !== "object") continue;
    const next = item as SettlementSliceLike;
    const key = weekEmployeeMergeKey(next);
    const prev = prevByKey.get(key);

    if (!prev) {
      out.push(next);
      continue;
    }

    const prevSettled = Boolean(prev.settled);
    const nextSettled = Boolean(next.settled);

    if (prevSettled && nextSettled) {
      preservedAlreadySettledCount += 1;
      const metaChanged = !settlementBundleEqual(prev, next);
      out.push(restorePrevSettlement(next, prev));
      if (intent && matchesTarget(next, targets)) {
        // Targeted settle (or any meta overwrite attempt) against already-settled Cloud.
        if ((targets && targets.length > 0) || metaChanged) {
          const id = String(next.id ?? prev.id ?? "").trim();
          if (id) conflictEmpIds.push(id);
        }
      }
      continue;
    }

    if (!prevSettled && nextSettled) {
      firstSettleCount += 1;
      out.push(next);
      continue;
    }

    // Unsettle / both false — out of P0; keep next as merged.
    out.push(next);
  }

  if (intent && conflictEmpIds.length > 0) {
    return {
      action: "already_settled",
      roster: out,
      conflictEmpIds: [...new Set(conflictEmpIds)],
      firstSettleCount,
      preservedAlreadySettledCount,
    };
  }

  return {
    action: "allow",
    roster: out,
    firstSettleCount,
    preservedAlreadySettledCount,
  };
}

export function settlementIdempotencyKvKey(key: string): string {
  const k = String(key ?? "").trim();
  return `${SETTLEMENT_IDEMPOTENCY_KV_PREFIX}${k}`;
}

export function isUsableSettlementIdempotencyKey(key: unknown): key is string {
  if (typeof key !== "string") return false;
  const k = key.trim();
  return k.length >= 8 && k.length <= 80;
}

export function parseSettlementIdempotencyRecord(raw: unknown): SettlementIdempotencyRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.result !== "success" && o.result !== "already_settled") return null;
  const createdAt = typeof o.createdAt === "number" && Number.isFinite(o.createdAt)
    ? o.createdAt
    : 0;
  if (!createdAt) return null;
  if (Date.now() - createdAt > SETTLEMENT_IDEMPOTENCY_MAX_AGE_MS) return null;
  return {
    result: o.result,
    empId: typeof o.empId === "string" ? o.empId : undefined,
    weekFrom: typeof o.weekFrom === "string" ? o.weekFrom : undefined,
    weekTo: typeof o.weekTo === "string" ? o.weekTo : undefined,
    serverRevision: typeof o.serverRevision === "number" ? o.serverRevision : undefined,
    settledUpdatedAt: typeof o.settledUpdatedAt === "string" ? o.settledUpdatedAt : undefined,
    createdAt,
  };
}

/** Stable UUID for one settle click — reuse across retries. */
export function createSettlementIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `settle-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
