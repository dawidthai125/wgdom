/**
 * AI-COST-01 / COST-S4.1 — Explainability ViewModel (pure, read-only).
 * Orkiestracja istniejących silników S1–S4 — bez zmiany ich logiki, bez edycji.
 */

import { fmtPln } from "@/lib/tenders-bzp-swz";
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

function buildWhyAiDecision(opts: {
  ciRationale: string | null | undefined;
  pricingRationale: string | null | undefined;
  kindLabel: string;
  strategyLabel: string;
  sources: string[];
  companyKnowledgeNotes: string[];
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
  if (opts.companyKnowledgeNotes.length) {
    parts.push(opts.companyKnowledgeNotes.join(" "));
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
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
      }),
      lineDirectDisplay: formatMoney(pricing?.aggregates.lineDirectPln ?? line.directCostPln),
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
      minProjectDays: bidContext.minProjectDays ?? 14,
      maxConcurrentProjects: bidContext.maxConcurrentProjects ?? 2,
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
  const snapshot = opts.item.tenderDossier?.kosztorys;
  const hasLines =
    (snapshot?.catalogQuantities?.length ?? 0) > 0 || (snapshot?.rows?.length ?? 0) > 0;

  if (!snapshot || !hasLines) {
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
    };
  }

  const store = loadWorkCatalogStoreLocal();
  const works = listActiveWorksForRegion(store, store.activeRegion);
  const profile = loadCompanyProfileLocal();

  let doc = buildOfferBoqFromSnapshot({
    tenderId: opts.item.id,
    snapshot,
    builtAt,
  });
  doc = mapOfferBoqDocument(doc, {
    works,
    mappedAt: builtAt,
    documentContext: snapshot.sourceFilename,
  });
  doc = applyOfferBoqCostIntelligence(doc, {
    analyzedAt: builtAt,
    documentContext: snapshot.sourceFilename,
  });
  const knowledgeStore = loadCompanyKnowledgeStoreLocal();
  doc = applyOfferBoqPricing(doc, {
    works,
    costModel: profile.costModel,
    pricedAt: builtAt,
    documentContext: snapshot.sourceFilename,
    leadingProviders: [createCompanyKnowledgePriceProvider(knowledgeStore)],
  });

  return presentOfferBoqExplainabilityView(doc, builtAt, { item: opts.item });
}
