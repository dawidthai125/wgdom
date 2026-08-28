/**
 * PAYROLL-SIM-01 — Symulacja wypłaty (UI-only, bez mutacji payroll/sync).
 */

import type { BiweeklyRowDisplay } from "@/lib/payroll-cycle";

export interface PayrollSimulationState {
  enabled: boolean;
  excludedEmployeeIds: string[];
}

export const PAYROLL_SIMULATION_INITIAL: PayrollSimulationState = {
  enabled: false,
  excludedEmployeeIds: [],
};

/** Reset stanu symulacji (np. przy zmianie tygodnia). */
export function resetPayrollSimulationState(): PayrollSimulationState {
  return { enabled: false, excludedEmployeeIds: [] };
}

export interface PayrollSimulationRow {
  emp: { id: string };
  weekHours: number;
  prevSatHours: number;
  totalHours: number;
  weekGross: number;
  prevSatGross: number;
  grossPay: number;
  weekZaliczka: number;
  prevSatZaliczka: number;
  totalZaliczka: number;
  totalExtraCosts: number;
  displayNetPay: number;
  leaveStatus?: unknown;
  carryForwardOut?: number | null;
  carryForwardIn?: number | null;
}

export interface PayrollComputedTableTotals {
  totalWeekHours: number;
  totalPrevSatHours: number;
  totalHoursAll: number;
  totalWeekGross: number;
  totalPrevSatGross: number;
  totalGross: number;
  totalWeekZaliczka: number;
  totalPrevSatZaliczka: number;
  totalZaliczkaSum: number;
  totalExtraCostsSum: number;
  totalNet: number;
}

export function isEmployeeExcluded(empId: string, state: PayrollSimulationState): boolean {
  return state.enabled && state.excludedEmployeeIds.includes(empId);
}

export function filterRowsForSimulation<T extends { emp: { id: string } }>(
  rows: T[],
  state: PayrollSimulationState,
): T[] {
  if (!state.enabled || state.excludedEmployeeIds.length === 0) return rows;
  const excluded = new Set(state.excludedEmployeeIds);
  return rows.filter((r) => !excluded.has(r.emp.id));
}

export function filterEmployeesForSimulation<T extends { id: string }>(
  employees: T[],
  state: PayrollSimulationState,
): T[] {
  if (!state.enabled || state.excludedEmployeeIds.length === 0) return employees;
  const excluded = new Set(state.excludedEmployeeIds);
  return employees.filter((e) => !excluded.has(e.id));
}

function rowNetContribution(
  r: PayrollSimulationRow,
  biweeklyRowMap: Map<string, BiweeklyRowDisplay>,
): number {
  // Leave no longer forces 0 — displayNetPay already holds payable (extras + manual adj).
  if (r.carryForwardOut != null && r.carryForwardOut > 0) return 0;
  if (r.carryForwardIn != null && r.carryForwardIn > 0) return r.displayNetPay;
  const bw = biweeklyRowMap.get(r.emp.id);
  if (bw) return bw.isPayoutWeek ? bw.displayNet : bw.thisWeekNet;
  return r.displayNetPay;
}

export function computeSimulatedTotals(
  rows: PayrollSimulationRow[],
  biweeklyRowMap: Map<string, BiweeklyRowDisplay>,
  state: PayrollSimulationState,
): PayrollComputedTableTotals {
  const activeRows = filterRowsForSimulation(rows, state);

  const totalWeekHours = activeRows.reduce((s, r) => s + r.weekHours, 0);
  const totalPrevSatHours = activeRows.reduce(
    (s, r) => s + (biweeklyRowMap.has(r.emp.id) ? 0 : r.prevSatHours),
    0,
  );
  const totalHoursAll = activeRows.reduce(
    (s, r) => s + (biweeklyRowMap.has(r.emp.id) ? r.weekHours : r.totalHours),
    0,
  );
  const totalWeekGross = activeRows.reduce((s, r) => s + (r.leaveStatus ? 0 : r.weekGross), 0);
  const totalPrevSatGross = activeRows.reduce(
    (s, r) => s + (biweeklyRowMap.has(r.emp.id) || r.leaveStatus ? 0 : r.prevSatGross),
    0,
  );
  const totalGross = activeRows.reduce(
    (s, r) => s + (r.leaveStatus ? 0 : biweeklyRowMap.has(r.emp.id) ? r.weekGross : r.grossPay),
    0,
  );
  const totalWeekZaliczka = activeRows.reduce((s, r) => s + r.weekZaliczka, 0);
  const totalPrevSatZaliczka = activeRows.reduce(
    (s, r) => s + (biweeklyRowMap.has(r.emp.id) ? 0 : r.prevSatZaliczka),
    0,
  );
  const totalZaliczkaSum = activeRows.reduce(
    (s, r) => s + (biweeklyRowMap.has(r.emp.id) ? r.weekZaliczka : r.totalZaliczka),
    0,
  );
  const totalExtraCostsSum = activeRows.reduce((s, r) => s + r.totalExtraCosts, 0);
  const totalNet = activeRows.reduce((s, r) => s + rowNetContribution(r, biweeklyRowMap), 0);

  return {
    totalWeekHours,
    totalPrevSatHours,
    totalHoursAll,
    totalWeekGross,
    totalPrevSatGross,
    totalGross,
    totalWeekZaliczka,
    totalPrevSatZaliczka,
    totalZaliczkaSum,
    totalExtraCostsSum,
    totalNet,
  };
}
