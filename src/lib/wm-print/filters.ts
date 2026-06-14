import type { Job } from "@/app/app-domain";
import { inferJobPhase } from "@/lib/job-list-status";
import type { WmPrintJobFilter } from "@/lib/wm-print/types";

export function jobMatchesWmPrintFilter(job: Job, filter: WmPrintJobFilter): boolean {
  if (filter === "all") return true;
  const phase = inferJobPhase(job);
  if (filter === "active") return phase === "in_progress";
  if (filter === "handover") return phase === "handover";
  if (filter === "completed") return phase === "completed";
  if (filter === "invoiced") return job.invoiceStatus === "invoiced" || job.invoiceStatus === "paid";
  return true;
}

export const WM_PRINT_FILTER_LABELS: Record<WmPrintJobFilter, string> = {
  all: "Wszystkie",
  active: "Aktywne",
  handover: "Do odbioru",
  completed: "Zakończone",
  invoiced: "Rozliczone",
};

export function wmPrintJobStatusLabel(job: Job): string {
  const phase = inferJobPhase(job);
  if (phase === "completed") return "Zdane";
  if (phase === "handover") return "Do odbioru";
  if (job.invoiceStatus === "paid") return "Rozliczone";
  if (job.invoiceStatus === "invoiced") return "Zafakturowane";
  return "W trakcie";
}
