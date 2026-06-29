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

// ─── P1.10 — backward compatibility ────────────────────────────────────────

export {
  isLegacyCatalog,
  isWorkCatalog,
  resolveCatalogForEngine,
  resolveCatalogForUI,
  resolveCatalogVersion,
  type CatalogForUiResolution,
  type CatalogVersion,
  type LegacyCatalogInput,
  type ResolveCatalogCompatOptions,
} from "@/lib/work-catalog/work-catalog-compat";

// ─── PB-WRITE-A — catalog write router ─────────────────────────────────────

export {
  appendCostCatalogHistoryRouted,
  canWriteLegacyCatalog,
  canWriteWorkCatalog,
  resolveCatalogWriteMode,
  saveLegacyCostCatalogRouted,
  saveWorkCatalogRouted,
  type CatalogWriteBlockReason,
  type CatalogWriteMode,
  type RoutedHistoryAppendResult,
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
