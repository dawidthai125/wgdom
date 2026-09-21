/**
 * Owner-approved research unit equivalence — workId-scoped ONLY.
 *
 * NOT a global unit conversion.
 * NOT quantity rewrite.
 * Does NOT invent rates.
 *
 * OWNER_GO_RESOLVE_LP30_UNIT_AND_CLOSE_IF_LEGAL (2026-08-30):
 *   p2b-demontaz-wanny-kpl · catalog kpl ↔ market szt · 1 kpl = 1 wanna
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export type OwnerWorkRateResearchUnitEquivRule = {
  workId: string;
  catalogUnit: WgdomCostUnit;
  /** Market observation units allowed to bind 1:1 to catalogUnit. */
  observedUnits: readonly WgdomCostUnit[];
  quantityConversion: "none";
  ownerGoId: string;
  notesPl: string;
};

/**
 * Explicit Owner research unit policy — NEVER apply by unit pair alone.
 */
export const OWNER_WORK_RATE_RESEARCH_UNIT_EQUIV: readonly OwnerWorkRateResearchUnitEquivRule[] =
  Object.freeze([
    {
      workId: "p2b-demontaz-wanny-kpl",
      catalogUnit: "kpl",
      observedUnits: Object.freeze(["szt"] as const),
      quantityConversion: "none",
      ownerGoId: "OWNER_GO_RESOLVE_LP30_UNIT_AND_CLOSE_IF_LEGAL",
      notesPl:
        "LP30 Demontaż wanny · 1 kpl = 1 wanna · market evidence PLN/szt may qualify as PLN/kpl · no other workId",
    },
  ]);

/** Local fold — avoid import cycle with work-rate-qualify. */
function foldUnitToken(raw: string): string {
  const s = String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/zł\/?/g, "")
    .replace(/pln\/?/g, "")
    .replace(/\./g, "");
  if (s === "szt" || s === "sztuka" || s === "pcs" || s === "pc") return "szt";
  if (s === "kpl" || s === "komplet" || s === "set") return "kpl";
  return s;
}

export function ownerWorkRateResearchUnitEquivAllows(input: {
  workId: string | null | undefined;
  catalogUnit: string | null | undefined;
  observedUnit: string | null | undefined;
}): boolean {
  const workId = String(input.workId ?? "").trim();
  if (!workId) return false;
  const catalog = foldUnitToken(String(input.catalogUnit ?? ""));
  const observed = foldUnitToken(String(input.observedUnit ?? ""));
  if (!catalog || !observed) return false;

  for (const rule of OWNER_WORK_RATE_RESEARCH_UNIT_EQUIV) {
    if (rule.workId !== workId) continue;
    if (foldUnitToken(rule.catalogUnit) !== catalog) continue;
    if (rule.quantityConversion !== "none") continue;
    if (rule.observedUnits.some((u) => foldUnitToken(u) === observed)) {
      return true;
    }
  }
  return false;
}
