/**
 * NG-TENDERS-COST-KNOWLEDGE-01 A0 — KPI buckets (DF · COND-2/3/4).
 * Pure classification — bez I/O.
 */

import {
  deriveKnowledgeConfidence,
  deriveOverallConfidence,
  derivePriceConfidence,
  isKnowledgeKpiQualified,
  type CostKnowledgeConfidenceLevel,
} from "@/lib/cost-knowledge/confidence";

/** TV-01 / harness buckets (D-CK-4). */
export type CostKnowledgeKpiBucket =
  | "knowledge_qualified"
  | "heuristic_priced"
  | "unmapped";

export interface CostKnowledgeLineKpiInput {
  lineId?: string;
  catalogWorkId?: string | null;
  matchMethod?: string | null;
  matchConfidence?: CostKnowledgeConfidenceLevel | null;
  isNoise?: boolean;
  /** Dominant / first component price origin kind. */
  priceOriginKind?: string | null;
  hasPositiveUnitPrice?: boolean;
  snapshotConfidence01?: number | null;
  coverage?: "full" | "partial" | "indicative" | null;
  freshness?: "fresh" | "stale" | "missing" | "ok" | null;
}

export interface CostKnowledgeLineKpiResult {
  bucket: CostKnowledgeKpiBucket;
  knowledge: CostKnowledgeConfidenceLevel;
  price: CostKnowledgeConfidenceLevel;
  overall: CostKnowledgeConfidenceLevel;
  kpiQualified: boolean;
  priceOriginKind: string;
}

export function classifyCostKnowledgeLineKpi(
  input: CostKnowledgeLineKpiInput,
): CostKnowledgeLineKpiResult {
  const priceOriginKind = input.priceOriginKind ?? "unknown";
  const knowledge = deriveKnowledgeConfidence({
    matchMethod: input.matchMethod,
    matchConfidence: input.matchConfidence,
    catalogWorkId: input.catalogWorkId,
    isNoise: input.isNoise,
  });
  const price = derivePriceConfidence({
    priceOriginKind,
    hasPositiveUnitPrice: input.hasPositiveUnitPrice,
    snapshotConfidence01: input.snapshotConfidence01,
    coverage: input.coverage,
    freshness: input.freshness,
  });
  const overall = deriveOverallConfidence({
    knowledge,
    price,
    priceOriginKind,
  });
  const kpiQualified = isKnowledgeKpiQualified({ overall, priceOriginKind });

  let bucket: CostKnowledgeKpiBucket;
  if (!input.catalogWorkId && (input.matchMethod === "unmatched" || !input.matchMethod)) {
    bucket = "unmapped";
  } else if (kpiQualified) {
    bucket = "knowledge_qualified";
  } else if (input.hasPositiveUnitPrice) {
    bucket = "heuristic_priced";
  } else if (!input.catalogWorkId) {
    bucket = "unmapped";
  } else {
    bucket = "heuristic_priced";
  }

  return {
    bucket,
    knowledge,
    price,
    overall,
    kpiQualified,
    priceOriginKind,
  };
}

export interface CostKnowledgeKpiSummary {
  totalLines: number;
  knowledgeQualified: number;
  heuristicPriced: number;
  unmapped: number;
  knowledgeQualifiedPct: number;
  /** Quotes-style hit proxy: knowledge_qualified / total (round 1 decimal). */
  coveragePct: number;
}

export function summarizeCostKnowledgeKpi(
  rows: CostKnowledgeLineKpiResult[],
): CostKnowledgeKpiSummary {
  const totalLines = rows.length;
  let knowledgeQualified = 0;
  let heuristicPriced = 0;
  let unmapped = 0;
  for (const r of rows) {
    if (r.bucket === "knowledge_qualified") knowledgeQualified += 1;
    else if (r.bucket === "unmapped") unmapped += 1;
    else heuristicPriced += 1;
  }
  const knowledgeQualifiedPct =
    totalLines > 0 ? Math.round((knowledgeQualified / totalLines) * 1000) / 10 : 0;
  return {
    totalLines,
    knowledgeQualified,
    heuristicPriced,
    unmapped,
    knowledgeQualifiedPct,
    coveragePct: knowledgeQualifiedPct,
  };
}

/** Baseline tip Quotes coverage (CATALOG-COVERAGE P0e) — regression floor for A0 live. */
export const COST_KNOWLEDGE_TV01_BASELINE = {
  totalLines: 2228,
  quotesHit: 1741,
  quotesPct: 78.1,
} as const;
