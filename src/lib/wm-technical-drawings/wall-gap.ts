/** WM-RYSUNKI-01 P3A — wall gap render-time (MR-P3A-01 · D-P3A-18). */

export interface WallSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface DoorForGap {
  x: number;
  y: number;
  /** Szerokość otworu w world units; brak → defaultDoorWidth. */
  width?: number;
}

export interface WallGapInterval {
  /** Parametr wzdłuż ściany [0,1], t0 ≤ t1. */
  t0: number;
  t1: number;
}

export const WALL_DOOR_MAX_DIST_PX = 24;
export const DEFAULT_DOOR_GAP_WIDTH_PX = 36;

/** Projekcja punktu na odcinek; t clampowane do [0,1]. */
export function projectPointOnSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): { t: number; dist: number; qx: number; qy: number } {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-9) {
    const dist = Math.hypot(px - x1, py - y1);
    return { t: 0, dist, qx: x1, qy: y1 };
  }
  let t = ((px - x1) * dx + (py - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const qx = x1 + t * dx;
  const qy = y1 + t * dy;
  const dist = Math.hypot(px - qx, py - qy);
  return { t, dist, qx, qy };
}

function mergeIntervals(intervals: WallGapInterval[]): WallGapInterval[] {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a.t0 - b.t0 || a.t1 - b.t1);
  const out: WallGapInterval[] = [{ ...sorted[0]! }];
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i]!;
    const last = out[out.length - 1]!;
    if (cur.t0 <= last.t1 + 1e-9) {
      last.t1 = Math.max(last.t1, cur.t1);
    } else {
      out.push({ ...cur });
    }
  }
  return out;
}

/**
 * Luki wzdłuż ściany dla drzwi w progu odległości (render-time only).
 * Nie mutuje modelu · nie wpływa na snap.
 */
export function computeWallGaps(
  wall: WallSegment,
  doors: DoorForGap[],
  opts?: { maxDist?: number; defaultDoorWidth?: number },
): WallGapInterval[] {
  const maxDist = opts?.maxDist ?? WALL_DOOR_MAX_DIST_PX;
  const defaultW = opts?.defaultDoorWidth ?? DEFAULT_DOOR_GAP_WIDTH_PX;
  const len = Math.hypot(wall.x2 - wall.x1, wall.y2 - wall.y1);
  if (len < 1e-6) return [];

  const raw: WallGapInterval[] = [];
  for (const door of doors) {
    const { t, dist } = projectPointOnSegment(
      door.x,
      door.y,
      wall.x1,
      wall.y1,
      wall.x2,
      wall.y2,
    );
    if (dist > maxDist) continue;
    const half = Math.max(1, (door.width != null && door.width > 0 ? door.width : defaultW) / 2);
    const dt = half / len;
    raw.push({
      t0: Math.max(0, t - dt),
      t1: Math.min(1, t + dt),
    });
  }
  return mergeIntervals(raw);
}

/** Odcinki ściany po wycięciu luk (parametry → world). */
export function wallSegmentsAfterGaps(
  wall: WallSegment,
  gaps: WallGapInterval[],
): Array<{ x1: number; y1: number; x2: number; y2: number }> {
  const dx = wall.x2 - wall.x1;
  const dy = wall.y2 - wall.y1;
  const at = (t: number) => ({
    x: wall.x1 + t * dx,
    y: wall.y1 + t * dy,
  });
  if (gaps.length === 0) {
    return [{ x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 }];
  }
  const segs: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  let cursor = 0;
  for (const g of gaps) {
    if (g.t0 > cursor + 1e-9) {
      const a = at(cursor);
      const b = at(g.t0);
      segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    cursor = Math.max(cursor, g.t1);
  }
  if (cursor < 1 - 1e-9) {
    const a = at(cursor);
    const b = at(1);
    segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  }
  return segs;
}

/** Najbliższa ściana w progu (edytor: wymiar / hover drzwi). */
export function findNearestWall<T extends WallSegment & { id: string }>(
  walls: T[],
  px: number,
  py: number,
  maxDist = WALL_DOOR_MAX_DIST_PX,
): { wall: T; dist: number; t: number } | null {
  let best: { wall: T; dist: number; t: number } | null = null;
  for (const wall of walls) {
    const { t, dist } = projectPointOnSegment(px, py, wall.x1, wall.y1, wall.x2, wall.y2);
    if (dist > maxDist) continue;
    if (!best || dist < best.dist) best = { wall, dist, t };
  }
  return best;
}
