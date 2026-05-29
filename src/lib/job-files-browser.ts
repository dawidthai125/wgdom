import type { JobFileAttachment } from "@/lib/job-documents";
import type { InspectorPhotoEntry } from "@/lib/job-wm";
import { PHOTO_LABEL_NAMES, INSPECTOR_PHOTO_LABEL_NAMES, normalizeInspectorPhotoLabel } from "@/lib/photo-labels";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
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
    if (!f.publicUrl) continue;
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
    if (p.status !== "approved" || !p.publicUrl) continue;
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
    if (!p.publicUrl) continue;
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
    if (!r.sketch?.publicUrl) continue;
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

export function countBrowserFiles(job: JobFilesBrowserSource): number {
  return collectJobBrowserFileGroups(job).reduce((s, g) => s + g.files.length, 0);
}
