import type { Job } from "@/app/app-domain";
import { inferJobPhase, type JobPhase } from "@/lib/job-list-status";

/** Kolejność sekcji w Odbiorach WM Druk (P1.1 correction — tylko status robota). */
export const WM_PRINT_SECTION_ORDER: JobPhase[] = ["in_progress", "handover", "completed"];

/** Nagłówki sekcji (UI Odbiorów WM). */
export const WM_PRINT_SECTION_LABELS: Record<JobPhase, string> = {
  in_progress: "W TRAKCIE",
  handover: "GOTOWE DO ODBIORU",
  completed: "ZDANE",
};

export function getWmPrintJobPhase(job: Job): JobPhase {
  return inferJobPhase(job);
}

export function wmPrintJobRecencyKey(job: Job): string {
  return job.updatedAt || job.endDate || job.startDate || job.id;
}

export function sortWmPrintJobsByRecency(jobs: Job[]): Job[] {
  return [...jobs].sort((a, b) => wmPrintJobRecencyKey(b).localeCompare(wmPrintJobRecencyKey(a)));
}

export function groupWmPrintJobsByPhase(jobs: Job[]): Record<JobPhase, Job[]> {
  const buckets: Record<JobPhase, Job[]> = {
    in_progress: [],
    handover: [],
    completed: [],
  };
  for (const job of sortWmPrintJobsByRecency(jobs)) {
    buckets[getWmPrintJobPhase(job)].push(job);
  }
  return buckets;
}

export function countWmPrintJobsByPhase(jobs: Job[]): Record<JobPhase, number> {
  const grouped = groupWmPrintJobsByPhase(jobs);
  return {
    in_progress: grouped.in_progress.length,
    handover: grouped.handover.length,
    completed: grouped.completed.length,
  };
}
