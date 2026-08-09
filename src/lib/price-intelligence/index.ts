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

export {
  isDemandResearchableS0,
  listActiveMarketLayerDemands,
  resolveMarketLayerForDemand,
} from "./demand-resolve-layer";

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
