/**
 * CATALOG-COVERAGE-01 — public API.
 * P0a: Noise Filter · P0b: Normalizer · P0c: Alias Resolver (Wave 1).
 */

export type {
  CatalogCoverageNoiseKind,
  CatalogCoverageNoiseResult,
  CatalogCoverageNoiseFilterStats,
  CatalogCoverageNormalizeResult,
  CatalogCoverageNormalizeStats,
  CatalogCoverageAliasRuleId,
  CatalogCoverageAliasPackRule,
  CatalogCoverageAliasResolveResult,
  CatalogCoverageAliasResolveOpts,
} from "@/lib/catalog-coverage/types";

export {
  classifyOfferBoqLineNoise,
  applyOfferBoqNoiseSkip,
  prepareOfferBoqLineForMapping,
  summarizeNoiseFilter,
  collectNoiseFilterSamples,
  hasCatalogCoverageKnrSignal,
} from "@/lib/catalog-coverage/noise-filter";

export {
  normalizeOfferBoqDescription,
  normalizeOfferBoqDescriptionStable,
  summarizeNormalizeResults,
} from "@/lib/catalog-coverage/normalize-description";

export {
  CATALOG_COVERAGE_P0C_WAVE1_PACK,
  CATALOG_COVERAGE_P0C_WAVE1_RULE_IDS,
} from "@/lib/catalog-coverage/alias-pack-wave1";

export {
  resolveCatalogCoverageAlias,
  resolveCatalogCoverageAliasStable,
  countCatalogCoverageAliasHits,
} from "@/lib/catalog-coverage/alias-resolver";
