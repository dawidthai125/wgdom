/**
 * GO40 — Autonomous GK IdentityCandidate generation.
 *
 * DISCOVERY (GO33) → IdentityCandidate → OWNER_REVIEW (GO38 persist)
 *
 * NEVER: Owner Accept · CatalogWork write · laborWorkId mint · Pack · OUR RATE · research · Finance · G3
 */

import { getOwnerClassificationPlane } from "@/lib/intelligent-estimator/owner-classification-map";
import {
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
  IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";
import {
  discoverLaborLeafIdentities,
  discoverLegacyLaborLeafControl,
  type LaborLeafIdentityCandidate,
} from "@/lib/work-catalog/labor-leaf-identity-discovery";
import {
  createIdentityCandidate,
  findDurableById,
  findOpenCandidateByFingerprint,
  queueIdentityCandidateForOwnerReview,
} from "@/lib/work-catalog/identity-candidate-store";
import { computeIdentityCandidateFingerprint } from "@/lib/work-catalog/identity-candidate-fingerprint";
import type {
  CreateIdentityCandidateInput,
  IdentityCandidateEvidenceSnapshot,
  IdentityCandidateRecord,
} from "@/lib/work-catalog/identity-candidate-types";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";

export const GO40_GENERATION_VERSION = "GO40-v1" as const;

export const TPI729_TENDER_ID =
  "ocds-148610-15299a87-45b5-465d-872c-6aa6f11f076c" as const;
export const TPI729_DWELLING_ID = "kosciuszki-46-4" as const;

/** Stable scope token for fingerprint — LABOR leaf plane, not the package. */
export const GK_LABOR_LEAF_SCOPE =
  "LABOR_ONLY partition wall GK on metal studs (leaf of PACKAGE — not turnkey)" as const;

const HARD_NEGATIVE_IDS = Object.freeze([
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  "cc-w2-plyta-gk-zabudowa",
  "p2b-sufit-podwieszany-gk-m2",
  "p2a-rozebranie-scianek-dzialowych-m2",
  "legacy-gk-m2",
] as const);

export type GkIdentityGenerationDiscovery = ReturnType<typeof discoverLaborLeafIdentities>;

export type GenerateGkLaborIdentityCandidateInput = {
  store?: WorkCatalogStore | null;
  works?: CatalogWork[] | null;
  parentWorkId?: string;
  tenderId?: string | null;
  dwellingId?: string | null;
  actor?: string;
  nowIso?: string;
  /** Default true — GO40 ends at OWNER_REVIEW. */
  queueForOwnerReview?: boolean;
  /** Test/harness: inject GO33 result (must not invent STRONG without evidence). */
  discoveryOverride?: GkIdentityGenerationDiscovery;
};

export type GenerateGkLaborIdentityCandidateResult =
  | {
      ok: true;
      code: "CANDIDATE_CREATED" | "CANDIDATE_REUSED";
      candidate: IdentityCandidateRecord;
      reusedExisting: boolean;
      ownerReviewEntered: boolean;
      reusePath: boolean;
      proposedWorkId: string | null;
      targetPlane: "LABOR_ONLY";
      discovery: GkIdentityGenerationDiscovery;
      ownerDecisionRequired: true;
      /** Hard assertion — generation never invokes Accept. */
      ownerAcceptExecuted: false;
      catalogWorkCreated: false;
      gkWorkCreated: false;
      gkAutoAccepted: false;
      a1Mutated: false;
      packMutated: false;
      rateMutated: false;
      researchExecuted: false;
      financeMutated: false;
      g3Mutated: false;
      packageMutated: false;
    }
  | {
      ok: false;
      code: "NO_CONSTRUCTIBLE_IDENTITY_CANDIDATE" | "REJECTED_FINGERPRINT" | "QUEUE_FAILED" | "LEGACY_HOLD";
      message: string;
      discovery?: GkIdentityGenerationDiscovery;
      ownerAcceptExecuted: false;
      catalogWorkCreated: false;
      gkWorkCreated: false;
      gkAutoAccepted: false;
    };

/**
 * P10 safe REUSE — only STRONG + no negative evidence + single hit.
 * Never similarity / price / BOM / KNR alone / aliases alone.
 */
export function evaluateSafeCanonicalReuse(
  discovery: GkIdentityGenerationDiscovery,
): { workId: string; basis: string } | null {
  const strong = discovery.candidates.filter(
    (c) =>
      c.identityClass === "STRONG_CANDIDATE" &&
      c.rejectionKind === null &&
      c.scorecard.negativeEvidence.score === "NONE" &&
      soft(c.unit) === "m2",
  );
  if (strong.length !== 1) return null;
  if ((HARD_NEGATIVE_IDS as readonly string[]).includes(strong[0]!.candidateWorkId)) {
    return null;
  }
  if (strong[0]!.candidateWorkId === discovery.profile.parentWorkId) return null;
  return {
    workId: strong[0]!.candidateWorkId,
    basis: "GO33_STRONG_EXACT_NO_NEGATIVE",
  };
}

function soft(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .trim();
}

function buildEvidence(
  discovery: GkIdentityGenerationDiscovery,
  reuse: { workId: string; basis: string } | null,
): IdentityCandidateEvidenceSnapshot {
  const negatives: IdentityCandidateEvidenceSnapshot["negativeEvidence"] = [
    {
      kind: "REJECTED_HOST",
      detail: `${IK_OWNER_A09_REJECTED_LABOR_HOST_ID} — A09 HARD reject · must not resurrect`,
    },
    {
      kind: "NO_AUTHORITATIVE_LEAF",
      detail: "GO33/GO34 — no Owner-authorized G177 labor leaf CatalogWork",
    },
    {
      kind: "PACKAGE_NOT_LEAF",
      detail: `${discovery.profile.parentWorkId} remains PACKAGE — costSplit ≠ laborWorkId`,
    },
    {
      kind: "LEGACY_AMBIGUITY",
      detail: "legacy-roboty_ogolnobudowlane-m2 = IDENTITY_SEMANTIC_HOLD — not merged",
    },
  ];

  for (const id of HARD_NEGATIVE_IDS) {
    const hit = discovery.candidates.find((c) => c.candidateWorkId === id);
    if (hit) {
      negatives.push({
        kind: hit.identityClass === "REJECTED" ? "REJECTED_POOL" : "WRONG_SCOPE_POOL",
        detail: `${id} · ${hit.identityClass} · ${hit.rejectionReasons[0] ?? hit.scope}`,
      });
    }
  }

  const competing = discovery.candidates
    .filter((c) => c.candidateWorkId !== reuse?.workId)
    .filter(
      (c) =>
        c.identityClass === "PLAUSIBLE_CANDIDATE" ||
        c.identityClass === "WEAK_CANDIDATE" ||
        c.identityClass === "WRONG_SCOPE" ||
        c.identityClass === "REJECTED" ||
        c.identityClass === "INSUFFICIENT_EVIDENCE",
    )
    .slice(0, 12)
    .map((c) => ({
      workIdOrLabel: c.candidateWorkId,
      relation: "GO33_POOL",
      disposition: `${c.identityClass} · ${c.rejectionKind ?? "n/a"} · ${c.scope}`,
    }));

  return {
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
        detail: `Package ${discovery.profile.parentWorkId}; costSplit ${JSON.stringify(IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT)} ≠ laborWorkId`,
      },
      {
        kind: "GO33_DISCOVERY",
        authority: "CANDIDATE_ONLY",
        detail: `bucket=${discovery.gkBucket} eligibility=${discovery.eligibility.status} knr=${discovery.knrG177.outcome} strong=${countClass(discovery.candidates, "STRONG_CANDIDATE")} plausible=${countClass(discovery.candidates, "PLAUSIBLE_CANDIDATE")}`,
      },
      {
        kind: "GO40_GENERATION",
        authority: "CANDIDATE_ONLY",
        detail: reuse
          ? `REUSE intent ${reuse.workId} (${reuse.basis}) — Owner Accept still required`
          : "NEW IdentityCandidate — proposedWorkId=null · MINT_ON_ACCEPT only via GO39",
      },
    ],
    semanticEvidence: [
      {
        kind: "COMPONENT",
        detail: "LABOR leaf of LABOR_COMPOUND/PACKAGE parent — not the package itself",
      },
      {
        kind: "TURNKEY_SERVICE",
        detail: "Parent is turnkey PACKAGE — leaf must not inherit package id",
      },
    ],
    negativeEvidence: negatives,
    competingCandidates: competing,
  };
}

function countClass(
  candidates: LaborLeafIdentityCandidate[],
  cls: LaborLeafIdentityCandidate["identityClass"],
): number {
  return candidates.filter((c) => c.identityClass === cls).length;
}

/**
 * Fail-closed constructibility: need package parent + G177/KNR discovery evidence + LABOR target plane.
 * Absence of STRONG leaf is OK (that is why we propose NEW).
 */
export function isGkLaborCandidateConstructible(
  discovery: GkIdentityGenerationDiscovery,
  parentWorkId: string,
): { ok: true } | { ok: false; reason: string } {
  if (parentWorkId !== IK_OWNER_CREATE_A09_PACKAGE_WORK_ID && parentWorkId !== discovery.profile.parentWorkId) {
    return { ok: false, reason: "parent mismatch" };
  }
  if (!discovery.profile.parentWorkId) {
    return { ok: false, reason: "missing parentWorkId" };
  }
  if (discovery.profile.unit !== "m2") {
    return { ok: false, reason: "unit not m2" };
  }
  if (discovery.profile.technology !== "GK") {
    return { ok: false, reason: "technology not GK" };
  }
  if (discovery.knrG177.outcome === "CONFLICT") {
    return { ok: false, reason: "KNR G177 CONFLICT" };
  }
  if (!discovery.profile.knrG177?.knrRef) {
    return { ok: false, reason: "missing KNR discovery ref" };
  }
  // Parent package must not be treated as its own leaf
  if (discovery.eligibility.status === "WRONG_SCOPE" && countClass(discovery.candidates, "REJECTED") === 0) {
    /* still may propose NEW leaf */
  }
  return { ok: true };
}

export function buildGkLaborCreateInput(input: {
  discovery: GkIdentityGenerationDiscovery;
  tenderId?: string | null;
  dwellingId?: string | null;
  actor?: string;
  nowIso?: string;
  reuse?: { workId: string; basis: string } | null;
}): CreateIdentityCandidateInput {
  const discovery = input.discovery;
  const reuse = input.reuse ?? evaluateSafeCanonicalReuse(discovery);
  const evidence = buildEvidence(discovery, reuse);
  const parentWorkId = discovery.profile.parentWorkId;

  return {
    parentContext: {
      parentWorkId,
      parentKind: "PACKAGE",
      tenderId: input.tenderId ?? TPI729_TENDER_ID,
      dwellingId: input.dwellingId ?? TPI729_DWELLING_ID,
      boqLineRef: "G177",
    },
    label: reuse
      ? `REUSE · ${reuse.workId}`
      : "Ścianki działowe GK — robocizna (labor leaf) — PROPOSAL ONLY",
    description: reuse
      ? `P10 REUSE intent of existing canonical ${reuse.workId} (${reuse.basis}). Owner Accept still required (GO39).`
      : "TARGET labor component of G177 PACKAGE — partition wall GK on metal studs, double-sided single layer — NOT the package itself. proposedWorkId=null until Owner Accept.",
    unit: "m2",
    technology: "GK",
    scope: GK_LABOR_LEAF_SCOPE,
    family: "SCIANY_GK",
    intendedPlane: "LABOR_ONLY",
    ownerPlaneToday: getOwnerClassificationPlane(parentWorkId),
    classificationNote:
      "Parent PACKAGE/LABOR_COMPOUND → proposed LABOR leaf · GO40 · OWNER_DECISION_REQUIRED",
    evidence,
    confidenceComponents: {
      scopeExact: false,
      technologyExact: true,
      unitExact: true,
      semanticDefinitionClear: !reuse ? false : true,
      authoritativeExternalMapping: !!reuse,
      noCompetingIdentity: evidence.competingCandidates.length === 0,
      noRejectedEquivalent: true,
      deterministicProvenance: true,
      narrative: reuse
        ? `REUSE candidate for ${reuse.workId} — still OWNER_REVIEW`
        : "Technology+unit clear; authoritative labor leaf MISSING — NEW IdentityCandidate for Owner Review (no Accept)",
    },
    provenance: {
      createdBy: "AI_IDENTITY_RESEARCH",
      goChain: ["GO33", "GO34", "GO35", "GO36", "GO37", "GO38", "GO39", "GO40"],
      inputs: [
        "G177",
        "KNR 55-01",
        "GO33 discovery pool",
        parentWorkId,
        GO40_GENERATION_VERSION,
      ],
    },
    slugHint: reuse ? reuse.workId : null,
    proposedWorkId: reuse ? reuse.workId : null,
    proposedWorkIdPolicy: reuse ? "REUSE_EXISTING_CANONICAL" : "B_GENERATE_ON_ACCEPT_ONLY",
    actor: input.actor ?? "go40-generator",
    nowIso: input.nowIso,
  };
}

/**
 * Generate GK labor IdentityCandidate and queue OWNER_REVIEW.
 * Does NOT call executeIdentityCandidateOwnerAccept.
 */
export function generateGkLaborIdentityCandidate(
  input: GenerateGkLaborIdentityCandidateInput = {},
): GenerateGkLaborIdentityCandidateResult {
  const parentWorkId = input.parentWorkId || IK_OWNER_CREATE_A09_PACKAGE_WORK_ID;
  const actor = input.actor ?? "go40-generator";
  const nowIso = input.nowIso ?? new Date().toISOString();
  const queue = input.queueForOwnerReview !== false;

  // Legacy path — hard separate
  if (parentWorkId === "legacy-roboty_ogolnobudowlane-m2") {
    const legacy = discoverLegacyLaborLeafControl();
    return {
      ok: false,
      code: "LEGACY_HOLD",
      message: `${legacy.verdict}: ${legacy.note}`,
      ownerAcceptExecuted: false,
      catalogWorkCreated: false,
      gkWorkCreated: false,
      gkAutoAccepted: false,
    };
  }

  const discovery =
    input.discoveryOverride ??
    discoverLaborLeafIdentities({
      store: input.store,
      works: input.works,
      parentWorkId,
    });

  const constructible = isGkLaborCandidateConstructible(discovery, parentWorkId);
  if (!constructible.ok) {
    return {
      ok: false,
      code: "NO_CONSTRUCTIBLE_IDENTITY_CANDIDATE",
      message: constructible.reason,
      discovery,
      ownerAcceptExecuted: false,
      catalogWorkCreated: false,
      gkWorkCreated: false,
      gkAutoAccepted: false,
    };
  }

  const reuse = evaluateSafeCanonicalReuse(discovery);
  const createInput = buildGkLaborCreateInput({
    discovery,
    tenderId: input.tenderId,
    dwellingId: input.dwellingId,
    actor,
    nowIso,
    reuse,
  });

  // Fingerprint preview for open-reuse before create
  const fpPreview = computeIdentityCandidateFingerprint({
    parentContext: createInput.parentContext,
    intendedPlane: createInput.intendedPlane,
    unit: createInput.unit,
    technology: createInput.technology,
    scope: createInput.scope,
    knrEvidence: createInput.evidence.knrEvidence,
    negativeEvidence: createInput.evidence.negativeEvidence,
    semanticDefinition: createInput.evidence.semanticEvidence.map((s) => s.detail).join(";"),
  });
  const alreadyOpen = findOpenCandidateByFingerprint(fpPreview);

  const created = createIdentityCandidate(createInput);
  if (!created.ok) {
    return {
      ok: false,
      code: created.code === "REJECTED_FINGERPRINT" ? "REJECTED_FINGERPRINT" : "NO_CONSTRUCTIBLE_IDENTITY_CANDIDATE",
      message: created.message,
      discovery,
      ownerAcceptExecuted: false,
      catalogWorkCreated: false,
      gkWorkCreated: false,
      gkAutoAccepted: false,
    };
  }

  let candidate = created.candidate;
  let ownerReviewEntered = candidate.status === "OWNER_REVIEW";

  if (queue && candidate.status !== "OWNER_REVIEW") {
    const q = queueIdentityCandidateForOwnerReview({
      candidateId: candidate.candidateId,
      actor,
      nowIso,
    });
    if (!q.ok) {
      return {
        ok: false,
        code: "QUEUE_FAILED",
        message: q.message,
        discovery,
        ownerAcceptExecuted: false,
        catalogWorkCreated: false,
        gkWorkCreated: false,
        gkAutoAccepted: false,
      };
    }
    candidate = q.candidate;
    ownerReviewEntered = true;
  } else if (candidate.status === "OWNER_REVIEW") {
    ownerReviewEntered = true;
    candidate = findDurableById(candidate.candidateId) ?? candidate;
  }

  // Hard stop: never invoke Accept here (static invariant for tests)
  const ownerAcceptExecuted = false as const;

  return {
    ok: true,
    code: created.reusedExisting || !!alreadyOpen ? "CANDIDATE_REUSED" : "CANDIDATE_CREATED",
    candidate,
    reusedExisting: created.reusedExisting || !!alreadyOpen,
    ownerReviewEntered,
    reusePath: !!reuse,
    proposedWorkId: candidate.proposedWorkId,
    targetPlane: "LABOR_ONLY",
    discovery,
    ownerDecisionRequired: true,
    ownerAcceptExecuted,
    catalogWorkCreated: false,
    gkWorkCreated: false,
    gkAutoAccepted: false,
    a1Mutated: false,
    packMutated: false,
    rateMutated: false,
    researchExecuted: false,
    financeMutated: false,
    g3Mutated: false,
    packageMutated: false,
  };
}

/** Scan helper for real TPI/729 — generation only, no Accept. */
export function runTpi729GkIdentityCandidateScan(
  input: Omit<GenerateGkLaborIdentityCandidateInput, "parentWorkId" | "tenderId" | "dwellingId"> = {},
): GenerateGkLaborIdentityCandidateResult {
  return generateGkLaborIdentityCandidate({
    ...input,
    parentWorkId: IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
    tenderId: TPI729_TENDER_ID,
    dwellingId: TPI729_DWELLING_ID,
  });
}
