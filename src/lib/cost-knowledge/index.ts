/**
 * NG-TENDERS-COST-KNOWLEDGE-01 — Knowledge Engine v1 helpers (Thin Slice A0).
 */

export {
  KPI_QUALIFIED_PRICE_ORIGINS,
  KPI_DENIED_PRICE_ORIGINS,
  deriveKnowledgeConfidence,
  derivePriceConfidence,
  deriveOverallConfidence,
  isKnowledgeKpiQualified,
  isKpiQualifiedPriceOrigin,
  mapNumericToConfidence,
  minConfidence,
  type CostKnowledgeConfidenceLevel,
  type KpiQualifiedPriceOrigin,
} from "@/lib/cost-knowledge/confidence";

export {
  classifyCostKnowledgeLineKpi,
  summarizeCostKnowledgeKpi,
  COST_KNOWLEDGE_TV01_BASELINE,
  type CostKnowledgeKpiBucket,
  type CostKnowledgeLineKpiInput,
  type CostKnowledgeLineKpiResult,
  type CostKnowledgeKpiSummary,
} from "@/lib/cost-knowledge/kpi-buckets";

export {
  COST_KNOWLEDGE_A1_SEED_WORKS,
  COST_KNOWLEDGE_A1_SEED_IDS,
  COST_KNOWLEDGE_A1_BANNED_BARE,
  assertCostKnowledgeA1KeywordHygiene,
  type CostKnowledgeA1WorkSpec,
} from "@/lib/cost-knowledge/a1-seed-specs";
