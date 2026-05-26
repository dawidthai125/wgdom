/** Wrocławskie Mieszkania — etap odbioru, notatki, zdjęcia inspektora, portfolio. */

import { REQUIRED_DOCS, type DocType } from "@/lib/job-documents";

export const HANDOVER_STAGES = [
  "awaiting_order",
  "in_progress",
  "docs_pending",
  "ready_for_handover",
  "handed_over",
] as const;

export type JobHandoverStage = (typeof HANDOVER_STAGES)[number];

export const HANDOVER_STAGE_LABELS: Record<JobHandoverStage, string> = {
  awaiting_order: "Czeka na zlecenie",
  in_progress: "W realizacji",
  docs_pending: "Dokumenty do odbioru",
  ready_for_handover: "Gotowa do odbioru WM",
  handed_over: "Odebrana",
};

export const HANDOVER_STAGE_HINTS: Record<JobHandoverStage, string> = {
  awaiting_order: "Brak zlecenia — inspektor lub admin musi oznaczyć / wgrać PDF.",
  in_progress: "Ekipa pracuje, remont w toku.",
  docs_pending: "Trwają roboty, ale brakuje dokumentów do pełnego odbioru.",
  ready_for_handover: "Komplet do odbioru przez WM — można umawiać termin.",
  handed_over: "Mieszkanie odebrane, klucze zdane.",
};

export type JobNoteAuthorRole = "inspector" | "admin";

export interface JobNote {
  id: string;
  author: string;
  authorRole: JobNoteAuthorRole;
  text: string;
  at: string;
}

export interface InspectorPhotoEntry {
  id: string;
  path: string;
  publicUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  caption?: string;
}

export interface JobWmData {
  handoverStage?: JobHandoverStage;
  plannedHandoverDate?: string;
  jobNotes?: JobNote[];
  inspectorPhotos?: InspectorPhotoEntry[];
}

export type JobWmJob = JobWmData & {
  id: string;
  address: string;
  flatNumber: string;
  client: string;
  status: "in_progress" | "completed";
  keysHandedOver: boolean;
  documents: Record<DocType, boolean>;
  startDate: string;
};

export function isWmClient(client: string): boolean {
  const c = client.toLowerCase();
  return c.includes("wrocławskie") || c.includes("wroclawskie") || c.includes("mieszkania");
}

export function inferHandoverStage(job: JobWmJob): JobHandoverStage {
  if (job.handoverStage && HANDOVER_STAGES.includes(job.handoverStage)) {
    return job.handoverStage;
  }
  if (job.keysHandedOver || job.status === "completed") return "handed_over";
  if (job.documents.zlecenie && REQUIRED_DOCS.some((d) => !job.documents[d])) return "docs_pending";
  if (!job.documents.zlecenie) return "awaiting_order";
  return "in_progress";
}

export function normalizeJobWmFields<T extends JobWmJob>(job: T): T {
  const base = {
    ...job,
    plannedHandoverDate: job.plannedHandoverDate || "",
    jobNotes: job.jobNotes || [],
    inspectorPhotos: job.inspectorPhotos || [],
  };
  if (!isWmClient(base.client)) return base;
  const stage = inferHandoverStage(base);
  return applyHandoverStageToJob({ ...base, handoverStage: stage }, stage);
}

/** Po zmianie etapu — spójność ze statusem roboty. */
export function applyHandoverStageToJob<T extends JobWmJob & { status: "in_progress" | "completed"; keysHandedOver: boolean }>(
  job: T,
  stage: JobHandoverStage,
): T {
  const next = { ...job, handoverStage: stage };
  if (stage === "handed_over") {
    next.status = "completed";
    next.keysHandedOver = true;
  } else if (job.status === "completed" && stage !== "handed_over") {
    next.status = "in_progress";
    next.keysHandedOver = false;
  }
  return next;
}

export function mergeJobNotes(a: JobNote[] | undefined, b: JobNote[] | undefined): JobNote[] {
  const map = new Map<string, JobNote>();
  for (const n of [...(a || []), ...(b || [])]) {
    if (n?.id) map.set(n.id, n);
  }
  return [...map.values()].sort((x, y) => y.at.localeCompare(x.at)).slice(0, 100);
}

export function mergeInspectorPhotos(
  a: InspectorPhotoEntry[] | undefined,
  b: InspectorPhotoEntry[] | undefined,
): InspectorPhotoEntry[] {
  const map = new Map<string, InspectorPhotoEntry>();
  for (const p of [...(a || []), ...(b || [])]) {
    if (p?.id) map.set(p.id, p);
  }
  return [...map.values()].sort((x, y) => y.uploadedAt.localeCompare(x.uploadedAt)).slice(0, 200);
}

export function stageBadgeClass(stage: JobHandoverStage): string {
  switch (stage) {
    case "awaiting_order":
      return "bg-red-500/15 text-red-400";
    case "in_progress":
      return "bg-yellow-500/10 text-yellow-400";
    case "docs_pending":
      return "bg-orange-500/15 text-orange-400";
    case "ready_for_handover":
      return "bg-emerald-500/15 text-emerald-400";
    case "handed_over":
      return "bg-green-500/15 text-green-400";
  }
}

export interface WmPortfolioStats {
  total: number;
  byStage: Record<JobHandoverStage, number>;
  missingZlecenie: number;
  missingKosztorys: number;
  missingAnyDoc: number;
  readyForHandover: number;
  overduePlanned: number;
  plannedThisWeek: number;
  unreadNotesHint: number;
}

export function computeWmPortfolioStats(
  jobs: JobWmJob[],
  opts?: { onlyWmClient?: boolean; notesNeedingAdminAttention?: number },
): WmPortfolioStats {
  const list = (opts?.onlyWmClient !== false ? jobs.filter((j) => isWmClient(j.client)) : jobs)
    .filter((j) => j.status === "in_progress" || inferHandoverStage(j) !== "handed_over");

  const byStage = Object.fromEntries(HANDOVER_STAGES.map((s) => [s, 0])) as Record<JobHandoverStage, number>;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  let missingZlecenie = 0;
  let missingKosztorys = 0;
  let missingAnyDoc = 0;
  let overduePlanned = 0;
  let plannedThisWeek = 0;

  for (const job of list) {
    const stage = inferHandoverStage(job);
    byStage[stage] += 1;
    if (!job.documents.zlecenie) missingZlecenie += 1;
    if (!job.documents.kosztorys) missingKosztorys += 1;
    if (REQUIRED_DOCS.some((d) => !job.documents[d])) missingAnyDoc += 1;
    if (job.plannedHandoverDate) {
      const p = new Date(job.plannedHandoverDate);
      if (!Number.isNaN(p.getTime())) {
        if (p < today && stage !== "handed_over") overduePlanned += 1;
        if (p >= today && p <= weekEnd) plannedThisWeek += 1;
      }
    }
  }

  return {
    total: list.length,
    byStage,
    missingZlecenie,
    missingKosztorys,
    missingAnyDoc,
    readyForHandover: byStage.ready_for_handover,
    overduePlanned,
    plannedThisWeek,
    unreadNotesHint: opts?.notesNeedingAdminAttention ?? 0,
  };
}

export function jobsWithInspectorNotesNeedingAdmin(jobs: JobWmJob[], seenAt: string): JobWmJob[] {
  return jobs.filter((job) => {
    const notes = job.jobNotes || [];
    if (notes.length === 0) return false;
    const last = notes[0];
    if (last.authorRole !== "inspector") return false;
    if (!seenAt) return true;
    return last.at > seenAt;
  });
}

export function mergeHandoverStage(a?: JobHandoverStage, b?: JobHandoverStage): JobHandoverStage | undefined {
  if (!a) return b;
  if (!b) return a;
  return HANDOVER_STAGES.indexOf(a) >= HANDOVER_STAGES.indexOf(b) ? a : b;
}

export function mergePlannedHandoverDate(a?: string, b?: string): string {
  if (!a) return b || "";
  if (!b) return a;
  return a >= b ? a : b;
}

export function fmtPlannedHandover(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

function wmPlannedDate(job: JobWmJob): Date | null {
  if (!job.plannedHandoverDate) return null;
  const p = new Date(job.plannedHandoverDate);
  return Number.isNaN(p.getTime()) ? null : p;
}

function wmTodayStart(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

/** Aktywne roboty WM z planowaną datą odbioru w przeszłości (etap ≠ odebrana). */
export function wmJobsWithOverduePlanned(jobs: JobWmJob[]): JobWmJob[] {
  const today = wmTodayStart();
  return jobs
    .filter((j) => isWmClient(j.client))
    .filter((j) => {
      if (inferHandoverStage(j) === "handed_over") return false;
      const p = wmPlannedDate(j);
      return p !== null && p < today;
    })
    .sort((a, b) => (a.plannedHandoverDate || "").localeCompare(b.plannedHandoverDate || ""));
}

/** Aktywne roboty WM z planowanym odbiorem w ciągu 7 dni (włącznie z dziś). */
export function wmJobsPlannedThisWeek(jobs: JobWmJob[]): JobWmJob[] {
  const today = wmTodayStart();
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);
  return jobs
    .filter((j) => isWmClient(j.client))
    .filter((j) => {
      if (inferHandoverStage(j) === "handed_over") return false;
      const p = wmPlannedDate(j);
      return p !== null && p >= today && p <= weekEnd;
    })
    .sort((a, b) => (a.plannedHandoverDate || "").localeCompare(b.plannedHandoverDate || ""));
}

export function plannedHandoverStatus(iso: string, stage: JobHandoverStage): "ok" | "soon" | "overdue" | "none" {
  if (!iso || stage === "handed_over") return "none";
  const p = new Date(iso);
  if (Number.isNaN(p.getTime())) return "none";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((p.getTime() - today.getTime()) / (86400000));
  if (diff < 0) return "overdue";
  if (diff <= 7) return "soon";
  return "ok";
}
