/**
 * PAYROLL AKORD Phase 4A — server write preparation (pure).
 * Merge Cloud ∪ incoming (Phase 2) then hard-block advance cap.
 */

import { mergePayrollPieceworkState } from "@/lib/payroll-piecework-merge";
import {
  assertPieceworkAdvanceCapInvariant,
  findPieceworkAdvanceCapViolations,
  PieceworkInvariantViolatedError,
} from "@/lib/payroll-piecework-invariant";
import {
  normalizePayrollPieceworkState,
  type PayrollPieceworkState,
} from "@/lib/payroll-piecework-types";

export type PieceworkServerCasPrepareResult =
  | { ok: true; state: PayrollPieceworkState }
  | {
      ok: false;
      code: "piecework_invariant_violated";
      violations: ReturnType<typeof findPieceworkAdvanceCapViolations>;
      state: PayrollPieceworkState;
    };

/**
 * Edge / test SSOT: merge current Cloud with proposed blob, then invariant.
 * Does not touch revision — caller owns CAS revision check.
 */
export function preparePieceworkServerWrite(
  cloudCurrent: unknown,
  incomingProposed: unknown,
): PieceworkServerCasPrepareResult {
  const merged = mergePayrollPieceworkState(cloudCurrent, incomingProposed);
  const violations = findPieceworkAdvanceCapViolations(merged);
  if (violations.length > 0) {
    return { ok: false, code: "piecework_invariant_violated", violations, state: merged };
  }
  return { ok: true, state: merged };
}

export function preparePieceworkServerWriteOrThrow(
  cloudCurrent: unknown,
  incomingProposed: unknown,
): PayrollPieceworkState {
  const r = preparePieceworkServerWrite(cloudCurrent, incomingProposed);
  if (!r.ok) {
    const v = r.violations[0];
    throw new PieceworkInvariantViolatedError(
      v.allocationId,
      v.agreedAmount,
      v.activeAdvancesSum,
    );
  }
  assertPieceworkAdvanceCapInvariant(r.state);
  return normalizePayrollPieceworkState(r.state);
}
