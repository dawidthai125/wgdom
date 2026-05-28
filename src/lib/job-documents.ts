/** Wspólne typy dokumentów robót — używane w panelu admina i inspektora. */

import { reportHasWorkScope } from "./work-scope-text";

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

export type InspectorJobFileKind = "zlecenie" | "kosztorys";

export interface JobFileAttachment {
  id: string;
  kind: InspectorJobFileKind;
  path: string;
  publicUrl: string;
  filename: string;
  uploadedBy: string;
  uploadedAt: string;
}

/** Rozszerzenia kosztorysu NORMA + PDF. */
export const KOSZTORYS_ACCEPT = ".pdf,.PDF,.nor,.NOR,.xml,.XML,.ath,.ATH,.doc,.docx,.xls,.xlsx";
export const ZLECENIE_ACCEPT = ".pdf,.PDF";

export const INSPECTOR_FILE_KINDS = ["zlecenie", "kosztorys"] as const;

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
  if (report.sketch?.publicUrl) return true;
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
  kind: InspectorJobFileKind,
): JobFileAttachment | undefined {
  const files = (job.jobFiles || []).filter((f) => f.kind === kind);
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
    if ((job.jobFiles || []).some((f) => f.kind === kind) && !docs[kind]) {
      docs[kind] = true;
      changed = true;
    }
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

export function mergeJobFiles(
  a: JobFileAttachment[] | undefined,
  b: JobFileAttachment[] | undefined,
): JobFileAttachment[] {
  const byKind = new Map<InspectorJobFileKind, JobFileAttachment>();
  for (const f of [...(a || []), ...(b || [])]) {
    const prev = byKind.get(f.kind);
    if (!prev || f.uploadedAt >= prev.uploadedAt) byKind.set(f.kind, f);
  }
  return [...byKind.values()];
}
