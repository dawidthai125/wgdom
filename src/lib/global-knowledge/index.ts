/**
 * GLOBAL-KNOWLEDGE — public API (E1A foundation + E1B Identity import).
 * Nie podłączone do Resolver / AI-COST / Bid / Work Catalog.
 *
 * AR-C2: publiczne mutacje = commitControlledImport · softDelete · legalWipe.
 * persistGlobalKnowledgeStoreLocal NIE jest eksportowane (internal saveLocal).
 */

export {
  GLOBAL_KNOWLEDGE_E1B_FLAG_KEY,
  GLOBAL_KNOWLEDGE_SCHEMA_VERSION,
  GLOBAL_KNOWLEDGE_STORAGE_KEY,
  type GlobalKnowledgeAllowedUse,
  type GlobalKnowledgeConfidence,
  type GlobalKnowledgeEntry,
  type GlobalKnowledgeEntryKind,
  type GlobalKnowledgeImportBatchMeta,
  type GlobalKnowledgeImportCandidate,
  type GlobalKnowledgeLegalWipeOpts,
  type GlobalKnowledgeLicenceRecord,
  type GlobalKnowledgeLifecycle,
  type GlobalKnowledgeOriginId,
  type GlobalKnowledgeProvenance,
  type GlobalKnowledgeSoftDeleteMeta,
  type GlobalKnowledgeStore,
} from "./types";

export {
  buildCanonicalGlobalId,
  buildGlobalContentHash,
  canonicalizeNormCode,
  foldGlobalText,
  fnv1aHex,
  isCanonicalGlobalIdFormat,
} from "./canonical-id";

export {
  GLOBAL_KNOWLEDGE_ORIGIN_DENYLIST,
  GLOBAL_KNOWLEDGE_ORIGIN_WHITELIST,
  createOwnerManualLicence,
  evaluateLegalGate,
  isOriginDenied,
  isOriginWhitelisted,
  type LegalGateInput,
  type LegalGateRejectCode,
  type LegalGateResult,
} from "./legal-gate";

export {
  GLOBAL_KNOWLEDGE_LIFECYCLES,
  isGlobalKnowledgeLifecycle,
  isLifecycleObsolete,
  isLifecycleUsableForIdentity,
  resolveSupersededTarget,
  validateLifecycleFields,
  type LifecycleValidationCode,
} from "./lifecycle";

export {
  createEmptyGlobalKnowledgeStore,
  isGlobalKnowledgeNoOp,
  isGlobalKnowledgeStoreEmpty,
  loadGlobalKnowledgeStoreLocal,
  normalizeGlobalKnowledgeStore,
} from "./store";

export {
  validateGlobalKnowledgeImportCandidate,
  type ImportValidationCode,
  type ImportValidationResult,
} from "./import-validation";

export {
  GLOBAL_KNOWLEDGE_E1B_DEFAULT,
  GLOBAL_KNOWLEDGE_E1B_LS_KEY,
  forceGlobalKnowledgeE1bForTests,
  isGlobalKnowledgeE1bEnabled,
  mayPersistGlobalKnowledgeE1b,
} from "./flag";

export {
  listUsableIdentity,
  lookupByAlias,
  normalizeAliasList,
} from "./identity-ops";

export {
  applyCollisionPolicy,
  findEntryByGlobalId,
  type CollisionAction,
  type CollisionRejectCode,
  type CollisionResult,
} from "./collision";

export {
  commitControlledImport,
  type CommitCandidateResult,
  type CommitControlledImportResult,
  type CommitRejectCode,
} from "./commit-import";

export {
  legalWipeGlobalKnowledgeEntries,
  softDeleteGlobalKnowledgeEntry,
  type LegalWipeCode,
  type LegalWipeResult,
  type SoftDeleteCode,
  type SoftDeleteResult,
} from "./mutations";
