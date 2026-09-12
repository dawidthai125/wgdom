/**
 * Compound Identity Candidate Engine — CANONICAL SEAM
 *
 * COMPOUND parent → leaf discovery evidence → IdentityCandidate INTENT (ephemeral)
 * → validation boundary (trusted / ambiguous / insufficient / owner-required).
 *
 * REUSE:
 *  - GO33 discoverLaborLeafIdentities + GO40 buildGkLaborCreateInput (GK/package)
 *  - CreateIdentityCandidateInput (parentKind PACKAGE|COMPOUND)
 *  - OWNER_KNR_MAPPINGS / TechnologyPack exact binding / Work Catalog read
 *
 * NEVER:
 *  - createIdentityCandidate / generateGkLaborIdentityCandidate persist
 *  - GO39 Accept · CatalogWork write · Pack · OUR RATE · Finance · G3
 *  - name/costSplit/price/pack → TRUSTED identity
 *  - if (workId === "legacy-…") hardcode
 */

import type { WorkCatalogStore, CatalogWork } from "@/lib/work-catalog/types";
import type { TechnologyPack } from "@/lib/technology-foundation";
import type {
  CreateIdentityCandidateInput,
  IdentityCandidateEvidenceSnapshot,
} from "@/lib/work-catalog/identity-candidate-types";
import {
  discoverLaborLeafIdentities,
} from "@/lib/work-catalog/labor-leaf-identity-discovery";
import {
  buildGkLaborCreateInput,
  evaluateSafeCanonicalReuse,
  isGkLaborCandidateConstructible,
} from "@/lib/work-catalog/identity-candidate-generation";
import { getOwnerClassificationPlane } from "@/lib/intelligent-estimator/owner-classification-map";
import { OWNER_KNR_MAPPINGS } from "@/lib/intelligent-estimator/ik-knr-owner-mapping";
import {
  findActiveTechnologyPacksForWorkId,
  findTechnologyPacksForWorkId,
  LEAF_RESEARCH_PACK_LIFECYCLES,
} from "@/lib/tender-position-cost/bom-technology-adapter";
import { listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";

export const COMPOUND_IDENTITY_ENGINE_VERSION = "CIE-v1" as const;

export type CompoundIdentityStatus =
  | "AUTONOMOUS_IDENTITY_CANDIDATE_RESOLVED"
  | "CANDIDATE_FOUND_NOT_TRUSTED"
  | "IDENTITY_CANDIDATE_AMBIGUOUS"
  | "IDENTITY_CANDIDATE_INSUFFICIENT"
  | "OWNER_IDENTITY_DECISION_REQUIRED"
  | "RESEARCH_PATH_MISSING";

export type CompoundIdentityDistinctions = {
  IDENTITY_DISCOVERED: boolean;
  IDENTITY_CANDIDATE_CREATED: boolean;
  IDENTITY_CANDIDATE_VALIDATED: boolean;
  IDENTITY_TRUSTED: boolean;
  OWNER_ACCEPT_REQUIRED: boolean;
  DURABLE_WRITE_REQUIRED: boolean;
};

export type CompoundLeafEvidenceHit = {
  kind:
    | "GO33_STRONG"
    | "GO33_PLAUSIBLE"
    | "OWNER_KNR_MAPPING"
    | "TECHNOLOGY_PACK_LABOUR"
    | "TECHNOLOGY_PACK_STEP"
    | "NAME_SIMILARITY_ONLY"
    | "COST_SPLIT_METADATA";
  workId: string | null;
  detail: string;
  /** Never elevates to TRUSTED alone when false. */
  mayContributeToTrusted: boolean;
  trusted: boolean;
};

export type BuildCompoundIdentityCandidateInput = {
  workId: string;
  store?: WorkCatalogStore | null;
  packs?: readonly TechnologyPack[];
  descriptions?: string[];
  unit?: string;
  actor?: string;
  nowIso?: string;
};

export type BuildCompoundIdentityCandidateResult = {
  workId: string;
  go33Applicable: boolean;
  discoveryPath: string[];
  sourcesUsed: string[];
  leafEvidenceHits: CompoundLeafEvidenceHit[];
  candidateCount: number;
  trustedCandidateCount: number;
  identityStatus: CompoundIdentityStatus;
  distinctions: CompoundIdentityDistinctions;
  proposedWorkId: string | null;
  proposedWorkIdPolicy: CreateIdentityCandidateInput["proposedWorkIdPolicy"] | null;
  ephemeralCreateInput: CreateIdentityCandidateInput | null;
  evidenceStrength: "NONE" | "LOW" | "MEDIUM" | "HIGH";
  ownerRequired: boolean;
  persistenceRequired: boolean;
  nextLegalTransaction: string;
  blockers: string[];
  architectureRoute: "GO40_GK_ADAPTER" | "COMPOUND_GENERAL_ORCHESTRATION";
  mutationGuard: {
    createIdentityCandidateCalled: false;
    generateGkLaborIdentityCandidateCalled: false;
    acceptCalled: false;
    catalogWrite: false;
    packWrite: false;
    rateWrite: false;
  };
};

/** Same applicability gate as autonomous-unknown-plane-discovery (no per-id hardcode). */
export function isGo33ApplicableParent(workId: string): boolean {
  return (
    /pakiet|legacy-gk|plyta.?gk|scianki|g177|gk-technology|gk_partition/i.test(workId) ||
    workId.includes("cc-w2-plyta-gk") ||
    workId.includes("p2b-scianka-gk") ||
    workId.includes("p2b-sufit-podwieszany-gk")
  );
}

function soft(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l")
    .trim();
}

function extractKnrLikeTokens(text: string): string[] {
  const out = new Set<string>();
  for (const m of String(text || "").matchAll(/\b(\d{3,4}-\d{2})\b/g)) out.add(m[1]!);
  for (const m of String(text || "").matchAll(/\b(55-01|G177)\b/gi)) {
    out.add(m[1]!.toUpperCase());
  }
  return [...out];
}

function findCatalogWork(
  store: WorkCatalogStore | null | undefined,
  workId: string,
): CatalogWork | null {
  if (!store) return null;
  for (const region of ["wroclaw", "dolnyslask"] as const) {
    const w = store.catalogs?.[region]?.works?.find((x) => x.id === workId);
    if (w) return w;
  }
  return null;
}

function listCatalogWorks(store: WorkCatalogStore | null | undefined): CatalogWork[] {
  if (!store) return [];
  try {
    return listActiveWorksForRegion(store, store.activeRegion);
  } catch {
    const out: CatalogWork[] = [];
    for (const region of ["wroclaw", "dolnyslask"] as const) {
      for (const w of store.catalogs?.[region]?.works || []) out.push(w);
    }
    return out;
  }
}

function emptyDistinctions(
  partial?: Partial<CompoundIdentityDistinctions>,
): CompoundIdentityDistinctions {
  return {
    IDENTITY_DISCOVERED: false,
    IDENTITY_CANDIDATE_CREATED: false,
    IDENTITY_CANDIDATE_VALIDATED: false,
    IDENTITY_TRUSTED: false,
    OWNER_ACCEPT_REQUIRED: false,
    DURABLE_WRITE_REQUIRED: false,
    ...partial,
  };
}

function mutationGuard(): BuildCompoundIdentityCandidateResult["mutationGuard"] {
  return {
    createIdentityCandidateCalled: false,
    generateGkLaborIdentityCandidateCalled: false,
    acceptCalled: false,
    catalogWrite: false,
    packWrite: false,
    rateWrite: false,
  };
}

/**
 * Collect leaf-related evidence for a COMPOUND parent (never invents trust).
 */
export function collectCompoundLeafEvidence(input: {
  workId: string;
  store?: WorkCatalogStore | null;
  packs?: readonly TechnologyPack[];
  descriptions?: string[];
}): CompoundLeafEvidenceHit[] {
  const workId = String(input.workId || "").trim();
  const hits: CompoundLeafEvidenceHit[] = [];
  const descriptions = input.descriptions || [];
  const catalogWork = findCatalogWork(input.store, workId);

  if (catalogWork?.costSplit) {
    hits.push({
      kind: "COST_SPLIT_METADATA",
      workId: null,
      detail: `costSplit labor=${catalogWork.costSplit.laborRatio} material=${catalogWork.costSplit.materialRatio} — allocation only`,
      mayContributeToTrusted: false,
      trusted: false,
    });
  }

  const tokens = descriptions.flatMap(extractKnrLikeTokens);
  for (const row of OWNER_KNR_MAPPINGS) {
    if (!row.active || !row.ownerApproval) continue;
    const key = soft(row.normalizedKey);
    if (!tokens.some((t) => key.includes(soft(t)))) continue;
    hits.push({
      kind: "OWNER_KNR_MAPPING",
      workId: row.workId,
      detail: `OWNER_KNR_MAPPINGS ${row.mappingId} → ${row.workId} (line mapping evidence — not auto parent→leaf trust)`,
      mayContributeToTrusted: false,
      trusted: false,
    });
  }

  const packs = input.packs ?? [];
  const active = findActiveTechnologyPacksForWorkId(workId, packs);
  const research = findTechnologyPacksForWorkId(workId, packs, LEAF_RESEARCH_PACK_LIFECYCLES);
  for (const p of [...active, ...research]) {
    // labour is PackLabourRecipeLine[] — never Object.keys(array) (that yields "0","1")
    for (const line of p.labour || []) {
      const labourKey = String(line?.labourKey || "").trim();
      if (!labourKey) continue;
      hits.push({
        kind: "TECHNOLOGY_PACK_LABOUR",
        workId: labourKey,
        detail: `pack ${p.packId}@${p.packVersion} labourKey=${labourKey} lifecycle=${p.lifecycle}`,
        mayContributeToTrusted: p.lifecycle === "ACTIVE",
        trusted: false,
      });
    }
    for (const step of p.steps || []) {
      if (step.catalogWorkId && step.catalogWorkId !== workId) {
        hits.push({
          kind: "TECHNOLOGY_PACK_STEP",
          workId: step.catalogWorkId,
          detail: `pack ${p.packId} step catalogWorkId=${step.catalogWorkId}`,
          mayContributeToTrusted: false,
          trusted: false,
        });
      }
    }
  }

  // Name similarity — DISCOVERY_ONLY recall
  const blob = soft([...descriptions, workId].join(" "));
  const tokensName = blob.split(/[^a-z0-9]+/).filter((t) => t.length >= 5);
  for (const w of listCatalogWorks(input.store)) {
    if (w.id === workId || w.active === false) continue;
    const b = soft(`${w.id} ${w.namePl || ""}`);
    if (!tokensName.some((t) => b.includes(t))) continue;
    hits.push({
      kind: "NAME_SIMILARITY_ONLY",
      workId: w.id,
      detail: `name-overlap with catalog ${w.id}`,
      mayContributeToTrusted: false,
      trusted: false,
    });
    if (hits.filter((h) => h.kind === "NAME_SIMILARITY_ONLY").length >= 8) break;
  }

  return hits;
}

/**
 * Ephemeral CreateIdentityCandidateInput for non-GK COMPOUND parents.
 * proposedWorkId only when exactly one REUSE-eligible evidence workId with mayContributeToTrusted.
 * Otherwise B_GENERATE_ON_ACCEPT_ONLY with null proposedWorkId — still NOT trusted.
 */
export function buildGeneralCompoundCreateInput(input: {
  workId: string;
  unit: string;
  descriptions: string[];
  hits: CompoundLeafEvidenceHit[];
  actor?: string;
  nowIso?: string;
}): CreateIdentityCandidateInput | null {
  const workId = input.workId;
  const ownerPlane = getOwnerClassificationPlane(workId);
  const reuseEligible = input.hits.filter(
    (h) =>
      h.workId &&
      h.mayContributeToTrusted &&
      (h.kind === "TECHNOLOGY_PACK_LABOUR" || h.kind === "OWNER_KNR_MAPPING"),
  );
  const uniqueReuse = [
    ...new Set(reuseEligible.map((h) => h.workId!).filter(Boolean)),
  ];

  const nameOnly = input.hits.filter((h) => h.kind === "NAME_SIMILARITY_ONLY");
  const hasConstructSignal =
    input.hits.some((h) => h.kind !== "NAME_SIMILARITY_ONLY" && h.kind !== "COST_SPLIT_METADATA") ||
    input.descriptions.some((d) => soft(d).length >= 12);

  // Without any non-name signal and without descriptive BOQ — do not invent a mint candidate
  if (!hasConstructSignal && uniqueReuse.length === 0) {
    return null;
  }

  const reuseWorkId = uniqueReuse.length === 1 ? uniqueReuse[0]! : null;
  const evidence: IdentityCandidateEvidenceSnapshot = {
    knrEvidence: input.hits
      .filter((h) => h.kind === "OWNER_KNR_MAPPING")
      .map((h) => ({
        code: h.workId || "KNR",
        role: "DISCOVERY_ONLY" as const,
        text: h.detail,
      })),
    sourceEvidence: [
      {
        kind: "PARENT_COMPOUND",
        authority: "AUTHORITATIVE",
        detail: `Compound parent ${workId}; ownerPlane=${ownerPlane ?? "null"}`,
      },
      {
        kind: "COMPOUND_IDENTITY_ENGINE",
        authority: "CANDIDATE_ONLY",
        detail: `${COMPOUND_IDENTITY_ENGINE_VERSION} · hits=${input.hits.length} · reuseEligible=${uniqueReuse.length}`,
      },
      ...input.hits
        .filter((h) => h.kind !== "NAME_SIMILARITY_ONLY")
        .slice(0, 8)
        .map((h) => ({
          kind: h.kind,
          authority: "CANDIDATE_ONLY" as const,
          detail: h.detail,
        })),
    ],
    semanticEvidence: [
      {
        kind: "COMPONENT" as const,
        detail:
          "Proposed LABOR leaf of COMPOUND parent — not the umbrella workId itself",
      },
    ],
    negativeEvidence: [
      {
        kind: "NAME_NOT_TRUSTED",
        detail: `name-only hits=${nameOnly.length} cannot authorize trusted identity`,
      },
      {
        kind: "COST_SPLIT_NOT_IDENTITY",
        detail: "costSplit is allocation metadata only",
      },
    ],
    competingCandidates: uniqueReuse.slice(0, 12).map((id) => ({
      workIdOrLabel: id,
      relation: "COMPOUND_LEAF_EVIDENCE",
      disposition: "CANDIDATE_ONLY",
    })),
  };

  return {
    parentContext: {
      parentWorkId: workId,
      parentKind: "COMPOUND",
      boqLineRef: input.descriptions[0]?.slice(0, 80) || null,
    },
    label: reuseWorkId
      ? `REUSE intent · ${reuseWorkId}`
      : `Compound labor leaf — PROPOSAL ONLY (${workId})`,
    description: reuseWorkId
      ? `REUSE evidence for ${reuseWorkId} under compound parent — Owner Accept still required`
      : "TARGET labor component of COMPOUND umbrella — proposedWorkId=null until Owner Accept; not name/costSplit invent",
    unit: input.unit,
    technology: null,
    scope: "LABOR_ONLY leaf of COMPOUND parent (engine CIE-v1)",
    family: "COMPOUND_LEAF",
    intendedPlane: "LABOR_ONLY",
    ownerPlaneToday: ownerPlane,
    classificationNote:
      "COMPOUND → IdentityCandidate · CIE-v1 · OWNER_DECISION_REQUIRED before CatalogWork",
    evidence,
    confidenceComponents: {
      scopeExact: false,
      technologyExact: false,
      unitExact: Boolean(input.unit),
      semanticDefinitionClear: false,
      authoritativeExternalMapping: Boolean(reuseWorkId),
      noCompetingIdentity: uniqueReuse.length <= 1,
      noRejectedEquivalent: true,
      deterministicProvenance: true,
      narrative: reuseWorkId
        ? `Single reuse-eligible evidence ${reuseWorkId} — still NOT trusted without Owner Accept`
        : "Weak/NEW compound leaf proposal — mint-on-accept only; not trusted",
    },
    provenance: {
      createdBy: "AI_IDENTITY_RESEARCH",
      goChain: ["CIE-v1", "GO35", "GO38", "GO39"],
      inputs: [workId, COMPOUND_IDENTITY_ENGINE_VERSION, ...tokensPreview(input.descriptions)],
    },
    slugHint: reuseWorkId,
    proposedWorkId: reuseWorkId,
    proposedWorkIdPolicy: reuseWorkId
      ? "REUSE_EXISTING_CANONICAL"
      : "B_GENERATE_ON_ACCEPT_ONLY",
    actor: input.actor ?? "compound-identity-engine",
    nowIso: input.nowIso,
  };
}

function tokensPreview(descriptions: string[]): string[] {
  return descriptions.flatMap(extractKnrLikeTokens).slice(0, 4);
}

function routeGkPackage(
  input: BuildCompoundIdentityCandidateInput,
): BuildCompoundIdentityCandidateResult {
  const workId = String(input.workId || "").trim();
  const unit = input.unit || "m2";
  const discoveryPath = [
    "isGo33ApplicableParent",
    "GO33_discoverLaborLeafIdentities",
    "GO40_evaluateSafeCanonicalReuse",
    "GO40_isGkLaborCandidateConstructible",
    "GO40_buildGkLaborCreateInput_EPHEMERAL",
  ];
  const sourcesUsed = ["GO33", "GO40_ADAPTER", "CreateIdentityCandidateInput"];

  const discovery = discoverLaborLeafIdentities({
    store: input.store,
    parentWorkId: workId,
  });
  const reuse = evaluateSafeCanonicalReuse(discovery);
  const constructible = isGkLaborCandidateConstructible(discovery, workId);

  const strong = discovery.candidates.filter((c) => c.identityClass === "STRONG_CANDIDATE");
  const plausible = discovery.candidates.filter(
    (c) => c.identityClass === "PLAUSIBLE_CANDIDATE",
  );

  const leafEvidenceHits: CompoundLeafEvidenceHit[] = [
    ...strong.map((c) => ({
      kind: "GO33_STRONG" as const,
      workId: c.candidateWorkId,
      detail: `GO33 STRONG ${c.candidateWorkId}`,
      mayContributeToTrusted: true,
      trusted: false,
    })),
    ...plausible.map((c) => ({
      kind: "GO33_PLAUSIBLE" as const,
      workId: c.candidateWorkId,
      detail: `GO33 PLAUSIBLE ${c.candidateWorkId}`,
      mayContributeToTrusted: false,
      trusted: false,
    })),
  ];

  if (strong.length > 1 || plausible.length > 1) {
    return {
      workId,
      go33Applicable: true,
      discoveryPath,
      sourcesUsed,
      leafEvidenceHits,
      candidateCount: strong.length + plausible.length,
      trustedCandidateCount: 0,
      identityStatus: "IDENTITY_CANDIDATE_AMBIGUOUS",
      distinctions: emptyDistinctions({ IDENTITY_DISCOVERED: true }),
      proposedWorkId: null,
      proposedWorkIdPolicy: null,
      ephemeralCreateInput: null,
      evidenceStrength: "MEDIUM",
      ownerRequired: true,
      persistenceRequired: false,
      nextLegalTransaction: "OWNER_LEAF_DISAMBIGUATION",
      blockers: ["Multiple competing GO33 STRONG/PLAUSIBLE candidates"],
      architectureRoute: "GO40_GK_ADAPTER",
      mutationGuard: mutationGuard(),
    };
  }

  if (!constructible.ok) {
    return {
      workId,
      go33Applicable: true,
      discoveryPath,
      sourcesUsed,
      leafEvidenceHits,
      candidateCount: 0,
      trustedCandidateCount: 0,
      identityStatus: "IDENTITY_CANDIDATE_INSUFFICIENT",
      distinctions: emptyDistinctions({ IDENTITY_DISCOVERED: true }),
      proposedWorkId: null,
      proposedWorkIdPolicy: null,
      ephemeralCreateInput: null,
      evidenceStrength: "NONE",
      ownerRequired: true,
      persistenceRequired: false,
      nextLegalTransaction: "OWNER_IDENTITY_DECISION_REQUIRED",
      blockers: [constructible.reason],
      architectureRoute: "GO40_GK_ADAPTER",
      mutationGuard: mutationGuard(),
    };
  }

  const createInput = buildGkLaborCreateInput({
    discovery,
    reuse,
    actor: input.actor ?? "compound-identity-engine",
    nowIso: input.nowIso,
  });

  return {
    workId,
    go33Applicable: true,
    discoveryPath,
    sourcesUsed,
    leafEvidenceHits,
    candidateCount: 1,
    trustedCandidateCount: 0,
    identityStatus: "AUTONOMOUS_IDENTITY_CANDIDATE_RESOLVED",
    distinctions: emptyDistinctions({
      IDENTITY_DISCOVERED: true,
      IDENTITY_CANDIDATE_CREATED: true,
      IDENTITY_CANDIDATE_VALIDATED: true,
      IDENTITY_TRUSTED: false,
      OWNER_ACCEPT_REQUIRED: true,
      DURABLE_WRITE_REQUIRED: true,
    }),
    proposedWorkId: createInput.proposedWorkId ?? null,
    proposedWorkIdPolicy: createInput.proposedWorkIdPolicy,
    ephemeralCreateInput: createInput,
    evidenceStrength: reuse ? "HIGH" : "MEDIUM",
    ownerRequired: true,
    persistenceRequired: true,
    nextLegalTransaction:
      "DURABLE_IDENTITY_CANDIDATE_WRITE_REQUIRES_SEPARATE_GO → GO40 OWNER_REVIEW → GO39 Accept",
    blockers: [
      "IDENTITY_TRUSTED=false until Owner Accept",
      "DURABLE_IDENTITY_CANDIDATE_WRITE_REQUIRES_SEPARATE_GO",
      ...(createInput.proposedWorkId
        ? []
        : ["proposedWorkId=null by B_GENERATE_ON_ACCEPT_ONLY (policy)"]),
    ],
    architectureRoute: "GO40_GK_ADAPTER",
    mutationGuard: mutationGuard(),
  };
}

function routeGeneralCompound(
  input: BuildCompoundIdentityCandidateInput,
): BuildCompoundIdentityCandidateResult {
  const workId = String(input.workId || "").trim();
  const unit = input.unit || "m2";
  const descriptions = input.descriptions || [];
  const discoveryPath = [
    "isGo33ApplicableParent=false",
    "collectCompoundLeafEvidence",
    "WorkCatalog_read",
    "OWNER_KNR_MAPPINGS_lookup",
    "TechnologyPack_exact_binding",
    "NAME_SCAN_DISCOVERY_ONLY",
    "buildGeneralCompoundCreateInput",
  ];
  const sourcesUsed = [
    "COMPOUND_IDENTITY_ENGINE",
    "WORK_CATALOG",
    "OWNER_KNR_MAPPINGS",
    "TECHNOLOGY_PACK",
    "CreateIdentityCandidateInput",
  ];

  const hits = collectCompoundLeafEvidence({
    workId,
    store: input.store,
    packs: input.packs,
    descriptions,
  });

  const reuseIds = [
    ...new Set(
      hits
        .filter((h) => h.mayContributeToTrusted && h.workId)
        .map((h) => h.workId!),
    ),
  ];
  const nameOnlyIds = [
    ...new Set(
      hits.filter((h) => h.kind === "NAME_SIMILARITY_ONLY" && h.workId).map((h) => h.workId!),
    ),
  ];

  if (reuseIds.length > 1) {
    return {
      workId,
      go33Applicable: false,
      discoveryPath,
      sourcesUsed,
      leafEvidenceHits: hits,
      candidateCount: reuseIds.length,
      trustedCandidateCount: 0,
      identityStatus: "IDENTITY_CANDIDATE_AMBIGUOUS",
      distinctions: emptyDistinctions({ IDENTITY_DISCOVERED: true }),
      proposedWorkId: null,
      proposedWorkIdPolicy: null,
      ephemeralCreateInput: null,
      evidenceStrength: "MEDIUM",
      ownerRequired: true,
      persistenceRequired: false,
      nextLegalTransaction: "OWNER_LEAF_DISAMBIGUATION",
      blockers: [`Multiple reuse-eligible evidence workIds: ${reuseIds.join(", ")}`],
      architectureRoute: "COMPOUND_GENERAL_ORCHESTRATION",
      mutationGuard: mutationGuard(),
    };
  }

  const createInput = buildGeneralCompoundCreateInput({
    workId,
    unit,
    descriptions,
    hits,
    actor: input.actor,
    nowIso: input.nowIso,
  });

  if (!createInput) {
    return {
      workId,
      go33Applicable: false,
      discoveryPath,
      sourcesUsed,
      leafEvidenceHits: hits,
      candidateCount: 0,
      trustedCandidateCount: 0,
      identityStatus: "IDENTITY_CANDIDATE_INSUFFICIENT",
      distinctions: emptyDistinctions({
        IDENTITY_DISCOVERED: Boolean(findCatalogWork(input.store, workId)),
      }),
      proposedWorkId: null,
      proposedWorkIdPolicy: null,
      ephemeralCreateInput: null,
      evidenceStrength: "NONE",
      ownerRequired: true,
      persistenceRequired: false,
      nextLegalTransaction: "OWNER_IDENTITY_DECISION_REQUIRED",
      blockers: [
        "Canonical compound discovery ran — insufficient non-name evidence to construct IdentityCandidate",
        "name/costSplit/pack-absent cannot invent leaf",
        "OWNER_MAPPING_REMAINS_POSSIBLE — not implemented",
      ],
      architectureRoute: "COMPOUND_GENERAL_ORCHESTRATION",
      mutationGuard: mutationGuard(),
    };
  }

  // Name-only dominated → not trusted candidate
  const onlyNameAndSplit = hits.every(
    (h) => h.kind === "NAME_SIMILARITY_ONLY" || h.kind === "COST_SPLIT_METADATA",
  );
  if (onlyNameAndSplit && !createInput.proposedWorkId) {
    return {
      workId,
      go33Applicable: false,
      discoveryPath,
      sourcesUsed,
      leafEvidenceHits: hits,
      candidateCount: nameOnlyIds.length || 1,
      trustedCandidateCount: 0,
      identityStatus: "CANDIDATE_FOUND_NOT_TRUSTED",
      distinctions: emptyDistinctions({
        IDENTITY_DISCOVERED: true,
        IDENTITY_CANDIDATE_CREATED: true,
        IDENTITY_CANDIDATE_VALIDATED: true,
        IDENTITY_TRUSTED: false,
        OWNER_ACCEPT_REQUIRED: true,
        DURABLE_WRITE_REQUIRED: true,
      }),
      proposedWorkId: null,
      proposedWorkIdPolicy: createInput.proposedWorkIdPolicy,
      ephemeralCreateInput: createInput,
      evidenceStrength: "LOW",
      ownerRequired: true,
      persistenceRequired: true,
      nextLegalTransaction:
        "OWNER_IDENTITY_DECISION_REQUIRED · DURABLE_IDENTITY_CANDIDATE_WRITE_REQUIRES_SEPARATE_GO",
      blockers: [
        "Candidate built from weak description/costSplit context — NOT trusted",
        "name similarity cannot authorize identity",
      ],
      architectureRoute: "COMPOUND_GENERAL_ORCHESTRATION",
      mutationGuard: mutationGuard(),
    };
  }

  const status: CompoundIdentityStatus = createInput.proposedWorkId
    ? "CANDIDATE_FOUND_NOT_TRUSTED" // reuse-eligible still requires Owner Accept before TRUSTED
    : "AUTONOMOUS_IDENTITY_CANDIDATE_RESOLVED";

  return {
    workId,
    go33Applicable: false,
    discoveryPath,
    sourcesUsed,
    leafEvidenceHits: hits,
    candidateCount: 1,
    trustedCandidateCount: 0,
    identityStatus: status,
    distinctions: emptyDistinctions({
      IDENTITY_DISCOVERED: true,
      IDENTITY_CANDIDATE_CREATED: true,
      IDENTITY_CANDIDATE_VALIDATED: true,
      IDENTITY_TRUSTED: false,
      OWNER_ACCEPT_REQUIRED: true,
      DURABLE_WRITE_REQUIRED: true,
    }),
    proposedWorkId: createInput.proposedWorkId ?? null,
    proposedWorkIdPolicy: createInput.proposedWorkIdPolicy,
    ephemeralCreateInput: createInput,
    evidenceStrength: createInput.proposedWorkId ? "MEDIUM" : "LOW",
    ownerRequired: true,
    persistenceRequired: true,
    nextLegalTransaction:
      "DURABLE_IDENTITY_CANDIDATE_WRITE_REQUIRES_SEPARATE_GO → Owner Review/Accept",
    blockers: [
      "IDENTITY_TRUSTED=false — Owner boundary candidate→authoritative identity",
      "DURABLE_IDENTITY_CANDIDATE_WRITE_REQUIRES_SEPARATE_GO",
    ],
    architectureRoute: "COMPOUND_GENERAL_ORCHESTRATION",
    mutationGuard: mutationGuard(),
  };
}

/**
 * Canonical API: COMPOUND → IdentityCandidate INTENT (ephemeral) → validation.
 */
export function buildCompoundIdentityCandidate(
  input: BuildCompoundIdentityCandidateInput,
): BuildCompoundIdentityCandidateResult {
  const workId = String(input.workId || "").trim();
  if (!workId) {
    throw new Error("buildCompoundIdentityCandidate requires workId");
  }
  if (isGo33ApplicableParent(workId)) {
    return routeGkPackage(input);
  }
  return routeGeneralCompound(input);
}
