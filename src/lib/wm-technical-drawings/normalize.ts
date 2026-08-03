/** WM-RYSUNKI-01 P0 — normalize + validate (MR-04 schemaVersion policy). */

import {
  DEFAULT_DRAWING_GRID,
  DRAWING_LINK_STATUSES,
  DRAWING_PAGE_FORMATS,
  DRAWING_PAGE_ORIENTS,
  DRAWING_PAGE_SIZE_PX,
  DRAWING_SCHEMA_VERSION,
  DRAWING_STATUSES,
  DRAWING_TEMPLATE_IDS,
  type DrawingGrid,
  type DrawingLinkStatus,
  type DrawingObject,
  type DrawingObjectType,
  type DrawingPage,
  type DrawingPageFormat,
  type DrawingPageOrient,
  type DrawingStatus,
  type DrawingTemplateId,
  type DrawingTextObject,
  type DrawingWallObject,
  type WmTechnicalDrawing,
} from "@/lib/wm-technical-drawings/types";

const KNOWN_OBJECT_TYPES = new Set<DrawingObjectType>([
  "wall",
  "door",
  "window",
  "text",
  "dimension",
  "ventilation",
  "gas_boiler",
  "measurement_point",
  "electrical_point",
  "distribution_board",
]);

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function asFiniteNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function localIsoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function resolvePageSize(format: DrawingPageFormat, orientation: DrawingPageOrient): { width: number; height: number } {
  return DRAWING_PAGE_SIZE_PX[format][orientation];
}

export function normalizeDrawingPage(raw: unknown): DrawingPage {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const format = DRAWING_PAGE_FORMATS.includes(r.format as DrawingPageFormat)
    ? (r.format as DrawingPageFormat)
    : "A4";
  const orientation = DRAWING_PAGE_ORIENTS.includes(r.orientation as DrawingPageOrient)
    ? (r.orientation as DrawingPageOrient)
    : "landscape";
  const size = resolvePageSize(format, orientation);
  return {
    format,
    orientation,
    width: asFiniteNumber(r.width, size.width) || size.width,
    height: asFiniteNumber(r.height, size.height) || size.height,
  };
}

export function normalizeDrawingGrid(raw: unknown): DrawingGrid {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const step = Math.max(1, asFiniteNumber(r.step, DEFAULT_DRAWING_GRID.step));
  return {
    enabled: r.enabled === false ? false : true,
    step,
    snap: r.snap === false ? false : true,
  };
}

function parseWall(raw: Record<string, unknown>, id: string): DrawingWallObject | null {
  return {
    id,
    type: "wall",
    x1: asFiniteNumber(raw.x1, 0),
    y1: asFiniteNumber(raw.y1, 0),
    x2: asFiniteNumber(raw.x2, 0),
    y2: asFiniteNumber(raw.y2, 0),
    thickness: raw.thickness != null ? asFiniteNumber(raw.thickness, 4) : undefined,
    rotation: raw.rotation != null ? asFiniteNumber(raw.rotation, 0) : undefined,
    locked: raw.locked === true,
    zIndex: raw.zIndex != null ? asFiniteNumber(raw.zIndex, 0) : undefined,
    symbolId: asString(raw.symbolId, "wall-default") || "wall-default",
  };
}

function parseText(raw: Record<string, unknown>, id: string): DrawingTextObject | null {
  return {
    id,
    type: "text",
    x: asFiniteNumber(raw.x, 0),
    y: asFiniteNumber(raw.y, 0),
    content: asString(raw.content, ""),
    fontSize: raw.fontSize != null ? asFiniteNumber(raw.fontSize, 14) : undefined,
    rotation: raw.rotation != null ? asFiniteNumber(raw.rotation, 0) : undefined,
    locked: raw.locked === true,
    zIndex: raw.zIndex != null ? asFiniteNumber(raw.zIndex, 0) : undefined,
    symbolId: asString(raw.symbolId, "text-label") || "text-label",
  };
}

export function parseDrawingObject(raw: unknown): DrawingObject | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = asString(r.id).trim();
  if (!id) return null;
  const type = asString(r.type) as DrawingObjectType;
  if (!KNOWN_OBJECT_TYPES.has(type)) return null;
  if (type === "wall") return parseWall(r, id);
  if (type === "text") return parseText(r, id);
  return {
    id,
    type,
    x: r.x != null ? asFiniteNumber(r.x, 0) : undefined,
    y: r.y != null ? asFiniteNumber(r.y, 0) : undefined,
    x1: r.x1 != null ? asFiniteNumber(r.x1, 0) : undefined,
    y1: r.y1 != null ? asFiniteNumber(r.y1, 0) : undefined,
    x2: r.x2 != null ? asFiniteNumber(r.x2, 0) : undefined,
    y2: r.y2 != null ? asFiniteNumber(r.y2, 0) : undefined,
    content: r.content != null ? asString(r.content) : undefined,
    label: r.label != null ? asString(r.label) : undefined,
    width: r.width != null ? asFiniteNumber(r.width, 0) : undefined,
    fontSize: r.fontSize != null ? asFiniteNumber(r.fontSize, 14) : undefined,
    thickness: r.thickness != null ? asFiniteNumber(r.thickness, 4) : undefined,
    symbolId: r.symbolId != null ? asString(r.symbolId) : "unknown",
    wallRefId: r.wallRefId != null ? asString(r.wallRefId) : undefined,
    rotation: r.rotation != null ? asFiniteNumber(r.rotation, 0) : undefined,
    locked: r.locked === true,
    zIndex: r.zIndex != null ? asFiniteNumber(r.zIndex, 0) : undefined,
  };
}

/**
 * MR-04: nieznany schemaVersion → coerce do 1 (zachowaj objects), nie gub danych.
 * Przyszłe v2: osobna ścieżka migrate po amend DF.
 */
export function parseWmTechnicalDrawing(raw: unknown): WmTechnicalDrawing | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = asString(r.id).trim();
  if (!id) return null;

  const title = asString(r.title).trim() || "Nowy rysunek";
  const templateId = DRAWING_TEMPLATE_IDS.includes(r.templateId as DrawingTemplateId)
    ? (r.templateId as DrawingTemplateId)
    : "blank";
  const status = DRAWING_STATUSES.includes(r.status as DrawingStatus)
    ? (r.status as DrawingStatus)
    : "draft";
  const linkStatus = DRAWING_LINK_STATUSES.includes(r.linkStatus as DrawingLinkStatus)
    ? (r.linkStatus as DrawingLinkStatus)
    : r.jobId
      ? "linked"
      : "manual";

  const objectsRaw = Array.isArray(r.objects) ? r.objects : [];
  const objects: DrawingObject[] = [];
  for (const item of objectsRaw) {
    const parsed = parseDrawingObject(item);
    if (parsed) objects.push(parsed);
  }

  const createdAt = asString(r.createdAt) || new Date().toISOString();
  const updatedAt = asString(r.updatedAt) || createdAt;
  const jobId = asString(r.jobId).trim() || undefined;

  return {
    id,
    schemaVersion: DRAWING_SCHEMA_VERSION,
    title,
    templateId,
    status,
    jobId,
    linkStatus,
    address: asString(r.address).trim() || undefined,
    documentDate: asString(r.documentDate).trim() || localIsoDate(),
    notes: asString(r.notes).trim() || undefined,
    page: normalizeDrawingPage(r.page),
    objects,
    grid: normalizeDrawingGrid(r.grid ?? DEFAULT_DRAWING_GRID),
    renderedSvg: typeof r.renderedSvg === "string" ? r.renderedSvg : undefined,
    renderVersion: r.renderVersion != null ? asFiniteNumber(r.renderVersion, 0) : undefined,
    createdAt,
    updatedAt,
  };
}

export function normalizeWmTechnicalDrawings(raw: unknown): WmTechnicalDrawing[] {
  if (!Array.isArray(raw)) return [];
  const out: WmTechnicalDrawing[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const parsed = parseWmTechnicalDrawing(item);
    if (!parsed || seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    out.push(parsed);
  }
  return out;
}

/** Save: title non-empty · objects array OK empty · points never required. */
export function validateDrawingForSave(drawing: WmTechnicalDrawing): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!drawing.id?.trim()) missing.push("id");
  if (!drawing.title?.trim()) missing.push("title");
  if (!Array.isArray(drawing.objects)) missing.push("objects");
  return { ok: missing.length === 0, missing };
}

/** Final: title + (jobId linked | address). */
export function validateDrawingForFinal(drawing: WmTechnicalDrawing): { ok: boolean; missing: string[] } {
  const base = validateDrawingForSave(drawing);
  const missing = [...base.missing];
  const hasJob = Boolean(drawing.jobId?.trim()) && drawing.linkStatus === "linked";
  const hasAddress = Boolean(drawing.address?.trim());
  if (!hasJob && !hasAddress) missing.push("jobId_or_address");
  return { ok: missing.length === 0, missing };
}

export function snapCoord(value: number, step: number, snapEnabled: boolean): number {
  if (!snapEnabled || step <= 0) return value;
  return Math.round(value / step) * step;
}
