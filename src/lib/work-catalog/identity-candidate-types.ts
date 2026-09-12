/**
 * GO38 — IdentityCandidate runtime types + P2 persistence boundary.
 * Separate from CatalogWork. Canonical Accept = GO39 (not here).
 */

import type {
  IdentityCandidateLifecycleStatus,
  IdentityConfidenceComponents,
  IdentityOwnerDecisionKind,
  IdentitySourceAuthorityClass,
  SemanticWorkKind,
} from "@/lib/work-catalog/identity-candidate-contract";

export const IDENTITY_CANDIDATE_STORAGE_KEY = "kw-identity-candidates" as const;
export const IDENTITY_CANDIDATE_SCHEMA_VERSION = 1 as const;

/** Owner GO38 P2 freeze — durations closed without TTL numbers. */
export const GO38_P2_PERSISTENCE_POLICY = Object.freeze({
  identityCandidate: "EPHEMERAL_ONLY" as const,
  ownerReview: "DURABLE_NO_EXPIRATION" as const,
  rejected: "INDEFINITE_RETENTION" as const,
  superseded: "INDEFINITE_RETENTION" as const,
  acceptedProvenance: "INDEFINITE_RETENTION" as const,
  globalRule: "BEFORE_OWNER_REVIEW_EPHEMERAL__FROM_OWNER_REVIEW_DURABLE" as const,
  expiredState: false,
  hardDeleteDurableHistory: false,
});

export const IDENTITY_CANDIDATE_EPHEMERAL_STATUSES = Object.freeze([
  "DISCOVERED",
  "IDENTITY_CANDIDATE",
] as const);

export const IDENTITY_CANDIDATE_DURABLE_STATUSES = Object.freeze([
  "OWNER_REVIEW",
  "ACCEPTED_CANONICAL",
  "REJECTED",
  "SUPERSEDED",
] as const);

export const IDENTITY_CANDIDATE_EDITABLE_FIELDS = Object.freeze([
  "label",
  "unit",
  "technology",
  "scope",
  "slugHint",
  "description",
] as const);

export type IdentityCandidateEditableField =
  (typeof IDENTITY_CANDIDATE_EDITABLE_FIELDS)[number];

export type IdentityCandidateParentContext = {
  parentWorkId: string | null;
  parentKind: "PACKAGE" | "COMPOUND" | "LINE" | "STANDALONE" | "UNKNOWN";
  tenderId?: string | null;
  dwellingId?: string | null;
  boqLineRef?: string | null;
};

export type IdentityCandidateEvidenceSnapshot = {
  knrEvidence: Array<{ code: string; role: IdentitySourceAuthorityClass; text: string }>;
  sourceEvidence: Array<{ kind: string; authority: IdentitySourceAuthorityClass; detail: string }>;
  semanticEvidence: Array<{ kind: SemanticWorkKind; detail: string }>;
  negativeEvidence: Array<{ kind: string; detail: string }>;
  competingCandidates: Array<{ workIdOrLabel: string; relation: string; disposition: string }>;
};

/** Immutable original evidence captured at creation (never overwritten). */
export type IdentityCandidateRecord = {
  candidateId: string;
  fingerprint: string;
  parentContext: IdentityCandidateParentContext;
  /**
   * INTENT only — never CatalogWork.id until ACCEPTED_CANONICAL (GO39).
   * null = NEW mint-on-Accept · string = REUSE intent of existing canonical (P10).
   */
  proposedWorkId: string | null;
  proposedWorkIdPolicy: "B_GENERATE_ON_ACCEPT_ONLY" | "REUSE_EXISTING_CANONICAL";
  label: string;
  description: string;
  unit: string;
  technology: string | null;
  scope: string;
  family: string;
  slugHint: string | null;
  classification: {
    intendedPlane: "LABOR_ONLY" | "MATERIAL_ONLY" | "PACKAGE" | "UNKNOWN";
    ownerPlaneToday: string | null;
    note: string;
  };
  /** Frozen at creation — do not mutate. */
  originalEvidence: IdentityCandidateEvidenceSnapshot;
  confidenceComponents: IdentityConfidenceComponents;
  provenance: {
    createdBy: "AI_IDENTITY_RESEARCH" | "OWNER_BRIEF" | "BRIDGE_PROPOSAL" | "UNKNOWN";
    goChain: string[];
    inputs: string[];
  };
  createdAt: string;
  updatedAt: string;
  /** Always null — no TTL / no EXPIRED (Owner P2). */
  expiresAt: null;
  status: IdentityCandidateLifecycleStatus;
  persistence: "EPHEMERAL" | "DURABLE";
  ownerDecision: {
    kind: IdentityOwnerDecisionKind;
    decidedAt: string | null;
    note: string | null;
    /** GO38: ACCEPT recorded as intent only — never creates CatalogWork. */
    canonicalAcceptDeferredToGo39: boolean;
  };
  /** Owner-editable overlay (does not mutate originalEvidence). */
  reviewEdits: Partial<{
    label: string;
    description: string;
    unit: string;
    technology: string | null;
    scope: string;
    slugHint: string | null;
  }> | null;
  rejectionHistory: Array<{ at: string; reason: string; by: string }>;
  supersedesCandidateId: string | null;
  supersededByCandidateId: string | null;
  /** Schema for future GO39 — populated only when Accept transaction runs (never in GO38). */
  acceptedCanonicalProvenance: {
    catalogWorkId: string;
    acceptedAt: string;
    fingerprint: string;
    actor: string;
  } | null;
  auditLog: IdentityCandidateAuditEntry[];
  mayWriteCatalogWork: false;
  mayAssignLaborWorkId: false;
  mayActivatePack: false;
  maySetOurRate: false;
};

export type IdentityCandidateAuditEntry = {
  id: string;
  at: string;
  action:
    | "created"
    | "queued_owner_review"
    | "owner_reject"
    | "owner_request_research"
    | "owner_edit"
    | "owner_accept_deferred"
    | "owner_accept_requested"
    | "owner_accept_reused"
    | "owner_accept_created"
    | "owner_accept_failed"
    | "superseded"
    | "persist_durable";
  detail: string;
  actor: string;
};

export type IdentityCandidateDurableStore = {
  schemaVersion: typeof IDENTITY_CANDIDATE_SCHEMA_VERSION;
  updatedAt: string;
  /** Durable rows only (OWNER_REVIEW+). */
  candidates: IdentityCandidateRecord[];
};

export type CreateIdentityCandidateInput = {
  parentContext: IdentityCandidateParentContext;
  label: string;
  description?: string;
  unit: string;
  technology: string | null;
  scope: string;
  family: string;
  intendedPlane: "LABOR_ONLY" | "MATERIAL_ONLY" | "PACKAGE" | "UNKNOWN";
  ownerPlaneToday?: string | null;
  classificationNote?: string;
  evidence: IdentityCandidateEvidenceSnapshot;
  confidenceComponents?: Partial<IdentityConfidenceComponents>;
  provenance?: Partial<IdentityCandidateRecord["provenance"]>;
  slugHint?: string | null;
  /**
   * Only when proposedWorkIdPolicy = REUSE_EXISTING_CANONICAL (P10 evidence-backed).
   * Never invent; never force mint.
   */
  proposedWorkId?: string | null;
  proposedWorkIdPolicy?: "B_GENERATE_ON_ACCEPT_ONLY" | "REUSE_EXISTING_CANONICAL";
  actor?: string;
  nowIso?: string;
  /** If set and open candidate exists with different fingerprint → supersede. */
  supersedeCandidateId?: string | null;
};

export function isDurableStatus(status: IdentityCandidateLifecycleStatus): boolean {
  return (IDENTITY_CANDIDATE_DURABLE_STATUSES as readonly string[]).includes(status);
}

export function isEphemeralStatus(status: IdentityCandidateLifecycleStatus): boolean {
  return status === "DISCOVERED" || status === "IDENTITY_CANDIDATE";
}
