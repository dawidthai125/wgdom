/**
 * PAYROLL AKORD Phase 4A — Cloud-authoritative advance cap invariant (pure).
 * SUM(active advances) <= agreedAmount per allocation. No owner override.
 */

import {
  isActivePieceworkAdvance,
  isActivePieceworkAllocation,
  isPieceworkDeleted,
  type PayrollPieceworkState,
  type PieceworkAdvance,
  type PieceworkAllocation,
} from "@/lib/payroll-piecework-types";
import { sumActiveAdvances } from "@/lib/payroll-piecework";

export type PieceworkInvariantViolation = {
  allocationId: string;
  agreedAmount: number;
  activeAdvancesSum: number;
};

export function findPieceworkAdvanceCapViolations(
  state: PayrollPieceworkState,
): PieceworkInvariantViolation[] {
  const out: PieceworkInvariantViolation[] = [];
  for (const alloc of state.allocations) {
    if (!isActivePieceworkAllocation(alloc)) continue;
    const sum = sumActiveAdvances(state.advances, alloc.id);
    if (sum > alloc.agreedAmount) {
      out.push({
        allocationId: alloc.id,
        agreedAmount: alloc.agreedAmount,
        activeAdvancesSum: sum,
      });
    }
  }
  return out;
}

export function assertPieceworkAdvanceCapInvariant(state: PayrollPieceworkState): void {
  const violations = findPieceworkAdvanceCapViolations(state);
  if (violations.length === 0) return;
  const v = violations[0];
  throw new PieceworkInvariantViolatedError(
    v.allocationId,
    v.agreedAmount,
    v.activeAdvancesSum,
  );
}

export class PieceworkInvariantViolatedError extends Error {
  readonly code = "piecework_invariant_violated";
  readonly allocationId: string;
  readonly agreedAmount: number;
  readonly activeAdvancesSum: number;

  constructor(allocationId: string, agreedAmount: number, activeAdvancesSum: number) {
    super(
      `piecework invariant: advances ${activeAdvancesSum} > agreedAmount ${agreedAmount} (allocation ${allocationId})`,
    );
    this.name = "PieceworkInvariantViolatedError";
    this.allocationId = allocationId;
    this.agreedAmount = agreedAmount;
    this.activeAdvancesSum = activeAdvancesSum;
  }
}

/** Same-id live create blocked when any row (incl. tombstone) already holds the id. */
export function pieceworkAdvanceIdAlreadyExists(
  advances: PieceworkAdvance[],
  id: string,
): boolean {
  const want = String(id ?? "").trim();
  if (!want) return false;
  return advances.some((a) => a.id === want);
}

export function isActiveAdvanceRow(a: PieceworkAdvance | null | undefined): boolean {
  return isActivePieceworkAdvance(a);
}

export function isDeletedPieceworkRow(row: { deletedAt?: string } | null | undefined): boolean {
  return isPieceworkDeleted(row);
}

export function listActiveAllocations(state: PayrollPieceworkState): PieceworkAllocation[] {
  return state.allocations.filter((a) => isActivePieceworkAllocation(a));
}
