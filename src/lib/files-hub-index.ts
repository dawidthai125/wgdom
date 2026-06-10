/**
 * Sprint 20.5A.12 — Files Hub (warstwa prezentacji, read-only agregacja).
 * Nie zmienia modelu danych — łączy jobFiles[], workerReports[], jobAttachments[].
 */

import type { DocType } from "@/lib/job-documents";
import { DOCUMENT_TYPES } from "@/lib/job-documents";
import { reportHasRysunek } from "@/lib/job-documents";
import { collectJobFileCatalog, type JobFileCatalogItem } from "@/lib/job-files-index";
import { collectActiveJobAttachments } from "@/lib/job-attachments-pack";
import type { JobAttachment } from "@/lib/job-attachments";
import { roomHasContent } from "@/app/app-domain";
import { reportHasWorkScope } from "@/lib/work-scope-text";
import { isMediaAttachmentAvailable } from "@/lib/media-filter";
import type { MediaSeparationSource } from "@/lib/media-separation";

export type FilesHubContractItem = JobFileCatalogItem;

export type FilesHubReportItem = {
  id: string;
  index: number;
  label: string;
  author: string;
  submittedAt: string;
  dateLabel: string;
  roomCount: number;
  hasScope: boolean;
  hasSketch: boolean;
};

export type FilesHubAttachmentItem = JobAttachment;

export type FilesHubChecklistSummary = {
  checked: number;
  total: number;
};

export type FilesHubJobSource = MediaSeparationSource & {
  documents: Record<DocType, boolean>;
  workerReports?: Array<{
    id: string;
    workerName: string;
    submittedAt: string;
    workScopeText?: string;
    workItems?: { text: string; note?: string }[];
    rooms?: import("@/app/app-domain").RoomDimension[];
    sketch?: { publicUrl?: string; path?: string } | null;
  }>;
  jobAttachments?: JobAttachment[];
  deletedJobAttachmentTombstones?: import("@/lib/job-attachments").JobAttachmentTombstone[];
};

export type FilesHubSummary = {
  contract: number;
  reports: number;
  attachments: number;
  total: number;
};

function fmtHubDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

type HubWorkerReport = NonNullable<FilesHubJobSource["workerReports"]>[number];

function reportHasSketchImage(report: HubWorkerReport): boolean {
  const sketch = report.sketch;
  return Boolean(sketch?.publicUrl && isMediaAttachmentAvailable(sketch));
}

/** Dokumenty kontraktowe — jobFiles[] (zlecenie, kosztorys, plan techniczny). */
export function collectFilesHubContractItems(job: FilesHubJobSource): FilesHubContractItem[] {
  return collectJobFileCatalog(job);
}

/** Dokumentacja robót — workerReports[] jako wpisy wirtualne. */
export function collectFilesHubReportItems(job: FilesHubJobSource): FilesHubReportItem[] {
  const reports = [...(job.workerReports || [])].sort((a, b) =>
    (b.submittedAt || "").localeCompare(a.submittedAt || ""),
  );
  return reports.map((report, idx) => {
    const rooms = (report.rooms || []).filter(roomHasContent);
    return {
      id: report.id,
      index: idx + 1,
      label: `Dokumentacja robót #${idx + 1}`,
      author: report.workerName || "—",
      submittedAt: report.submittedAt || "",
      dateLabel: fmtHubDate(report.submittedAt || ""),
      roomCount: rooms.length,
      hasScope: reportHasWorkScope(report),
      hasSketch: reportHasSketchImage(report),
    };
  });
}

/** Załączniki ogólne — jobAttachments[] (bez tombstonów). */
export function collectFilesHubAttachmentItems(job: FilesHubJobSource): FilesHubAttachmentItem[] {
  return collectActiveJobAttachments(job);
}

/** Checklista odbiorowa — informacja only (nie wliczana do countFilesHubItems). */
export function getFilesHubChecklistSummary(job: FilesHubJobSource): FilesHubChecklistSummary {
  const total = DOCUMENT_TYPES.length;
  const checked = DOCUMENT_TYPES.filter((d) => job.documents?.[d]).length;
  return { checked, total };
}

export function summarizeFilesHub(job: FilesHubJobSource): FilesHubSummary {
  const contract = collectFilesHubContractItems(job).length;
  const reports = collectFilesHubReportItems(job).length;
  const attachments = collectFilesHubAttachmentItems(job).length;
  return { contract, reports, attachments, total: contract + reports + attachments };
}

/** SSOT licznika Files Hub — kontrakt + dokumentacja + załączniki (bez checklisty, bez photos). */
export function countFilesHubItems(job: FilesHubJobSource): number {
  return summarizeFilesHub(job).total;
}

export function countAllFilesHubItems(jobs: FilesHubJobSource[]): number {
  return jobs.reduce((s, j) => s + countFilesHubItems(j), 0);
}

export function jobHasFilesHubContent(job: FilesHubJobSource): boolean {
  return countFilesHubItems(job) > 0;
}

/** Grupa hub per adres — SSOT dla JobAllFilesView (20.5A.12B.1-full). */
export type JobHubAddressGroup = {
  jobId: string;
  jobAddress: string;
  jobFlat: string;
  jobClient: string;
  summary: FilesHubSummary;
  contract: FilesHubContractItem[];
  reports: FilesHubReportItem[];
  attachments: FilesHubAttachmentItem[];
  latestAt: string;
};

function hubLayerLatestAt(
  contract: FilesHubContractItem[],
  reports: FilesHubReportItem[],
  attachments: FilesHubAttachmentItem[],
): string {
  const dates = [
    ...contract.map((c) => c.uploadedAt || ""),
    ...reports.map((r) => r.submittedAt || ""),
    ...attachments.map((a) => a.uploadedAt || ""),
  ];
  return dates.reduce((max, d) => (d > max ? d : max), "");
}

/** Roboty z hub content, pogrupowane per adres (nie tylko jobFiles[]). */
export function groupHubContentByJob(jobs: FilesHubJobSource[]): JobHubAddressGroup[] {
  const groups: JobHubAddressGroup[] = [];
  for (const job of jobs) {
    if (!jobHasFilesHubContent(job)) continue;
    const contract = collectFilesHubContractItems(job);
    const reports = collectFilesHubReportItems(job);
    const attachments = collectFilesHubAttachmentItems(job);
    groups.push({
      jobId: job.id,
      jobAddress: job.address || "Bez adresu",
      jobFlat: job.flatNumber || "",
      jobClient: job.client || "—",
      summary: summarizeFilesHub(job),
      contract,
      reports,
      attachments,
      latestAt: hubLayerLatestAt(contract, reports, attachments),
    });
  }
  return groups.sort((a, b) => b.latestAt.localeCompare(a.latestAt));
}

export type HubLayerFilter = "all" | "contract" | "reports" | "attachments";

/** Filtr warstwy hub na grupie (do JobAllFilesView i smoke). */
export function filterHubGroupByLayer(
  group: JobHubAddressGroup,
  layer: HubLayerFilter,
): JobHubAddressGroup {
  if (layer === "all") return group;
  if (layer === "contract") {
    return { ...group, reports: [], attachments: [] };
  }
  if (layer === "reports") {
    return { ...group, contract: [], attachments: [] };
  }
  return { ...group, contract: [], reports: [] };
}

/** Filtr kategorii kontraktowej (zlecenie / kosztorys / plan_techniczny). */
export function filterHubGroupByContractCategory(
  group: JobHubAddressGroup,
  category: JobFileCatalogItem["category"],
): JobHubAddressGroup {
  return {
    ...group,
    contract: group.contract.filter((c) => c.category === category),
    reports: [],
    attachments: [],
  };
}

/** Tekst do wyszukiwania — adres, pliki, autor raportu, zakres prac. */
export function hubGroupSearchHaystack(job: FilesHubJobSource, group: JobHubAddressGroup): string {
  const parts = [
    group.jobAddress,
    group.jobFlat,
    group.jobClient,
    ...group.contract.flatMap((c) => [c.filename, c.uploadedBy, c.categoryLabel]),
    ...group.reports.flatMap((r) => [r.author, r.label]),
    ...group.attachments.flatMap((a) => [a.filename, a.uploadedBy]),
    ...(job.workerReports || []).flatMap((r) => [r.workerName || "", r.workScopeText || ""]),
  ];
  return parts.join(" ").toLowerCase();
}

export function countAllHubContractItems(jobs: FilesHubJobSource[]): number {
  return jobs.reduce((s, j) => s + collectFilesHubContractItems(j).length, 0);
}

export function countAllHubReportItems(jobs: FilesHubJobSource[]): number {
  return jobs.reduce((s, j) => s + collectFilesHubReportItems(j).length, 0);
}

export function countAllHubAttachmentItems(jobs: FilesHubJobSource[]): number {
  return jobs.reduce((s, j) => s + collectFilesHubAttachmentItems(j).length, 0);
}

/** Pomocnicze — czy raport ma wymiary/obrys wg logiki odbiorowej (bez użycia w liczniku). */
export function filesHubReportHasRysunek(report: NonNullable<FilesHubJobSource["workerReports"]>[number]): boolean {
  return reportHasRysunek(report);
}
