/**
 * CATALOG-COVERAGE-01 — public API.
 * P0a: Noise Filter · P0b: Normalizer · P0c: Alias Resolver · P0d: Negation Guard.
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
  CATALOG_COVERAGE_WAVE2_PACK,
  CATALOG_COVERAGE_WAVE2_RULE_IDS,
  CATALOG_WAVE2_PRODUCT_IDS,
  CATALOG_WAVE2_PRODUCT_ID_SET,
  buildCatalogCoverageAliasPackCombined,
  isCatalogWave2ProductId,
  isCatalogWave2OutBizHay,
} from "@/lib/catalog-coverage/alias-pack-wave2";

export type { CatalogCoverageAliasWave2RuleId } from "@/lib/catalog-coverage/alias-pack-wave2";

export {
  CATALOG_COVERAGE_ALIAS_PACK_DEFAULT,
  resolveCatalogCoverageAlias,
  resolveCatalogCoverageAliasStable,
  countCatalogCoverageAliasHits,
  catalogWorkHasUsefulQuotes,
} from "@/lib/catalog-coverage/alias-resolver";

export {
  CATALOG_COVERAGE_ZAPRAWIANIE_PRODUCT_ID,
  hasZaprawianieBruzdNegation,
  hasZaprawianieBruzdPositive,
  listNegationGuardedForbiddenProductIds,
  isProductIdForbiddenByNegationGuard,
  decideCatalogCoverageBindProductId,
} from "@/lib/catalog-coverage/negation-guard";
