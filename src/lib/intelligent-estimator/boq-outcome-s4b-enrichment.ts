/**
 * IK S6-A — Outcome Bid S2/S3 enrichment before existing S4-B cutover.
 *
 * Feeds the SAME OfferBoq instance used by computeRuntimeBidFromOfferBoq
 * with quantityIntelligence + dependency graph so resolveBoqPricingQuantity
 * receives the data it already expects.
 *
 * Does NOT change resolveBoqPricingQuantity semantics.
 * Does NOT invent a second HOLD/FALLBACK/ACCEPTED policy.
 */

import { enrichOfferBoqLinesWithQuantityIntelligence } from "@/lib/intelligent-estimator/boq-quantity-intelligence";
import {
  enrichOfferBoqLinesWithDependencyGraph,
  type BoqDependencyGraph,
} from "@/lib/intelligent-estimator/boq-dependency-graph";
import type { OfferBoqDocument, OfferBoqLine } from "@/lib/tender-offer-boq";

export type OutcomeS4bEnrichmentResult = {
  document: OfferBoqDocument;
  boqDependencyGraph: BoqDependencyGraph;
};

/**
 * Guardrail (existing S2 contract only):
 * If quantityExpressionRaw is present but intel is still missing after bulk enrich
 * (e.g. positionNo collision), re-run S2 on that single line so S4-B can HOLD
 * instead of silent ingest FALLBACK.
 */
function ensureExpressionIntelViaExistingS2(lines: OfferBoqLine[]): OfferBoqLine[] {
  return lines.map((line) => {
    const expr = String(line.quantityExpressionRaw ?? "").trim();
    if (!expr || line.quantityIntelligence != null) return line;
    const solo = enrichOfferBoqLinesWithQuantityIntelligence([line]);
    return solo[0] ?? line;
  });
}

/**
 * S2 quantity intelligence → S3 dependency graph on Outcome OfferBoq.
 * Preserves lineId / line identity of the Outcome document.
 */
export function enrichOfferBoqDocumentForOutcomeS4b(
  doc: OfferBoqDocument,
): OutcomeS4bEnrichmentResult {
  const qtyLines = enrichOfferBoqLinesWithQuantityIntelligence(doc.lines ?? []);
  const guarded = ensureExpressionIntelViaExistingS2(qtyLines);
  const { lines, graph } = enrichOfferBoqLinesWithDependencyGraph(guarded);
  return {
    document: {
      ...doc,
      lines,
    },
    boqDependencyGraph: graph,
  };
}
