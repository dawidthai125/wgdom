/** Wspólne typy dokumentów robót — używane w panelu admina i inspektora. */

import { reportHasWorkScope } from "./work-scope-text";
import { isMediaAttachmentAvailable, isUnavailableMediaUrl } from "./media-filter";

export const DOCUMENT_TYPES = [
  "zlecenie", "zakres", "kosztorys", "kominiarz", "pomiary",
  "oswiadczenia", "gwarancje", "rysunek", "zdjecia",
] as const;

export type DocType = (typeof DOCUMENT_TYPES)[number];

export const REQUIRED_DOCS = [
  "zlecenie", "zakres", "kosztorys", "kominiarz", "pomiary",
  "oswiadczenia", "gwarancje", "rysunek",
] as const;

export const DOC_LABELS: Record<DocType, string> = {
  zlecenie: "Zlecenie",
  zakres: "Zakres robót",
  kosztorys: "Kosztorys",
  kominiarz: "Kominiarz",
  pomiary: "Pomiary",
  oswiadczenia: "Oświadczenia",
  gwarancje: "Gwarancje",
  rysunek: "Rysunek/Plan",
  zdjecia: "Zdjęcia",
};

/** UI — jak zaliczana jest pozycja checklisty (20.5B.6A; bez zmiany logiki sync). */
export const RYSUNEK_PLAN_CHECKLIST_HELP =
  "Pozycja może zostać zaliczona przez: wymiary pomieszczeń, obrys lokalu lub plan techniczny PDF.";

/** UI — materiał źródłowy ekipy vs plan techniczny PDF (20.5B.6A). */
export const JOB_DOCUMENTATION_SOURCE_HELP =
  "Obrys lokalu i wymiary są materiałem źródłowym do wykonania planu technicznego. Nie są planem technicznym PDF.";

/** Pliki przypisane do roboty (storage + checklist). */
export type JobFileKind = "zlecenie" | "kosztorys" | "plan_techniczny";

/** Inspektor wgrywa tylko zlecenie/kosztorys — plan techniczny: admin w Robotach. */
export type InspectorJobFileKind = "zlecenie" | "kosztorys";

export interface JobFileAttachment {
  id: string;
  kind: JobFileKind;
  path: string;
  publicUrl: string;
  filename: string;
  uploadedBy: string;
  uploadedAt: string;
}

/** Sprint 20.5B.3 — tombstone usuniętego/zastąpionego pliku (merge-aware). */
export interface JobFileTombstone {
  fileId: string;
  kind: JobFileKind;
  path?: string;
  filename?: string;
  deletedAt: string;
  deletedBy?: string;
  reason?: "delete" | "replace";
  supersededByFileId?: string;
}

const STORAGE_PUBLIC_PATH =
  /\/storage\/v1\/object\/public\/make-0afb8820-photos\/(.+)$/i;

/** path ze storage — z pola path lub z publicUrl (starsze wpisy). */
export function resolveJobFileStoragePath(
  file: Pick<JobFileAttachment, "path" | "publicUrl">,
): string | undefined {
  const direct = file.path?.trim();
  if (direct) return direct;
  const m = file.publicUrl?.match(STORAGE_PUBLIC_PATH);
  if (!m?.[1]) return undefined;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

/** Rozszerzenia kosztorysu NORMA + PDF. */
export const KOSZTORYS_EXTENSIONS = ["pdf", "nor", "xml", "ath", "doc", "docx", "xls", "xlsx"] as const;

export function isKosztorysUploadFilename(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return (KOSZTORYS_EXTENSIONS as readonly string[]).includes(ext);
}

export function kosztorysUploadError(filename: string): string | null {
  if (isKosztorysUploadFilename(filename)) return null;
  return "Dozwolone formaty kosztorysu: PDF, ATH, NOR, XML, DOC, XLS.";
}

export function isZlecenieUploadFilename(filename: string): boolean {
  return /\.pdf$/i.test(filename);
}

export function zlecenieUploadError(filename: string): string | null {
  if (isZlecenieUploadFilename(filename)) return null;
  return "Zlecenie musi być w formacie PDF.";
}

/** Dla input[type=file] — Windows często ukrywa .ath przy liście rozszerzeń; walidacja po wyborze. */
export const KOSZTORYS_PICKER_ACCEPT = "*/*";
export const KOSZTORYS_ACCEPT = ".pdf,.PDF,.nor,.NOR,.xml,.XML,.ath,.ATH,.doc,.docx,.xls,.xlsx";
export const ZLECENIE_ACCEPT = ".pdf,.PDF";
export const PLAN_TECHNICZNY_ACCEPT = ".pdf,.PDF";

export const INSPECTOR_FILE_KINDS = ["zlecenie", "kosztorys"] as const;
export const JOB_FILE_KINDS = ["zlecenie", "kosztorys", "plan_techniczny"] as const;

export const JOB_FILE_KIND_LABELS: Record<JobFileKind, string> = {
  zlecenie: "Zlecenie",
  kosztorys: "Kosztorys",
  plan_techniczny: "Plan techniczny",
};

export function isPlanTechnicznyUploadFilename(filename: string): boolean {
  return /\.pdf$/i.test(filename);
}

export function planTechnicznyUploadError(filename: string): string | null {
  if (isPlanTechnicznyUploadFilename(filename)) return null;
  return "Plan techniczny musi być w formacie PDF.";
}

export function jobFileKindToDocType(kind: JobFileKind): DocType {
  if (kind === "plan_techniczny") return "rysunek";
  return kind;
}

export function jobFileUploadError(kind: JobFileKind, filename: string): string | null {
  if (kind === "zlecenie") return zlecenieUploadError(filename);
  if (kind === "kosztorys") return kosztorysUploadError(filename);
  return planTechnicznyUploadError(filename);
}

export function jobFileUploadAccept(kind: JobFileKind): string {
  if (kind === "zlecenie" || kind === "plan_techniczny") return ZLECENIE_ACCEPT;
  return KOSZTORYS_PICKER_ACCEPT;
}

export function jobFileUploadActivityText(kind: JobFileKind, filename: string): string {
  if (kind === "zlecenie") return `Wgrano zlecenie: ${filename}`;
  if (kind === "kosztorys") return `Wgrano kosztorys: ${filename}`;
  return `Wgrano plan techniczny: ${filename}`;
}

export type ReportSyncedDoc = "zakres" | "rysunek";

/** Super Admin odznaczył dokument mimo raportu — nie nadpisuj auto-sync. */
export type ReportDocSaOverride = Partial<Record<ReportSyncedDoc, false>>;

export type WorkerReportDocSource = {
  workScopeText?: string;
  workItems?: { text: string; note?: string }[];
  sketch?: { publicUrl?: string } | null;
  rooms?: { length: string; width: string; height: string; note?: string }[];
};

/** Raport z zakresem prac (tekst lub punkty). */
export function reportHasRysunek(report: WorkerReportDocSource): boolean {
  if (report.sketch?.publicUrl && !isUnavailableMediaUrl(report.sketch.publicUrl)) return true;
  return (report.rooms || []).some(
    (room) =>
      room.length.trim() ||
      room.width.trim() ||
      room.height.trim() ||
      (room.note || "").trim(),
  );
}

export function jobHasReportZakres(job: { workerReports?: WorkerReportDocSource[] }): boolean {
  return (job.workerReports || []).some((report) => reportHasWorkScope(report));
}

export function jobHasReportRysunek(job: { workerReports?: WorkerReportDocSource[] }): boolean {
  return (job.workerReports || []).some((report) => reportHasRysunek(report));
}

export function jobHasPlanTechniczny(job: { jobFiles?: JobFileAttachment[] }): boolean {
  return !!latestJobFile(job, "plan_techniczny");
}

/** Zakres / rysunek z raportu — po zaznaczeniu nie można odznaczyć ręcznie (poza Super Adminem). */
export function isReportSyncedDocLocked(
  job: { workerReports?: WorkerReportDocSource[] },
  doc: DocType,
): doc is ReportSyncedDoc {
  if (doc === "zakres") return jobHasReportZakres(job);
  if (doc === "rysunek") return jobHasReportRysunek(job);
  return false;
}

export function reportSyncedDocOverrideMessage(doc: ReportSyncedDoc): string {
  if (doc === "zakres") {
    return "Zakres jest dodany w raporcie ekipy.\n\nCzy na pewno chcesz zmienić status tego dokumentu?";
  }
  return "Rysunek lub wymiary są dodane w raporcie ekipy.\n\nCzy na pewno chcesz zmienić status tego dokumentu?";
}

/** Super Admin może odznaczyć dokument z raportu po potwierdzeniu. */
export function confirmReportSyncedDocUncheck(
  job: { workerReports?: WorkerReportDocSource[] },
  doc: DocType,
  isSuperAdmin: boolean,
): boolean {
  if (!isReportSyncedDocLocked(job, doc)) return true;
  if (!isSuperAdmin) return false;
  return window.confirm(reportSyncedDocOverrideMessage(doc));
}

function saOverrideBlocksReportSync(
  job: { reportDocSaOverride?: ReportDocSaOverride },
  doc: ReportSyncedDoc,
): boolean {
  return job.reportDocSaOverride?.[doc] === false;
}

export function clearReportDocSaOverride(
  override: ReportDocSaOverride | undefined,
  doc: ReportSyncedDoc,
): ReportDocSaOverride | undefined {
  if (!override?.[doc]) return override;
  const next = { ...override };
  delete next[doc];
  return Object.keys(next).length ? next : undefined;
}

export function clearReportDocSaOverrideFromReport(
  override: ReportDocSaOverride | undefined,
  report: WorkerReportDocSource,
): ReportDocSaOverride | undefined {
  let next = override;
  if (reportHasWorkScope(report)) next = clearReportDocSaOverride(next, "zakres");
  if (reportHasRysunek(report)) next = clearReportDocSaOverride(next, "rysunek");
  return next;
}

export function applyReportDocDocumentToggle<T extends {
  documents: Record<DocType, boolean>;
  reportDocSaOverride?: ReportDocSaOverride;
  workerReports?: WorkerReportDocSource[];
  jobFiles?: JobFileAttachment[];
}>(job: T, doc: DocType, nextChecked: boolean, isSuperAdmin: boolean): T {
  const documents = { ...job.documents, [doc]: nextChecked };
  let reportDocSaOverride = job.reportDocSaOverride;
  if (!nextChecked && isSuperAdmin && isReportSyncedDocLocked(job, doc)) {
    reportDocSaOverride = { ...reportDocSaOverride, [doc as ReportSyncedDoc]: false };
  } else if (nextChecked && (doc === "zakres" || doc === "rysunek")) {
    reportDocSaOverride = clearReportDocSaOverride(reportDocSaOverride, doc);
  }
  return syncJobDocuments({ ...job, documents, reportDocSaOverride });
}

export function latestJobFile(
  job: { jobFiles?: JobFileAttachment[] },
  kind: JobFileKind,
): JobFileAttachment | undefined {
  const files = (job.jobFiles || []).filter((f) => f.kind === kind && isMediaAttachmentAvailable(f));
  if (files.length === 0) return undefined;
  return files.reduce((a, b) => (a.uploadedAt >= b.uploadedAt ? a : b));
}

/** Plik wgrany przez inspektora → ptaszek przy dokumencie (spójność Roboty ↔ Inspektor). */
export function syncJobDocumentsFromFiles<T extends {
  documents: Record<DocType, boolean>;
  jobFiles?: JobFileAttachment[];
}>(job: T): T {
  const docs = { ...job.documents };
  let changed = false;
  for (const kind of INSPECTOR_FILE_KINDS) {
    if ((job.jobFiles || []).some((f) => f.kind === kind && isMediaAttachmentAvailable(f)) && !docs[kind]) {
      docs[kind] = true;
      changed = true;
    }
  }
  if (jobHasPlanTechniczny(job) && !docs.rysunek) {
    docs.rysunek = true;
    changed = true;
  }
  return changed ? { ...job, documents: docs } : job;
}

/** Raport z budowy (zakres / rysunek-wymiary) → ptaszek przy dokumencie. */
export function syncJobDocumentsFromReports<T extends {
  documents: Record<DocType, boolean>;
  workerReports?: WorkerReportDocSource[];
  reportDocSaOverride?: ReportDocSaOverride;
}>(job: T): T {
  const docs = { ...job.documents };
  let changed = false;
  if (jobHasReportZakres(job) && !docs.zakres && !saOverrideBlocksReportSync(job, "zakres")) {
    docs.zakres = true;
    changed = true;
  }
  if (jobHasReportRysunek(job) && !docs.rysunek && !saOverrideBlocksReportSync(job, "rysunek")) {
    docs.rysunek = true;
    changed = true;
  }
  return changed ? { ...job, documents: docs } : job;
}

/** Pliki inspektora + raporty ekipy → spójna checklista dokumentów. */
export function syncJobDocuments<T extends {
  documents: Record<DocType, boolean>;
  jobFiles?: JobFileAttachment[];
  workerReports?: WorkerReportDocSource[];
  reportDocSaOverride?: ReportDocSaOverride;
}>(job: T): T {
  return syncJobDocumentsFromReports(syncJobDocumentsFromFiles(job));
}

export function mergeJobDocuments(
  a: Record<string, boolean> | undefined,
  b: Record<string, boolean> | undefined,
): Record<string, boolean> {
  const out: Record<string, boolean> = { ...(a || {}) };
  for (const [k, v] of Object.entries(b || {})) {
    if (v) out[k] = true;
    else if (!(k in out)) out[k] = false;
  }
  return out;
}

function jobDocMergeTs(job: { updatedAt?: string; activityLog?: { at: string }[] }): number {
  const direct = job.updatedAt ? Date.parse(job.updatedAt) : NaN;
  if (!Number.isNaN(direct)) return direct;
  const last = job.activityLog?.[0]?.at;
  return last ? Date.parse(last) : 0;
}

/** Scalanie checklisty — nowszy updatedAt wygrywa per pole; SA override blokuje auto-true. */
export function mergeJobsDocumentsOnConflict(
  prev: {
    documents?: Record<string, boolean>;
    reportDocSaOverride?: ReportDocSaOverride;
    updatedAt?: string;
    activityLog?: { at: string }[];
  },
  j: {
    documents?: Record<string, boolean>;
    reportDocSaOverride?: ReportDocSaOverride;
    updatedAt?: string;
    activityLog?: { at: string }[];
  },
): Record<string, boolean> {
  const prevTs = jobDocMergeTs(prev);
  const jTs = jobDocMergeTs(j);
  const newer = jTs >= prevTs ? j : prev;
  const older = jTs >= prevTs ? prev : j;
  const mergedOverride =
    newer.reportDocSaOverride !== undefined
      ? newer.reportDocSaOverride
      : older.reportDocSaOverride;

  let docs: Record<string, boolean>;
  if (jTs !== prevTs) {
    docs = { ...(older.documents || {}), ...(newer.documents || {}) };
  } else {
    docs = mergeJobDocuments(prev.documents, j.documents);
  }
  if (mergedOverride?.zakres === false) docs.zakres = false;
  if (mergedOverride?.rysunek === false) docs.rysunek = false;
  return docs;
}

export function mergeReportDocSaOverrideOnConflict(
  prev: { reportDocSaOverride?: ReportDocSaOverride; updatedAt?: string; activityLog?: { at: string }[] },
  j: { reportDocSaOverride?: ReportDocSaOverride; updatedAt?: string; activityLog?: { at: string }[] },
): ReportDocSaOverride | undefined {
  const prevTs = jobDocMergeTs(prev);
  const jTs = jobDocMergeTs(j);
  const newer = jTs >= prevTs ? j : prev;
  const older = jTs >= prevTs ? prev : j;
  if (jTs !== prevTs) return newer.reportDocSaOverride;
  return newer.reportDocSaOverride ?? older.reportDocSaOverride;
}

export function buildJobFileTombstone(
  file: JobFileAttachment,
  opts: {
    deletedBy?: string;
    reason?: "delete" | "replace";
    supersededByFileId?: string;
    deletedAt?: string;
  },
): JobFileTombstone {
  return {
    fileId: file.id,
    kind: file.kind,
    path: resolveJobFileStoragePath(file),
    filename: file.filename,
    deletedAt: opts.deletedAt ?? new Date().toISOString(),
    deletedBy: opts.deletedBy,
    reason: opts.reason,
    supersededByFileId: opts.supersededByFileId,
  };
}

export function appendJobFileTombstone<T extends { deletedJobFileTombstones?: JobFileTombstone[] }>(
  job: T,
  tombstone: JobFileTombstone,
): T {
  const prev = job.deletedJobFileTombstones ?? [];
  const next = [...prev.filter((t) => t.fileId !== tombstone.fileId), tombstone];
  return { ...job, deletedJobFileTombstones: next };
}

export function mergeJobFileTombstones(
  a: JobFileTombstone[] | undefined,
  b: JobFileTombstone[] | undefined,
): JobFileTombstone[] {
  const map = new Map<string, JobFileTombstone>();
  for (const t of [...(a || []), ...(b || [])]) {
    if (!t?.fileId) continue;
    const prev = map.get(t.fileId);
    if (!prev || t.deletedAt >= prev.deletedAt) map.set(t.fileId, t);
  }
  return [...map.values()];
}

export function filterJobFilesByTombstones(
  files: JobFileAttachment[] | undefined,
  tombstones: JobFileTombstone[] | undefined,
): JobFileAttachment[] {
  const dead = new Set((tombstones || []).map((t) => t.fileId));
  return (files || []).filter((f) => !dead.has(f.id));
}

export function mergeJobFiles(
  a: JobFileAttachment[] | undefined,
  b: JobFileAttachment[] | undefined,
  tombstones?: JobFileTombstone[],
): JobFileAttachment[] {
  const byKind = new Map<JobFileKind, JobFileAttachment>();
  for (const f of filterJobFilesByTombstones([...(a || []), ...(b || [])], tombstones)) {
    const prev = byKind.get(f.kind);
    if (!prev || f.uploadedAt >= prev.uploadedAt) byKind.set(f.kind, f);
  }
  return [...byKind.values()];
}

/** Upload/replace tego samego kind — tombstone poprzednika + nowy wpis. */
export function applyJobFileKindUpload<T extends {
  documents: Record<DocType, boolean>;
  jobFiles?: JobFileAttachment[];
  deletedJobFileTombstones?: JobFileTombstone[];
  workerReports?: WorkerReportDocSource[];
  reportDocSaOverride?: ReportDocSaOverride;
}>(
  job: T,
  kind: JobFileKind,
  attachment: JobFileAttachment,
  opts: { deletedBy?: string; previousFile?: JobFileAttachment },
): T {
  let next: T = job;
  if (opts.previousFile) {
    next = appendJobFileTombstone(
      next,
      buildJobFileTombstone(opts.previousFile, {
        deletedBy: opts.deletedBy,
        reason: "replace",
        supersededByFileId: attachment.id,
      }),
    );
  }
  const jobFiles = [...(next.jobFiles || []).filter((f) => f.kind !== kind), attachment];
  return syncJobDocuments({ ...next, jobFiles });
}

/** Usuń plik z jobFiles; odznacz checklistę gdy brak pliku (rysunek — przez sync z raportu). */
export function removeJobFileAttachment<T extends {
  documents: Record<DocType, boolean>;
  jobFiles?: JobFileAttachment[];
  workerReports?: WorkerReportDocSource[];
  reportDocSaOverride?: ReportDocSaOverride;
}>(job: T, fileId: string): T {
  const file = (job.jobFiles || []).find((f) => f.id === fileId);
  if (!file) return job;
  const jobFiles = (job.jobFiles || []).filter((f) => f.id !== fileId);
  const documents = { ...job.documents };
  const docKey = jobFileKindToDocType(file.kind);
  if (!jobFiles.some((f) => f.kind === file.kind)) {
    if (docKey === "rysunek") {
      documents.rysunek = false;
    } else {
      documents[docKey] = false;
    }
  }
  return syncJobDocuments({ ...job, jobFiles, documents });
}

/** Delete z tombstone — merge nie przywróci pliku po sync. */
export function removeJobFileAttachmentWithTombstone<T extends {
  documents: Record<DocType, boolean>;
  jobFiles?: JobFileAttachment[];
  deletedJobFileTombstones?: JobFileTombstone[];
  workerReports?: WorkerReportDocSource[];
  reportDocSaOverride?: ReportDocSaOverride;
}>(
  job: T,
  fileId: string,
  opts: { deletedBy?: string; reason?: "delete" | "replace"; supersededByFileId?: string },
): T {
  const file = (job.jobFiles || []).find((f) => f.id === fileId);
  if (!file) return job;
  const withTombstone = appendJobFileTombstone(
    job,
    buildJobFileTombstone(file, opts),
  );
  return removeJobFileAttachment(withTombstone, fileId);
}
