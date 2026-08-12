/** WM-RYSUNKI-DIMENSIONS-RECTANGLE-UX-01 — prostokąt jako 4× Wall (ZERO type rectangle). */

import type { DrawingWallObject } from "@/lib/wm-technical-drawings/types";

export const RECTANGLE_WALL_EPS = 1;

export function isRectangleAreaTooSmall(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  eps = RECTANGLE_WALL_EPS,
): boolean {
  return Math.abs(x2 - x1) < eps || Math.abs(y2 - y1) < eps;
}

/**
 * Desktop Shift → kwadrat: side = max(|w|,|h|), zachowaj znaki drag.
 */
export function applyRectangleSquareConstraint(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  const sx = dx < 0 ? -1 : 1;
  const sy = dy < 0 ? -1 : 1;
  return {
    x1,
    y1,
    x2: x1 + sx * side,
    y2: y1 + sy * side,
  };
}

/** A→B→C→D→A jako 4 DrawingWallObject. */
export function buildRectangleWalls(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): DrawingWallObject[] {
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
