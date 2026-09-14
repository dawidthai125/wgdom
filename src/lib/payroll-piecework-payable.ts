/**
 * PAYROLL AKORD Phase 4B — pure payable from durable piecework (no side effects).
 *
 * AKORD_BASE_PAYABLE = Σ max(0, agreedAmount − Σ active advances)
 * per active allocation for directoryId.
 *
 * Job.status (active/closed) does NOT zero remaining — weekly settlement ≠ job status.
 */

import { remainingForAllocation } from "@/lib/payroll-piecework";
import {
  emptyPayrollPieceworkState,
  isActivePieceworkAllocation,
  isPieceworkDeleted,
  normalizePayrollPieceworkState,
  type PayrollPieceworkState,
  type PieceworkAllocation,
  type PieceworkAdvance,
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

/**
 * Pure SSOT: sum of remaining across all active allocations for an employee.
 * Closed PieceworkJob still contributes remaining (independent of weekly settlement).
 */
export function resolveAkordPayable(
  directoryId: string,
  pieceworkState: PayrollPieceworkState | null | undefined,
): number {
  return resolveAkordAllocationBreakdown(directoryId, pieceworkState).payable;
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
