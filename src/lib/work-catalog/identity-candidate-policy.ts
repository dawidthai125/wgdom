/**
 * GO36 — Identity Candidate Policy Closure (POLICY / DESIGN ONLY).
 *
 * Closes GO35 Owner policy questions P1–P12 where SSOT evidence allows.
 * Numeric TTL durations without ops SSOT → OPEN (structure frozen).
 *
 * NEVER: WC write · KV write · Accept · pack · rate · research · commit.
 */

import {
  GO35_PRODUCT_DIRECTION,
  GO35_PROPOSED_WORK_ID_RECOMMENDATION,
  designIdentityCandidateContract,
} from "@/lib/work-catalog/identity-candidate-contract";
import {
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";
import { getOwnerClassificationPlane } from "@/lib/intelligent-estimator/owner-classification-map";

/** v1.1 — Owner GO OWNER_POLICY_GO_AUTONOMOUS_IDENTITY_AID_v1 amends P12. */
export const GO36_POLICY_VERSION = "identity-candidate-policy-v1.1-aid-p12" as const;
export const GO36_P12_AMENDMENT_ID = "GO36-P12-AMEND-AUTONOMOUS-IDENTITY-AID_v1" as const;

export type PolicyStatus = "FROZEN" | "OPEN";

export type PolicyDecision = {
  id: string;
  title: string;
  status: PolicyStatus;
  decision: string;
  rationale: string;
  evidenceSources: string[];
  evidenceGap?: string;
};

/** Authority classes reused from GO34/GO35 — frozen for policy. */
export const GO36_AUTHORITY_MATRIX = Object.freeze([
  {
    source: "Owner Accept / Owner CREATE",
    class: "AUTHORITATIVE",
    mayPropose: true,
    mayCanonicalAlone: true,
  },
  {
    source: "AID-v1 AUTONOMOUS_DECIDE (GO36-P12 amend)",
    class: "AUTHORITATIVE",
    mayPropose: true,
    mayCanonicalAlone: true,
    note: "CIV TRUSTED / compound identity trust only — not invent OUR RATE/BOM; CatalogWork mint GO39/41 still Owner",
  },
  {
    source: "Existing active CatalogWork (exact reuse)",
    class: "AUTHORITATIVE",
    mayPropose: false,
    mayCanonicalAlone: true,
    note: "REUSE — do not mint NEW",
  },
  {
    source: "KNR / G177",
    class: "DISCOVERY_ONLY",
    mayPropose: true,
    mayCanonicalAlone: false,
  },
  {
    source: "GO33 discovery pool / aliases",
    class: "CANDIDATE_ONLY",
    mayPropose: true,
    mayCanonicalAlone: false,
  },
  {
    source: "Rejected host / REJECTED candidate",
    class: "REJECTED",
    mayPropose: false,
    mayCanonicalAlone: false,
  },
  {
    source: "Similarity alone / rate / pack / price",
    class: "FORBIDDEN",
    mayPropose: false,
    mayCanonicalAlone: false,
  },
] as const);

export function freezePolicyP1P12(): PolicyDecision[] {
  return [
    {
      id: "P1",
      title: "Candidate persistence",
      status: "FROZEN",
      decision: "HYBRID",
      rationale:
        "DISCOVERED/DRAFT = ephemeral (session/memory only). IDENTITY_CANDIDATE may remain ephemeral until queued. OWNER_REVIEW (and closed REJECTED/SUPERSEDED/ACCEPTED audit rows) TARGET durable store separate from CatalogWork — only after Owner Review UI GO authorizes KV. GO36 writes nothing.",
      evidenceSources: [
        "GO35 documentDataModelGapAndPersistence (OPTIONAL_UNTIL_OWNER_REVIEW_UI)",
        "IK-KNR-WC-IDENTITY-BRIDGE-DF Variant B (proposal ≠ CatalogWork)",
        "GO34: prefer IdentityCandidate over CatalogWork lifecycle fields",
      ],
    },
    {
      id: "P2",
      title: "TTL / retention",
      status: "FROZEN",
      decision:
        "EPHEMERAL_BEFORE_REVIEW__DURABLE_FROM_OWNER_REVIEW — IDENTITY_CANDIDATE ephemeral; OWNER_REVIEW/REJECTED/SUPERSEDED/ACCEPTED provenance durable indefinite; no EXPIRED; no hard delete; no TTL day numbers",
      rationale:
        "Owner GO38 closed P2 after GO37 NO_BASIS audit: before OWNER_REVIEW=ephemeral; from OWNER_REVIEW onward=durable indefinite retention.",
      evidenceSources: [
        "Owner GO38 P2 POLICY FROZEN",
        "GO37 IDENTITY_CANDIDATE_TTL_AUDIT_PASS_P2_REMAINS_OPEN (historical — durations were open)",
        "GO36 structure: no EXPIRED state",
      ],
    },
    {
      id: "P3",
      title: "Evidence contract",
      status: "FROZEN",
      decision: "SPLIT_PROPOSE_VS_ACCEPT",
      rationale:
        "PROPOSE minimum ≠ ACCEPT CANONICAL minimum. See evidenceRules in freezeIdentityCandidatePolicy().",
      evidenceSources: [
        "GO35 semanticSafety + confidenceComponents",
        "GO34 IDENTITY_SOURCE_GAP / AUTO_IDENTITY_ELIGIBLE evidence list",
        "Bridge DF: proposal ≠ CatalogWork; Owner Accept mandatory",
      ],
    },
    {
      id: "P4",
      title: "KNR/G177 authority",
      status: "FROZEN",
      decision: "DISCOVERY_ONLY_FOR_CANONICAL__MAP_AFTER_ACCEPT",
      rationale:
        "KNR/G177 may justify proposal evidence only. Cannot alone create canonical WC. OWNER_KNR_MAPPINGS / Slice D attach only after (or as optional Accept-bundle step under Owner) when workId exists. Existing authoritative KNR map may influence ranking toward REUSE of mapped workId — never mint NEW from KNR alone.",
      evidenceSources: [
        "IK-KNR-WC-IDENTITY-BRIDGE-DESIGN-FREEZE § Owner-approved contract 2–10",
        "GO35 P5 / knrEvidence DISCOVERY_ONLY",
        "GO34 knrG177 DISCOVERY_ONLY",
      ],
    },
    {
      id: "P5",
      title: "UI Review",
      status: "FROZEN",
      decision: "OWNER_REVIEW_CONTRACT_V1",
      rationale:
        "Actions ACCEPT|REJECT|REQUEST_RESEARCH|EDIT_AND_ACCEPT. No auto Accept. Editable vs immutable defined in ownerReviewContract. UI implementation NOT AUTHORIZED in GO36.",
      evidenceSources: ["GO35 documentOwnerReviewContract", "Architecture B product direction"],
    },
    {
      id: "P6",
      title: "Accept bundle",
      status: "FROZEN",
      decision: "ATOMIC_ACCEPT_TRANSACTION_V1",
      rationale:
        "Explicit sequence: validate fingerprint → mint/confirm CatalogWork.id → insert OPS/router → persist candidate→workId provenance. Optional Owner-confirmed alias/KNR map. Forbidden side effects: OUR RATE, Pack ACTIVE, silent A1, Finance, G3. Idempotent on fingerprint+Accept intent.",
      evidenceSources: [
        "GO35 documentAcceptSemantics",
        "Owner CREATE A09/A01 OPS insertWorkBothRegions + saveWorkCatalogRouted",
        "Bridge DF Owner Accept gate",
      ],
    },
    {
      id: "P7",
      title: "ID generation",
      status: "FROZEN",
      decision: "MINT_ON_ACCEPT",
      rationale:
        "candidateId deterministic from fingerprint namespace. fingerprint from frozen input set. CatalogWork.id minted/confirmed only on Accept (slug hint optional non-binding). Collision → fail-closed retry/EDIT. Aligns GO35 B_GENERATE_ON_ACCEPT_WITH_OPTIONAL_SLUG_HINT.",
      evidenceSources: [
        "GO35 GO35_PROPOSED_WORK_ID_RECOMMENDATION",
        "GO35 documentFingerprintContract",
        "A09 conflict-stop seed pattern",
      ],
    },
    {
      id: "P8",
      title: "Versioning",
      status: "FROZEN",
      decision: "IMMUTABLE_CANDIDATE_ROWS",
      rationale:
        "Open candidates are not silently mutated by new evidence. Material evidence change → new fingerprint → new candidate; prior open → SUPERSEDED. Parallel competing allowed until Owner chooses. REJECTED stays REJECTED.",
      evidenceSources: ["GO35 documentVersioningSupersession", "GO35 fingerprint idempotency"],
    },
    {
      id: "P9",
      title: "Supersession",
      status: "FROZEN",
      decision: "SUPERSEDE_CHAIN_PRESERVES_HISTORY",
      rationale:
        "old → SUPERSEDED → new candidateId link. Decision/rejection history survives. ACCEPTED_CANONICAL CatalogWork never silently replaced by supersession. Rejected identity cannot resurrect via similarity; requires materially new fingerprint + Owner path.",
      evidenceSources: [
        "GO35 versioning events",
        "A09 HARD reject host must not resurrect",
        "GO33/GO34 rejected≠resurrect safety",
      ],
    },
    {
      id: "P10",
      title: "Existing canonical identity",
      status: "FROZEN",
      decision: "REUSE_DEFAULT",
      rationale:
        "If equivalent active CatalogWork exists (exact scope+unit+tech+semantic, or authoritative alias/KNR map to existing id) → REUSE; do not create NEW. Safe reuse requires deterministic match evidence — not similarity alone.",
      evidenceSources: [
        "GO35 versioning: canonical exists → REUSE",
        "Bridge/Slice D: map to EXISTING workId",
        "GO34 AUTHORITATIVE current WC",
      ],
    },
    {
      id: "P11",
      title: "TechnologyPack boundary",
      status: "FROZEN",
      decision: "IDENTITY_ACCEPT_NE_PACK_ACTIVE",
      rationale:
        "Identity Accept may unlock NEXT step eligibility only. Pack remains DRAFT→APPROVED→ACTIVE under separate Owner/recipe gates. No silent ACTIVE on Accept.",
      evidenceSources: [
        "GO35 technologyPackGates + acceptSemantics.neverOnAccept",
        "GO32 pack lifecycle audit",
      ],
    },
    {
      id: "P12",
      title: "Future autonomous create",
      status: "FROZEN",
      decision: "AUTHORIZED_WHEN_AID_v1_PASS__OWNER_POLICY_GO_AUTONOMOUS_IDENTITY_AID_v1",
      rationale:
        "Amended by Owner GO OWNER_POLICY_GO_AUTONOMOUS_IDENTITY_AID_v1 (GO36-P12-AMEND-AUTONOMOUS-IDENTITY-AID_v1). Autonomous CIV TRUSTED / identity persistence is legal ONLY when AID-v1 returns AUTONOMOUS_DECIDE (HIGH or qualifying MEDIUM). Does NOT authorize invent OUR RATE / BOM / price / qtyFactor. Owner Review CatalogWork mint (GO39/GO41) remains Owner-only. Owner Review automaticAcceptance remains false. LOW/AMBIGUITY/CONFLICT/NO_CANDIDATE stay fail-closed.",
      evidenceSources: [
        "Master SSOT §0 / §0.2 Autonomous Decision Contract (PRODUCT LAW)",
        "OWNER_POLICY_GO_AUTONOMOUS_IDENTITY_AID_v1",
        "AID-v1 autonomous-identity-decision-contract.ts",
        "Prior: GO35 direction B — superseded for AID PASS identity trust only",
      ],
    },
  ];
}

export function freezeEvidenceRules(): {
  minimumToCreateIdentityCandidate: string[];
  discoveryEvidence: string[];
  semanticEvidence: string[];
  negativeEvidence: string[];
  competingCandidates: string[];
  authorityEvidence: string[];
  sufficientToPropose: string[];
  sufficientToAcceptCanonical: string[];
  neverSufficientAlone: string[];
} {
  return {
    minimumToCreateIdentityCandidate: [
      "parentContext OR explicit STANDALONE intent",
      "label + unit + intendedPlane/scope",
      "at least one discovery OR semantic evidence item",
      "fingerprint computable from frozen inputs",
      "negativeEvidence scanned for HARD rejects (may be empty list after scan)",
    ],
    discoveryEvidence: [
      "BOQ/G177 verbatim",
      "KNR codes (DISCOVERY_ONLY)",
      "tender/dossier text",
      "GO33 pool hits",
    ],
    semanticEvidence: [
      "EXACT_WORK / COMPONENT / RELATED classification",
      "technology + unit exactness",
      "scope LABOR_ONLY vs PACKAGE vs MATERIAL",
    ],
    negativeEvidence: [
      "rejected hosts",
      "WRONG_SCOPE / WRONG_UNIT / TURNKEY mis-bind",
      "prior Owner REJECT for same fingerprint family",
    ],
    competingCandidates: [
      "GO33 ranked ids",
      "alias collisions",
      "parallel open IdentityCandidates",
    ],
    authorityEvidence: [
      "Owner Accept/CREATE only for NEW canonical",
      "existing CatalogWork exact for REUSE",
      "approved OWNER_KNR_MAPPINGS to existing workId (reuse ranking)",
    ],
    sufficientToPropose: [
      "minimumToCreateIdentityCandidate satisfied",
      "KNR/G177 and/or GO33 discovery may support",
      "no requirement for Owner Accept yet",
    ],
    sufficientToAcceptCanonical: [
      "Owner explicit ACCEPT or EDIT_AND_ACCEPT",
      "OR AID-v1 AUTONOMOUS_DECIDE (HIGH or qualifying MEDIUM under GO36-P12-AMEND-AUTONOMOUS-IDENTITY-AID_v1) — elevates CIV TRUSTED / compound identity trust; does not alone mint CatalogWork (GO39/41 still Owner)",
      "fingerprint still current (not SUPERSEDED)",
      "no unresolved HARD reject resurrection",
      "collision check vs CatalogWork pass OR Owner remint (Owner Accept path)",
      "NOT: KNR alone · similarity alone · rate evidence · name/costSplit/price/Pack alone",
    ],
    neverSufficientAlone: [
      "KNR/G177",
      "similarity score",
      "research price / OUR RATE",
      "TechnologyPack presence",
      "costSplit ratios",
      "rejected host",
    ],
  };
}

export function freezeOwnerReviewContract(): {
  actions: Array<"ACCEPT" | "REJECT" | "REQUEST_RESEARCH" | "EDIT_AND_ACCEPT">;
  automaticAcceptance: false;
  editableOnEditAndAccept: string[];
  immutable: string[];
  ownerMustSee: string[];
  conflictDisplay: string[];
  resurrectionProtection: string[];
} {
  return {
    actions: ["ACCEPT", "REJECT", "REQUEST_RESEARCH", "EDIT_AND_ACCEPT"],
    automaticAcceptance: false,
    editableOnEditAndAccept: [
      "label",
      "description",
      "unit (with conflict re-check)",
      "technology",
      "scope / intendedPlane",
      "family / trade hint",
      "optional slug hint for mint-on-Accept",
      "optional alias list (Owner-confirmed)",
      "optional KNR map intent (Owner-confirmed)",
    ],
    immutable: [
      "candidateId",
      "fingerprint (edit that changes identity inputs → new candidate, not mutate)",
      "provenance.goChain / createdAt",
      "rejectionHistory",
      "HARD negativeEvidence entries (may add notes, not erase)",
      "parentContext.parentWorkId when bound to PACKAGE",
    ],
    ownerMustSee: [
      "proposed identity fields",
      "why-match semanticEvidence",
      "sourceEvidence + knrEvidence",
      "unit / technology / scope",
      "competingCandidates",
      "rejected / negativeEvidence",
      "confidenceComponents (qualitative)",
      "limitations / missingAuthority",
      "fingerprint + candidateId",
    ],
    conflictDisplay: [
      "parallel open candidates same parent+plane",
      "CatalogWork id collision on slug hint",
      "alias pointing to different existing workIds",
      "GO33 REJECTED vs PLAUSIBLE side-by-side",
    ],
    resurrectionProtection: [
      "REJECTED status + rejectionHistory retained",
      "HARD reject hosts always in negativeEvidence",
      "similarity cannot clear REJECTED",
      "new proposal requires materially new fingerprint + Owner path",
    ],
  };
}

export function freezeAcceptTransaction(): {
  sequence: string[];
  optionalOwnerConfirmed: string[];
  forbiddenSideEffects: string[];
  transactionRequirements: string[];
  idempotency: string[];
} {
  return {
    sequence: [
      "1. Load IdentityCandidate in OWNER_REVIEW",
      "2. Validate fingerprint still current (not SUPERSEDED/REJECTED/expired-archival)",
      "3. If equivalent canonical exists → abort NEW mint; offer REUSE (P10)",
      "4. Mint or confirm CatalogWork.id (MINT_ON_ACCEPT; apply EDIT fields if EDIT_AND_ACCEPT)",
      "5. Collision check fail-closed; Owner remint/edit or abort",
      "6. Insert CatalogWork via insertWorkBothRegions + saveWorkCatalogRouted / OPS (existing gates)",
      "7. Persist candidate→workId provenance + status=ACCEPTED_CANONICAL",
      "8. Audit event (actor, time, fingerprint, workId)",
    ],
    optionalOwnerConfirmed: [
      "aliases",
      "OWNER_KNR_MAPPINGS / Slice D exact map row",
    ],
    forbiddenSideEffects: [
      "OUR RATE",
      "rate Accept",
      "TechnologyPack ACTIVE",
      "silent A1 Owner map write",
      "Finance unlock",
      "G3",
      "PASS4 / open-web research",
      "BOM mutation",
    ],
    transactionRequirements: [
      "All-or-nothing Accept: no CatalogWork without candidate ACCEPTED_CANONICAL provenance",
      "No candidate ACCEPTED without CatalogWork insert success",
      "Fail-closed on shrink/revision/router guards",
    ],
    idempotency: [
      "Same fingerprint + successful Accept → return existing workId (no duplicate CatalogWork)",
      "Retry after partial failure must re-validate fingerprint and collision",
      "candidateId unique per open fingerprint",
    ],
  };
}

export function freezeIdIdempotencyRules(): {
  candidateId: string;
  fingerprint: string;
  canonicalWorkId: string;
  collision: string;
  retry: string;
  mintPolicy: "MINT_ON_ACCEPT";
} {
  return {
    mintPolicy: "MINT_ON_ACCEPT",
    candidateId: "Deterministic id in namespace ic:… derived from fingerprint (design); never equals CatalogWork.id until Accept maps it",
    fingerprint:
      "Hash/join of parentWorkId|intendedPlane|unit|technology|scope|semanticDefinition|primaryKnrKeys|rejectHostSet — immutable per row",
    canonicalWorkId:
      "Generated/confirmed only inside Accept transaction; optional non-binding slug hint from EDIT_AND_ACCEPT",
    collision: "If id exists with different semantics → fail-closed; Owner edits slug or aborts. If exact equivalent → REUSE (P10)",
    retry: "Safe retry returns same workId when provenance already records Accept for fingerprint",
  };
}

export function freezeVersionSupersessionRules(): Array<{ rule: string; detail: string }> {
  return [
    {
      rule: "NO_SILENT_MUTATE",
      detail: "New evidence never mutates fields that affect fingerprint on an existing open row",
    },
    {
      rule: "SUPERSEDE_ON_MATERIAL_CHANGE",
      detail: "Material input change → new candidate; old open → SUPERSEDED with link",
    },
    {
      rule: "PARALLEL_COMPETING",
      detail: "Multiple open candidates allowed until Owner ACCEPT/REJECT; UI must show conflicts",
    },
    {
      rule: "REJECT_STICKY",
      detail: "REJECTED remains REJECTED; history survives",
    },
    {
      rule: "CANONICAL_STABLE",
      detail: "ACCEPTED CatalogWork not replaced by supersession of candidates",
    },
    {
      rule: "NO_SIMILARITY_RESURRECT",
      detail: "Rejected identity cannot return via similarity-only proposal",
    },
  ];
}

export function freezeCanonicalReuseRules(): {
  defaultBehavior: "REUSE";
  safeReuseRequires: string[];
  insufficientForReuse: string[];
} {
  return {
    defaultBehavior: "REUSE",
    safeReuseRequires: [
      "exact active CatalogWork match on unit+technology+semantic scope",
      "OR Owner-approved alias to existing workId",
      "OR authoritative OWNER_KNR_MAPPINGS / Slice D HIT to existing workId",
    ],
    insufficientForReuse: [
      "label similarity alone",
      "shared tradeId alone",
      "shared KNR table without approved map",
      "costSplit resemblance",
      "rejected host id",
    ],
  };
}

export function freezeTechnologyPackBoundary(): {
  identityAcceptEqualsPackActive: false;
  afterIdentityAcceptAllowed: string[];
  stillRequiresSeparateOwnerGates: string[];
} {
  return {
    identityAcceptEqualsPackActive: false,
    afterIdentityAcceptAllowed: [
      "Eligibility to begin TechnologyPack DRAFT binding (separate GO/UI)",
      "Downstream architecture step unlock only — not activation",
    ],
    stillRequiresSeparateOwnerGates: [
      "Pack DRAFT create",
      "RECIPE provenance APPROVED",
      "Pack ACTIVE",
      "Leaf research execution",
      "GO29 rate evaluation",
      "A1 classification write",
    ],
  };
}

export function freezeFutureAutonomyBoundary(): {
  autonomousCanonicalCreateNow: true;
  permanentlyForbidden: false;
  aidPassRequired: true;
  catalogWorkMintStillOwnerOnly: true;
  futureRequires: string;
  amendmentId: typeof GO36_P12_AMENDMENT_ID;
} {
  return {
    autonomousCanonicalCreateNow: true,
    permanentlyForbidden: false,
    aidPassRequired: true,
    catalogWorkMintStillOwnerOnly: true,
    amendmentId: GO36_P12_AMENDMENT_ID,
    futureRequires:
      "AID-v1 AUTONOMOUS_DECIDE + CIV validation + provenance — Owner Review mint (GO39/41) still Owner; invent OUR RATE/BOM still forbidden",
  };
}

export function freezeLifecycleMatrix(): Array<{
  status: string;
  persistence: "EPHEMERAL" | "DURABLE_TARGET" | "NONE";
  autoMayEnter: boolean;
  ownerRequired: boolean;
}> {
  return [
    { status: "DISCOVERED", persistence: "EPHEMERAL", autoMayEnter: true, ownerRequired: false },
    {
      status: "DRAFT_INTERNAL",
      persistence: "EPHEMERAL",
      autoMayEnter: true,
      ownerRequired: false,
    },
    {
      status: "IDENTITY_CANDIDATE",
      persistence: "EPHEMERAL",
      autoMayEnter: true,
      ownerRequired: false,
    },
    {
      status: "OWNER_REVIEW",
      persistence: "DURABLE_TARGET",
      autoMayEnter: true,
      ownerRequired: true,
    },
    {
      status: "ACCEPTED_CANONICAL",
      persistence: "DURABLE_TARGET",
      autoMayEnter: false,
      ownerRequired: true,
    },
    {
      status: "REJECTED",
      persistence: "DURABLE_TARGET",
      autoMayEnter: false,
      ownerRequired: true,
    },
    {
      status: "SUPERSEDED",
      persistence: "DURABLE_TARGET",
      autoMayEnter: true,
      ownerRequired: false,
    },
  ];
}

export function freezePersistenceAndTtl(): {
  mode: "HYBRID";
  noExpiredState: true;
  expiryMeans: "NO_EXPIRATION_DURABLE_INDEFINITE";
  ttlDurations: "FROZEN_NO_DAY_NUMBERS";
  identityCandidate: "EPHEMERAL_ONLY";
  ownerReviewOnward: "DURABLE_INDEFINITE";
  go36KvWrites: false;
} {
  return {
    mode: "HYBRID",
    noExpiredState: true,
    expiryMeans: "NO_EXPIRATION_DURABLE_INDEFINITE",
    ttlDurations: "FROZEN_NO_DAY_NUMBERS",
    identityCandidate: "EPHEMERAL_ONLY",
    ownerReviewOnward: "DURABLE_INDEFINITE",
    go36KvWrites: false,
  };
}

export const GO36_FORBIDDEN_ACTIONS = Object.freeze([
  "canonical_work_catalog_write",
  "owner_accept_execution",
  "knr_g177_to_canonical_alone",
  "similarity_to_canonical",
  "rejected_identity_resurrection",
  "our_rate_assign",
  "rate_accept",
  "technologypack_active",
  "silent_a1_mapping",
  "finance_unlock",
  "g3",
  "pass4",
  "bom_mutation",
  "identity_candidate_kv_write_in_go36",
  "commit",
  "push",
]);

/**
 * Full GO36 policy freeze artefact — pure / no I/O / no mutation.
 */
export function freezeIdentityCandidatePolicy(): {
  verdict: "IDENTITY_CANDIDATE_POLICY_CLOSURE_PASS_P2_FROZEN";
  policyVersion: typeof GO36_POLICY_VERSION;
  productDirection: typeof GO35_PRODUCT_DIRECTION;
  decisions: PolicyDecision[];
  openDecisions: PolicyDecision[];
  authorityMatrix: typeof GO36_AUTHORITY_MATRIX;
  lifecycleMatrix: ReturnType<typeof freezeLifecycleMatrix>;
  persistenceTtl: ReturnType<typeof freezePersistenceAndTtl>;
  evidenceRules: ReturnType<typeof freezeEvidenceRules>;
  ownerReview: ReturnType<typeof freezeOwnerReviewContract>;
  acceptTransaction: ReturnType<typeof freezeAcceptTransaction>;
  idIdempotency: ReturnType<typeof freezeIdIdempotencyRules>;
  versionSupersession: ReturnType<typeof freezeVersionSupersessionRules>;
  canonicalReuse: ReturnType<typeof freezeCanonicalReuseRules>;
  technologyPackBoundary: ReturnType<typeof freezeTechnologyPackBoundary>;
  futureAutonomy: ReturnType<typeof freezeFutureAutonomyBoundary>;
  forbiddenActions: readonly string[];
  gkRemains: {
    parent: string;
    target: string;
    proposedWorkId: null;
    ownerDecisionRequired: true;
  };
  legacy: { workId: string; verdict: "IDENTITY_SEMANTIC_HOLD" };
  go29Downstream: string;
  go35Alignment: {
    proposedWorkIdRecommendation: typeof GO35_PROPOSED_WORK_ID_RECOMMENDATION;
    contractVerdict: string;
  };
  mutationGuard: {
    catalogWrite: false;
    kvWrite: false;
    accept: false;
    pack: false;
    rate: false;
    research: false;
  };
} {
  const decisions = freezePolicyP1P12();
  const go35 = designIdentityCandidateContract();
  return {
    verdict: "IDENTITY_CANDIDATE_POLICY_CLOSURE_PASS_P2_FROZEN",
    policyVersion: GO36_POLICY_VERSION,
    productDirection: GO35_PRODUCT_DIRECTION,
    decisions,
    openDecisions: decisions.filter((d) => d.status === "OPEN"),
    authorityMatrix: GO36_AUTHORITY_MATRIX,
    lifecycleMatrix: freezeLifecycleMatrix(),
    persistenceTtl: freezePersistenceAndTtl(),
    evidenceRules: freezeEvidenceRules(),
    ownerReview: freezeOwnerReviewContract(),
    acceptTransaction: freezeAcceptTransaction(),
    idIdempotency: freezeIdIdempotencyRules(),
    versionSupersession: freezeVersionSupersessionRules(),
    canonicalReuse: freezeCanonicalReuseRules(),
    technologyPackBoundary: freezeTechnologyPackBoundary(),
    futureAutonomy: freezeFutureAutonomyBoundary(),
    forbiddenActions: GO36_FORBIDDEN_ACTIONS,
    gkRemains: {
      parent: IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
      target: "LABOR leaf",
      proposedWorkId: null,
      ownerDecisionRequired: true,
    },
    legacy: {
      workId: "legacy-roboty_ogolnobudowlane-m2",
      verdict: "IDENTITY_SEMANTIC_HOLD",
    },
    go29Downstream:
      "GO29 labor-rate research remains blocked until canonical labor identity exists (after Accept + downstream gates)",
    go35Alignment: {
      proposedWorkIdRecommendation: GO35_PROPOSED_WORK_ID_RECOMMENDATION,
      contractVerdict: go35.verdict,
    },
    mutationGuard: {
      catalogWrite: false,
      kvWrite: false,
      accept: false,
      pack: false,
      rate: false,
      research: false,
    },
  };
}

/** Sanity: Owner map untouched; rejected host constant present for resurrection protection. */
export function go36MutationSanity(): {
  ownerMapNull: boolean;
  rejectedHostId: string;
} {
  return {
    ownerMapNull: getOwnerClassificationPlane(IK_OWNER_CREATE_A09_PACKAGE_WORK_ID) === null,
    rejectedHostId: IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  };
}
