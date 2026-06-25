/**
 * V3.1 Sprint 1 — SSOT kontekstu Intelligence (lib-only, bez UI).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { BidPrepCheckItem } from "@/lib/tenders-bid-prep";
import type { ParticipationCheckResult } from "@/lib/tender-participation-check";
import type { StrategicScoreContext } from "@/lib/tenders-strategy-strategic-score";
import type { OwnerTenderDecisionRecord } from "@/lib/tenders-strategy-owner-decisions";
import type { TenderMonitoringCounts } from "@/lib/tender-workspace-ux";
import { getTenderMonitoringCounts } from "@/lib/tender-workspace-ux";
import { buildPreviewContextFromPipelineItem } from "@/lib/tender-pdf-preview-ux";
import { buildDocumentPreviewSummary } from "@/lib/tender-document-summary-header";
import { buildExecutiveSummary, type ExecutiveSummary } from "@/lib/tender-executive-summary";
import {
  buildOwnerDecisionView,
  buildOwnerFinanceView,
  buildOwnerPositionsFileView,
  buildOwnerPrepStatusView,
  buildOwnerRiskTermRows,
  scoreTenderForOwnerView,
  type OwnerDecisionView,
  type OwnerFinanceView,
  type OwnerPositionsFileView,
  type OwnerPrepStatusView,
  type OwnerRiskTermRow,
} from "@/lib/tender-owner-view-ux";
import type { TenderScoringBundle } from "@/lib/tenders-strategy-decision";
import { buildTenderIntelligenceNarrative } from "@/lib/tender-intelligence-narrative";
import {
  applyTenderIntelligenceOverlay,
  type TenderIntelligenceOverlay,
} from "@/lib/tender-intelligence-overlay";
import {
  resolveOwnerNextAction,
  type IntelligenceNextAction,
} from "@/lib/tender-intelligence-next-action";
import type { KosztorysProcessSession } from "@/lib/tender-kosztorys-process-phase";

export interface BuildTenderIntelligenceContextInput {
  item: TenderPipelineItem;
  /** Wymagane — SSOT z tendersCtx.snapshot.scoringContext (Provider). */
  scoringContext: StrategicScoreContext;
  ownerFinanceProposal?: TenderBidProposal | null;
  ownerDecision?: OwnerTenderDecisionRecord | null;
  monitoringCounts?: TenderMonitoringCounts;
  bidPrepChecks?: BidPrepCheckItem[];
  participationResult?: ParticipationCheckResult | null;
  swz?: TenderSwzAnalysis | null;
  fit?: TenderFitAssessment | null;
  kosztorysProcessSession?: KosztorysProcessSession;
}

export interface TenderIntelligenceContext {
  item: TenderPipelineItem;
  scoringBundle: TenderScoringBundle;
  decisionView: OwnerDecisionView;
  overlay: TenderIntelligenceOverlay;
  finance: OwnerFinanceView;
  executive: ExecutiveSummary | null;
  narrative: string;
  nextAction: IntelligenceNextAction;
  prepStatus: OwnerPrepStatusView;
  positions: OwnerPositionsFileView;
  riskRows: OwnerRiskTermRow[];
  monitoringCounts: TenderMonitoringCounts;
  bidPrepChecks: BidPrepCheckItem[] | undefined;
}

function buildIntelligenceExecutive(item: TenderPipelineItem): ExecutiveSummary | null {
  const previewCtx = buildPreviewContextFromPipelineItem(item);
  if (!previewCtx) return null;
  const docSummary = buildDocumentPreviewSummary(previewCtx, { item });
  return buildExecutiveSummary(previewCtx, docSummary);
}

export function buildTenderIntelligenceContext(
  input: BuildTenderIntelligenceContextInput,
): TenderIntelligenceContext {
  const {
    item,
    scoringContext,
    ownerFinanceProposal = null,
    ownerDecision = null,
    monitoringCounts = getTenderMonitoringCounts(item),
    bidPrepChecks,
    participationResult = null,
    swz = item.swzAnalysis,
    fit = item.tenderFit,
    kosztorysProcessSession,
  } = input;

  const scoringBundle = scoreTenderForOwnerView(item, scoringContext);
  const decisionView = buildOwnerDecisionView(scoringBundle);
  const finance = buildOwnerFinanceView(item, ownerFinanceProposal);
  const overlay = applyTenderIntelligenceOverlay({
    bundle: scoringBundle,
    decisionView,
    ownerFinanceProposal,
    item,
  });
  const executive = buildIntelligenceExecutive(item);
  const narrative = buildTenderIntelligenceNarrative(item, executive, swz);
  const nextAction = resolveOwnerNextAction({
    item,
    overlay,
    ownerFinanceProposal,
    ownerDecision,
    monitoringCounts,
    bidPrepChecks,
    participationResult,
  });

  return {
    item,
    scoringBundle,
    decisionView,
    overlay,
    finance,
    executive,
    narrative,
    nextAction,
    prepStatus: buildOwnerPrepStatusView(item, ownerFinanceProposal),
    positions: buildOwnerPositionsFileView(item, kosztorysProcessSession),
    riskRows: buildOwnerRiskTermRows(item, swz, fit),
    monitoringCounts,
    bidPrepChecks,
  };
}
