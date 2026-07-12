/** Aktywność na robocie — wspólne typy dla admina i inspektora. */

import {
  DOC_LABELS,
  type DocType,
  type JobFileAttachment,
  type JobFileKind,
  type JobFileTombstone,
  JOB_FILE_KIND_LABELS,
} from "@/lib/job-documents";

export type InspectorActivityType =
  | "inspector_document"
  | "inspector_file"
  | "inspector_stage"
  | "inspector_note"
  | "inspector_billing_note"
  | "inspector_billing_proposal"
  | "inspector_photo";

export type JobActivityType =
  | "photo_upload"
  | "photo_approved"
  | "photo_rejected"
  | "photo_delete"
  | "report_add"
  | "report_edit"
  | "report_delete"
  | "status_change"
  | "document"
  | "note"
  | "share_link"
  | "email_sent"
  | "material"
  | "work_entry"
  | InspectorActivityType
  | "inspector_stage"
  | "inspector_note"
  | "inspector_billing_note"
  | "inspector_billing_proposal"
  | "inspector_photo"
  | "billing_proposal_approved"
  | "billing_proposal_rejected";

export interface JobActivity {
  id: string;
  at: string;
  actor: string;
  type: JobActivityType;
  text: string;
}

export interface JobWithActivity {
  id: string;
  address: string;
  flatNumber: string;
  client: string;
  status: "in_progress" | "completed";
  activityLog?: JobActivity[];
  jobFiles?: JobFileAttachment[];
  deletedJobFileTombstones?: JobFileTombstone[];
  /** Ukryte wpisy feedu (np. legacy pliki bez logu) — id jak w InspectorFeedItem */
  hiddenInspectorFeedIds?: string[];
}

export interface InspectorFeedItem {
  id: string;
  at: string;
  jobId: string;
  jobAddress: string;
  jobFlat: string;
  jobClient: string;
  jobStatus: "in_progress" | "completed";
  actor: string;
  type: InspectorActivityType;
  text: string;
  fileUrl?: string;
  fileName?: string;
}

export function isInspectorActivityType(type: JobActivityType): boolean {
  return type === "inspector_document"
    || type === "inspector_file"
    || type === "inspector_stage"
    || type === "inspector_note"
    || type === "inspector_billing_note"
    || type === "inspector_billing_proposal"
    || type === "inspector_photo";
}

export function appendJobActivity<T extends { activityLog?: JobActivity[] }>(
  job: T,
  type: JobActivityType,
  text: string,
  actor: string,
): T & { activityLog: JobActivity[] } {
  const entry: JobActivity = {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    actor,
    type,
    text,
  };
  return {
    ...job,
    activityLog: [entry, ...(job.activityLog || [])].slice(0, 200),
  };
}

const JOB_FILE_UPLOAD_PATTERNS: { kind: JobFileKind; re: RegExp }[] = [
  { kind: "zlecenie", re: /^Wgrano zlecenie(?: PDF)?: (.+)$/i },
  { kind: "kosztorys", re: /^Wgrano kosztorys: (.+)$/i },
  { kind: "plan_techniczny", re: /^Wgrano plan techniczny: (.+)$/i },
];

/** Parsuje wpis activity upload pliku (admin + inspektor). */
export function parseJobFileUploadActivity(text: string): { kind: JobFileKind; filename: string } | null {
  const t = (text || "").trim();
  for (const { kind, re } of JOB_FILE_UPLOAD_PATTERNS) {
    const m = t.match(re);
    if (m?.[1]) return { kind, filename: m[1].trim() };
  }
  return null;
}

function isJobFileDeleteActivity(text: string): boolean {
  return /^Usunięto plik:/i.test((text || "").trim());
}

/** Reguły R1–R4 — czy upload activity ma być widoczne w feedzie. */
export function isJobFileUploadActivityVisible(
  job: JobWithActivity,
  ev: JobActivity,
): boolean {
  const parsed = parseJobFileUploadActivity(ev.text);
  if (!parsed) return true;

  const tombstones = job.deletedJobFileTombstones ?? [];
  const files = job.jobFiles ?? [];

  // R3 — plik tombstoned (po filename lub dopasowaniu w tekście)
  if (tombstones.some((t) => t.filename === parsed.filename)) return false;
  if (tombstones.some((t) => t.filename && ev.text.includes(t.filename))) return false;

  // R2 — nowszy delete tego samego pliku
  if ((job.activityLog ?? []).some(
    (other) =>
      other.type === "inspector_file"
      && isJobFileDeleteActivity(other.text)
      && other.text.includes(parsed.filename)
      && other.at > ev.at,
  )) {
    return false;
  }

  // R4 — replace: nowszy plik tego samego kind
  if (files.some(
    (f) => f.kind === parsed.kind && f.uploadedAt > ev.at && f.filename !== parsed.filename,
  )) {
    return false;
  }

  // R1 — plik musi istnieć w jobFiles
  return files.some((f) => f.filename === parsed.filename || ev.text.includes(f.filename));
}

export function collectInspectorFeed(jobs: JobWithActivity[]): InspectorFeedItem[] {
  const items: InspectorFeedItem[] = [];

  for (const job of jobs) {
    const hidden = new Set(job.hiddenInspectorFeedIds ?? []);
    const tombstoneIds = new Set((job.deletedJobFileTombstones ?? []).map((t) => t.fileId));
    for (const ev of job.activityLog || []) {
      if (!isInspectorActivityType(ev.type)) continue;
      if (hidden.has(ev.id)) continue;
      if (ev.type === "inspector_file" && !isJobFileUploadActivityVisible(job, ev)) continue;
      const file = ev.type === "inspector_file"
        ? (job.jobFiles || []).find((f) => ev.text.includes(f.filename))
        : undefined;
      items.push({
        id: ev.id,
        at: ev.at,
        jobId: job.id,
        jobAddress: job.address,
        jobFlat: job.flatNumber,
        jobClient: job.client,
        jobStatus: job.status,
        actor: ev.actor,
        type: ev.type as InspectorActivityType,
        text: ev.text,
        fileUrl: file?.publicUrl,
        fileName: file?.filename,
      });
    }

    for (const f of job.jobFiles || []) {
      if (tombstoneIds.has(f.id)) continue;
      const logged = (job.activityLog || []).some(
        (ev) => ev.type === "inspector_file" && ev.text.includes(f.filename),
      );
      if (logged) continue;
      const feedId = `file-${f.id}`;
      if (hidden.has(feedId)) continue;
      items.push({
        id: feedId,
        at: f.uploadedAt,
        jobId: job.id,
        jobAddress: job.address,
        jobFlat: job.flatNumber,
        jobClient: job.client,
        jobStatus: job.status,
        actor: f.uploadedBy,
        type: "inspector_file",
        text: `Wgrano ${JOB_FILE_KIND_LABELS[f.kind].toLowerCase()}: ${f.filename}`,
        fileUrl: f.publicUrl,
        fileName: f.filename,
      });
    }
  }

  return items.sort((a, b) => b.at.localeCompare(a.at));
}

/** Usuwa wpis z feedu inspektora — ukrywa id (sync-safe; chmura nie przywraca wpisu). */
export function removeInspectorFeedItem(
  jobs: JobWithActivity[],
  item: InspectorFeedItem,
): JobWithActivity[] {
  return jobs.map((j) => {
    if (j.id !== item.jobId) return j;
    const prev = j.hiddenInspectorFeedIds ?? [];
    if (prev.includes(item.id)) return j;
    return { ...j, hiddenInspectorFeedIds: [...prev, item.id] };
  });
}

export function mergeHiddenInspectorFeedIds(a?: string[], b?: string[]): string[] | undefined {
  const merged = [...new Set([...(a ?? []), ...(b ?? [])])];
  return merged.length > 0 ? merged : undefined;
}

export function inspectorDocToggleText(doc: DocType, checked: boolean): string {
  return `${checked ? "Zaznaczono" : "Odznaczono"}: ${DOC_LABELS[doc]}`;
}

export function inspectorFileUploadText(kind: JobFileAttachment["kind"], filename: string): string {
  if (kind === "zlecenie") return `Wgrano zlecenie PDF: ${filename}`;
  if (kind === "plan_techniczny") return `Wgrano plan techniczny: ${filename}`;
  return `Wgrano kosztorys: ${filename}`;
}
