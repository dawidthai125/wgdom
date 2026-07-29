/**
 * AI-COST-01 / COST-S4.1 — Explainability ViewModel (pure, read-only).
 * Orkiestracja istniejących silników S1–S4 — bez zmiany ich logiki, bez edycji.
 */

import { fmtPln, type TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { buildOfferBoqFromSnapshot, type OfferBoqConfidence, type OfferBoqDocument, type OfferBoqComponentEditStatus } from "@/lib/tender-offer-boq";
import { mapOfferBoqDocument } from "@/lib/tender-offer-boq-mapping";
import { applyOfferBoqCostIntelligence } from "@/lib/tender-offer-boq-cost-intelligence";
import {
  applyOfferBoqPricing,
  OFFER_BOQ_PRICED_CATEGORY_LABELS_PL,
} from "@/lib/tender-offer-boq-pricing-engine";
import {
  computeOfferBoqUserEditStats,
  normalizeOfferBoqDocumentForEdit,
  OFFER_BOQ_COMPONENT_EDIT_STATUS_LABELS_PL,
} from "@/lib/tender-offer-boq-component-edit";
import {
  countCompanyKnowledgeHits,
  createCompanyKnowledgePriceProvider,
  loadCompanyKnowledgeStoreLocal,
} from "@/lib/tender-offer-boq-company-knowledge";
import { createControlledMarketPriceProvider } from "@/lib/tender-offer-boq-controlled-price-source";
import { isCenyMaterialow01Enabled } from "@/lib/ceny-materialow-01-flag";
import type { MarketAverageResult } from "@/lib/work-catalog";
import { fullyLoadedHourly } from "@/lib/company-labor-cost";
import { resolveKosztorysSnapshotForPricing } from "@/lib/cost-multi-02";
import {
  integrateOfferBoqWithBidProposal,
  type OfferBoqBidAuditStep,
} from "@/lib/tender-offer-boq-bid-adapter";
import {
  evaluateOfferBoqValidation,
  type OfferBoqValidationIssue,
  type OfferBoqValidationRecommendation,
  type OfferBoqValidationCompleteness,
  type OfferBoqQualityExplainability,
  type OfferBoqReadinessStatus,
} from "@/lib/tender-offer-boq-validation";
import type { TenderBidCostLine, TenderBidProposal } from "@/lib/tenders-bid-calculator";
import { formatBidMarginPct } from "@/lib/tender-bid-ux";
import { isCostBidGap01CatalogCalEnabled } from "@/lib/tenders-v4-config";

/** AI-COST-02-B — Top-K wpływu na direct (RO). */
export interface OfferBoq02bTopImpactRow {
  lineId: string;
  lp: string;
  description: string;
  lineDirectPln: number;
  sharePct: number;
  lineDirectDisplay: string;
}

/** AI-COST-02-B — dokumenty źródłowe przedmiaru (RO). */
export interface OfferBoq02bDocumentSource {
  sourceFilename: string | null;
  discoveryLabelPl: string | null;
  candidateSourcesSample: string[];
  candidatesTotal: number;
}

/** AI-COST-02-B — założenia silnika (RO). */
export interface OfferBoq02bAssumptions {
  aiDirectOnlyPl: string;
  mappingNotePl: string;
  bidLayerPl: string;
  gapAStatusPl: string;
  strategySamplePl: string | null;
}

/** AI-COST-02-B — enrichment Explain (pure; UI gate'owane flagą). */
export interface OfferBoq02bExplainEnrichment {
  documents: OfferBoq02bDocumentSource;
  topImpact: OfferBoq02bTopImpactRow[];
  assumptions: OfferBoq02bAssumptions;
}

/** Status wizualny pewności — mapowanie z istniejącego confidence (+ review). */
export type OfferBoqExplainConfidenceStatus = "high" | "review" | "low";

export interface OfferBoqExplainConfidenceBadge {
  status: OfferBoqExplainConfidenceStatus;
  emoji: "🟢" | "🟡" | "🔴";
  labelPl: string;
}

export interface OfferBoqExplainComponentRow {
  componentId: string;
  namePl: string;
  category: string;
  categoryLabelPl: string;
  quantity: number;
  quantityDisplay: string;
  unit: string;
  unitPricePln: number | null;
  unitPriceDisplay: string;
  totalDisplay: string;
  sourceKind: string;
  sourceLabelPl: string;
  confidenceBadge: OfferBoqExplainConfidenceBadge;
  aiRationale: string;
  requiresUserReview: boolean;
  reviewLabelPl: string;
  editStatus: OfferBoqComponentEditStatus;
  editStatusLabelPl: string;
  changeHistoryCount: number;
  /** COST-S5.1 */
  companyKnowledgeUsed: boolean;
  companyKnowledgeOccurrenceCount: number;
  companyKnowledgeLastUsedAt: string | null;
  companyKnowledgeConfidenceBoosted: boolean;
  companyKnowledgeExplainPl: string | null;
  /** COST-02-A */
  controlledMarketUsed: boolean;
  controlledMarketRegionLabelPl: string | null;
  controlledMarketAsOf: string | null;
  controlledMarketOriginCount: number;
  controlledMarketExplainPl: string | null;
}

export interface OfferBoqExplainLineCard {
  lineId: string;
  lp: string;
  description: string;
  lineKindLabelPl: string;
  pricingStrategyLabelPl: string;
  requiresDecomposition: boolean;
  decompositionLabelPl: string;
  decompositionElementCount: number;
  componentCount: number;
  confidenceBadge: OfferBoqExplainConfidenceBadge;
  sourceLabelsPl: string[];
  requiresUserReview: boolean;
  reviewLabelPl: string;
  whyAiDecisionPl: string;
  lineDirectDisplay: string;
  /** AI-COST-02-B — wartość numeryczna do Top-K / Queue (RO). */
  lineDirectPln: number | null;
  components: OfferBoqExplainComponentRow[];
}

export interface OfferBoqExplainSummary {
  lineCount: number;
  recognizedCount: number;
  reviewRequiredCount: number;
  decomposedCount: number;
  averageConfidenceLabelPl: string;
  averageConfidenceBadge: OfferBoqExplainConfidenceBadge;
  directCostDisplay: string;
  pricedComponentCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  /** COST-S5 */
  approvedCount: number;
  changedCount: number;
  aiOnlyCount: number;
  /** COST-S5.1 — ile komponentów w tym dokumencie skorzystało z wiedzy firmy. */
  companyKnowledgeHitCount: number;
}

/** COST-S6 — wpływ AI Cost na ofertę (przed Bid Proposal). */
export interface OfferBoqBidImpactSection {
  available: boolean;
  directCostDisplay: string;
  directCostPln: number | null;
  companyKnowledgeHitCount: number;
  averageConfidenceBadge: OfferBoqExplainConfidenceBadge;
  averageConfidenceLabelPl: string;
  bidProposalSourceLabelPl: string | null;
  computedByBidProposalPl: string;
  auditTrail: OfferBoqBidAuditStep[];
}

/** COST-S6 — podsumowanie oferty z Bid Proposal (SSOT). */
export interface OfferBoqOfferSummarySection {
  available: boolean;
  directCostDisplay: string;
  kpDisplay: string;
  ancillaryDisplay: string;
  overheadDisplay: string;
  profitDisplay: string;
  costPriceDisplay: string;
  recommendedBidDisplay: string;
  marginDisplay: string;
  profitabilityDisplay: string;
  costStack: TenderBidCostLine[];
  proposalOk: boolean;
  qualityLabelPl: string | null;
}

/** COST-S7 — panel gotowości oferty (RO). */
export interface OfferBoqOfferReadinessSection {
  available: boolean;
  completenessPct: number;
  qualityScore: number;
  warningCount: number;
  criticalCount: number;
  recommendationCount: number;
  status: OfferBoqReadinessStatus;
  statusLabelPl: string;
}

/** COST-S7 — sekcja jakości AI w Explainability. */
export interface OfferBoqAiQualitySection {
  available: boolean;
  completeness: OfferBoqValidationCompleteness;
  qualityExplainability: OfferBoqQualityExplainability;
  recommendations: OfferBoqValidationRecommendation[];
  topIssues: OfferBoqValidationIssue[];
}

export interface OfferBoqExplainabilityView {
  available: boolean;
  emptyReasonPl: string | null;
  summary: OfferBoqExplainSummary | null;
  lines: OfferBoqExplainLineCard[];
  /** Dokument OfferBoq po pipeline — tylko do odczytu / przyszła edycja. */
  document: OfferBoqDocument | null;
  builtAt: string;
  /** COST-S6 */
  bidImpact: OfferBoqBidImpactSection | null;
  offerSummary: OfferBoqOfferSummarySection | null;
  offerReadiness: OfferBoqOfferReadinessSection | null;
  aiQuality: OfferBoqAiQualitySection | null;
  bidProposal: TenderBidProposal | null;
  /** AI-COST-02-B — dokumenty · Top-5 · założenia (UI tylko gdy flaga ON). */
  cost02b: OfferBoq02bExplainEnrichment | null;
}

export function resolveOfferBoqExplainConfidenceBadge(
  confidence: OfferBoqConfidence,
  requiresUserReview = false,
): OfferBoqExplainConfidenceBadge {
  if (confidence === "low") {
    return { status: "low", emoji: "🔴", labelPl: "Niska pewność" };
  }
  if (confidence === "medium" || requiresUserReview) {
    return { status: "review", emoji: "🟡", labelPl: "Wymaga weryfikacji" };
  }
  return { status: "high", emoji: "🟢", labelPl: "Wysoka pewność" };
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return String(n).replace(".", ",");
}

function formatMoney(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return fmtPln(n);
}

const COST_02B_TOP_K = 5;

/** Pure — Top-5 wpływu + dokumenty + założenia (REUSE dossier / Bid RO / GAP-A status). */
export function buildOfferBoq02bExplainEnrichment(opts: {
  lines: OfferBoqExplainLineCard[];
  item?: TenderPipelineItem | null;
  sourceFilenameHint?: string | null;
  bidProposalAvailable?: boolean;
}): OfferBoq02bExplainEnrichment {
  const dossier = opts.item?.tenderDossier ?? null;
  const scan = dossier?.scanSummary as
    | {
        costDiscovery?: { found?: boolean; type?: string; source?: string; confidence?: number } | null;
        costCandidateSources?: string[] | null;
      }
    | null
    | undefined;
  const sourceFilename =
    opts.sourceFilenameHint ||
    dossier?.kosztorys?.sourceFilename ||
    null;
  const candidates = Array.isArray(scan?.costCandidateSources)
    ? scan!.costCandidateSources!.filter((s) => typeof s === "string" && s.trim())
    : [];
  const discovery = scan?.costDiscovery;
  let discoveryLabelPl: string | null = null;
  if (discovery?.found && discovery.source) {
    discoveryLabelPl = String(discovery.source);
  } else if (discovery?.found && discovery.type) {
    discoveryLabelPl = `Discovery: ${discovery.type}`;
  }

  const totalDirect = opts.lines.reduce((sum, l) => sum + (l.lineDirectPln ?? 0), 0);
  const ranked = [...opts.lines]
    .map((l) => ({
      lineId: l.lineId,
      lp: l.lp,
      description: l.description,
      lineDirectPln: l.lineDirectPln ?? 0,
      lineDirectDisplay: l.lineDirectDisplay,
    }))
    .sort((a, b) => b.lineDirectPln - a.lineDirectPln)
    .slice(0, COST_02B_TOP_K)
    .map((row) => ({
      ...row,
      sharePct:
        totalDirect > 0 && Number.isFinite(row.lineDirectPln)
          ? Math.round((row.lineDirectPln / totalDirect) * 1000) / 10
          : 0,
    }));

  const strategySample =
    opts.lines.find((l) => l.pricingStrategyLabelPl && l.pricingStrategyLabelPl !== "Do ustalenia")
      ?.pricingStrategyLabelPl ?? null;

  const gapOn = isCostBidGap01CatalogCalEnabled();

  return {
    documents: {
      sourceFilename,
      discoveryLabelPl,
      candidateSourcesSample: candidates.slice(0, 5),
      candidatesTotal: candidates.length,
    },
    topImpact: ranked,
    assumptions: {
      aiDirectOnlyPl:
        "Warstwa AI Cost liczy koszt bezpośredni (OfferBoq) — bez Kp, narzutu i marży oferty.",
      mappingNotePl:
        "Pewność mapowania i strategia wyceny pochodzą z silników S2–S3; pozycje o niskiej pewności wymagają weryfikacji.",
      bidLayerPl: opts.bidProposalAvailable
        ? "Cena ofertowa, Kp i marża pochodzą wyłącznie z Bid Proposal (osobna warstwa L2)."
        : "Bid Proposal niedostępny dla tego widoku — założenia stacku oferty pojawią się po wyliczeniu L2.",
      gapAStatusPl: gapOn
        ? "Kalibracja katalogu (GAP-A): włączona (status odczytu — bez przełącznika w tym panelu)."
        : "Kalibracja katalogu (GAP-A): wyłączona (baseline tip).",
      strategySamplePl: strategySample
        ? `Przykładowa strategia pozycji: ${strategySample}.`
        : null,
    },
  };
}

function averageConfidenceFromCounts(
  high: number,
  medium: number,
  low: number,
): OfferBoqConfidence {
  const total = high + medium + low;
  if (total <= 0) return "low";
  // Waga: high=3, medium=2, low=1 — bez nowego silnika, tylko agregat UI
  const score = (high * 3 + medium * 2 + low * 1) / total;
  if (score >= 2.5) return "high";
  if (score >= 1.75) return "medium";
  return "low";
}

function buildCompanyKnowledgeExplainPl(opts: {
  used: boolean;
  occurrenceCount: number;
  lastUsedAt: string | null;
  confidenceBoosted: boolean;
}): string | null {
  if (!opts.used) return null;
  const last =
    opts.lastUsedAt && opts.lastUsedAt.length >= 10
      ? opts.lastUsedAt.slice(0, 10)
      : null;
  return (
    `Wykorzystano wiedzę firmy` +
    ` · podobne przypadki: ${opts.occurrenceCount}` +
    (last ? ` · ostatnie użycie: ${last}` : "") +
    (opts.confidenceBoosted
      ? " · wpływ: podniesiono poziom pewności"
      : " · wpływ: dopasowanie bez podniesienia pewności")
  );
}

function buildControlledMarketExplainPl(opts: {
  used: boolean;
  regionLabelPl: string | null;
  asOf: string | null;
  originCount: number;
  legacyFallbackUsed: boolean;
}): string | null {
  if (!opts.used) return null;
  const asOf =
    opts.asOf && opts.asOf.length >= 10 ? opts.asOf.slice(0, 10) : null;
  return (
    `Kontrolowany benchmark rynkowy (marketQuotes, odczyt)` +
    (opts.regionLabelPl ? ` · region: ${opts.regionLabelPl}` : "") +
    (asOf ? ` · aktualność: ${asOf}` : "") +
    ` · źródeł: ${opts.originCount}` +
    (opts.legacyFallbackUsed ? " · uwaga: legacy seed — weryfikacja" : "")
  );
}

function buildWhyAiDecision(opts: {
  ciRationale: string | null | undefined;
  pricingRationale: string | null | undefined;
  kindLabel: string;
  strategyLabel: string;
  sources: string[];
  companyKnowledgeNotes: string[];
  unpricedGapPl?: string | null;
}): string {
  const parts: string[] = [];
  if (opts.ciRationale?.trim()) {
    parts.push(opts.ciRationale.trim());
  } else {
    parts.push(
      `AI sklasyfikowało pozycję jako „${opts.kindLabel}” i zastosowało strategię: ${opts.strategyLabel}.`,
    );
  }
  if (opts.sources.length) {
    parts.push(`Źródła wyceny: ${opts.sources.join("; ")}.`);
  }
  if (opts.pricingRationale?.trim() && opts.pricingRationale !== opts.ciRationale) {
    parts.push(opts.pricingRationale.trim());
  }
  if (opts.unpricedGapPl?.trim()) {
    parts.push(opts.unpricedGapPl.trim());
  }
  if (opts.companyKnowledgeNotes.length) {
    parts.push(opts.companyKnowledgeNotes.join(" "));
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function buildUnpricedExplainPl(line: {
  catalogWorkId?: string | null;
  linePricing?: { components?: Array<{ unitPricePln: number | null; totalPln: number | null; namePl: string; priceOrigin?: { kind: string; labelPl: string }; aiRationale?: string }> } | null;
}): string | null {
  const comps = line.linePricing?.components ?? [];
  const unpriced = comps.filter(
    (c) => c.unitPricePln == null || !(c.unitPricePln > 0) || c.totalPln == null,
  );
  if (!unpriced.length) return null;
  const names = unpriced.slice(0, 3).map((c) => `„${c.namePl}”`).join(", ");
  const why =
    unpriced[0]?.aiRationale?.trim() ||
    (unpriced[0]?.priceOrigin?.kind === "unknown"
      ? "brak źródła ceny w katalogu / modelu firmy / heurystyce"
      : "niepełna wycena komponentu");
  const action = !line.catalogWorkId
    ? "Dodaj dopasowanie w Bibliotece Robót albo uzupełnij cenę ręcznie."
    : "Uzupełnij brakujące ceny komponentów ręcznie lub zatwierdź po weryfikacji.";
  return `Brak pełnej wyceny (${unpriced.length} komp.: ${names}). Dlaczego: ${why}. Co zrobić: ${action}`;
}

function ancillaryFromStack(lines: TenderBidCostLine[]): number | null {
  const hit = lines.find((l) => /poboczne/i.test(l.label));
  return hit?.pln ?? null;
}

function buildOfferBoqBidViewSections(opts: {
  integration: ReturnType<typeof integrateOfferBoqWithBidProposal>;
}): {
  bidImpact: OfferBoqBidImpactSection | null;
  offerSummary: OfferBoqOfferSummarySection | null;
  offerReadiness: OfferBoqOfferReadinessSection | null;
  aiQuality: OfferBoqAiQualitySection | null;
  bidProposal: TenderBidProposal | null;
} {
  const { integration } = opts;
  if (!integration) {
    return {
      bidImpact: null,
      offerSummary: null,
      offerReadiness: null,
      aiQuality: null,
      bidProposal: null,
    };
  }

  const { proposal, payload, auditTrail, documentWithTotals } = integration;
  const avgBadge = resolveOfferBoqExplainConfidenceBadge(payload.averageConfidence);

  const bidImpact: OfferBoqBidImpactSection = {
    available: true,
    directCostDisplay: formatMoney(documentWithTotals.totals.directPln),
    directCostPln: documentWithTotals.totals.directPln,
    companyKnowledgeHitCount: payload.companyKnowledgeHitCount,
    averageConfidenceBadge: avgBadge,
    averageConfidenceLabelPl: avgBadge.labelPl,
    bidProposalSourceLabelPl: proposal.sourceLabelPl ?? "Bid Proposal",
    computedByBidProposalPl:
      "Kp, narzuty, marża i cena rekomendowana wyliczone wyłącznie przez moduł Bid Proposal (REUSE).",
    auditTrail,
  };

  const ancillaryPln = ancillaryFromStack(proposal.costStack);
  const offerSummary: OfferBoqOfferSummarySection = {
    available: proposal.ok,
    directCostDisplay: formatMoney(documentWithTotals.totals.directPln),
    kpDisplay: formatMoney(documentWithTotals.totals.kpPln),
    ancillaryDisplay: formatMoney(ancillaryPln),
    overheadDisplay: formatMoney(documentWithTotals.totals.overheadPln),
    profitDisplay: formatMoney(documentWithTotals.totals.profitPln),
    costPriceDisplay: formatMoney(documentWithTotals.totals.costPricePln),
    recommendedBidDisplay: formatMoney(documentWithTotals.totals.recommendedBidPln),
    marginDisplay: formatMoney(documentWithTotals.totals.marginPln),
    profitabilityDisplay: formatBidMarginPct(documentWithTotals.totals.profitabilityPct),
    costStack: proposal.costStack,
    proposalOk: proposal.ok,
    qualityLabelPl: proposal.qualityLabelPl ?? null,
  };

  const validation = evaluateOfferBoqValidation({
    doc: documentWithTotals,
    bidProposal: proposal,
    averageConfidence: payload.averageConfidence,
    companyKnowledgeHitCount: payload.companyKnowledgeHitCount,
  });

  const offerReadiness: OfferBoqOfferReadinessSection = {
    available: true,
    completenessPct: validation.summary.completenessPct,
    qualityScore: validation.summary.qualityScore,
    warningCount: validation.summary.warningCount,
    criticalCount: validation.summary.criticalCount,
    recommendationCount: validation.summary.recommendationCount,
    status: validation.summary.status,
    statusLabelPl: validation.summary.statusLabelPl,
  };

  const aiQuality: OfferBoqAiQualitySection = {
    available: true,
    completeness: validation.completeness,
    qualityExplainability: validation.qualityExplainability,
    recommendations: validation.recommendations,
    topIssues: validation.issues.slice(0, 8),
  };

  return { bidImpact, offerSummary, offerReadiness, aiQuality, bidProposal: proposal };
}

/**
 * Prezentacja istniejącego dokumentu OfferBoq (po AI lub po edycji użytkownika).
 */
export function presentOfferBoqExplainabilityView(
  doc: OfferBoqDocument,
  builtAt?: string,
  bidContext?: {
    item: TenderPipelineItem;
    minProjectDays?: number;
    maxConcurrentProjects?: number;
  },
): OfferBoqExplainabilityView {
  const at = builtAt ?? doc.builtAt;
  const normalized = normalizeOfferBoqDocumentForEdit(doc);
  const editStats =
    normalized.userEditStats ?? computeOfferBoqUserEditStats(normalized);

  const lines: OfferBoqExplainLineCard[] = normalized.lines.map((line) => {
    const ci = line.costIntelligence;
    const pricing = line.linePricing;
    const comps = pricing?.components ?? [];
    const requiresReview =
      comps.some((c) => c.requiresUserReview) ||
      pricing?.confidence === "low" ||
      pricing?.confidence === "medium" ||
      ci?.confidence === "low" ||
      ci?.confidence === "medium";
    const lineConf = pricing?.confidence ?? ci?.confidence ?? "low";
    const sourceLabels = Array.from(
      new Set(comps.map((c) => c.priceOrigin.labelPl).filter(Boolean)),
    );

    const componentRows: OfferBoqExplainComponentRow[] = comps.map((c) => {
      const editStatus = c.editStatus ?? "ai_proposal";
      const hint = c.companyKnowledgeHint;
      const used =
        Boolean(hint?.used) || c.priceOrigin.kind === "company_knowledge";
      const occurrenceCount = hint?.occurrenceCount ?? (used ? 1 : 0);
      const lastUsedAt = hint?.lastUsedAt ?? null;
      const confidenceBoosted = Boolean(hint?.confidenceBoosted);
      const marketHint = c.controlledMarketHint;
      const marketUsed =
        Boolean(marketHint?.used) || c.priceOrigin.kind === "controlled_market";
      const marketRegion =
        marketHint?.regionLabelPl ??
        (c.priceOrigin.regionCode ? String(c.priceOrigin.regionCode) : null);
      const marketAsOf = marketHint?.asOf ?? c.priceOrigin.asOf ?? null;
      const marketOriginCount = marketHint?.originCount ?? (marketUsed ? 1 : 0);
      const marketLegacy = Boolean(marketHint?.legacyFallbackUsed);
      return {
        componentId: c.componentId,
        namePl: c.namePl,
        category: c.category,
        categoryLabelPl: OFFER_BOQ_PRICED_CATEGORY_LABELS_PL[c.category] ?? c.category,
        quantity: c.quantity,
        quantityDisplay: formatQty(c.quantity),
        unit: c.unit || "—",
        unitPricePln: c.unitPricePln,
        unitPriceDisplay: formatMoney(c.unitPricePln),
        totalDisplay: formatMoney(c.totalPln),
        sourceKind: c.priceOrigin.kind,
        sourceLabelPl: c.priceOrigin.labelPl,
        confidenceBadge: resolveOfferBoqExplainConfidenceBadge(c.confidence, c.requiresUserReview),
        aiRationale: c.aiRationale,
        requiresUserReview: c.requiresUserReview,
        reviewLabelPl: c.requiresUserReview
          ? "Wymaga weryfikacji użytkownika"
          : "Bez pilnej weryfikacji",
        editStatus,
        editStatusLabelPl: OFFER_BOQ_COMPONENT_EDIT_STATUS_LABELS_PL[editStatus],
        changeHistoryCount: c.changeHistory?.length ?? 0,
        companyKnowledgeUsed: used,
        companyKnowledgeOccurrenceCount: occurrenceCount,
        companyKnowledgeLastUsedAt: lastUsedAt,
        companyKnowledgeConfidenceBoosted: confidenceBoosted,
        companyKnowledgeExplainPl: buildCompanyKnowledgeExplainPl({
          used,
          occurrenceCount,
          lastUsedAt,
          confidenceBoosted,
        }),
        controlledMarketUsed: marketUsed,
        controlledMarketRegionLabelPl: marketRegion,
        controlledMarketAsOf: marketAsOf,
        controlledMarketOriginCount: marketOriginCount,
        controlledMarketExplainPl: buildControlledMarketExplainPl({
          used: marketUsed,
          regionLabelPl: marketRegion,
          asOf: marketAsOf,
          originCount: marketOriginCount,
          legacyFallbackUsed: marketLegacy,
        }),
      };
    });

    const kindLabel = ci?.lineKindLabelPl ?? "Nieznany";
    const strategyLabel = ci?.pricingStrategyLabelPl ?? "Do ustalenia";
    const companyKnowledgeNotes = componentRows
      .map((r) => r.companyKnowledgeExplainPl)
      .filter((x): x is string => Boolean(x));

    return {
      lineId: line.lineId,
      lp: line.lp,
      description: line.description,
      lineKindLabelPl: kindLabel,
      pricingStrategyLabelPl: strategyLabel,
      requiresDecomposition: ci?.requiresDecomposition ?? false,
      decompositionLabelPl: ci?.requiresDecomposition
        ? `Tak — ${ci.decompositionElements.length} elementów`
        : "Nie — jedna pozycja",
      decompositionElementCount: ci?.decompositionElements.length ?? 0,
      componentCount: comps.length,
      confidenceBadge: resolveOfferBoqExplainConfidenceBadge(lineConf, requiresReview),
      sourceLabelsPl: sourceLabels,
      requiresUserReview: requiresReview,
      reviewLabelPl: requiresReview ? "Wymaga weryfikacji użytkownika" : "Bez pilnej weryfikacji",
      whyAiDecisionPl: buildWhyAiDecision({
        ciRationale: ci?.aiRationale,
        pricingRationale: pricing?.aiRationale ?? line.aiRationale,
        kindLabel,
        strategyLabel,
        sources: sourceLabels,
        companyKnowledgeNotes,
        unpricedGapPl: buildUnpricedExplainPl(line),
      }),
      lineDirectDisplay: formatMoney(pricing?.aggregates.lineDirectPln ?? line.directCostPln),
      lineDirectPln: (() => {
        const n = pricing?.aggregates.lineDirectPln ?? line.directCostPln;
        return n != null && Number.isFinite(n) ? n : null;
      })(),
      components: componentRows,
    };
  });

  const reviewRequiredCount = lines.filter((l) => l.requiresUserReview).length;
  const recognizedCount = lines.filter(
    (l) => l.lineKindLabelPl !== "Nieznany / do weryfikacji" && l.lineKindLabelPl !== "Nieznany",
  ).length;
  const decomposedCount =
    normalized.costIntelligenceStats?.decomposedCount ??
    lines.filter((l) => l.requiresDecomposition).length;
  const high = normalized.pricingStats?.highCount ?? 0;
  const medium = normalized.pricingStats?.mediumCount ?? 0;
  const low = normalized.pricingStats?.lowCount ?? 0;
  const avgConf = averageConfidenceFromCounts(high, medium, low);
  const avgBadge = resolveOfferBoqExplainConfidenceBadge(avgConf, reviewRequiredCount > 0);

  const summary: OfferBoqExplainSummary = {
    lineCount: lines.length,
    recognizedCount,
    reviewRequiredCount,
    decomposedCount,
    averageConfidenceLabelPl: avgBadge.labelPl,
    averageConfidenceBadge: avgBadge,
    directCostDisplay: formatMoney(
      normalized.totals.directPln ?? normalized.totals.costPricePln,
    ),
    pricedComponentCount: normalized.pricingStats?.pricedComponentCount ?? 0,
    highCount: high,
    mediumCount: medium,
    lowCount: low,
    approvedCount: editStats.approvedCount,
    changedCount: editStats.changedCount,
    aiOnlyCount: editStats.aiOnlyCount,
    companyKnowledgeHitCount: countCompanyKnowledgeHits(normalized),
  };

  let presentationDoc = normalized;
  let bidSections = {
    bidImpact: null as OfferBoqBidImpactSection | null,
    offerSummary: null as OfferBoqOfferSummarySection | null,
    offerReadiness: null as OfferBoqOfferReadinessSection | null,
    aiQuality: null as OfferBoqAiQualitySection | null,
    bidProposal: null as TenderBidProposal | null,
  };

  if (bidContext) {
    const profile = loadCompanyProfileLocal();
    const dossier = bidContext.item.tenderDossier;
    const integration = integrateOfferBoqWithBidProposal({
      doc: normalized,
      kosztorys: dossier?.kosztorys,
      swz: dossier?.swz ?? null,
      fit: dossier?.fit ?? null,
      costModel: profile.costModel,
      minProjectDays: bidContext.minProjectDays ?? profile.minProjectDays,
      maxConcurrentProjects:
        bidContext.maxConcurrentProjects ?? profile.maxConcurrentProjects,
      builtAt: at,
    });
    bidSections = buildOfferBoqBidViewSections({ integration });
    if (integration) {
      presentationDoc = integration.documentWithTotals;
    }
  }

  return {
    available: true,
    emptyReasonPl: null,
    summary,
    lines,
    document: presentationDoc,
    builtAt: at,
    bidImpact: bidSections.bidImpact,
    offerSummary: bidSections.offerSummary,
    offerReadiness: bidSections.offerReadiness,
    aiQuality: bidSections.aiQuality,
    bidProposal: bidSections.bidProposal,
    cost02b: buildOfferBoq02bExplainEnrichment({
      lines,
      item: bidContext?.item ?? null,
      sourceFilenameHint: presentationDoc.sourceFilename ?? null,
      bidProposalAvailable: Boolean(bidSections.offerSummary?.available),
    }),
  };
}

/**
 * COST-PIPELINE-01 / M1 — budowa OfferBoq (S1–S4) dla pipeline item (REUSE, bez rewrite).
 * Wspólna ścieżka dla panelu Explainability i runtime Bid Outcome.
 */
export function buildOfferBoqDocumentForPipelineItem(opts: {
  item: TenderPipelineItem;
  builtAt?: string;
}): OfferBoqDocument | null {
  const builtAt = opts.builtAt ?? new Date().toISOString();
  // COST-MULTI-02 — OfferBoq z kosztorysForBid (to samo SSOT co Bid).
  const snapshot = resolveKosztorysSnapshotForPricing(opts.item);
  const hasLines =
    (snapshot?.catalogQuantities?.length ?? 0) > 0 || (snapshot?.rows?.length ?? 0) > 0;
  if (!snapshot || !hasLines) return null;

  const store = loadWorkCatalogStoreLocal();
  const works = listActiveWorksForRegion(store, store.activeRegion);
  const profile = loadCompanyProfileLocal();
  const cm01 = isCenyMaterialow01Enabled();

  let doc = buildOfferBoqFromSnapshot({
    tenderId: opts.item.id,
    snapshot,
    builtAt,
  });
  doc = mapOfferBoqDocument(doc, {
    works,
    mappedAt: builtAt,
    documentContext: snapshot.sourceFilename,
    cenyMaterialowUplift: cm01,
  });
  doc = applyOfferBoqCostIntelligence(doc, {
    analyzedAt: builtAt,
    documentContext: snapshot.sourceFilename,
  });
  const knowledgeStore = loadCompanyKnowledgeStoreLocal();
  const hourly = fullyLoadedHourly(profile.costModel);
  /** CM-3: memo wyłącznie w tym buildzie; bez dodatkowego I/O. */
  const marketAverageMemo = cm01 ? new Map<string, MarketAverageResult>() : undefined;
  doc = applyOfferBoqPricing(doc, {
    works,
    costModel: profile.costModel,
    pricedAt: builtAt,
    documentContext: snapshot.sourceFilename,
    leadingProviders: [
      createCompanyKnowledgePriceProvider(knowledgeStore),
      createControlledMarketPriceProvider(works, {
        hourlyPln: hourly,
        startRegionCode: store.activeRegion,
        computedAtIso: builtAt,
        marketAverageMemo,
      }),
    ],
  });
  return doc;
}

export type RuntimeOfferBoqBidResult = {
  document: OfferBoqDocument;
  proposal: TenderBidProposal;
  /** true gdy Bid zasilony OfferBoq (S6) — Bid nie re-aggregate katalogu. */
  usedOfferBoqDirect: true;
};

/**
 * COST-PIPELINE-01 / M1 — OfferBoq → S6 → Bid Proposal (jedna ścieżka Outcome + tab).
 * Zwraca null gdy L1 nie gotowy (direct ≤ 0 / brak linii) — DF: preferuj status, nie milczący catalog.
 */
export function computeRuntimeBidFromOfferBoq(opts: {
  item: TenderPipelineItem;
  swz?: TenderSwzAnalysis | null;
  builtAt?: string;
}): RuntimeOfferBoqBidResult | null {
  const builtAt = opts.builtAt ?? new Date().toISOString();
  const doc = buildOfferBoqDocumentForPipelineItem({ item: opts.item, builtAt });
  if (!doc) return null;

  const profile = loadCompanyProfileLocal();
  const dossier = opts.item.tenderDossier;
  const kosztorysForBid = resolveKosztorysSnapshotForPricing(opts.item);
  const integration = integrateOfferBoqWithBidProposal({
    doc,
    kosztorys: kosztorysForBid,
    swz: opts.swz ?? dossier?.swz ?? null,
    fit: dossier?.fit ?? opts.item.tenderFit ?? null,
    costModel: profile.costModel,
    minProjectDays: profile.minProjectDays,
    maxConcurrentProjects: profile.maxConcurrentProjects,
    builtAt,
  });
  if (!integration) return null;
  if (integration.proposal.pricingMode !== "offer_boq_ai") return null;
  if (!(integration.proposal.recommendedBidPln != null && integration.proposal.recommendedBidPln > 0)) {
    return null;
  }

  return {
    document: integration.documentWithTotals,
    proposal: integration.proposal,
    usedOfferBoqDirect: true,
  };
}

/**
 * Buduje widok Explainability ze snapshotu dossier (call-only silniki S1–S4).
 */
export function buildOfferBoqExplainabilityView(opts: {
  item: TenderPipelineItem;
  builtAt?: string;
}): OfferBoqExplainabilityView {
  const builtAt = opts.builtAt ?? new Date().toISOString();
  const doc = buildOfferBoqDocumentForPipelineItem(opts);
  if (!doc) {
    return {
      available: false,
      emptyReasonPl: "Brak pozycji przedmiaru w dossier — uruchom analizę dokumentów.",
      summary: null,
      lines: [],
      document: null,
      builtAt,
      bidImpact: null,
      offerSummary: null,
      offerReadiness: null,
      aiQuality: null,
      bidProposal: null,
      cost02b: null,
    };
  }

  return presentOfferBoqExplainabilityView(doc, builtAt, { item: opts.item });
}
