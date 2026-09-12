/**
 * GO38 — barrel re-exports for IdentityCandidate runtime persistence.
 */

export {
  GO38_P2_PERSISTENCE_POLICY,
  IDENTITY_CANDIDATE_STORAGE_KEY,
  IDENTITY_CANDIDATE_EDITABLE_FIELDS,
  IDENTITY_CANDIDATE_SCHEMA_VERSION,
  type IdentityCandidateRecord,
  type CreateIdentityCandidateInput,
} from "@/lib/work-catalog/identity-candidate-types";

export {
  computeIdentityCandidateFingerprint,
  candidateIdFromFingerprint,
} from "@/lib/work-catalog/identity-candidate-fingerprint";

export {
  clearIdentityCandidateStoresForTests,
  createIdentityCandidate,
  queueIdentityCandidateForOwnerReview,
  loadIdentityCandidateDurableStore,
  findDurableById,
  getEphemeralIdentityCandidate,
  listRejectedFingerprints,
  applySupersession,
} from "@/lib/work-catalog/identity-candidate-store";

export {
  submitOwnerReviewAction,
  buildOwnerReviewReadModel,
  acceptedCanonicalProvenanceSchemaExists,
} from "@/lib/work-catalog/identity-candidate-owner-review";

export {
  executeIdentityCandidateOwnerAccept,
  listOwnerReviewAcceptableCandidates,
  reportNoAcceptableCandidateIfEmpty,
  mintCanonicalWorkIdFromFingerprint,
} from "@/lib/work-catalog/identity-candidate-owner-accept";

export {
  isIdentityCandidateAllowedWriteKey,
  assertIdentityCandidateDoesNotTouchWorkCatalog,
  IDENTITY_CANDIDATE_FORBIDDEN_WRITE_KEYS,
} from "@/lib/work-catalog/identity-candidate-isolation";

export {
  GO40_GENERATION_VERSION,
  TPI729_TENDER_ID,
  TPI729_DWELLING_ID,
  GK_LABOR_LEAF_SCOPE,
  evaluateSafeCanonicalReuse,
  isGkLaborCandidateConstructible,
  buildGkLaborCreateInput,
  generateGkLaborIdentityCandidate,
  runTpi729GkIdentityCandidateScan,
  type GenerateGkLaborIdentityCandidateInput,
  type GenerateGkLaborIdentityCandidateResult,
} from "@/lib/work-catalog/identity-candidate-generation";

export {
  GO41_ACCEPT_VERSION,
  GO40_GK_FINGERPRINT_MARKER,
  executeExplicitGkLaborOwnerAcceptGo41,
  type ExecuteGo41GkOwnerAcceptInput,
  type ExecuteGo41GkOwnerAcceptResult,
} from "@/lib/work-catalog/identity-candidate-gk-owner-accept-go41";
