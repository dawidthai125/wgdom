/** WM-RYSUNKI-01 P0 — render SVG z modelu (SSOT → SVG). Grid tylko w trybie edytora. */

import type { DrawingObject, WmTechnicalDrawing } from "@/lib/wm-technical-drawings/types";

export const DRAWING_RENDER_VERSION = 1;

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
  /* P0: passthrough types — niewidoczne w edytorze (P1+) */
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
  /** Siatka edytora — NIE na PDF (P2). */
  showGrid?: boolean;
}

/**
 * Buduje SVG string. MR-06: wywołujący powinien memoizować wynik
 * (nie rebuild na każdym pointermove — tylko po commit geometrii).
 */
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
