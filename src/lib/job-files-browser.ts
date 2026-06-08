import type { JobFileAttachment } from "@/lib/job-documents";
import type { InspectorPhotoEntry } from "@/lib/job-wm";
import { PHOTO_LABEL_NAMES, INSPECTOR_PHOTO_LABEL_NAMES, normalizeInspectorPhotoLabel } from "@/lib/photo-labels";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
import { isMediaAttachmentAvailable } from "@/lib/media-filter";
import { jobDisplayTitle } from "@/lib/job-gallery";

export type JobFilesBrowserSource = {
  id: string;
  address: string;
  flatNumber: string;
  client: string;
  jobFiles?: JobFileAttachment[];
  inspectorPhotos?: InspectorPhotoEntry[];
  photos?: Array<{
    id: string;
    publicUrl: string;
    label: "before" | "after" | "progress";
    uploadedBy: string;
    uploadedAt: string;
    status: string;
    caption?: string;
    filename?: string;
  }>;
  workerReports?: Array<{
    id: string;
    workerName: string;
    submittedAt: string;
    sketch?: { publicUrl: string } | null;
    sketchNote?: string;
  }>;
};

export type JobBrowserFile = {
  id: string;
  category: string;
  dateIso: string;
  dateLabel: string;
  filename: string;
  url: string;
  uploadedBy: string;
  canPreview: boolean;
};

export type JobBrowserFileGroup = {
  category: string;
  files: JobBrowserFile[];
};

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function dateIsoFromUploadedAt(iso: string): string {
  return iso.slice(0, 10) || "0000-00-00";
}

function previewOk(filename: string, isImage: boolean): boolean {
  if (isImage) return true;
  return isPdfFilename(filename) || isKosztorysPreviewExt(filename);
}

function extFromUrl(url: string, fallback: string): string {
  try {
    const path = new URL(url).pathname;
    const dot = path.lastIndexOf(".");
    if (dot >= 0 && path.length - dot <= 6) return path.slice(dot);
  } catch { /* ignore */ }
  return fallback;
}

/** Wszystkie pliki roboty pogrupowane wg kategorii (do widoku inspektora). */
export function collectJobBrowserFileGroups(job: JobFilesBrowserSource): JobBrowserFileGroup[] {
  const byCategory = new Map<string, JobBrowserFile[]>();

  const add = (category: string, file: JobBrowserFile) => {
    const list = byCategory.get(category) || [];
    list.push(file);
    byCategory.set(category, list);
  };

  for (const f of job.jobFiles || []) {
    if (!isMediaAttachmentAvailable(f)) continue;
    const category = f.kind === "zlecenie" ? "Zlecenie" : "Kosztorys";
    const dateIso = dateIsoFromUploadedAt(f.uploadedAt);
    add(category, {
      id: `jf-${f.id}`,
      category,
      dateIso,
      dateLabel: fmtDate(f.uploadedAt),
      filename: f.filename || `${f.kind}.pdf`,
      url: f.publicUrl,
      uploadedBy: f.uploadedBy,
      canPreview: previewOk(f.filename || "", false),
    });
  }

  const crewLabel: Record<string, string> = {
    before: PHOTO_LABEL_NAMES.before,
    after: PHOTO_LABEL_NAMES.after,
    progress: PHOTO_LABEL_NAMES.progress,
  };
  for (const p of job.photos || []) {
    if (p.status !== "approved" || !isMediaAttachmentAvailable(p)) continue;
    const category = `Zdjęcia ekipy — ${crewLabel[p.label] || p.label}`;
    const dateIso = dateIsoFromUploadedAt(p.uploadedAt);
    const ext = extFromUrl(p.publicUrl, ".jpg");
    add(category, {
      id: `cp-${p.id}`,
      category,
      dateIso,
      dateLabel: fmtDate(p.uploadedAt),
      filename: p.filename || p.caption || `zdjecie${ext}`,
      url: p.publicUrl,
      uploadedBy: p.uploadedBy,
      canPreview: true,
    });
  }

  for (const p of job.inspectorPhotos || []) {
    if (!isMediaAttachmentAvailable(p)) continue;
    const label = normalizeInspectorPhotoLabel(p.label);
    const category = `Zdjęcia inspektora — ${INSPECTOR_PHOTO_LABEL_NAMES[label]}`;
    const dateIso = dateIsoFromUploadedAt(p.uploadedAt);
    const ext = extFromUrl(p.publicUrl, ".jpg");
    add(category, {
      id: `ip-${p.id}`,
      category,
      dateIso,
      dateLabel: fmtDate(p.uploadedAt),
      filename: p.caption || `zdjecie-inspektora${ext}`,
      url: p.publicUrl,
      uploadedBy: p.uploadedBy,
      canPreview: true,
    });
  }

  for (const r of job.workerReports || []) {
    const sketch = r.sketch;
    if (!sketch?.publicUrl || !isMediaAttachmentAvailable(sketch)) continue;
    const category = "Rysunki z raportów";
    const dateIso = dateIsoFromUploadedAt(r.submittedAt);
    const ext = extFromUrl(r.sketch.publicUrl, ".jpg");
    add(category, {
      id: `sk-${r.id}`,
      category,
      dateIso,
      dateLabel: fmtDate(r.submittedAt),
      filename: `${r.workerName || "pracownik"}-rysunek${ext}`,
      url: r.sketch.publicUrl,
      uploadedBy: r.workerName || "—",
      canPreview: true,
    });
  }

  const order = ["Zlecenie", "Kosztorys"];
  const groups: JobBrowserFileGroup[] = [];
  for (const cat of order) {
    const files = byCategory.get(cat);
    if (files?.length) {
      groups.push({
        category: cat,
        files: files.sort((a, b) => b.dateIso.localeCompare(a.dateIso) || a.filename.localeCompare(b.filename, "pl")),
      });
      byCategory.delete(cat);
    }
  }
  const rest = [...byCategory.entries()]
    .sort(([a], [b]) => a.localeCompare(b, "pl"))
    .map(([category, files]) => ({
      category,
      files: files.sort((a, b) => b.dateIso.localeCompare(a.dateIso) || a.filename.localeCompare(b.filename, "pl")),
    }));
  return [...groups, ...rest];
}

export function jobHasBrowserFiles(job: JobFilesBrowserSource): boolean {
  return collectJobBrowserFileGroups(job).some((g) => g.files.length > 0);
}

export function jobBrowserTitle(job: JobFilesBrowserSource): string {
  return jobDisplayTitle(job);
}

export type JobBrowserFileSummary = {
  total: number;
  zlecenie: number;
  kosztorys: number;
  crewPhotos: number;
  inspectorPhotos: number;
  reportSketches: number;
};

export type JobFileSummaryChip = {
  key: keyof Omit<JobBrowserFileSummary, "total">;
  label: string;
};

/** Liczba plików wg typu — bez rozwijania karty roboty. */
export function summarizeJobBrowserFiles(job: JobFilesBrowserSource): JobBrowserFileSummary {
  let zlecenie = 0;
  let kosztorys = 0;
  let crewPhotos = 0;
  let inspectorPhotos = 0;
  let reportSketches = 0;

  for (const f of job.jobFiles || []) {
    if (!isMediaAttachmentAvailable(f)) continue;
    if (f.kind === "zlecenie") zlecenie++;
    else if (f.kind === "kosztorys") kosztorys++;
  }
  for (const p of job.photos || []) {
    if (p.status === "approved" && isMediaAttachmentAvailable(p)) crewPhotos++;
  }
  for (const p of job.inspectorPhotos || []) {
    if (isMediaAttachmentAvailable(p)) inspectorPhotos++;
  }
  for (const r of job.workerReports || []) {
    if (r.sketch?.publicUrl && isMediaAttachmentAvailable(r.sketch)) reportSketches++;
  }

  return {
    total: zlecenie + kosztorys + crewPhotos + inspectorPhotos + reportSketches,
    zlecenie,
    kosztorys,
    crewPhotos,
    inspectorPhotos,
    reportSketches,
  };
}

function plFileLabel(n: number, one: string, few: string, many: string): string {
  if (n === 1) return `1 ${one}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** Etykiety do badge'ów na liście (tylko niezerowe). */
export function jobFileSummaryChips(summary: JobBrowserFileSummary): JobFileSummaryChip[] {
  const out: JobFileSummaryChip[] = [];
  if (summary.zlecenie > 0) {
    out.push({
      key: "zlecenie",
      label: plFileLabel(summary.zlecenie, "zlecenie", "zlecenia", "zleceń"),
    });
  }
  if (summary.kosztorys > 0) {
    out.push({
      key: "kosztorys",
      label: plFileLabel(summary.kosztorys, "kosztorys", "kosztorysy", "kosztorysów"),
    });
  }
  if (summary.crewPhotos > 0) {
    out.push({
      key: "crewPhotos",
      label: `${summary.crewPhotos} zdj. ekipy`,
    });
  }
  if (summary.inspectorPhotos > 0) {
    out.push({
      key: "inspectorPhotos",
      label: `${summary.inspectorPhotos} zdj. inspektora`,
    });
  }
  if (summary.reportSketches > 0) {
    out.push({
      key: "reportSketches",
      label: plFileLabel(summary.reportSketches, "rysunek", "rysunki", "rysunków"),
    });
  }
  return out;
}

export function countBrowserFiles(job: JobFilesBrowserSource): number {
  return summarizeJobBrowserFiles(job).total;
}

/** Badge menu „Zdjęcia i pliki” — jedno źródło (bez dublowania crew_photo). */
export function countAllJobsMediaItems(jobs: JobFilesBrowserSource[]): number {
  return jobs.reduce((s, j) => s + countBrowserFiles(j), 0);
}
