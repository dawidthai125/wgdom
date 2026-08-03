/**
 * WM-RYSUNKI-01 P3 — prepare ZIP file entries from Final drawings.
 * D-P3-16 sort · D-P3-17 generateDrawingPdf once · collision _{shortId}
 * Output = { fileName, bytes }[] — ZIP builder must not see Drawing (D-P3-18).
 */

import {
  DrawingPdfError,
  drawingPdfFileName,
  generateDrawingPdf,
  type DrawingPdfOptions,
  type DrawingSvgRasterizer,
} from "@/lib/wm-technical-drawings/export-pdf";
import { filterDrawingsForJob } from "@/lib/wm-technical-drawings/merge";
import type { WmTechnicalDrawing } from "@/lib/wm-technical-drawings/types";

export interface DrawingZipFileEntry {
  fileName: string;
  bytes: Uint8Array;
}

export interface PrepareDrawingZipFileEntriesOptions {
  /** Injected rasterizer (tests / Node). */
  rasterize?: DrawingSvgRasterizer;
}

/** D-AR-P3-02 — 6 chars from id (no hyphens). */
export function drawingZipShortId(id: string): string {
  const s = String(id || "")
    .replace(/-/g, "")
    .toLowerCase()
    .slice(0, 6);
  return s || "xxxxxx";
}

/** MR-P3-03 / D-P3-16 — updatedAt DESC → title pl → id ASC. */
export function sortFinalDrawingsForZip(drawings: WmTechnicalDrawing[]): WmTechnicalDrawing[] {
  return [...drawings].sort((a, b) => {
    const u = String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
    if (u !== 0) return u;
    const t = String(a.title || "").localeCompare(String(b.title || ""), "pl");
    if (t !== 0) return t;
    return String(a.id).localeCompare(String(b.id));
  });
}

export function listFinalDrawingsForJob(
  drawings: WmTechnicalDrawing[],
  jobId: string,
): WmTechnicalDrawing[] {
  const finals = filterDrawingsForJob(drawings, jobId).filter((d) => d.status === "final");
  return sortFinalDrawingsForZip(finals);
}

export function countFinalDrawingsForJob(drawings: WmTechnicalDrawing[], jobId: string): number {
  return listFinalDrawingsForJob(drawings, jobId).length;
}

/** Fingerprint digests — sorted by id. */
export function buildDrawingFingerprintDigests(
  drawings: WmTechnicalDrawing[],
): { id: string; updatedAt: string; status: string }[] {
  return [...drawings]
    .map((d) => ({
      id: d.id,
      updatedAt: String(d.updatedAt || ""),
      status: String(d.status || ""),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

export function applyDrawingZipNameCollision(
  baseFileName: string,
  used: Set<string>,
  drawingId: string,
): string {
  if (!used.has(baseFileName)) {
    used.add(baseFileName);
    return baseFileName;
  }
  const short = drawingZipShortId(drawingId);
  let name = baseFileName.replace(/\.pdf$/i, `_${short}.pdf`);
  let n = 2;
  while (used.has(name)) {
    name = baseFileName.replace(/\.pdf$/i, `_${short}_${n}.pdf`);
    n += 1;
  }
  used.add(name);
  return name;
}

/**
 * Build ZIP entries: sort → generateDrawingPdf **once** per drawing → unique names.
 * Throws DrawingPdfError / Error → caller must abort whole ZIP (D-P3-20).
 */
export async function prepareDrawingZipFileEntries(
  drawings: WmTechnicalDrawing[],
  jobLabel: string,
  opts?: PrepareDrawingZipFileEntriesOptions,
): Promise<DrawingZipFileEntry[]> {
  const label = String(jobLabel ?? "").trim();
  if (!label) {
    throw new DrawingPdfError("jobLabel jest wymagany (ZIP rysunków)");
  }

  const draft = drawings.find((d) => d.status !== "final");
  if (draft) {
    throw new DrawingPdfError("Draft nie może trafić do ZIP (tylko Final)");
  }

  const sorted = sortFinalDrawingsForZip(drawings);
  const used = new Set<string>();
  const out: DrawingZipFileEntry[] = [];

  const pdfOpts: DrawingPdfOptions = {
    jobLabel: label,
    rasterize: opts?.rasterize,
  };

  for (const drawing of sorted) {
    // D-P3-17 — dokładnie jedno wywołanie generateDrawingPdf na rysunek
    const bytes = await generateDrawingPdf(drawing, pdfOpts);
    const base = drawingPdfFileName(drawing, label);
    const fileName = applyDrawingZipNameCollision(base, used, drawing.id);
    out.push({ fileName, bytes });
  }

  return out;
}
