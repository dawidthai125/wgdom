/**
 * OfferStrategy — wyłącznie defaultOfferStrategyParams (public API).
 * Bridge Bid → strategy = OUT (WIRE-CHIEF-STRATEGY-BRIDGE-01).
 */

import {
  defaultOfferStrategyParams,
  type OfferStrategyParamsRo,
} from "@/lib/offer-expert";
import type {
  BuildChiefOfferStrategyParamsRoResult,
  ChiefWireAdapterGap,
} from "./types";

export function buildChiefOfferStrategyParamsRo(): BuildChiefOfferStrategyParamsRoResult {
  const offerStrategy: OfferStrategyParamsRo = defaultOfferStrategyParams();
  const gaps: ChiefWireAdapterGap[] = [
    {
      code: "OFFER_STRATEGY_DEFAULTS",
      field: "offerStrategy",
      messagePl:
        "Użyto domyślnych strategii Offer Expert — bez mapowania Bid profitPct/minMarginPct.",
      severity: "info",
    },
  ];
  return { offerStrategy, gaps };
}
