/**
 * PAYROLL — biweekly early / partial payout (transactions).
 * SSOT helpers: periodKey, active txs, remaining, overpayment block.
 * Edge FROZEN — FE-only in this phase.
 *
 * Types live in payroll-early-payout-types (no cycle import).
 * Period collection lives in payroll-cycle (avoids ESM cycle).
 */

import type { WeekEmployee, WeekSnapshot } from "@/app/app-domain";
import {
  biweeklyAnchorFor,
  biweeklyPeriodWeekRanges,
  calcWeekNetNoPrevSat,
  findWeekEmployeeInArchive,
  getActiveEarlyPayoutsForPeriod,
  getBiweeklyPeriodKey,
  getEarlyPaidForPeriod,
  isBiweeklyPayrollEmployee,
  nextBiweeklyPayoutSaturday,
  type DirectoryPayrollRef,
  type WeekEmpPayrollInput,
} from "@/lib/payroll-cycle";
import {
  isActiveEarlyPayout,
  normalizeEarlyPayoutList,
  type PayrollEarlyPayout,
  type PayrollEarlyPayoutMethod,
} from "@/lib/payroll-early-payout-types";

export type { PayrollEarlyPayout, PayrollEarlyPayoutMethod };
export {
  isActiveEarlyPayout,
  normalizeEarlyPayoutList,
};
export {
  biweeklyPeriodWeekRanges,
  getActiveEarlyPayoutsForPeriod,
  getBiweeklyPeriodKey,
  getEarlyPaidForPeriod,
};

export type CalcWeekNetFn = (emp: WeekEmpPayrollInput, from: string, to: string) => number;

/** Earned so far in period (W1 only on accrual week; W1+W2 on payout week). */
export function getBiweeklyPeriodEarnedSoFar(
  emp: WeekEmpPayrollInput,
  directory: DirectoryPayrollRef[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekSnapshot[],
  calcWeekNet: CalcWeekNetFn = (e) => calcWeekNetNoPrevSat(e).netPay,
): {
  periodKey: string | null;
  isPayoutWeek: boolean;
  week1Earned: number;
  week2Earned: number;
  earnedSoFar: number;
  periodPayable: number;
} {
  const periodKey = getBiweeklyPeriodKey(emp, directory, weekTo);
  if (!periodKey) {
    return {
      periodKey: null,
      isPayoutWeek: false,
      week1Earned: 0,
      week2Earned: 0,
      earnedSoFar: 0,
      periodPayable: 0,
    };
  }
  const { accrual, payout } = biweeklyPeriodWeekRanges(periodKey);
  const isPayoutWeek = weekTo === periodKey;

  let week1Earned = 0;
  let week2Earned = 0;

  if (isPayoutWeek) {
    week2Earned = calcWeekNet(emp, weekFrom, weekTo);
    const prevEmp = findWeekEmployeeInArchive(savedWeeks, accrual.from, accrual.to, emp);
    week1Earned = prevEmp ? calcWeekNet(prevEmp, accrual.from, accrual.to) : 0;
  } else if (weekFrom === accrual.from && weekTo === accrual.to) {
    week1Earned = calcWeekNet(emp, weekFrom, weekTo);
    week2Earned = 0;
  } else {
    week1Earned = calcWeekNet(emp, weekFrom, weekTo);
  }

  const earnedSoFar = +(week1Earned + (isPayoutWeek ? week2Earned : 0)).toFixed(2);
  const periodPayable = isPayoutWeek
    ? +(week1Earned + week2Earned).toFixed(2)
    : earnedSoFar;

  return {
    periodKey,
    isPayoutWeek,
    week1Earned: +week1Earned.toFixed(2),
    week2Earned: +week2Earned.toFixed(2),
    earnedSoFar,
    periodPayable,
  };
}

export function getBiweeklyRemainingPayable(
  emp: WeekEmpPayrollInput & Pick<WeekEmployee, "payrollEarlyPayouts">,
  directory: DirectoryPayrollRef[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekSnapshot[],
  calcWeekNet?: CalcWeekNetFn,
): {
  periodKey: string | null;
  isPayoutWeek: boolean;
  earnedSoFar: number;
  periodPayable: number;
  earlyPaid: number;
  earlyCash: number;
  earlyTransfer: number;
  remaining: number;
  txs: PayrollEarlyPayout[];
  week1Earned: number;
  week2Earned: number;
} {
  const earned = getBiweeklyPeriodEarnedSoFar(emp, directory, weekFrom, weekTo, savedWeeks, calcWeekNet);
  if (!earned.periodKey) {
    return {
      periodKey: null,
      isPayoutWeek: false,
      earnedSoFar: 0,
      periodPayable: 0,
      earlyPaid: 0,
      earlyCash: 0,
      earlyTransfer: 0,
      remaining: 0,
      txs: [],
      week1Earned: 0,
      week2Earned: 0,
    };
  }
  const early = getEarlyPaidForPeriod(emp, directory, weekFrom, weekTo, savedWeeks, earned.periodKey);
  const base = earned.isPayoutWeek ? earned.periodPayable : earned.earnedSoFar;
  const remaining = Math.max(0, +(base - early.total).toFixed(2));
  return {
    periodKey: earned.periodKey,
    isPayoutWeek: earned.isPayoutWeek,
    earnedSoFar: earned.earnedSoFar,
    periodPayable: earned.periodPayable,
    earlyPaid: early.total,
    earlyCash: early.cash,
    earlyTransfer: early.transfer,
    remaining,
    txs: early.txs,
    week1Earned: earned.week1Earned,
    week2Earned: earned.week2Earned,
  };
}

export function validateNewEarlyPayoutAmount(
  amount: number,
  remainingAvailable: number,
): { ok: true } | { ok: false; reason: "invalid_amount" | "overpayment" } {
  if (!(typeof amount === "number" && Number.isFinite(amount) && amount > 0)) {
    return { ok: false, reason: "invalid_amount" };
  }
  if (+amount.toFixed(2) - remainingAvailable > 0.001) {
    return { ok: false, reason: "overpayment" };
  }
  return { ok: true };
}

/**
 * Domain write-path gate: active early total for current periodKey must not exceed earnedSoFar.
 * Soft-deletes / reductions always OK. Weekly employees must not receive active early txs.
 */
export function validateEarlyPayoutListWrite(
  emp: WeekEmpPayrollInput & Pick<WeekEmployee, "payrollEarlyPayouts">,
  directory: DirectoryPayrollRef[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekSnapshot[],
  nextList: unknown,
  calcWeekNet?: CalcWeekNetFn,
): { ok: true } | { ok: false; reason: "overpayment" | "not_biweekly" | "invalid_list" } {
  const next = normalizeEarlyPayoutList(nextList);
  const biweekly = isBiweeklyPayrollEmployee(emp, directory);
  const nextActiveAny = next.filter(isActiveEarlyPayout);
  if (!biweekly) {
    if (nextActiveAny.length > 0) return { ok: false, reason: "not_biweekly" };
    return { ok: true };
  }

  const earned = getBiweeklyPeriodEarnedSoFar(emp, directory, weekFrom, weekTo, savedWeeks, calcWeekNet);
  if (!earned.periodKey) {
    if (nextActiveAny.length > 0) return { ok: false, reason: "not_biweekly" };
    return { ok: true };
  }

  const nextActiveForPeriod = nextActiveAny.filter((tx) => tx.periodKey === earned.periodKey);
  const nextPaid = +nextActiveForPeriod.reduce((s, tx) => s + tx.amount, 0).toFixed(2);
  const cap = earned.earnedSoFar;
  if (nextPaid - cap > 0.001) {
    return { ok: false, reason: "overpayment" };
  }
  return { ok: true };
}

export function canModifyEarlyPayoutsForWeek(
  isClosedWeek: boolean,
  periodKey: string | null,
  weekTo: string,
): { ok: true } | { ok: false; reason: "closed_week" | "closed_period" } {
  if (isClosedWeek) return { ok: false, reason: "closed_week" };
  void periodKey;
  void weekTo;
  return { ok: true };
}

export function hasActiveEarlyPayoutsInOpenPeriod(
  emp: Pick<WeekEmployee, "directoryId" | "name" | "payrollEarlyPayouts">,
  directory: DirectoryPayrollRef[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekSnapshot[],
): boolean {
  const pk = getBiweeklyPeriodKey(emp, directory, weekTo);
  if (!pk) return false;
  return getActiveEarlyPayoutsForPeriod(emp, directory, weekFrom, weekTo, savedWeeks, pk).length > 0;
}

export function canChangeBiweeklyAnchor(
  directoryId: string,
  weekEmployees: WeekEmployee[],
  directory: DirectoryPayrollRef[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekSnapshot[],
): { ok: true } | { ok: false; reason: "active_early_payouts" } {
  const matches = weekEmployees.filter((e) => e.directoryId === directoryId);
  for (const emp of matches) {
    if (!isBiweeklyPayrollEmployee(emp, directory)) continue;
    if (hasActiveEarlyPayoutsInOpenPeriod(emp, directory, weekFrom, weekTo, savedWeeks)) {
      return { ok: false, reason: "active_early_payouts" };
    }
  }
  for (const emp of matches) {
    const pk = getBiweeklyPeriodKey(emp, directory, weekTo);
    if (!pk) continue;
    const early = getEarlyPaidForPeriod(emp, directory, weekFrom, weekTo, savedWeeks, pk);
    if (early.total > 0) return { ok: false, reason: "active_early_payouts" };
  }
  return { ok: true };
}

/** Merge early payout lists for P2: cloud base + ADD/DELETE intents from before→after. */
export function applyEarlyPayoutFieldIntent(
  cloudList: unknown,
  beforeList: unknown,
  afterList: unknown,
): { list: PayrollEarlyPayout[]; changed: boolean } {
  const cloud = normalizeEarlyPayoutList(cloudList);
  const before = normalizeEarlyPayoutList(beforeList);
  const after = normalizeEarlyPayoutList(afterList);
  const byId = new Map(cloud.map((t) => [t.id, { ...t }]));
  let changed = false;

  const beforeById = new Map(before.map((t) => [t.id, t]));
  const afterById = new Map(after.map((t) => [t.id, t]));

  for (const [id, afterTx] of afterById) {
    const beforeTx = beforeById.get(id);
    const cloudTx = byId.get(id);

    if (!beforeTx) {
      if (!cloudTx) {
        byId.set(id, { ...afterTx });
        changed = true;
      } else if (cloudTx.deletedAt && !afterTx.deletedAt) {
        // do not resurrect
      }
      continue;
    }

    const beforeDeleted = Boolean(beforeTx.deletedAt);
    const afterDeleted = Boolean(afterTx.deletedAt);
    if (!beforeDeleted && afterDeleted) {
      const baselineOk =
        cloudTx
        && !cloudTx.deletedAt
        && Math.abs(cloudTx.amount - beforeTx.amount) < 0.001
        && cloudTx.updatedAt === beforeTx.updatedAt;
      if (baselineOk || (!cloudTx && !beforeDeleted)) {
        byId.set(id, { ...(cloudTx ?? beforeTx), ...afterTx, deletedAt: afterTx.deletedAt });
        changed = true;
      }
      continue;
    }
  }

  for (const [id, beforeTx] of beforeById) {
    if (afterById.has(id)) continue;
    if (beforeTx.deletedAt) continue;
    const cloudTx = byId.get(id);
    const baselineOk =
      cloudTx
      && !cloudTx.deletedAt
      && Math.abs(cloudTx.amount - beforeTx.amount) < 0.001
      && cloudTx.updatedAt === beforeTx.updatedAt;
    if (baselineOk && cloudTx) {
      byId.set(id, { ...cloudTx, deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      changed = true;
    }
  }

  const list = [...byId.values()];
  if (!changed && JSON.stringify(normalizeEarlyPayoutList(list)) !== JSON.stringify(cloud)) {
    changed = true;
  }
  return { list, changed };
}

export function softDeleteEarlyPayout(
  list: PayrollEarlyPayout[] | undefined,
  txId: string,
  nowIso = new Date().toISOString(),
): PayrollEarlyPayout[] {
  const normalized = normalizeEarlyPayoutList(list);
  return normalized.map((tx) =>
    tx.id === txId && !tx.deletedAt
      ? { ...tx, deletedAt: nowIso, updatedAt: nowIso }
      : tx,
  );
}

export function createEarlyPayoutTransaction(input: {
  amount: number;
  method: PayrollEarlyPayoutMethod;
  paidAt: string;
  periodKey: string;
  description?: string;
  id?: string;
  nowIso?: string;
}): PayrollEarlyPayout {
  const now = input.nowIso ?? new Date().toISOString();
  return {
    id: input.id ?? (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `ep-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`),
    amount: +input.amount.toFixed(2),
    method: input.method,
    paidAt: input.paidAt,
    periodKey: input.periodKey,
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    createdAt: now,
    updatedAt: now,
  };
}

/** Re-export anchor helper for tests. */
export { biweeklyAnchorFor, isBiweeklyPayrollEmployee, nextBiweeklyPayoutSaturday };
