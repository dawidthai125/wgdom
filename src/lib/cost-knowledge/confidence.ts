/**
 * NG-TENDERS-COST-KNOWLEDGE-01 — Confidence Model v1 (DF D-CK-5 · COND-3).
 * Pure: Knowledge / Price / Overall — bez I/O.
 */

export type CostKnowledgeConfidenceLevel = "high" | "medium" | "low";

/** Origin kinds allowed for KPI „auto-wycenione” (D-CK-4 / allowlist). */
export const KPI_QUALIFIED_PRICE_ORIGINS = [
  "work_catalog",
  "controlled_market",
  "company_knowledge",
] as const;

export type KpiQualifiedPriceOrigin = (typeof KPI_QUALIFIED_PRICE_ORIGINS)[number];

/** Denied for KPI (fallback / unknown). */
export const KPI_DENIED_PRICE_ORIGINS = [
  "heuristic",
  "company_model",
  "unknown",
  "external_future",
  "category_rate",
] as const;

export function isKpiQualifiedPriceOrigin(kind: string | null | undefined): boolean {
  if (!kind) return false;
  return (KPI_QUALIFIED_PRICE_ORIGINS as readonly string[]).includes(kind);
}

export function minConfidence(
  a: CostKnowledgeConfidenceLevel,
  b: CostKnowledgeConfidenceLevel,
): CostKnowledgeConfidenceLevel {
  const rank = { low: 0, medium: 1, high: 2 } as const;
  return rank[a] <= rank[b] ? a : b;
}

export function mapNumericToConfidence(value: number | null | undefined): CostKnowledgeConfidenceLevel {
  if (value == null || !Number.isFinite(value)) return "low";
  if (value >= 0.75) return "high";
  if (value >= 0.5) return "medium";
  return "low";
}

/**
 * Knowledge Confidence — pewność tożsamości / mapowania linii → Work.
 */
export function deriveKnowledgeConfidence(input: {
  matchMethod?: string | null;
  matchConfidence?: CostKnowledgeConfidenceLevel | null;
  catalogWorkId?: string | null;
  isNoise?: boolean;
}): CostKnowledgeConfidenceLevel {
  if (input.isNoise) return "low";
  if (!input.catalogWorkId) return "low";
  const method = (input.matchMethod ?? "unmatched").toLowerCase();
  if (method === "unmatched" || method === "none") return "low";
  if (input.matchConfidence === "high" || input.matchConfidence === "medium" || input.matchConfidence === "low") {
    return input.matchConfidence;
  }
  if (method === "alias" || method === "knr" || method === "exact") return "high";
  if (method === "core" || method === "keyword" || method === "fuzzy") return "medium";
  return "medium";
}

/**
 * Price Confidence — pewność obserwacji / ceny (origin + freshness + snapshot).
 * Firm price (work_catalog) bez Quotes → medium gdy companyPrice obecny.
 */
export function derivePriceConfidence(input: {
  priceOriginKind?: string | null;
  hasPositiveUnitPrice?: boolean;
  snapshotConfidence01?: number | null;
  coverage?: "full" | "partial" | "indicative" | null;
  freshness?: "fresh" | "stale" | "missing" | "ok" | null;
}): CostKnowledgeConfidenceLevel {
  const kind = input.priceOriginKind ?? "unknown";
  if (!input.hasPositiveUnitPrice) return "low";
  if ((KPI_DENIED_PRICE_ORIGINS as readonly string[]).includes(kind) && kind !== "category_rate") {
    return "low";
  }
  if (kind === "category_rate") return "low";

  let level: CostKnowledgeConfidenceLevel = mapNumericToConfidence(input.snapshotConfidence01);
  if (input.snapshotConfidence01 == null) {
    if (kind === "controlled_market") level = "medium";
    else if (kind === "work_catalog" || kind === "company_knowledge") level = "medium";
    else level = "low";
  }

  if (input.coverage === "indicative") level = minConfidence(level, "medium");
  if (input.coverage === "partial") level = minConfidence(level, level === "high" ? "medium" : level);

  const fresh = input.freshness;
  if (fresh === "stale" || fresh === "missing") level = minConfidence(level, "low");
  if (fresh === "ok" || fresh === "fresh") {
    /* no demote */
  }

  return level;
}

/**
 * Overall Confidence — D-CK-5: low jeśli Knowledge LUB Price = low;
 * high tylko gdy obie ≥ medium i origin allowlist.
 */
export function deriveOverallConfidence(input: {
  knowledge: CostKnowledgeConfidenceLevel;
  price: CostKnowledgeConfidenceLevel;
  priceOriginKind?: string | null;
}): CostKnowledgeConfidenceLevel {
  const base = minConfidence(input.knowledge, input.price);
  if (!isKpiQualifiedPriceOrigin(input.priceOriginKind)) {
    return "low";
  }
  if (base === "low") return "low";
  if (input.knowledge === "high" && input.price === "high") return "high";
  return "medium";
}

/** KPI: Overall ≥ medium AND allowlist origin. */
export function isKnowledgeKpiQualified(input: {
  overall: CostKnowledgeConfidenceLevel;
  priceOriginKind?: string | null;
}): boolean {
  if (!isKpiQualifiedPriceOrigin(input.priceOriginKind)) return false;
  return input.overall === "high" || input.overall === "medium";
}
