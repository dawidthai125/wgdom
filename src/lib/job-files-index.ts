/** Indeks plików przypisanych do robot — wspólny katalog dla listy i widoku „Wszystkie pliki”. */

import type { JobFileAttachment } from "@/lib/job-documents";
import type { InspectorPhotoEntry } from "@/lib/job-wm";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
import { INSPECTOR_PHOTO_LABEL_NAMES, PHOTO_LABEL_NAMES } from "@/lib/photo-labels";

export type JobFileCategory =
  | "zlecenie"
  | "kosztorys"
  | "inspector_photo"
  | "crew_photo"
  | "report_sketch";

export const JOB_FILE_CATEGORY_LABELS: Record<JobFileCategory, string> = {
  zlecenie: "Zlecenie",
  kosztorys: "Kosztorys",
  inspector_photo: "Zdjęcie inspektora",
  crew_photo: "Zdjęcie ekipy",
  report_sketch: "Rysunek z raportu",
};

export type JobFileCatalogItem = {
  id: string;
  jobId: string;
  jobAddress: string;
  jobFlat: string;
  jobClient: string;
  category: JobFileCategory;
  categoryLabel: string;
  filename: string;
  publicUrl: string;
  storagePath?: string;
  uploadedBy: string;
  uploadedAt: string;
  subtitle?: string;
  previewItem: InspectorFileItem;
};

export type JobFilesSource = {
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
  }>;
  workerReports?: Array<{
    id: string;
    workerName: string;
    submittedAt: string;
    sketch?: { publicUrl: string; path?: string } | null;
    sketchNote?: string;
  }>;
};

function jobTitle(job: Pick<JobFilesSource, "address" | "flatNumber">): string {
  return `${job.address || "Bez adresu"}${job.flatNumber ? ` m.${job.flatNumber}` : ""}`;
}

export function canPreviewCatalogItem(item: JobFileCatalogItem): boolean {
  if (isPdfFilename(item.filename)) return true;
  if (isKosztorysPreviewExt(item.filename)) return true;
  if (item.category === "inspector_photo" || item.category === "crew_photo" || item.category === "report_sketch") {
    return true;
  }
  return false;
}

/** Zbiera wszystkie pliki z jednej roboty. */
export function collectJobFileCatalog(job: JobFilesSource): JobFileCatalogItem[] {
  const items: JobFileCatalogItem[] = [];
  const base = {
    jobId: job.id,
    jobAddress: job.address || "Bez adresu",
    jobFlat: job.flatNumber || "",
    jobClient: job.client || "—",
  };

  for (const f of job.jobFiles || []) {
    if (!f.publicUrl) continue;
    const category = f.kind as "zlecenie" | "kosztorys";
    items.push({
      ...base,
      id: `jf:${f.id}`,
      category,
      categoryLabel: JOB_FILE_CATEGORY_LABELS[category],
      filename: f.filename,
      publicUrl: f.publicUrl,
      storagePath: f.path,
      uploadedBy: f.uploadedBy || "—",
      uploadedAt: f.uploadedAt,
      previewItem: { kind: "jobFile", file: f },
    });
  }

  for (const p of job.inspectorPhotos || []) {
    if (!p.publicUrl) continue;
    const label = p.label ? INSPECTOR_PHOTO_LABEL_NAMES[p.label] : undefined;
    items.push({
      ...base,
      id: `ip:${p.id}`,
      category: "inspector_photo",
      categoryLabel: JOB_FILE_CATEGORY_LABELS.inspector_photo,
      filename: p.caption || `zdjecie-inspektora-${p.id.slice(0, 6)}.jpg`,
      publicUrl: p.publicUrl,
      storagePath: p.path,
      uploadedBy: p.uploadedBy || "Inspektor",
      uploadedAt: p.uploadedAt,
      subtitle: label,
      previewItem: { kind: "inspectorPhoto", file: p },
    });
  }

  for (const p of job.photos || []) {
    if (p.status !== "approved" || !p.publicUrl) continue;
    const label = PHOTO_LABEL_NAMES[p.label as keyof typeof PHOTO_LABEL_NAMES] || p.label;
    items.push({
      ...base,
      id: `cp:${p.id}`,
      category: "crew_photo",
      categoryLabel: JOB_FILE_CATEGORY_LABELS.crew_photo,
      filename: p.filename || p.caption || `zdjecie-${p.id.slice(0, 6)}.jpg`,
      publicUrl: p.publicUrl,
      uploadedBy: p.uploadedBy || "Ekipa",
      uploadedAt: p.uploadedAt || "",
      subtitle: label,
      previewItem: {
        kind: "imageUrl",
        url: p.publicUrl,
        filename: p.filename || p.caption || "zdjecie.jpg",
      },
    });
  }

  for (const r of job.workerReports || []) {
    if (!r.sketch?.publicUrl) continue;
    items.push({
      ...base,
      id: `sk:${r.id}`,
      category: "report_sketch",
      categoryLabel: JOB_FILE_CATEGORY_LABELS.report_sketch,
      filename: `rysunek-${r.workerName || "raport"}.jpg`,
      publicUrl: r.sketch.publicUrl,
      storagePath: r.sketch.path,
      uploadedBy: r.workerName || "Pracownik",
      uploadedAt: r.submittedAt,
      subtitle: r.sketchNote || undefined,
      previewItem: {
        kind: "imageUrl",
        url: r.sketch.publicUrl,
        filename: `rysunek-${r.workerName || "raport"}.jpg`,
      },
    });
  }

  return items.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
}

/** Wszystkie pliki ze wszystkich robót. */
export function collectAllJobFiles(jobs: JobFilesSource[]): JobFileCatalogItem[] {
  const all: JobFileCatalogItem[] = [];
  for (const job of jobs) {
    all.push(...collectJobFileCatalog(job));
  }
  return all.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
}

export function countJobFiles(job: JobFilesSource): number {
  return collectJobFileCatalog(job).length;
}

export function fmtJobFileDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso.slice(0, 16);
  }
}

export { jobTitle };
