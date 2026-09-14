/**
 * PAYROLL AKORD — piecework balance vs weekly payout contribution.
 *
 * BALANCE (informational): Σ remaining = agreed − active advances (all time).
 * WEEKLY PAYOUT: Σ active advances whose paidAt falls in the payroll week.
 * Remaining must NEVER enter weekly / Saturday / settlement payable.
 */

import { remainingForAllocation } from "@/lib/payroll-piecework";
import {
  emptyPayrollPieceworkState,
  isActivePieceworkAdvance,
  isActivePieceworkAllocation,
  isPieceworkDeleted,
  normalizePayrollPieceworkState,
  type PayrollPieceworkState,
  type PieceworkAdvance,
  type PieceworkAllocation,
} from "@/lib/payroll-piecework-types";

export type AkordAllocationBreakdownRow = {
  allocationId: string;
  pieceworkJobId: string;
  jobId: string | null;
  jobStatus: "active" | "closed" | null;
  agreedAmount: number;
  activeAdvancesSum: number;
  remaining: number;
};

export type AkordPayableBreakdown = {
  directoryId: string;
  /** Σ remaining — AKORD balance, NOT weekly payout. */
  payable: number;
  allocations: AkordAllocationBreakdownRow[];
};

function activeAdvancesSum(advances: PieceworkAdvance[], allocationId: string): number {
  let sum = 0;
  for (const a of advances) {
    if (isPieceworkDeleted(a)) continue;
    if (a.allocationId !== allocationId) continue;
    if (!(a.amount > 0)) continue;
    sum += a.amount;
  }
  return +sum.toFixed(2);
}

/** ISO date YYYY-MM-DD from paidAt (datetime or date). */
export function pieceworkAdvancePaidDay(paidAt: string | undefined): string {
  const s = String(paidAt ?? "").trim();
  if (s.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return "";
}

/**
 * Advance belongs to payroll week when paidAt (date) is within [weekFrom, weekTo],
 * or when advance.weekFrom/weekTo exactly match the payroll range.
 */
export function isPieceworkAdvanceInPayrollWeek(
  advance: PieceworkAdvance,
  weekFrom: string,
  weekTo: string,
): boolean {
  const from = String(weekFrom ?? "").trim();
  const to = String(weekTo ?? "").trim();
  if (!from || !to) return false;
  const awf = String(advance.weekFrom ?? "").trim();
  const awt = String(advance.weekTo ?? "").trim();
  if (awf && awt && awf === from && awt === to) return true;
  const day = pieceworkAdvancePaidDay(advance.paidAt);
  if (!day) return false;
  return day >= from && day <= to;
}

/**
 * Pure SSOT balance: sum of remaining across active allocations.
 * Informational only — not weekly payable.
 */
export function resolveAkordPayable(
  directoryId: string,
  pieceworkState: PayrollPieceworkState | null | undefined,
): number {
  return resolveAkordAllocationBreakdown(directoryId, pieceworkState).payable;
}

/** Alias — balance / „pozostało z akordu”. */
export function resolveAkordBalance(
  directoryId: string,
  pieceworkState: PayrollPieceworkState | null | undefined,
): number {
  return resolveAkordPayable(directoryId, pieceworkState);
}

/**
 * Weekly AKORD payout contribution = sum of active advances in this payroll week.
 * Previous-week advances do not enter current weekly payable.
 */
export function resolveAkordWeekAdvances(
  directoryId: string,
  pieceworkState: PayrollPieceworkState | null | undefined,
  weekFrom: string,
  weekTo: string,
): number {
  const dir = String(directoryId ?? "").trim();
  const state = normalizePayrollPieceworkState(pieceworkState ?? emptyPayrollPieceworkState());
  if (!dir) return 0;
  const allocIds = new Set(
    state.allocations
      .filter((a) => isActivePieceworkAllocation(a) && a.directoryId === dir)
      .map((a) => a.id),
  );
  let sum = 0;
  for (const adv of state.advances) {
    if (!isActivePieceworkAdvance(adv)) continue;
    if (!allocIds.has(adv.allocationId)) continue;
    if (!(adv.amount > 0)) continue;
    if (!isPieceworkAdvanceInPayrollWeek(adv, weekFrom, weekTo)) continue;
    sum += adv.amount;
  }
  return +sum.toFixed(2);
}

export function resolveAkordAllocationBreakdown(
  directoryId: string,
  pieceworkState: PayrollPieceworkState | null | undefined,
): AkordPayableBreakdown {
  const dir = String(directoryId ?? "").trim();
  const state = normalizePayrollPieceworkState(pieceworkState ?? emptyPayrollPieceworkState());
  if (!dir) {
    return { directoryId: dir, payable: 0, allocations: [] };
  }

  const jobById = new Map(state.jobs.map((j) => [j.id, j]));
  const rows: AkordAllocationBreakdownRow[] = [];
  let payable = 0;

  for (const alloc of state.allocations) {
    if (!isActivePieceworkAllocation(alloc)) continue;
    if (alloc.directoryId !== dir) continue;

    const rem = remainingForAllocation(alloc, state.advances);
    const advSum = activeAdvancesSum(state.advances, alloc.id);
    const job = jobById.get(alloc.pieceworkJobId);
    const jobLive = job && !isPieceworkDeleted(job) ? job : null;

    rows.push({
      allocationId: alloc.id,
      pieceworkJobId: alloc.pieceworkJobId,
      jobId: jobLive?.jobId ?? null,
      jobStatus: jobLive ? (jobLive.status === "closed" ? "closed" : "active") : null,
      agreedAmount: alloc.agreedAmount,
      activeAdvancesSum: advSum,
      remaining: rem,
    });
    payable += rem;
  }

  return {
    directoryId: dir,
    payable: +payable.toFixed(2),
    allocations: rows,
  };
}

/** Active allocations only (helper for UI later). */
export function listActiveAllocationsForDirectory(
  directoryId: string,
  pieceworkState: PayrollPieceworkState | null | undefined,
): PieceworkAllocation[] {
  const dir = String(directoryId ?? "").trim();
  const state = normalizePayrollPieceworkState(pieceworkState ?? emptyPayrollPieceworkState());
  if (!dir) return [];
  return state.allocations.filter(
    (a) => isActivePieceworkAllocation(a) && a.directoryId === dir,
  );
}
