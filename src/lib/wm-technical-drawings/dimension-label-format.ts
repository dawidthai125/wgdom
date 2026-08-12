/** WM-RYSUNKI-DIMENSIONS-RECTANGLE-UX-01 — presentation cm/m (Owner label only). */

export type DimensionUnit = "cm" | "m";

export const DIMENSION_CM_MIN = 1;
export const DIMENSION_CM_MAX = 99999;
export const DIMENSION_M_MIN = 0.01;
export const DIMENSION_M_MAX = 999;

/** Parse Owner input: comma or dot → number. */
export function parseDimensionNumericInput(raw: string): number | null {
  const s = String(raw ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (!s) return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** Polish decimal comma for display (no unit). */
export function formatDimensionNumberPl(n: number, unit: DimensionUnit): string {
  if (unit === "m") {
    if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
    return n.toFixed(2).replace(".", ",");
  }
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return String(n).replace(".", ",");
}

export function formatDimensionOwnerLabel(n: number, unit: DimensionUnit): string {
  return `${formatDimensionNumberPl(n, unit)} ${unit}`;
}

export type DimensionLabelFormatResult =
  | { ok: true; label: string; value: number }
  | { ok: false; reason: "empty" | "nonnumeric" | "out_of_range" };

/**
 * Session unit + Owner input → label string.
 * ZERO cm↔m conversion · ZERO geometry.
 */
export function buildDimensionOwnerLabel(
  raw: string,
  unit: DimensionUnit,
): DimensionLabelFormatResult {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return { ok: false, reason: "empty" };
  const n = parseDimensionNumericInput(trimmed);
  if (n == null) return { ok: false, reason: "nonnumeric" };
  if (unit === "cm") {
    if (!(n >= DIMENSION_CM_MIN && n <= DIMENSION_CM_MAX)) {
      return { ok: false, reason: "out_of_range" };
    }
  } else if (!(n >= DIMENSION_M_MIN && n <= DIMENSION_M_MAX)) {
    return { ok: false, reason: "out_of_range" };
  }
  return { ok: true, label: formatDimensionOwnerLabel(n, unit), value: n };
}
