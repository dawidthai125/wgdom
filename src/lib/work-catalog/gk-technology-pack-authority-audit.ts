/**
 * GO32 — GK TechnologyPack / Labor Leaf Authority Audit (READ-ONLY).
 *
 * REUSE: TechnologyPack · pack-lifecycle · leaf research gate · A09 · material map.
 * NEVER: create/activate pack · OUR RATE · Accept · PASS4 · classification mutation.
 *
 * Verdict for A09 GK package: LABOR_LEAF_IDENTITY_MISSING
 *   (+ parent Owner plane UNKNOWN blocks leaf path even if pack existed)
 */

import type { TechnologyPack, TechnologyPackLifecycle } from "@/lib/technology-foundation";
import {
  canPromoteToActive,
  canPackFeedProductionBom,
  canTransitionLifecycle,
  clearPackRegistryForTests,
  listAllPacks,
  seedB0Fixtures,
  seedScreedEconomyWetCementV1,
} from "@/lib/technology-foundation";
import {
  findTechnologyPacksForWorkId,
  LEAF_RESEARCH_PACK_LIFECYCLES,
} from "@/lib/tender-position-cost/bom-technology-adapter";
import { isExplicitLaborOnlyWork } from "@/lib/tender-position-cost/labor-only-classification";
import {
  assertLeafLaborResearchAllowed,
  classifyEstimatorPricingPlane,
  IK_LEAF_RESEARCH_CALL_SITE,
  IK_RESEARCH_HELD_COMPOUND_STATUS,
} from "@/lib/intelligent-estimator/classification-gate";
import { getOwnerClassificationPlane } from "@/lib/intelligent-estimator/owner-classification-map";
import { isProvisionalLaborOnlyPath } from "@/lib/intelligent-estimator/ik-provisional-estimation";
import {
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
  IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";
import { deriveResearchClassification } from "@/lib/work-catalog/research-profile-classification";
import { DEFAULT_MATERIAL_MARKET_MAP } from "@/lib/pricing-expert/material-market-map";

export type LeafCandidateAuthority =
  | "AUTHORITATIVE"
  | "REJECTED"
  | "WRONG_SCOPE"
  | "DISCOVERY_ONLY"
  | "PROVISIONAL"
  | "MISSING";

export type GkPackRequiredField = {
  field: string;
  source: string;
  authority: string;
  currentValue: unknown;
  missing: boolean;
  requiredForActivation: boolean;
};

export type LaborLeafCandidate = {
  workId: string;
  label: string;
  scope: string;
  unit: string;
  authority: LeafCandidateAuthority;
  ownerPlane: string | null;
  ourRateStatus: "NOT_AUDITED_LIVE" | "FORBIDDEN_118" | "N/A";
  provenance: string;
  rejectionStatus: string | null;
  mayAcceptAsLeaf: false;
  notes: string[];
};

const GK_PACKAGE = IK_OWNER_CREATE_A09_PACKAGE_WORK_ID;
const LEGACY = "legacy-roboty_ogolnobudowlane-m2";

/** Ensure fixture packs registered once for read-only inspection. */
export function ensureTechnologyPackFixturesForAudit(): TechnologyPack[] {
  clearPackRegistryForTests();
  seedB0Fixtures();
  try {
    seedScreedEconomyWetCementV1();
  } catch {
    /* already registered / definition missing in isolation — ignore */
  }
  return listAllPacks();
}

export function listExistingPackSummaries(): Array<{
  packId: string;
  packVersion: string;
  lifecycle: TechnologyPackLifecycle;
  namePl: string;
  stepWorkIds: string[];
  labourKeys: string[];
  materialKeys: string[];
  bindsGkPackage: boolean;
}> {
  const packs = ensureTechnologyPackFixturesForAudit();
  return packs.map((p) => ({
    packId: p.packId,
    packVersion: p.packVersion,
    lifecycle: p.lifecycle,
    namePl: p.namePl,
    stepWorkIds: p.steps.map((s) => s.catalogWorkId),
    labourKeys: p.labour.map((l) => l.labourKey),
    materialKeys: p.materials.map((m) => m.materialKey),
    bindsGkPackage: p.steps.some((s) => s.catalogWorkId === GK_PACKAGE),
  }));
}

export function documentTechnologyPackRequiredFields(): GkPackRequiredField[] {
  const der = deriveResearchClassification({
    workId: GK_PACKAGE,
    namePl: "Ścianki działowe GR — pakiet GK",
    unit: "m2",
  });
  const owner = getOwnerClassificationPlane(GK_PACKAGE);
  const mat = DEFAULT_MATERIAL_MARKET_MAP.find((m) => m.materialKey === "mat.plyta_gk");

  return [
    {
      field: "parentWorkId (steps[].catalogWorkId)",
      source: "A09 PACKAGE workId",
      authority: "OWNER_SSOT A09",
      currentValue: GK_PACKAGE,
      missing: false,
      requiredForActivation: true,
    },
    {
      field: "parent Owner plane COMPOUND",
      source: "owner-classification-map / assertLeafLaborResearchAllowed",
      authority: "A1 Owner map",
      currentValue: owner,
      missing: owner !== "COMPOUND",
      requiredForActivation: true,
    },
    {
      field: "laborWorkId (labour[].labourKey and/or distinct step)",
      source: "CatalogWork LABOR leaf",
      authority: "OWNER — must be AUTHORITATIVE leaf",
      currentValue: null,
      missing: true,
      requiredForActivation: true,
    },
    {
      field: "materialWorkId / materialKey",
      source: "DEFAULT_MATERIAL_MARKET_MAP",
      authority: "MARKET_MAP (mat.plyta_gk exists) — not full package BOM",
      currentValue: mat?.materialKey ?? null,
      missing: !mat,
      requiredForActivation: true,
    },
    {
      field: "laborUnit",
      source: "A09 / OfferBoq",
      authority: "CATALOG",
      currentValue: "m2",
      missing: false,
      requiredForActivation: true,
    },
    {
      field: "materialUnit + qtyFactor",
      source: "Owner norm / TechnologyPack recipe",
      authority: "OWNER_APPROVED or norm_ref for ACTIVE",
      currentValue: null,
      missing: true,
      requiredForActivation: true,
    },
    {
      field: "technology",
      source: "A09 / G177",
      authority: "OWNER_SSOT semantic",
      currentValue: "GK",
      missing: false,
      requiredForActivation: false,
    },
    {
      field: "scope",
      source: "GO30 researchClassification",
      authority: "DERIVED",
      currentValue: der.researchClassification,
      missing: false,
      requiredForActivation: false,
    },
    {
      field: "costSplit metadata",
      source: "A09",
      authority: "PACKAGE domain marker only",
      currentValue: { ...IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT },
      missing: false,
      requiredForActivation: false,
    },
    {
      field: "provenance (factorSourceKind / ref / approvedAt)",
      source: "recipe-provenance RECIPE-01A",
      authority: "required for APPROVED→ACTIVE (non-fixture)",
      currentValue: null,
      missing: true,
      requiredForActivation: true,
    },
    {
      field: "packId / packVersion / lifecycle",
      source: "TechnologyPack schema",
      authority: "NEW — does not exist",
      currentValue: null,
      missing: true,
      requiredForActivation: true,
    },
    {
      field: "hoursPerUnit (labour)",
      source: "Owner / norm — NEVER PLN",
      authority: "OWNER_APPROVED",
      currentValue: null,
      missing: true,
      requiredForActivation: true,
    },
  ];
}

export function listGkLaborLeafCandidates(): LaborLeafCandidate[] {
  return [
    {
      workId: IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
      label: "Zabudowa działowa GK na stelażu",
      scope: "LABOR plane — PACKAGE≠LABOR for G177",
      unit: "m2",
      authority: "REJECTED",
      ownerPlane: getOwnerClassificationPlane(IK_OWNER_A09_REJECTED_LABOR_HOST_ID),
      ourRateStatus: "FORBIDDEN_118",
      provenance: "A09 Owner REJECT INTERNAL REUSE 118",
      rejectionStatus: "REJECTED_AS_PACKAGE_HOST",
      mayAcceptAsLeaf: false,
      notes: [
        "Wrong package semantics if used as PACKAGE identity",
        "Possibly adjacent LABOR description — NOT Owner-authorized leaf for A09",
        "Rate 118 must never auto-reuse",
        "Terminology reuse for discovery = NOT explicitly authorized → DENY default",
      ],
    },
    {
      workId: "cc-w2-plyta-gk-zabudowa",
      label: "Obudowa belek/słupów płytami GK",
      scope: "LABOR — beams/columns",
      unit: "m2",
      authority: "WRONG_SCOPE",
      ownerPlane: getOwnerClassificationPlane("cc-w2-plyta-gk-zabudowa"),
      ourRateStatus: "NOT_AUDITED_LIVE",
      provenance: "A09 collision review excluded",
      rejectionStatus: "WRONG_OBJECT",
      mayAcceptAsLeaf: false,
      notes: ["Not ścianki działowe GR"],
    },
    {
      workId: "legacy-gk-m2",
      label: "Legacy GK m2 bucket",
      scope: "LABOR Owner plane — generic",
      unit: "m2",
      authority: "WRONG_SCOPE",
      ownerPlane: getOwnerClassificationPlane("legacy-gk-m2"),
      ourRateStatus: "NOT_AUDITED_LIVE",
      provenance: "Owner map LABOR — not G177-specific",
      rejectionStatus: "GENERIC_BUCKET",
      mayAcceptAsLeaf: false,
      notes: ["A ≠ B: knowing package has labor ≠ this leaf represents it"],
    },
    {
      workId: "p2b-sufit-podwieszany-gk-m2",
      label: "Sufit podwieszany GK",
      scope: "LABOR — ceiling",
      unit: "m2",
      authority: "WRONG_SCOPE",
      ownerPlane: getOwnerClassificationPlane("p2b-sufit-podwieszany-gk-m2"),
      ourRateStatus: "NOT_AUDITED_LIVE",
      provenance: "A09 excluded",
      rejectionStatus: "WRONG_OBJECT",
      mayAcceptAsLeaf: false,
      notes: [],
    },
    {
      workId: "p2a-rozebranie-scianek-dzialowych-m2",
      label: "Rozbiórka ścianek działowych",
      scope: "LABOR — demolition",
      unit: "m2",
      authority: "WRONG_SCOPE",
      ownerPlane: getOwnerClassificationPlane("p2a-rozebranie-scianek-dzialowych-m2"),
      ourRateStatus: "NOT_AUDITED_LIVE",
      provenance: "A09 excluded (verb)",
      rejectionStatus: "WRONG_VERB",
      mayAcceptAsLeaf: false,
      notes: [],
    },
  ];
}

export function listGkMaterialLeafCandidates(): Array<{
  materialKey: string | null;
  workId: string | null;
  label: string;
  authority: LeafCandidateAuthority;
  notes: string[];
}> {
  const plyta = DEFAULT_MATERIAL_MARKET_MAP.find((m) => m.materialKey === "mat.plyta_gk");
  return [
    {
      materialKey: plyta?.materialKey ?? null,
      workId: plyta?.workId ?? null,
      label: plyta?.labelPl ?? "Płyta GK",
      authority: plyta ? "DISCOVERY_ONLY" : "MISSING",
      notes: [
        "Market map product identity exists — NOT full PACKAGE BOM (ruszt, łączniki, taśmy…)",
        "qtyFactor / Owner recipe still MISSING",
        "Not sufficient alone to activate TechnologyPack",
      ],
    },
    {
      materialKey: null,
      workId: null,
      label: "Ruszt metalowy / profile CW/UW",
      authority: "MISSING",
      notes: ["No authoritative mat.* found in this audit for stud frame"],
    },
  ];
}

export function analyzeRejectedHostForPack(): {
  workId: string;
  reasons: string[];
  mayReuseDescriptionForDiscovery: false;
  mayReuseRate: false;
} {
  return {
    workId: IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
    reasons: [
      "wrong_package_semantics (PACKAGE ≠ LABOR host)",
      "wrong_authority (Owner REJECT 118)",
      "wrong_rate_plane (internalBase completeness unclear — boards+frame+labor)",
      "forbidden_identity_substitution for A09 package workId",
    ],
    mayReuseDescriptionForDiscovery: false,
    mayReuseRate: false,
  };
}

export function analyzeProvisionalBomForGk(): {
  workId: string;
  isProvisionalLaborOnlyPath: boolean;
  isExplicitLaborOnlyAllowlist: boolean;
  technologyPackBacked: boolean;
  containsLaborIdentity: false;
  containsMaterialIdentity: false;
  nature: string;
  mustRemainProvisional: true;
} {
  const packs = findTechnologyPacksForWorkId(GK_PACKAGE, listAllPacks(), LEAF_RESEARCH_PACK_LIFECYCLES);
  return {
    workId: GK_PACKAGE,
    isProvisionalLaborOnlyPath: isProvisionalLaborOnlyPath(GK_PACKAGE),
    isExplicitLaborOnlyAllowlist: isExplicitLaborOnlyWork(GK_PACKAGE),
    technologyPackBacked: packs.length > 0,
    containsLaborIdentity: false,
    containsMaterialIdentity: false,
    nature:
      "cc-w2-* provisional LABOR_ONLY pricing path (F5 metadata) — B1 CLOSED: NOT AUTO_BOM; not TechnologyPack; no component workIds",
    mustRemainProvisional: true,
  };
}

export function documentDraftActiveTransition(): {
  trustedPath: string[];
  legacyGrandfather: string;
  whoActivates: string;
  ownerGate: string;
  activationImplemented: true;
  activationAuthorizedForGk: false;
  leafResearchConsumes: string;
  productionBomConsumes: string;
} {
  return {
    trustedPath: ["DRAFT", "REVIEW", "APPROVED", "ACTIVE"],
    legacyGrandfather: "DRAFT/REVIEW → ACTIVE only if all factors fixture_legacy",
    whoActivates: "transitionPackLifecycle(pack, 'ACTIVE') after canPromoteToActive",
    ownerGate:
      "RECIPE-01A provenance (owner_approved|norm_ref + factorSourceRef + factorApprovedAt) for APPROVED/ACTIVE",
    activationImplemented: true,
    activationAuthorizedForGk: false,
    leafResearchConsumes: "LEAF_RESEARCH_PACK_LIFECYCLES = DRAFT|REVIEW|APPROVED|ACTIVE (identity only)",
    productionBomConsumes: "ACTIVE + canPackFeedProductionBom only",
  };
}

export function proposeGkPackReadOnly(): {
  definableToday: boolean;
  activatableToday: false;
  laborLeafStatus: "LABOR_LEAF_IDENTITY_MISSING";
  proposed: {
    parent: string;
    labor: null;
    material: string | null;
    technology: string;
    unit: string;
    scope: string;
    lifecycleWouldBe: "DRAFT";
    note: string;
  };
} {
  const mat = DEFAULT_MATERIAL_MARKET_MAP.find((m) => m.materialKey === "mat.plyta_gk");
  return {
    definableToday: false,
    activatableToday: false,
    laborLeafStatus: "LABOR_LEAF_IDENTITY_MISSING",
    proposed: {
      parent: GK_PACKAGE,
      labor: null,
      material: mat?.materialKey ?? null,
      technology: "GK",
      unit: "m2",
      scope: "package / LABOR_COMPOUND",
      lifecycleWouldBe: "DRAFT",
      note:
        "Insufficient for even a complete DRAFT pack — labourKey / hoursPerUnit / qtyFactor / parent COMPOUND plane missing. Partial sketch only.",
    },
  };
}

export function mapLeafResearchSeam(): {
  producersConsumers: Array<{ from: string; to: string; note: string }>;
  blockedTodayReasons: string[];
  wouldWorkIf: string[];
} {
  return {
    producersConsumers: [
      {
        from: "ACTIVE|DRAFT pack bound to parent (steps.catalogWorkId)",
        to: "findTechnologyPacksForWorkId + LEAF_RESEARCH_PACK_LIFECYCLES",
        note: "identity lookup",
      },
      {
        from: "assertLeafLaborResearchAllowed",
        to: "requires parent plane COMPOUND + labourKey/step leaf + callSite ORCHESTRATOR",
        note: "gate",
      },
      {
        from: "runIkLeafLaborResearch",
        to: "runIkLaborGapResearch → runSelectiveWorkRateResearch",
        note: "REUSE selective research",
      },
      {
        from: "WorkRateResearchCandidate",
        to: "GO29 evaluator (Evidence→Candidate) — optional future wire",
        note: "isOurRate=false; R1 persist NO",
      },
      {
        from: "COMPOUND without leaf execute",
        to: IK_RESEARCH_HELD_COMPOUND_STATUS,
        note: "BOTH_HOLD / research held at parent",
      },
    ],
    blockedTodayReasons: [
      "No TechnologyPack bound to cc-w2-scianki-dzialowe-gr-pakiet-m2",
      "LABOR_LEAF_IDENTITY_MISSING",
      "Parent Owner plane UNKNOWN (not COMPOUND) — LEAF_PARENT_NOT_COMPOUND",
      "executeLeafResearch default OFF",
    ],
    wouldWorkIf: [
      "P1–P4 Owner pack + leaf + activation path",
      "Owner map parent → COMPOUND (separate classification GO — not UNKNOWN→LABOR invent)",
      "leafWorkId AUTHORITATIVE in pack.labour / steps",
      "executeLeafResearch armed by explicit orchestration only",
    ],
  };
}

export function listOwnerDecisionsP1P7(): Array<{
  id: string;
  title: string;
  status: "REQUIRED" | "OPTIONAL_LATER" | "FORBIDDEN_TODAY";
}> {
  return [
    { id: "P1", title: "Authorize a GK TechnologyPack (define)", status: "REQUIRED" },
    { id: "P2", title: "Choose AUTHORITATIVE labor leaf workId", status: "REQUIRED" },
    { id: "P3", title: "Choose material leaf keys + qtyFactors", status: "REQUIRED" },
    { id: "P4", title: "Activate pack (APPROVED→ACTIVE with provenance)", status: "REQUIRED" },
    {
      id: "P5",
      title: "Allow package labor research via Leaf Orchestrator (executeLeafResearch)",
      status: "REQUIRED",
    },
    {
      id: "P6",
      title: "Allow candidate persistence (Evidence KV) — still ≠ OUR RATE",
      status: "OPTIONAL_LATER",
    },
    {
      id: "P7",
      title: "Allow future AUTO OUR RATE (amends R1/P8)",
      status: "FORBIDDEN_TODAY",
    },
  ];
}

export function auditLegacyTechnologyPackPath(): {
  workId: string;
  packsBound: number;
  verdict: "IDENTITY_SEMANTIC_HOLD";
  safeTechnologyPackPath: false;
} {
  const packs = findTechnologyPacksForWorkId(LEGACY, listAllPacks(), LEAF_RESEARCH_PACK_LIFECYCLES);
  return {
    workId: LEGACY,
    packsBound: packs.length,
    verdict: "IDENTITY_SEMANTIC_HOLD",
    safeTechnologyPackPath: false,
  };
}

/**
 * Full GO32 audit — pure after fixture seed (in-memory registry only).
 */
export function auditGkTechnologyPackAuthority(): {
  verdict: "GK_TECHNOLOGY_PACK_AUTHORITY_AUDIT_PASS_LABOR_LEAF_IDENTITY_MISSING";
  distinction: { A_packageHasLabor: true; B_exactLaborLeafKnown: false };
  packImplementation: ReturnType<typeof listExistingPackSummaries>;
  requiredFields: ReturnType<typeof documentTechnologyPackRequiredFields>;
  gkEvidence: Record<string, unknown>;
  laborLeafCandidates: LaborLeafCandidate[];
  materialLeafCandidates: ReturnType<typeof listGkMaterialLeafCandidates>;
  rejectedHost: ReturnType<typeof analyzeRejectedHostForPack>;
  provisionalBom: ReturnType<typeof analyzeProvisionalBomForGk>;
  draftActive: ReturnType<typeof documentDraftActiveTransition>;
  proposedPack: ReturnType<typeof proposeGkPackReadOnly>;
  leafResearchSeam: ReturnType<typeof mapLeafResearchSeam>;
  ownerDecisions: ReturnType<typeof listOwnerDecisionsP1P7>;
  legacy: ReturnType<typeof auditLegacyTechnologyPackPath>;
  leafGateSimulation: {
    parentPlane: string;
    leafGateOk: boolean;
    blockReason: string | null;
  };
  mutationGuard: {
    packActivated: false;
    classificationMutated: false;
    rateWritten: false;
    acceptCalled: false;
    pass4: false;
  };
} {
  const packs = listExistingPackSummaries();
  const leafGate = assertLeafLaborResearchAllowed({
    leafWorkId: IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
    parentWorkId: GK_PACKAGE,
    pack: {
      packId: "audit.hypothetical.gk",
      packVersion: "0",
      definitionId: "def.audit",
      packCapabilities: [],
      lifecycle: "DRAFT",
      namePl: "hypothetical",
      stages: [],
      steps: [{ stepId: "s1", stageId: "st1", order: 1, namePl: "x", catalogWorkId: GK_PACKAGE }],
      dependencies: [],
      materials: [],
      equipment: [],
      labour: [
        {
          labourKey: IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
          namePl: "x",
          hoursPerUnit: 1,
        },
      ],
      regulatory: [],
    },
    callSite: IK_LEAF_RESEARCH_CALL_SITE,
  });

  return {
    verdict: "GK_TECHNOLOGY_PACK_AUTHORITY_AUDIT_PASS_LABOR_LEAF_IDENTITY_MISSING",
    distinction: {
      A_packageHasLabor: true,
      B_exactLaborLeafKnown: false,
    },
    packImplementation: packs,
    requiredFields: documentTechnologyPackRequiredFields(),
    gkEvidence: {
      workId: GK_PACKAGE,
      description: IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
      technology: "GK",
      unit: "m2",
      costSplit: { ...IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT },
      knr: "55-01 DISCOVERY_ONLY",
      rejectedHost: IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
      ownerPlane: getOwnerClassificationPlane(GK_PACKAGE),
      classifyPlane: classifyEstimatorPricingPlane({ workId: GK_PACKAGE }).plane,
      researchClassification: deriveResearchClassification({
        workId: GK_PACKAGE,
        unit: "m2",
      }).researchClassification,
      packsBoundToParent: packs.filter((p) => p.bindsGkPackage).length,
      historicalDraftPackReferences: "NONE in technology-foundation fixtures",
    },
    laborLeafCandidates: listGkLaborLeafCandidates(),
    materialLeafCandidates: listGkMaterialLeafCandidates(),
    rejectedHost: analyzeRejectedHostForPack(),
    provisionalBom: analyzeProvisionalBomForGk(),
    draftActive: documentDraftActiveTransition(),
    proposedPack: proposeGkPackReadOnly(),
    leafResearchSeam: mapLeafResearchSeam(),
    ownerDecisions: listOwnerDecisionsP1P7(),
    legacy: auditLegacyTechnologyPackPath(),
    leafGateSimulation: {
      parentPlane: classifyEstimatorPricingPlane({ workId: GK_PACKAGE }).plane,
      leafGateOk: leafGate.ok,
      blockReason: leafGate.ok ? null : leafGate.blockReason,
    },
    mutationGuard: {
      packActivated: false,
      classificationMutated: false,
      rateWritten: false,
      acceptCalled: false,
      pass4: false,
    },
  };
}

/** Export lifecycle helpers for tests (read-only checks). */
export const GO32_LIFECYCLE_HELPERS = {
  canTransitionLifecycle,
  canPromoteToActive,
  canPackFeedProductionBom,
  LEAF_RESEARCH_PACK_LIFECYCLES: [...LEAF_RESEARCH_PACK_LIFECYCLES],
};
