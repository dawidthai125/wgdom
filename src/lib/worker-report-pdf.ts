/**
 * Sprint 20.5A.12C — Worker Report PDF Export (pojedynczy wpis dokumentacji).
 */

import type { Job } from "@/app/app-domain";
import type { WorkerJobReport } from "@/app/app-domain";
import { normalizeWorkerReport, roomDisplayName } from "@/app/app-domain";
import { roomHasContent } from "@/app/app-domain";
import { getReportWorkScopeText } from "@/lib/work-scope-text";
import { isMediaAttachmentAvailable } from "@/lib/media-filter";
import { APP_VERSION } from "@/lib/app-version";
import { loadPdfMake, type PdfDocDef } from "@/lib/pdfmake-loader";
import { deliverPdfBlob } from "@/lib/inspector-report-pdf";

export type WorkerReportPdfSource = {
  reportId: string;
  jobId: string;
  jobTitle: string;
  workerName: string;
  submittedAt: string;
  updatedAt?: string;
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

const C = {
  navy: "#344254",
  red: "#C0392B",
  light: "#EDF1F6",
  white: "#FFFFFF",
  muted: "#8A9BB0",
};

function jobTitle(job: Pick<Job, "address" | "flatNumber">): string {
  return `${job.address || "Bez adresu"}${job.flatNumber ? ` m.${job.flatNumber}` : ""}`;
}

function fmtPdfDate(iso: string): string {
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

function slugFilenamePart(text: string): string {
  return (text || "dokumentacja")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 48) || "dokumentacja";
}

export function workerReportPdfFilename(source: WorkerReportPdfSource): string {
  const date = source.submittedAt.slice(0, 10) || "data";
  return `dokumentacja-${slugFilenamePart(source.jobTitle)}-${date}.pdf`;
}

/** Mapowanie WorkerJobReport → model pod PDF. */
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
    updatedAt: norm.updatedAt,
    workScopeText: getReportWorkScopeText(norm),
    rooms,
    generalNote: norm.generalNote,
    sketchUrl: sketch?.publicUrl && isMediaAttachmentAvailable(sketch) ? sketch.publicUrl : undefined,
    sketchNote: norm.sketchNote,
  };
}

async function fetchSketchDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildWorkerReportDocDef(
  source: WorkerReportPdfSource,
  sketchDataUrl?: string | null,
): Promise<PdfDocDef> {
  const generatedAt = new Date().toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const metaRows: PdfDocDef["content"] = [
    { text: "Adres", fontSize: 8, color: C.muted, margin: [0, 0, 0, 2] },
    { text: source.jobTitle, fontSize: 11, bold: true, color: C.navy, margin: [0, 0, 0, 8] },
    {
      columns: [
        {
          stack: [
            { text: "Autor", fontSize: 8, color: C.muted },
            { text: source.workerName || "—", fontSize: 10, bold: true, color: C.navy },
          ],
          width: "*",
        },
        {
          stack: [
            { text: "Data zgłoszenia", fontSize: 8, color: C.muted },
            { text: fmtPdfDate(source.submittedAt), fontSize: 10, bold: true, color: C.navy },
          ],
          width: "*",
        },
        ...(source.updatedAt
          ? [{
              stack: [
                { text: "Data aktualizacji", fontSize: 8, color: C.muted },
                { text: fmtPdfDate(source.updatedAt), fontSize: 10, bold: true, color: C.navy },
              ],
              width: "*",
            }]
          : []),
      ],
      margin: [0, 0, 0, 14] as [number, number, number, number],
    },
  ];

  const content: PdfDocDef["content"] = [
    { canvas: [{ type: "rect", x: 0, y: 0, w: 515, h: 50, color: C.navy }] },
    { text: "W&G DOM", fontSize: 22, bold: true, color: C.white, absolutePosition: { x: 40, y: 18 } },
    { text: "Dokumentacja robót", fontSize: 11, color: C.red, absolutePosition: { x: 40, y: 44 } },
    { text: " ", fontSize: 6, margin: [0, 22, 0, 0] },
    ...metaRows,
  ];

  if (source.workScopeText.trim()) {
    content.push(
      { text: "ZAKRES PRAC", fontSize: 8, bold: true, color: C.muted, margin: [0, 0, 0, 6] },
      { text: source.workScopeText, fontSize: 9, color: C.navy, margin: [0, 0, 0, 12] },
    );
  }

  if (source.rooms.length > 0) {
    const body = [
      [
        { text: "Pomieszczenie", bold: true, fillColor: C.navy, color: C.white, fontSize: 8 },
        { text: "Długość", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "right" },
        { text: "Szerokość", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "right" },
        { text: "Wysokość", bold: true, fillColor: C.navy, color: C.white, fontSize: 8, alignment: "right" },
        { text: "Uwagi", bold: true, fillColor: C.navy, color: C.white, fontSize: 8 },
      ],
      ...source.rooms.map((room, i) => [
        { text: room.name, fontSize: 8, fillColor: i % 2 === 0 ? C.white : C.light },
        { text: room.length || "—", fontSize: 8, alignment: "right", fillColor: i % 2 === 0 ? C.white : C.light },
        { text: room.width || "—", fontSize: 8, alignment: "right", fillColor: i % 2 === 0 ? C.white : C.light },
        { text: room.height || "—", fontSize: 8, alignment: "right", fillColor: i % 2 === 0 ? C.white : C.light },
        { text: room.note || "—", fontSize: 7, color: C.muted, fillColor: i % 2 === 0 ? C.white : C.light },
      ]),
    ];
    content.push(
      { text: "WYMIARY POMIESZCZEŃ", fontSize: 8, bold: true, color: C.muted, margin: [0, 0, 0, 6] },
      {
        table: { headerRows: 1, widths: ["*", "auto", "auto", "auto", "*"], body },
        layout: { hLineColor: () => "#E5E7EB", vLineColor: () => "#E5E7EB" },
        margin: [0, 0, 0, 12],
      },
    );
  }

  if (source.sketchUrl) {
    content.push(
      { text: "OBRYŚ LOKALU", fontSize: 8, bold: true, color: C.muted, margin: [0, 0, 0, 6] },
    );
    if (sketchDataUrl) {
      content.push({
        image: sketchDataUrl,
        width: 400,
        margin: [0, 0, 0, 6],
      });
    } else {
      content.push({
        text: "Obrys lokalu niedostępny",
        fontSize: 9,
        italics: true,
        color: C.muted,
        margin: [0, 0, 0, 6],
      });
    }
    if (source.sketchNote?.trim()) {
      content.push({
        text: source.sketchNote,
        fontSize: 8,
        color: C.muted,
        italics: true,
        margin: [0, 0, 0, 8],
      });
    }
  }

  if (source.generalNote?.trim()) {
    content.push(
      { text: "WIADOMOŚĆ", fontSize: 8, bold: true, color: C.muted, margin: [0, 0, 0, 4] },
      { text: source.generalNote, fontSize: 9, color: C.navy, margin: [0, 0, 0, 12] },
    );
  }

  content.push(
    { canvas: [{ type: "line", x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: "#E5E7EB" }], margin: [0, 8, 0, 6] },
    {
      text: `WGDOM v${APP_VERSION} · Wygenerowano ${generatedAt}`,
      fontSize: 7,
      color: C.muted,
      alignment: "center",
    },
  );

  return {
    pageSize: "A4",
    pageOrientation: "portrait",
    pageMargins: [40, 60, 40, 50],
    defaultStyle: { font: "Roboto", fontSize: 10, lineHeight: 1.35 },
    content,
  };
}

export async function downloadWorkerReportPdf(source: WorkerReportPdfSource): Promise<void> {
  const sketchDataUrl = source.sketchUrl ? await fetchSketchDataUrl(source.sketchUrl) : null;
  const docDef = await buildWorkerReportDocDef(source, sketchDataUrl);
  const pdfMake = await loadPdfMake();
  const blob = await pdfMake.createPdf(docDef).getBlob();
  await deliverPdfBlob(blob, workerReportPdfFilename(source));
}

export async function downloadWorkerReportPdfForJob(job: Job, report: WorkerJobReport): Promise<void> {
  await downloadWorkerReportPdf(toWorkerReportPdfSource(job, report));
}
