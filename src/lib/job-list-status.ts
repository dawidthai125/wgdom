/** Status robót — ręczny wybór + wyświetlanie na liście. */

import { DOC_LABELS, REQUIRED_DOCS, type DocType } from "@/lib/job-documents";
import { isJobHousingSet, type JobMetaFields } from "@/lib/job-meta";
import {
  applyHandoverStageToJob,
  inferHandoverStage,
  isWmClient,
  type JobHandoverStage,
  type JobWmJob,
} from "@/lib/job-wm";

export type JobPhase = "in_progress" | "handover" | "completed";

export type JobListStatusKind = "in_progress" | "docs_pending" | "ready_handover" | "completed";

export type JobListStatusJob = JobWmJob &
  JobMetaFields & {
    status: "in_progress" | "completed";
    documents: Record<DocType, boolean>;
    jobPhase?: JobPhase;
  };

export const JOB_PHASE_LABELS: Record<JobPhase, string> = {
  in_progress: "W trakcie",
  handover: "Gotowe do odbioru",
  completed: "Zdane",
};

export const JOB_PHASE_HINTS: Record<JobPhase, string> = {
  in_progress: "Remont w toku — roboty trwają.",
  handover: "Mieszkanie idzie do odbioru — poniżej widać, czego jeszcze brakuje do zdania.",
  completed: "Robota zakończona i zdana.",
};

export const JOB_LIST_STATUS_CONFIG: Record<
  JobListStatusKind,
  { label: string; hint: string; badgeClass: string; filterLabel: string }
> = {
  in_progress: {
    label: "W trakcie",
    filterLabel: "W trakcie",
    hint: JOB_PHASE_HINTS.in_progress,
    badgeClass: "bg-yellow-500/12 text-yellow-700 dark:text-yellow-400 border-yellow-500/25",
  },
  docs_pending: {
    label: "Do odbioru — braki",
    filterLabel: "Do odbioru",
    hint: JOB_PHASE_HINTS.handover,
    badgeClass: "bg-orange-500/12 text-orange-700 dark:text-orange-400 border-orange-500/25",
  },
  ready_handover: {
    label: "Gotowe do zdania",
    filterLabel: "Do odbioru",
    hint: "Dokumenty skompletowane — można oznaczyć jako zdane.",
    badgeClass: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/25",
  },
  completed: {
    label: "Zdane",
    filterLabel: "Zdane",
    hint: JOB_PHASE_HINTS.completed,
    badgeClass: "bg-green-500/12 text-green-700 dark:text-green-400 border-green-500/25",
  },
};

export function jobMissingRequiredDocs(job: JobListStatusJob): DocType[] {
  return REQUIRED_DOCS.filter((d) => !job.documents[d]);
}

export function inferJobPhase(job: JobListStatusJob): JobPhase {
  if (job.jobPhase) return job.jobPhase;
  if (job.status === "completed" || job.keysHandedOver) return "completed";
  const stage = inferHandoverStage(job);
  if (
    stage === "ready_for_handover"
    || stage === "docs_pending"
    || stage === "awaiting_order"
  ) {
    return "handover";
  }
  if (!isWmClient(job.client)) {
    const missing = jobMissingRequiredDocs(job);
    if (missing.length > 0 && job.documents.zlecenie) return "handover";
    if (missing.length === 0 && isJobHousingSet(job)) return "handover";
  }
  return "in_progress";
}

function handoverStageForPhase(job: JobListStatusJob, phase: JobPhase): JobHandoverStage {
  if (phase === "completed") return "handed_over";
  if (phase === "in_progress") return "in_progress";
  return jobMissingRequiredDocs(job).length === 0 ? "ready_for_handover" : "docs_pending";
}

/** Ustawia fazę robót i synchronizuje status / etap WM. */
export function applyJobPhase<T extends JobListStatusJob>(job: T, phase: JobPhase): T {
  const stage = handoverStageForPhase(job, phase);
  const withPhase = { ...job, jobPhase: phase };
  return applyHandoverStageToJob(withPhase, stage) as T;
}

export function resolveJobListStatus(job: JobListStatusJob): JobListStatusKind {
  const phase = inferJobPhase(job);
  if (phase === "completed") return "completed";
  if (phase === "handover") {
    return jobMissingRequiredDocs(job).length === 0 ? "ready_handover" : "docs_pending";
  }
  return "in_progress";
}

export function missingDocsLabel(job: JobListStatusJob): string {
  const missing = jobMissingRequiredDocs(job);
  if (missing.length === 0) return "";
  return missing.map((d) => DOC_LABELS[d]).join(", ");
}

export type JobListFilter = "all" | "in_progress" | "handover" | "completed";

export function jobMatchesListFilter(job: JobListStatusJob, filter: JobListFilter): boolean {
  const phase = inferJobPhase(job);
  if (filter === "all") return true;
  if (filter === "completed") return phase === "completed";
  if (filter === "in_progress") return phase === "in_progress";
  return phase === "handover";
}

export function countJobsByListFilter(jobs: JobListStatusJob[], filter: JobListFilter): number {
  return jobs.filter((j) => jobMatchesListFilter(j, filter)).length;
}
