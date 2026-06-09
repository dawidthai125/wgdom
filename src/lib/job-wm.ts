/** Wrocławskie Mieszkania — etap odbioru, notatki, zdjęcia inspektora, portfolio. */

import { REQUIRED_DOCS, type DocType } from "@/lib/job-documents";
import { appendJobActivity, type JobActivity } from "@/lib/job-activity";
import { applyJobPhase, type JobPhase } from "@/lib/job-list-status";

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

export type JobNoteContext = "wm" | "billing" | "billing_proposal";

export type BillingProposalStatus = "pending" | "approved" | "rejected";

export const BILLING_PROPOSAL_STATUS_LABELS: Record<BillingProposalStatus, string> = {
  pending: "Oczekuje na administratora",
  approved: "Zaakceptowano",
  rejected: "Odrzucono",
};

/** Sprint 20.5A.5 — dowód wizualny przy uwadze billing (zdjęcie / PDF). */
export interface JobNoteAttachment {
  id: string;
  kind: "image" | "pdf";
  path: string;
  publicUrl: string;
  filename: string;
  uploadedAt: string;
  uploadedBy: string;
}

export interface JobNote {
  id: string;
  author: string;
  authorRole: JobNoteAuthorRole;
  text: string;
  at: string;
  /** Sprint 20.5A.4 — uwaga do konkretnej pozycji Do rozliczenia. */
  recoverableChargeId?: string;
  /** Jawny kontekst; billing gdy recoverableChargeId ustawione. */
  context?: JobNoteContext;
  /** Sprint 20.5A.5 — załączniki dowodowe (opcjonalne). */
  attachments?: JobNoteAttachment[];
  /** Sprint 20.5A.6 — propozycja nowej pozycji Do rozliczenia (tylko context=billing_proposal). */
  proposalStatus?: BillingProposalStatus;
  proposalAmount?: number;
  proposalTitle?: string;
  sourceJobId?: string;
  approvedChargeId?: string;
  rejectedReason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

/** Propozycja nowej pozycji billing (Sprint 20.5A.6). */
export function isBillingProposalNote(note: JobNote): boolean {
  return note.context === "billing_proposal";
}

/** Notatka powiązana z pozycją billing (nie WM, nie propozycja). */
export function isBillingJobNote(note: JobNote): boolean {
  if (isBillingProposalNote(note)) return false;
  return note.context === "billing" || Boolean(note.recoverableChargeId?.trim());
}

function parseProposalAmount(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return +raw.toFixed(2);
  if (typeof raw === "string") {
    const n = parseFloat(raw.replace(",", ".").replace(/\s/g, ""));
    return Number.isFinite(n) ? +n.toFixed(2) : 0;
  }
  return 0;
}

function parseProposalStatus(raw: unknown): BillingProposalStatus | undefined {
  if (raw === "pending" || raw === "approved" || raw === "rejected") return raw;
  return undefined;
}

/** Normalizacja pól propozycji billing przy merge / odczycie. */
export function normalizeBillingProposalNote(note: JobNote): JobNote {
  if (!isBillingProposalNote(note)) return note;
  const amount = parseProposalAmount(note.proposalAmount);
  const status = parseProposalStatus(note.proposalStatus) ?? "pending";
  return {
    ...note,
    proposalStatus: status,
    proposalAmount: amount,
    proposalTitle: String(note.proposalTitle ?? "").trim(),
    sourceJobId: String(note.sourceJobId ?? "").trim(),
    approvedChargeId: String(note.approvedChargeId ?? "").trim() || undefined,
    rejectedReason: String(note.rejectedReason ?? "").trim() || undefined,
    reviewedBy: String(note.reviewedBy ?? "").trim() || undefined,
    reviewedAt: String(note.reviewedAt ?? "").trim() || undefined,
  };
}

/** Notatki WM / ogólne (bez powiązania z charge). */
export function wmJobNotes(notes: JobNote[] | undefined): JobNote[] {
  return (notes || []).filter((n) => !isBillingJobNote(n));
}

/** Wątek inspektor ↔ admin dla jednej pozycji billing (najnowsze na górze). */
export function jobNotesForCharge(notes: JobNote[] | undefined, chargeId: string): JobNote[] {
  const id = chargeId.trim();
  if (!id) return [];
  return (notes || [])
    .filter((n) => !isBillingProposalNote(n) && n.recoverableChargeId?.trim() === id)
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Propozycje billing na robocie (najnowsze na górze). */
export function billingProposalsForJob(notes: JobNote[] | undefined, jobId?: string): JobNote[] {
  const jid = jobId?.trim();
  return (notes || [])
    .filter((n) => {
      if (!isBillingProposalNote(n)) return false;
      if (!jid) return true;
      return (n.sourceJobId?.trim() || "") === jid;
    })
    .map(normalizeBillingProposalNote)
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function pendingBillingProposalsForJob(notes: JobNote[] | undefined, jobId?: string): JobNote[] {
  return billingProposalsForJob(notes, jobId).filter((n) => n.proposalStatus === "pending");
}

/** Sprint 20.5A.6 P1 — tylko propozycje oczekujące na decyzję admina. */
export function isBillingProposalPending(note: JobNote): boolean {
  return normalizeBillingProposalNote(note).proposalStatus === "pending";
}

export function billingProposalDisplayTitle(note: JobNote): string {
  const n = normalizeBillingProposalNote(note);
  const title = n.proposalTitle?.trim() || n.text.trim().slice(0, 80);
  return title || "Zgłoszenie Do rozliczenia";
}

export function buildBillingJobNote(params: {
  chargeId: string;
  text: string;
  author: string;
  authorRole: JobNoteAuthorRole;
  attachments?: JobNoteAttachment[];
}): JobNote {
  const trimmed = params.text.trim();
  const attachments = params.attachments?.length ? params.attachments : undefined;
  return {
    id: crypto.randomUUID(),
    author: params.author,
    authorRole: params.authorRole,
    text: trimmed,
    at: new Date().toISOString(),
    recoverableChargeId: params.chargeId.trim(),
    context: "billing",
    attachments,
  };
}

export function billingNoteActivityText(chargeTitle: string, noteText: string, authorRole: JobNoteAuthorRole): string {
  const title = chargeTitle.trim() || "Pozycja";
  const short = noteText.length > 60 ? `${noteText.slice(0, 60)}…` : noteText;
  const prefix = authorRole === "inspector" ? "Uwaga billing" : "Odpowiedź Do rozliczenia";
  return `${prefix} · ${title} · ${short}`;
}

export function buildBillingProposalNote(params: {
  id?: string;
  jobId: string;
  text: string;
  title?: string;
  amount: number;
  author: string;
  attachments?: JobNoteAttachment[];
}): JobNote {
  const trimmed = params.text.trim();
  const amount = parseProposalAmount(params.amount);
  const attachments = params.attachments?.length ? params.attachments : undefined;
  return normalizeBillingProposalNote({
    id: params.id?.trim() || crypto.randomUUID(),
    author: params.author,
    authorRole: "inspector",
    text: trimmed,
    at: new Date().toISOString(),
    context: "billing_proposal",
    proposalStatus: "pending",
    proposalAmount: amount,
    proposalTitle: String(params.title ?? "").trim(),
    sourceJobId: params.jobId.trim(),
    attachments,
  });
}

export function billingProposalActivityText(note: JobNote): string {
  const n = normalizeBillingProposalNote(note);
  const title = billingProposalDisplayTitle(n);
  const short = n.text.length > 60 ? `${n.text.slice(0, 60)}…` : n.text;
  const amount = n.proposalAmount != null && n.proposalAmount > 0
    ? ` · ${n.proposalAmount.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} PLN`
    : "";
  return `Zgłoszenie Do rozliczenia · ${title}${amount} · ${short}`;
}

/** Dodaje propozycję billing + wpis activityLog (tylko kw-jobs, Sprint 20.5A.6). */
export function appendBillingProposalNote<T extends { jobNotes?: JobNote[]; activityLog?: JobActivity[] }>(
  job: T,
  note: JobNote,
): T & { jobNotes: JobNote[]; activityLog: JobActivity[] } {
  const normalized = normalizeBillingProposalNote(note);
  return appendJobActivity(
    { ...job, jobNotes: [normalized, ...(job.jobNotes || [])] },
    "inspector_billing_proposal",
    billingProposalActivityText(normalized),
    normalized.author,
  );
}

export function approveBillingProposalNote(
  note: JobNote,
  chargeId: string,
  adminName: string,
): JobNote {
  const n = normalizeBillingProposalNote(note);
  if (n.proposalStatus !== "pending") {
    throw new Error("Zgłoszenie nie oczekuje na zatwierdzenie");
  }
  const id = chargeId.trim();
  if (!id) throw new Error("Brak identyfikatora pozycji");
  return normalizeBillingProposalNote({
    ...n,
    proposalStatus: "approved",
    approvedChargeId: id,
    reviewedBy: adminName.trim(),
    reviewedAt: new Date().toISOString(),
  });
}

export function rejectBillingProposalNote(
  note: JobNote,
  reason: string,
  adminName: string,
): JobNote {
  const trimmed = reason.trim();
  if (!trimmed) throw new Error("Podaj powód odrzucenia");
  return normalizeBillingProposalNote({
    ...note,
    proposalStatus: "rejected",
    rejectedReason: trimmed,
    reviewedBy: adminName.trim(),
    reviewedAt: new Date().toISOString(),
  });
}

export function updateJobBillingProposalNote<T extends { jobNotes?: JobNote[] }>(
  job: T,
  proposalId: string,
  updater: (note: JobNote) => JobNote,
): T {
  const pid = proposalId.trim();
  let found = false;
  const jobNotes = (job.jobNotes || []).map((n) => {
    if (n.id !== pid || !isBillingProposalNote(n)) return n;
    found = true;
    return normalizeBillingProposalNote(updater(n));
  });
  if (!found) throw new Error("Nie znaleziono zgłoszenia");
  return { ...job, jobNotes };
}

export function billingProposalApprovedActivityText(note: JobNote): string {
  const title = billingProposalDisplayTitle(note);
  return `Zaakceptowano zgłoszenie · ${title} · utworzono pozycję`;
}

export function billingProposalRejectedActivityText(note: JobNote, reason: string): string {
  const title = billingProposalDisplayTitle(note);
  const short = reason.length > 60 ? `${reason.slice(0, 60)}…` : reason;
  return `Odrzucono zgłoszenie · ${title} · ${short}`;
}

/** Dodaje notatkę billing + wpis activityLog (tylko kw-jobs, Sprint 20.5A.4). */
export function appendBillingJobNote<T extends { jobNotes?: JobNote[]; activityLog?: JobActivity[] }>(
  job: T,
  note: JobNote,
  chargeTitle: string,
): T & { jobNotes: JobNote[]; activityLog: JobActivity[] } {
  const activityType = note.authorRole === "inspector" ? "inspector_billing_note" : "note";
  return appendJobActivity(
    { ...job, jobNotes: [note, ...(job.jobNotes || [])] },
    activityType,
    billingNoteActivityText(chargeTitle, note.text, note.authorRole),
    note.author,
  );
}

export type InspectorPhotoLabel = "defect" | "in_progress" | "before_handover" | "after_handover";

export interface InspectorPhotoEntry {
  id: string;
  path: string;
  publicUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  caption?: string;
  /** Kategoria zdjęcia inspektora (domyślnie: przed odbiorem). */
  label?: InspectorPhotoLabel;
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

export function isWmClient(client: string | undefined): boolean {
  const c = (client ?? "").toLowerCase();
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

export function normalizeJobWmFields<T extends JobWmJob & { jobPhase?: JobPhase }>(job: T): T {
  const base = {
    ...job,
    plannedHandoverDate: job.plannedHandoverDate || "",
    jobNotes: job.jobNotes || [],
    inspectorPhotos: job.inspectorPhotos || [],
  };
  if (base.jobPhase) {
    return applyJobPhase(base, base.jobPhase);
  }
  if (!isWmClient(base.client)) return base;
  const stage = inferHandoverStage(base);
  return applyHandoverStageToJob({ ...base, handoverStage: stage }, stage);
}

/** ETAP 8.5 MIN — tekst wpisu w activityLog po „Rozpocznij realizację”. */
export const JOB_START_EXECUTION_ACTIVITY_TEXT = "Rozpoczęto realizację kontraktu";

/** ETAP 8.5 FULL — tekst wpisu w activityLog po przypisaniu ekipy planowej. */
export const JOB_EXECUTION_TEAM_ACTIVITY_TEXT = "Przypisano ekipę realizacyjną";

export function sanitizeExecutionAssigneeIds(raw: string[] | undefined): string[] {
  return [...new Set((raw || []).map((id) => String(id).trim()).filter(Boolean))];
}

export function mergeExecutionLeadDirectoryId(
  a?: string,
  b?: string,
  preferB?: boolean,
): string | undefined {
  const leadA = a?.trim() || undefined;
  const leadB = b?.trim() || undefined;
  if (!leadA) return leadB;
  if (!leadB) return leadA;
  return preferB ? leadB : leadA;
}

export function mergeExecutionAssigneeDirectoryIds(
  a?: string[],
  b?: string[],
): string[] {
  return sanitizeExecutionAssigneeIds([...(a || []), ...(b || [])]);
}

/**
 * ETAP 8.5 FULL — planowa ekipa na robocie (bez workEntries / payroll).
 */
export function assignExecutionTeam<
  T extends JobWmJob & {
    executionLeadDirectoryId?: string;
    executionAssigneeDirectoryIds?: string[];
    activityLog?: JobActivity[];
    updatedAt?: string;
  },
>(job: T, leadDirectoryId: string | undefined, assigneeDirectoryIds: string[], actorName: string): T {
  const lead = leadDirectoryId?.trim() || undefined;
  const assignees = sanitizeExecutionAssigneeIds(assigneeDirectoryIds);
  let next: T = {
    ...job,
    executionLeadDirectoryId: lead,
    executionAssigneeDirectoryIds: assignees,
    updatedAt: new Date().toISOString(),
  };
  next = appendJobActivity(next, "status_change", JOB_EXECUTION_TEAM_ACTIVITY_TEXT, actorName);
  return next;
}

/** Baner przetargu: pokaż CTA gdy jest linkedTenderId i etap ≠ W realizacji. */
export function canShowStartExecutionButton(
  job: JobWmJob & { linkedTenderId?: string },
): boolean {
  return Boolean(job.linkedTenderId) && inferHandoverStage(job) !== "in_progress";
}

/**
 * Rozpocznij realizację kontraktu (przetarg → robota): jobPhase + handoverStage in_progress + ślad w logu.
 */
export function startJobExecution<
  T extends JobWmJob & { jobPhase?: JobPhase; activityLog?: JobActivity[]; updatedAt?: string },
>(job: T, actorName: string): T {
  let next = applyJobPhase(job, "in_progress");
  next = appendJobActivity(next, "status_change", JOB_START_EXECUTION_ACTIVITY_TEXT, actorName);
  return { ...next, updatedAt: new Date().toISOString() };
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
    if (!n?.id) continue;
    const normalized = isBillingProposalNote(n) ? normalizeBillingProposalNote(n) : n;
    map.set(n.id, normalized);
  }
  return [...map.values()].sort((x, y) => y.at.localeCompare(x.at)).slice(0, 100);
}

export function jobsWithPendingBillingProposals(jobs: JobWmJob[]): JobWmJob[] {
  return jobs.filter((job) => pendingBillingProposalsForJob(job.jobNotes, job.id).length > 0);
}

export function countPendingBillingProposals(jobs: JobWmJob[]): number {
  return jobs.reduce((sum, job) => sum + pendingBillingProposalsForJob(job.jobNotes, job.id).length, 0);
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

/** Usuń zdjęcie inspektora z listy robota. */
export function removeInspectorPhoto<T extends { inspectorPhotos?: InspectorPhotoEntry[] }>(
  job: T,
  photoId: string,
): T {
  const inspectorPhotos = (job.inspectorPhotos || []).filter((p) => p.id !== photoId);
  if (inspectorPhotos.length === (job.inspectorPhotos || []).length) return job;
  return { ...job, inspectorPhotos };
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

export function jobsWithAdminNotesNeedingInspector(jobs: JobWmJob[], seenAt: string): JobWmJob[] {
  return jobs.filter((job) => {
    const notes = job.jobNotes || [];
    if (notes.length === 0) return false;
    const last = notes[0];
    if (last.authorRole !== "admin") return false;
    if (!seenAt) return true;
    return last.at > seenAt;
  });
}

export function parseStageFromActivityText(text: string): JobHandoverStage | undefined {
  for (const stage of HANDOVER_STAGES) {
    if (text.includes(HANDOVER_STAGE_LABELS[stage])) return stage;
  }
  return undefined;
}

export function latestHandoverStageFromLogs(
  logs: { type: string; at: string; text: string }[] | undefined,
): JobHandoverStage | undefined {
  if (!logs) return undefined;
  for (const ev of logs) {
    if (ev.type !== "inspector_stage") continue;
    const stage = parseStageFromActivityText(ev.text);
    if (stage) return stage;
  }
  return undefined;
}

export function mergeHandoverStage(
  a?: JobHandoverStage,
  b?: JobHandoverStage,
  logs?: { type: string; at: string; text: string }[],
): JobHandoverStage | undefined {
  const fromLogs = latestHandoverStageFromLogs(logs);
  if (fromLogs) return fromLogs;
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
