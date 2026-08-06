/**
 * NG-TENDERS-COST-KNOWLEDGE-01 + FOUNDATION-01 — Knowledge Engine helpers.
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

export {
  checkLibraryMarketCompatibility,
  isC1Compatible,
  type KnowledgeCompatibilityStatus,
  type LibraryMarketC1Input,
  type LibraryMarketC1Result,
} from "@/lib/cost-knowledge/compatibility-c1";

export {
  evaluateFoundationDecisionPolicy,
  type FoundationDecisionKind,
  type FoundationDecisionInput,
  type FoundationDecisionResult,
} from "@/lib/cost-knowledge/decision-policy";

export {
  classifyFoundationKnowledgeLine,
  type FoundationLineKpiInput,
  type FoundationLineKpiResult,
} from "@/lib/cost-knowledge/foundation-kpi";

export {
  summarizeKnowledgeHealth,
  type KnowledgeHealthSnapshot,
} from "@/lib/cost-knowledge/health";

export {
  COST_KNOWLEDGE_BANNED_BARE_TOKENS,
  assertKeywordHygieneSpec,
  assertMultiWordKeywords,
  assertNoBannedBareInSurface,
  foldPlToken,
} from "@/lib/cost-knowledge/keyword-hygiene";

export {
  FOUNDATION_A1_SEED_WORKS,
  FOUNDATION_A1_SEED_IDS,
  assertFoundationA1KeywordHygiene,
  assertAllFoundationA1Hygiene,
  type FoundationA1WorkSpec,
} from "@/lib/cost-knowledge/foundation-a1-seed-specs";

export {
  FOUNDATION_FALSE_MAP_PROBES,
  isFalseMapBareProbe,
  assertFalseMapProbeProtected,
  type FalseMapProbe,
} from "@/lib/cost-knowledge/match-depth";
