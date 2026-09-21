/**
 * WR-SOURCE-EVIDENCE-DB-01 — public API.
 * OFN-01 Schema v2: derived labor evidence exports.
 */

export {
  LABOR_SOURCE_EVIDENCE_CAP_GLOBAL,
  LABOR_SOURCE_EVIDENCE_CAP_PER_BATCH,
  LABOR_SOURCE_EVIDENCE_CAP_PER_SOURCE,
  LABOR_SOURCE_EVIDENCE_CAP_PER_WORK,
  LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION,
  LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION_V1,
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
  deriveLaborSourceEvidenceMidpoint,
  type DerivedLaborEvidenceInput,
  type DerivedLaborInputRole,
  type LaborSourceEvidenceCapReport,
  type LaborSourceEvidenceCasResult,
  type LaborSourceEvidenceDerivation,
  type LaborSourceEvidenceIdentityMethod,
  type LaborSourceEvidenceObservation,
  type LaborSourceEvidencePriceKind,
  type LaborSourceEvidenceProvenance,
  type LaborSourceEvidenceQualityStatus,
  type LaborSourceEvidenceSourceRole,
  type LaborSourceEvidenceStore,
} from "@/lib/labor-source-evidence/types";

export {
  buildDerivedLaborDerivationFingerprint,
  buildLaborSourceEvidenceDedupeKey,
} from "@/lib/labor-source-evidence/dedupe";

export {
  computeLaborSourceEvidenceEtag,
  emptyLaborSourceEvidenceStore,
  isEmptyLaborSourceEvidenceStore,
  normalizeLaborSourceEvidenceObservation,
  normalizeLaborSourceEvidenceStore,
} from "@/lib/labor-source-evidence/normalize";

export {
  applyLaborSourceEvidenceDelta,
  mergeLaborSourceEvidenceStore,
  preferAuthoritativeLaborSourceEvidenceStore,
  unionLaborSourceEvidenceObservations,
  type MergeLaborSourceEvidenceResult,
} from "@/lib/labor-source-evidence/merge";

export {
  buildLaborSourceEvidenceCapReport,
  isLaborSourceEvidenceCapExceeded,
} from "@/lib/labor-source-evidence/caps";

export {
  casWriteLaborSourceEvidenceStore,
  clearLaborSourceEvidenceStoreLocalForTests,
  loadLaborSourceEvidenceStoreLocal,
  mergeLaborSourceEvidenceDataKey,
  saveLaborSourceEvidenceStoreLocal,
  upsertLaborSourceEvidenceObservations,
} from "@/lib/labor-source-evidence/store";

export {
  assertDerivedLaborEvidenceHostLock,
  assertLaborSourceEvidenceHostLock,
  isLaborSourceEvidenceKeep5SourceId,
  isLaborSourceEvidenceRuntimeSourceId,
  isLaborSourceEvidenceUrlAllowed,
  listLaborSourceEvidenceApfSourceIds,
  listLaborSourceEvidenceOwnerRouteSourceIds,
  listLaborSourceEvidenceRuntimeSourceIds,
} from "@/lib/labor-source-evidence/host-lock";

export {
  OWNER_AUTHORIZED_LABOR_EVIDENCE_ROUTES,
  OWNER_LABOR_EVIDENCE_STATUS_AUTHORIZED,
  isOwnerAuthorizedLaborEvidenceSourceId,
  listOwnerAuthorizedLaborEvidenceRoutesByUrl,
  listOwnerAuthorizedLaborEvidenceSourceIds,
  normalizeOwnerLaborEvidenceUrl,
  ownerLaborEvidenceUrlsMatch,
  resolveOwnerAuthorizedLaborEvidenceRoute,
  resolveOwnerAuthorizedLaborEvidenceRouteByUrl,
  type OwnerAuthorizedLaborEvidenceRoute,
  type OwnerAuthorizedLaborEvidenceSourceId,
} from "@/lib/labor-source-evidence/owner-authorized-routes";

export {
  DERIVED_LABOR_COMPOSITE_SOURCE_ID,
  OWNER_DERIVED_LABOR_INPUT_ROUTES,
  OWNER_DERIVED_LABOR_INPUT_STATUS_AUTHORIZED,
  assertOwnerDerivedLaborInputLeafBind,
  extractHostFromUrl,
  isDerivedLaborCompositeSourceId,
  isOwnerDerivedLaborInputSourceId,
  listOwnerDerivedLaborInputSourceIds,
  resolveOwnerDerivedLaborInputRoute,
  resolveOwnerDerivedLaborInputRouteByUrl,
  type OwnerDerivedLaborInputRoute,
  type OwnerDerivedLaborInputSourceId,
} from "@/lib/labor-source-evidence/derived-labor-input-routes";

export {
  DERIVED_LABOR_CALCULATOR_VERSION,
  DERIVED_LABOR_FORMULA_REGISTRY,
  FORMULA_LABOR_NORM_X_RATE,
  FORMULA_LABOR_NORM_X_RATE_VERSION,
  evalDerivedLaborFormula,
  evalLaborNormXRate,
  isRegisteredDerivedLaborFormulaId,
  normalizeDerivedLaborUnitToken,
  resolveDerivedLaborFormula,
  type DerivedLaborFormulaDefinition,
  type DerivedLaborFormulaId,
  type LaborNormXRateEvalInput,
  type LaborNormXRateEvalResult,
} from "@/lib/labor-source-evidence/derived-labor-formulas";

export {
  DERIVED_LABOR_FRESHNESS_MAX_SPAN_MS,
  isDerivedLaborEvidenceIdentityEligible,
  validateDerivedLaborEvidence,
  validateDerivedLaborFreshness,
  validateDerivedLaborObservation,
  type DerivedLaborValidateRejectReason,
  type DerivedLaborValidateResult,
} from "@/lib/labor-source-evidence/derived-labor-validate";

export { resolveLaborSourceEvidenceSourceRole } from "@/lib/labor-source-evidence/source-roles";

export {
  buildDerivedLaborSourceEvidenceObservation,
  buildLaborSourceEvidenceObservation,
  filterLaborSourceEvidenceForAggregation,
  type BuildDerivedLaborSourceEvidenceInput,
  type BuildDerivedLaborSourceEvidenceResult,
  type BuildLaborSourceEvidenceInput,
} from "@/lib/labor-source-evidence/ingest";

export {
  LABOR_SOURCE_EVIDENCE_FORBIDDEN_WRITE_KEYS,
  assertLaborSourceEvidenceDoesNotTouchWorkCatalog,
  isLaborSourceEvidenceAllowedWriteKey,
} from "@/lib/labor-source-evidence/isolation";
