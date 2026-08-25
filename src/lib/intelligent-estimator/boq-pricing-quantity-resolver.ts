/**
 * IK S4-B — Pricing quantity resolver (single P7 consumption authority).
 * Consumes S2/S3 metadata — NOT an expression parser.
 */

import type { BoqDependencyGraph } from "@/lib/intelligent-estimator/boq-dependency-graph";
import {
  parseOfferBoqPositionNo,
  quantitiesRoughlyEqual,
  type BoqQuantityIntelligence,
  type QuantityExpressionNode,
} from "@/lib/intelligent-estimator/boq-quantity-intelligence";
import type { OfferBoqConfidence, OfferBoqLine } from "@/lib/tender-offer-boq";

export type BoqPricingQuantitySource = "INGEST_QUANTITY" | "RESOLVED_EXPRESSION";

export type BoqPricingQuantityStatus = "ACCEPTED" | "FALLBACK" | "HOLD";

export type BoqPricingQuantityGapCode = "BOQ_QUANTITY_HOLD";

export type BoqPricingQuantityResolution = {
  pricingQuantity: number | null;
  source: BoqPricingQuantitySource;
  status: BoqPricingQuantityStatus;
  confidence: OfferBoqConfidence | null;
  reason: string | null;
  holdReason: string | null;
  gapCode: BoqPricingQuantityGapCode | null;
  originalQuantity: number;
  resolvedTotal: number | null;
  expression: QuantityExpressionNode | null;
};

export type ResolveBoqPricingQuantityInput = {
  line: OfferBoqLine;
  lineIndex?: number;
  dependencyGraph?: BoqDependencyGraph | null;
};

function holdResolution(
  line: OfferBoqLine,
  intel: BoqQuantityIntelligence | null | undefined,
  holdReason: string,
): BoqPricingQuantityResolution {
  return {
    pricingQuantity: null,
    source: "INGEST_QUANTITY",
    status: "HOLD",
    confidence: intel?.evidence.confidence ?? null,
    reason: holdReason,
    holdReason,
    gapCode: "BOQ_QUANTITY_HOLD",
    originalQuantity: line.quantity,
    resolvedTotal: intel?.resolvedTotal ?? null,
    expression: intel?.expression ?? null,
  };
}

function ingestFallback(line: OfferBoqLine, reason: string): BoqPricingQuantityResolution {
  const q = Number.isFinite(line.quantity) && line.quantity >= 0 ? line.quantity : null;
  return {
    pricingQuantity: q,
    source: "INGEST_QUANTITY",
    status: "FALLBACK",
    confidence: null,
    reason,
    holdReason: null,
    gapCode: null,
    originalQuantity: line.quantity,
    resolvedTotal: null,
    expression: null,
  };
}

function dependencyIntegrityHold(
  line: OfferBoqLine,
  intel: BoqQuantityIntelligence,
  positionNo: number,
  graph: BoqDependencyGraph | null | undefined,
): BoqPricingQuantityResolution | null {
  if (!graph) return null;

  if (graph.unresolvedPositions.includes(positionNo)) {
    return holdResolution(line, intel, "S3 unresolved position in dependency graph");
  }

  for (const cycle of graph.cycles) {
    if (cycle.includes(positionNo)) {
      return holdResolution(line, intel, "S3 cycle in dependency graph");
    }
  }

  for (const dep of intel.dependencyPositions ?? []) {
    if (graph.unresolvedPositions.includes(dep)) {
      return holdResolution(line, intel, "S3 upstream dependency unresolved");
    }
  }

  for (const rel of line.boqSemanticRelations ?? []) {
    if (rel.state === "REQUIRES_OWNER" || rel.state === "REQUIRES_EXPERT") {
      return holdResolution(line, intel, `S3 relation ${rel.relation} requires review`);
    }
  }

  return null;
}

function expressionRequiresHold(intel: BoqQuantityIntelligence): string | null {
  if (intel.evidence.unresolvedReason === "CYCLE") return "S2 quantity cycle";
  if ((intel.unresolvedRefs?.length ?? 0) > 0) return "S2 unresolved position reference";
  if (intel.pricingHold === "REQUIRES_EXPERT") return "S2 pricing hold REQUIRES_EXPERT";
  if (intel.pricingHold === "REQUIRES_OWNER") return "S2 pricing hold REQUIRES_OWNER";
  if (intel.multiplierNote) return "S2 multiplier REQUIRES_CONTEXT";
  if (intel.expression.kind === "MULTIPLIER") return "S2 MULTIPLIER REQUIRES_CONTEXT";
  if (intel.expression.kind === "UNRESOLVED") return "S2 unresolved expression";
  if (intel.evidence.computationType === "UNRESOLVED") return "S2 unresolved computation";
  return null;
}

/**
 * Decide pricing quantity for P7 shadow adapter (does not mutate OfferBoqLine).
 */
export function resolveBoqPricingQuantity(
  input: ResolveBoqPricingQuantityInput,
): BoqPricingQuantityResolution {
  const { line } = input;
  const intel = line.quantityIntelligence ?? null;
  const index = input.lineIndex ?? 0;
  const positionNo = parseOfferBoqPositionNo(line.lp, index);

  if (!intel) {
    return ingestFallback(line, "No quantityIntelligence — ingest quantity");
  }

  const exprHold = expressionRequiresHold(intel);
  if (exprHold) {
    return holdResolution(line, intel, exprHold);
  }

  const depHold = dependencyIntegrityHold(line, intel, positionNo, input.dependencyGraph);
  if (depHold) return depHold;

  const resolved = intel.resolvedTotal;
  if (resolved == null || !Number.isFinite(resolved) || resolved < 0) {
    return ingestFallback(line, "resolvedTotal absent — ingest fallback");
  }

  const confidence = intel.evidence.confidence;
  const ingestQty = line.quantity;

  if (ingestQty > 0 && !quantitiesRoughlyEqual(resolved, ingestQty)) {
    return holdResolution(
      line,
      intel,
      "resolvedTotal materially differs from ingest quantity",
    );
  }

  if (confidence !== "high") {
    if (ingestQty > 0 && quantitiesRoughlyEqual(resolved, ingestQty)) {
      return {
        pricingQuantity: resolved,
        source: "RESOLVED_EXPRESSION",
        status: "ACCEPTED",
        confidence,
        reason: "resolvedTotal matches ingest; confidence below high but consistent",
        holdReason: null,
        gapCode: null,
        originalQuantity: ingestQty,
        resolvedTotal: resolved,
        expression: intel.expression,
      };
    }
    return ingestFallback(line, "resolvedTotal present but confidence not high — ingest fallback");
  }

  return {
    pricingQuantity: resolved,
    source: "RESOLVED_EXPRESSION",
    status: "ACCEPTED",
    confidence,
    reason: "resolvedTotal HIGH confidence and consistent with ingest",
    holdReason: null,
    gapCode: null,
    originalQuantity: ingestQty,
    resolvedTotal: resolved,
    expression: intel.expression,
  };
}
