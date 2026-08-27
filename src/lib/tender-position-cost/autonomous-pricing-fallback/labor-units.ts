/**
 * Slice 2 — LABOR-only unit gate for APF.
 * pomiar / prob are the initial supported measurement units.
 */

const LABOR_ONLY_UNITS = new Set([
  "pomiar",
  "prob",
  "prób",
  "prob.",
  "prób.",
]);

export function normalizeApfUnitToken(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/²/g, "2");
}

export function isApfLaborOnlyUnit(unitRaw: string): boolean {
  const u = normalizeApfUnitToken(unitRaw);
  return LABOR_ONLY_UNITS.has(u);
}

/**
 * Map APF labor units onto WgdomCostUnit used by Position Cost engine.
 * "pomiar" is not in the catalog enum — engine path uses "prob".
 */
export function mapApfLaborUnitToEngineUnit(unitRaw: string): string {
  const u = normalizeApfUnitToken(unitRaw);
  if (
    u === "pomiar" ||
    u === "prob" ||
    u === "prób" ||
    u === "prob." ||
    u === "prób."
  ) {
    return "prob";
  }
  return u;
}
