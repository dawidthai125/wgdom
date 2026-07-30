/**
 * CATALOG-COVERAGE-01 — public API.
 * P0a: Noise Filter · P0b: Normalizer.
 */

export type {
  CatalogCoverageNoiseKind,
  CatalogCoverageNoiseResult,
  CatalogCoverageNoiseFilterStats,
  CatalogCoverageNormalizeResult,
  CatalogCoverageNormalizeStats,
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
