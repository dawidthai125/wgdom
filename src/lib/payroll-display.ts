/** B5 — SSOT wyświetlania listy płac (displayEmployees). */

import type { WeekEmployee } from "@/app/app-domain";
import { logPayrollDisplayTrace } from "@/lib/payroll-display-runtime-trace";
import { getPayrollWeekRange, isPayrollCalendarBehind } from "@/lib/payroll-cycle";
import { payrollTraceEmit, payrollTraceGetSubjectMergeKey, rosterTraceSnapshot } from "@/lib/payroll-runtime-trace";
import { weekEmployeeMergeKey } from "@/lib/payroll-week-employee-merge";

/** TEMP · PAYROLL-DISPLAY-RUNTIME-TRACE-01 — metadane diagnostyczne; bez wpływu na logikę display. */
export type PayrollDisplayResolveTraceMeta = {
  productionWeekEmployeesLength?: number;
  hasRolloverBlockers?: boolean;
  savedWeeksLength?: number;
  rawWeekEmployeesLength?: number;
};

/**
 * Jedno źródło listy pracowników do renderu w PayrollView.
 * Closed + archiwum → snapshot; closed bez archiwum → []; operacyjny → live KV.
 */
export function resolvePayrollDisplayEmployees(
  isClosedWeek: boolean,
  weekEmployees: WeekEmployee[],
  archivedWeekEmployees?: WeekEmployee[] | null,
  weekFrom = "",
  weekTo = "",
  traceMeta?: PayrollDisplayResolveTraceMeta,
): WeekEmployee[] {
  const display = (() => {
    // PAYROLL-P0-REGRESSION-02 — bieżący tydzień płacowy: zawsze live roster (nie collapse display).
    if (!isPayrollCalendarBehind(weekFrom, weekTo)) return weekEmployees;
    if (!isClosedWeek) return weekEmployees;
    if (archivedWeekEmployees?.length) return archivedWeekEmployees;
    return [];
  })();
  const sk = payrollTraceGetSubjectMergeKey();
  payrollTraceEmit("payroll.roster.display.resolve", "DISPLAY", "debug", {
    stateRoster: rosterTraceSnapshot(weekEmployees, weekFrom, weekTo, "LOCAL", "PRESENT"),
    displayRoster: rosterTraceSnapshot(display, weekFrom, weekTo, "LOCAL", "PRESENT"),
    isClosedWeek,
    subjectInDisplay: sk ? display.some((e) => weekEmployeeMergeKey(e) === sk) : undefined,
  });
  const currentWeek = getPayrollWeekRange();
  const calendarBehind = isPayrollCalendarBehind(weekFrom, weekTo);
  logPayrollDisplayTrace({
    caller: "resolvePayrollDisplayEmployees",
    reason: !calendarBehind
      ? "operational_week_live_roster"
      : isClosedWeek
        ? archivedWeekEmployees?.length
          ? "closed_week_archive_snapshot"
          : "closed_week_no_archive_collapse"
        : "operational_week_live_roster",
    weekEmployeesLength: weekEmployees.length,
    productionWeekEmployeesLength: traceMeta?.productionWeekEmployeesLength ?? weekEmployees.length,
    displayEmployeesLength: display.length,
    isClosedWeek,
    hasRolloverBlockers: traceMeta?.hasRolloverBlockers,
    archivedForWeekLength: archivedWeekEmployees?.length ?? 0,
    savedWeeksLength: traceMeta?.savedWeeksLength,
    weekFrom,
    weekTo,
    currentWeekFrom: currentWeek.from,
    currentWeekTo: currentWeek.to,
  });
  return display;
}
