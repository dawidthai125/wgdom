/** Warstwa urlopów na payroll — bez zmiany calcWeekEmployee. */

import type { WeekEmployee, WeekSnapshot } from "@/app/app-domain";
import { calcWeekEmployee } from "@/app/app-domain";
import { calcWeekNetNoPrevSat, isPayrollWeekClosedForUi } from "@/lib/payroll-cycle";
import {
  findLeaveForEmployeeWeek,
  frozenLeaveStatusFromSnapshot,
  matchEmployeeSnapshot,
  type EmployeeLeave,
  type PayrollLeaveStatus,
} from "@/lib/employee-leaves";

export type WeekEmployeeCalc = ReturnType<typeof calcWeekEmployee>;

export interface PayrollCalcWithLeave extends WeekEmployeeCalc {
  leaveStatus?: PayrollLeaveStatus;
}

export function applyLeaveOverlayToCalc(
  calc: WeekEmployeeCalc,
  leaveStatus?: PayrollLeaveStatus,
): PayrollCalcWithLeave {
  if (!leaveStatus) return calc;
  return {
    ...calc,
    grossPay: 0,
    weekGross: 0,
    prevSatGross: 0,
    netPay: 0,
    weekNet: 0,
    prevSatNet: 0,
    leaveStatus,
  };
}

export function resolveLiveLeaveStatus(
  employeeLeaves: EmployeeLeave[],
  directoryId: string,
  weekFrom: string,
  weekTo: string,
): PayrollLeaveStatus | undefined {
  const leave = findLeaveForEmployeeWeek(employeeLeaves, directoryId, weekFrom, weekTo);
  return leave?.leaveType;
}

export function resolveArchivedLeaveStatus(
  snap: WeekSnapshot,
  emp: WeekEmployee,
): PayrollLeaveStatus | undefined {
  const fromEmp = snap.employees.find((e) => matchEmployeeSnapshot(e, emp.directoryId, emp.name));
  const status = fromEmp?.leaveStatus;
  if (status === "vacation" || status === "sick" || status === "unpaid") return status;
  return frozenLeaveStatusFromSnapshot(snap, emp.directoryId, emp.name);
}

export function calcWeekEmployeeWithLeave(
  emp: WeekEmployee,
  options: {
    weekFrom: string;
    weekTo: string;
    employeeLeaves?: EmployeeLeave[];
    archivedSnapshot?: WeekSnapshot;
    livePayroll?: boolean;
  },
): PayrollCalcWithLeave {
  const base = calcWeekEmployee(emp);
  if (options.archivedSnapshot) {
    return applyLeaveOverlayToCalc(base, resolveArchivedLeaveStatus(options.archivedSnapshot, emp));
  }
  if (options.livePayroll !== false && options.employeeLeaves) {
    return applyLeaveOverlayToCalc(
      base,
      resolveLiveLeaveStatus(options.employeeLeaves, emp.directoryId, options.weekFrom, options.weekTo),
    );
  }
  return base;
}

/** @deprecated Użyj isPayrollWeekSaved — zachowane dla kompatybilności importów. */
export function isPayrollWeekArchived(
  savedWeeks: WeekSnapshot[],
  weekFrom: string,
  weekTo: string,
): boolean {
  return savedWeeks.some((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
}

export { isPayrollWeekSaved, isPayrollWeekClosed, isPayrollWeekClosedForUi } from "@/lib/payroll-cycle";

/** Netto Pn–So dla wypłaty co 2 tyg. — 0 gdy urlop (live lub archiwum). */
export function calcBiweeklyWeekNetWithLeave(
  emp: WeekEmployee,
  weekFrom: string,
  weekTo: string,
  options: {
    employeeLeaves?: EmployeeLeave[];
    savedWeeks?: WeekSnapshot[];
    hasRolloverBlockers?: boolean;
  },
): number {
  const snap = options.savedWeeks?.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
  const closed = isPayrollWeekClosedForUi(weekFrom, weekTo, options.hasRolloverBlockers ?? false);
  const calc = calcWeekEmployeeWithLeave(emp, {
    weekFrom,
    weekTo,
    employeeLeaves: snap && closed ? undefined : options.employeeLeaves,
    archivedSnapshot: snap && closed ? snap : undefined,
    livePayroll: !(snap && closed),
  });
  if (calc.leaveStatus) return 0;
  return calcWeekNetNoPrevSat(emp).netPay;
}
