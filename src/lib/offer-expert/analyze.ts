/**
 * Ekspert Oferty — czynność domenowa (P0).
 * Wejście wyłącznie: CostExpertAnalysisResult.
 */

import type { CostExpertAnalysisResult } from "@/lib/cost-expert";
import { computeOfferPriceFromRealCost } from "./compute-offer";
import { buildOfferExpertContract } from "./interpret";
import { defaultOfferStrategyParams } from "./strategy";
import type {
  DecisionMakerSignalPayload,
  OfferExpertAnalysisResult,
  OfferPrimaryRecommendation,
  OfferScenario,
  OfferStrategyParamsRo,
} from "./types";

const STRATEGY_LABELS: Record<keyof OfferStrategyParamsRo, string> = {
  agresywny: "Agresywny",
  rekomendowany: "Rekomendowany",
  bezpieczny: "Bezpieczny",
};

export function analyzeOfferFromCost(
  cost: CostExpertAnalysisResult,
  strategyParams: OfferStrategyParamsRo = defaultOfferStrategyParams(),
): OfferExpertAnalysisResult {
  const handoffOk =
    cost.handoffToOfferExpert === true &&
    cost.offerHandoffPayload != null &&
    cost.offerHandoffPayload.realCostPln > 0;

  const costAligned =
    cost.contract.zgodnoscZRozumieniemWykonania === "aligned" ||
    cost.contract.zgodnoscZRozumieniemWykonania === "partial";

  if (!handoffOk || !cost.offerHandoffPayload) {
    const contract = buildOfferExpertContract({
      handoffOk: false,
      handoffBlockersPl: cost.handoffBlockersPl ?? [],
      primary: null,
      costPewnosc: null,
      costAligned,
    });
    return {
      contract,
      primaryRecommendation: null,
      scenarios: [],
      signalToDecisionMaker: false,
      decisionMakerPayload: null,
    };
  }

  const realCostPln = cost.offerHandoffPayload.realCostPln;

  const scenarios: OfferScenario[] = (
    ["agresywny", "rekomendowany", "bezpieczny"] as const
  ).map((strategy) => {
    const params = strategyParams[strategy];
    return {
      strategy,
      labelPl: params.labelPl ?? STRATEGY_LABELS[strategy],
      breakdown: computeOfferPriceFromRealCost(realCostPln, params),
    };
  });

  const recommended = scenarios.find((s) => s.strategy === "rekomendowany")!;
  // Główna rekomendacja ZAWSZE = rekomendowany — scenariusze nie nadpisują
  const primaryRecommendation: OfferPrimaryRecommendation = {
    strategy: "rekomendowany",
    offerPricePln: recommended.breakdown.offerPricePln,
    breakdown: recommended.breakdown,
    summaryPl:
      `Zalecana oferta: ${recommended.breakdown.offerPricePln} PLN ` +
      `(Real ${realCostPln} + marża ${recommended.breakdown.marginPln} + ryzyko ${recommended.breakdown.riskPln}).`,
  };

  const contract = buildOfferExpertContract({
    handoffOk: true,
    handoffBlockersPl: [],
    primary: primaryRecommendation,
    costPewnosc: cost.offerHandoffPayload.pewnosc,
    costAligned,
  });

  const signalToDecisionMaker =
    primaryRecommendation != null &&
    contract.zgodnoscZRozumieniemWykonania !== "not_aligned";

  let decisionMakerPayload: DecisionMakerSignalPayload | null = null;
  if (signalToDecisionMaker) {
    decisionMakerPayload = {
      offerPricePln: primaryRecommendation.offerPricePln,
      realCostPln,
      breakdown: primaryRecommendation.breakdown,
      scenarios,
      primarySummaryPl: primaryRecommendation.summaryPl,
      pewnosc: contract.pewnosc,
      contractCo: contract.co,
    };
  }

  return {
    contract,
    primaryRecommendation,
    scenarios,
    signalToDecisionMaker,
    decisionMakerPayload,
  };
}
