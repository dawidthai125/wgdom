import type { Job } from "@/app/app-domain";
import { inferJobPhase, JOB_PHASE_LABELS } from "@/lib/job-list-status";
import type { WmPrintJobFilter } from "@/lib/wm-print/types";

export function jobMatchesWmPrintFilter(job: Job, filter: WmPrintJobFilter): boolean {
  if (filter === "all") return true;
  const phase = inferJobPhase(job);
  if (filter === "in_progress") return phase === "in_progress";
  if (filter === "handover") return phase === "handover";
  if (filter === "completed") return phase === "completed";
  return true;
}

export const WM_PRINT_FILTER_LABELS: Record<WmPrintJobFilter, string> = {
  all: "Wszystkie",
  in_progress: "W trakcie",
  handover: "Do odbioru",
  completed: "Zdane",
};

export function wmPrintJobStatusLabel(job: Job): string {
  return JOB_PHASE_LABELS[inferJobPhase(job)];
}
