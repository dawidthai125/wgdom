/**
 * Confidence MVP — zbieranie metryk RO z OfferBoq / dossier (call-only).
 * Zero mutacji dokumentu / Bid / Quotes.
 */

import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import type { TenderBidProposal } from "@/lib/tenders-bid-calculator";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import type { SmartPricingDetectSummary } from "@/lib/smart-pricing/types";
import type { ConfidenceMvpInput } from "./types";

export function countOfferBoqConfidenceLineMetrics(doc: OfferBoqDocument): {
  lineCount: number;
  mappedCount: number;
  quotesPricedCount: number;
} {
  let mappedCount = 0;
  let quotesPricedCount = 0;
  for (const line of doc.lines) {
    if (line.catalogWorkId) mappedCount += 1;
    const comps = line.linePricing?.components ?? [];
    if (comps.some((c) => c.priceOrigin?.kind === "controlled_market")) {
      quotesPricedCount += 1;
    }
  }
  return {
    lineCount: doc.lines.length,
    mappedCount,
    quotesPricedCount,
  };
}

export function resolveHasKosztorysSnapshot(item: TenderPipelineItem): boolean {
  return Boolean(item.tenderDossier?.kosztorys?.ok);
}

export function resolveHasSwzSignal(item: TenderPipelineItem): boolean {
  if (item.swzAnalysis) return true;
  if (item.bzpDocuments?.some((d) => d.isSwzHint)) return true;
  return false;
}

export function mapAveragePricingConfidence(
  badgeStatus: "high" | "review" | "low" | string | null | undefined,
): ConfidenceMvpInput["averagePricingConfidence"] {
  if (badgeStatus === "high") return "high";
  if (badgeStatus === "low") return "low";
  if (badgeStatus === "review" || badgeStatus === "medium") return "medium";
  return null;
}

export function buildConfidenceMvpInput(opts: {
  doc: OfferBoqDocument;
  item: TenderPipelineItem;
  s7QualityScore: number | null;
  averagePricingConfidence: ConfidenceMvpInput["averagePricingConfidence"];
  smart: SmartPricingDetectSummary | null;
  bidProposal: TenderBidProposal | null;
  computedAtIso: string;
}): ConfidenceMvpInput {
  const metrics = countOfferBoqConfidenceLineMetrics(opts.doc);
  const smart = opts.smart;
  const bid = opts.bidProposal;
  return {
    lineCount: metrics.lineCount,
    mappedCount: metrics.mappedCount,
    quotesPricedCount: metrics.quotesPricedCount,
    s7QualityScore: opts.s7QualityScore,
    averagePricingConfidence: opts.averagePricingConfidence,
    smartMissingCount: smart ? smart.missingCount : null,
    smartMissingUnmappedCount: smart ? (smart.byReason.unmapped ?? 0) : null,
    bidOk: bid ? bid.ok : null,
    bidWarningCount: bid ? bid.warnings.length : null,
    hasKosztorysSnapshot: resolveHasKosztorysSnapshot(opts.item),
    hasSwzSignal: resolveHasSwzSignal(opts.item),
    computedAtIso: opts.computedAtIso,
  };
}
