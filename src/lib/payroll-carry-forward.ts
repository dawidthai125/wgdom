/** Sprint 20.1A — jednorazowe odroczenie wypłaty (carry forward) na następny tydzień Pn–So. */

import type { WeekEmployee, WeekSnapshot } from "@/app/app-domain";
import { calcWeekEmployeeWithLeave, type PayrollCalcWithLeave } from "@/lib/payroll-leave-overlay";
import { isBiweeklyPayrollEmployee, nextPayrollWeekRange } from "@/lib/payroll-cycle";
import type { DirectoryPayrollRef } from "@/lib/payroll-cycle";
import type { EmployeeLeave } from "@/lib/employee-leaves";
import {
  findEmployeeSnapshot,
  resolveLiveCarryForwardIn,
} from "@/lib/payroll-carry-snapshot";

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
    return { netPay: calc.leaveStatus ? 0 : calc.netPay, displayNetPay: calc.leaveStatus ? 0 : calc.netPay };
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

export function calcWeekEmployeeForPayroll(
  emp: WeekEmployee,
  options: {
    weekFrom: string;
    weekTo: string;
    employeeLeaves?: EmployeeLeave[];
    archivedSnapshot?: WeekSnapshot;
    livePayroll?: boolean;
    savedWeeks?: WeekSnapshot[];
  },
): PayrollCalcWithAdjustments {
  const withLeave = calcWeekEmployeeWithLeave(emp, options);

  if (withLeave.leaveStatus) {
    return { ...withLeave, displayNetPay: 0 };
  }

  if (options.archivedSnapshot) {
    const archived = resolveArchivedCarryAdjustments(options.archivedSnapshot, emp);
    return {
      ...withLeave,
      ...archived,
      grossPay: withLeave.grossPay,
      weekGross: withLeave.weekGross,
    };
  }

  if (emp.payrollCarryForward?.amount != null && emp.payrollCarryForward.amount > 0) {
    return {
      ...withLeave,
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
    const displayNetPay = +(withLeave.netPay + carryIn.amount).toFixed(2);
    return {
      ...withLeave,
      carryForwardIn: carryIn.amount,
      carryForwardInFrom: carryIn.fromWeek,
      displayNetPay,
      netPay: displayNetPay,
    };
  }

  return { ...withLeave, displayNetPay: withLeave.netPay };
}

export function weeklyDisplayNetBeforeDefer(
  row: PayrollCalcWithAdjustments,
  directory: DirectoryPayrollRef[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekSnapshot[],
): number {
  if (row.leaveStatus) return 0;
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
  isArchivedWeek: boolean,
): CanDeferPayrollResult {
  if (isArchivedWeek) return { ok: false, reason: "archived_week" };
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
  },
): number {
  const row = calcWeekEmployeeForPayroll(emp, {
    weekFrom,
    weekTo,
    employeeLeaves: options.employeeLeaves,
    savedWeeks: options.savedWeeks,
    archivedSnapshot: options.archivedSnapshot,
    livePayroll: !options.archivedSnapshot,
  });
  if (row.leaveStatus || row.carryForwardOut) return 0;
  return row.displayNetPay;
}
