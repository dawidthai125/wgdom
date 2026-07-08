import { useMemo, useCallback } from "react";
import { X, Plus, Copy, HardHat } from "lucide-react";
import {
  type WeekEmployee,
  type Job,
  type DirectoryEmployee,
  DAY_LABELS,
  fmtH,
  dayBaseHoursOnly,
  dayKeyForIsoInWeek,
  weekDayColumns,
} from "@/app/app-domain";
import { withKwJobsWorkEntryMutation, extendScopeSuppress } from "@/lib/cloud-sync-mutation-guard";
import {
  addWorkEntryForEmployee,
  canCopyAssignmentsFromPreviousDay,
  copyEmployeeAssignmentsFromPreviousDay,
  dayPayrollAssignmentFooter,
  employeeDayAssignmentRows,
  jobsForPayrollAssignmentDropdown,
  moveWorkEntryToJob,
  payrollAssignmentAlertsForWeek,
  removeWorkEntryFromJobs,
  updateWorkEntryHoursInJobs,
} from "@/lib/payroll-job-assignments";

export function PayrollJobAssignmentsPanel({
  emp,
  jobs,
  weekFrom,
  weekTo,
  directory,
  onSetJobs,
  onClose,
}: {
  emp: WeekEmployee;
  jobs: Job[];
  weekFrom: string;
  weekTo: string;
  directory: DirectoryEmployee[];
  onSetJobs: (next: Job[] | ((prev: Job[]) => Job[])) => void;
  onClose: () => void;
}) {
  const dayColumns = useMemo(() => weekDayColumns(weekFrom), [weekFrom]);
  const assignmentJobs = useMemo(() => jobsForPayrollAssignmentDropdown(jobs), [jobs]);
  const alerts = useMemo(
    () => payrollAssignmentAlertsForWeek([emp], jobs, weekFrom, weekTo, directory),
    [emp, jobs, weekFrom, weekTo, directory],
  );

  const applyJobs = useCallback(
    (updater: (prev: Job[]) => Job[]) => {
      extendScopeSuppress("kw-jobs");
      withKwJobsWorkEntryMutation(() => onSetJobs(updater));
    },
    [onSetJobs],
  );

  const handleHoursChange = (jobId: string, entryId: string, raw: string) => {
    const hours = parseFloat(raw.replace(",", ".")) || 0;
    applyJobs((prev) => updateWorkEntryHoursInJobs(prev, jobId, entryId, hours));
  };

  const handleJobChange = (fromJobId: string, entryId: string, toJobId: string, hours: number) => {
    if (fromJobId === toJobId) return;
    applyJobs((prev) => moveWorkEntryToJob(prev, fromJobId, entryId, toJobId, hours));
  };

  const handleRemove = (jobId: string, entryId: string) => {
    applyJobs((prev) => removeWorkEntryFromJobs(prev, jobId, entryId));
  };

  const handleAddRow = (dateIso: string) => {
    const dayKey = dayKeyForIsoInWeek(dateIso, weekFrom);
    if (!dayKey) return;
    const payrollH = dayBaseHoursOnly(emp.days[dayKey]);
    const assigned = employeeDayAssignmentRows(emp, jobs, dateIso, directory);
    const assignedH = assigned.reduce((s, r) => s + r.hours, 0);
    const defaultJob = assignmentJobs[0];
    if (!defaultJob) return;
    const remaining = Math.max(0, +(payrollH - assignedH).toFixed(2));
    const hours = remaining > 0 ? remaining : 1;
    applyJobs((prev) => addWorkEntryForEmployee(prev, defaultJob.id, emp, dateIso, hours));
  };

  const handleCopyPrevious = (dateIso: string) => {
    applyJobs((prev) =>
      copyEmployeeAssignmentsFromPreviousDay(emp, prev, dateIso, [emp], weekFrom, directory),
    );
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between shrink-0">
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate flex items-center gap-2">
            <HardHat size={15} className="text-primary shrink-0" />
            Przydziały robót
          </p>
          <p className="text-xs text-muted-foreground truncate">{emp.name || "—"}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="touch-target p-1.5 rounded-lg hover:bg-secondary text-muted-foreground shrink-0"
          aria-label="Zamknij panel"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4">
        {dayColumns.map((col) => {
          const dayKey = col.key;
          const payrollHours = dayBaseHoursOnly(emp.days[dayKey]);
          const rows = employeeDayAssignmentRows(emp, jobs, col.iso, directory);
          const footer = dayPayrollAssignmentFooter(emp, jobs, col.iso, weekFrom, directory, alerts);
          const showDay = payrollHours > 0 || rows.length > 0;
          if (!showDay) return null;

          return (
            <div key={col.key} className="rounded-xl border border-border bg-secondary/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-foreground">
                  {DAY_LABELS[col.key]} · {col.dateLabel}
                </p>
                <span
                  className="text-[11px] text-muted-foreground"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  LP: {fmtH(payrollHours)}
                </span>
              </div>

              {rows.length === 0 && payrollHours > 0 && (
                <p className="text-xs text-muted-foreground">Brak przydziałów na robotach.</p>
              )}

              <div className="space-y-2">
                {rows.map((row) => (
                  <div key={row.entryId} className="flex items-center gap-2 flex-wrap">
                    <select
                      value={row.jobId}
                      onChange={(e) =>
                        handleJobChange(row.jobId, row.entryId, e.target.value, row.hours)
                      }
                      className="flex-1 min-w-[140px] bg-secondary rounded-lg px-2 py-2 text-xs border border-transparent focus:border-primary focus:outline-none"
                    >
                      {assignmentJobs.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.address?.trim() || "Bez adresu"}
                          {j.flatNumber ? ` m.${j.flatNumber}` : ""}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={0}
                      step={0.5}
                      value={row.hours || ""}
                      onChange={(e) => handleHoursChange(row.jobId, row.entryId, e.target.value)}
                      className="w-16 bg-secondary rounded-lg px-2 py-2 text-xs text-right border border-transparent focus:border-primary focus:outline-none"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      aria-label="Godziny na robocie"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemove(row.jobId, row.entryId)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label="Usuń wpis"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {payrollHours > 0 && (
                <button
                  type="button"
                  onClick={() => handleAddRow(col.iso)}
                  disabled={assignmentJobs.length === 0}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline disabled:opacity-40 disabled:no-underline"
                >
                  <Plus size={12} />
                  Dodaj robociznę
                </button>
              )}

              {canCopyAssignmentsFromPreviousDay(emp, jobs, col.iso, weekFrom, directory) && (
                <button
                  type="button"
                  onClick={() => handleCopyPrevious(col.iso)}
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Copy size={12} />
                  Kopiuj przydziały z poprzedniego dnia
                </button>
              )}

              {footer.status !== "empty" && (
                <div
                  className={`rounded-lg px-2.5 py-2 text-[11px] flex flex-wrap gap-x-3 gap-y-1 ${
                    footer.status === "ok"
                      ? "bg-green-500/10 text-green-700 dark:text-green-400"
                      : footer.status === "unassigned"
                        ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
                        : "bg-red-500/10 text-red-700 dark:text-red-400"
                  }`}
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  <span>Lista Płac: {fmtH(footer.payrollHours)}</span>
                  <span>Roboty: {fmtH(footer.jobHours)}</span>
                  <span className="font-medium">{footer.message}</span>
                </div>
              )}
            </div>
          );
        })}

        {dayColumns.every((col) => {
          const ph = dayBaseHoursOnly(emp.days[col.key]);
          const rows = employeeDayAssignmentRows(emp, jobs, col.iso, directory);
          return ph <= 0 && rows.length === 0;
        }) && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Brak godzin w liście płac w tym tygodniu — wpisz je w „Szczegóły dni”.
          </p>
        )}
      </div>
    </div>
  );
}
