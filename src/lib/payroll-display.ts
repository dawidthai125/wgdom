/** B5 — SSOT wyświetlania listy płac (displayEmployees). */

import type { WeekEmployee } from "@/app/app-domain";

/**
 * Jedno źródło listy pracowników do renderu w PayrollView.
 * Closed + archiwum → snapshot; closed bez archiwum → []; operacyjny → live KV.
 */
export function resolvePayrollDisplayEmployees(
  isClosedWeek: boolean,
  weekEmployees: WeekEmployee[],
  archivedWeekEmployees?: WeekEmployee[] | null,
): WeekEmployee[] {
  if (!isClosedWeek) return weekEmployees;
  if (archivedWeekEmployees?.length) return archivedWeekEmployees;
  return [];
}
