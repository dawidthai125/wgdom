/** WM-RYSUNKI-MOBILE-01 P0 — ephemeral zoom/pan clamp (nie JSON). */

export const DRAWING_ZOOM_MIN = 0.4;
export const DRAWING_ZOOM_MAX = 3;
export const DRAWING_ZOOM_STEP = 0.25;
export const DRAWING_ZOOM_DEFAULT = 1;

export function clampDrawingZoom(z: number): number {
  if (!Number.isFinite(z)) return DRAWING_ZOOM_DEFAULT;
  return Math.min(DRAWING_ZOOM_MAX, Math.max(DRAWING_ZOOM_MIN, z));
}

/** Soft pan bound — skala × baza (px ekranu). */
export function clampDrawingPan(pan: number, hostSizePx: number, scale: number): number {
  if (!Number.isFinite(pan)) return 0;
  const limit = Math.max(hostSizePx, 120) * Math.max(scale, 1) * 1.5;
  return Math.min(limit, Math.max(-limit, pan));
}

export function nextZoomIn(z: number): number {
  return clampDrawingZoom(z + DRAWING_ZOOM_STEP);
}

export function nextZoomOut(z: number): number {
  return clampDrawingZoom(z - DRAWING_ZOOM_STEP);
}
