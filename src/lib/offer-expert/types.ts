/**
 * Ekspert Oferty — typy (P0). Offer Price nad Real Cost.
 */

export type OfferExpertConfidence = "high" | "medium" | "low";

export type OfferPcrAlignment = "aligned" | "partial" | "not_aligned";

export type OfferStrategyKind = "agresywny" | "rekomendowany" | "bezpieczny";

export interface OfferExpertBlocker {
  code: string;
  messagePl: string;
}

/** Parametry strategii firmy (RO) — nie Bid calculator. */
export interface OfferStrategyRo {
  /** Marża % nad Real Cost (0–1). */
  marginPct: number;
  /** Rezerwa ryzyka % od (Real + marża) (0–1). */
  riskPct: number;
  labelPl?: string;
}

export interface OfferStrategyParamsRo {
  agresywny: OfferStrategyRo;
  rekomendowany: OfferStrategyRo;
  bezpieczny: OfferStrategyRo;
}

export interface OfferPriceBreakdown {
  realCostPln: number;
  marginPct: number;
  marginPln: number;
  riskPct: number;
  riskPln: number;
  offerPricePln: number;
}

export interface OfferScenario {
  strategy: OfferStrategyKind;
  labelPl: string;
  breakdown: OfferPriceBreakdown;
}

/** Główna rekomendacja dla Decydenta. */
export interface OfferPrimaryRecommendation {
  strategy: "rekomendowany";
  offerPricePln: number;
  breakdown: OfferPriceBreakdown;
  summaryPl: string;
}

export interface OfferExpertContract {
  co: string;
  dlaczego: string;
  naPodstawieCzego: string;
  pewnosc: OfferExpertConfidence;
  blokery: OfferExpertBlocker[];
  zgodnoscZRozumieniemWykonania: OfferPcrAlignment;
  zgodnoscOpisPl: string;
}

/** Sygnał do Decydenta — bez UI / auto-GO. */
export interface DecisionMakerSignalPayload {
  offerPricePln: number;
  realCostPln: number;
  breakdown: OfferPriceBreakdown;
  scenarios: OfferScenario[];
  primarySummaryPl: string;
  pewnosc: OfferExpertConfidence;
  contractCo: string;
}

export interface OfferExpertAnalysisResult {
  contract: OfferExpertContract;
  primaryRecommendation: OfferPrimaryRecommendation | null;
  scenarios: OfferScenario[];
  signalToDecisionMaker: boolean;
  decisionMakerPayload: DecisionMakerSignalPayload | null;
}
