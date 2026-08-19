/**
 * PAYROLL-DI-P0 — rebase local edit intent onto canonical roster after 409.
 */

import type { WeekEmployee } from "@/app/app-domain";
import { weekEmployeeMergeKey } from "@/lib/payroll-week-employee-merge";
import { mergeWeekEmployeeRecord } from "@/lib/payroll-week-employee-record-merge";

function weekEmployeesSamePerson(
  a: { id?: string; directoryId?: string; name?: string },
  b: { id?: string; directoryId?: string; name?: string },
): boolean {
  if (a.id && b.id && a.id === b.id) return true;
  return weekEmployeeMergeKey(a) === weekEmployeeMergeKey(b);
}

function empChanged(before: WeekEmployee, after: WeekEmployee): boolean {
  return JSON.stringify(before) !== JSON.stringify(after);
}

function payrollCoreFieldsEqual(b: WeekEmployee, a: WeekEmployee): boolean {
  return (
    JSON.stringify(b.days) === JSON.stringify(a.days) &&
    JSON.stringify(b.prevSaturday) === JSON.stringify(a.prevSaturday) &&
    b.settled === a.settled &&
    b.rate === a.rate &&
    b.rateUpdatedAt === a.rateUpdatedAt &&
    b.settledUpdatedAt === a.settledUpdatedAt
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
 * Worker 409 rebase — apply only extraCosts intent onto canonical roster.
 * Never merge full after record (stale days/settled/rate must not win).
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
    return {
      ...canon,
      extraCosts: a.extraCosts ?? [],
      dataUpdatedAt: a.dataUpdatedAt ?? canon.dataUpdatedAt,
    };
  });
}

/**
 * Apply fields user changed (before→after) onto canonical roster from server.
 * Unchanged employees stay canonical; changed employees merge intent via SSOT.
 */
export function rebasePayrollRosterIntent(
  canonical: WeekEmployee[],
  before: WeekEmployee[],
  after: WeekEmployee[],
): WeekEmployee[] {
  const beforeById = new Map(before.map((e) => [e.id, e]));
  const afterById = new Map(after.map((e) => [e.id, e]));
  const canonicalById = new Map(canonical.map((e) => [e.id, e]));

  const out: WeekEmployee[] = [];
  const seen = new Set<string>();

  for (const canon of canonical) {
    seen.add(canon.id);
    const b = beforeById.get(canon.id);
    const a = afterById.get(canon.id);
    if (b && a && empChanged(b, a)) {
      const merged = mergeWeekEmployeeRecord(canon, a) as WeekEmployee;
      out.push(merged);
    } else {
      out.push(canon);
    }
  }

  for (const a of after) {
    if (seen.has(a.id)) continue;
    const b = beforeById.get(a.id);
    if (!b) {
      out.push(a);
      continue;
    }
    if (empChanged(b, a)) {
      const existing = [...out].find((e) => weekEmployeesSamePerson(e, a));
      if (existing) {
        const idx = out.indexOf(existing);
        out[idx] = mergeWeekEmployeeRecord(existing, a) as WeekEmployee;
      } else {
        out.push(a);
      }
    }
  }

  return out;
}
