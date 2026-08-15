/**
 * P5.16-B — explicit MATERIAL_SUPPLY allowlist (Owner-approved).
 *
 * Work Quotes on catalogWorkId → SELL → material-only Position Cost.
 * NEVER invent mat.* / TechnologyPack / BOM.
 * NEVER infer from plane alone — only explicit IDs (or extra override).
 */

/** Owner GO P5.16-B — first allowlisted material-supply work. */
export const OWNER_APPROVED_MATERIAL_SUPPLY_WORK_IDS: ReadonlySet<string> = new Set([
  "cc-p0c-w1-zawor-odpowietrzajacy",
]);

export type MaterialSupplyClassifyOpts = {
  /** Extra Owner-approved IDs for this run (tests only). */
  extraMaterialSupplyWorkIds?: ReadonlySet<string> | readonly string[] | null;
};

function toSet(
  extra: MaterialSupplyClassifyOpts["extraMaterialSupplyWorkIds"],
): ReadonlySet<string> | null {
  if (!extra) return null;
  if (extra instanceof Set) return extra;
  return new Set(
    [...extra].map((x) => String(x ?? "").trim()).filter(Boolean),
  );
}

/**
 * Jawna klasyfikacja MATERIAL_SUPPLY — NEVER derived from missing mat.* / BOM alone.
 */
export function isExplicitMaterialSupplyWork(
  workId: string,
  opts?: MaterialSupplyClassifyOpts,
): boolean {
  const id = String(workId ?? "").trim();
  if (!id) return false;
  if (OWNER_APPROVED_MATERIAL_SUPPLY_WORK_IDS.has(id)) return true;
  const extra = toSet(opts?.extraMaterialSupplyWorkIds);
  return Boolean(extra?.has(id));
}
