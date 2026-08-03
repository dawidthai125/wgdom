/** WM-RYSUNKI-01 P3B — live wall preview metrics (MR-P3B-04 · UI only). */

export interface WallPreviewMetrics {
  lengthPx: number;
  /** undefined gdy step niepoprawny */
  cells?: number;
  lengthLabel: string;
}

/**
 * Długość + opcjonalna liczba kratek — wyłącznie do Ghost label.
 * Nie zapisuje do JSON / wall / dimension.
 */
export function wallPreviewMetrics(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  step?: number,
): WallPreviewMetrics {
  const lengthPx = Math.hypot(x2 - x1, y2 - y1);
  const rounded = Math.round(lengthPx);
  let cells: number | undefined;
  let lengthLabel = `${rounded} px`;
  if (typeof step === "number" && step > 0 && Number.isFinite(step)) {
    const raw = lengthPx / step;
    cells = Math.abs(raw - Math.round(raw)) < 1e-6 ? Math.round(raw) : Math.round(raw * 10) / 10;
    lengthLabel = `${rounded} px · ≈${cells} krat.`;
  }
  return { lengthPx, cells, lengthLabel };
}

/** D-P3B-12 — reject zero-length wall. */
export function isWallPreviewTooShort(lengthPx: number, eps = 1): boolean {
  return !(lengthPx >= eps);
}
