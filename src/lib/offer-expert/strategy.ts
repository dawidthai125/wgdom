/**
 * Domyślne parametry strategii ofertowej (RO) — nie Bid calculator.
 */

import type { OfferStrategyParamsRo } from "./types";

export function defaultOfferStrategyParams(): OfferStrategyParamsRo {
  return {
    agresywny: {
      marginPct: 0.06,
      riskPct: 0.02,
      labelPl: "Agresywna (niższa marża / niższa rezerwa)",
    },
    rekomendowany: {
      marginPct: 0.12,
      riskPct: 0.05,
      labelPl: "Rekomendowana (zrównoważona)",
    },
    bezpieczny: {
      marginPct: 0.18,
      riskPct: 0.1,
      labelPl: "Bezpieczna (wyższa marża / wyższa rezerwa)",
    },
  };
}
