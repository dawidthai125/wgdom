/** Roboty 2.0 MIN/MID-B — KPI, chipy, kolejki i filtry listy (bez sync/KV). */

import {
  countJobsByListFilter,
  inferJobPhase,
  jobMatchesListFilter,
  jobMissingRequiredDocs,
  type JobListFilter,
  type JobListStatusJob,
} from "@/lib/job-list-status";
import { canShowStartExecutionButton, wmJobsWithOverduePlanned, type JobWmJob } from "@/lib/job-wm";

export type JobListOpsJob = JobListStatusJob & {
  id: string;
  linkedTenderId?: string;
  executionLeadDirectoryId?: string;
  executionAssigneeDirectoryIds?: string[];
  plannedHandoverDate?: string;
  startDate: string;
  workEntries?: { directoryId?: string }[];
};

export type JobOpsChip = "no_team" | "bzp_only" | "wm_overdue";

export type JobListViewMode = "list" | "queues";

export type JobQueueSectionId =
  | "wm_overdue"
  | "bzp_needs_start"
  | "no_team"
  | "docs_pending"
  | "ready_handover"
  | "stale_docs";

export type JobQueueSection = {
  id: JobQueueSectionId;
  title: string;
  emptyText: string;
  jobs: JobListOpsJob[];
};

export const LEAD_FILTER_NO_LEAD = "__no_lead__";

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

export function jobOpsDaysSinceStart(job: JobListOpsJob): number {
  const start = new Date(job.startDate);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(0, Math.round((Date.now() - start.getTime()) / 86400000));
}

export function jobOpsStaleDocs(job: JobListOpsJob): boolean {
  return (
    inferJobPhase(job) === "in_progress"
    && jobMissingRequiredDocs(job).length > 0
    && jobOpsDaysSinceStart(job) >= 7
  );
}

export function jobOpsIsDocsPendingHandover(job: JobListOpsJob): boolean {
  return inferJobPhase(job) === "handover" && jobMissingRequiredDocs(job).length > 0;
}

export function jobOpsIsReadyHandover(job: JobListOpsJob): boolean {
  return inferJobPhase(job) === "handover" && jobMissingRequiredDocs(job).length === 0;
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

/** SSOT badge menu admina Roboty — fazy operacyjne Jobs 2.0 (20.5Z.5A). */
export function countActiveJobsForNavBadge(jobs: JobListOpsJob[]): number {
  return countJobsByListFilter(jobs, "in_progress") + countJobsByListFilter(jobs, "handover");
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

export function applyLeadFilter(jobs: JobListOpsJob[], leadFilter: string): JobListOpsJob[] {
  if (!leadFilter) return jobs;
  if (leadFilter === LEAD_FILTER_NO_LEAD) {
    return jobs.filter((j) => !j.executionLeadDirectoryId?.trim());
  }
  return jobs.filter((j) => j.executionLeadDirectoryId === leadFilter);
}

export function filterJobsForListView(
  jobs: JobListOpsJob[],
  opts: {
    phaseFilter: JobListFilter;
    opsChip: JobOpsChip | null;
    overdueIds: Set<string>;
    workerDirectoryId: string;
    leadFilter?: string;
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
    if (opts.leadFilter === LEAD_FILTER_NO_LEAD) {
      if (j.executionLeadDirectoryId?.trim()) return false;
    } else if (opts.leadFilter && j.executionLeadDirectoryId !== opts.leadFilter) {
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

function sortWmOverdueQueue(jobs: JobListOpsJob[]): JobListOpsJob[] {
  return [...jobs].sort((a, b) =>
    (a.plannedHandoverDate || "").localeCompare(b.plannedHandoverDate || ""),
  );
}

function sortByStartDateDesc(jobs: JobListOpsJob[]): JobListOpsJob[] {
  return [...jobs].sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
}

function sortDocsPendingQueue(jobs: JobListOpsJob[]): JobListOpsJob[] {
  return [...jobs].sort((a, b) => {
    const missDiff = jobMissingRequiredDocs(b).length - jobMissingRequiredDocs(a).length;
    if (missDiff !== 0) return missDiff;
    return (b.startDate || "").localeCompare(a.startDate || "");
  });
}

function sortReadyHandoverQueue(jobs: JobListOpsJob[]): JobListOpsJob[] {
  return [...jobs].sort((a, b) => {
    const pa = a.plannedHandoverDate || "";
    const pb = b.plannedHandoverDate || "";
    if (pa && pb) return pa.localeCompare(pb);
    if (pa) return -1;
    if (pb) return 1;
    return (b.startDate || "").localeCompare(a.startDate || "");
  });
}

function sortStaleDocsQueue(jobs: JobListOpsJob[]): JobListOpsJob[] {
  return [...jobs].sort((a, b) => {
    const daysDiff = jobOpsDaysSinceStart(b) - jobOpsDaysSinceStart(a);
    if (daysDiff !== 0) return daysDiff;
    const missDiff = jobMissingRequiredDocs(b).length - jobMissingRequiredDocs(a).length;
    if (missDiff !== 0) return missDiff;
    return (a.address || "").localeCompare(b.address || "", "pl");
  });
}

const QUEUE_SECTION_ORDER: {
  id: JobQueueSectionId;
  title: string;
  emptyText: string;
  match: (job: JobListOpsJob, overdueIds: Set<string>) => boolean;
  sort: (jobs: JobListOpsJob[], overdueIds: Set<string>) => JobListOpsJob[];
}[] = [
  {
    id: "wm_overdue",
    title: "WM po terminie",
    emptyText: "Brak robót WM z przeterminowanym planowanym odbiorem.",
    match: (job, overdueIds) =>
      inferJobPhase(job) !== "completed" && jobOpsIsWmOverdue(job, overdueIds),
    sort: (jobs) => sortWmOverdueQueue(jobs),
  },
  {
    id: "bzp_needs_start",
    title: "BZP wymaga startu",
    emptyText: "Wszystkie kontrakty BZP są w realizacji lub zdane.",
    match: (job) => inferJobPhase(job) !== "completed" && jobOpsIsBzpNotStarted(job),
    sort: (jobs) => sortByStartDateDesc(jobs),
  },
  {
    id: "no_team",
    title: "Bez ekipy",
    emptyText: "Wszystkie aktywne roboty mają przypisaną ekipę planową.",
    match: (job) => jobOpsHasNoExecutionTeam(job),
    sort: (jobs, overdueIds) => sortJobsInMonthGroup(jobs, overdueIds),
  },
  {
    id: "docs_pending",
    title: "Do odbioru — braki",
    emptyText: "Brak robót do odbioru z brakującymi dokumentami.",
    match: (job) => jobOpsIsDocsPendingHandover(job),
    sort: (jobs) => sortDocsPendingQueue(jobs),
  },
  {
    id: "ready_handover",
    title: "Gotowe do zdania",
    emptyText: "Brak robót gotowych do oznaczenia jako zdane.",
    match: (job) => jobOpsIsReadyHandover(job),
    sort: (jobs) => sortReadyHandoverQueue(jobs),
  },
  {
    id: "stale_docs",
    title: "Dokumenty >7 dni",
    emptyText: "Brak robót w toku dłużej niż 7 dni bez kompletu dokumentów.",
    match: (job) => jobOpsStaleDocs(job),
    sort: (jobs) => sortStaleDocsQueue(jobs),
  },
];

/** Kolejki rozłączne — jedna robota max w jednej sekcji (priorytet 1→6). */
export function buildJobQueueSections(
  globalFiltered: JobListOpsJob[],
  overdueIds: Set<string>,
): JobQueueSection[] {
  const assigned = new Set<string>();
  return QUEUE_SECTION_ORDER.map((def) => {
    const matched = globalFiltered.filter(
      (j) => !assigned.has(j.id) && def.match(j, overdueIds),
    );
    const sectionJobs = def.sort(matched, overdueIds);
    for (const j of sectionJobs) assigned.add(j.id);
    return {
      id: def.id,
      title: def.title,
      emptyText: def.emptyText,
      jobs: sectionJobs,
    };
  });
}

/** Grupowanie po miesiącu startDate — tryb Lista (T1 smoke). */
export function groupJobsByStartMonth<T extends JobListOpsJob>(jobs: T[]): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const j of jobs) {
    const d = new Date(j.startDate);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(j);
  }
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

/** Mapowanie KPI → chip (tylko operacyjne; fazy obsługuje JobsView). */
export function opsChipForKpiKey(key: "noTeam" | "bzp" | "wmOverdue"): JobOpsChip {
  if (key === "noTeam") return "no_team";
  if (key === "bzp") return "bzp_only";
  return "wm_overdue";
}
