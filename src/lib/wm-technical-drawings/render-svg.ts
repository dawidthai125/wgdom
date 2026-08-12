/** WM-RYSUNKI-01 P1+P3A — render SVG z modelu (SSOT → SVG → PDF → ZIP). */

import type {
  DrawingDoorObject,
  DrawingObject,
  DrawingWallObject,
  WmTechnicalDrawing,
} from "@/lib/wm-technical-drawings/types";
import {
  canonicalizeSegmentForDimensionOffset,
  dimensionAutoLabel,
  renderSymbol,
  renderSymbolAlongSegment,
} from "@/lib/wm-technical-drawings/symbols/render-symbol";
import { resolveDoorSymbolId } from "@/lib/wm-technical-drawings/symbols";
import {
  computeWallGaps,
  wallSegmentsAfterGaps,
} from "@/lib/wm-technical-drawings/wall-gap";

/** P3A: wall-gap = 3 · DIMENSIONS-RECTANGLE-UX-01 offset/font = 4. */
export const DRAWING_RENDER_VERSION = 4;

/** D-DIM-02 / D-DIM-04 — frozen Owner GO · D-LF-01/05. */
export const DRAWING_DIMENSION_FONT_SIZE = 14;
export const DRAWING_DIMENSION_NORMAL_OFFSET = 16;
/** D-LF-05 — UI / session allowlist. */
export const DRAWING_DIMENSION_FONT_SIZES = [12, 14, 18, 24] as const;
export type DrawingDimensionFontSize = (typeof DRAWING_DIMENSION_FONT_SIZES)[number];

/** Resolve label font — missing/invalid → 14 (D-LF-04). */
export function resolveDimensionFontSize(fontSize?: number): number {
  return Number.isFinite(fontSize) && (fontSize as number) > 0
    ? (fontSize as number)
    : DRAWING_DIMENSION_FONT_SIZE;
}

/**
 * D-LF-02 — extra offset beyond line (font-aware).
 * Clears half-glyph with dominant-baseline=middle; grows 12→24.
 */
export function dimensionLabelExtraOffset(fontSize?: number): number {
  const s = resolveDimensionFontSize(fontSize);
  return Math.ceil(s * 0.55 + 4);
}

/** Absolute label offset from wall mid along normal: 16 + f(fontSize). */
export function dimensionLabelOffset(fontSize?: number): number {
  return DRAWING_DIMENSION_NORMAL_OFFSET + dimensionLabelExtraOffset(fontSize);
}

export class DrawingRenderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DrawingRenderError";
  }
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderWallWithGaps(obj: DrawingWallObject, doors: DrawingDoorObject[]): string {
  const t = obj.thickness ?? 4;
  const gaps = computeWallGaps(
    { x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2 },
    doors.map((d) => ({ x: d.x, y: d.y, width: d.width })),
  );
  const segs = wallSegmentsAfterGaps(
    { x1: obj.x1, y1: obj.y1, x2: obj.x2, y2: obj.y2 },
    gaps,
  );
  const lines = segs
    .map(
      (s) =>
        `<line x1="${s.x1}" y1="${s.y1}" x2="${s.x2}" y2="${s.y2}" stroke="#1e293b" stroke-width="${t}" stroke-linecap="square" />`,
    )
    .join("");
  return `<g data-id="${esc(obj.id)}" data-wall="1">${lines}</g>`;
}

/** MR-P1-01: wall/text specjalizacja; symbole → renderSymbol. */
function renderObject(obj: DrawingObject, doors: DrawingDoorObject[]): string {
  if (obj.type === "wall") {
    return renderWallWithGaps(obj, doors);
  }
  if (obj.type === "text") {
    const size = obj.fontSize ?? 14;
    const content = esc(obj.content || "");
    /* bold only when explicit; omit font-weight when normal/missing (D-TEXT-10). */
    const weightAttr = obj.fontWeight === "bold" ? ' font-weight="bold"' : "";
    return `<text data-id="${esc(obj.id)}" x="${obj.x}" y="${obj.y}" font-size="${size}"${weightAttr} fill="#0f172a" font-family="system-ui,sans-serif">${content}</text>`;
  }
  if (obj.type === "door") {
    return renderSymbol({
      symbolId: resolveDoorSymbolId(obj.symbolId),
      x: obj.x,
      y: obj.y,
      rotationDeg: obj.rotation ?? 0,
      flipH: obj.flipH === true,
      width: obj.width,
      dataId: obj.id,
    });
  }
  if (obj.type === "window") {
    return renderSymbol({
      symbolId: obj.symbolId || "window-rect",
      x: obj.x,
      y: obj.y,
      rotationDeg: obj.rotation ?? 0,
      width: obj.width,
      dataId: obj.id,
    });
  }
  if (obj.type === "ventilation" || obj.type === "gas_boiler" || obj.type === "distribution_board") {
    const defaultSym =
      obj.type === "ventilation"
        ? "vent-grid"
        : obj.type === "gas_boiler"
          ? "gas-boiler"
          : "distribution-board";
    return renderSymbol({
      symbolId: obj.symbolId || defaultSym,
      x: obj.x,
      y: obj.y,
      rotationDeg: obj.rotation ?? 0,
      dataId: obj.id,
    });
  }
  if (obj.type === "arrow") {
    return renderSymbolAlongSegment({
      symbolId: obj.symbolId || "arrow-straight",
      x1: obj.x1,
      y1: obj.y1,
      x2: obj.x2,
      y2: obj.y2,
      dataId: obj.id,
    });
  }
  if (obj.type === "dimension") {
    /* MR-P3A-02: label z popup wygrywa nad auto px. */
    const label =
      obj.label != null && String(obj.label).trim() !== ""
        ? String(obj.label).trim()
        : dimensionAutoLabel(obj.x1, obj.y1, obj.x2, obj.y2);
    const can = canonicalizeSegmentForDimensionOffset({
      x1: obj.x1,
      y1: obj.y1,
      x2: obj.x2,
      y2: obj.y2,
    });
    /* D-LF-01 — line ONLY at normalOffset 16. */
    const lineOff = DRAWING_DIMENSION_NORMAL_OFFSET;
    const fontSize = resolveDimensionFontSize(obj.fontSize);
    /* D-LF-02 — label further along same normal: 16 + f(fontSize). */
    const labelOff = dimensionLabelOffset(fontSize);
    const body = renderSymbolAlongSegment({
      symbolId: obj.symbolId || "dimension-line",
      x1: can.x1,
      y1: can.y1,
      x2: can.x2,
      y2: can.y2,
      normalOffset: lineOff,
    });
    const lx = can.mx + can.nx * labelOff;
    const ly = can.my + can.ny * labelOff;
    /* Vertical (|dx|<|dy| after canonicalize): label rotate EXACTLY -90° about (lx,ly). */
    const isVertical = Math.abs(can.x2 - can.x1) < Math.abs(can.y2 - can.y1);
    const rotateAttr = isVertical ? ` transform="rotate(-90 ${lx} ${ly})"` : "";
    const labelSvg =
      `<text data-dim-label="1" x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="middle"${rotateAttr} ` +
      `font-size="${fontSize}" fill="#334155" font-family="system-ui,sans-serif">${esc(label)}</text>`;
    return `<g data-id="${esc(obj.id)}">${body}${labelSvg}</g>`;
  }
  /* P4 punkty — skip */
  return "";
}

function renderGrid(width: number, height: number, step: number): string {
  const lines: string[] = [];
  for (let x = 0; x <= width; x += step) {
    lines.push(`<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="#e2e8f0" stroke-width="1" />`);
  }
  for (let y = 0; y <= height; y += step) {
    lines.push(`<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#e2e8f0" stroke-width="1" />`);
  }
  return `<g data-grid="1">${lines.join("")}</g>`;
}

/** MR-P3B-05 — Ghost stroke (≠ wall #1e293b · ≠ door hover #38bdf8). */
export const DRAWING_GHOST_WALL_STROKE = "#f59e0b";

export interface PreviewWallOption {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** UI-only label (px / kratki) — nie z modelu. */
  lengthLabel?: string;
}

/** DIMENSIONS-RECTANGLE-UX-01 — Ghost prostokąt (edit-only). */
export interface PreviewRectangleOption {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** D-M1-02 / DFC-P1-01 — default export = fail-safe (PDF/ZIP). */
export type DrawingRenderMode = "edit" | "export";

/** D-M1-01 / D-M1-08 — pad hit w SVG user units (nie px ekranu). */
export const DRAWING_HIT_LINE_WIDTH_SVG = 24;
export const DRAWING_HIT_POINT_RADIUS_SVG = 22;

export interface RenderDrawingSvgOptions {
  showGrid?: boolean;
  /**
   * D-M1-02 — hit overlays tylko `"edit"`.
   * Default / omit / `"export"` = bez hit (PDF/ZIP safe).
   */
  mode?: DrawingRenderMode;
  /** D-P3A-22 — podświetlenie ściany (tylko preview edytora). */
  highlightWallId?: string | null;
  /** D-P3B-01 — Ghost Line ściany (tylko edytor · PDF/ZIP OUT). */
  previewWall?: PreviewWallOption | null;
  /** Ghost prostokąt (tylko edytor · PDF/ZIP OUT). */
  previewRectangle?: PreviewRectangleOption | null;
  /** Edit-only: dimension endpoint handles when this id is selected. */
  selectedObjectId?: string | null;
}

export const DRAWING_DIM_HANDLE_RADIUS_SVG = 10;

function renderEditHitOverlays(
  objects: DrawingObject[],
  selectedObjectId?: string | null,
): string {
  const parts: string[] = [];
  for (const obj of objects) {
    const id = esc(obj.id);
    if (obj.type === "wall" || obj.type === "dimension" || obj.type === "arrow") {
      parts.push(
        `<line data-id="${id}" data-hit="1" x1="${obj.x1}" y1="${obj.y1}" x2="${obj.x2}" y2="${obj.y2}" ` +
          `stroke="transparent" stroke-width="${DRAWING_HIT_LINE_WIDTH_SVG}" stroke-linecap="round" ` +
          `pointer-events="stroke" />`,
      );
      if (
        obj.type === "dimension" &&
        selectedObjectId &&
        obj.id === selectedObjectId
      ) {
        const r = DRAWING_DIM_HANDLE_RADIUS_SVG;
        parts.push(
          `<circle data-id="${id}" data-dim-handle="start" cx="${obj.x1}" cy="${obj.y1}" r="${r}" ` +
            `fill="#38bdf8" fill-opacity="0.85" stroke="#0ea5e9" stroke-width="1.5" pointer-events="all" />`,
        );
        parts.push(
          `<circle data-id="${id}" data-dim-handle="end" cx="${obj.x2}" cy="${obj.y2}" r="${r}" ` +
            `fill="#38bdf8" fill-opacity="0.85" stroke="#0ea5e9" stroke-width="1.5" pointer-events="all" />`,
        );
      }
      continue;
    }
    if (
      obj.type === "text" ||
      obj.type === "door" ||
      obj.type === "window" ||
      obj.type === "ventilation" ||
      obj.type === "gas_boiler" ||
      obj.type === "distribution_board"
    ) {
      parts.push(
        `<circle data-id="${id}" data-hit="1" cx="${obj.x}" cy="${obj.y}" r="${DRAWING_HIT_POINT_RADIUS_SVG}" ` +
          `fill="transparent" pointer-events="all" />`,
      );
    }
  }
  if (!parts.length) return "";
  return `<g data-hit-layer="1">${parts.join("")}</g>`;
}

function renderGhostWall(preview: PreviewWallOption): string {
  const mx = (preview.x1 + preview.x2) / 2;
  const my = (preview.y1 + preview.y2) / 2;
  const line =
    `<line data-ghost-wall="1" x1="${preview.x1}" y1="${preview.y1}" x2="${preview.x2}" y2="${preview.y2}" ` +
    `stroke="${DRAWING_GHOST_WALL_STROKE}" stroke-width="3" stroke-opacity="0.9" ` +
    `stroke-dasharray="6 4" stroke-linecap="round" />`;
  const label =
    preview.lengthLabel != null && String(preview.lengthLabel).trim() !== ""
      ? `<text data-ghost-label="1" x="${mx}" y="${my - 10}" text-anchor="middle" font-size="11" ` +
        `fill="${DRAWING_GHOST_WALL_STROKE}" font-family="system-ui,sans-serif">${esc(String(preview.lengthLabel).trim())}</text>`
      : "";
  return `<g data-ghost-wall-group="1">${line}${label}</g>`;
}

function renderGhostRectangle(preview: PreviewRectangleOption): string {
  const x1 = preview.x1;
  const y1 = preview.y1;
  const x2 = preview.x2;
  const y2 = preview.y2;
  const mk = (a: number, b: number, c: number, d: number) =>
    `<line x1="${a}" y1="${b}" x2="${c}" y2="${d}" stroke="${DRAWING_GHOST_WALL_STROKE}" ` +
    `stroke-width="3" stroke-opacity="0.9" stroke-dasharray="6 4" stroke-linecap="round" />`;
  return (
    `<g data-ghost-rectangle="1">` +
    mk(x1, y1, x2, y1) +
    mk(x2, y1, x2, y2) +
    mk(x2, y2, x1, y2) +
    mk(x1, y2, x1, y1) +
    `</g>`
  );
}

export function renderDrawingSvg(
  drawing: WmTechnicalDrawing,
  options: RenderDrawingSvgOptions = {},
): string {
  const w = drawing.page.width;
  const h = drawing.page.height;
  if (!(w > 0 && h > 0)) {
    throw new DrawingRenderError("Invalid page size");
  }
  /* DFC-P1-01 — anything other than explicit "edit" ⇒ export (no hits). */
  const isEdit = options.mode === "edit";
  const showGrid = options.showGrid === true && drawing.grid.enabled;
  const gridSvg = showGrid ? renderGrid(w, h, Math.max(1, drawing.grid.step)) : "";
  const doors = drawing.objects.filter((o): o is DrawingDoorObject => o.type === "door");
  const body = drawing.objects.map((obj) => renderObject(obj, doors)).filter(Boolean).join("");
  let highlight = "";
  if (isEdit && options.highlightWallId) {
    const wall = drawing.objects.find(
      (o): o is DrawingWallObject => o.type === "wall" && o.id === options.highlightWallId,
    );
    if (wall) {
      highlight =
        `<line data-wall-hover="1" x1="${wall.x1}" y1="${wall.y1}" x2="${wall.x2}" y2="${wall.y2}" ` +
        `stroke="#38bdf8" stroke-width="${(wall.thickness ?? 4) + 6}" stroke-opacity="0.35" stroke-linecap="square" />`;
    }
  }
  const ghost =
    isEdit && options.previewWall != null ? renderGhostWall(options.previewWall) : "";
  const ghostRect =
    isEdit && options.previewRectangle != null
      ? renderGhostRectangle(options.previewRectangle)
      : "";
  const hits = isEdit ? renderEditHitOverlays(drawing.objects, options.selectedObjectId) : "";
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" data-render-version="${DRAWING_RENDER_VERSION}" data-render-mode="${isEdit ? "edit" : "export"}">` +
    `<rect width="100%" height="100%" fill="#ffffff"/>` +
    gridSvg +
    `<g data-objects="1">${highlight}${body}${ghost}${ghostRect}</g>` +
    hits +
    `</svg>`
  );
}
