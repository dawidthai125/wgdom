/** Ujednolicony status robót na liście — czytelniejszy niż surowe status + etap WM. */

import { REQUIRED_DOCS, type DocType } from "@/lib/job-documents";
import { isJobHousingSet, type JobMetaFields } from "@/lib/job-meta";
import { inferHandoverStage, isWmClient, type JobWmJob } from "@/lib/job-wm";

export type JobListStatusKind = "in_progress" | "docs_pending" | "ready_handover" | "completed";

export type JobListStatusJob = JobWmJob &
  JobMetaFields & {
    status: "in_progress" | "completed";
    documents: Record<DocType, boolean>;
  };

export const JOB_LIST_STATUS_CONFIG: Record<
  JobListStatusKind,
  { label: string; hint: string; badgeClass: string; filterLabel: string }
> = {
  in_progress: {
    label: "W trakcie",
    filterLabel: "W trakcie",
    hint: "Remont w toku — roboty trwają.",
    badgeClass: "bg-yellow-500/12 text-yellow-700 dark:text-yellow-400 border-yellow-500/25",
  },
  docs_pending: {
    label: "Gotowe do odbioru",
    filterLabel: "Do odbioru",
    hint: "Mieszkanie idzie do odbioru — trzeba jeszcze skompletować brakujące dokumenty (zlecenie, kosztorys, kominiarz itd.).",
    badgeClass: "bg-orange-500/12 text-orange-700 dark:text-orange-400 border-orange-500/25",
  },
  ready_handover: {
    label: "Komplet do odbioru",
    filterLabel: "Komplet",
    hint: "Wszystkie wymagane dokumenty są — można oznaczyć jako zdane lub umawiać odbiór WM.",
    badgeClass: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  },
  completed: {
    label: "Zdane",
    filterLabel: "Zdane",
    hint: "Robota zakończona — dokumenty i odbiór zamknięte.",
    badgeClass: "bg-green-500/12 text-green-700 dark:text-green-400 border-green-500/25",
  },
};

export function jobMissingRequiredDocs(job: JobListStatusJob): DocType[] {
  return REQUIRED_DOCS.filter((d) => !job.documents[d]);
}

export function resolveJobListStatus(job: JobListStatusJob): JobListStatusKind {
  if (job.status === "completed" || job.keysHandedOver) return "completed";

  const missing = jobMissingRequiredDocs(job);
  const allDocs = missing.length === 0;

  if (isWmClient(job.client)) {
    const stage = inferHandoverStage(job);
    if (stage === "ready_for_handover") return "ready_handover";
    if (stage === "docs_pending" || stage === "awaiting_order") return "docs_pending";
    if (allDocs) return "ready_handover";
    return "in_progress";
  }

  if (allDocs && isJobHousingSet(job)) return "ready_handover";
  if (missing.length > 0 && job.documents.zlecenie) return "docs_pending";
  return "in_progress";
}

export type JobListFilter = "all" | "in_progress" | "handover" | "completed";

export function jobMatchesListFilter(job: JobListStatusJob, filter: JobListFilter): boolean {
  const status = resolveJobListStatus(job);
  if (filter === "all") return true;
  if (filter === "completed") return status === "completed";
  if (filter === "in_progress") return status === "in_progress";
  return status === "docs_pending" || status === "ready_handover";
}

export function countJobsByListFilter(jobs: JobListStatusJob[], filter: JobListFilter): number {
  return jobs.filter((j) => jobMatchesListFilter(j, filter)).length;
}
