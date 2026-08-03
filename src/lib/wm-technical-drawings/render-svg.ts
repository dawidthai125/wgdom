/** WM-RYSUNKI-01 P1 — render SVG z modelu (SSOT → SVG). AC-P1-08. */

import type { DrawingObject, WmTechnicalDrawing } from "@/lib/wm-technical-drawings/types";
import {
  dimensionAutoLabel,
  renderSymbol,
  renderSymbolAlongSegment,
} from "@/lib/wm-technical-drawings/symbols/render-symbol";

export const DRAWING_RENDER_VERSION = 2;

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

/** MR-P1-01: wall/text specjalizacja; symbole → renderSymbol. */
function renderObject(obj: DrawingObject): string {
  if (obj.type === "wall") {
    const t = obj.thickness ?? 4;
    return `<line data-id="${esc(obj.id)}" x1="${obj.x1}" y1="${obj.y1}" x2="${obj.x2}" y2="${obj.y2}" stroke="#1e293b" stroke-width="${t}" stroke-linecap="square" />`;
  }
  if (obj.type === "text") {
    const size = obj.fontSize ?? 14;
    const content = esc(obj.content || "");
    return `<text data-id="${esc(obj.id)}" x="${obj.x}" y="${obj.y}" font-size="${size}" fill="#0f172a" font-family="system-ui,sans-serif">${content}</text>`;
  }
  if (obj.type === "door") {
    return renderSymbol({
      symbolId: obj.symbolId || "door-swing",
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
  if (obj.type === "ventilation" || obj.type === "gas_boiler") {
    return renderSymbol({
      symbolId: obj.symbolId || (obj.type === "ventilation" ? "vent-grid" : "gas-boiler"),
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
    const label =
      obj.label != null && String(obj.label).trim() !== ""
        ? String(obj.label).trim()
        : dimensionAutoLabel(obj.x1, obj.y1, obj.x2, obj.y2);
    const body = renderSymbolAlongSegment({
      symbolId: obj.symbolId || "dimension-line",
      x1: obj.x1,
      y1: obj.y1,
      x2: obj.x2,
      y2: obj.y2,
    });
    const mx = (obj.x1 + obj.x2) / 2;
    const my = (obj.y1 + obj.y2) / 2;
    const labelSvg = `<text data-dim-label="1" x="${mx}" y="${my - 10}" text-anchor="middle" font-size="11" fill="#334155" font-family="system-ui,sans-serif">${esc(label)}</text>`;
    return `<g data-id="${esc(obj.id)}">${body}${labelSvg}</g>`;
  }
  /* P4 — skip */
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

export interface RenderDrawingSvgOptions {
  showGrid?: boolean;
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
  const showGrid = options.showGrid === true && drawing.grid.enabled;
  const gridSvg = showGrid ? renderGrid(w, h, Math.max(1, drawing.grid.step)) : "";
  const body = drawing.objects.map(renderObject).filter(Boolean).join("");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" data-render-version="${DRAWING_RENDER_VERSION}">` +
    `<rect width="100%" height="100%" fill="#ffffff"/>` +
    gridSvg +
    `<g data-objects="1">${body}</g>` +
    `</svg>`
  );
}
