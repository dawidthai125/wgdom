/**
 * PAYROLL-ASSIGNMENTS-P1 — edycja job.workEntries[] z Listy Płac (SSOT bez zmian).
 * Reużywa payrollJobConsistencyAlerts / jobSitesForEmployeeOnDate z app-domain.
 */

import {
  type Job,
  type WeekEmployee,
  type DirectoryEmployee,
  type WorkEntry,
  type PayrollJobConsistencyAlert,
  dayBaseHoursOnly,
  dayKeyForIsoInWeek,
  distributeHoursAcrossEntries,
  formatJobStreet,
  isMultiSiteEmployee,
  jobHoursComparableToPayrollBase,
  jobHoursForEmployeeOnDate,
  jobSitesForEmployeeOnDate,
  normalizeEmpName,
  payrollJobConsistencyAlerts,
  previousIsoDate,
  workEntryMatchesEmployee,
} from "@/app/app-domain";
import { inferJobPhase } from "@/lib/job-list-status";

export type PayrollAssignmentBadgeStatus = "ok" | "unassigned" | "mismatch" | "skip";

export interface PayrollDayAssignmentFooter {
  payrollHours: number;
  jobHours: number;
  status: "ok" | "unassigned" | "mismatch" | "empty";
  message: string;
}

const TOLERANCE = 0.01;

export function jobsForPayrollAssignmentDropdown(jobs: Job[]): Job[] {
  return jobs
    .filter((j) => inferJobPhase(j) !== "completed")
    .sort((a, b) => formatJobStreet(a).localeCompare(formatJobStreet(b), "pl"));
}

export function payrollAssignmentAlertsForWeek(
  weekEmployees: WeekEmployee[],
  jobs: Job[],
  weekFrom: string,
  weekTo: string,
  directory: DirectoryEmployee[],
): PayrollJobConsistencyAlert[] {
  return payrollJobConsistencyAlerts(weekEmployees, jobs, weekFrom, weekTo, directory);
}

export function alertsForEmployee(
  alerts: PayrollJobConsistencyAlert[],
  emp: WeekEmployee,
): PayrollJobConsistencyAlert[] {
  return alerts.filter((a) => normalizeEmpName(a.name) === normalizeEmpName(emp.name));
}

export function employeePayrollAssignmentBadge(
  emp: WeekEmployee,
  alerts: PayrollJobConsistencyAlert[],
  directory: DirectoryEmployee[],
): PayrollAssignmentBadgeStatus {
  if (isMultiSiteEmployee(emp, directory)) return "skip";
  const empAlerts = alertsForEmployee(alerts, emp);
  if (empAlerts.some((a) => a.kind === "mismatch" || a.kind === "job_only")) return "mismatch";
  if (empAlerts.some((a) => a.kind === "payroll_only")) return "unassigned";
  return "ok";
}

export function dayPayrollAssignmentFooter(
  emp: WeekEmployee,
  jobs: Job[],
  dateIso: string,
  weekFrom: string,
  directory: DirectoryEmployee[],
  alerts: PayrollJobConsistencyAlert[],
): PayrollDayAssignmentFooter {
  const dayKey = dayKeyForIsoInWeek(dateIso, weekFrom);
  const payrollHours = dayKey ? +dayBaseHoursOnly(emp.days[dayKey]).toFixed(2) : 0;
  const jobHours = +jobHoursComparableToPayrollBase(emp, jobs, dateIso, directory, weekFrom).toFixed(2);

  if (payrollHours <= TOLERANCE && jobHours <= TOLERANCE) {
    return { payrollHours, jobHours, status: "empty", message: "" };
  }

  const alert = alertsForEmployee(alerts, emp).find((a) => a.dateIso === dateIso);
  if (alert) {
    if (alert.kind === "payroll_only") {
      const diff = +(payrollHours - jobHours).toFixed(2);
      return {
        payrollHours,
        jobHours,
        status: "unassigned",
        message: `❌ Brakuje ${diff}h`,
      };
    }
    if (alert.kind === "job_only") {
      const diff = +(jobHours - payrollHours).toFixed(2);
      return {
        payrollHours,
        jobHours,
        status: "mismatch",
        message: `❌ Nadmiar ${diff}h`,
      };
    }
    if (alert.kind === "mismatch") {
      const diff = Math.abs(payrollHours - jobHours);
      if (payrollHours > jobHours) {
        return {
          payrollHours,
          jobHours,
          status: "mismatch",
          message: `❌ Brakuje ${+diff.toFixed(2)}h`,
        };
      }
      return {
        payrollHours,
        jobHours,
        status: "mismatch",
        message: `❌ Nadmiar ${+diff.toFixed(2)}h`,
      };
    }
  }

  if (Math.abs(payrollHours - jobHours) <= TOLERANCE) {
    return { payrollHours, jobHours, status: "ok", message: "✅ Spójne" };
  }

  const diff = Math.abs(payrollHours - jobHours);
  if (payrollHours > jobHours) {
    return {
      payrollHours,
      jobHours,
      status: "mismatch",
      message: `❌ Brakuje ${+diff.toFixed(2)}h`,
    };
  }
  return {
    payrollHours,
    jobHours,
    status: "mismatch",
    message: `❌ Nadmiar ${+diff.toFixed(2)}h`,
  };
}

export function employeeDayAssignmentRows(
  emp: WeekEmployee,
  jobs: Job[],
  dateIso: string,
  directory: DirectoryEmployee[],
): { jobId: string; entryId: string; label: string; hours: number }[] {
  return jobSitesForEmployeeOnDate(emp, jobs, dateIso, directory);
}

export function canCopyAssignmentsFromPreviousDay(
  emp: WeekEmployee,
  jobs: Job[],
  targetDateIso: string,
  weekFrom: string,
  directory: DirectoryEmployee[],
): boolean {
  const dayKey = dayKeyForIsoInWeek(targetDateIso, weekFrom);
  if (!dayKey) return false;
  if (dayBaseHoursOnly(emp.days[dayKey]) <= TOLERANCE) return false;
  if (employeeDayAssignmentRows(emp, jobs, targetDateIso, directory).length > 0) return false;
  const yesterday = previousIsoDate(targetDateIso);
  return employeeDayAssignmentRows(emp, jobs, yesterday, directory).length > 0;
}

/** Kopiuje strukturę robót z wczoraj — godziny wg proporcji wczoraj, suma = lista płac dziś. */
export function copyEmployeeAssignmentsFromPreviousDay(
  emp: WeekEmployee,
  jobs: Job[],
  targetDateIso: string,
  weekEmployees: WeekEmployee[],
  weekFrom: string,
  directory: DirectoryEmployee[],
): Job[] {
  if (!canCopyAssignmentsFromPreviousDay(emp, jobs, targetDateIso, weekFrom, directory)) {
    return jobs;
  }
  const dayKey = dayKeyForIsoInWeek(targetDateIso, weekFrom)!;
  const payrollHours = dayBaseHoursOnly(emp.days[dayKey]);
  const yesterday = previousIsoDate(targetDateIso);
  const yesterdaySites = employeeDayAssignmentRows(emp, jobs, yesterday, directory);
  const weights = yesterdaySites.map((s) => ({
    jobId: s.jobId,
    entryId: s.jobId,
    hours: s.hours,
  }));
  const hourByJobId = distributeHoursAcrossEntries(weights, payrollHours);
  const rate = parseFloat(emp.rate) || 0;

  return jobs.map((job) => {
    const h = hourByJobId.get(job.id);
    if (h == null || h <= 0) return job;
    const newEntry: WorkEntry = {
      id: crypto.randomUUID(),
      directoryId: emp.directoryId || "",
      employeeName: emp.name,
      date: targetDateIso,
      hours: h,
      rate,
      notes: "",
    };
    return { ...job, workEntries: [...job.workEntries, newEntry] };
  });
}

export function updateWorkEntryHoursInJobs(
  jobs: Job[],
  jobId: string,
  entryId: string,
  hours: number,
): Job[] {
  return jobs.map((job) => {
    if (job.id !== jobId) return job;
    return {
      ...job,
      workEntries: job.workEntries.map((we) =>
        we.id === entryId ? { ...we, hours: Math.max(0, hours) } : we,
      ),
    };
  });
}

export function removeWorkEntryFromJobs(jobs: Job[], jobId: string, entryId: string): Job[] {
  return jobs.map((job) => {
    if (job.id !== jobId) return job;
    return { ...job, workEntries: job.workEntries.filter((we) => we.id !== entryId) };
  });
}

export function moveWorkEntryToJob(
  jobs: Job[],
  fromJobId: string,
  entryId: string,
  toJobId: string,
  hours: number,
): Job[] {
  let moved: WorkEntry | null = null;
  const stripped = jobs.map((job) => {
    if (job.id !== fromJobId) return job;
    const entry = job.workEntries.find((we) => we.id === entryId);
    if (!entry) return job;
    moved = { ...entry, hours };
    return { ...job, workEntries: job.workEntries.filter((we) => we.id !== entryId) };
  });
  if (!moved) return jobs;
  return stripped.map((job) => {
    if (job.id !== toJobId) return job;
    return { ...job, workEntries: [...job.workEntries, { ...moved!, id: crypto.randomUUID() }] };
  });
}

export function addWorkEntryForEmployee(
  jobs: Job[],
  jobId: string,
  emp: WeekEmployee,
  dateIso: string,
  hours: number,
): Job[] {
  const rate = parseFloat(emp.rate) || 0;
  const entry: WorkEntry = {
    id: crypto.randomUUID(),
    directoryId: emp.directoryId || "",
    employeeName: emp.name,
    date: dateIso,
    hours,
    rate,
    notes: "",
  };
  return jobs.map((job) =>
    job.id === jobId ? { ...job, workEntries: [...job.workEntries, entry] } : job,
  );
}

/** Suma godzin na robotach (surowa) — do wyświetlenia w stopce dnia. */
export function rawJobHoursForEmployeeOnDate(
  emp: WeekEmployee,
  jobs: Job[],
  dateIso: string,
  directory: DirectoryEmployee[],
): number {
  return jobHoursForEmployeeOnDate(emp, jobs, dateIso, directory);
}

export function workEntryBelongsToEmployee(
  emp: WeekEmployee,
  entry: WorkEntry,
  directory: DirectoryEmployee[],
): boolean {
  return workEntryMatchesEmployee(emp, entry, directory);
}
