/**
 * Biblioteka Robót i Cennik v3.0 — public API (Foundation P1 · FREEZE v1.0).
 * Import wyłącznie z `@/lib/work-catalog` w warstwie UI / integracji (P2+).
 */

// ─── P1.1 — typy domenowe + branże ─────────────────────────────────────────

export {
  TRADE_IDS,
  TRADE_LABELS_PL,
  isTradeId,
  tradeLabelPl,
  type TradeId,
} from "@/lib/work-catalog/trades";

export {
  WORK_BUNDLE_SCHEMA_VERSION,
  WORK_CATALOG_SCHEMA_VERSION,
  type CatalogWork,
  type CommercialPricing,
  type CommercialPricingSource,
  type WorkBundle,
  type WorkBundleSchemaVersion,
  type WorkBundleSource,
  type WorkBundleStep,
  type WorkBundleStore,
  type WorkCatalogRegionSlice,
  type WorkCatalogSchemaVersion,
  type WorkCatalogSource,
  type WorkCatalogStore,
  type WorkCostSplit,
  type WorkFreshnessStatus,
} from "@/lib/work-catalog/types";

// ─── P1.2 — freshness + helpers ────────────────────────────────────────────

export {
  WORK_FRESHNESS_STALE_AFTER_DAYS,
  deriveFreshnessStatus,
  isCompanyPricePresent,
  parseWorkUpdatedAtMs,
  withFreshnessStatus,
  withFreshnessStatusAll,
  workFreshnessStaleAfterMs,
  type DeriveFreshnessInput,
} from "@/lib/work-catalog/freshness";

export {
  countActiveWorks,
  getRegionSlice,
  getWorkById,
  getWorkByIdFromStore,
  indexWorksById,
  listActiveWorks,
  listActiveWorksByTradeId,
  listActiveWorksForRegion,
  listWorksByTradeId,
  listWorksForRegion,
} from "@/lib/work-catalog/catalog-work-utils";

// ─── P1.3 — seed manifest ──────────────────────────────────────────────────

export {
  SEED_MANIFEST_RELATIVE_PATH,
  SEED_MANIFEST_VERSION,
  parseSeedManifestYaml,
  validateSeedManifestStructure,
  validateSeedManifestYaml,
  type SeedManifestDocument,
  type SeedManifestValidationResult,
  type SeedManifestWorkEntry,
} from "@/lib/work-catalog/seed-manifest";

// ─── P1.4 — cost split (stała referencyjna + round-trip dla cutover) ───────

export {
  WORK_CATALOG_REFERENCE_HOURLY_PLN,
  mergeCompanyPriceFromLegacyRate,
  resolveReferenceHourlyPln,
} from "@/lib/work-catalog/cost-split";

// ─── P1.5 — migracja legacy → v3 ───────────────────────────────────────────

export {
  LEGACY_CATEGORY_TO_TRADE,
  cloneWorkCatalogStore,
  createEmptyWorkCatalogStore,
  defaultWorkCatalogStore,
  isLegacyCostCatalogStore,
  isWorkCatalogStoreV3,
  mapLegacyCategoryToTradeId,
  migrateLegacyCostCatalogStoreToWorkCatalog,
  type MigrateLegacyCostCatalogOptions,
  type MigrationResult,
  type WorkCatalogMigrationOutput,
} from "@/lib/work-catalog/work-catalog-migrate";

// ─── P1.6 — adapter silnika legacy ─────────────────────────────────────────

export {
  buildLegacyCostCatalogFromWorkStore,
  listTradeIdsForLegacyCategory,
  mergeKeywords,
  resolveRegionSlice,
  type BuildLegacyCostCatalogOptions,
} from "@/lib/work-catalog/work-catalog-engine-adapter";

// ─── P1.7 — WorkCatalogStore persist ─────────────────────────────────────

export {
  WORK_CATALOG_DEFAULT_UPDATED_AT,
  WORK_CATALOG_STORAGE_KEY,
  defaultWorkCatalogStoreForPersist,
  loadWorkCatalogStoreLocal,
  mergeWorkCatalogStore,
  normalizeCommercialPricing,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
  type SaveWorkCatalogStoreLocalOptions,
} from "@/lib/work-catalog/work-catalog-store";

// ─── P1.8 — WorkBundleStore persist ────────────────────────────────────────

export {
  WORK_BUNDLE_DEFAULT_UPDATED_AT,
  WORK_BUNDLE_STORAGE_KEY,
  defaultWorkBundleStore,
  loadWorkBundleStoreLocal,
  mergeWorkBundleStore,
  normalizeWorkBundleStore,
  saveWorkBundleStoreLocal,
  type SaveWorkBundleStoreLocalOptions,
} from "@/lib/work-catalog/work-bundle-store";

// ─── P1.10 — engine compat (#5C-5C F2: resolveCatalogForEngine only) ─────

export {
  resolveCatalogForEngine,
  type ResolveCatalogCompatOptions,
} from "@/lib/work-catalog/work-catalog-compat";

// ─── PB-WRITE-A — catalog write router (#5C-5C F2: work path only) ─────────

export {
  canWriteWorkCatalog,
  resolveCatalogWriteMode,
  saveWorkCatalogRouted,
  type CatalogWriteBlockReason,
  type CatalogWriteMode,
  type RoutedSaveResult,
} from "@/lib/catalog-write-router";

// ─── P1.11 — cloud-sync hooks ──────────────────────────────────────────────

export {
  loadWorkBundleStore,
  loadWorkCatalogStore,
  mergeWorkBundleFromSources,
  mergeWorkCatalogFromSources,
  saveWorkBundleStore,
  saveWorkCatalogStore,
  type SaveWorkBundleStoreCloudOptions,
  type SaveWorkCatalogStoreCloudOptions,
} from "@/lib/work-catalog/work-catalog-sync";

// ─── P3.1-S1 — market regions (hierarchia fallback P3.0B) ──────────────────

export {
  DEFAULT_MARKET_START_REGION,
  MARKET_REGION_CODES,
  MARKET_REGION_HIERARCHY_DOLNOSLASK,
  MARKET_REGION_HIERARCHY_POLSKA,
  MARKET_REGION_HIERARCHY_POWIAT,
  MARKET_REGION_HIERARCHY_WROCLAW,
  MARKET_REGION_LABELS_PL,
  isMarketRegionCode,
  marketRegionFallbackChain,
  marketRegionLabelPl,
  type MarketRegionCode,
} from "@/lib/work-catalog/market-regions";

// ─── P3.1-S1 — market sources (kontrakt marketQuotes) ──────────────────────

export {
  MARKET_COVERAGE_VALUES,
  MARKET_DIY_ORIGIN_IDS,
  MARKET_DIY_ORIGIN_LABELS_PL,
  MARKET_LEGACY_SEED_ORIGIN_ID,
  MARKET_MIN_CONFIDENCE_DEFAULT,
  MARKET_ORIGIN_IDS,
  MARKET_ORIGIN_LABELS_PL,
  MARKET_QUOTE_ORIGIN_IDS,
  isMarketCoverage,
  isMarketDiyOriginId,
  isMarketOriginId,
  isMarketQuoteOriginId,
  normalizeMarketCoverage,
  normalizeMarketSourceSnapshot,
  normalizeWorkMarketQuotes,
  roundMarketPricePln,
  type MarketCoverage,
  type MarketDiyOriginId,
  type MarketOriginId,
  type MarketQuoteOriginId,
  type MarketSourceSnapshot,
  type WorkMarketQuotes,
} from "@/lib/work-catalog/market-sources";

// ─── P3.1-S2 · WC-P3.3-S1 — market average engine (public API) ─────────────

export {
  DEFAULT_MARKET_RESOLUTION_CONTEXT,
  DEFAULT_MARKET_SOURCE_ENGINE_CONFIG,
  computeConfidenceWeightedAverage,
  computeMarketAverage,
  computeMarketAverageForWork,
  defaultMarketResolutionContext,
  defaultMarketSourceEngineConfig,
  isMarketSnapshotEligible,
  pickDominantRegionCode,
  resolveLegacySeedPrice,
  resolveOriginMarketQuote,
  type MarketAverageResult,
  type MarketAverageStrategy,
  type MarketResolutionContext,
  type MarketSourceEngineConfig,
  type ResolvedMarketQuote,
} from "@/lib/work-catalog/market-average-engine";

// ─── P3.1-S3 — market source adapters (kontrakt adaptera, pure) ─────────────

export {
  asAdapterRecord,
  buildSnapshotFromParts,
  mapMarketRegionLabelToCode,
  marketAdapterValidationOk,
  parseAdapterConfidence,
  parseAdapterPrice,
  parseAdapterUpdatedAt,
  resolveWorkIdFromIndex,
  type AdaptMarketRecordResult,
  type MarketSourceAdapter,
  type MarketSourceAdapterMapWorkResult,
  type MarketSourceAdapterNormalizeOptions,
  type MarketSourceAdapterValidateResult,
  type MarketWorkMappingIndex,
} from "@/lib/work-catalog/market-source-adapter";

// ─── P3.1-S3 — rejestr adapterów źródeł rynku ──────────────────────────────

export {
  MARKET_SOURCE_ADAPTERS,
  adaptMarketSourceRecord,
  getMarketSourceAdapter,
  interbudMarketSourceAdapter,
  isKnownMarketSourceAdapter,
  kbPlMarketSourceAdapter,
  sekocenbudMarketSourceAdapter,
  wgdomMarketSourceAdapter,
  type InterbudMarketRawRecord,
  type KbPlMarketRawRecord,
  type SekocenbudMarketRawRecord,
  type WgdomMarketRawRecord,
} from "@/lib/work-catalog/market-source-adapters/index";

// ─── P3.1-S3 — słownik mapowania źródeł rynku → roboty WGDOM (pure) ─────────

export {
  buildMarketWorkMappingIndex,
  buildMarketWorkMappingIndexForOrigin,
  createEmptyMarketWorkMappingStore,
  findMapping,
  listMappings,
  normalizeMarketWorkMapping,
  registerMapping,
  resolveMappingBatch,
  validateMappings,
  type ListMappingsFilter,
  type MarketWorkMapping,
  type MarketWorkMappingBatchItem,
  type MarketWorkMappingFindResult,
  type MarketWorkMappingMatched,
  type MarketWorkMappingMatchedVia,
  type MarketWorkMappingRejected,
  type MarketWorkMappingReport,
  type MarketWorkMappingStore,
  type MarketWorkMappingUnmatched,
  type MarketWorkMappingValidateResult,
  type MarketWorkMappingValidationIssue,
  type RegisterMappingOptions,
  type RegisterMappingResult,
} from "@/lib/work-catalog/market-work-mapping";

// ─── P3.1-S4 — seed mapowań (D1: SSOT-safe, wgdom self-map) ─────────────────

export {
  createSeededMarketWorkMappingStore,
  type CreateSeededMappingOptions,
  type SeedCatalogWorkRef,
} from "@/lib/work-catalog/market-work-mapping-seed";

// ─── P3.1-S4 — parser CSV cen rynkowych (pure) ─────────────────────────────

export {
  parseCsvLine,
  parseMarketCsv,
  type MarketCsvDelimiter,
  type MarketCsvParseOptions,
  type MarketCsvParseRejectedLine,
  type MarketCsvParseResult,
  type MarketCsvParsedRow,
} from "@/lib/work-catalog/market-csv-parser";

// ─── P3.1-S4 — importer CSV w trybie PREVIEW (bez zapisu) ──────────────────

export {
  csvRowToAdapterRecord,
  previewMarketCsvImport,
  previewMarketCsvRows,
  resolveCsvExternalId,
  type MarketCsvPreviewInputRow,
  type MarketCsvPreviewOptions,
  type MarketCsvPreviewReport,
  type MarketCsvPreviewRow,
  type MarketCsvPreviewStatus,
} from "@/lib/work-catalog/market-csv-preview";

// ─── P3.2-S1 — apply market quotes (merge-not-replace, pure) ────────────────

export {
  applyMarketQuotesFromPreview,
  mergeWorkMarketQuotes,
  type ApplyMarketQuotesOptions,
  type ApplyMarketQuotesReport,
  type MergeWorkMarketQuotesResult,
} from "@/lib/work-catalog/apply-market-quotes";

// ─── P3.2-S2 — rollback (single undo, pure) ─────────────────────────────────

export {
  MARKET_QUOTES_ROLLBACK_KIND,
  captureMarketQuotesSnapshot,
  restoreMarketQuotesSnapshot,
  fingerprintWorkCatalogStore,
  type MarketQuotesRollbackSnapshot,
  type RestoreMarketQuotesReason,
  type RestoreMarketQuotesResult,
} from "@/lib/work-catalog/rollback-market-quotes";

// ─── P3.2-S3 — commit orchestration (load→capture→apply→save→verify) ────────

export {
  commitMarketQuotesImport,
  type CommitMarketQuotesDeps,
  type CommitMarketQuotesOptions,
  type CommitMarketQuotesReport,
  type CommitMarketQuotesStatus,
} from "@/lib/work-catalog/commit-market-quotes";
