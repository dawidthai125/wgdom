/**
 * WORK-RATE-RESEARCH-KB-BRUZDY-POLICY-01 —
 * Range → marketBase (deterministic) · margin → proposed OUR RATE (REUSE material engine).
 *
 * SOURCE RANGE ≠ MARKET BASE ≠ PROPOSED / ACCEPTED OUR RATE.
 * ZERO invent from empty source · ZERO companyPrice.
 */

import { computeSellPricePln } from "@/lib/price-intelligence/our-price-catalog";

export type WorkRatePriceDerivationKind = "SOURCE" | "DERIVED" | "COMMERCIAL" | "ACCEPTED";

export type WorkRateWidthClaim = "NOT_SPECIFIED" | "UNKNOWN";

/** Deterministic midpoint of a real source-provided range. */
export function computeWorkRateMarketBaseFromRange(
  sourceMinPln: number,
  sourceMaxPln: number,
): number | null {
  const a = Number(sourceMinPln);
  const b = Number(sourceMaxPln);
  if (!Number.isFinite(a) || !Number.isFinite(b) || !(a > 0) || !(b > 0)) return null;
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  return Math.round(((lo + hi) / 2) * 100) / 100;
}

/** Point observation → market base (identity transform). */
export function computeWorkRateMarketBaseFromPoint(sourceRatePln: number): number | null {
  const n = Number(sourceRatePln);
  if (!Number.isFinite(n) || !(n > 0)) return null;
  return Math.round(n * 100) / 100;
}

/**
 * REUSE material commercial formula — do not fork.
 * proposedOurRatePln = marketBase * (1 + marginPct/100)
 */
export function computeProposedWorkRatePln(
  marketBaseRatePln: number,
  wgdomMarginPct: number | null | undefined,
): number | null {
  return computeSellPricePln(marketBaseRatePln, wgdomMarginPct);
}

/** companyPrice must never seed marketBase / OUR RATE. */
export function isCompanyPriceForbiddenAsWorkRateBase(): true {
  return true;
}
