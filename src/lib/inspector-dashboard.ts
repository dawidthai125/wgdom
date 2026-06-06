import { DOC_LABELS, REQUIRED_DOCS, type DocType } from "@/lib/job-documents";
import { isInspectorActivityType, type JobActivity } from "@/lib/job-activity";
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

export function urgencyScore(job: InspectorDashboardJob): number {
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
  for (const a of fileAlerts) {
    if (a.missingZlecenie || a.missingKosztorys) actionJobIds.add(a.job.id);
  }
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

/** Grupy checklisty dokumentów (Sprint 20.2A). */
export const INSPECTOR_DOC_GROUP_DOCUMENTATION: readonly DocType[] = [
  "zlecenie", "zakres", "kosztorys", "gwarancje", "rysunek",
];
export const INSPECTOR_DOC_GROUP_MEASUREMENTS: readonly DocType[] = [
  "kominiarz", "pomiary", "oswiadczenia",
];
export const INSPECTOR_DOC_GROUP_PHOTOS: readonly DocType[] = ["zdjecia"];

export type InspectionPriority = "overdue" | "today" | "complete" | "normal";

export interface InspectionProgressBreakdown {
  documentsPct: number;
  filesPct: number;
  stagePct: number;
  photosPct: number;
  notesPct: number;
}

export interface InspectionProgress {
  percent: number;
  breakdown: InspectionProgressBreakdown;
  docsDone: number;
  docsTotal: number;
  missingLabels: string[];
}

export interface InspectorLastActivity {
  actor: string;
  at: string;
  text: string;
}

export type InspectorActionCenterKind =
  | "admin_reply"
  | "missing_file"
  | "missing_doc"
  | "overdue"
  | "ready_no_date";

export interface InspectorActionCenterItem {
  id: string;
  kind: InspectorActionCenterKind;
  job: InspectorDashboardJob;
  label: string;
  urgency: number;
  section?: "wm" | "files" | "docs";
  doc?: DocType;
}

const STAGE_PROGRESS: Record<JobHandoverStage, number> = {
  awaiting_order: 0,
  in_progress: 25,
  docs_pending: 50,
  ready_for_handover: 75,
  handed_over: 100,
};

function hasInspectorCommunication(job: InspectorDashboardJob & { activityLog?: JobActivity[] }): boolean {
  if ((job.jobNotes || []).length > 0) return true;
  return (job.activityLog || []).some(
    (ev) => ev.type === "inspector_note" || isInspectorActivityType(ev.type),
  );
}

/**
 * Postęp kontroli 0–100% z istniejących pól Job (bez nowych KV).
 * Wagi 20.2A.1: documents 50% (REQUIRED_DOCS, bez osobnego filesPct — zlecenie/kosztorys już w 8 dok.).
 * stage 25% · photos 15% · notes 10%.
 */
export function computeInspectionProgress(
  job: InspectorDashboardJob & {
    inspectorPhotos?: { id: string }[];
    jobNotes?: { id: string }[];
    activityLog?: JobActivity[];
  },
): InspectionProgress {
  const docsDone = REQUIRED_DOCS.filter((d) => job.documents[d]).length;
  const docsTotal = REQUIRED_DOCS.length;
  const documentsPct = docsTotal > 0 ? (docsDone / docsTotal) * 50 : 0;

  const filesPct = 0;

  const stage = inferHandoverStage(job);
  const stagePct = (STAGE_PROGRESS[stage] / 100) * 25;

  const photoCount = (job.inspectorPhotos || []).length;
  const photosPct = photoCount >= 1 ? 15 : 0;

  const notesPct = hasInspectorCommunication(job) ? 10 : 0;

  const percent = Math.min(
    100,
    Math.round(documentsPct + stagePct + photosPct + notesPct),
  );

  const missingLabels = REQUIRED_DOCS
    .filter((d) => !job.documents[d])
    .map((d) => DOC_LABELS[d]);

  if (photoCount === 0 && !job.documents.zdjecia) {
    missingLabels.push("Zdjęcia inspektora");
  }

  return {
    percent,
    breakdown: { documentsPct, filesPct, stagePct, photosPct, notesPct },
    docsDone,
    docsTotal,
    missingLabels,
  };
}

export function inspectionPriority(job: InspectorDashboardJob): InspectionPriority {
  const progress = computeInspectionProgress(job);
  if (job.status === "completed" || progress.percent >= 100 || inferHandoverStage(job) === "handed_over") {
    return "complete";
  }
  const stage = inferHandoverStage(job);
  const plan = plannedHandoverStatus(job.plannedHandoverDate || "", stage);
  if (plan === "overdue") return "overdue";
  const days = daysUntilHandover(job.plannedHandoverDate || "");
  if (days === 0) return "today";
  return "normal";
}

export const INSPECTION_PRIORITY_EMOJI: Record<InspectionPriority, string> = {
  overdue: "🔴",
  today: "🟠",
  complete: "🟢",
  normal: "",
};

/** Brakujące elementy do odbioru — max N pozycji (krótkie etykiety). */
export function collectMissingHandoverItems(
  job: InspectorDashboardJob & { inspectorPhotos?: { id: string }[] },
  max = 3,
): string[] {
  const out: string[] = [];
  if (!job.documents.kosztorys) out.push("kosztorys");
  if (!job.documents.pomiary) out.push("pomiary");
  if (!job.documents.kominiarz) out.push("kominiarz");
  if (!job.documents.zlecenie) out.push("zlecenie");
  if (!job.documents.zakres) out.push("zakres");
  if (!job.documents.oswiadczenia) out.push("oświadczenia");
  if (!job.documents.gwarancje) out.push("gwarancje");
  if (!job.documents.rysunek) out.push("rysunek");
  if ((job.inspectorPhotos || []).length === 0 && !job.documents.zdjecia) out.push("zdjęcia");
  return out.slice(0, max);
}

export function getLastInspectorActivity(
  job: InspectorDashboardJob & { activityLog?: JobActivity[] },
): InspectorLastActivity | null {
  const ev = (job.activityLog || []).find((e) => isInspectorActivityType(e.type));
  if (!ev) return null;
  return { actor: ev.actor, at: ev.at, text: ev.text };
}

export function countRequiredDocsDone(job: InspectorDashboardJob): { done: number; total: number } {
  const done = REQUIRED_DOCS.filter((d) => job.documents[d]).length;
  return { done, total: REQUIRED_DOCS.length };
}

/** Zdjęcia ekipy oczekujące na akceptację (status pending). */
export function countPendingCrewPhotos(
  jobs: (InspectorDashboardJob & { photos?: { status: string }[] })[],
): number {
  let n = 0;
  for (const job of jobs) {
    if (job.status !== "in_progress") continue;
    n += (job.photos || []).filter((p) => p.status === "pending").length;
  }
  return n;
}

export function computeInspectorKpiStats(
  jobs: InspectorDashboardJob[],
  adminNotesPending: InspectorDashboardJob[],
) {
  const active = jobs.filter((j) => j.status === "in_progress");
  const completed = jobs.filter((j) => j.status === "completed");
  const needsAttentionIds = new Set<string>();
  adminNotesPending.forEach((j) => needsAttentionIds.add(j.id));
  for (const job of active) {
    const pri = inspectionPriority(job);
    if (pri === "overdue" || pri === "today") needsAttentionIds.add(job.id);
    const missing = collectMissingHandoverItems(job, 1);
    if (missing.length > 0) needsAttentionIds.add(job.id);
    if (!job.documents.zlecenie || !job.documents.kosztorys) needsAttentionIds.add(job.id);
  }
  return {
    activeCount: active.length,
    needsAttentionCount: needsAttentionIds.size,
    completedCount: completed.length,
    pendingPhotosCount: countPendingCrewPhotos(jobs),
  };
}

/** Roboty z odbiorem dziś lub w ciągu 7 dni (plan soon/today). */
export function buildTodayJobs(jobs: InspectorDashboardJob[]): InspectorDashboardJob[] {
  return jobs
    .filter((j) => j.status === "in_progress" && j.plannedHandoverDate)
    .filter((j) => {
      const stage = inferHandoverStage(j);
      const plan = plannedHandoverStatus(j.plannedHandoverDate || "", stage);
      return plan === "soon" || plan === "overdue";
    })
    .sort((a, b) => {
      const da = daysUntilHandover(a.plannedHandoverDate || "") ?? 999;
      const db = daysUntilHandover(b.plannedHandoverDate || "") ?? 999;
      return da - db;
    });
}

export function buildActionCenterItems(
  jobs: InspectorDashboardJob[],
  adminNotesPending: InspectorDashboardJob[],
  maxItems = 3,
): InspectorActionCenterItem[] {
  const items: InspectorActionCenterItem[] = [];

  for (const job of adminNotesPending) {
    items.push({
      id: `admin-${job.id}`,
      kind: "admin_reply",
      job,
      label: "Odpowiedź od admina",
      urgency: 2000 + urgencyScore(job),
      section: "wm",
    });
  }

  for (const alert of buildFileDeliveryAlerts(jobs)) {
    if (!alert.missingZlecenie && !alert.missingKosztorys) continue;
    const missing = alert.missingKosztorys ? "kosztorysu" : "zlecenia";
    items.push({
      id: `file-${alert.job.id}`,
      kind: "missing_file",
      job: alert.job,
      label: `Brak ${missing}`,
      urgency: 1500 + alert.urgency,
      section: "files",
      doc: alert.missingKosztorys ? "kosztorys" : "zlecenie",
    });
  }

  for (const alert of buildMissingDocAlerts(jobs)) {
    const first = alert.missingDocs[0];
    if (!first) continue;
    items.push({
      id: `doc-${alert.job.id}-${first}`,
      kind: "missing_doc",
      job: alert.job,
      label: `Brakuje: ${alert.missingLabels.slice(0, 2).join(", ")}`,
      urgency: 1200 + alert.urgency,
      section: "docs",
      doc: first,
    });
  }

  for (const job of jobs) {
    if (job.status !== "in_progress" || !job.plannedHandoverDate) continue;
    const stage = inferHandoverStage(job);
    if (plannedHandoverStatus(job.plannedHandoverDate, stage) !== "overdue") continue;
    items.push({
      id: `overdue-${job.id}`,
      kind: "overdue",
      job,
      label: "Termin odbioru minął",
      urgency: 1800 + urgencyScore(job),
      section: "wm",
    });
  }

  for (const alert of buildReadyNoDateAlerts(jobs)) {
    items.push({
      id: `nodate-${alert.job.id}`,
      kind: "ready_no_date",
      job: alert.job,
      label: "Gotowe — ustaw datę odbioru",
      urgency: 1000 + alert.urgency,
      section: "wm",
    });
  }

  const seen = new Set<string>();
  return items
    .sort((a, b) => b.urgency - a.urgency)
    .filter((item) => {
      const key = `${item.job.id}-${item.kind}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxItems);
}

const PRIORITY_SORT: Record<InspectionPriority, number> = {
  overdue: 0,
  today: 1,
  normal: 2,
  complete: 3,
};

export function sortJobsByInspectionPriority<T extends InspectorDashboardJob>(jobs: T[]): T[] {
  return [...jobs].sort((a, b) => {
    const pa = PRIORITY_SORT[inspectionPriority(a)];
    const pb = PRIORITY_SORT[inspectionPriority(b)];
    if (pa !== pb) return pa - pb;
    return urgencyScore(b) - urgencyScore(a);
  });
}
