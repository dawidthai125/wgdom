/** B5 — SSOT wyświetlania listy płac (displayEmployees). */

import type { WeekEmployee } from "@/app/app-domain";
import { payrollTraceEmit, payrollTraceGetSubjectMergeKey, rosterTraceSnapshot } from "@/lib/payroll-runtime-trace";
import { weekEmployeeMergeKey } from "@/lib/payroll-week-employee-merge";

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
): WeekEmployee[] {
  const display = (() => {
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
  return display;
}
