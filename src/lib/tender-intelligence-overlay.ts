/**
 * V3.1 Sprint 1 — Decision Overlay (prezentacja STARTUJ / ANALIZUJ / ODPUŚĆ).
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { isTenderOpenForOffers } from "@/lib/tenders-bzp";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { computeReferenceMatchSummary } from "@/lib/tenders-actions";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { resolvedCostStatus } from "@/lib/tender-data-ssot";
import { computeBidMarginPct } from "@/lib/tender-bid-ux";
import {
  DECISION_LABEL_PL,
  topDecisionReasons,
  type TenderDecision,
  type TenderScoringBundle,
} from "@/lib/tenders-strategy-decision";
import type {
  OwnerDecisionBlockAlert,
  OwnerDecisionView,
  OwnerFinanceView,
} from "@/lib/tender-owner-view-ux";
import { buildOwnerFinanceView } from "@/lib/tender-owner-view-ux";

export type IntelligenceOverlayRule = "O1" | "O2" | "O3" | "O4" | null;

export type IntelligenceConfidence = "low" | "medium" | "high";

export interface TenderIntelligenceOverlay {
  rawDecision: TenderDecision;
  rawLabel: string;
  displayDecision: TenderDecision;
  displayLabel: string;
  downgradeRule: IntelligenceOverlayRule;
  reasons: string[];
  /** Sekcja 1 — tylko przy ODPUŚĆ (hard blockers). */
  heroBlocks: OwnerDecisionBlockAlert[];
  /** Sekcja 4 — pełna lista bloków z decision view. */
  allBlocks: OwnerDecisionBlockAlert[];
  confidence: IntelligenceConfidence;
  confidenceLabel: string;
  confidenceHint: string | null;
  helperMessage: string | null;
}

const POSITIVE_REASON_DENYLIST = [
  "termin OK",
  "wadium OK",
  "referencje OK",
  "referencje częściowo",
];

const CONFIDENCE_LABEL_PL: Record<IntelligenceConfidence, string> = {
  low: "Niska",
  medium: "Średnia",
  high: "Wysoka",
};

const CONFIDENCE_HINT_PL: Record<IntelligenceConfidence, string> = {
  low: "Brak kosztorysu lub dokumentów — werdykt wymaga uzupełnienia danych.",
  medium: "Kosztorys jest, ale marża nie została jeszcze policzona.",
  high: "Ekonomia i formalia pozwalają na rekomendację startu.",
};

export function hasReadyTenderMargin(
  ownerFinanceProposal: TenderBidProposal | null | undefined,
): boolean {
  if (ownerFinanceProposal?.ok !== true) return false;
  const revenue = ownerFinanceProposal.recommendedBidPln;
  const cost = ownerFinanceProposal.costPricePln;
  if (revenue == null || cost == null) return false;
  return computeBidMarginPct(revenue, cost) != null;
}

function negativeScoreReasons(bundle: TenderScoringBundle): string[] {
  return topDecisionReasons(bundle).filter((reason) => {
    const trimmed = reason.trim();
    if (POSITIVE_REASON_DENYLIST.some((deny) => trimmed.toLowerCase() === deny.toLowerCase())) {
      return false;
    }
    return trimmed.startsWith("−") || trimmed.startsWith("-");
  });
}

function filterPositiveReasons(reasons: string[]): string[] {
  return reasons.filter((r) => !POSITIVE_REASON_DENYLIST.includes(r.trim()));
}

function buildOverlayReasons(
  displayDecision: TenderDecision,
  downgradeRule: IntelligenceOverlayRule,
  rawReasons: string[],
  blocks: OwnerDecisionBlockAlert[],
  bundle: TenderScoringBundle,
  financeView: OwnerFinanceView,
): string[] {
  if (displayDecision === "NO-GO") {
    const fromBlocks = blocks.map((b) => b.message);
    const negatives = [
      ...fromBlocks,
      ...negativeScoreReasons(bundle),
    ].filter(Boolean);
    const unique = [...new Set(negatives)];
    return unique.slice(0, 3);
  }

  if (displayDecision === "HOLD") {
    const positives = filterPositiveReasons(rawReasons).slice(0, 2);
    const overlayReason = downgradeRule === "O4"
      ? (financeView.message && financeView.message !== "Nie policzono jeszcze zysku."
        ? financeView.message
        : "Brak policzonej marży — wymaga wyceny.")
      : (financeView.hint ?? financeView.message ?? "Wymaga dalszej analizy.");
    return [...positives, overlayReason].filter(Boolean).slice(0, 3);
  }

  return rawReasons.slice(0, 3);
}

function resolveConfidence(
  item: TenderPipelineItem,
  ownerFinanceProposal: TenderBidProposal | null | undefined,
  hasHardBlocker: boolean,
): IntelligenceConfidence {
  const costStatus = resolvedCostStatus(item);
  const kosztorysOk = Boolean(item.tenderDossier?.kosztorys?.ok);
  if (!kosztorysOk || costStatus === "NOT_FOUND") return "low";
  if (hasHardBlocker || !hasReadyTenderMargin(ownerFinanceProposal)) return "medium";
  return "high";
}

function resolveHelperMessage(
  displayDecision: TenderDecision,
  downgradeRule: IntelligenceOverlayRule,
  financeView: OwnerFinanceView,
): string | null {
  if (downgradeRule === "O4") {
    return financeView.hint ?? "Policz marżę w zakładce Wycena, zanim podejmiesz decyzję STARTUJ.";
  }
  if (displayDecision === "NO-GO") return "Przetarg ma twarde blokery — rozważ odstąpienie.";
  if (displayDecision === "HOLD") return "System rekomenduje dokończenie analizy przed startem.";
  return null;
}

export interface ApplyTenderIntelligenceOverlayInput {
  bundle: TenderScoringBundle;
  decisionView: OwnerDecisionView;
  ownerFinanceProposal: TenderBidProposal | null | undefined;
  item: TenderPipelineItem;
}

export function applyTenderIntelligenceOverlay(
  input: ApplyTenderIntelligenceOverlayInput,
): TenderIntelligenceOverlay {
  const { bundle, decisionView, ownerFinanceProposal, item } = input;
  const profile = loadCompanyProfileLocal();
  const swz = item.swzAnalysis;
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const ref = computeReferenceMatchSummary(item, profile);
  const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);
  const financeView = buildOwnerFinanceView(item, ownerFinanceProposal);

  const rawDecision = bundle.decision;
  const rawLabel = DECISION_LABEL_PL[rawDecision];

  let displayDecision: TenderDecision = rawDecision;
  let downgradeRule: IntelligenceOverlayRule = null;

  if (!offerOpen) {
    displayDecision = "NO-GO";
    downgradeRule = "O1";
  } else if (wadium.blocked) {
    displayDecision = "NO-GO";
    downgradeRule = "O2";
  } else if (ref.status === "gap") {
    displayDecision = "NO-GO";
    downgradeRule = "O3";
  } else if (rawDecision === "GO" && !hasReadyTenderMargin(ownerFinanceProposal)) {
    displayDecision = "HOLD";
    downgradeRule = "O4";
  }

  const displayLabel = DECISION_LABEL_PL[displayDecision];
  const hasHardBlocker = downgradeRule === "O1" || downgradeRule === "O2" || downgradeRule === "O3";
  const reasons = buildOverlayReasons(
    displayDecision,
    downgradeRule,
    decisionView.reasons,
    decisionView.blocks,
    bundle,
    financeView,
  );

  const heroBlocks = displayDecision === "NO-GO" ? decisionView.blocks : [];
  const confidence = resolveConfidence(item, ownerFinanceProposal, hasHardBlocker);

  return {
    rawDecision,
    rawLabel,
    displayDecision,
    displayLabel,
    downgradeRule,
    reasons,
    heroBlocks,
    allBlocks: decisionView.blocks,
    confidence,
    confidenceLabel: CONFIDENCE_LABEL_PL[confidence],
    confidenceHint: CONFIDENCE_HINT_PL[confidence],
    helperMessage: resolveHelperMessage(displayDecision, downgradeRule, financeView),
  };
}

/** Overlay = STARTUJ po regułach O1–O5. */
export function overlayRecommendsStart(overlay: TenderIntelligenceOverlay): boolean {
  return overlay.displayDecision === "GO";
}
