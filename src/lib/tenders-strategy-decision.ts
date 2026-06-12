/**
 * Tender Center PRO — decyzja GO / HOLD / NO-GO (ETAP 2B).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { isActionableTender, isTenderOpenForOffers } from "@/lib/tenders-bzp";
import type { TenderCompanyProfile } from "@/lib/tenders-bzp-company";
import type { GrowthMode } from "@/lib/tenders-strategy-growth-mode";
import { minOpportunityScoreForMode } from "@/lib/tenders-strategy-growth-mode";
import {
  computeOpportunityScore,
  type OpportunityScoreResult,
} from "@/lib/tenders-strategy-opportunity-score";
import {
  computeStrategicScore,
  type StrategicScoreContext,
  type StrategicScoreResult,
} from "@/lib/tenders-strategy-strategic-score";

export type TenderDecision = "GO" | "HOLD" | "NO-GO";

export const DECISION_LABEL_PL: Record<TenderDecision, string> = {
  GO: "STARTUJ",
  HOLD: "ANALIZUJ",
  "NO-GO": "ODPUŚĆ",
};

export interface TenderScoringBundle {
  item: TenderPipelineItem;
  opportunity: OpportunityScoreResult;
  strategic: StrategicScoreResult;
  decision: TenderDecision;
  decisionLabel: string;
  compositeRank: number;
}

export function computeTenderDecision(
  opportunityScore: number,
  strategicScore: number,
  growthMode: GrowthMode = "balanced",
): TenderDecision {
  const minOpp = minOpportunityScoreForMode(growthMode);

  if (opportunityScore < 40 || (opportunityScore < 50 && strategicScore < 35)) {
    return "NO-GO";
  }
  if (strategicScore < 25 && opportunityScore < minOpp + 15) {
    return "NO-GO";
  }
  if (opportunityScore >= 65 && strategicScore >= 60) {
    return "GO";
  }
  if (opportunityScore >= 55 && strategicScore >= 70) {
    return "GO";
  }
  if (opportunityScore >= minOpp && strategicScore < 50) {
    return "HOLD";
  }
  if (opportunityScore >= 45 && strategicScore >= 40 && strategicScore < 60) {
    return "HOLD";
  }
  if (opportunityScore >= 50 && strategicScore >= 50) {
    return "HOLD";
  }
  return "NO-GO";
}

function compositeRank(decision: TenderDecision, opp: number, strat: number): number {
  const decisionBoost =
    decision === "GO" ? 1000 : decision === "HOLD" ? 500 : 0;
  return decisionBoost + opp * 0.55 + strat * 0.45;
}

export function scoreTender(
  item: TenderPipelineItem,
  profile: TenderCompanyProfile,
  strategicContext: StrategicScoreContext,
  now: Date = new Date(),
): TenderScoringBundle {
  const opportunity = computeOpportunityScore(item, profile, now);
  const strategic = computeStrategicScore(item, strategicContext);
  const decision = computeTenderDecision(
    opportunity.score,
    strategic.score,
    strategicContext.growthMode,
  );

  return {
    item,
    opportunity,
    strategic,
    decision,
    decisionLabel: DECISION_LABEL_PL[decision],
    compositeRank: compositeRank(decision, opportunity.score, strategic.score),
  };
}

function scoreActionableCandidates(
  items: TenderPipelineItem[],
  profile: TenderCompanyProfile,
  strategicContext: StrategicScoreContext,
  now: Date = new Date(),
): TenderScoringBundle[] {
  const candidates = items.filter(
    (i) => isTenderOpenForOffers(i.submittingOffersDate, now)
      && isActionableTender(i, now),
  );

  return candidates
    .map((item) => scoreTender(item, profile, strategicContext, now))
    .sort((a, b) => b.compositeRank - a.compositeRank);
}

/** Pełny ranking actionable — jeden pass scoringu (Performance 2.1A). */
export function scoreAllActionableTenderOpportunities(
  items: TenderPipelineItem[],
  profile: TenderCompanyProfile,
  strategicContext: StrategicScoreContext,
  now: Date = new Date(),
): TenderScoringBundle[] {
  return scoreActionableCandidates(items, profile, strategicContext, now);
}

export function rankTopTenderOpportunities(
  items: TenderPipelineItem[],
  profile: TenderCompanyProfile,
  strategicContext: StrategicScoreContext,
  limit = 5,
  now: Date = new Date(),
): TenderScoringBundle[] {
  return scoreActionableCandidates(items, profile, strategicContext, now).slice(0, limit);
}

export interface PortfolioDecisionCounts {
  GO: number;
  HOLD: number;
  "NO-GO": number;
  total: number;
}

/** Liczniki GO / HOLD / NO-GO z już policzonego rankingu (Performance 2.1A). */
export function portfolioCountsFromScoredBundles(
  scored: TenderScoringBundle[],
): PortfolioDecisionCounts {
  const counts: PortfolioDecisionCounts = { GO: 0, HOLD: 0, "NO-GO": 0, total: scored.length };
  for (const bundle of scored) {
    counts[bundle.decision]++;
  }
  return counts;
}

/** Liczniki GO / HOLD / NO-GO dla otwartych przetargów w pipeline. */
export function countPortfolioDecisions(
  items: TenderPipelineItem[],
  profile: TenderCompanyProfile,
  strategicContext: StrategicScoreContext,
  now: Date = new Date(),
): PortfolioDecisionCounts {
  return portfolioCountsFromScoredBundles(
    scoreActionableCandidates(items, profile, strategicContext, now),
  );
}

/** Połączone powody decyzji (max 5). */
export function topDecisionReasons(bundle: TenderScoringBundle): string[] {
  const merged = [
    ...bundle.opportunity.reasons.slice(0, 3),
    ...bundle.strategic.reasons.slice(0, 2),
  ];
  return [...new Set(merged)].slice(0, 5);
}
