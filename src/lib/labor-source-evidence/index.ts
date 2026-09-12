/**
 * WR-SOURCE-EVIDENCE-DB-01 — public API.
 */

export {
  LABOR_SOURCE_EVIDENCE_CAP_GLOBAL,
  LABOR_SOURCE_EVIDENCE_CAP_PER_BATCH,
  LABOR_SOURCE_EVIDENCE_CAP_PER_SOURCE,
  LABOR_SOURCE_EVIDENCE_CAP_PER_WORK,
  LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION,
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
  deriveLaborSourceEvidenceMidpoint,
  type LaborSourceEvidenceCapReport,
  type LaborSourceEvidenceCasResult,
  type LaborSourceEvidenceIdentityMethod,
  type LaborSourceEvidenceObservation,
  type LaborSourceEvidencePriceKind,
  type LaborSourceEvidenceProvenance,
  type LaborSourceEvidenceQualityStatus,
  type LaborSourceEvidenceSourceRole,
  type LaborSourceEvidenceStore,
} from "@/lib/labor-source-evidence/types";

export { buildLaborSourceEvidenceDedupeKey } from "@/lib/labor-source-evidence/dedupe";

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
  listOwnerAuthorizedLaborEvidenceSourceIds,
  normalizeOwnerLaborEvidenceUrl,
  ownerLaborEvidenceUrlsMatch,
  resolveOwnerAuthorizedLaborEvidenceRoute,
  resolveOwnerAuthorizedLaborEvidenceRouteByUrl,
  type OwnerAuthorizedLaborEvidenceRoute,
  type OwnerAuthorizedLaborEvidenceSourceId,
} from "@/lib/labor-source-evidence/owner-authorized-routes";

export { resolveLaborSourceEvidenceSourceRole } from "@/lib/labor-source-evidence/source-roles";

export {
  buildLaborSourceEvidenceObservation,
  filterLaborSourceEvidenceForAggregation,
  type BuildLaborSourceEvidenceInput,
} from "@/lib/labor-source-evidence/ingest";

export {
  LABOR_SOURCE_EVIDENCE_FORBIDDEN_WRITE_KEYS,
  assertLaborSourceEvidenceDoesNotTouchWorkCatalog,
  isLaborSourceEvidenceAllowedWriteKey,
} from "@/lib/labor-source-evidence/isolation";
