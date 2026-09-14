/** Sprint 20.1A — jednorazowe odroczenie wypłaty (carry forward) na następny tydzień Pn–So. */

import type { WeekEmployee, WeekSnapshot } from "@/app/app-domain";
import { calcWeekEmployeeWithLeave, type PayrollCalcWithLeave } from "@/lib/payroll-leave-overlay";
import {
  computePayrollCashSplit,
  isBiweeklyPayrollEmployee,
  nextPayrollWeekRange,
  type DirectoryPayrollRef,
  type PayrollCashSplit,
} from "@/lib/payroll-cycle";
import { calcBiweeklyWeekNetWithLeave } from "@/lib/payroll-leave-overlay";
import type { EmployeeLeave } from "@/lib/employee-leaves";
import {
  findEmployeeSnapshot,
  resolveLiveCarryForwardIn,
} from "@/lib/payroll-carry-snapshot";
import { isAkordWeekEmployee } from "@/lib/payroll-compensation-model";
import { resolveAkordWeekAdvances } from "@/lib/payroll-piecework-payable";
import type { PayrollPieceworkState } from "@/lib/payroll-piecework-types";

export { resolveLiveCarryForwardIn, snapshotCarryFieldsForEmployee } from "@/lib/payroll-carry-snapshot";

/** Zamrożona kwota w momencie kliknięcia „Przenieś na następny tydzień”. */
export interface PayrollCarryForward {
  amount: number;
  targetWeekFrom: string;
  targetWeekTo: string;
  createdAt: string;
}

export interface PayrollCalcWithAdjustments extends PayrollCalcWithLeave {
  carryForwardOut?: number;
  carryForwardIn?: number;
  carryForwardInFrom?: { from: string; to: string };
  /** Końcowa kwota do wypłaty (UI, PDF, totals). */
  displayNetPay: number;
}

export const CARRY_FORWARD_LABEL = "⏭ PRZENIESIONO";
export const CARRY_FORWARD_PDF_LABEL = "PRZENIESIONO";

export function resolveArchivedCarryAdjustments(
  snap: WeekSnapshot,
  emp: WeekEmployee,
): Pick<
  PayrollCalcWithAdjustments,
  "carryForwardOut" | "carryForwardIn" | "carryForwardInFrom" | "displayNetPay" | "netPay"
> {
  const es = findEmployeeSnapshot(snap, emp);
  if (!es) {
    const calc = calcWeekEmployeeWithLeave(emp, {
      weekFrom: snap.weekFrom,
      weekTo: snap.weekTo,
      archivedSnapshot: snap,
    });
    return { netPay: calc.netPay, displayNetPay: calc.netPay };
  }

  if (es.carryForwardOut != null && es.carryForwardOut > 0) {
    return {
      carryForwardOut: es.carryForwardOut,
      netPay: 0,
      displayNetPay: 0,
    };
  }

  if (es.carryForwardIn != null && es.carryForwardIn > 0) {
    return {
      carryForwardIn: es.carryForwardIn,
      carryForwardInFrom: es.carryForwardFromWeek,
      netPay: es.netPay,
      displayNetPay: es.netPay,
    };
  }

  return {
    netPay: es.netPay,
    displayNetPay: es.netPay,
  };
}

/**
 * Apply AKORD weekly advance contribution into weekly calc (hourly unchanged).
 * Weekly payout = current-week PieceworkAdvances + extras/manual (− DayData zaliczki).
 * Remaining / agreedAmount do NOT enter weekly payable.
 */
function applyAkordPayableToCalc(
  emp: WeekEmployee,
  withLeave: PayrollCalcWithLeave,
  pieceworkState: PayrollPieceworkState | null | undefined,
  opts?: {
    weekFrom?: string;
    weekTo?: string;
    excludeWeekAdvances?: boolean;
  },
): PayrollCalcWithLeave {
  if (!isAkordWeekEmployee(emp)) return withLeave;

  const extrasManualZal = +(
    withLeave.totalExtraCosts + withLeave.totalManualAdjustment - withLeave.totalZaliczka
  ).toFixed(2);

  if (withLeave.leaveStatus) {
    return {
      ...withLeave,
      grossPay: 0,
      weekGross: 0,
      weekNet: extrasManualZal,
      netPay: extrasManualZal,
    };
  }

  const weekFrom = String(opts?.weekFrom ?? "").trim();
  const weekTo = String(opts?.weekTo ?? "").trim();
  const weekAdvances =
    opts?.excludeWeekAdvances || !weekFrom || !weekTo
      ? 0
      : resolveAkordWeekAdvances(emp.directoryId, pieceworkState, weekFrom, weekTo);
  const netPay = +(weekAdvances + extrasManualZal).toFixed(2);
  return {
    ...withLeave,
    grossPay: weekAdvances,
    weekGross: weekAdvances,
    weekNet: netPay,
    netPay,
  };
}

export function calcWeekEmployeeForPayroll(
  emp: WeekEmployee,
  options: {
    weekFrom: string;
    weekTo: string;
    employeeLeaves?: EmployeeLeave[];
    archivedSnapshot?: WeekSnapshot;
    livePayroll?: boolean;
    savedWeeks?: WeekSnapshot[];
    /** Durable piecework for AKORD weekly advances / balance (hourly ignores). */
    pieceworkState?: PayrollPieceworkState | null;
  },
): PayrollCalcWithAdjustments {
  const withLeave = calcWeekEmployeeWithLeave(emp, options);
  const weekOpts = {
    weekFrom: options.weekFrom,
    weekTo: options.weekTo,
  };

  // Leave: displayNetPay = payable (extras + manual adj − zaliczki), not forced 0.
  // AKORD: week advances treated as labor → zeroed by leave overlay semantics.
  if (withLeave.leaveStatus) {
    const akordLeave = applyAkordPayableToCalc(emp, withLeave, options.pieceworkState, weekOpts);
    return { ...akordLeave, displayNetPay: akordLeave.netPay };
  }

  if (options.archivedSnapshot) {
    // Phase 4C — historical display uses frozen snapshot amounts (freezeAkordArchivePayables at archive time).
    // Do not recompute AKORD payable from live piecework here.
    const archived = resolveArchivedCarryAdjustments(options.archivedSnapshot, emp);
    return {
      ...withLeave,
      ...archived,
      grossPay: withLeave.grossPay,
      weekGross: withLeave.weekGross,
    };
  }

  if (emp.payrollCarryForward?.amount != null && emp.payrollCarryForward.amount > 0) {
    const base = applyAkordPayableToCalc(emp, withLeave, options.pieceworkState, weekOpts);
    return {
      ...base,
      carryForwardOut: emp.payrollCarryForward.amount,
      netPay: 0,
      weekNet: 0,
      displayNetPay: 0,
    };
  }

  const carryIn = options.savedWeeks?.length
    ? resolveLiveCarryForwardIn(emp, options.weekFrom, options.savedWeeks)
    : undefined;

  if (carryIn) {
    // Remaining never enters payout. Current-week advances + extras + frozen carry-in.
    const live = applyAkordPayableToCalc(emp, withLeave, options.pieceworkState, weekOpts);
    const displayNetPay = +(live.netPay + carryIn.amount).toFixed(2);
    return {
      ...live,
      carryForwardIn: carryIn.amount,
      carryForwardInFrom: carryIn.fromWeek,
      displayNetPay,
      netPay: displayNetPay,
    };
  }

  const base = applyAkordPayableToCalc(emp, withLeave, options.pieceworkState, weekOpts);
  return { ...base, displayNetPay: base.netPay };
}

export function weeklyDisplayNetBeforeDefer(
  row: PayrollCalcWithAdjustments,
  directory: DirectoryPayrollRef[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekSnapshot[],
): number {
  // Leave no longer forces 0 — payable (extras + manual adj) enters cash totals.
  if (row.carryForwardOut) return 0;
  if (isBiweeklyPayrollEmployee(row as unknown as WeekEmployee, directory)) return 0;
  return row.displayNetPay;
}

export interface CanDeferPayrollResult {
  ok: boolean;
  reason?: string;
  frozenAmount?: number;
}

export function canDeferPayroll(
  emp: WeekEmployee,
  row: PayrollCalcWithAdjustments,
  directory: DirectoryPayrollRef[],
  isClosedWeek: boolean,
): CanDeferPayrollResult {
  if (isClosedWeek) return { ok: false, reason: "closed_week" };
  if (row.leaveStatus) return { ok: false, reason: "leave_active" };
  if (emp.payrollCarryForward?.amount) return { ok: false, reason: "already_deferred" };
  if (isBiweeklyPayrollEmployee(emp, directory)) return { ok: false, reason: "biweekly_blocked" };
  if (row.carryForwardIn) return { ok: false, reason: "carry_in_week" };
  const amount = row.displayNetPay;
  if (!(amount > 0)) return { ok: false, reason: "net_not_positive" };
  return { ok: true, frozenAmount: amount };
}

export function buildPayrollCarryForwardRecord(
  frozenAmount: number,
  weekFrom: string,
  weekTo: string,
): PayrollCarryForward {
  const target = nextPayrollWeekRange({ from: weekFrom, to: weekTo });
  return {
    amount: +frozenAmount.toFixed(2),
    targetWeekFrom: target.from,
    targetWeekTo: target.to,
    createdAt: new Date().toISOString(),
  };
}

/** Netto tygodniowe dla cash split — uwzględnia carry (bez biweekly). */
export function calcWeeklyNetWithCarry(
  emp: WeekEmployee,
  weekFrom: string,
  weekTo: string,
  options: {
    employeeLeaves?: EmployeeLeave[];
    savedWeeks?: WeekSnapshot[];
    archivedSnapshot?: WeekSnapshot;
    pieceworkState?: PayrollPieceworkState | null;
  },
): number {
  const row = calcWeekEmployeeForPayroll(emp, {
    weekFrom,
    weekTo,
    employeeLeaves: options.employeeLeaves,
    savedWeeks: options.savedWeeks,
    pieceworkState: options.pieceworkState,
    archivedSnapshot: options.archivedSnapshot,
    livePayroll: !options.archivedSnapshot,
  });
  if (row.carryForwardOut) return 0;
  return row.displayNetPay;
}

/** Sidebar / Pulpit / Topbar — ta sama kasa sobotnia co PayrollView cashSplit (carry + biweekly leave net). */
export function computePayrollCashSplitWithCarry(
  weekEmployees: WeekEmployee[],
  directory: DirectoryPayrollRef[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekSnapshot[],
): PayrollCashSplit {
  return computePayrollCashSplit(
    weekEmployees,
    directory,
    weekFrom,
    weekTo,
    savedWeeks,
    (e) =>
      calcWeeklyNetWithCarry(e, weekFrom, weekTo, {
        savedWeeks,
      }),
    (e, from, to) =>
      calcBiweeklyWeekNetWithLeave(e, from, to, {
        savedWeeks,
      }),
  );
}
