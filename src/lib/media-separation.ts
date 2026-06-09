/**
 * Sprint 20.5A.8 — separacja obrazów vs dokumentów (single source of truth).
 * Obrazy: photos[] approved, inspectorPhotos[], workerReports[].sketch
 * Dokumenty: jobFiles[] (zlecenie / kosztorys)
 */

import type { JobFileAttachment } from "@/lib/job-documents";
import type { InspectorPhotoEntry } from "@/lib/job-wm";
import { isMediaAttachmentAvailable } from "@/lib/media-filter";
import { INSPECTOR_PHOTO_LABEL_NAMES, PHOTO_LABEL_NAMES, normalizeInspectorPhotoLabel } from "@/lib/photo-labels";

export type JobImageKind = "crew_photo" | "inspector_photo" | "report_sketch";

export type JobImageItem = {
  id: string;
  kind: JobImageKind;
  publicUrl: string;
  uploadedAt: string;
  uploadedBy: string;
  filename: string;
  caption?: string;
  /** Etykieta ekipy (before/after/progress) lub inspektora */
  label?: string;
  subtitle?: string;
  storagePath?: string;
  /** Oryginalny wpis inspektora — do podglądu/usuwania */
  inspectorPhoto?: InspectorPhotoEntry;
};

export type MediaSeparationSource = {
  id: string;
  address: string;
  flatNumber: string;
  client: string;
  jobFiles?: JobFileAttachment[];
  inspectorPhotos?: InspectorPhotoEntry[];
  photos?: Array<{
    id: string;
    status: string;
    publicUrl: string;
    label: string;
    caption?: string;
    filename?: string;
    uploadedBy?: string;
    uploadedAt?: string;
    path?: string;
  }>;
  workerReports?: Array<{
    id: string;
    workerName: string;
    submittedAt: string;
    sketch?: { publicUrl: string; path?: string } | null;
    sketchNote?: string;
  }>;
};

function extFromUrl(url: string, fallback: string): string {
  try {
    const path = new URL(url).pathname;
    const dot = path.lastIndexOf(".");
    if (dot >= 0 && path.length - dot <= 6) return path.slice(dot);
  } catch {
    /* ignore */
  }
  return fallback;
}

/** Dokumenty roboty — wyłącznie jobFiles (zlecenie / kosztorys). */
export function collectJobDocuments(job: MediaSeparationSource): JobFileAttachment[] {
  return (job.jobFiles || []).filter(isMediaAttachmentAvailable);
}

/** Wszystkie obrazy roboty — ekipa (approved), inspektor, rysunki raportów. */
export function collectJobImages(job: MediaSeparationSource): JobImageItem[] {
  const items: JobImageItem[] = [];

  for (const p of job.photos || []) {
    if (p.status !== "approved" || !isMediaAttachmentAvailable(p)) continue;
    items.push({
      id: `cp:${p.id}`,
      kind: "crew_photo",
      publicUrl: p.publicUrl,
      uploadedAt: p.uploadedAt || "",
      uploadedBy: p.uploadedBy || "Ekipa",
      filename: p.filename || p.caption || `zdjecie-${p.id.slice(0, 6)}.jpg`,
      caption: p.caption,
      label: p.label,
      subtitle: PHOTO_LABEL_NAMES[p.label as keyof typeof PHOTO_LABEL_NAMES] || p.label,
      storagePath: p.path,
    });
  }

  for (const p of job.inspectorPhotos || []) {
    if (!isMediaAttachmentAvailable(p)) continue;
    const label = normalizeInspectorPhotoLabel(p.label);
    const ext = extFromUrl(p.publicUrl, ".jpg");
    items.push({
      id: `ip:${p.id}`,
      kind: "inspector_photo",
      publicUrl: p.publicUrl,
      uploadedAt: p.uploadedAt,
      uploadedBy: p.uploadedBy || "Inspektor",
      filename: p.caption || `zdjecie-inspektora${ext}`,
      caption: p.caption,
      label: p.label,
      subtitle: INSPECTOR_PHOTO_LABEL_NAMES[label],
      storagePath: p.path,
      inspectorPhoto: p,
    });
  }

  for (const r of job.workerReports || []) {
    const sketch = r.sketch;
    if (!sketch?.publicUrl || !isMediaAttachmentAvailable(sketch)) continue;
    const ext = extFromUrl(sketch.publicUrl, ".jpg");
    items.push({
      id: `sk:${r.id}`,
      kind: "report_sketch",
      publicUrl: sketch.publicUrl,
      uploadedAt: r.submittedAt,
      uploadedBy: r.workerName || "Pracownik",
      filename: `rysunek-${r.workerName || "raport"}${ext}`,
      caption: r.sketchNote,
      subtitle: r.sketchNote || "Rysunek z raportu",
      storagePath: sketch.path,
    });
  }

  return items.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
}

export function countJobImages(job: MediaSeparationSource): number {
  return collectJobImages(job).length;
}

export function countJobDocuments(job: MediaSeparationSource): number {
  return collectJobDocuments(job).length;
}

export function countAllJobsImages(jobs: MediaSeparationSource[]): number {
  return jobs.reduce((s, j) => s + countJobImages(j), 0);
}

export function countAllJobsDocuments(jobs: MediaSeparationSource[]): number {
  return jobs.reduce((s, j) => s + countJobDocuments(j), 0);
}

export function jobHasImages(job: MediaSeparationSource): boolean {
  return countJobImages(job) > 0;
}

export function jobHasDocuments(job: MediaSeparationSource): boolean {
  return countJobDocuments(job) > 0;
}

/** Badge menu „Zdjęcia i pliki” — suma obrazów + dokumentów (bez duplikacji). */
export function countAllJobsMediaItems(jobs: MediaSeparationSource[]): number {
  return countAllJobsImages(jobs) + countAllJobsDocuments(jobs);
}
