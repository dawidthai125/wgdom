/**
 * AI-COST-01 / COST-S4.1 — Explainability ViewModel (pure, read-only).
 * Orkiestracja istniejących silników S1–S4 — bez zmiany ich logiki, bez edycji.
 */

import { fmtPln } from "@/lib/tenders-bzp-swz";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import { buildOfferBoqFromSnapshot, type OfferBoqConfidence, type OfferBoqDocument } from "@/lib/tender-offer-boq";
import { mapOfferBoqDocument } from "@/lib/tender-offer-boq-mapping";
import { applyOfferBoqCostIntelligence } from "@/lib/tender-offer-boq-cost-intelligence";
import {
  applyOfferBoqPricing,
  OFFER_BOQ_PRICED_CATEGORY_LABELS_PL,
} from "@/lib/tender-offer-boq-pricing-engine";

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
  categoryLabelPl: string;
  quantityDisplay: string;
  unit: string;
  unitPriceDisplay: string;
  totalDisplay: string;
  sourceLabelPl: string;
  confidenceBadge: OfferBoqExplainConfidenceBadge;
  aiRationale: string;
  requiresUserReview: boolean;
  reviewLabelPl: string;
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
}

export interface OfferBoqExplainabilityView {
  available: boolean;
  emptyReasonPl: string | null;
  summary: OfferBoqExplainSummary | null;
  lines: OfferBoqExplainLineCard[];
  /** Dokument OfferBoq po pipeline — tylko do odczytu / przyszła edycja. */
  document: OfferBoqDocument | null;
  builtAt: string;
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

function buildWhyAiDecision(opts: {
  ciRationale: string | null | undefined;
  pricingRationale: string | null | undefined;
  kindLabel: string;
  strategyLabel: string;
  sources: string[];
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
  return parts.join(" ").replace(/\s+/g, " ").trim();
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
  doc = applyOfferBoqPricing(doc, {
    works,
    costModel: profile.costModel,
    pricedAt: builtAt,
    documentContext: snapshot.sourceFilename,
  });

  const lines: OfferBoqExplainLineCard[] = doc.lines.map((line) => {
    const ci = line.costIntelligence;
    const pricing = line.linePricing;
    const comps = pricing?.components ?? [];
    const requiresReview =
      comps.some((c) => c.requiresUserReview) ||
      (pricing?.confidence === "low" || pricing?.confidence === "medium") ||
      (ci?.confidence === "low" || ci?.confidence === "medium");
    const lineConf = pricing?.confidence ?? ci?.confidence ?? "low";
    const sourceLabels = Array.from(
      new Set(comps.map((c) => c.priceOrigin.labelPl).filter(Boolean)),
    );

    const componentRows: OfferBoqExplainComponentRow[] = comps.map((c) => ({
      componentId: c.componentId,
      namePl: c.namePl,
      categoryLabelPl: OFFER_BOQ_PRICED_CATEGORY_LABELS_PL[c.category] ?? c.category,
      quantityDisplay: formatQty(c.quantity),
      unit: c.unit || "—",
      unitPriceDisplay: formatMoney(c.unitPricePln),
      totalDisplay: formatMoney(c.totalPln),
      sourceLabelPl: c.priceOrigin.labelPl,
      confidenceBadge: resolveOfferBoqExplainConfidenceBadge(c.confidence, c.requiresUserReview),
      aiRationale: c.aiRationale,
      requiresUserReview: c.requiresUserReview,
      reviewLabelPl: c.requiresUserReview ? "Wymaga weryfikacji użytkownika" : "Bez pilnej weryfikacji",
    }));

    const kindLabel = ci?.lineKindLabelPl ?? "Nieznany";
    const strategyLabel = ci?.pricingStrategyLabelPl ?? "Do ustalenia";

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
      }),
      lineDirectDisplay: formatMoney(pricing?.aggregates.lineDirectPln ?? line.directCostPln),
      components: componentRows,
    };
  });

  const reviewRequiredCount = lines.filter((l) => l.requiresUserReview).length;
  const recognizedCount = lines.filter(
    (l) => l.lineKindLabelPl !== "Nieznany / do weryfikacji" && l.lineKindLabelPl !== "Nieznany",
  ).length;
  const decomposedCount = doc.costIntelligenceStats?.decomposedCount ??
    lines.filter((l) => l.requiresDecomposition).length;
  const high = doc.pricingStats?.highCount ?? 0;
  const medium = doc.pricingStats?.mediumCount ?? 0;
  const low = doc.pricingStats?.lowCount ?? 0;
  const avgConf = averageConfidenceFromCounts(high, medium, low);
  const avgBadge = resolveOfferBoqExplainConfidenceBadge(avgConf, reviewRequiredCount > 0);

  const summary: OfferBoqExplainSummary = {
    lineCount: lines.length,
    recognizedCount,
    reviewRequiredCount,
    decomposedCount,
    averageConfidenceLabelPl: avgBadge.labelPl,
    averageConfidenceBadge: avgBadge,
    directCostDisplay: formatMoney(doc.totals.directPln ?? doc.totals.costPricePln),
    pricedComponentCount: doc.pricingStats?.pricedComponentCount ?? 0,
    highCount: high,
    mediumCount: medium,
    lowCount: low,
  };

  return {
    available: true,
    emptyReasonPl: null,
    summary,
    lines,
    document: doc,
    builtAt,
  };
}
