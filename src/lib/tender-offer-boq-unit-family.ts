/**
 * P1 — Unit-family gate for OfferBoq candidate admission (matching specificity).
 *
 * Rejects a catalog candidate ONLY when both the BOQ line unit and the work unit
 * canonicalize to different WgdomCostUnit values via `normalizeWgdomCostUnit`.
 *
 * Conservative:
 * - unknown / null / unclassifiable on either side → KEEP (do not reject)
 * - does NOT invent new equivalences beyond existing normalize semantics
 *   (e.g. kpl→szt, m→mb already in normalizeWgdomCostUnit)
 * - does NOT change scores, F5 threshold, object/trade gates, or auto-pick
 *
 * Examples:
 *   szt ↔ szt     → compatible
 *   mb ↔ mb       → compatible
 *   m ↔ mb        → compatible (normalize maps m→mb)
 *   m2 ↔ m2       → compatible
 *   m3 ↔ m³       → compatible
 *   kpl ↔ kpl     → compatible (both → szt under normalize)
 *   msc ↔ msc     → KEEP (msc is not a WgdomCostUnit → unknown)
 *   szt ↔ m2      → incompatible
 *   szt ↔ mb      → incompatible
 *   m2 ↔ mb       → incompatible
 *   unknown ↔ m2  → KEEP
 */

import { normalizeWgdomCostUnit } from "@/lib/wgdom-cost-catalog";

/**
 * True when the candidate may enter OfferBoq `candidateMatches`.
 * False ONLY on clear, deterministic unit-family incompatibility.
 */
export function areOfferBoqUnitFamiliesCompatible(
  lineUnit: string | null | undefined,
  workUnit: string | null | undefined,
): boolean {
  const lineCanon = normalizeWgdomCostUnit(lineUnit);
  const workCanon = normalizeWgdomCostUnit(workUnit);
  if (lineCanon == null || workCanon == null) return true;
  return lineCanon === workCanon;
}
