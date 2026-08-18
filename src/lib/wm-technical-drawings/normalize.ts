/** WM-RYSUNKI-01 P0+P1 — normalize + validate (MR-04 · MR-P1-06). */

import {
  DEFAULT_DRAWING_GRID,
  DRAWING_LINK_STATUSES,
  DRAWING_PAGE_FORMATS,
  DRAWING_PAGE_ORIENTS,
  DRAWING_PAGE_SIZE_PX,
  DRAWING_SCHEMA_VERSION,
  DRAWING_STATUSES,
  DRAWING_TEMPLATE_IDS,
  DRAWING_DOMAINS,
  ROOM_LABEL_DEFAULT_FONT_SIZE,
  SKETCH_COMMENTS_CAP,
  SKETCH_ORIGINS,
  SKETCH_PHOTO_IDS_CAP,
  SKETCH_REVISION_ACTIONS,
  SKETCH_REVISION_META_CAP,
  SKETCH_WORKFLOW_STATUSES,
  TEXT_DEFAULT_FONT_SIZE,
  type DrawingArrowObject,
  type DrawingDimensionObject,
  type DrawingDomain,
  type DrawingDoorObject,
  type DrawingGrid,
  type DrawingLinkStatus,
  type DrawingObject,
  type DrawingObjectType,
  type DrawingPage,
  type DrawingPageFormat,
  type DrawingPageOrient,
  type DrawingStampObject,
  type DrawingStatus,
  type DrawingTemplateId,
  type DrawingTextObject,
  type DrawingWallObject,
  type DrawingWindowObject,
  type SketchComment,
  type SketchEditLock,
  type SketchOrigin,
  type SketchPlacement,
  type SketchRevisionMeta,
  type SketchWorkflowStatus,
  type WmTechnicalDrawing,
} from "@/lib/wm-technical-drawings/types";
import { canonicalDoorSymbolId } from "@/lib/wm-technical-drawings/symbols";

const KNOWN_OBJECT_TYPES = new Set<DrawingObjectType>([
  "wall",
  "door",
  "window",
  "text",
  "dimension",
  "arrow",
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

function parseWall(raw: Record<string, unknown>, id: string): DrawingWallObject {
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

/** "bold" keep · "normal"/invalid/missing → omit (render default normal). */
function parseTextFontWeight(raw: unknown): "bold" | undefined {
  if (raw === "bold") return "bold";
  return undefined;
}

function parseText(raw: Record<string, unknown>, id: string): DrawingTextObject {
  const fontWeight = parseTextFontWeight(raw.fontWeight);
  return {
    id,
    type: "text",
    x: asFiniteNumber(raw.x, 0),
    y: asFiniteNumber(raw.y, 0),
    content: asString(raw.content, ""),
    fontSize: raw.fontSize != null ? asFiniteNumber(raw.fontSize, TEXT_DEFAULT_FONT_SIZE) : undefined,
    ...(fontWeight ? { fontWeight } : {}),
    rotation: raw.rotation != null ? asFiniteNumber(raw.rotation, 0) : undefined,
    locked: raw.locked === true,
    zIndex: raw.zIndex != null ? asFiniteNumber(raw.zIndex, 0) : undefined,
    symbolId: asString(raw.symbolId, "text-label") || "text-label",
  };
}

function parseDoor(raw: Record<string, unknown>, id: string): DrawingDoorObject {
  /* MR-P1-06: wallRefId OUT — strip (nie kopiujemy) */
  /* Canonical door-swing; legacy door-room / door-entrance / door-swing → SSOT */
  return {
    id,
    type: "door",
    x: asFiniteNumber(raw.x, 0),
    y: asFiniteNumber(raw.y, 0),
    width: raw.width != null ? asFiniteNumber(raw.width, 40) : undefined,
    symbolId: canonicalDoorSymbolId(asString(raw.symbolId, "door-swing")),
    flipH: raw.flipH === true,
    rotation: raw.rotation != null ? asFiniteNumber(raw.rotation, 0) : undefined,
    locked: raw.locked === true,
    zIndex: raw.zIndex != null ? asFiniteNumber(raw.zIndex, 0) : undefined,
  };
}

function parseWindow(raw: Record<string, unknown>, id: string): DrawingWindowObject {
  return {
    id,
    type: "window",
    x: asFiniteNumber(raw.x, 0),
    y: asFiniteNumber(raw.y, 0),
    width: raw.width != null ? asFiniteNumber(raw.width, 48) : undefined,
    symbolId: asString(raw.symbolId, "window-rect") || "window-rect",
    rotation: raw.rotation != null ? asFiniteNumber(raw.rotation, 0) : undefined,
    locked: raw.locked === true,
    zIndex: raw.zIndex != null ? asFiniteNumber(raw.zIndex, 0) : undefined,
  };
}

function parseStamp(
  raw: Record<string, unknown>,
  id: string,
  type: "ventilation" | "gas_boiler" | "distribution_board",
): DrawingStampObject {
  const defaultSym =
    type === "ventilation"
      ? "vent-grid"
      : type === "gas_boiler"
        ? "gas-boiler"
        : "distribution-board";
  return {
    id,
    type,
    x: asFiniteNumber(raw.x, 0),
    y: asFiniteNumber(raw.y, 0),
    symbolId: asString(raw.symbolId, defaultSym) || defaultSym,
    rotation: raw.rotation != null ? asFiniteNumber(raw.rotation, 0) : undefined,
    locked: raw.locked === true,
    zIndex: raw.zIndex != null ? asFiniteNumber(raw.zIndex, 0) : undefined,
  };
}

/** Dimension label font — missing/invalid → omit (renderer default 14). */
function parseOptionalDimensionFontSize(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return undefined;
  return n;
}

function parseDimension(raw: Record<string, unknown>, id: string): DrawingDimensionObject {
  const fontSize = parseOptionalDimensionFontSize(raw.fontSize);
  return {
    id,
    type: "dimension",
    x1: asFiniteNumber(raw.x1, 0),
    y1: asFiniteNumber(raw.y1, 0),
    x2: asFiniteNumber(raw.x2, 0),
    y2: asFiniteNumber(raw.y2, 0),
    label: raw.label != null ? asString(raw.label) : undefined,
    ...(fontSize != null ? { fontSize } : {}),
    symbolId: asString(raw.symbolId, "dimension-line") || "dimension-line",
    rotation: raw.rotation != null ? asFiniteNumber(raw.rotation, 0) : undefined,
    locked: raw.locked === true,
    zIndex: raw.zIndex != null ? asFiniteNumber(raw.zIndex, 0) : undefined,
  };
}

function parseArrow(raw: Record<string, unknown>, id: string): DrawingArrowObject {
  return {
    id,
    type: "arrow",
    x1: asFiniteNumber(raw.x1, 0),
    y1: asFiniteNumber(raw.y1, 0),
    x2: asFiniteNumber(raw.x2, 0),
    y2: asFiniteNumber(raw.y2, 0),
    symbolId: asString(raw.symbolId, "arrow-straight") || "arrow-straight",
    rotation: raw.rotation != null ? asFiniteNumber(raw.rotation, 0) : undefined,
    locked: raw.locked === true,
    zIndex: raw.zIndex != null ? asFiniteNumber(raw.zIndex, 0) : undefined,
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
  if (type === "door") return parseDoor(r, id);
  if (type === "window") return parseWindow(r, id);
  if (type === "ventilation") return parseStamp(r, id, "ventilation");
  if (type === "gas_boiler") return parseStamp(r, id, "gas_boiler");
  if (type === "distribution_board") return parseStamp(r, id, "distribution_board");
  if (type === "dimension") return parseDimension(r, id);
  if (type === "arrow") return parseArrow(r, id);
  return {
    id,
    type,
    x: r.x != null ? asFiniteNumber(r.x, 0) : undefined,
    y: r.y != null ? asFiniteNumber(r.y, 0) : undefined,
    label: r.label != null ? asString(r.label) : undefined,
    symbolId: r.symbolId != null ? asString(r.symbolId) : "unknown",
    rotation: r.rotation != null ? asFiniteNumber(r.rotation, 0) : undefined,
    locked: r.locked === true,
    zIndex: r.zIndex != null ? asFiniteNumber(r.zIndex, 0) : undefined,
  };
}

function parseRevisionMeta(raw: unknown): SketchRevisionMeta | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const revisionNumber = asFiniteNumber(r.revisionNumber, 0);
  const action = asString(r.action) as SketchRevisionMeta["action"];
  if (revisionNumber < 1 || !SKETCH_REVISION_ACTIONS.includes(action)) return null;
  const byUserId = asString(r.byUserId).trim();
  if (!byUserId) return null;
  return {
    revisionNumber,
    at: asString(r.at) || new Date().toISOString(),
    byUserId,
    byRole: asString(r.byRole).trim() || "unknown",
    byName: asString(r.byName).trim() || undefined,
    action,
  };
}

function parseRevisionMetaList(raw: unknown): SketchRevisionMeta[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: SketchRevisionMeta[] = [];
  for (const item of raw) {
    const parsed = parseRevisionMeta(item);
    if (parsed) out.push(parsed);
    if (out.length >= SKETCH_REVISION_META_CAP) break;
  }
  return out.length > 0 ? out : undefined;
}

function parsePhotoIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const id = asString(item).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= SKETCH_PHOTO_IDS_CAP) break;
  }
  return out;
}

function parseEditLock(raw: unknown): SketchEditLock | null | undefined {
  if (raw == null) return raw === null ? null : undefined;
  if (typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const holderUserId = asString(r.holderUserId).trim();
  const expiresAt = asString(r.expiresAt).trim();
  if (!holderUserId || !expiresAt) return null;
  return {
    holderUserId,
    holderRole: asString(r.holderRole).trim() || "unknown",
    holderName: asString(r.holderName).trim() || holderUserId,
    deviceId: asString(r.deviceId).trim() || undefined,
    acquiredAt: asString(r.acquiredAt) || expiresAt,
    expiresAt,
  };
}

function parseComment(raw: unknown): SketchComment | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = asString(r.id).trim();
  const text = asString(r.text).trim().slice(0, 500);
  const authorUserId = asString(r.authorUserId).trim();
  if (!id || !text || !authorUserId) return null;
  return {
    id,
    x: asFiniteNumber(r.x, 0),
    y: asFiniteNumber(r.y, 0),
    text,
    authorUserId,
    authorRole: asString(r.authorRole).trim() || "unknown",
    authorName: asString(r.authorName).trim() || authorUserId,
    createdAt: asString(r.createdAt) || new Date().toISOString(),
    resolvedAt: asString(r.resolvedAt).trim() || undefined,
    resolvedByUserId: asString(r.resolvedByUserId).trim() || undefined,
    anchorObjectId: asString(r.anchorObjectId).trim() || undefined,
  };
}

function parseComments(raw: unknown): SketchComment[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out: SketchComment[] = [];
  for (const item of raw) {
    const parsed = parseComment(item);
    if (parsed) out.push(parsed);
    if (out.length >= SKETCH_COMMENTS_CAP) break;
  }
  return out.length > 0 ? out : undefined;
}

export function isDrawingSoftDeleted(drawing: Pick<WmTechnicalDrawing, "deletedAt">): boolean {
  return Boolean(drawing.deletedAt && String(drawing.deletedAt).trim());
}

/** A2 — domyślna lista Odbiory → Rysunki. NO TOUCH (WM-DOKUMENTACJA-SZKICE-01). */
export function isDrawingVisibleInRysunkiTab(drawing: WmTechnicalDrawing): boolean {
  if (isDrawingSoftDeleted(drawing)) return false;
  if (drawing.status === "final") return true;
  if (drawing.origin === "worker") return false;
  return drawing.origin === "wm_druk" || drawing.origin === "admin" || drawing.origin === "inspector";
}

/** Heurystyka legacy → domain (DF). */
export function resolveDrawingDomain(raw: {
  domain?: unknown;
  origin?: SketchOrigin;
  status?: DrawingStatus;
}): DrawingDomain {
  if (DRAWING_DOMAINS.includes(raw.domain as DrawingDomain)) {
    return raw.domain as DrawingDomain;
  }
  if (raw.origin === "worker") return "job_sketch";
  return "reception";
}

export function isJobSketch(drawing: Pick<WmTechnicalDrawing, "domain">): boolean {
  return drawing.domain === "job_sketch";
}

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

  const origin = SKETCH_ORIGINS.includes(r.origin as SketchOrigin)
    ? (r.origin as SketchOrigin)
    : "wm_druk";

  const domain = resolveDrawingDomain({ domain: r.domain, origin, status });

  let workflowStatus: SketchWorkflowStatus;
  if (SKETCH_WORKFLOW_STATUSES.includes(r.workflowStatus as SketchWorkflowStatus)) {
    workflowStatus = r.workflowStatus as SketchWorkflowStatus;
  } else if (origin === "worker" || domain === "job_sketch") {
    workflowStatus = "worker_draft";
  } else {
    workflowStatus = "resolved";
  }
  // WM-DOKUMENTACJA-SZKICE-02 — legacy Accept / final_source → resolved
  if (workflowStatus === "accepted" || workflowStatus === "final_source") {
    workflowStatus = "resolved";
  }

  const revisionNumberRaw = asFiniteNumber(r.revisionNumber, 1);
  const revisionNumber = revisionNumberRaw >= 1 ? Math.floor(revisionNumberRaw) : 1;

  const deletedAtRaw = asString(r.deletedAt).trim();
  const deletedAt = deletedAtRaw ? deletedAtRaw : r.deletedAt === null ? null : undefined;
  const softDeleted = Boolean(deletedAt);

  let placement: SketchPlacement | undefined;
  const rawPlacement = r.placement;
  if (rawPlacement && typeof rawPlacement === "object") {
    const p = rawPlacement as Record<string, unknown>;
    placement = {
      documentation: p.documentation === true,
      reception: p.reception === true,
    };
  } else if (domain === "job_sketch" && workflowStatus === "resolved" && !softDeleted) {
    // Legacy resolved/accepted bez placement → docs-only (nie wycieka do A2)
    placement = { documentation: true, reception: false };
  }
  // Napraw illegal false/false bez soft-delete
  if (placement && !placement.documentation && !placement.reception && !softDeleted) {
    placement = { documentation: true, reception: false };
  }

  const receptionDrawingIdRaw = asString(r.receptionDrawingId).trim();
  const receptionDrawingId = receptionDrawingIdRaw
    ? receptionDrawingIdRaw
    : r.receptionDrawingId === null
      ? null
      : undefined;
  const sourceSketchId = asString(r.sourceSketchId).trim() || undefined;

  return {
    id,
    schemaVersion: DRAWING_SCHEMA_VERSION,
    title,
    templateId,
    status: domain === "job_sketch" && status === "final" ? "draft" : status,
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
    domain,
    origin,
    workflowStatus,
    revisionNumber,
    revisionMeta: parseRevisionMetaList(r.revisionMeta),
    createdByUserId: asString(r.createdByUserId).trim() || undefined,
    createdByRole: asString(r.createdByRole).trim() || undefined,
    createdByName: asString(r.createdByName).trim() || undefined,
    lastEditedByUserId: asString(r.lastEditedByUserId).trim() || undefined,
    lastEditedByRole: asString(r.lastEditedByRole).trim() || undefined,
    photoIds: parsePhotoIds(r.photoIds),
    deletedAt,
    deletedByUserId: asString(r.deletedByUserId).trim() || undefined,
    deletedByRole: asString(r.deletedByRole).trim() || undefined,
    editLock: parseEditLock(r.editLock),
    comments: parseComments(r.comments),
    placement,
    receptionDrawingId,
    sourceSketchId,
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

export function validateDrawingForSave(drawing: WmTechnicalDrawing): { ok: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!drawing.id?.trim()) missing.push("id");
  if (!drawing.title?.trim()) missing.push("title");
  if (!Array.isArray(drawing.objects)) missing.push("objects");
  return { ok: missing.length === 0, missing };
}

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

export { ROOM_LABEL_DEFAULT_FONT_SIZE, TEXT_DEFAULT_FONT_SIZE };
