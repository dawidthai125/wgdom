import { JOB_FILE_KIND_LABELS, type JobFileKind } from "@/lib/job-documents";
import { isPdfFilename, isKosztorysPreviewExt } from "@/lib/ath-parser";
import { isMediaAttachmentAvailable } from "@/lib/media-filter";
import { jobDisplayTitle } from "@/lib/job-gallery";
import {
  collectJobDocuments,
  countJobDocuments,
  countAllJobsMediaItems,
  type MediaSeparationSource,
} from "@/lib/media-separation";

export type JobFilesBrowserSource = MediaSeparationSource;

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

function previewOk(filename: string): boolean {
  return isPdfFilename(filename) || isKosztorysPreviewExt(filename);
}

/** Dokumenty roboty pogrupowane wg kategorii (zlecenie / kosztorys / plan techniczny). */
export function collectJobBrowserFileGroups(job: JobFilesBrowserSource): JobBrowserFileGroup[] {
  const byCategory = new Map<string, JobBrowserFile[]>();

  const add = (category: string, file: JobBrowserFile) => {
    const list = byCategory.get(category) || [];
    list.push(file);
    byCategory.set(category, list);
  };

  for (const f of collectJobDocuments(job)) {
    const category = JOB_FILE_KIND_LABELS[f.kind as JobFileKind];
    const dateIso = dateIsoFromUploadedAt(f.uploadedAt);
    add(category, {
      id: `jf-${f.id}`,
      category,
      dateIso,
      dateLabel: fmtDate(f.uploadedAt),
      filename: f.filename || `${f.kind}.pdf`,
      url: f.publicUrl,
      uploadedBy: f.uploadedBy,
      canPreview: previewOk(f.filename || ""),
    });
  }

  const order = ["Zlecenie", "Kosztorys", "Plan techniczny"];
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
  plan_techniczny: number;
};

export type JobFileSummaryChip = {
  key: keyof Omit<JobBrowserFileSummary, "total">;
  label: string;
};

/** Liczba dokumentów wg typu — bez obrazów. */
export function summarizeJobBrowserFiles(job: JobFilesBrowserSource): JobBrowserFileSummary {
  let zlecenie = 0;
  let kosztorys = 0;
  let plan_techniczny = 0;

  for (const f of job.jobFiles || []) {
    if (!isMediaAttachmentAvailable(f)) continue;
    if (f.kind === "zlecenie") zlecenie++;
    else if (f.kind === "kosztorys") kosztorys++;
    else if (f.kind === "plan_techniczny") plan_techniczny++;
  }

  return {
    total: zlecenie + kosztorys + plan_techniczny,
    zlecenie,
    kosztorys,
    plan_techniczny,
  };
}

function plFileLabel(n: number, one: string, few: string, many: string): string {
  if (n === 1) return `1 ${one}`;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** Etykiety do badge'ów na liście (tylko niezerowe dokumenty). */
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
  if (summary.plan_techniczny > 0) {
    out.push({
      key: "plan_techniczny",
      label: plFileLabel(summary.plan_techniczny, "plan techniczny", "plany techniczne", "planów technicznych"),
    });
  }
  return out;
}

export function countBrowserFiles(job: JobFilesBrowserSource): number {
  return countJobDocuments(job);
}

export { countAllJobsMediaItems };
