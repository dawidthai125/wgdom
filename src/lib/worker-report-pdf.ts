/**
 * Sprint 20.5A.12C stub — Worker Report PDF Export (następny sprint).
 * Bez pdfMake / jsPDF — wyłącznie model prezentacyjny i punkt integracji.
 */

import type { Job } from "@/app/app-domain";
import type { WorkerJobReport } from "@/app/app-domain";
import { normalizeWorkerReport, roomDisplayName } from "@/app/app-domain";
import { roomHasContent } from "@/app/app-domain";
import { getReportWorkScopeText } from "@/lib/work-scope-text";
import { isMediaAttachmentAvailable } from "@/lib/media-filter";

export type WorkerReportPdfSource = {
  reportId: string;
  jobId: string;
  jobTitle: string;
  workerName: string;
  submittedAt: string;
  workScopeText: string;
  rooms: Array<{
    name: string;
    length: string;
    width: string;
    height: string;
    note?: string;
  }>;
  generalNote?: string;
  sketchUrl?: string;
  sketchNote?: string;
};

function jobTitle(job: Pick<Job, "address" | "flatNumber">): string {
  return `${job.address || "Bez adresu"}${job.flatNumber ? ` m.${job.flatNumber}` : ""}`;
}

/** Mapowanie WorkerJobReport → model pod PDF (bez generacji). */
export function toWorkerReportPdfSource(job: Job, report: WorkerJobReport): WorkerReportPdfSource {
  const norm = normalizeWorkerReport(report);
  let pokojIdx = 0;
  const rooms = norm.rooms.filter(roomHasContent).map((room) => {
    const idx = room.roomType === "pokoj" ? pokojIdx++ : 0;
    const safeRoom = { ...room, customLabel: room.customLabel || "" };
    return {
      name: roomDisplayName(safeRoom, idx),
      length: room.length || "",
      width: room.width || "",
      height: room.height || "",
      note: room.note,
    };
  });
  const sketch = norm.sketch;
  return {
    reportId: norm.id,
    jobId: job.id,
    jobTitle: jobTitle(job),
    workerName: norm.workerName,
    submittedAt: norm.submittedAt,
    workScopeText: getReportWorkScopeText(norm),
    rooms,
    generalNote: norm.generalNote,
    sketchUrl: sketch?.publicUrl && isMediaAttachmentAvailable(sketch) ? sketch.publicUrl : undefined,
    sketchNote: norm.sketchNote,
  };
}

/** @integration-point — pdfMake w JobsView.exportJobPDF (planowany 20.5A.12C). */
export async function downloadWorkerReportPdf(_source: WorkerReportPdfSource): Promise<void> {
  throw new Error("Worker Report PDF — planned 20.5A.12C");
}
