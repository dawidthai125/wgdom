/** Sprint 20.5A.10 — ogólne załączniki roboty (osobno od jobFiles kontraktowych). */

import { deleteJobFile } from "@/lib/job-file-upload";

export interface JobAttachment {
  id: string;
  filename: string;
  path: string;
  publicUrl: string;
  mimeType?: string;
  uploadedBy: string;
  uploadedAt: string;
  label?: string;
  category?: string;
  sizeBytes?: number;
}

export interface JobAttachmentTombstone {
  attachmentId: string;
  filename?: string;
  deletedAt: string;
  deletedBy?: string;
  reason?: "delete";
}

export const JOB_ATTACHMENT_MAX_BYTES = 25 * 1024 * 1024;

export const JOB_ATTACHMENT_ALLOWED_EXTENSIONS = [
  "pdf", "doc", "docx", "xls", "xlsx", "zip", "rar", "dwg", "txt",
] as const;

export const JOB_ATTACHMENT_BLOCKED_EXTENSIONS = [
  "jpg", "jpeg", "png", "webp", "gif",
] as const;

const STORAGE_PUBLIC_PATH =
  /\/storage\/v1\/object\/public\/make-0afb8820-photos\/(.+)$/i;

export function jobAttachmentExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

export function isJobAttachmentBlockedImage(filename: string, mimeType?: string): boolean {
  const ext = jobAttachmentExtension(filename);
  if ((JOB_ATTACHMENT_BLOCKED_EXTENSIONS as readonly string[]).includes(ext)) return true;
  if (mimeType && /^image\//i.test(mimeType)) return true;
  return false;
}

export function isJobAttachmentAllowed(filename: string, mimeType?: string): boolean {
  if (isJobAttachmentBlockedImage(filename, mimeType)) return false;
  const ext = jobAttachmentExtension(filename);
  return (JOB_ATTACHMENT_ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

export function jobAttachmentUploadError(file: File): string | null {
  if (file.size > JOB_ATTACHMENT_MAX_BYTES) {
    return `Plik jest za duży (max ${Math.round(JOB_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB).`;
  }
  if (!isJobAttachmentAllowed(file.name, file.type)) {
    return "Dozwolone: PDF, DOC, DOCX, XLS, XLSX, ZIP, RAR, DWG, TXT. Zdjęcia wrzucaj w zakładkę Zdjęcia.";
  }
  return null;
}

/** Prefiks storage — logiczny namespace jobs/{jobId}/attachments-* (bez zmian Edge). */
export function buildJobAttachmentStorageFilename(originalName: string): string {
  const safe = originalName.replace(/[^\w.\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]+/g, "_").slice(0, 80);
  return `attachments-${Date.now()}-${safe || "plik"}`;
}

export function resolveJobAttachmentStoragePath(
  attachment: Pick<JobAttachment, "path" | "publicUrl">,
): string | undefined {
  const direct = attachment.path?.trim();
  if (direct) return direct;
  const m = attachment.publicUrl?.match(STORAGE_PUBLIC_PATH);
  if (!m?.[1]) return undefined;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

export function formatJobAttachmentSize(sizeBytes?: number): string {
  if (!sizeBytes || sizeBytes <= 0) return "—";
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function buildJobAttachmentTombstone(
  attachment: JobAttachment,
  opts: { deletedBy?: string; deletedAt?: string },
): JobAttachmentTombstone {
  return {
    attachmentId: attachment.id,
    filename: attachment.filename,
    deletedAt: opts.deletedAt ?? new Date().toISOString(),
    deletedBy: opts.deletedBy,
    reason: "delete",
  };
}

export function appendJobAttachmentTombstone<T extends { deletedJobAttachmentTombstones?: JobAttachmentTombstone[] }>(
  job: T,
  tombstone: JobAttachmentTombstone,
): T {
  const prev = job.deletedJobAttachmentTombstones ?? [];
  const next = [...prev.filter((t) => t.attachmentId !== tombstone.attachmentId), tombstone];
  return { ...job, deletedJobAttachmentTombstones: next };
}

export function mergeJobAttachmentTombstones(
  a: JobAttachmentTombstone[] | undefined,
  b: JobAttachmentTombstone[] | undefined,
): JobAttachmentTombstone[] {
  const map = new Map<string, JobAttachmentTombstone>();
  for (const t of [...(a || []), ...(b || [])]) {
    if (!t?.attachmentId) continue;
    const prev = map.get(t.attachmentId);
    if (!prev || t.deletedAt >= prev.deletedAt) map.set(t.attachmentId, t);
  }
  return [...map.values()];
}

export function filterJobAttachmentsByTombstones(
  attachments: JobAttachment[] | undefined,
  tombstones: JobAttachmentTombstone[] | undefined,
): JobAttachment[] {
  const dead = new Set((tombstones || []).map((t) => t.attachmentId));
  return (attachments || []).filter((a) => !dead.has(a.id));
}

export function mergeJobAttachments(
  a: JobAttachment[] | undefined,
  b: JobAttachment[] | undefined,
  tombstones?: JobAttachmentTombstone[],
): JobAttachment[] {
  const byId = new Map<string, JobAttachment>();
  for (const att of filterJobAttachmentsByTombstones([...(a || []), ...(b || [])], tombstones)) {
    const prev = byId.get(att.id);
    if (!prev || att.uploadedAt >= prev.uploadedAt) byId.set(att.id, att);
  }
  return [...byId.values()].sort((x, y) => y.uploadedAt.localeCompare(x.uploadedAt));
}

export function appendJobAttachment<T extends { jobAttachments?: JobAttachment[] }>(
  job: T,
  attachment: JobAttachment,
): T {
  return {
    ...job,
    jobAttachments: [...(job.jobAttachments || []), attachment],
  };
}

export function removeJobAttachment<T extends { jobAttachments?: JobAttachment[] }>(
  job: T,
  attachmentId: string,
): T {
  return {
    ...job,
    jobAttachments: (job.jobAttachments || []).filter((a) => a.id !== attachmentId),
  };
}

export function removeJobAttachmentWithTombstone<T extends {
  jobAttachments?: JobAttachment[];
  deletedJobAttachmentTombstones?: JobAttachmentTombstone[];
}>(
  job: T,
  attachmentId: string,
  opts: { deletedBy?: string },
): T {
  const attachment = (job.jobAttachments || []).find((a) => a.id === attachmentId);
  if (!attachment) return job;
  const withTombstone = appendJobAttachmentTombstone(
    job,
    buildJobAttachmentTombstone(attachment, { deletedBy: opts.deletedBy }),
  );
  return removeJobAttachment(withTombstone, attachmentId);
}

export async function deleteJobAttachmentStorage(
  attachment: Pick<JobAttachment, "path" | "publicUrl">,
): Promise<void> {
  const path = resolveJobAttachmentStoragePath(attachment);
  if (!path) return;
  await deleteJobFile(path).catch(() => {});
}
