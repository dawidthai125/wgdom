/**
 * P5-OWNER-VIEW — logika Owner View na Decyzji (tylko prezentacja).
 * P5.1 — recovery: pełny SSOT kosztorysu, stany pośrednie finansów, pasek statusu.
 */

import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { daysUntilTenderDeadline, isTenderOpenForOffers } from "@/lib/tenders-bzp";
import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import type { TenderFitAssessment } from "@/lib/tenders-bzp-fit";
import { FIT_LABELS } from "@/lib/tenders-bzp-fit";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { computeWadiumInfo } from "@/lib/tenders-wadium";
import { computeReferenceMatchSummary } from "@/lib/tenders-actions";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import {
  buildOurEstimateTileDisplay,
  classifyCostDocument,
  resolvedCostStatus,
  resolvedCostStatusDisplay,
  resolvedTenderValuePln,
} from "@/lib/tender-data-ssot";
import {
  isKosztorysAwaitingHeavyParse,
  isPricingAwaitingLazyEvaluation,
  countTenderAttachments,
  type TenderAnalysisStatusRow,
} from "@/lib/tender-analysis-status-ux";
import { tenderDossierHeavyParseDone } from "@/lib/tender-dossier-pipeline";
import { buildAthQuickAccessContext } from "@/lib/tender-ath-quick-access";
import {
  scoreTender,
  topDecisionReasons,
  type TenderDecision,
  type TenderScoringBundle,
} from "@/lib/tenders-strategy-decision";
import type { StrategicScoreContext } from "@/lib/tenders-strategy-strategic-score";
import { computeBidMarginPct, formatBidMarginPct } from "@/lib/tender-bid-ux";
import { TENDER_OWNER_VIEW_COPY } from "@/lib/tender-owner-language-pl";

export type OwnerDecisionBlockKind = "wadium" | "termin" | "kwalifikacja";

export interface OwnerDecisionBlockAlert {
  kind: OwnerDecisionBlockKind;
  message: string;
}

export interface OwnerDecisionView {
  label: string;
  decision: TenderDecision;
  reasons: string[];
  blocks: OwnerDecisionBlockAlert[];
}

export type OwnerFinanceMode = "ready" | "intermediate" | "cta";

export interface OwnerFinanceView {
  mode: OwnerFinanceMode;
  /** @deprecated use mode === "ready" */
  ready: boolean;
  revenuePln: number | null;
  costPln: number | null;
  marginPct: number | null;
  revenueDisplay: string;
  costDisplay: string;
  marginDisplay: string;
  message: string | null;
  hint: string | null;
  showCta: boolean;
}

export type OwnerPositionsFileState =
  | "przedmiar"
  | "kosztorys"
  | "awaiting"
  | "missing";

export type OwnerStatusIcon = "ok" | "pending" | "warn";

export interface OwnerPositionsFileView {
  state: OwnerPositionsFileState;
  docType: string;
  rowCount: number;
  statusIcon: OwnerStatusIcon;
  /** Pełny komunikat SSOT (resolvedCostStatusDisplay.display). */
  statusLine: string;
  hint: string | null;
  ctaLabel: string | null;
}

export interface OwnerPrepStatusLine {
  icon: OwnerStatusIcon;
  text: string;
}

export interface OwnerPrepStatusView {
  kosztorys: OwnerPrepStatusLine;
  pricing: OwnerPrepStatusLine;
}

export interface OwnerRiskTermRow {
  id: "termin" | "wadium" | "ryzyko";
  label: string;
  value: string;
  tone: "ok" | "warn" | "bad" | "neutral";
}

function ownerFriendlyReasons(bundle: TenderScoringBundle): string[] {
  const fromScore = topDecisionReasons(bundle)
    .map((r) => r.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  if (fromScore.length >= 2) return fromScore.slice(0, 3);

  const item = bundle.item;
  const profile = loadCompanyProfileLocal();
  const swz = item.swzAnalysis;
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const ref = computeReferenceMatchSummary(item, profile);
  const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);

  const built: string[] = [];
  if (offerOpen) built.push("termin OK");
  if (!wadium.blocked && (wadium.amountPln != null || wadium.raw)) built.push("wadium OK");
  if (ref.status === "ok") built.push("referencje OK");
  else if (ref.status === "partial") built.push("referencje częściowo");

  if (built.length === 0) return fromScore.slice(0, 3);
  return [...new Set([...built, ...fromScore])].slice(0, 3);
}

export function buildOwnerDecisionView(
  bundle: TenderScoringBundle,
): OwnerDecisionView {
  const item = bundle.item;
  const profile = loadCompanyProfileLocal();
  const swz = item.swzAnalysis;
  const wadium = computeWadiumInfo(item, swz, profile.maxWadiumPln);
  const ref = computeReferenceMatchSummary(item, profile);
  const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);

  const blocks: OwnerDecisionBlockAlert[] = [];
  if (wadium.blocked) {
    blocks.push({ kind: "wadium", message: `Wadium blokuje udział — ${wadium.summary}` });
  }
  if (item.submittingOffersDate && !offerOpen) {
    blocks.push({ kind: "termin", message: "Termin składania ofert minął" });
  }
  if (ref.status === "gap") {
    blocks.push({ kind: "kwalifikacja", message: ref.summary });
  }

  return {
    label: bundle.decisionLabel,
    decision: bundle.decision,
    reasons: ownerFriendlyReasons(bundle),
    blocks,
  };
}

export function scoreTenderForOwnerView(
  item: TenderPipelineItem,
  strategicContext: StrategicScoreContext,
): TenderScoringBundle {
  const profile = strategicContext.profile ?? loadCompanyProfileLocal();
  return scoreTender(item, profile, strategicContext);
}

export function buildOwnerFinanceView(
  item: TenderPipelineItem,
  bidProposal: TenderBidProposal | null | undefined,
): OwnerFinanceView {
  const revenuePln = bidProposal?.recommendedBidPln ?? null;
  const costPln = bidProposal?.costPricePln ?? null;
  const marginPct = computeBidMarginPct(revenuePln, costPln);
  const ready = bidProposal?.ok === true
    && revenuePln != null
    && costPln != null;

  const numbers = {
    revenuePln,
    costPln,
    marginPct,
    revenueDisplay: revenuePln != null ? fmtPln(revenuePln) : "—",
    costDisplay: costPln != null ? fmtPln(costPln) : "—",
    marginDisplay: formatBidMarginPct(marginPct),
  };

  if (ready) {
    return {
      mode: "ready",
      ready: true,
      ...numbers,
      message: null,
      hint: null,
      showCta: false,
    };
  }

  if (isKosztorysAwaitingHeavyParse(item)) {
    const estimate = buildOurEstimateTileDisplay({
      item,
      ourEstimatePln: item.ourEstimatePln,
      bidProposal,
      pricingDeferred: false,
    });
    return {
      mode: "intermediate",
      ready: false,
      ...numbers,
      message: estimate.display,
      hint: estimate.hint ?? null,
      showCta: true,
    };
  }

  const estimate = buildOurEstimateTileDisplay({
    item,
    ourEstimatePln: item.ourEstimatePln,
    bidProposal,
    pricingDeferred: false,
  });

  if (item.ourEstimatePln != null) {
    return {
      mode: "ready",
      ready: true,
      revenuePln: item.ourEstimatePln,
      costPln: bidProposal?.costPricePln ?? null,
      marginPct: computeBidMarginPct(item.ourEstimatePln, bidProposal?.costPricePln ?? null),
      revenueDisplay: fmtPln(item.ourEstimatePln),
      costDisplay: bidProposal?.costPricePln != null ? fmtPln(bidProposal.costPricePln) : "—",
      marginDisplay: formatBidMarginPct(
        computeBidMarginPct(item.ourEstimatePln, bidProposal?.costPricePln ?? null),
      ),
      message: null,
      hint: null,
      showCta: false,
    };
  }

  if (bidProposal != null && !bidProposal.ok) {
    return {
      mode: "intermediate",
      ready: false,
      ...numbers,
      message: estimate.display,
      hint: bidProposal.warnings?.[0] ?? estimate.hint ?? null,
      showCta: true,
    };
  }

  if (estimate.display !== TENDER_OWNER_VIEW_COPY.financeEmpty) {
    return {
      mode: "intermediate",
      ready: false,
      ...numbers,
      message: estimate.display,
      hint: estimate.hint ?? null,
      showCta: true,
    };
  }

  return {
    mode: "cta",
    ready: false,
    ...numbers,
    message: TENDER_OWNER_VIEW_COPY.financeEmpty,
    hint: null,
    showCta: true,
  };
}

function positionsStatusIcon(
  state: OwnerPositionsFileState,
): OwnerStatusIcon {
  if (state === "awaiting") return "pending";
  if (state === "missing") return "warn";
  return "ok";
}

function resolvePositionsCta(
  item: TenderPipelineItem,
  state: OwnerPositionsFileState,
): string | null {
  const athCtx = buildAthQuickAccessContext(item);
  if (state === "awaiting") return "Otwórz Dokumenty";
  if (state === "przedmiar") return athCtx.previewItem ? "Otwórz przedmiar" : null;
  if (state === "kosztorys") return athCtx.previewItem ? "Otwórz kosztorys" : null;
  return null;
}

export function buildOwnerPositionsFileView(item: TenderPipelineItem): OwnerPositionsFileView {
  const costStatus = resolvedCostStatus(item);
  const costUi = resolvedCostStatusDisplay(item, costStatus);
  const classified = classifyCostDocument(item);
  const docType = classified?.type ?? "ATH";
  const rowCount = classified?.rowCount ?? item.tenderDossier?.kosztorys?.rowCount ?? 0;

  if (isKosztorysAwaitingHeavyParse(item)) {
    const state: OwnerPositionsFileState = "awaiting";
    return {
      state,
      docType,
      rowCount,
      statusIcon: positionsStatusIcon(state),
      statusLine: costUi.display,
      hint: costUi.hint ?? null,
      ctaLabel: resolvePositionsCta(item, state),
    };
  }

  if (costStatus === "FOUND_NO_VALUE") {
    const state: OwnerPositionsFileState = "przedmiar";
    return {
      state,
      docType,
      rowCount,
      statusIcon: positionsStatusIcon(state),
      statusLine: costUi.display,
      hint: costUi.hint ?? null,
      ctaLabel: resolvePositionsCta(item, state),
    };
  }

  if (costStatus === "FOUND_WITH_VALUE") {
    const state: OwnerPositionsFileState = "kosztorys";
    return {
      state,
      docType,
      rowCount,
      statusIcon: positionsStatusIcon(state),
      statusLine: costUi.display,
      hint: costUi.hint ?? null,
      ctaLabel: resolvePositionsCta(item, state),
    };
  }

  const hasAttachments = countTenderAttachments(item) > 0;
  if (hasAttachments && !tenderDossierHeavyParseDone(item.tenderDossier)) {
    const state: OwnerPositionsFileState = "awaiting";
    return {
      state,
      docType,
      rowCount,
      statusIcon: positionsStatusIcon(state),
      statusLine: costUi.display,
      hint: costUi.hint ?? null,
      ctaLabel: resolvePositionsCta(item, state),
    };
  }

  const state: OwnerPositionsFileState = "missing";
  return {
    state,
    docType,
    rowCount,
    statusIcon: positionsStatusIcon(state),
    statusLine: costUi.display,
    hint: costUi.hint ?? null,
    ctaLabel: resolvePositionsCta(item, state),
  };
}

/** P5.1 — krótki status Kosztorys / Wycena na Decyzji (bez pełnego stripa). */
export function buildOwnerPrepStatusView(
  item: TenderPipelineItem,
  bidProposal: TenderBidProposal | null | undefined,
): OwnerPrepStatusView {
  const costStatus = resolvedCostStatus(item);
  const kosztorysAwaiting = isKosztorysAwaitingHeavyParse(item);
  const docCount = countTenderAttachments(item);
  const heavyDone = tenderDossierHeavyParseDone(item.tenderDossier);

  let kosztorys: OwnerPrepStatusLine;
  if (kosztorysAwaiting || (docCount > 0 && !heavyDone && costStatus === "NOT_FOUND")) {
    kosztorys = { icon: "pending", text: "oczekuje" };
  } else if (costStatus !== "NOT_FOUND") {
    kosztorys = { icon: "ok", text: "znaleziony" };
  } else {
    kosztorys = { icon: "warn", text: "brak" };
  }

  const pricingReady = item.ourEstimatePln != null
    || (bidProposal?.ok && bidProposal.recommendedBidPln != null);

  let pricing: OwnerPrepStatusLine;
  if (pricingReady) {
    pricing = { icon: "ok", text: "gotowa" };
  } else if (kosztorysAwaiting || (docCount > 0 && !heavyDone)) {
    pricing = { icon: "pending", text: "oczekuje" };
  } else if (
    isPricingAwaitingLazyEvaluation(item, bidProposal, undefined, false)
    || (costStatus !== "NOT_FOUND" && !bidProposal?.ok)
    || (heavyDone && costStatus === "NOT_FOUND")
  ) {
    pricing = { icon: "warn", text: "wymaga analizy" };
  } else {
    pricing = { icon: "warn", text: "wymaga analizy" };
  }

  return { kosztorys, pricing };
}

export function buildOwnerRiskTermRows(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  fit: TenderFitAssessment | null | undefined,
): OwnerRiskTermRow[] {
  const offerOpen = isTenderOpenForOffers(item.submittingOffersDate);
  const days = daysUntilTenderDeadline(item.submittingOffersDate);
  const valuePln = resolvedTenderValuePln(item, swz);

  const deadlineValue = item.submittingOffersDate
    ? offerOpen && days != null && days >= 0
      ? `${days} dni do terminu`
      : offerOpen
        ? "Termin otwarty"
        : "Termin minął"
    : "Brak daty";

  const rows: OwnerRiskTermRow[] = [
    {
      id: "termin",
      label: "Termin",
      value: deadlineValue,
      tone: !item.submittingOffersDate
        ? "neutral"
        : offerOpen
          ? days != null && days <= 3
            ? "warn"
            : "ok"
          : "bad",
    },
  ];

  if (fit) {
    rows.push({
      id: "ryzyko",
      label: TENDER_OWNER_VIEW_COPY.riskFitLabel,
      value: `${FIT_LABELS[fit.fitLabel]} · ${fit.fitScore}/100`,
      tone: fit.fitScore >= 65 ? "ok" : fit.fitScore >= 45 ? "warn" : "bad",
    });
  } else if (valuePln != null) {
    rows.push({
      id: "ryzyko",
      label: TENDER_OWNER_VIEW_COPY.riskValueLabel,
      value: fmtPln(valuePln),
      tone: "neutral",
    });
  }

  return rows;
}

/** P5-004 — w sekcji Więcej ukryj kroki już widoczne na Owner View. */
export function filterOwnerMoreAnalysisRows(
  rows: TenderAnalysisStatusRow[],
): TenderAnalysisStatusRow[] {
  return rows.filter((r) => r.id === "notice" || r.id === "documents");
}

export function ownerDecisionTone(decision: TenderDecision): string {
  switch (decision) {
    case "GO":
      return "border-emerald-500/45 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300";
    case "HOLD":
      return "border-amber-500/45 bg-amber-500/10 text-amber-900 dark:text-amber-200";
    case "NO-GO":
      return "border-red-500/40 bg-red-500/10 text-red-800 dark:text-red-300";
  }
}

export function ownerRiskToneClass(tone: OwnerRiskTermRow["tone"]): string {
  switch (tone) {
    case "ok":
      return "text-emerald-700 dark:text-emerald-400";
    case "warn":
      return "text-amber-700 dark:text-amber-400";
    case "bad":
      return "text-red-700 dark:text-red-400";
    default:
      return "text-foreground";
  }
}

export function ownerStatusIconClass(icon: OwnerStatusIcon): string {
  switch (icon) {
    case "ok":
      return "text-emerald-600 dark:text-emerald-400";
    case "pending":
      return "text-amber-600 dark:text-amber-400";
    case "warn":
      return "text-amber-700 dark:text-amber-300";
  }
}

export function ownerStatusIconGlyph(icon: OwnerStatusIcon): string {
  switch (icon) {
    case "ok":
      return "✓";
    case "pending":
      return "⏳";
    case "warn":
      return "⚠";
  }
}
