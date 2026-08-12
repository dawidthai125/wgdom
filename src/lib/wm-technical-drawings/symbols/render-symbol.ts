/** WM-RYSUNKI-01 P1 — renderSymbol + transform (AC-P1-08 · MR-P1-05). */

import { getSymbolDef, type SymbolDef } from "@/lib/wm-technical-drawings/symbols";

export interface RenderSymbolProps {
  symbolId: string;
  /** Środek / origin w world coords (stamp). */
  x: number;
  y: number;
  rotationDeg?: number;
  flipH?: boolean;
  /** Skala względem defaultWidth (opcjonalnie). */
  width?: number;
  dataId?: string;
}

/**
 * MR-P1-05: translate(origin) → rotate → scale(flipH ? -1 : 1, 1)
 * Origin = środek symbolu w world space.
 */
export function symbolTransformAttr(
  x: number,
  y: number,
  rotationDeg: number,
  flipH: boolean,
  scaleX: number,
  scaleY: number,
): string {
  const parts = [`translate(${x} ${y})`];
  if (rotationDeg) parts.push(`rotate(${rotationDeg})`);
  const sx = (flipH ? -1 : 1) * scaleX;
  const sy = scaleY;
  if (sx !== 1 || sy !== 1) parts.push(`scale(${sx} ${sy})`);
  return parts.join(" ");
}

function escAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/**
 * Jedyny pipeline symboli (AC-P1-08):
 * renderSymbol → SVG → transform → (selection data-id) → drag w editorze.
 */
export function renderSymbol(props: RenderSymbolProps): string {
  const def: SymbolDef = getSymbolDef(props.symbolId);
  const rot = props.rotationDeg ?? 0;
  const flipH = props.flipH === true;
  const targetW = props.width != null && props.width > 0 ? props.width : def.defaultWidth;
  const scaleX = targetW / def.defaultWidth;
  const scaleY = scaleX;
  /* Offset: rysuj lokalnie wokół (0,0) = środek viewBox */
  const ox = -def.viewBox.w / 2;
  const oy = -def.viewBox.h / 2;
  const transform = symbolTransformAttr(props.x, props.y, rot, flipH, scaleX, scaleY);
  const idAttr = props.dataId ? ` data-id="${escAttr(props.dataId)}"` : "";
  return (
    `<g${idAttr} data-symbol="${escAttr(def.symbolId)}" transform="${transform}">` +
    `<g transform="translate(${ox} ${oy})">${def.paths}</g>` +
    `</g>`
  );
}

/** Strzałka / wymiar: orientacja z odcinka (długość → scaleX). */
export function renderSymbolAlongSegment(opts: {
  symbolId: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  dataId?: string;
  /** Dodatkowy offset wzdłuż normalnej (wymiar). */
  normalOffset?: number;
}): string {
  const def = getSymbolDef(opts.symbolId);
  const dx = opts.x2 - opts.x1;
  const dy = opts.y2 - opts.y1;
  const len = Math.hypot(dx, dy) || 1;
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  const mx = (opts.x1 + opts.x2) / 2;
  const my = (opts.y1 + opts.y2) / 2;
  let ox = mx;
  let oy = my;
  if (opts.normalOffset) {
    const nx = -dy / len;
    const ny = dx / len;
    ox += nx * opts.normalOffset;
    oy += ny * opts.normalOffset;
  }
  const scaleX = len / def.defaultWidth;
  const scaleY = 1;
  const transform = symbolTransformAttr(ox, oy, angle, false, scaleX, scaleY);
  const idAttr = opts.dataId ? ` data-id="${escAttr(opts.dataId)}"` : "";
  const lox = -def.viewBox.w / 2;
  const loy = -def.viewBox.h / 2;
  return (
    `<g${idAttr} data-symbol="${escAttr(def.symbolId)}" transform="${transform}">` +
    `<g transform="translate(${lox} ${loy})">${def.paths}</g>` +
    `</g>`
  );
}

export function dimensionAutoLabel(x1: number, y1: number, x2: number, y2: number): string {
  return String(Math.round(Math.hypot(x2 - x1, y2 - y1)));
}

export interface DimensionSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/**
 * WM-RYSUNKI-DIMENSIONS-RECTANGLE-UX-01 D-DIM-03
 * Render-only canonicalize — NIE mutuje JSON.
 * |dx| >= |dy| → x1 <= x2; else y1 <= y2.
 * Normal LEFT-OF-TRAVEL: nx=-dy/len, ny=dx/len.
 */
export function canonicalizeSegmentForDimensionOffset(seg: DimensionSegment): {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  mx: number;
  my: number;
  nx: number;
  ny: number;
  len: number;
} {
  let { x1, y1, x2, y2 } = seg;
  const dx0 = x2 - x1;
  const dy0 = y2 - y1;
  if (Math.abs(dx0) >= Math.abs(dy0)) {
    if (x1 > x2) {
      x1 = seg.x2;
      y1 = seg.y2;
      x2 = seg.x1;
      y2 = seg.y1;
    }
  } else if (y1 > y2) {
    x1 = seg.x2;
    y1 = seg.y2;
    x2 = seg.x1;
    y2 = seg.y1;
  }
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  return {
    x1,
    y1,
    x2,
    y2,
    mx: (x1 + x2) / 2,
    my: (y1 + y2) / 2,
    nx,
    ny,
    len,
  };
}
