/**
 * WM-RYSUNKI-DIMENSION-RANGE-JOB-EXPORT-UX-01 — constrained dimension endpoint drag.
 * Pure geometry · ZERO schema · ZERO wallRefId.
 */

import { DRAW_ENDPOINT_EPS_PX, collectWallEndpoints } from "@/lib/wm-technical-drawings/snap-draw";

export type DimensionEndpointWhich = "start" | "end";

export interface DimensionSegmentCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface WallSegmentCoords {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

/** Distance of point to infinite line through a→b. */
export function pointLineDistance(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy) || 1;
  return Math.abs(dy * px - dx * py + bx * ay - by * ax) / len;
}

export function areSegmentsCollinear(
  a: DimensionSegmentCoords,
  b: WallSegmentCoords,
  eps = 2,
): boolean {
  const d1 = pointLineDistance(b.x1, b.y1, a.x1, a.y1, a.x2, a.y2);
  const d2 = pointLineDistance(b.x2, b.y2, a.x1, a.y1, a.x2, a.y2);
  if (d1 > eps || d2 > eps) return false;
  const adx = a.x2 - a.x1;
  const ady = a.y2 - a.y1;
  const bdx = b.x2 - b.x1;
  const bdy = b.y2 - b.y1;
  const al = Math.hypot(adx, ady) || 1;
  const bl = Math.hypot(bdx, bdy) || 1;
  /* Parallel / anti-parallel (same direction axis). */
  const cross = Math.abs(adx * bdy - ady * bdx) / (al * bl);
  return cross < 0.08;
}

function pointsNear(ax: number, ay: number, bx: number, by: number, eps: number): boolean {
  return Math.hypot(ax - bx, ay - by) <= eps;
}

/** Collinear walls connected by shared endpoints (continuous chain). */
export function collectCollinearContinuousWalls(
  seed: DimensionSegmentCoords,
  walls: ReadonlyArray<WallSegmentCoords>,
  eps = 2,
): WallSegmentCoords[] {
  const collinear = walls.filter((w) => areSegmentsCollinear(seed, w, eps));
  if (!collinear.length) return [];

  /* Seed walls: those overlapping / near either seed endpoint. */
  const seedWalls = collinear.filter(
    (w) =>
      pointsNear(w.x1, w.y1, seed.x1, seed.y1, eps * 2) ||
      pointsNear(w.x2, w.y2, seed.x1, seed.y1, eps * 2) ||
      pointsNear(w.x1, w.y1, seed.x2, seed.y2, eps * 2) ||
      pointsNear(w.x2, w.y2, seed.x2, seed.y2, eps * 2) ||
      pointLineDistance((seed.x1 + seed.x2) / 2, (seed.y1 + seed.y2) / 2, w.x1, w.y1, w.x2, w.y2) <=
        eps,
  );
  const startSet = seedWalls.length ? seedWalls : collinear.slice(0, 1);

  const used = new Set<number>();
  const queue: number[] = [];
  for (let i = 0; i < collinear.length; i++) {
    if (startSet.includes(collinear[i])) {
      used.add(i);
      queue.push(i);
    }
  }
  while (queue.length) {
    const i = queue.shift()!;
    const a = collinear[i];
    for (let j = 0; j < collinear.length; j++) {
      if (used.has(j)) continue;
      const b = collinear[j];
      const connected =
        pointsNear(a.x1, a.y1, b.x1, b.y1, eps * 2) ||
        pointsNear(a.x1, a.y1, b.x2, b.y2, eps * 2) ||
        pointsNear(a.x2, a.y2, b.x1, b.y1, eps * 2) ||
        pointsNear(a.x2, a.y2, b.x2, b.y2, eps * 2);
      if (connected) {
        used.add(j);
        queue.push(j);
      }
    }
  }
  return [...used].map((i) => collinear[i]);
}

function projectOntoAxis(
  px: number,
  py: number,
  ox: number,
  oy: number,
  ux: number,
  uy: number,
): { x: number; y: number; t: number } {
  const t = (px - ox) * ux + (py - oy) * uy;
  return { x: ox + t * ux, y: oy + t * uy, t };
}

const MIN_DIM_LEN = 4;

/**
 * Constrain endpoint drag to collinear continuous wall geometry.
 * Returns new coords or null if rejected (unrelated geometry / too short).
 */
export function constrainDimensionEndpointDrag(input: {
  dim: DimensionSegmentCoords;
  which: DimensionEndpointWhich;
  pointer: { x: number; y: number };
  walls: ReadonlyArray<WallSegmentCoords>;
  endpointEps?: number;
  collinearEps?: number;
}): DimensionSegmentCoords | null {
  const { dim, which, pointer } = input;
  const endpointEps = input.endpointEps ?? DRAW_ENDPOINT_EPS_PX;
  const collinearEps = input.collinearEps ?? 2;

  const dx0 = dim.x2 - dim.x1;
  const dy0 = dim.y2 - dim.y1;
  const len0 = Math.hypot(dx0, dy0);
  if (!(len0 > 0)) return null;
  const ux = dx0 / len0;
  const uy = dy0 / len0;

  const fixed =
    which === "start"
      ? { x: dim.x2, y: dim.y2 }
      : { x: dim.x1, y: dim.y1 };

  const chain = collectCollinearContinuousWalls(dim, input.walls, collinearEps);
  if (!chain.length) return null;

  /* Allowed t along axis from fixed point using chain endpoint projections. */
  const axisOrigin = { x: dim.x1, y: dim.y1 };
  let tMin = Infinity;
  let tMax = -Infinity;
  for (const w of chain) {
    for (const p of [
      { x: w.x1, y: w.y1 },
      { x: w.x2, y: w.y2 },
    ]) {
      const pr = projectOntoAxis(p.x, p.y, axisOrigin.x, axisOrigin.y, ux, uy);
      if (pointLineDistance(p.x, p.y, dim.x1, dim.y1, dim.x2, dim.y2) <= collinearEps * 2) {
        tMin = Math.min(tMin, pr.t);
        tMax = Math.max(tMax, pr.t);
      }
    }
  }
  if (!(tMax > tMin)) return null;

  let cand = projectOntoAxis(pointer.x, pointer.y, axisOrigin.x, axisOrigin.y, ux, uy);

  /* Snap to collinear wall endpoints (chain only). */
  const snapPts = collectWallEndpoints(chain.map((w) => ({ type: "wall", ...w })));
  let bestSnap: { x: number; y: number } | null = null;
  let bestD = endpointEps;
  for (const ep of snapPts) {
    if (pointLineDistance(ep.x, ep.y, dim.x1, dim.y1, dim.x2, dim.y2) > collinearEps * 2) continue;
    const d = Math.hypot(ep.x - cand.x, ep.y - cand.y);
    if (d <= bestD) {
      bestD = d;
      bestSnap = ep;
    }
  }
  if (bestSnap) {
    cand = projectOntoAxis(bestSnap.x, bestSnap.y, axisOrigin.x, axisOrigin.y, ux, uy);
  }

  /* Clamp to continuous chain span. */
  const tClamped = Math.min(tMax, Math.max(tMin, cand.t));
  cand = { x: axisOrigin.x + tClamped * ux, y: axisOrigin.y + tClamped * uy, t: tClamped };

  /* Must stay on chain (near some wall segment). */
  let onChain = false;
  for (const w of chain) {
    const midOk =
      pointLineDistance(cand.x, cand.y, w.x1, w.y1, w.x2, w.y2) <= collinearEps * 2;
    if (!midOk) continue;
    const wx = w.x2 - w.x1;
    const wy = w.y2 - w.y1;
    const wl = Math.hypot(wx, wy) || 1;
    const tt = ((cand.x - w.x1) * wx + (cand.y - w.y1) * wy) / (wl * wl);
    if (tt >= -0.05 && tt <= 1.05) {
      onChain = true;
      break;
    }
  }
  if (!onChain) return null;

  let next: DimensionSegmentCoords =
    which === "start"
      ? { x1: cand.x, y1: cand.y, x2: fixed.x, y2: fixed.y }
      : { x1: fixed.x, y1: fixed.y, x2: cand.x, y2: cand.y };

  const nlen = Math.hypot(next.x2 - next.x1, next.y2 - next.y1);
  if (nlen < MIN_DIM_LEN) return null;

  /* Preserve direction sense (same direction as original). */
  const ndx = next.x2 - next.x1;
  const ndy = next.y2 - next.y1;
  if (ndx * dx0 + ndy * dy0 < 0) {
    next = { x1: next.x2, y1: next.y2, x2: next.x1, y2: next.y1 };
  }

  return next;
}

/** Reject free-canvas / unrelated geometry helper for tests. */
export function isPointerOnCollinearChain(
  dim: DimensionSegmentCoords,
  pointer: { x: number; y: number },
  walls: ReadonlyArray<WallSegmentCoords>,
  eps = 2,
): boolean {
  const chain = collectCollinearContinuousWalls(dim, walls, eps);
  if (!chain.length) return false;
  for (const w of chain) {
    if (pointLineDistance(pointer.x, pointer.y, w.x1, w.y1, w.x2, w.y2) <= eps * 3) {
      return true;
    }
  }
  return false;
}
