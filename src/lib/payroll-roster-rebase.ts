/**
 * PAYROLL-DI-P0 — rebase local edit intent onto canonical roster after 409.
 * P2 — admin roster rebase uses field-level intent (no whole-employee LWW).
 */

import type { WeekEmployee } from "@/app/app-domain";
import { rebasePayrollFieldIntents } from "@/lib/payroll-field-intent";
import { mergeExtraCostsById } from "@/lib/payroll-extra-costs-merge";

function payrollCoreFieldsEqual(b: WeekEmployee, a: WeekEmployee): boolean {
  return (
    JSON.stringify(b.days) === JSON.stringify(a.days) &&
    JSON.stringify(b.prevSaturday) === JSON.stringify(a.prevSaturday) &&
    b.settled === a.settled &&
    b.rate === a.rate &&
    b.rateUpdatedAt === a.rateUpdatedAt &&
    b.settledUpdatedAt === a.settledUpdatedAt &&
    JSON.stringify(b.payrollSettlement ?? null) === JSON.stringify(a.payrollSettlement ?? null) &&
    JSON.stringify(b.payrollManualAdjustment ?? null) === JSON.stringify(a.payrollManualAdjustment ?? null) &&
    JSON.stringify(b.payrollEarlyPayouts ?? null) === JSON.stringify(a.payrollEarlyPayouts ?? null)
  );
}

/** Worker intent: only extraCosts[] (+ dataUpdatedAt) may differ before→after. */
export function isPayrollExtraCostsOnlyIntent(
  before: WeekEmployee[],
  after: WeekEmployee[],
): boolean {
  if (before.length !== after.length) return false;
  const afterById = new Map(after.map((e) => [e.id, e]));
  for (const b of before) {
    const a = afterById.get(b.id);
    if (!a) return false;
    if (!payrollCoreFieldsEqual(b, a)) return false;
  }
  return true;
}

/**
 * Worker 409 rebase — apply extraCosts intent onto canonical via union-by-id.
 * Never whole-replace after over cloud (would drop peer costs).
 * DELETE LIMITATION: without tombstones, filter-remove may resurrect on merge.
 */
export function rebasePayrollExtraCostsIntent(
  canonical: WeekEmployee[],
  before: WeekEmployee[],
  after: WeekEmployee[],
): WeekEmployee[] {
  const beforeById = new Map(before.map((e) => [e.id, e]));
  const afterById = new Map(after.map((e) => [e.id, e]));

  return canonical.map((canon) => {
    const b = beforeById.get(canon.id);
    const a = afterById.get(canon.id);
    if (!b || !a) return canon;
    if (JSON.stringify(b.extraCosts ?? []) === JSON.stringify(a.extraCosts ?? [])) return canon;
    const baselineOk = JSON.stringify(b.extraCosts ?? []) === JSON.stringify(canon.extraCosts ?? []);
    const nextCosts = baselineOk
      ? (a.extraCosts ?? [])
      : mergeExtraCostsById(a.extraCosts ?? [], canon.extraCosts ?? []);
    return {
      ...canon,
      extraCosts: nextCosts,
      dataUpdatedAt: a.dataUpdatedAt ?? canon.dataUpdatedAt,
    };
  });
}

/**
 * Apply fields user changed (before→after) onto canonical roster from server.
 * P2 — field-level intent SSOT (hours both directions, rate, extraCosts, day slots).
 */
export function rebasePayrollRosterIntent(
  canonical: WeekEmployee[],
  before: WeekEmployee[],
  after: WeekEmployee[],
): WeekEmployee[] {
  return rebasePayrollFieldIntents(canonical, before, after, [], "", "");
}
