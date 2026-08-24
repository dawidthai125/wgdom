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

export {
  LEGACY_SYNTHETIC_WORK_ID_PREFIX,
  WorkCatalogDestructivePersistError,
  isAuthoritativeWorkCatalogStore,
  isDestructiveWorkCatalogReplace,
  isEmptyWorkCatalogStore,
  isLegacySyntheticOnlyStore,
  isLegacySyntheticWorkId,
  listAllCatalogWorks,
  preferAuthoritativeWorkCatalog,
} from "@/lib/work-catalog/work-catalog-authority";

export {
  CatalogWorkDuplicateIdError,
  assertWorkIdNotDuplicateInStore,
  catalogWorkExistsInStore,
  insertWorkBothRegions,
} from "@/lib/work-catalog/work-catalog-insert";

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

// ─── WORK-CATALOG-REBUILD-01 P0 — Nasz Katalog Robót (OUR RATE) ─────────────

export {
  OUR_WORK_RATE_HISTORY_CAP,
  WORK_RATE_FRESHNESS_LABELS_PL,
  WORK_RATE_REGION_FALLBACK_CHAIN,
  WORK_RATE_REGION_SCOPE_LABELS_PL,
  WORK_RATE_REGION_SCOPES,
  buildWorkRateIdentityKey,
  type OurWorkRate,
  type OurWorkRateHistoryEntry,
  type WorkRateFreshnessStatus,
  type WorkRateHistoryKind,
  type WorkRateIdentity,
  type WorkRateRegionScope,
  type WorkRateSourceType,
} from "@/lib/work-catalog/work-rate-types";

export {
  WORK_RATE_AUTHORIZED_SOURCES,
  WORK_RATE_LEGAL_GATE,
  isWorkRateFullCatalogueForbidden,
  isWorkRateLegalPass,
  isWorkRateResearchAllowed,
  isWorkRateSelectiveResearchAuthorized,
  isWorkRateSourceVerified,
  type WorkRateAuthorizedSource,
  type WorkRateAuthorizedSourceId,
  type WorkRateLegalGateStatus,
  type WorkRateSourceAttestationStatus,
} from "@/lib/work-catalog/work-rate-legal";

export {
  WORK_RATE_FRESHNESS_STALE_AFTER_DAYS,
  deriveOurWorkRateFreshness,
  isOurRatePresent,
  workRateFreshnessLabelPl,
  workRateFreshnessStaleAfterMs,
} from "@/lib/work-catalog/work-rate-freshness";

export {
  appendOurWorkRateHistory,
  capOurWorkRateHistory,
  normalizeOurWorkRate,
  normalizeOurWorkRateHistory,
  normalizeOurWorkRateHistoryEntry,
} from "@/lib/work-catalog/work-rate-normalize";

export {
  lookupWorkRate,
  type LookupWorkRateHit,
  type LookupWorkRateMiss,
  type LookupWorkRateResult,
} from "@/lib/work-catalog/work-rate-lookup";

export {
  patchOurWorkRateInStore,
  type PatchOurWorkRateInput,
  type PatchOurWorkRateResult,
} from "@/lib/work-catalog/work-rate-patch";

export {
  isWorkRateFullCatalogueResearchImplemented,
  isWorkRateKbPlAdapterImplemented,
  requestWorkRateResearch,
  type WorkRateResearchRequest,
  type WorkRateResearchResult,
} from "@/lib/work-catalog/work-rate-research-stub";

export {
  calculateRepresentativeWorkRate,
  isWorkRateMinForbiddenAsRepresentative,
  normalizeWorkRateUnitToken,
  qualifyWorkRateObservation,
  workRateUnitsCompatible,
  type QualifyWorkRateObservationResult,
  type WorkRateQualifiedObservation,
  type WorkRateQualifyRejectReason,
  type WorkRateRepresentativeResult,
} from "@/lib/work-catalog/work-rate-qualify";

export {
  WORK_RATE_ALLOWED_HOSTS,
  WORK_RATE_CANONICAL_CENNIK_URL,
  buildWorkRateFixtureHtml,
  buildWorkRateSelectiveRequestUrl,
  isWorkRateSelectiveUrlAllowed,
  namesLooselyMatch,
  namesExactNormalizedMatch,
  parseWorkRateOffersFromHtml,
} from "@/lib/work-catalog/work-rate-source-html-parse";

export {
  createEdgeWorkRateSelectiveLookup,
  createFixtureWorkRateSelectiveLookup,
  createNullWorkRateSelectiveLookup,
} from "@/lib/work-catalog/work-rate-selective-lookup-client";

export type {
  WorkRateParsedOffer,
  WorkRateSelectiveLookupPort,
  WorkRateSelectiveLookupRequest,
  WorkRateSelectiveLookupResult,
  WorkRateSelectiveRawPage,
  WorkRateSourceId,
} from "@/lib/work-catalog/work-rate-selective-lookup-types";

export {
  WORK_RATE_RESEARCH_COOLDOWN_MS,
  clearWorkRateResearchAntiStormState,
  dedupeWorkRateResearchTargets,
  isWorkRateResearchInCooldown,
  isWorkRateResearchInFlight,
  markWorkRateResearchCooldown,
  runWorkRateResearchSingleFlight,
  workRateResearchIdentityKey,
} from "@/lib/work-catalog/work-rate-research-cooldown";

export {
  WORK_RATE_RESEARCH_SOURCE_ORDER,
  getDefaultWorkRateLookupPort,
  getNullWorkRateLookupPort,
  runSelectiveWorkRateResearch,
  type RunSelectiveWorkRateResearchInput,
  type RunSelectiveWorkRateResearchResult,
  type WorkRateResearchCandidate,
  type WorkRateResearchRejectRow,
  type WorkRateResearchTelemetryCode,
  type WorkRateResearchTelemetryRow,
} from "@/lib/work-catalog/work-rate-research";

export {
  WORK_RATE_PASS2_CATEGORY_ALLOWLIST,
  WORK_RATE_PASS2_MAX_PAGES_PER_SOURCE,
  classifyWorkRateLookupEmpty,
  evaluateExistingCategoryReuseGate,
  getWorkRatePass2Allowlist,
  isWorkRatePass2AllowlistEmpty,
  listWorkRatePass2CategoryKeysForSource,
  listWorkRatePass2CategoryKeysForWork,
  normalizeWorkRateDiscoveryUrl,
  planSafeExistingCategoryReuse,
  planWorkRateCategoryRoute,
  preferredCategoryKeysForDemolition,
  preferredCategoryKeysForFamily,
  resolveWorkRatePass1CanonicalUrl,
  resolveWorkRatePass2Url,
  resolveWorkRateSelectiveLookupRequest,
  resolveWorkRateWorkFamily,
  setWorkRatePass2AllowlistForTests,
  softWorkRateFamilyText,
  type WorkRateCategoryKey,
  type WorkRateCategoryRoutePlan,
  type WorkRatePass2AllowlistEntry,
  type WorkRateResearchEmptyClass,
  type WorkRateWorkFamily,
} from "@/lib/work-catalog/work-rate-discovery-allowlist";

export {
  WORK_RATE_OWNER_SYNONYMS,
  detectWorkRateSynonymUsed,
  listWorkRateMatchNamesPl,
} from "@/lib/work-catalog/work-rate-synonyms";

export {
  LABOR_IDENTITY_MAPPING_MATCH_MODE,
  LABOR_IDENTITY_MAPPING_MAX_ALIASES,
  LABOR_IDENTITY_MAPPING_TABLE_VERSION,
  WORK_RATE_IDENTITY_MAPPINGS,
  buildLaborIdentityMappingFixture,
  isForbiddenLegacyBucketWorkId,
  laborIdentityNamesExactNormalizedMatch,
  listExactIdentityAliasesForWork,
  listWorkRateIdentityMappings,
  matchLaborIdentityMappingForWork,
  normalizeLaborIdentityName,
  resolveLaborIdentityMapping,
  setWorkRateIdentityMappingsForTests,
  unitsCompatibleExact,
  validateLaborIdentityMappingRegistry,
  validateLaborIdentityMappingRow,
  type LaborIdentityMappingRow,
  type LaborIdentityResolveResult,
} from "@/lib/work-catalog/work-rate-identity-mapping";

export {
  IK_OWNER_CREATE_A01_LP5_WORK_ID,
  IK_OWNER_A01_LP5_OPS_EXPECTED,
  IK_OWNER_A01_LP5_OPS_REGIONS,
  applyA01Lp5CatalogSeed,
  assertA01Lp5NoConflictOrStop,
  buildIkOwnerCreateA01Lp5CatalogWork,
  workMatchesOwnerApprovedA01Lp5Spec,
} from "@/lib/work-catalog/ik-owner-create-a01-lp5-ops";

export {
  IK_OWNER_A09_PACKAGE_OPS_EXPECTED,
  IK_OWNER_A09_PACKAGE_OPS_REGIONS,
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
  applyA09PackageCatalogSeed,
  assertA09LaborHostUntouched,
  assertA09PackageNoConflictOrStop,
  buildIkOwnerCreateA09PackageCatalogWork,
  workMatchesOwnerApprovedA09PackageSpec,
} from "@/lib/work-catalog/ik-owner-create-a09-package-ops";

export {
  classifyWorkRateEvidenceScopeTag,
  isWorkRateEvidenceScopeAllowed,
  listAllowedWorkRateEvidenceScopeTags,
  type WorkRateEvidenceScopeTag,
} from "@/lib/work-catalog/work-rate-evidence-scope";

export {
  IE_LABOR_IR_WAVE1_EPIC_ID,
  IE_LABOR_IR_WAVE1_FORBIDDEN_CANDIDATE_HOSTS,
  IE_LABOR_IR_WAVE1_KEEP4_SOURCE_IDS,
  IE_LABOR_IR_WAVE1_TARGETS,
  buildEvidenceFromQualifiedObservation,
  isIeLaborIrWave1CandidateHostForbidden,
  isIeLaborIrWave1Keep4SourceId,
  preflightIeLaborIrWave1Target,
  runIeLaborSelectiveResearchIdentityReadyWave1,
  type IeLaborIrWave1BatchResult,
  type IeLaborIrWave1PreflightResult,
  type IeLaborIrWave1TargetDef,
  type IeLaborIrWave1TargetOutcome,
} from "@/lib/work-catalog/ie-labor-selective-research-identity-ready-wave-1";

export {
  acceptWorkRateResearchCandidate,
  type AcceptWorkRateResearchResult,
} from "@/lib/work-catalog/work-rate-accept";

export {
  computeProposedWorkRatePln,
  computeWorkRateMarketBaseFromPoint,
  computeWorkRateMarketBaseFromRange,
  isCompanyPriceForbiddenAsWorkRateBase,
  type WorkRatePriceDerivationKind,
  type WorkRateWidthClaim,
} from "@/lib/work-catalog/work-rate-market-base";

export {
  OUR_WORK_RATE_CATALOG_FRESHNESS_FILTERS,
  buildOurWorkRateCatalogRows,
  computeOurWorkRatePriceChange,
  formatOurWorkRateObservedAtPl,
  formatOurWorkRatePln,
  listLaborWorkIdsForCommercialMarginFloor,
  ourWorkRateCatalogUiUsesPolishLabelsOnly,
  parseOwnerCommercialMarginPctInput,
  summarizeOurWorkRateCatalogRows,
  workRateSourceTypeLabelPl,
  workRateUnitLabelPl,
  type OurWorkRateCatalogFreshnessFilter,
  type OurWorkRateCatalogRow,
  type OurWorkRateCatalogSummary,
  type OurWorkRatePriceChange,
} from "@/lib/work-catalog/our-work-rate-catalog";
