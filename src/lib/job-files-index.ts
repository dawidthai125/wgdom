/** Indeks dokumentów przypisanych do robot — wspólny katalog dla listy i widoku „Wszystkie pliki”. */

import type { JobFileKind } from "@/lib/job-documents";
import { JOB_FILE_KIND_LABELS } from "@/lib/job-documents";
import type { InspectorFileItem } from "@/app/JobInspectorFilesPanel";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
import { collectJobDocuments, countJobDocuments, type MediaSeparationSource } from "@/lib/media-separation";

export type JobFileCategory = JobFileKind;

export const JOB_FILE_CATEGORY_LABELS = JOB_FILE_KIND_LABELS;

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

export type JobFilesSource = MediaSeparationSource;

function jobTitle(job: Pick<JobFilesSource, "address" | "flatNumber">): string {
  return `${job.address || "Bez adresu"}${job.flatNumber ? ` m.${job.flatNumber}` : ""}`;
}

export function canPreviewCatalogItem(item: JobFileCatalogItem): boolean {
  if (isPdfFilename(item.filename)) return true;
  if (isKosztorysPreviewExt(item.filename)) return true;
  return false;
}

/** Zbiera dokumenty z jednej roboty (zlecenie, kosztorys, plan techniczny — bez obrazów). */
export function collectJobFileCatalog(job: JobFilesSource): JobFileCatalogItem[] {
  const items: JobFileCatalogItem[] = [];
  const base = {
    jobId: job.id,
    jobAddress: job.address || "Bez adresu",
    jobFlat: job.flatNumber || "",
    jobClient: job.client || "—",
  };

  for (const f of collectJobDocuments(job)) {
    const category = f.kind;
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

  return items.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
}

/** Wszystkie dokumenty ze wszystkich robót. */
export function collectAllJobFiles(jobs: JobFilesSource[]): JobFileCatalogItem[] {
  const all: JobFileCatalogItem[] = [];
  for (const job of jobs) {
    all.push(...collectJobFileCatalog(job));
  }
  return all.sort((a, b) => (b.uploadedAt || "").localeCompare(a.uploadedAt || ""));
}

/** Liczba dokumentów (zlecenie + kosztorys + plan techniczny) — bez obrazów. */
export function countJobFiles(job: JobFilesSource): number {
  return countJobDocuments(job);
}

export type JobFileGroup = {
  jobId: string;
  jobAddress: string;
  jobFlat: string;
  jobClient: string;
  items: JobFileCatalogItem[];
  latestAt: string;
};

/** Dokumenty pogrupowane po robocie (tylko roboty z dokumentami). */
export function groupFilesByJob(jobs: JobFilesSource[]): JobFileGroup[] {
  const groups: JobFileGroup[] = [];
  for (const job of jobs) {
    const items = collectJobFileCatalog(job);
    if (items.length === 0) continue;
    const latestAt = items.reduce((max, i) => (i.uploadedAt > max ? i.uploadedAt : max), "");
    groups.push({
      jobId: job.id,
      jobAddress: job.address || "Bez adresu",
      jobFlat: job.flatNumber || "",
      jobClient: job.client || "—",
      items,
      latestAt,
    });
  }
  return groups.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

export function jobDisplayTitle(g: Pick<JobFileGroup, "jobAddress" | "jobFlat">): string {
  return `${g.jobAddress}${g.jobFlat ? ` m.${g.jobFlat}` : ""}`;
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
