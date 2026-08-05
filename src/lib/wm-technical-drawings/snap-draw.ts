/** WM-WORKER-SKETCH-01 P1 — draw snap pipeline (UI input only · ZERO schema). */

import { snapCoord } from "@/lib/wm-technical-drawings/normalize";

/** FROZEN P1: 0° / 45° / 90° / 135° / 180° (+ symetria via round). */
export const DRAW_ANGLE_SNAP_DEG = 45;

export const DRAW_ENDPOINT_EPS_PX = 14;

export type DrawSnapPoint = { x: number; y: number };

export function collectWallEndpoints(
  objects: ReadonlyArray<{ type: string; x1?: number; y1?: number; x2?: number; y2?: number }>,
): DrawSnapPoint[] {
  const out: DrawSnapPoint[] = [];
  for (const o of objects) {
    if (o.type !== "wall") continue;
    if (typeof o.x1 === "number" && typeof o.y1 === "number") out.push({ x: o.x1, y: o.y1 });
    if (typeof o.x2 === "number" && typeof o.y2 === "number") out.push({ x: o.x2, y: o.y2 });
  }
  return out;
}

/** Najbliższy endpoint w ε; null gdy brak. */
export function snapToNearestEndpoint(
  point: DrawSnapPoint,
  endpoints: ReadonlyArray<DrawSnapPoint>,
  epsPx = DRAW_ENDPOINT_EPS_PX,
): DrawSnapPoint | null {
  if (!(epsPx > 0) || endpoints.length === 0) return null;
  let best: DrawSnapPoint | null = null;
  let bestDist = epsPx;
  for (const ep of endpoints) {
    const d = Math.hypot(point.x - ep.x, point.y - ep.y);
    if (d <= bestDist) {
      bestDist = d;
      best = ep;
    }
  }
  return best;
}

/** Przyciągnij punkt końcowy do najbliższego kąta względem origin (zachowaj długość). */
export function snapAnglePoint(
  origin: DrawSnapPoint,
  point: DrawSnapPoint,
  enabled: boolean,
  stepDeg = DRAW_ANGLE_SNAP_DEG,
): DrawSnapPoint {
  if (!enabled || !(stepDeg > 0)) return point;
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return point;
  const ang = Math.atan2(dy, dx);
  const step = (stepDeg * Math.PI) / 180;
  const snapped = Math.round(ang / step) * step;
  return {
    x: origin.x + Math.cos(snapped) * len,
    y: origin.y + Math.sin(snapped) * len,
  };
}

export type SnapDrawOptions = {
  snapEnabled: boolean;
  step: number;
  endpoints: ReadonlyArray<DrawSnapPoint>;
  endpointEpsPx?: number;
  angleStepDeg?: number;
};

/**
 * Start linii: Endpoint → Grid (kąt bez origin).
 * Gdy snap OFF → raw.
 */
export function snapDrawStart(raw: DrawSnapPoint, opts: SnapDrawOptions): DrawSnapPoint {
  if (!opts.snapEnabled) return raw;
  const ep = snapToNearestEndpoint(raw, opts.endpoints, opts.endpointEpsPx ?? DRAW_ENDPOINT_EPS_PX);
  if (ep) return ep;
  const step = opts.step > 0 ? opts.step : 10;
  return {
    x: snapCoord(raw.x, step, true),
    y: snapCoord(raw.y, step, true),
  };
}

/**
 * Koniec linii: Endpoint → Angle → Grid (DF P1).
 * Gdy snap OFF → raw.
 */
export function snapDrawEnd(
  raw: DrawSnapPoint,
  origin: DrawSnapPoint,
  opts: SnapDrawOptions,
): DrawSnapPoint {
  if (!opts.snapEnabled) return raw;
  const ep = snapToNearestEndpoint(raw, opts.endpoints, opts.endpointEpsPx ?? DRAW_ENDPOINT_EPS_PX);
  if (ep) return ep;
  const angled = snapAnglePoint(origin, raw, true, opts.angleStepDeg ?? DRAW_ANGLE_SNAP_DEG);
  const step = opts.step > 0 ? opts.step : 10;
  return {
    x: snapCoord(angled.x, step, true),
    y: snapCoord(angled.y, step, true),
  };
}
