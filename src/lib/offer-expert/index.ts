/**
 * Ekspert Oferty — public API.
 */

export type {
  DecisionMakerSignalPayload,
  OfferExpertAnalysisResult,
  OfferExpertBlocker,
  OfferExpertConfidence,
  OfferExpertContract,
  OfferPcrAlignment,
  OfferPriceBreakdown,
  OfferPrimaryRecommendation,
  OfferScenario,
  OfferStrategyKind,
  OfferStrategyParamsRo,
  OfferStrategyRo,
} from "./types";

export { defaultOfferStrategyParams } from "./strategy";
export { computeOfferPriceFromRealCost } from "./compute-offer";
export { buildOfferExpertContract } from "./interpret";
export { analyzeOfferFromCost } from "./analyze";
