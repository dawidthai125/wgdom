/**
 * CATALOG-COVERAGE-01 — public API.
 * P0a: Noise Filter only.
 */

export type {
  CatalogCoverageNoiseKind,
  CatalogCoverageNoiseResult,
  CatalogCoverageNoiseFilterStats,
} from "@/lib/catalog-coverage/types";

export {
  classifyOfferBoqLineNoise,
  applyOfferBoqNoiseSkip,
  prepareOfferBoqLineForMapping,
  summarizeNoiseFilter,
  collectNoiseFilterSamples,
  hasCatalogCoverageKnrSignal,
} from "@/lib/catalog-coverage/noise-filter";
