/**
 * PAYROLL AKORD Phase 4C — freeze archive payable from live SSOT at save time.
 * Does not mutate durable piecework. Historical netPay must not recompute from later advances.
 */

import type { WeekEmployee, WeekSnapshot } from "@/app/app-domain";
import type { EmployeeLeave } from "@/lib/employee-leaves";
import { calcWeekEmployeeForPayroll } from "@/lib/payroll-carry-forward";
import {
  isAkordWeekEmployee,
  weekEmployeeCompensationModel,
} from "@/lib/payroll-compensation-model";
import { resolveAkordPayable } from "@/lib/payroll-piecework-payable";
import type { PayrollPieceworkState } from "@/lib/payroll-piecework-types";

function normName(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * After buildWeekSnapshot: overwrite AKORD employee payables with calcWeekEmployeeForPayroll SSOT.
 */
export function freezeAkordArchivePayables(
  snap: WeekSnapshot,
  liveEmployees: WeekEmployee[],
  options: {
    pieceworkState?: PayrollPieceworkState | null;
    employeeLeaves?: EmployeeLeave[];
    savedWeeks?: WeekSnapshot[];
  } = {},
): WeekSnapshot {
  const byName = new Map(liveEmployees.map((e) => [normName(e.name), e]));
  const employees = snap.employees.map((es) => {
    const emp = byName.get(normName(es.name));
    if (!emp) return es;
    const model = weekEmployeeCompensationModel(emp);
    if (!isAkordWeekEmployee(emp)) {
      return model === "akord" ? { ...es, compensationModel: model } : { ...es, compensationModel: model };
    }
    const row = calcWeekEmployeeForPayroll(emp, {
      weekFrom: snap.weekFrom,
      weekTo: snap.weekTo,
      employeeLeaves: options.employeeLeaves,
      savedWeeks: options.savedWeeks,
      pieceworkState: options.pieceworkState,
      livePayroll: true,
    });
    const akordPayableFrozen = resolveAkordPayable(emp.directoryId, options.pieceworkState);
    return {
      ...es,
      compensationModel: "akord" as const,
      akordPayableFrozen,
      rate: 0,
      weekHours: 0,
      prevSatHours: 0,
      totalHours: 0,
      grossPay: row.grossPay,
      totalZaliczka: row.totalZaliczka,
      totalExtraCosts: row.totalExtraCosts,
      ...(row.totalManualAdjustment > 0 ? { totalManualAdjustment: row.totalManualAdjustment } : {}),
      netPay: row.displayNetPay,
      ...(row.leaveStatus ? { leaveStatus: row.leaveStatus } : {}),
      ...(row.carryForwardOut != null ? { carryForwardOut: row.carryForwardOut } : {}),
      ...(row.carryForwardIn != null ? { carryForwardIn: row.carryForwardIn } : {}),
      ...(row.carryForwardInFrom ? { carryForwardFromWeek: row.carryForwardInFrom } : {}),
    };
  });
  return {
    ...snap,
    employees,
    totalNet: +employees.reduce((s, e) => s + e.netPay, 0).toFixed(2),
    totalGross: +employees.reduce((s, e) => s + e.grossPay, 0).toFixed(2),
  };
}
