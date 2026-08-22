/**
 * IK-KNR-WC-IDENTITY-BRIDGE P1 — proposal DTO (non-authority).
 *
 * Proposal ≠ CatalogWork ≠ VERIFIED ≠ OUR RATE ≠ Slice D HIT.
 * See: docs/architecture/IK-KNR-WC-IDENTITY-BRIDGE-DESIGN-FREEZE.md
 */

export type KnrWcDuplicateRisk = "NONE" | "POSSIBLE" | "HIGH";

export type KnrWcRecommendation =
  | "REUSE_EXISTING"
  | "CREATE_NEW"
  | "HOLD"
  | "HOLD_UNIT"
  | "HOLD_EVIDENCE"
  | "REJECT";

export type KnrWcVerificationState =
  | "TENDER_ONLY"
  | "PENDING_VERIFY"
  | "VERIFIED"
  | "DISCOVERY_REQUIRED";

export type KnrWcSourceStatus =
  | "LOCAL_CATALOG"
  | "DISCOVERY_EVIDENCE"
  | "HARVEST"
  | "TENDER"
  | "NONE";

export type KnrWcDiscoveryStatus =
  | "NOT_NEEDED"
  | "LOCAL_HIT"
  | "EVIDENCE_HIT"
  | "DISCOVERY_REQUIRED";

export type KnrWcUnitStatus = "OK" | "HOLD_UNIT" | "UNKNOWN";

export type KnrWcOwnerDecision =
  | "unset"
  | "REUSE_EXISTING"
  | "CREATE_NEW"
  | "HOLD"
  | "HOLD_UNIT"
  | "HOLD_EVIDENCE"
  | "REJECT";

export type KnrWcSimilarWork = {
  workId: string;
  namePl: string;
  unit: string;
  tradeId?: string;
  active: boolean;
  /** Advisory overlap score 0..1 — not identity. */
  score: number;
};

export type KnrWcEvidenceRef = {
  kind: "catalogBasis" | "knrCatalog" | "discoveryEvidence" | "harvest" | "tenderLine";
  refId: string;
  detail?: string;
};

export type KnrWcLineRef = {
  dwellingId: string;
  lineId: string;
  lp?: string | number | null;
};

/**
 * Ephemeral candidate — never a CatalogWork row.
 * `proposedWorkId` if set is a stub string only (prefix `proposal:`) — not WC id.
 */
export type KnrWcIdentityProposal = {
  proposalId: string;
  tenderId: string;
  normalizedKey: string;
  identityKeyV2: string;
  displayCode: string;
  family: string;
  catalogId: string | null;
  tableCode: string;
  officialNamePl: string | null;
  descriptionPl: string | null;
  unitRaw: string;
  proposedUnit: string | null;
  proposedTradeId: string | null;
  /** Stub only — never write to CatalogWork / Slice D. */
  proposedWorkId: string | null;
  knrEvidenceRefs: KnrWcEvidenceRef[];
  verificationState: KnrWcVerificationState;
  similarWorks: KnrWcSimilarWork[];
  duplicateRisk: KnrWcDuplicateRisk;
  recommendation: KnrWcRecommendation;
  ownerDecision: KnrWcOwnerDecision;
  sourceStatus: KnrWcSourceStatus;
  discoveryStatus: KnrWcDiscoveryStatus;
  unitStatus: KnrWcUnitStatus;
  lineRefs: KnrWcLineRef[];
  /** Advisory notes for Owner Review (special MOPS risks etc.). */
  specialRiskNotes: string[];
};

export type KnrWcBridgeWorkRef = {
  id: string;
  namePl: string;
  unit: string;
  tradeId?: string;
  active: boolean;
};

/** Optional preloaded harvest row (caller supplies once per batch — no N+1). */
export type KnrWcHarvestEvidence = {
  displayCode?: string;
  description?: string;
  unit?: string;
  sourceRef?: string;
};

/**
 * One key in a batch. Prefer calling with all MOPS keys at once.
 */
export type KnrWcBridgeKeyInput = {
  normalizedKey: string;
  family?: string | null;
  catalogId?: string | null;
  tableCode?: string | null;
  displayCode?: string | null;
  unitRaw?: string | null;
  officialNamePl?: string | null;
  descriptionPl?: string | null;
  rawCode?: string | null;
  lineRefs?: readonly KnrWcLineRef[];
  harvestEvidence?: KnrWcHarvestEvidence | null;
};

export type KnrWcBridgeOwnerMappingRef = {
  normalizedKey: string;
  workId: string;
  active: boolean;
  ownerApproval: boolean;
};

export type KnrWcIdentityProposalBatchMetrics = {
  totalKeysInput: number;
  uniqueKeys: number;
  duplicateKeysDropped: number;
  proposals: number;
  holdUnit: number;
  holdEvidence: number;
  discoveryRequired: number;
  knrLocalHit: number;
  evidenceHit: number;
  /** Catalog store indexed once (0|1). */
  catalogIndexBuilds: number;
  /** O(1) lookups against in-memory index (≤ uniqueKeys). */
  catalogLookupCalls: number;
  discoveryIndexBuilds: number;
  discoveryLookupCalls: number;
  /** Active works scanned once for similarWorks. */
  worksScanCalls: number;
  supabaseQueryCount: 0;
  httpRequestCount: 0;
  researchExecuted: false;
  catalogWorkWritten: 0;
  a1Written: 0;
  mappingWritten: 0;
  pricingWritten: 0;
  scraping: 0;
};

export type KnrWcIdentityProposalBatch = {
  tenderId: string;
  proposals: KnrWcIdentityProposal[];
  /** Keys skipped (HOLD incomplete / empty). */
  skippedHoldKeys: string[];
  /** Keys that already have exact Owner mapping (no proposal needed). */
  skippedMappedKeys: string[];
  metrics: KnrWcIdentityProposalBatchMetrics;
};

/** P2.1 — persisted proposal row (≠ CatalogWork · keyed by normalizedKey). */
export type KnrWcIdentityProposalRecord = {
  schemaVersion: 1;
  /** Stable cache id — prefix `knr-wc-proposal:` · never a CatalogWork id. */
  proposalId: string;
  normalizedKey: string;
  identityKeyV2: string;
  displayCode: string;
  family: string;
  catalogId: string | null;
  tableCode: string;
  officialNamePl: string | null;
  descriptionPl: string | null;
  unitRaw: string;
  proposedUnit: string | null;
  proposedTradeId: string | null;
  proposedWorkId: string | null;
  verificationState: KnrWcVerificationState;
  recommendation: KnrWcRecommendation;
  duplicateRisk: KnrWcDuplicateRisk;
  specialRiskNotes: string[];
  knrEvidenceRefs: KnrWcEvidenceRef[];
  similarWorks: KnrWcSimilarWork[];
  sourceStatus: KnrWcSourceStatus;
  discoveryStatus: KnrWcDiscoveryStatus;
  unitStatus: KnrWcUnitStatus;
  contentHash: string;
  createdAt: string;
  updatedAt: string;
};

export type KnrWcIdentityProposalStore = {
  schemaVersion: 1;
  updatedAt: string;
  etag: string;
  /** Primary map keyed by normalizedKey. */
  entries: Record<string, KnrWcIdentityProposalRecord>;
};

/** P2.1 cache/reuse counters (test + batch diagnostics). */
export type KnrWcIdentityProposalCacheMetrics = {
  inputKeys: number;
  uniqueKeys: number;
  cacheHits: number;
  cacheMisses: number;
  proposalsBuilt: number;
  proposalsReused: number;
  discoveryCalls: number;
  catalogLookups: number;
  supabaseQueries: 0;
  httpCalls: 0;
  catalogWorkWritten: 0;
  a1Written: 0;
  mappingWritten: 0;
  pricingWritten: 0;
  scraping: 0;
};

export type KnrWcIdentityProposalCachedBatch = KnrWcIdentityProposalBatch & {
  cacheMetrics: KnrWcIdentityProposalCacheMetrics;
};
