/**
 * PRICE-INTELLIGENCE-01 + PROVIDERS-01 P0 — public API.
 */

export {
  PI31_APPROVED_AT_ISO,
  PI31_APPROVED_EQUIPMENT,
  PI31_APPROVED_MATERIALS,
  PI31_WGDOM_CONFIDENCE,
  assertPi31MaterialMapAligned,
  type Pi31ApprovedEquipmentSpec,
  type Pi31ApprovedMaterialSpec,
} from "./etics-approved-seed";

export {
  applyPi31ApprovedPurchaseToKnowledge,
  applyPi31ApprovedQuotesToWorkCatalog,
  buildPi31EquipmentRateByKey,
  type ApplyPi31CatalogResult,
  type ApplyPi31KnowledgeResult,
} from "./apply-etics-approved-seed";

export { ensurePi31EticsApprovedDataLocal, type EnsurePi31Result } from "./ensure-etics-approved-seed";

/* —— PRICE-PATH-01: economy product hosts (structure only · ZERO invent PLN) —— */
export {
  ECONOMY_PRODUCT_HOSTS_ENSURED_AT,
  ECONOMY_PRODUCT_HOST_SPECS,
  assertEconomyProductHostsMapAligned,
  economyProductHostByMaterialKey,
  type EconomyProductHostSpec,
} from "./economy-product-hosts-seed";

export {
  applyEconomyOwnerApprovedPrices,
  applyEconomyProductHostsToWorkCatalog,
  type ApplyEconomyApprovedResult,
  type ApplyEconomyHostsCatalogResult,
  type EconomyOwnerApprovedPriceInput,
} from "./apply-economy-product-hosts";

export {
  ensureEconomyProductHostsLocal,
  type EnsureEconomyProductHostsResult,
} from "./ensure-economy-product-hosts";

export {
  resolveEconomyMaterialPricePath,
  type EconomyPricePathLine,
  type EconomyPricePathStatus,
} from "./resolve-economy-price-path";

export {
  PRICE_DEMAND_SCHEMA_VERSION,
  PRICE_DEMAND_STORAGE_KEY,
  type PriceDemandCandidate,
  type PriceDemandMissingLayer,
  type PriceDemandPriority,
  type PriceDemandRecord,
  type PriceDemandStatus,
  type PriceDemandStore,
} from "./demand-types";

export {
  buildPriceDemandFamilyKey,
  buildPriceDemandId,
  computePriceDemandPriority,
  defaultPriceDemandStoreForPersist,
  listActivePriceDemands,
  mergePriceDemandStore,
  normalizeDemandName,
  normalizePriceDemandStore,
  resolvePriceDemandsForMaterials,
  upsertPriceDemandCandidates,
} from "./demand-queue";

export {
  collectPriceDemandCandidates,
  collectResolvedMaterialKeys,
  computeMissingLayer,
} from "./demand-collect";

export {
  loadPriceDemandStoreLocal,
  recordPriceDemandsFromExperts,
  savePriceDemandStoreLocal,
  type RecordPriceDemandsResult,
} from "./demand-record";

/* —— DEMAND-RESEARCH-01 S0: manual market research —— */
export type {
  ManualPriceResearchFormInput,
  ManualPriceResearchValidationError,
  ManualResearchProviderId,
  PriceCandidate,
  PriceCandidateSourceType,
} from "./price-candidate-types";

export {
  MANUAL_RESEARCH_PROVIDER_LABELS_PL,
  acceptManualMarketPriceResearch,
  acceptManualMarketPriceResearchPure,
  buildManualMarketQuotesPreview,
  buildPriceCandidateFromManualInput,
  manualProviderSourceLabel,
  mapManualProviderToQuoteOrigin,
  validateManualPriceResearchInput,
  type AcceptManualMarketPriceResearchOpts,
  type AcceptManualMarketPriceResearchResult,
} from "./manual-price-research";

/* —— MARKET-MATERIAL-RESEARCH-01 Stage B: orchestration —— */
export type {
  AcceptResearchCandidateResult,
  DedupedMaterialNeed,
  MaterialCacheDecision,
  MaterialCacheUsability,
  MaterialResearchAction,
  MaterialResearchCooldownMap,
  MaterialResearchJobPhase,
  MaterialResearchJobView,
  MaterialResearchLeasePort,
  MaterialResearchLineResult,
  MaterialResearchOrchestrationResult,
  MaterialResearchProvider,
  MaterialResearchProviderInput,
  MaterialResearchProviderResult,
  NeededMaterialLine,
} from "./market-material-research-types";

export {
  MMR_DEFAULT_SOURCE_SCOPE,
  buildMaterialResearchJobId,
  dedupeNeededMaterialKeys,
} from "./market-material-research-identity";

export {
  classifyPriceMemoryUsability,
  evaluateMaterialCache,
  isCooldownActive,
  setCooldown,
} from "./market-material-research-cache";

export {
  MMR_MOCK_MARKER,
  MMR_MOCK_PROVIDER_ID,
  createDisconnectedLiveProviderStub,
  createMockManualResearchProvider,
  normalizeResearchUnit,
  unitsCompatible,
} from "./market-material-research-provider";

/* —— MARKET-MATERIAL-RESEARCH-02: provider factory + guards —— */
export {
  MMR_02_CIRCUIT_FAILURES,
  MMR_02_CIRCUIT_WINDOW_MS,
  MMR_02_DISCONNECTED_PROVIDER_ID,
  MMR_02_MAX_RETRY,
  MMR_02_PACKAGE_UNITS,
  MMR_02_PRIMARY_SOURCE_STATUS,
  MMR_02_RATE_LIMIT_PER_MIN,
  MMR_02_TIMEOUT_MS,
  type Mmr02PrimarySourceStatus,
} from "./market-material-research-02-config";

export {
  createProviderLoadGuardState,
  isCircuitOpen,
  recordProviderFailure,
  recordProviderSuccess,
  wouldExceedRateLimit,
  wrapProviderWithLoadGuards,
  type ProviderLoadGuardState,
} from "./market-material-research-02-guards";

export {
  createMmr02DisconnectedProvider,
  createMmr02ShopStubs,
  isMmr02LiveHttpEligible,
  resolveMmr02Phase2Provider,
  validateResearchCandidate,
  type Mmr02DisconnectReason,
  type ResearchCandidateValidationDraft,
  type ResolveMmr02Phase2ProviderOpts,
  type ResolveMmr02Phase2ProviderResult,
} from "./market-material-research-02-provider";

export {
  MMR_DEFAULT_COOLDOWN_MS,
  MMR_DEFAULT_LEASE_MS,
  MMR_MAX_ACTIVE_CLAIMS_PER_PASS,
  acceptMaterialResearchCandidate,
  orchestrateMaterialResearch,
  type OrchestrateMaterialResearchOpts,
} from "./market-material-research-orchestrate";

export {
  buildNeededMaterialLinesFromExperts,
  createEdgeResearchLeasePort,
  enqueueMaterialResearchPhase1,
  executeMaterialResearchPhase2,
  getMaterialResearchSessionCooldown,
  loadCatalogWorksById,
  resetMaterialResearchSessionCooldownForTests,
  type Phase1EnqueueResult,
  type Phase2ExecuteResult,
} from "./market-material-research-wire";

export {
  isDemandResearchableS0,
  listActiveMarketLayerDemands,
  resolveMarketLayerForDemand,
} from "./demand-resolve-layer";

/* —— DEMAND-RESEARCH-01 S1-A: PRICE MEMORY —— */
export {
  MARKET_QUOTE_HISTORY_CAP,
  appendMarketQuoteHistoryEntry,
  archivePreviousQuotesIntoHistory,
  buildManualResearchBrief,
  catalogSliceForRegion,
  collectPreviousQuoteCellsForPreview,
  derivePriceMemoryFreshnessUx,
  isMarketQuoteHistoryDuplicate,
  listMarketQuoteHistoryForCell,
  lookupPriceMemory,
  mapConfidenceToUxLabel,
  marketQuoteOriginLabelPl,
  normalizeMarketQuoteHistory,
  priceMemoryFreshnessLabelPl,
  readQuoteCell,
  snapshotToHistoryEntry,
  useExistingMarketPrice,
  useExistingMarketPricePure,
  type PriceMemoryConfidenceLabel,
  type PriceMemoryFreshnessUx,
  type PriceMemoryHit,
  type PriceMemoryLookupInput,
  type PriceMemoryLookupResult,
  type PreviousQuoteCell,
  type ResearchBrief,
} from "./price-memory";

/* —— DEMAND-RESEARCH-01 S2-A: Research Intelligence Brief —— */
export {
  buildResearchIntelligenceBrief,
  deriveTradeOriginHint,
  researchIntelligenceCreatesPriceFromBoq,
  researchIntelligenceFillsMarketFromPurchase,
  researchIntelligencePriorityImplemented,
  researchIntelligenceUsesSoftLabelOverlap,
  resolveExactCatalogWork,
  type BuildResearchIntelligenceInput,
  type ResearchIntelligenceBrief,
} from "./research-intelligence";

/* —— DEMAND-RESEARCH-01 S2-B: coverage dictionary re-exports —— */
export {
  DEFAULT_MATERIAL_COVERAGE_ALIASES,
  DEFAULT_MATERIAL_MARKET_MAP,
  LABOR_CATALOG_WORK_BLOCKLIST,
  PRODUCT_CATALOG_WORK_PREFIX,
  WGDOM_COVERAGE_CANDIDATES,
  WGDOM_COVERAGE_REJECTED,
  buildMaterialMarketMapIndex,
  isLaborCatalogWorkBlockedForProductQuotes,
  isProductCatalogWorkId,
  lookupMaterialKeyByCatalogWorkId,
  lookupMaterialKeyByExactAlias,
  mapMaterialToMarketWork,
  materialCoverageUsesFuzzyMatching,
  materialCoverageWritesMarketQuotes,
  materialCoverageWritesPurchase,
  preferProductCatalogWorkId,
  resolveDemandProductIdentityExact,
  resolveMaterialCoverageExact,
  suggestResearchLookupPathHint,
  type MaterialCoverageAlias,
  type ResearchLookupPathStep,
  type WgdomCoverageCandidate,
} from "@/lib/pricing-expert/material-market-map";

/* —— PROVIDERS-01 P0: faktury → COMPANY PURCHASE —— */
export type {
  InvoiceLineStatus,
  InvoiceRejectReason,
  RawInvoiceLineInput,
  ParsedInvoiceLine,
  RejectedInvoiceLine,
  ParseInvoiceLineResult,
  NormalizedInvoiceProduct,
  InvoicePriceProvenance,
  InvoicePriceObservation,
  InvoiceMapStatus,
  InvoiceMaterialMapping,
  MappedInvoicePurchaseCandidate,
  InvoiceProductPriceHistory,
} from "./invoice-types";

export {
  normalizeInvoiceUnit,
  resolveEffectiveNetUnitPrice,
  parseInvoiceLine,
  parseInvoiceLines,
} from "./invoice-parse";

export {
  buildSupplierKey,
  buildNormalizedProductName,
  buildProductIdentityKey,
  inferManufacturerIfExplicit,
  normalizeInvoiceProduct,
} from "./invoice-normalize";

export {
  buildInvoiceObservationId,
  observationFromParsedLine,
  buildInvoiceProductPriceHistory,
  buildAllInvoiceProductHistories,
} from "./invoice-history";

export {
  mapInvoiceProductToMaterial,
  buildMappedPurchaseCandidate,
  buildMappedPurchaseCandidates,
  INVOICE_ETICS_APPROVED_MATERIAL_KEYS,
  type InvoiceEticsApprovedMaterialKey,
  type MapInvoiceProductOpts,
} from "./invoice-etics-map";

export {
  COMPANY_PURCHASE_INVOICE_ORIGIN_LABEL,
  acceptInvoicePurchaseCandidates,
  acceptInvoicePurchaseCandidatesLocal,
  invoiceAcceptWritesMarketQuotes,
  type AcceptInvoicePurchaseResult,
} from "./invoice-accept-purchase";

export {
  processInvoiceCompanyPurchaseBatch,
  type InvoiceCompanyPurchaseBatchResult,
} from "./invoice-pipeline";

/* —— PROVIDERS-01 P1a: approved dictionary + conversions —— */
export type { InvoiceApprovedMapEntry, InvoiceApprovedMapStatus } from "./invoice-approved-map";

export {
  INVOICE_APPROVED_MAP_ENTRIES,
  forceInvoiceApprovedMapForTests,
  getInvoiceApprovedMapEntries,
  lookupInvoiceApprovedMap,
  matchApprovedBySupplierCode,
  matchApprovedByEan,
  matchApprovedBySupplierNameUnit,
  invoiceApprovedMapUsesFuzzyOrLlm,
} from "./invoice-approved-map";

export type {
  InvoiceApprovedConversion,
  ApplyInvoiceConversionResult,
} from "./invoice-unit-conversion";

export {
  MAPETHERM_SZT_25KG_CONVERSION_ID,
  INVOICE_APPROVED_CONVERSIONS,
  getInvoiceApprovedConversion,
  applyInvoiceUnitConversion,
} from "./invoice-unit-conversion";

/* —— Invoice → Price Memory seed (HISTORICAL PURCHASE) —— */
export {
  INVOICE_PURCHASE_MATERIAL_PREFIX,
  INVOICE_PURCHASE_WORK_PREFIX,
  stableInvoiceSlugHash,
  slugifyInvoiceProductCode,
  isInvoicePurchaseMaterialKey,
  isInvoicePurchaseCatalogWorkId,
  invoicePurchaseWorkIdFromMaterialKey,
  invoicePurchaseMaterialKeyFromWorkId,
  toInvoiceCatalogWorkUnit,
  resolveInvoicePurchaseHost,
  buildInvoicePurchaseMapEntry,
  type InvoicePurchaseHostResolution,
} from "./invoice-purchase-host";

export {
  seedInvoiceLinesToPriceMemory,
  normalizeZygmuntInvoiceSeedFixture,
  type InvoicePriceMemorySeedObservation,
  type InvoicePriceMemorySeedReport,
  type ZygmuntInvoiceSeedFixtureFile,
} from "./invoice-price-memory-seed";

export {
  qualifyMarketResearchObservation,
  averageQualifyingRegularMarketPrices,
  type MarketResearchPriceType,
  type MarketResearchSellerKind,
  type QualifyingMarketObservationInput,
  type QualifyMarketObservationResult,
  type MarketRegularAverageResult,
} from "./market-research-qualify";

export {
  applyZygmuntInvoicePurchaseSeedToWorkCatalog,
  type ApplyZygmuntInvoicePurchaseSeedResult,
} from "./apply-zygmunt-invoice-purchase-seed";

export {
  ensureZygmuntInvoicePurchaseSeedLocal,
  type EnsureZygmuntInvoicePurchaseSeedResult,
} from "./ensure-zygmunt-invoice-purchase-seed";

export {
  ZYGMUNT_INVOICE_PURCHASE_SEED,
  ZYGMUNT_INVOICE_PURCHASE_SEED_META,
  ZYGMUNT_INVOICE_PURCHASE_SEED_GENERATED_AT,
  type ZygmuntInvoicePurchaseSeedRow,
} from "./zygmunt-invoice-purchase-seed-data";
