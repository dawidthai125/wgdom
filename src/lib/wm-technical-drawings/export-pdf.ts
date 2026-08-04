/**
 * WM-RYSUNKI-01 P2 — PDF export (pure).
 * JSON → renderDrawingSvg → PNG@2× → pdf-lib → Uint8Array
 * D-P2-15: brak efektów ubocznych (bez KV / toast / mutacji modelu).
 */

import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { catalogAddressSlug } from "@/lib/electrical-measurements/measurement-docx-names";
import { renderDrawingSvg } from "@/lib/wm-technical-drawings/render-svg";
import {
  DRAWING_PDF_RASTER_SCALE,
  rasterizeDrawingSvgToPng,
} from "@/lib/wm-technical-drawings/svg-raster";
import type { WmTechnicalDrawing } from "@/lib/wm-technical-drawings/types";
import { loadWmPrintZiPdfFontBytes } from "@/lib/wm-print/wm-print-pdf-fonts";

export const DRAWING_PDF_PAGE_MARGIN = {
  top: 36,
  bottom: 32,
  left: 28,
  right: 28,
} as const;

export class DrawingPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DrawingPdfError";
  }
}

/** D-P2-16 — opts eksportu; jobLabel obowiązkowy (UI resolve, nie global state). */
export interface DrawingPdfOptions {
  jobLabel: string;
  /** Wstrzyknięty rasterizer (testy). Domyślnie: browser canvas. */
  rasterize?: DrawingSvgRasterizer;
}

export type DrawingSvgRasterizer = (
  svg: string,
  width: number,
  height: number,
) => Promise<Uint8Array>;

function defaultRasterizer(): DrawingSvgRasterizer {
  if (typeof document === "undefined") {
    return async () => {
      throw new DrawingPdfError("Rasteryzacja PDF wymaga przeglądarki (canvas)");
    };
  }
  return (svg, width, height) =>
    rasterizeDrawingSvgToPng(svg, width, height, DRAWING_PDF_RASTER_SCALE);
}

function requireJobLabel(jobLabel: string): string {
  const label = String(jobLabel ?? "").trim();
  if (!label) {
    throw new DrawingPdfError("jobLabel jest wymagany (D-P2-16)");
  }
  return label;
}

function parseDocumentDate(isoDate: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(isoDate || "").trim());
  if (!m) return new Date(Date.UTC(1970, 0, 1, 12, 0, 0));
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo, d, 12, 0, 0));
}

/** `RYSUNEK_{ADDRESS_OR_JOB_SLUG}_{TITLE_SLUG}_{YYYY-MM-DD}.pdf` */
export function drawingPdfFileName(drawing: WmTechnicalDrawing, jobLabel: string): string {
  const label = String(jobLabel ?? "").trim() || "Bez roboty";
  const addrOrJob =
    catalogAddressSlug(drawing.address?.trim() || label) || "robota";
  const titleSlug = (catalogAddressSlug(drawing.title) || "rysunek").slice(0, 40);
  const date = String(drawing.documentDate || "").trim() || "brak-daty";
  return `RYSUNEK_${addrOrJob}_${titleSlug}_${date}.pdf`;
}

/**
 * Pure PDF export — D-P2-15.
 * SSOT obrazu: renderDrawingSvg(drawing, { showGrid: false }).
 */
export async function generateDrawingPdf(
  drawing: WmTechnicalDrawing,
  options: DrawingPdfOptions,
): Promise<Uint8Array> {
  const jobLabel = requireJobLabel(options.jobLabel);

  const w = drawing.page?.width ?? 0;
  const h = drawing.page?.height ?? 0;
  if (!(w > 0 && h > 0)) {
    throw new DrawingPdfError("Nieprawidłowy rozmiar strony rysunku");
  }

  /* D-M1-02 / DFC-P1-01 — jawny export (default i tak fail-safe). */
  const svg = renderDrawingSvg(drawing, { showGrid: false, mode: "export" });
  if (svg.includes('data-grid="1"')) {
    throw new DrawingPdfError("Internal: siatka nie może trafić do PDF");
  }

  const rasterize = options.rasterize ?? defaultRasterizer();
  let pngBytes: Uint8Array;
  try {
    pngBytes = await rasterize(svg, w, h);
  } catch (e) {
    if (e instanceof DrawingPdfError) throw e;
    throw new DrawingPdfError(
      e instanceof Error ? `Rasteryzacja nieudana: ${e.message}` : "Rasteryzacja nieudana",
    );
  }

  try {
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    const metaDate = parseDocumentDate(drawing.documentDate);
    pdfDoc.setCreationDate(metaDate);
    pdfDoc.setModificationDate(metaDate);
    pdfDoc.setTitle(drawing.title?.trim() || "Rysunek");

    const font = await pdfDoc.embedFont(await loadWmPrintZiPdfFontBytes());
    const page = pdfDoc.addPage([w, h]);

    page.drawText(jobLabel, {
      x: DRAWING_PDF_PAGE_MARGIN.left,
      y: h - 22,
      size: 9,
      font,
      color: rgb(0.1, 0.1, 0.1),
      maxWidth: w - DRAWING_PDF_PAGE_MARGIN.left - DRAWING_PDF_PAGE_MARGIN.right,
    });

    const dateLine = `Data: ${String(drawing.documentDate || "").trim() || "—"}`;
    page.drawText(dateLine, {
      x: DRAWING_PDF_PAGE_MARGIN.left,
      y: 16,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.45),
    });

    const pngImage = await pdfDoc.embedPng(pngBytes);
    const availW =
      w - DRAWING_PDF_PAGE_MARGIN.left - DRAWING_PDF_PAGE_MARGIN.right;
    const availH =
      h - DRAWING_PDF_PAGE_MARGIN.top - DRAWING_PDF_PAGE_MARGIN.bottom;
    const fitScale = Math.min(availW / w, availH / h);
    const drawW = w * fitScale;
    const drawH = h * fitScale;
    const x = DRAWING_PDF_PAGE_MARGIN.left + (availW - drawW) / 2;
    const y = DRAWING_PDF_PAGE_MARGIN.bottom + (availH - drawH) / 2;

    page.drawImage(pngImage, { x, y, width: drawW, height: drawH });

    return await pdfDoc.save();
  } catch (e) {
    if (e instanceof DrawingPdfError) throw e;
    throw new DrawingPdfError(
      e instanceof Error ? `Generowanie PDF nieudane: ${e.message}` : "Generowanie PDF nieudane",
    );
  }
}

export async function inspectDrawingPdfBytes(bytes: Uint8Array): Promise<{
  pageCount: number;
  width: number;
  height: number;
}> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const page = doc.getPage(0);
  const { width, height } = page.getSize();
  return {
    pageCount: doc.getPageCount(),
    width,
    height,
  };
}
