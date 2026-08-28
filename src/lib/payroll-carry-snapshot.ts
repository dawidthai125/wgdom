/** Snapshot carry forward — bez importu payroll-leave-overlay (unik cyklu app-domain). */

import type { EmployeeSnapshot, WeekEmployee, WeekSnapshot } from "@/app/app-domain";
import { previousWeekRange } from "@/lib/payroll-cycle";

function normEmployeeName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function findEmployeeSnapshot(
  snap: WeekSnapshot,
  emp: Pick<WeekEmployee, "directoryId" | "name">,
): EmployeeSnapshot | undefined {
  return snap.employees.find((e) => normEmployeeName(e.name) === normEmployeeName(emp.name));
}

/** Carry IN z poprzedniego tygodnia archiwum (live payroll / snapshot). */
export function resolveLiveCarryForwardIn(
  emp: Pick<WeekEmployee, "directoryId" | "name">,
  weekFrom: string,
  savedWeeks: WeekSnapshot[],
): { amount: number; fromWeek: { from: string; to: string } } | undefined {
  const prev = previousWeekRange(weekFrom);
  const prevSnap = savedWeeks.find((w) => w.weekFrom === prev.from && w.weekTo === prev.to);
  if (!prevSnap) return undefined;
  const prevEs = findEmployeeSnapshot(prevSnap, emp);
  if (!prevEs?.carryForwardOut || prevEs.carryForwardOut <= 0) return undefined;
  if (prevEs.carryForwardTargetFrom !== weekFrom) return undefined;
  return {
    amount: prevEs.carryForwardOut,
    fromWeek: { from: prev.from, to: prev.to },
  };
}

/** Pola snapshotu przy zapisie tygodnia (archive freeze). */
export function snapshotCarryFieldsForEmployee(
  emp: WeekEmployee,
  weekFrom: string,
  weekTo: string,
  baseNetPay: number,
  leaveStatus: boolean,
  savedWeeks?: WeekSnapshot[],
): Pick<
  EmployeeSnapshot,
  | "netPay"
  | "carryForwardOut"
  | "carryForwardTargetFrom"
  | "carryForwardTargetTo"
  | "carryForwardIn"
  | "carryForwardFromWeek"
> {
  void weekTo;
  if (leaveStatus) {
    return { netPay: baseNetPay };
  }

  if (emp.payrollCarryForward?.amount != null && emp.payrollCarryForward.amount > 0) {
    return {
      netPay: 0,
      carryForwardOut: emp.payrollCarryForward.amount,
      carryForwardTargetFrom: emp.payrollCarryForward.targetWeekFrom,
      carryForwardTargetTo: emp.payrollCarryForward.targetWeekTo,
    };
  }

  const carryIn = savedWeeks?.length ? resolveLiveCarryForwardIn(emp, weekFrom, savedWeeks) : undefined;
  if (carryIn) {
    return {
      netPay: +(baseNetPay + carryIn.amount).toFixed(2),
      carryForwardIn: carryIn.amount,
      carryForwardFromWeek: carryIn.fromWeek,
    };
  }

  return { netPay: baseNetPay };
}

export { findEmployeeSnapshot };
