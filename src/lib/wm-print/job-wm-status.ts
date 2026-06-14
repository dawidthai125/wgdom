import type { Job } from "@/app/app-domain";
import type { WmPrintJobWmStatus, WmPrintJobWmStatusEntry, WmPrintWmStatusFilter } from "@/lib/wm-print/types";

export const DEFAULT_WM_PRINT_JOB_WM_STATUS: WmPrintJobWmStatus = "in_progress";

export const WM_PRINT_WM_STATUS_ORDER: WmPrintJobWmStatus[] = [
  "in_progress",
  "ready_for_handover",
  "handed_over",
];

export const WM_PRINT_WM_STATUS_LABELS: Record<WmPrintJobWmStatus, string> = {
  in_progress: "W TRAKCIE",
  ready_for_handover: "GOTOWE DO ODBIORU",
  handed_over: "ZDANE",
};

export const WM_PRINT_WM_STATUS_FILTER_LABELS: Record<WmPrintWmStatusFilter, string> = {
  all: "Wszystkie",
  in_progress: "W trakcie",
  ready_for_handover: "Gotowe do odbioru",
  handed_over: "Zdane",
};

const VALID_STATUSES = new Set<WmPrintJobWmStatus>(WM_PRINT_WM_STATUS_ORDER);

export function normalizeWmPrintJobWmStatus(raw: unknown): WmPrintJobWmStatus {
  return VALID_STATUSES.has(raw as WmPrintJobWmStatus) ? (raw as WmPrintJobWmStatus) : DEFAULT_WM_PRINT_JOB_WM_STATUS;
}

export function normalizeWmPrintJobStatuses(raw: unknown): WmPrintJobWmStatusEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is WmPrintJobWmStatusEntry => !!e && typeof e === "object" && typeof (e as WmPrintJobWmStatusEntry).jobId === "string")
    .map((e) => ({
      jobId: e.jobId,
      status: normalizeWmPrintJobWmStatus(e.status),
      updatedAt: typeof e.updatedAt === "string" ? e.updatedAt : new Date(0).toISOString(),
    }));
}

export function mergeWmPrintJobStatuses(
  local: WmPrintJobWmStatusEntry[],
  cloud: unknown,
): WmPrintJobWmStatusEntry[] {
  const map = new Map<string, WmPrintJobWmStatusEntry>();
  const ingest = (list: WmPrintJobWmStatusEntry[]) => {
    for (const e of list) {
      if (!e?.jobId) continue;
      const prev = map.get(e.jobId);
      if (!prev || (e.updatedAt || "") >= (prev.updatedAt || "")) {
        map.set(e.jobId, e);
      }
    }
  };
  ingest(normalizeWmPrintJobStatuses(local));
  ingest(normalizeWmPrintJobStatuses(cloud));
  return [...map.values()];
}

export function getWmPrintJobWmStatus(
  statuses: WmPrintJobWmStatusEntry[],
  jobId: string,
): WmPrintJobWmStatus {
  const hit = statuses.find((e) => e.jobId === jobId);
  return hit ? hit.status : DEFAULT_WM_PRINT_JOB_WM_STATUS;
}

export function setWmPrintJobWmStatus(
  statuses: WmPrintJobWmStatusEntry[],
  jobId: string,
  status: WmPrintJobWmStatus,
): WmPrintJobWmStatusEntry[] {
  const now = new Date().toISOString();
  const idx = statuses.findIndex((e) => e.jobId === jobId);
  if (idx >= 0) {
    return statuses.map((e, i) => (i === idx ? { ...e, status, updatedAt: now } : e));
  }
  return [...statuses, { jobId, status, updatedAt: now }];
}

export function jobMatchesWmPrintWmStatusFilter(
  statuses: WmPrintJobWmStatusEntry[],
  jobId: string,
  filter: WmPrintWmStatusFilter,
): boolean {
  if (filter === "all") return true;
  return getWmPrintJobWmStatus(statuses, jobId) === filter;
}

export function wmPrintJobRecencyKey(job: Job): string {
  return job.updatedAt || job.endDate || job.startDate || job.id;
}

export function sortWmPrintJobsByRecency(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => wmPrintJobRecencyKey(b).localeCompare(wmPrintJobRecencyKey(a)));
}

export function groupWmPrintJobsByWmStatus(
  jobs: Job[],
  statuses: WmPrintJobWmStatusEntry[],
): Record<WmPrintJobWmStatus, Job[]> {
  const buckets: Record<WmPrintJobWmStatus, Job[]> = {
    in_progress: [],
    ready_for_handover: [],
    handed_over: [],
  };
  for (const job of sortWmPrintJobsByRecency(jobs)) {
    buckets[getWmPrintJobWmStatus(statuses, job.id)].push(job);
  }
  return buckets;
}

export function countWmPrintJobsByWmStatus(
  jobs: Job[],
  statuses: WmPrintJobWmStatusEntry[],
): Record<WmPrintJobWmStatus, number> {
  const grouped = groupWmPrintJobsByWmStatus(jobs, statuses);
  return {
    in_progress: grouped.in_progress.length,
    ready_for_handover: grouped.ready_for_handover.length,
    handed_over: grouped.handed_over.length,
  };
}
