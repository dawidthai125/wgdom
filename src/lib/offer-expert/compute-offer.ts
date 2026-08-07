/**
 * Wyliczenie Offer Price z Real Cost — bez przeliczania Real.
 */

import type { OfferPriceBreakdown, OfferStrategyRo } from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Offer = Real + marża(Real) + ryzyko(Real+marża).
 * Real Cost jest wejściem immutable.
 */
export function computeOfferPriceFromRealCost(
  realCostPln: number,
  strategy: OfferStrategyRo,
): OfferPriceBreakdown {
  if (!(realCostPln > 0)) {
    throw new Error("OFFER: realCostPln must be > 0");
  }
  if (strategy.marginPct < 0 || strategy.riskPct < 0) {
    throw new Error("OFFER: margin/risk pct must be >= 0");
  }

  const marginPln = round2(realCostPln * strategy.marginPct);
  const riskPln = round2((realCostPln + marginPln) * strategy.riskPct);
  const offerPricePln = round2(realCostPln + marginPln + riskPln);

  return {
    realCostPln: round2(realCostPln),
    marginPct: strategy.marginPct,
    marginPln,
    riskPct: strategy.riskPct,
    riskPln,
    offerPricePln,
  };
}
