import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import { catalogAddressSlug } from "@/lib/electrical-measurements/measurement-docx-names";
import { APARTMENT_1F_VIEWBOX } from "@/lib/electrical-schematics/layout/apartment-1f-v1";
import { APARTMENT_3F_VIEWBOX } from "@/lib/electrical-schematics/layout/apartment-3f-v1";
import { validateSchematicForExport } from "@/lib/electrical-schematics/normalize";
import { renderSchematicSvg } from "@/lib/electrical-schematics/render-svg";
import {
  rasterizeSchematicSvgToPng,
  rasterizeSchematicSvgToPngPlaywright,
  SCHEMATIC_PDF_RASTER_SCALE,
} from "@/lib/electrical-schematics/render/svg-raster";
import type { LayoutProfile, SchematicStatus, SingleLineDiagram } from "@/lib/electrical-schematics/types";
import { loadWmPrintZiPdfFontBytes } from "@/lib/wm-print/wm-print-pdf-fonts";

/** A4 landscape — pdf-lib points (ISO 595×842 pt, szerokość > wysokość). */
export const SCHEMATIC_PDF_A4_LANDSCAPE = {
  width: 841.89,
  height: 595.28,
} as const;

export const SCHEMATIC_PDF_PAGE_MARGIN = {
  top: 36,
  bottom: 32,
  left: 28,
  right: 28,
} as const;

export class SchematicPdfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SchematicPdfError";
  }
}

export type SchematicSvgRasterizer = (
  svg: string,
  width: number,
  height: number,
  status: SchematicStatus,
) => Promise<Uint8Array>;

function resolveViewBox(layoutProfile: LayoutProfile): { width: number; height: number } {
  switch (layoutProfile) {
    case "apartment-3f-v1":
      return APARTMENT_3F_VIEWBOX;
    case "apartment-1f-v1":
      return APARTMENT_1F_VIEWBOX;
    default:
      throw new SchematicPdfError(`PDF export unsupported for layoutProfile: ${layoutProfile}`);
  }
}

function defaultRasterizer(): SchematicSvgRasterizer {
  if (typeof document !== "undefined") {
    return (svg, width, height, status) =>
      rasterizeSchematicSvgToPng(svg, width, height, status, SCHEMATIC_PDF_RASTER_SCALE);
  }
  return (svg, width, height, status) =>
    rasterizeSchematicSvgToPngPlaywright(svg, width, height, status, SCHEMATIC_PDF_RASTER_SCALE);
}

/** Slug adresu do nazwy pliku PDF (DESIGN FREEZE § J). */
export function schematicAddressSlug(address: string): string {
  return catalogAddressSlug(address);
}

/** `SCHEMAT_{ADRES_SLUG}_{YYYY-MM-DD}.pdf` */
export function schematicPdfFileName(address: string, documentDate: string): string {
  const slug = schematicAddressSlug(address) || "adres";
  const date = String(documentDate || "").trim() || "brak-daty";
  return `SCHEMAT_${slug}_${date}.pdf`;
}

export interface GenerateSchematicPdfOptions {
  /** Wstrzyknięty rasterizer (testy / Node smoke). Domyślnie: canvas lub Playwright. */
  rasterize?: SchematicSvgRasterizer;
}

export interface GenerateSchematicPdfResult {
  bytes: Uint8Array;
  fileName: string;
  svg: string;
}

/**
 * SingleLineDiagram → SVG → raster PNG @2× → PDF A4 landscape.
 * Draft: watermark WERSJA ROBOCZA w rasterze; final: bez watermark.
 */
export async function generateSchematicPdfBytes(
  diagram: SingleLineDiagram,
  options?: GenerateSchematicPdfOptions,
): Promise<Uint8Array> {
  const result = await generateSchematicPdf(diagram, options);
  return result.bytes;
}

export async function generateSchematicPdf(
  diagram: SingleLineDiagram,
  options?: GenerateSchematicPdfOptions,
): Promise<GenerateSchematicPdfResult> {
  const validation = validateSchematicForExport(diagram);
  if (!validation.ok) {
    throw new SchematicPdfError(`Export validation failed: ${validation.missing.join(", ")}`);
  }

  const svg = renderSchematicSvg(diagram);
  const { width, height } = resolveViewBox(diagram.layoutProfile);
  const rasterize = options?.rasterize ?? defaultRasterizer();
  const pngBytes = await rasterize(svg, width, height, diagram.status);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const font = await pdfDoc.embedFont(await loadWmPrintZiPdfFontBytes());
  const page = pdfDoc.addPage([SCHEMATIC_PDF_A4_LANDSCAPE.width, SCHEMATIC_PDF_A4_LANDSCAPE.height]);

  const headerLine = diagram.address.trim()
    ? `${diagram.title.trim()} — ${diagram.address.trim()}`
    : diagram.title.trim();
  page.drawText(headerLine, {
    x: SCHEMATIC_PDF_PAGE_MARGIN.left,
    y: SCHEMATIC_PDF_A4_LANDSCAPE.height - 22,
    size: 9,
    font,
    color: rgb(0.1, 0.1, 0.1),
  });
  page.drawText(`Data dokumentu: ${diagram.documentDate}`, {
    x: SCHEMATIC_PDF_PAGE_MARGIN.left,
    y: 16,
    size: 8,
    font,
    color: rgb(0.45, 0.45, 0.45),
  });

  const pngImage = await pdfDoc.embedPng(pngBytes);
  const availW =
    SCHEMATIC_PDF_A4_LANDSCAPE.width - SCHEMATIC_PDF_PAGE_MARGIN.left - SCHEMATIC_PDF_PAGE_MARGIN.right;
  const availH =
    SCHEMATIC_PDF_A4_LANDSCAPE.height - SCHEMATIC_PDF_PAGE_MARGIN.top - SCHEMATIC_PDF_PAGE_MARGIN.bottom;
  const fitScale = Math.min(availW / width, availH / height);
  const drawW = width * fitScale;
  const drawH = height * fitScale;
  const x = SCHEMATIC_PDF_PAGE_MARGIN.left + (availW - drawW) / 2;
  const y = SCHEMATIC_PDF_PAGE_MARGIN.bottom + (availH - drawH) / 2;

  page.drawImage(pngImage, { x, y, width: drawW, height: drawH });

  const bytes = await pdfDoc.save();
  return {
    bytes,
    fileName: schematicPdfFileName(diagram.address, diagram.documentDate),
    svg,
  };
}

/** Szybka inspekcja PDF (smoke / testy). */
export async function inspectSchematicPdfBytes(bytes: Uint8Array): Promise<{
  pageCount: number;
  width: number;
  height: number;
  isLandscape: boolean;
}> {
  const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const page = doc.getPage(0);
  const { width, height } = page.getSize();
  return {
    pageCount: doc.getPageCount(),
    width,
    height,
    isLandscape: width > height,
  };
}
