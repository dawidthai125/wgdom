/**
 * GLOBAL-KNOWLEDGE-E1A — public API (foundation only).
 * Nie podłączone do Resolver / AI-COST / Bid / Work Catalog.
 */

export {
  GLOBAL_KNOWLEDGE_SCHEMA_VERSION,
  GLOBAL_KNOWLEDGE_STORAGE_KEY,
  type GlobalKnowledgeAllowedUse,
  type GlobalKnowledgeConfidence,
  type GlobalKnowledgeEntry,
  type GlobalKnowledgeEntryKind,
  type GlobalKnowledgeImportCandidate,
  type GlobalKnowledgeLicenceRecord,
  type GlobalKnowledgeLifecycle,
  type GlobalKnowledgeOriginId,
  type GlobalKnowledgeProvenance,
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
