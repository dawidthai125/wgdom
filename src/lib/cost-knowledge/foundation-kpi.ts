/**
 * NG-TENDERS-KNOWLEDGE-FOUNDATION-01 — Foundation line classify (TS-A0).
 * EXTEND FIRST: wraps Cost Knowledge A0 KPI + Decision Policy + RULE-C1.
 * Nie zmienia semantyki `classifyCostKnowledgeLineKpi` (CK-01 CLOSED).
 */

import {
  checkLibraryMarketCompatibility,
  type LibraryMarketC1Result,
} from "@/lib/cost-knowledge/compatibility-c1";
import {
  evaluateFoundationDecisionPolicy,
  type FoundationDecisionResult,
} from "@/lib/cost-knowledge/decision-policy";
import {
  classifyCostKnowledgeLineKpi,
  type CostKnowledgeKpiBucket,
  type CostKnowledgeLineKpiInput,
  type CostKnowledgeLineKpiResult,
} from "@/lib/cost-knowledge/kpi-buckets";

export interface FoundationLineKpiInput extends CostKnowledgeLineKpiInput {
  /** Library active flag (default true when catalogWorkId set). */
  libraryWorkActive?: boolean;
}

export interface FoundationLineKpiResult extends CostKnowledgeLineKpiResult {
  /** Bucket after Decision & C1 gate (may demote knowledge_qualified). */
  foundationBucket: CostKnowledgeKpiBucket;
  foundationQualified: boolean;
  compatibility: LibraryMarketC1Result;
  decision: FoundationDecisionResult;
}

function demoteFromQualified(input: FoundationLineKpiInput): CostKnowledgeKpiBucket {
  if (!input.catalogWorkId && (input.matchMethod === "unmatched" || !input.matchMethod)) {
    return "unmapped";
  }
  if (input.hasPositiveUnitPrice) return "heuristic_priced";
  if (!input.catalogWorkId) return "unmapped";
  return "heuristic_priced";
}

/**
 * Classify line with Confidence (A0) + RULE-C1 + Decision Policy.
 */
export function classifyFoundationKnowledgeLine(
  input: FoundationLineKpiInput,
): FoundationLineKpiResult {
  const base = classifyCostKnowledgeLineKpi(input);
  const compatibility = checkLibraryMarketCompatibility({
    libraryWorkId: input.catalogWorkId,
    libraryWorkActive: input.libraryWorkActive,
    priceOriginKind: base.priceOriginKind,
    freshness: input.freshness,
    hasPositiveUnitPrice: input.hasPositiveUnitPrice,
  });
  const decision = evaluateFoundationDecisionPolicy({
    knowledge: base.knowledge,
    price: base.price,
    overall: base.overall,
    priceOriginKind: base.priceOriginKind,
    compatibilityStatus: compatibility.status,
    compatibilityReasons: compatibility.reasons,
  });

  let foundationBucket: CostKnowledgeKpiBucket = base.bucket;
  if (decision.mayKnowledgeQualify) {
    foundationBucket = "knowledge_qualified";
  } else if (base.bucket === "knowledge_qualified" || base.kpiQualified) {
    foundationBucket = demoteFromQualified(input);
  }

  return {
    ...base,
    foundationBucket,
    foundationQualified: decision.mayKnowledgeQualify,
    compatibility,
    decision,
  };
}
