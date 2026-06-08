/**
 * Sprint 20.1C — rollover listy płac blokuje tylko nierozliczoną kasę sobotnią.
 */

import type { WeekEmployee, WeekSnapshot } from "@/app/app-domain";
import type { EmployeeLeave } from "@/lib/employee-leaves";
import { calcWeeklyNetWithCarry } from "@/lib/payroll-carry-forward";
import { calcBiweeklyWeekNetWithLeave } from "@/lib/payroll-leave-overlay";
import {
  calcBiweeklyRowDisplay,
  isBiweeklyPayrollEmployee,
  type DirectoryPayrollRef,
} from "@/lib/payroll-cycle";

export interface PayrollRolloverContext {
  employeeLeaves?: EmployeeLeave[];
  savedWeeks?: WeekSnapshot[];
}

/** Kwota tej osoby wchodząca do totalSaturdayCash (kasa w tę sobotę, nie narastająca). */
export function calcEmployeeSaturdayCash(
  emp: WeekEmployee,
  weekFrom: string,
  weekTo: string,
  directory: DirectoryPayrollRef[],
  options: PayrollRolloverContext = {},
): number {
  const savedWeeks = options.savedWeeks ?? [];
  const leaveOpts = {
    employeeLeaves: options.employeeLeaves,
    savedWeeks,
  };

  if (isBiweeklyPayrollEmployee(emp, directory)) {
    const row = calcBiweeklyRowDisplay(
      emp,
      directory,
      weekFrom,
      weekTo,
      savedWeeks,
      (e, from, to) => calcBiweeklyWeekNetWithLeave(e, from, to, leaveOpts),
    );
    if (!row?.isPayoutWeek) return 0;
    return Math.max(0, row.displayNet);
  }

  return Math.max(0, calcWeeklyNetWithCarry(emp, weekFrom, weekTo, leaveOpts));
}

/** Czy pracownik blokuje auto-rollover / archiwum niedzielne / confirm „Bieżący tydzień”. */
export function blocksPayrollRollover(
  emp: WeekEmployee,
  weekFrom: string,
  weekTo: string,
  directory: DirectoryPayrollRef[],
  options: PayrollRolloverContext = {},
): boolean {
  if (emp.settled) return false;
  return calcEmployeeSaturdayCash(emp, weekFrom, weekTo, directory, options) > 0;
}

export function hasPayrollRolloverBlockers(
  weekEmployees: WeekEmployee[],
  weekFrom: string,
  weekTo: string,
  directory: DirectoryPayrollRef[],
  options: PayrollRolloverContext = {},
): boolean {
  return weekEmployees.some((e) =>
    blocksPayrollRollover(e, weekFrom, weekTo, directory, options),
  );
}

/** Pracownicy blokujący rollover — ta sama reguła co auto-rollover (dashboard / alerty). */
export function listPayrollRolloverBlockers(
  weekEmployees: WeekEmployee[],
  weekFrom: string,
  weekTo: string,
  directory: DirectoryPayrollRef[],
  options: PayrollRolloverContext = {},
): WeekEmployee[] {
  return weekEmployees.filter((e) =>
    blocksPayrollRollover(e, weekFrom, weekTo, directory, options),
  );
}

export function countPayrollDashboardBlockers(
  weekEmployees: WeekEmployee[],
  weekFrom: string,
  weekTo: string,
  directory: DirectoryPayrollRef[],
  options: PayrollRolloverContext = {},
): number {
  return listPayrollRolloverBlockers(weekEmployees, weekFrom, weekTo, directory, options).length;
}
