/** WM-RYSUNKI-01 P0 — szablony startowe (DF §7). */

import { parseWmTechnicalDrawing } from "@/lib/wm-technical-drawings/normalize";
import {
  DEFAULT_DRAWING_GRID,
  DRAWING_PAGE_SIZE_PX,
  DRAWING_SCHEMA_VERSION,
  type DrawingPageFormat,
  type DrawingPageOrient,
  type DrawingTemplateId,
  type DrawingWallObject,
  type WmTechnicalDrawing,
} from "@/lib/wm-technical-drawings/types";

export const DRAWING_TEMPLATE_LABELS: Record<DrawingTemplateId, string> = {
  blank: "Pusty arkusz",
  floor_plan_apartment: "Rzut mieszkania",
  boiler_room: "Kotłownia",
  basement: "Piwnica",
  garage: "Garaż",
  distribution_room: "Rozdzielnia",
  works_sketch: "Szkic robót",
};

export const DRAWING_TEMPLATE_DEFAULT_TITLE: Record<DrawingTemplateId, string> = {
  blank: "Nowy rysunek",
  floor_plan_apartment: "Rzut mieszkania",
  boiler_room: "Kotłownia",
  basement: "Piwnica",
  garage: "Garaż",
  distribution_room: "Rozdzielnia",
  works_sketch: "Szkic robót",
};

const TEMPLATE_PAGE: Record<
  DrawingTemplateId,
  { format: DrawingPageFormat; orientation: DrawingPageOrient }
> = {
  blank: { format: "A4", orientation: "landscape" },
  floor_plan_apartment: { format: "A4", orientation: "landscape" },
  boiler_room: { format: "A4", orientation: "portrait" },
  basement: { format: "A4", orientation: "landscape" },
  garage: { format: "A4", orientation: "landscape" },
  distribution_room: { format: "A4", orientation: "portrait" },
  works_sketch: { format: "A4", orientation: "landscape" },
};

function localIsoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function guideWalls(pageW: number, pageH: number): DrawingWallObject[] {
  const m = 80;
  const x1 = m;
  const y1 = m;
  const x2 = pageW - m;
  const y2 = pageH - m;
  const mk = (id: string, a: number, b: number, c: number, d: number): DrawingWallObject => ({
    id,
    type: "wall",
    x1: a,
    y1: b,
    x2: c,
    y2: d,
    thickness: 4,
    symbolId: "wall-default",
  });
  return [
    mk(crypto.randomUUID(), x1, y1, x2, y1),
    mk(crypto.randomUUID(), x2, y1, x2, y2),
    mk(crypto.randomUUID(), x2, y2, x1, y2),
    mk(crypto.randomUUID(), x1, y2, x1, y1),
  ];
}

export function buildDrawingFromTemplate(
  templateId: DrawingTemplateId,
  options: {
    jobId?: string;
    address?: string;
    title?: string;
    format?: DrawingPageFormat;
    orientation?: DrawingPageOrient;
  } = {},
): WmTechnicalDrawing {
  const pageCfg = TEMPLATE_PAGE[templateId] ?? TEMPLATE_PAGE.blank;
  const format = options.format ?? pageCfg.format;
  const orientation = options.orientation ?? pageCfg.orientation;
  const size = DRAWING_PAGE_SIZE_PX[format][orientation];
  const now = new Date().toISOString();
  const jobId = options.jobId?.trim() || undefined;

  const objects =
    templateId === "floor_plan_apartment" ? guideWalls(size.width, size.height) : [];

  const draft: WmTechnicalDrawing = {
    id: crypto.randomUUID(),
    schemaVersion: DRAWING_SCHEMA_VERSION,
    title: (options.title?.trim() || DRAWING_TEMPLATE_DEFAULT_TITLE[templateId]).slice(0, 120),
    templateId,
    status: "draft",
    jobId,
    linkStatus: jobId ? "linked" : "manual",
    address: options.address?.trim() || undefined,
    documentDate: localIsoDate(),
    page: {
      format,
      orientation,
      width: size.width,
      height: size.height,
    },
    objects,
    grid: { ...DEFAULT_DRAWING_GRID },
    createdAt: now,
    updatedAt: now,
  };

  const parsed = parseWmTechnicalDrawing(draft);
  if (!parsed) throw new Error("buildDrawingFromTemplate: normalize failed");
  return parsed;
}

export function drawingTemplateLabel(id: DrawingTemplateId): string {
  return DRAWING_TEMPLATE_LABELS[id] ?? id;
}
