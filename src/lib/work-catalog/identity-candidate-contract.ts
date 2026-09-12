/**
 * GO35 — Autonomous Identity Candidate Contract (ARCHITECTURE / DATA MODEL DESIGN).
 *
 * Product direction (Owner): Architecture B — AI proposes → Owner Accept → canonical Work.
 * GO34 CLOSED: IDENTITY_SOURCE_GAP for GK labor leaf; no autonomous WC create.
 *
 * This module is DESIGN-ONLY:
 * - documents schema / lifecycle / Accept semantics / seams
 * - builds an illustrative GK IdentityCandidate *shape* (no selected laborWorkId)
 * - NEVER persists CatalogWork · NEVER Accept · NEVER pack · NEVER rate
 *
 * Persistence: TARGET contract only — GO35 does NOT write IdentityCandidate to KV.
 */

import {
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
  IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";
import { WORK_CATALOG_SCHEMA_VERSION } from "@/lib/work-catalog/types";
import { discoverLaborLeafIdentities } from "@/lib/work-catalog/labor-leaf-identity-discovery";
import { getOwnerClassificationPlane } from "@/lib/intelligent-estimator/owner-classification-map";

/** Owner product direction — architecture B accepted; IMPLEMENT not authorized. */
export const GO35_PRODUCT_DIRECTION = Object.freeze({
  architecture: "B_AI_PROPOSE_OWNER_ACCEPT" as const,
  status: "PRODUCT_DIRECTION_ACCEPTED_IMPLEMENT_NOT_AUTHORIZED" as const,
  priorAudit: "GO34",
});

/** First-class lifecycle for IdentityCandidate (TARGET). */
export type IdentityCandidateLifecycleStatus =
  | "DISCOVERED"
  | "IDENTITY_CANDIDATE"
  | "OWNER_REVIEW"
  | "ACCEPTED_CANONICAL"
  | "REJECTED"
  | "SUPERSEDED";

/**
 * DRAFT is NOT a separate persisted lifecycle stage.
 * It is an AI-internal pre-publish quality gate before status=IDENTITY_CANDIDATE / OWNER_REVIEW.
 */
export const GO35_DRAFT_POLICY = Object.freeze({
  separatePersistedState: false,
  role: "AI_INTERNAL_PRE_PUBLISH_ONLY",
  note: "Do not add CatalogWork.draft — keep drafts outside WC until Owner Accept",
});

export type IdentitySourceAuthorityClass =
  | "AUTHORITATIVE"
  | "DISCOVERY_ONLY"
  | "CANDIDATE_ONLY"
  | "REJECTED"
  | "FORBIDDEN";

export type IdentityOwnerDecisionKind =
  | "ACCEPT"
  | "REJECT"
  | "REQUEST_RESEARCH"
  | "EDIT_AND_ACCEPT"
  | "PENDING";

export type SemanticWorkKind =
  | "EXACT_WORK"
  | "RELATED_WORK"
  | "COMPONENT"
  | "MATERIAL"
  | "FINISHING"
  | "DEMOLITION"
  | "TURNKEY_SERVICE"
  | "WRONG_TECHNOLOGY"
  | "WRONG_UNIT"
  | "UNKNOWN";

/** Confidence components — qualitative only; no numeric auto-threshold in GO35. */
export type IdentityConfidenceComponents = {
  scopeExact: boolean;
  technologyExact: boolean;
  unitExact: boolean;
  semanticDefinitionClear: boolean;
  authoritativeExternalMapping: boolean;
  noCompetingIdentity: boolean;
  noRejectedEquivalent: boolean;
  deterministicProvenance: boolean;
  /** Narrative rollup — never used to auto-Accept. */
  narrative: string;
};

/**
 * TARGET first-class IdentityCandidate.
 * proposedWorkId is INTENT only — never CatalogWork.id until ACCEPTED_CANONICAL.
 */
export type IdentityCandidateContract = {
  candidateId: string;
  fingerprint: string;
  parentContext: {
    parentWorkId: string | null;
    parentKind: "PACKAGE" | "COMPOUND" | "LINE" | "STANDALONE" | "UNKNOWN";
    tenderId?: string | null;
    dwellingId?: string | null;
    boqLineRef?: string | null;
  };
  /** Provisional slug / reserved id — NOT canonical until Accept. */
  proposedWorkId: string | null;
  proposedWorkIdPolicy: "A_PROVISIONAL_BEFORE_ACCEPT" | "B_GENERATE_ON_ACCEPT_ONLY" | "UNDECIDED";
  label: string;
  description: string;
  unit: string;
  technology: string | null;
  scope: string;
  family: string;
  classification: {
    intendedPlane: "LABOR_ONLY" | "MATERIAL_ONLY" | "PACKAGE" | "UNKNOWN";
    ownerPlaneToday: string | null;
    note: string;
  };
  knrEvidence: Array<{ code: string; role: IdentitySourceAuthorityClass; text: string }>;
  sourceEvidence: Array<{ kind: string; authority: IdentitySourceAuthorityClass; detail: string }>;
  semanticEvidence: Array<{ kind: SemanticWorkKind; detail: string }>;
  negativeEvidence: Array<{ kind: string; detail: string }>;
  competingCandidates: Array<{ workIdOrLabel: string; relation: string; disposition: string }>;
  rejectionHistory: Array<{ at: string; reason: string; by: string }>;
  confidenceComponents: IdentityConfidenceComponents;
  provenance: {
    createdBy: "AI_IDENTITY_RESEARCH" | "OWNER_BRIEF" | "BRIDGE_PROPOSAL" | "UNKNOWN";
    goChain: string[];
    inputs: string[];
  };
  createdAt: string;
  expiresAt: string | null;
  status: IdentityCandidateLifecycleStatus;
  ownerDecision: {
    kind: IdentityOwnerDecisionKind;
    decidedAt: string | null;
    note: string | null;
  };
  /** Hard contract flags. */
  mayWriteCatalogWork: false;
  mayAssignLaborWorkId: false;
  mayActivatePack: false;
  maySetOurRate: false;
};

export type ProposedWorkIdOptionEval = {
  option: "A" | "B";
  title: string;
  collision: string;
  provenance: string;
  idempotency: string;
  auditability: string;
  recommendationNote: string;
};

/** Reuse map — what already exists vs TARGET. */
export function documentExistingModelReuse(): Array<{
  artefact: string;
  reuse: "REUSE" | "REUSE_PARTIAL" | "DO_NOT_REUSE_AS_IDENTITY" | "TARGET_NEW";
  note: string;
}> {
  return [
    {
      artefact: "CatalogWork (schema v" + String(WORK_CATALOG_SCHEMA_VERSION) + ")",
      reuse: "REUSE",
      note: "Canonical identity carrier AFTER Accept only; source seed|custom|copied — no candidate lifecycle",
    },
    {
      artefact: "Owner CREATE A01/A09/C2 + OPS seed",
      reuse: "REUSE",
      note: "Accept materialization pattern — human OPS; IdentityCandidate Accept should call same insert/save gates",
    },
    {
      artefact: "KNR Bridge DF Variant B",
      reuse: "REUSE",
      note: "Proposal→Owner Accept WC — Align IdentityCandidate with Bridge; IMPLEMENT P1 still NOT AUTHORIZED",
    },
    {
      artefact: "Owner classification map (A1)",
      reuse: "REUSE",
      note: "Separate gate AFTER canonical workId exists — not part of IdentityCandidate Accept alone",
    },
    {
      artefact: "G1 OfferBoqMatchCandidate / candidateMatches",
      reuse: "REUSE_PARTIAL",
      note: "Discovery of EXISTING workIds — not mint of new identity; feed competingCandidates / evidence",
    },
    {
      artefact: "GO33 LaborLeafIdentityCandidate",
      reuse: "REUSE_PARTIAL",
      note: "Discovery/ranking scorecard → feeds IdentityCandidate; mayPersistAsLaborWorkId=false always",
    },
    {
      artefact: "GO29 Rate research candidate",
      reuse: "DO_NOT_REUSE_AS_IDENTITY",
      note: "Rate plane only — price ↛ identity",
    },
    {
      artefact: "TechnologyPack + pack lifecycle",
      reuse: "REUSE",
      note: "Consumes canonical laborWorkId AFTER Accept + A1 — never creates identity",
    },
    {
      artefact: "IdentityCandidate (first-class)",
      reuse: "TARGET_NEW",
      note: "Missing entity — prefer separate from CatalogWork fields",
    },
  ];
}

export function documentIdentityLifecycleContract(): Array<{
  status: IdentityCandidateLifecycleStatus | "DRAFT_INTERNAL";
  definition: string;
  autoAllowed: boolean;
  ownerRequired: boolean;
}> {
  return [
    {
      status: "DISCOVERED",
      definition: "Observed work concept (BOQ/KNR/text) — no candidateId yet",
      autoAllowed: true,
      ownerRequired: false,
    },
    {
      status: "DRAFT_INTERNAL",
      definition: "AI-internal incomplete proposal — not Owner-visible; not persisted as durable SSOT",
      autoAllowed: true,
      ownerRequired: false,
    },
    {
      status: "IDENTITY_CANDIDATE",
      definition: "Complete proposal record with fingerprint — still ≠ CatalogWork",
      autoAllowed: true,
      ownerRequired: false,
    },
    {
      status: "OWNER_REVIEW",
      definition: "Queued for exceptional Owner decision",
      autoAllowed: true,
      ownerRequired: true,
    },
    {
      status: "ACCEPTED_CANONICAL",
      definition: "Owner Accept completed — CatalogWork materialized; candidate closed",
      autoAllowed: false,
      ownerRequired: true,
    },
    {
      status: "REJECTED",
      definition: "Owner rejected — must not resurrect without new evidence / SUPERSEDED chain",
      autoAllowed: false,
      ownerRequired: true,
    },
    {
      status: "SUPERSEDED",
      definition: "Replaced by newer candidate or by existing canonical — retained for audit",
      autoAllowed: true,
      ownerRequired: false,
    },
  ];
}

export function evaluateProposedWorkIdOptions(): ProposedWorkIdOptionEval[] {
  return [
    {
      option: "A",
      title: "Deterministic proposedWorkId before Owner Accept (provisional)",
      collision: "MEDIUM — must use reserved namespace / uniqueness check vs active CatalogWork",
      provenance: "HIGH — stable intent id in audit trail before Accept",
      idempotency: "HIGH — same fingerprint → same proposedWorkId",
      auditability: "HIGH",
      recommendationNote:
        "Allowed as INTENT only if namespaced (e.g. proposal:…) OR proven free; never treat as CatalogWork.id",
    },
    {
      option: "B",
      title: "Generate CatalogWork.id only on Owner Accept",
      collision: "LOW — mint under Accept transaction with conflict stop",
      provenance: "MEDIUM — candidate uses candidateId/fingerprint until Accept",
      idempotency: "HIGH via fingerprint; final id chosen at Accept (may equal Owner-edited slug)",
      auditability: "HIGH if Accept records mapping candidateId→workId",
      recommendationNote: "Safest for WC collision; aligns with EDIT_AND_ACCEPT",
    },
  ];
}

/** Architecture recommendation for ID policy — Owner P8 still OPEN. */
export const GO35_PROPOSED_WORK_ID_RECOMMENDATION = Object.freeze({
  recommendation: "B_GENERATE_ON_ACCEPT_WITH_OPTIONAL_SLUG_HINT",
  rationale:
    "candidateId+fingerprint carry identity before Accept; proposedWorkId may be a non-binding slug hint; canonical id minted/confirmed only on Accept",
  policyOpen: "P8",
});

export function documentSourceAuthorityForProposal(): Array<{
  source: string;
  class: IdentitySourceAuthorityClass;
  mayJustifyProposal: boolean;
  mayJustifyCanonicalAlone: boolean;
  note: string;
}> {
  return [
    {
      source: "Existing active CatalogWork exact match",
      class: "AUTHORITATIVE",
      mayJustifyProposal: false,
      mayJustifyCanonicalAlone: true,
      note: "Reuse existing id — do not propose NEW identity",
    },
    {
      source: "Owner CREATE / Accept decision",
      class: "AUTHORITATIVE",
      mayJustifyProposal: true,
      mayJustifyCanonicalAlone: true,
      note: "Only authority for NEW canonical",
    },
    {
      source: "KNR 55-01 / G177 verbatim",
      class: "DISCOVERY_ONLY",
      mayJustifyProposal: true,
      mayJustifyCanonicalAlone: false,
      note: "Evidence for proposal — not auto identity unless future Owner policy amends",
    },
    {
      source: "GO33 ranked catalog candidates",
      class: "CANDIDATE_ONLY",
      mayJustifyProposal: true,
      mayJustifyCanonicalAlone: false,
      note: "Feeds competingCandidates / negativeEvidence",
    },
    {
      source: "Aliases / work-rate identity mappings",
      class: "CANDIDATE_ONLY",
      mayJustifyProposal: true,
      mayJustifyCanonicalAlone: false,
      note: "Exact alias to EXISTING work only",
    },
    {
      source: "Rejected host p2b-scianka-gk-na-stelazu-m2",
      class: "REJECTED",
      mayJustifyProposal: false,
      mayJustifyCanonicalAlone: false,
      note: "HARD — must appear in negativeEvidence; no resurrect",
    },
    {
      source: "Rate research / companyPrice / OUR RATE",
      class: "FORBIDDEN",
      mayJustifyProposal: false,
      mayJustifyCanonicalAlone: false,
      note: "Price ≠ identity",
    },
    {
      source: "TechnologyPack",
      class: "FORBIDDEN",
      mayJustifyProposal: false,
      mayJustifyCanonicalAlone: false,
      note: "Pack consumes identity",
    },
    {
      source: "Similarity / fuzzy label match alone",
      class: "FORBIDDEN",
      mayJustifyProposal: false,
      mayJustifyCanonicalAlone: false,
      note: "Semantic safety — similarity insufficient",
    },
  ];
}

export function documentSemanticSafetyRules(): string[] {
  return [
    "Distinguish EXACT_WORK vs RELATED_WORK vs COMPONENT vs MATERIAL vs FINISHING vs DEMOLITION vs TURNKEY_SERVICE",
    "WRONG_TECHNOLOGY / WRONG_UNIT → cannot be ACCEPTED without Owner EDIT",
    "Similarity score alone NEVER promotes to OWNER_REVIEW recommendation ACCEPT",
    "Parent PACKAGE workId cannot be proposed as its own labor leaf",
    "Rejected equivalents must block silent ACCEPT recommendation",
    "Generic legacy buckets stay IDENTITY_SEMANTIC_HOLD without exact evidence",
  ];
}

export function documentOwnerReviewContract(): {
  decisionKinds: IdentityOwnerDecisionKind[];
  mustShow: string[];
  automaticAcceptance: false;
} {
  return {
    decisionKinds: ["ACCEPT", "REJECT", "REQUEST_RESEARCH", "EDIT_AND_ACCEPT", "PENDING"],
    mustShow: [
      "proposed identity (label/unit/tech/scope)",
      "why it matches (semanticEvidence)",
      "sourceEvidence + knrEvidence",
      "competingCandidates",
      "rejected / negativeEvidence",
      "confidenceComponents (qualitative)",
      "limitations / missing authority",
      "fingerprint + candidateId",
    ],
    automaticAcceptance: false,
  };
}

export function documentAcceptSemantics(): {
  steps: string[];
  catalogWorkSource: string;
  separateGatesAfter: string[];
  neverOnAccept: string[];
} {
  return {
    steps: [
      "Validate fingerprint still current (no SUPERSEDED / no competing canonical collision)",
      "Mint or confirm CatalogWork.id (per P8) under Owner Accept transaction",
      "Insert CatalogWork via existing insertWorkBothRegions + saveWorkCatalogRouted / OPS",
      "Set source=custom (or future source=owner_accept) + provenance audit trail candidateId→workId",
      "Optional: write OWNER_KNR_MAPPINGS exact row if Owner authorizes mapping in same Accept UI",
      "Optional: seed aliases only if Owner confirms",
      "Mark IdentityCandidate status=ACCEPTED_CANONICAL; close OWNER_REVIEW",
      "Emit audit event (who/when/fingerprint/workId)",
    ],
    catalogWorkSource: "custom (today) — TARGET may add owner_accept provenance without overloading ourWorkRate",
    separateGatesAfter: [
      "A1 Owner classification map (LABOR_ONLY / COMPOUND parent)",
      "TechnologyPack DRAFT→APPROVED→ACTIVE",
      "Leaf research gate",
      "GO29 Rate Candidate (isOurRate=false)",
      "OUR RATE Accept (separate)",
    ],
    neverOnAccept: [
      "OUR RATE",
      "TechnologyPack ACTIVE",
      "PASS4",
      "Finance unlock",
      "G3",
      "silent A1 plane",
    ],
  };
}

export function documentTechnologyPackGatesAfterIdentity(): string[] {
  return [
    "Canonical labor identity exists (CatalogWork.id)",
    "Owner A1 plane set (LABOR_ONLY leaf and/or COMPOUND parent+leaf auth)",
    "TechnologyPack DRAFT bound to laborWorkId",
    "RECIPE provenance → APPROVED → ACTIVE",
    "assertLeafLaborResearchAllowed",
    "Leaf Research → GO29 Rate Evaluation",
  ];
}

export function documentEndToEndFutureFlow(): string[] {
  return [
    "G1 trusted package",
    "Identity Discovery (GO33)",
    "IdentityCandidate (GO35 contract)",
    "Owner Review / Accept (architecture B)",
    "canonical labor leaf CatalogWork",
    "A1 / Owner Map",
    "TechnologyPack DRAFT→ACTIVE",
    "Leaf Research",
    "GO29 Rate Evaluation",
  ];
}

export function documentAutonomyBoundary(): {
  auto: string[];
  owner: string[];
  forbiddenAuto: string[];
} {
  return {
    auto: [
      "discovery",
      "candidate generation",
      "candidate ranking",
      "evidence collection",
      "conflict detection",
      "recommendation (non-binding)",
    ],
    owner: [
      "canonical identity creation",
      "final identity authority",
      "ambiguous candidate selection",
      "pack activation if required",
      "A1 classification",
      "OUR RATE Accept",
    ],
    forbiddenAuto: [
      "canonical Work Catalog write",
      "OUR RATE assignment",
      "rate Accept",
      "resurrect REJECTED host",
      "KNR→canonical without Accept",
      "similarity→canonical",
    ],
  };
}

export function documentDataModelGapAndPersistence(): {
  preferEntity: "IdentityCandidate";
  avoid: string[];
  persistenceNecessary: "OPTIONAL_UNTIL_OWNER_REVIEW_UI";
  safeStorageTarget: string[];
  ttlPolicy: string;
  go35WritesPersistence: false;
} {
  return {
    preferEntity: "IdentityCandidate",
    avoid: [
      "Adding many lifecycle fields onto CatalogWork",
      "Treating GO33 LaborLeafIdentityCandidate as durable SSOT",
      "Storing proposals inside ourWorkRate / companyPrice",
    ],
    persistenceNecessary: "OPTIONAL_UNTIL_OWNER_REVIEW_UI",
    safeStorageTarget: [
      "Ephemeral session / audit artefact (read-only) until Owner Review UI GO",
      "TARGET optional KV e.g. kw-identity-candidates — append-only candidates + TTL — separate Owner GO",
      "Never write CatalogWork from candidate generator",
    ],
    ttlPolicy: "TARGET: expiresAt required if persisted; SUPERSEDED/REJECTED retained for audit with capped history",
    go35WritesPersistence: false,
  };
}

export function documentFingerprintContract(): {
  inputs: string[];
  property: string;
  collisionWithCatalogWork: string;
} {
  return {
    inputs: [
      "parentWorkId|null",
      "intendedPlane",
      "unit",
      "technology normalized",
      "scope normalized",
      "semantic definition hash",
      "primary knrEvidence keys",
      "negativeEvidence reject-host set",
    ],
    property: "Same inputs → same fingerprint → at most one open IDENTITY_CANDIDATE/OWNER_REVIEW",
    collisionWithCatalogWork: "Fingerprint ≠ workId; Accept still conflict-checks CatalogWork.id",
  };
}

export function documentVersioningSupersession(): Array<{ event: string; behavior: string }> {
  return [
    {
      event: "New evidence arrives",
      behavior: "Create new candidate with new fingerprint OR update draft; prior open candidate → SUPERSEDED if materially different",
    },
    {
      event: "Candidate obsolete",
      behavior: "status=SUPERSEDED; keep audit; do not Accept",
    },
    {
      event: "Owner REJECT",
      behavior: "status=REJECTED + rejectionHistory; block resurrect unless fingerprint inputs change materially",
    },
    {
      event: "Better candidate appears",
      behavior: "Rank; demote previous to SUPERSEDED; Owner sees competing set",
    },
    {
      event: "Canonical work already exists",
      behavior: "Do not propose NEW; recommend REUSE existing workId; candidate SUPERSEDED or never created",
    },
  ];
}

export function auditLegacyIdentityCandidateHold(): {
  workId: string;
  verdict: "IDENTITY_SEMANTIC_HOLD";
  mayGenerateGenericIdentity: false;
  note: string;
} {
  return {
    workId: "legacy-roboty_ogolnobudowlane-m2",
    verdict: "IDENTITY_SEMANTIC_HOLD",
    mayGenerateGenericIdentity: false,
    note: "Vague legacy ≠ exact labor leaf; candidate generation HOLD without exact evidence",
  };
}

export function listOwnerPolicyQuestionsP1P12(): Array<{ id: string; question: string }> {
  return [
    { id: "P1", question: "AI may propose new identity? (direction B implies YES for propose — confirm)" },
    { id: "P2", question: "Persistence of IdentityCandidate (ephemeral vs KV)?" },
    { id: "P3", question: "Candidate TTL / expiresAt policy?" },
    { id: "P4", question: "Minimum identity evidence requirements for OWNER_REVIEW?" },
    { id: "P5", question: "External/KNR authority — discovery-only forever or future authorize?" },
    { id: "P6", question: "Owner review UI required before any Accept path?" },
    { id: "P7", question: "Accept semantics — aliases/KNR map/A1 bundled or separate?" },
    { id: "P8", question: "ID generation — provisional proposedWorkId vs mint-on-Accept?" },
    { id: "P9", question: "Canonical versioning after Accept?" },
    { id: "P10", question: "Supersession rules when evidence changes?" },
    { id: "P11", question: "Pack activation after identity Accept — auto DRAFT only or still Owner?" },
    { id: "P12", question: "Future autonomous identity creation (architecture C) — remain NO?" },
  ];
}

/**
 * Illustrative GK IdentityCandidate for TPI A09 package labor component.
 * Does NOT select a laborWorkId as canonical.
 */
export function designGkLaborIdentityCandidateIllustration(
  fixedAt = "2026-09-09T07:40:00.000Z",
): {
  parentPackage: string;
  targetLaborComponent: string;
  requiredIdentity: string;
  availableEvidence: string[];
  missingAuthority: string[];
  competingCandidates: Array<{ workIdOrLabel: string; disposition: string }>;
  ownerDecisionRequired: true;
  candidate: IdentityCandidateContract;
} {
  const go33 = discoverLaborLeafIdentities({});
  const competing = go33.candidates
    .filter((c) => c.identityClass !== "STRONG_CANDIDATE")
    .slice(0, 8)
    .map((c) => ({
      workIdOrLabel: c.candidateWorkId,
      disposition: `${c.identityClass} · ${c.rejectionKind ?? "n/a"}`,
    }));

  const fingerprint =
    "fp:a09-gk-labor:" +
    [
      IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
      "LABOR_ONLY",
      "m2",
      "GK",
      "partition-wall",
      "knr:55-01",
      "reject:" + IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
    ].join("|");

  const candidate: IdentityCandidateContract = {
    candidateId: "ic:tpi729:a09:labor:illustration",
    fingerprint,
    parentContext: {
      parentWorkId: IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
      parentKind: "PACKAGE",
      tenderId: "ocds-148610-15299a87-45b5-465d-872c-6aa6f11f076c",
      dwellingId: "kosciuszki-46-4",
      boqLineRef: "G177",
    },
    proposedWorkId: null,
    proposedWorkIdPolicy: "B_GENERATE_ON_ACCEPT_ONLY",
    label: "Ścianki działowe GK — robocizna (leaf) — PROPOSAL ONLY",
    description:
      "TARGET labor component of G177 PACKAGE — partition wall GK on metal studs, double-sided single layer — NOT the package itself",
    unit: "m2",
    technology: "GK",
    scope: "LABOR_ONLY leaf for partition wall installation (not turnkey, not material pack)",
    family: "SCIANY_GK",
    classification: {
      intendedPlane: "LABOR_ONLY",
      ownerPlaneToday: getOwnerClassificationPlane(IK_OWNER_CREATE_A09_PACKAGE_WORK_ID),
      note: "Parent PACKAGE Owner map miss/UNKNOWN today; leaf plane requires separate A1 after Accept",
    },
    knrEvidence: [
      {
        code: "55-01",
        role: "DISCOVERY_ONLY",
        text: "KNR table referenced by G177 BOQ — discovery provenance only",
      },
      {
        code: "G177",
        role: "DISCOVERY_ONLY",
        text: IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
      },
    ],
    sourceEvidence: [
      {
        kind: "PARENT_PACKAGE",
        authority: "AUTHORITATIVE",
        detail: `Package ${IK_OWNER_CREATE_A09_PACKAGE_WORK_ID} exists; costSplit ${JSON.stringify(IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT)} ≠ laborWorkId`,
      },
      {
        kind: "GO33_DISCOVERY",
        authority: "CANDIDATE_ONLY",
        detail: `bucket=${go33.gkBucket} strong=${go33.candidates.filter((c) => c.identityClass === "STRONG_CANDIDATE").length}`,
      },
      {
        kind: "KNR_BRIDGE_DF",
        authority: "DISCOVERY_ONLY",
        detail: "Variant B proposal→Accept — IMPLEMENT P1 NOT AUTHORIZED",
      },
    ],
    semanticEvidence: [
      { kind: "COMPONENT", detail: "Labor share of PACKAGE — not EXACT existing leaf" },
      { kind: "TURNKEY_SERVICE", detail: "Parent package is turnkey/packaged — must not mint leaf as package" },
    ],
    negativeEvidence: [
      {
        kind: "REJECTED_HOST",
        detail: `${IK_OWNER_A09_REJECTED_LABOR_HOST_ID} — A09 HARD reject · no resurrect`,
      },
      {
        kind: "NO_AUTHORITATIVE_LEAF",
        detail: "GO34 IDENTITY_SOURCE_GAP — no CatalogWork labor leaf",
      },
      {
        kind: "SIMILARITY_INSUFFICIENT",
        detail: "GO33 WRONG_SCOPE/REJECTED candidates must not become proposedWorkId",
      },
    ],
    competingCandidates: competing.map((c) => ({
      workIdOrLabel: c.workIdOrLabel,
      relation: "GO33_POOL",
      disposition: c.disposition,
    })),
    rejectionHistory: [],
    confidenceComponents: {
      scopeExact: false,
      technologyExact: true,
      unitExact: true,
      semanticDefinitionClear: false,
      authoritativeExternalMapping: false,
      noCompetingIdentity: competing.length === 0,
      noRejectedEquivalent: true,
      deterministicProvenance: true,
      narrative:
        "Technology+unit clear; authoritative labor leaf identity MISSING — Owner Accept required to create NEW canonical",
    },
    provenance: {
      createdBy: "AI_IDENTITY_RESEARCH",
      goChain: ["GO33", "GO34", "GO35"],
      inputs: ["G177", "A09 package", "GO33 discovery pool"],
    },
    createdAt: fixedAt,
    expiresAt: null,
    status: "IDENTITY_CANDIDATE",
    ownerDecision: {
      kind: "PENDING",
      decidedAt: null,
      note: "OWNER DECISION REQUIRED — no auto Accept",
    },
    mayWriteCatalogWork: false,
    mayAssignLaborWorkId: false,
    mayActivatePack: false,
    maySetOurRate: false,
  };

  return {
    parentPackage: IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
    targetLaborComponent: "LABOR_ONLY leaf of G177 package (partition wall GK)",
    requiredIdentity: "NEW canonical CatalogWork labor leaf (not selected in GO35)",
    availableEvidence: [
      "G177 verbatim BOQ",
      "KNR 55-01 discovery",
      "Parent PACKAGE CatalogWork",
      "GO33 classified pool (no STRONG)",
      "Rejected host list",
    ],
    missingAuthority: [
      "Authoritative labor CatalogWork.id",
      "Owner Accept of IdentityCandidate",
      "A1 LABOR_ONLY for leaf",
      "Authoritative KNR→WC mapping (Slice D / OWNER_KNR_MAPPINGS)",
    ],
    competingCandidates: competing,
    ownerDecisionRequired: true,
    candidate,
  };
}

/**
 * Full GO35 contract design artefact builder — pure / no I/O / no mutation.
 */
export function designIdentityCandidateContract(): {
  verdict: "IDENTITY_CANDIDATE_CONTRACT_DESIGN_PASS_NO_RUNTIME";
  productDirection: typeof GO35_PRODUCT_DIRECTION;
  reuse: ReturnType<typeof documentExistingModelReuse>;
  lifecycle: ReturnType<typeof documentIdentityLifecycleContract>;
  draftPolicy: typeof GO35_DRAFT_POLICY;
  schemaFieldList: string[];
  proposedWorkIdOptions: ProposedWorkIdOptionEval[];
  proposedWorkIdRecommendation: typeof GO35_PROPOSED_WORK_ID_RECOMMENDATION;
  authority: ReturnType<typeof documentSourceAuthorityForProposal>;
  semanticSafety: string[];
  gkProposal: ReturnType<typeof designGkLaborIdentityCandidateIllustration>;
  ownerReview: ReturnType<typeof documentOwnerReviewContract>;
  acceptSemantics: ReturnType<typeof documentAcceptSemantics>;
  technologyPackGates: string[];
  endToEndFlow: string[];
  go33Integration: string;
  go29Integration: string;
  autonomyBoundary: ReturnType<typeof documentAutonomyBoundary>;
  dataModel: ReturnType<typeof documentDataModelGapAndPersistence>;
  fingerprint: ReturnType<typeof documentFingerprintContract>;
  versioning: ReturnType<typeof documentVersioningSupersession>;
  legacy: ReturnType<typeof auditLegacyIdentityCandidateHold>;
  ownerPolicyQuestions: ReturnType<typeof listOwnerPolicyQuestionsP1P12>;
  mutationGuard: {
    catalogWrite: false;
    identityAccept: false;
    laborWorkId: false;
    pack: false;
    rate: false;
    classificationMutation: false;
    identityCandidateKvWrite: false;
  };
} {
  return {
    verdict: "IDENTITY_CANDIDATE_CONTRACT_DESIGN_PASS_NO_RUNTIME",
    productDirection: GO35_PRODUCT_DIRECTION,
    reuse: documentExistingModelReuse(),
    lifecycle: documentIdentityLifecycleContract(),
    draftPolicy: GO35_DRAFT_POLICY,
    schemaFieldList: [
      "candidateId",
      "fingerprint",
      "parentContext",
      "proposedWorkId (nullable INTENT)",
      "label",
      "description",
      "unit",
      "technology",
      "scope",
      "family",
      "classification",
      "knrEvidence",
      "sourceEvidence",
      "semanticEvidence",
      "negativeEvidence",
      "competingCandidates",
      "rejectionHistory",
      "confidenceComponents",
      "provenance",
      "createdAt",
      "expiresAt",
      "status",
      "ownerDecision",
    ],
    proposedWorkIdOptions: evaluateProposedWorkIdOptions(),
    proposedWorkIdRecommendation: GO35_PROPOSED_WORK_ID_RECOMMENDATION,
    authority: documentSourceAuthorityForProposal(),
    semanticSafety: documentSemanticSafetyRules(),
    gkProposal: designGkLaborIdentityCandidateIllustration(),
    ownerReview: documentOwnerReviewContract(),
    acceptSemantics: documentAcceptSemantics(),
    technologyPackGates: documentTechnologyPackGatesAfterIdentity(),
    endToEndFlow: documentEndToEndFutureFlow(),
    go33Integration:
      "GO33 discovery/ranking → evidence + competingCandidates on IdentityCandidate; never mayPersistAsLaborWorkId",
    go29Integration:
      "GO29 only AFTER Accept→canonical laborWorkId→(optional pack)→Leaf Research; IdentityCandidate must not trigger rate research",
    autonomyBoundary: documentAutonomyBoundary(),
    dataModel: documentDataModelGapAndPersistence(),
    fingerprint: documentFingerprintContract(),
    versioning: documentVersioningSupersession(),
    legacy: auditLegacyIdentityCandidateHold(),
    ownerPolicyQuestions: listOwnerPolicyQuestionsP1P12(),
    mutationGuard: {
      catalogWrite: false,
      identityAccept: false,
      laborWorkId: false,
      pack: false,
      rate: false,
      classificationMutation: false,
      identityCandidateKvWrite: false,
    },
  };
}

export const GO35_SAFETY_INVARIANTS = Object.freeze([
  "proposedWorkId_not_canonical_until_accept",
  "no_auto_accept",
  "knr_discovery_not_canonical_alone",
  "price_not_identity",
  "rejected_not_resurrected",
  "similarity_insufficient",
  "legacy_semantic_hold",
  "prefer_identity_candidate_over_catalogwork_lifecycle_fields",
  "go35_no_kv_write",
]);
