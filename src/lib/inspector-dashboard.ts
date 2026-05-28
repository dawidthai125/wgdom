import { DOC_LABELS, REQUIRED_DOCS, type DocType } from "@/lib/job-documents";
import {
  inferHandoverStage,
  plannedHandoverStatus,
  type JobHandoverStage,
  type JobWmJob,
} from "@/lib/job-wm";

export type InspectorDashboardJob = JobWmJob & {
  startDate: string;
};

export type DashboardPlanStatus = ReturnType<typeof plannedHandoverStatus>;

export interface DashboardFileAlert {
  job: InspectorDashboardJob;
  urgency: number;
  missingZlecenie: boolean;
  missingKosztorys: boolean;
  planStatus: DashboardPlanStatus;
  stage: JobHandoverStage;
}

export interface DashboardDocAlert {
  job: InspectorDashboardJob;
  urgency: number;
  missingDocs: DocType[];
  missingLabels: string[];
  planStatus: DashboardPlanStatus;
  stage: JobHandoverStage;
}

export type DashboardFilter = "all" | "pliki" | "dokumenty" | "terminy" | "admin";

export interface DashboardReadyNoDateAlert {
  job: InspectorDashboardJob;
  urgency: number;
}

function urgencyScore(job: InspectorDashboardJob): number {
  const stage = inferHandoverStage(job);
  const plan = plannedHandoverStatus(job.plannedHandoverDate || "", stage);
  let score = 0;
  if (plan === "overdue") score += 1000;
  else if (plan === "soon") score += 500;
  if (!job.documents.zlecenie) score += 100;
  if (!job.documents.kosztorys) score += 100;
  const missingOther = REQUIRED_DOCS.filter((d) => d !== "zlecenie" && d !== "kosztorys" && !job.documents[d]);
  score += missingOther.length * 20;
  if (stage === "ready_for_handover" && !job.plannedHandoverDate) score += 80;
  return score;
}

function sortByUrgency<T extends { urgency: number; job: InspectorDashboardJob }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (b.urgency !== a.urgency) return b.urgency - a.urgency;
    return (a.job.plannedHandoverDate || "9999").localeCompare(b.job.plannedHandoverDate || "9999");
  });
}

export function buildFileDeliveryAlerts(jobs: InspectorDashboardJob[]): DashboardFileAlert[] {
  const active = jobs.filter((j) => j.status === "in_progress");
  const items: DashboardFileAlert[] = [];
  for (const job of active) {
    const missingZlecenie = !job.documents.zlecenie;
    const missingKosztorys = !job.documents.kosztorys;
    if (!missingZlecenie && !missingKosztorys) continue;
    const stage = inferHandoverStage(job);
    items.push({
      job,
      urgency: urgencyScore(job),
      missingZlecenie,
      missingKosztorys,
      planStatus: plannedHandoverStatus(job.plannedHandoverDate || "", stage),
      stage,
    });
  }
  return sortByUrgency(items);
}

export function buildMissingDocAlerts(jobs: InspectorDashboardJob[]): DashboardDocAlert[] {
  const active = jobs.filter((j) => j.status === "in_progress");
  const items: DashboardDocAlert[] = [];
  for (const job of active) {
    const missing = REQUIRED_DOCS.filter(
      (d) => d !== "zlecenie" && d !== "kosztorys" && !job.documents[d],
    );
    if (missing.length === 0) continue;
    const stage = inferHandoverStage(job);
    items.push({
      job,
      urgency: urgencyScore(job),
      missingDocs: missing,
      missingLabels: missing.map((d) => DOC_LABELS[d]),
      planStatus: plannedHandoverStatus(job.plannedHandoverDate || "", stage),
      stage,
    });
  }
  return sortByUrgency(items);
}

export function buildReadyNoDateAlerts(jobs: InspectorDashboardJob[]): DashboardReadyNoDateAlert[] {
  const items: DashboardReadyNoDateAlert[] = [];
  for (const job of jobs) {
    if (job.status !== "in_progress") continue;
    if (inferHandoverStage(job) !== "ready_for_handover") continue;
    if (job.plannedHandoverDate) continue;
    items.push({ job, urgency: urgencyScore(job) });
  }
  return sortByUrgency(items);
}

export function computeInspectorDashboardStats(
  jobs: InspectorDashboardJob[],
  adminNotesCount: number,
) {
  const active = jobs.filter((j) => j.status === "in_progress");
  let overdue = 0;
  let soon = 0;
  let missingZlecenie = 0;
  let missingKosztorys = 0;

  for (const job of active) {
    if (!job.documents.zlecenie) missingZlecenie++;
    if (!job.documents.kosztorys) missingKosztorys++;
    const stage = inferHandoverStage(job);
    const plan = plannedHandoverStatus(job.plannedHandoverDate || "", stage);
    if (plan === "overdue") overdue++;
    if (plan === "soon") soon++;
  }

  const fileAlerts = buildFileDeliveryAlerts(jobs);
  const docAlerts = buildMissingDocAlerts(jobs);
  const readyNoDate = buildReadyNoDateAlerts(jobs);

  const actionJobIds = new Set<string>();
  for (const a of fileAlerts) actionJobIds.add(a.job.id);
  for (const a of docAlerts) actionJobIds.add(a.job.id);
  for (const a of readyNoDate) actionJobIds.add(a.job.id);
  for (let i = 0; i < adminNotesCount; i++) {
    /* admin ids added in panel */
  }

  return {
    activeCount: active.length,
    missingZlecenie,
    missingKosztorys,
    overdue,
    soon,
    adminNotesCount,
    fileAlerts,
    docAlerts,
    readyNoDate,
    actionJobCount: actionJobIds.size,
  };
}

export function daysUntilHandover(iso: string): number | null {
  if (!iso) return null;
  const p = new Date(iso);
  if (Number.isNaN(p.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  p.setHours(0, 0, 0, 0);
  return Math.round((p.getTime() - today.getTime()) / 86400000);
}

export function planStatusBadge(plan: DashboardPlanStatus, plannedDate?: string): { text: string; tone: "red" | "amber" | "muted" } | null {
  if (plan === "overdue") {
    const d = daysUntilHandover(plannedDate || "");
    return { text: d != null ? `Termin minął (${Math.abs(d)} dni temu)` : "Termin minął", tone: "red" };
  }
  if (plan === "soon") {
    const d = daysUntilHandover(plannedDate || "");
    return { text: d != null ? (d === 0 ? "Odbiór dziś" : `Odbiór za ${d} dni`) : "Odbiór wkrótce", tone: "amber" };
  }
  return null;
}

export type QuickMarkDoc = DocType;
