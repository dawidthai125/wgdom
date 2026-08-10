/**
 * Ekspert Cen — public API (Market Price only).
 */

export type {
  MarketFreshnessStatus,
  MarketPriceRiskLevel,
  MarketTrendKind,
  MaterialMarketMapEntry,
  PricingExpertAnalysisResult,
  PricingExpertBlocker,
  PricingExpertConfidence,
  PricingExpertContract,
  PricingLineMarketAnalysis,
  PricingPcrAlignment,
  PricingSourceView,
} from "./types";

export {
  DEFAULT_MATERIAL_COVERAGE_ALIASES,
  DEFAULT_MATERIAL_MARKET_MAP,
  WGDOM_COVERAGE_CANDIDATES,
  WGDOM_COVERAGE_REJECTED,
  buildMaterialCoverageAliasIndex,
  buildMaterialMarketMapIndex,
  lookupMaterialKeyByExactAlias,
  mapMaterialToMarketWork,
  materialCoverageUsesFuzzyMatching,
  materialCoverageWritesMarketQuotes,
  materialCoverageWritesPurchase,
  normalizeCoverageAliasKey,
  resolveMaterialCoverageExact,
  resolveMaterialMarketCoverage,
  suggestResearchLookupPathHint,
  type MaterialCoverageAlias,
  type ResearchLookupPathStep,
  type WgdomCoverageCandidate,
} from "./material-market-map";

export { deriveMarketQuoteFreshness, worstFreshness } from "./market-freshness";
export { analyzeMaterialMarketLine } from "./analyze-line";
export { buildPricingExpertContract } from "./interpret";
export {
  analyzeMarketPricingFromMaterials,
  type AnalyzeMarketPricingOptions,
  type PricingExpertCatalogRo,
} from "./analyze";
