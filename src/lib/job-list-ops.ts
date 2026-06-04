/** Roboty 2.0 MIN — KPI, chipy filtrów i sort pilności na liście (bez sync/KV). */

import {
  countJobsByListFilter,
  inferJobPhase,
  jobMatchesListFilter,
  type JobListFilter,
  type JobListStatusJob,
} from "@/lib/job-list-status";
import { canShowStartExecutionButton, wmJobsWithOverduePlanned, type JobWmJob } from "@/lib/job-wm";

export type JobListOpsJob = JobListStatusJob & {
  id: string;
  linkedTenderId?: string;
  executionAssigneeDirectoryIds?: string[];
  startDate: string;
  workEntries?: { directoryId?: string }[];
};

export type JobOpsChip = "no_team" | "bzp_only" | "wm_overdue";

export type JobListOpsKpi = {
  inProgress: number;
  handover: number;
  noTeam: number;
  bzp: number;
  wmOverdue: number;
};

export function jobOpsExecutionCrewCount(job: JobListOpsJob): number {
  return job.executionAssigneeDirectoryIds?.length ?? 0;
}

export function jobOpsHasNoExecutionTeam(job: JobListOpsJob): boolean {
  return inferJobPhase(job) !== "completed" && jobOpsExecutionCrewCount(job) === 0;
}

export function jobOpsIsBzpContract(job: JobListOpsJob): boolean {
  return Boolean(job.linkedTenderId?.trim());
}

export function jobOpsIsBzpNotStarted(job: JobListOpsJob): boolean {
  return jobOpsIsBzpContract(job) && canShowStartExecutionButton(job as JobWmJob & { linkedTenderId?: string });
}

export function jobOpsIsWmOverdue(job: JobListOpsJob, overdueIds: Set<string>): boolean {
  return overdueIds.has(job.id);
}

export function wmOverdueJobIdSet(jobs: JobListOpsJob[]): Set<string> {
  return new Set(wmJobsWithOverduePlanned(jobs).map((j) => j.id));
}

export function computeJobListOpsKpi(jobs: JobListOpsJob[]): JobListOpsKpi {
  const overdueIds = wmOverdueJobIdSet(jobs);
  let noTeam = 0;
  let bzp = 0;
  for (const j of jobs) {
    if (jobOpsHasNoExecutionTeam(j)) noTeam += 1;
    if (jobOpsIsBzpContract(j) && inferJobPhase(j) !== "completed") bzp += 1;
  }
  return {
    inProgress: countJobsByListFilter(jobs, "in_progress"),
    handover: countJobsByListFilter(jobs, "handover"),
    noTeam,
    bzp,
    wmOverdue: overdueIds.size,
  };
}

export function jobMatchesOpsChip(
  job: JobListOpsJob,
  chip: JobOpsChip,
  overdueIds: Set<string>,
): boolean {
  switch (chip) {
    case "no_team":
      return jobOpsHasNoExecutionTeam(job);
    case "bzp_only":
      return jobOpsIsBzpContract(job) && inferJobPhase(job) !== "completed";
    case "wm_overdue":
      return jobOpsIsWmOverdue(job, overdueIds);
    default:
      return true;
  }
}

/** Niższy wynik = wyżej na liście (w obrębie grupy miesiąca). */
export function jobOpsPriorityRank(job: JobListOpsJob, overdueIds: Set<string>): number {
  if (jobOpsIsWmOverdue(job, overdueIds)) return 0;
  if (jobOpsHasNoExecutionTeam(job)) return 1;
  if (jobOpsIsBzpNotStarted(job)) return 2;
  return 3;
}

export function compareJobsByOpsPriority(
  a: JobListOpsJob,
  b: JobListOpsJob,
  overdueIds: Set<string>,
): number {
  const ra = jobOpsPriorityRank(a, overdueIds);
  const rb = jobOpsPriorityRank(b, overdueIds);
  if (ra !== rb) return ra - rb;
  return (b.startDate || "").localeCompare(a.startDate || "");
}

export function sortJobsInMonthGroup<T extends JobListOpsJob>(
  jobs: T[],
  overdueIds: Set<string>,
): T[] {
  return [...jobs].sort((a, b) => compareJobsByOpsPriority(a, b, overdueIds));
}

export function filterJobsForListView(
  jobs: JobListOpsJob[],
  opts: {
    phaseFilter: JobListFilter;
    opsChip: JobOpsChip | null;
    overdueIds: Set<string>;
    workerDirectoryId: string;
    searchQuery: string;
  },
): JobListOpsJob[] {
  const q = opts.searchQuery.trim().toLowerCase();
  return jobs.filter((j) => {
    if (!jobMatchesListFilter(j, opts.phaseFilter)) return false;
    if (opts.opsChip && !jobMatchesOpsChip(j, opts.opsChip, opts.overdueIds)) return false;
    if (opts.workerDirectoryId && !j.workEntries?.some((e) => e.directoryId === opts.workerDirectoryId)) {
      return false;
    }
    if (!q) return true;
    return (
      j.address?.toLowerCase().includes(q)
      || j.client?.toLowerCase().includes(q)
      || j.flatNumber?.toLowerCase().includes(q)
    );
  });
}

/** Mapowanie KPI → chip (tylko operacyjne; fazy obsługuje JobsView). */
export function opsChipForKpiKey(key: "noTeam" | "bzp" | "wmOverdue"): JobOpsChip {
  if (key === "noTeam") return "no_team";
  if (key === "bzp") return "bzp_only";
  return "wm_overdue";
}
