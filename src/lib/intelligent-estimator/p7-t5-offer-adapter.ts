/**
 * W4 CONNECT — T5 Offer ← existing P7 proposal (thin adapter · no new bid engine).
 *
 * Canonical PLN bids come from `IkP7PositionCostBidReport.proposal`
 * (`runIkP7PositionCostBid` → computePackageBidProposal / computeBidProposalFromPositionCost
 *  → computeTenderBidProposal REUSE inside P7).
 *
 * This module only maps P7 output → OfferExpertAnalysisResult shape for Chief T5
 * consumers (dossier / Hub). LEGACY `analyzeOfferFromCost` remains when P7 absent.
 *
 * HARD: no G3 Final Bid persist · no second calculator · no Accept change.
 */

import type {
  DecisionMakerSignalPayload,
  OfferExpertAnalysisResult,
  OfferPrimaryRecommendation,
  OfferScenario,
} from "@/lib/offer-expert";
import { buildOfferExpertContract } from "@/lib/offer-expert/interpret";
import type { IkP7PositionCostBidReport } from "./ik-p7-position-cost-bid";

export type ChiefOfferPresentationSource = "p7" | "legacy" | "none";

export type ChiefOfferPresentation = {
  source: ChiefOfferPresentationSource;
  /** True when presentation uses P7 adapter (T5 CONNECT). */
  t5AdaptedFromP7: boolean;
  offer: OfferExpertAnalysisResult | null;
};

function roundPln(n: number): number {
  return Math.round(n * 100) / 100;
}

function breakdownFromP7Prices(opts: {
  realCostPln: number;
  offerPricePln: number;
}): OfferPrimaryRecommendation["breakdown"] {
  const realCostPln = roundPln(Math.max(0, opts.realCostPln));
  const offerPricePln = roundPln(Math.max(0, opts.offerPricePln));
  const marginPln = roundPln(Math.max(0, offerPricePln - realCostPln));
  const marginPct = realCostPln > 0 ? marginPln / realCostPln : 0;
  return {
    realCostPln,
    marginPct,
    marginPln,
    riskPct: 0,
    riskPln: 0,
    offerPricePln,
  };
}

/**
 * Map ready P7 report → OfferExpertAnalysisResult.
 * Returns null when P7 is not a usable canonical bid (caller keeps LEGACY T5).
 */
export function adaptP7ReportToOfferExpertResult(
  p7: IkP7PositionCostBidReport | null | undefined,
): OfferExpertAnalysisResult | null {
  if (!p7 || p7.bidOk !== true || !p7.proposal?.ok) return null;
  const prop = p7.proposal;
  const recommended = prop.recommendedBidPln;
  if (recommended == null || !(recommended > 0)) return null;

  const realCostPln =
    prop.costPricePln
    ?? p7.directPln
    ?? recommended;

  const aggressive = prop.aggressiveBidPln ?? recommended;
  const safe = prop.safeBidPln ?? recommended;

  const scenarios: OfferScenario[] = [
    {
      strategy: "agresywny",
      labelPl: "Agresywny",
      breakdown: breakdownFromP7Prices({
        realCostPln,
        offerPricePln: aggressive,
      }),
    },
    {
      strategy: "rekomendowany",
      labelPl: "Rekomendowany",
      breakdown: breakdownFromP7Prices({
        realCostPln,
        offerPricePln: recommended,
      }),
    },
    {
      strategy: "bezpieczny",
      labelPl: "Bezpieczny",
      breakdown: breakdownFromP7Prices({
        realCostPln,
        offerPricePln: safe,
      }),
    },
  ];

  const recommendedScenario = scenarios.find((s) => s.strategy === "rekomendowany")!;
  const primaryRecommendation: OfferPrimaryRecommendation = {
    strategy: "rekomendowany",
    offerPricePln: recommendedScenario.breakdown.offerPricePln,
    breakdown: recommendedScenario.breakdown,
    summaryPl:
      `Zalecana oferta (P7 SSOT): ${recommendedScenario.breakdown.offerPricePln} PLN `
      + `(koszt ${realCostPln} PLN · źródło Orchestra P7 · bez G3 persist).`,
  };

  const contract = buildOfferExpertContract({
    handoffOk: true,
    handoffBlockersPl: [],
    primary: primaryRecommendation,
    costPewnosc: "medium",
    costAligned: true,
  });

  const decisionMakerPayload: DecisionMakerSignalPayload = {
    offerPricePln: primaryRecommendation.offerPricePln,
    realCostPln,
    breakdown: primaryRecommendation.breakdown,
    scenarios,
    primarySummaryPl: primaryRecommendation.summaryPl,
    pewnosc: contract.pewnosc,
    contractCo: contract.co,
  };

  return {
    contract: {
      ...contract,
      naPodstawieCzego:
        "P7 Position Cost / Bid (Orchestra) — adapter T5 W4 CONNECT · bez drugiego kalkulatora.",
      co: "Rekomendacja oferty z kanonicznego P7 (IK).",
    },
    primaryRecommendation,
    scenarios,
    signalToDecisionMaker: true,
    decisionMakerPayload,
  };
}

/**
 * Prefer P7-adapted offer for Chief T5 presentation; else LEGACY offer expert.
 */
export function resolveChiefOfferPresentation(opts: {
  legacyOffer: OfferExpertAnalysisResult | null | undefined;
  p7Report: IkP7PositionCostBidReport | null | undefined;
}): ChiefOfferPresentation {
  const adapted = adaptP7ReportToOfferExpertResult(opts.p7Report);
  if (adapted?.primaryRecommendation) {
    return { source: "p7", t5AdaptedFromP7: true, offer: adapted };
  }
  if (opts.legacyOffer?.primaryRecommendation) {
    return {
      source: "legacy",
      t5AdaptedFromP7: false,
      offer: opts.legacyOffer,
    };
  }
  return { source: "none", t5AdaptedFromP7: false, offer: null };
}
