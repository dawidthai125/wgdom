/**
 * GO31 — Package Labor Component Research Seam Audit (READ-ONLY).
 *
 * Question: Can IK safely research the LABOR component of a trusted PACKAGE
 * without mutating canonical classification?
 *
 * Answer for A09 GK package: PACKAGE_COMPONENT_IDENTITY_UNSAFE
 *   — costSplit ≠ component identity · KNR = DISCOVERY_ONLY · rejected host ≠ component
 *
 * NEVER: classification mutation · OUR RATE · Accept · PASS4 · catalog write · Orchestra.
 */

import type { EstimatorPricingPlane } from "@/lib/intelligent-estimator/classification-types";
import {
  assertLaborResearchAllowed,
  classifyEstimatorPricingPlane,
} from "@/lib/intelligent-estimator/classification-gate";
import { getOwnerClassificationPlane } from "@/lib/intelligent-estimator/owner-classification-map";
import {
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
  IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";
import { deriveResearchClassification } from "@/lib/work-catalog/research-profile-classification";

export type ComponentAuthorityClass =
  | "AUTHORITATIVE"
  | "DERIVED_SAFE"
  | "PROVISIONAL"
  | "UNKNOWN"
  | "REJECTED";

export type PackageLaborComponentCandidate = {
  componentId: string;
  workId: string | null;
  label: string;
  unit: string | null;
  quantity: number | null;
  scope: string;
  technology: string | null;
  provenance: string;
  authority: ComponentAuthorityClass;
  source: string;
  effectiveDate: string | null;
  isCatalogCurrent: boolean;
  isDerived: boolean;
  isProvisional: boolean;
  mayUseAsResearchQueryTerminology: boolean;
  mayUsePriceAsEvidence: false;
  mayBecomeOurRate: false;
  notes: string[];
};

export type PackageLaborComponentAuditResult = {
  packageWorkId: string;
  canonicalClassification: EstimatorPricingPlane | null;
  researchClassification: string;
  relationshipExists: false;
  verdict: "PACKAGE_COMPONENT_IDENTITY_UNSAFE";
  missingFields: string[];
  a09CostSplit: {
    materialRatio: number;
    laborRatio: number;
    represents: string;
    identifiesSpecificLaborWork: false;
    mayConstructLaborRate: false;
    mayBeUsedAsResearchProfileMetadata: true;
    forbiddenConversion: string;
  };
  g177Knr: {
    verbatim: string;
    knrRef: string;
    interpretation: "DISCOVERY_ONLY";
    providesExactLaborWorkIdentity: false;
    mayBecomeOurRate: false;
  };
  rejectedHost: PackageLaborComponentCandidate;
  candidates: PackageLaborComponentCandidate[];
  researchProfileProposal: {
    constructibleToday: false;
    missing: string[];
    proposedShape: Record<string, unknown>;
  };
  gateOptions: Array<{
    option: "A" | "B" | "C" | "D";
    title: string;
    falsePositiveRisk: string;
    authority: string;
    autonomy: string;
    compatibility: string;
    complexity: string;
    wouldUnlockToday: boolean;
  }>;
  recommendation: {
    option: "A" | "B" | "C" | "D";
    rationale: string[];
  };
  go29Seam: {
    preferredPipeline: string[];
    canConsumePackageLaborComponentToday: false;
    requiredBeforeWire: string[];
  };
  negativeInvariants: string[];
  policyRequirement: {
    needsSeparateOwnerPolicy: true;
    policyBoundary: string;
  };
  producersConsumers: Array<{
    symbol: string;
    producer: string;
    consumer: string;
    role: string;
  }>;
  mutatesCanonical: false;
};

const VAGUE_LEGACY = "legacy-roboty_ogolnobudowlane-m2";

/** Producer → consumer map for PACKAGE / A09 labor component seam (repo facts). */
export function listPackageLaborComponentProducersConsumers(): PackageLaborComponentAuditResult["producersConsumers"] {
  return [
    {
      symbol: "IK_OWNER_CREATE_A09_PACKAGE_WORK_ID",
      producer: "ik-owner-create-a09-package-catalog.ts",
      consumer: "A09 OPS seed · GO30 researchClassification · G1 AUTO winner",
      role: "PACKAGE work identity (not LABOR leaf)",
    },
    {
      symbol: "IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT",
      producer: "ik-owner-create-a09-package-catalog.ts",
      consumer: "classifyCatalogWorkDomain (ik-p5-internal-first-index) · CatalogWork.costSplit",
      role: "PACKAGE domain marker (≥0.25/0.25) — allocation ratios, NOT rates",
    },
    {
      symbol: "IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ",
      producer: "ik-owner-create-a09-package-catalog.ts",
      consumer: "descriptionPl provenance · GO29/30 profile description",
      role: "BOQ/KNR discovery context — NOT identity mapping",
    },
    {
      symbol: "IK_OWNER_A09_REJECTED_LABOR_HOST_ID",
      producer: "ik-owner-create-a09-package-catalog.ts",
      consumer: "assertA09LaborHostUntouched · Owner REJECT 118 reuse",
      role: "Forbidden LABOR host for package rate/identity substitution",
    },
    {
      symbol: "classifyCatalogWorkDomain",
      producer: "ik-p5-internal-first-index.ts",
      consumer: "internal-first index / reuse domain gate",
      role: "costSplit → LABOR_MATERIAL_PACKAGE domain",
    },
    {
      symbol: "domainsCompatibleForFinalPriceReuse",
      producer: "internal-first-domain.ts",
      consumer: "internal-first lookup",
      role: "REJECT PACKAGE→LABOR / PACKAGE→MATERIAL price reuse",
    },
    {
      symbol: "assertLaborResearchAllowed",
      producer: "classification-gate.ts",
      consumer: "GO29 evaluator · selective research",
      role: "Requires Owner plane LABOR — PACKAGE UNKNOWN blocked",
    },
    {
      symbol: "assertLeafLaborResearchAllowed",
      producer: "classification-gate.ts",
      consumer: "ik-leaf-research-orchestrator",
      role: "COMPOUND parent + TechnologyPack leaf auth — NO A09 pack exists",
    },
    {
      symbol: "A09 DECOMPOSITION",
      producer: "IK-OWNER-CREATE-A09-PACKAGE-DECISION.md §6",
      consumer: "policy / future Owner GO",
      role: "EXPLICIT: Decomposition NOT IN SCOPE — no LABOR+MATERIAL split without Owner GO",
    },
    {
      symbol: "TechnologyPack labour/steps",
      producer: "technology-foundation/*",
      consumer: "leaf research · BOM adapter",
      role: "No GK partition pack bound to A09 package workId",
    },
  ];
}

function buildRejectedHostCandidate(): PackageLaborComponentCandidate {
  const workId = IK_OWNER_A09_REJECTED_LABOR_HOST_ID;
  const ownerPlane = getOwnerClassificationPlane(workId);
  return {
    componentId: "cand_rejected_labor_host",
    workId,
    label: "Zabudowa działowa z płyt GK na stelażu (LABOR host)",
    unit: "m2",
    quantity: null,
    scope: "LABOR_ONLY (Owner plane LABOR) — wrong plane for G177 PACKAGE BOQ",
    technology: "GK",
    provenance:
      "P526 Owner REJECT INTERNAL REUSE 118 · PACKAGE ≠ LABOR host · completeness of 118 unclear",
    authority: "REJECTED",
    source: "IK-OWNER-CREATE-A09-PACKAGE-DECISION.md §3 · IK_OWNER_A09_REJECTED_LABOR_HOST_ID",
    effectiveDate: null,
    isCatalogCurrent: true,
    isDerived: false,
    isProvisional: false,
    mayUseAsResearchQueryTerminology: false,
    mayUsePriceAsEvidence: false,
    mayBecomeOurRate: false,
    notes: [
      `Owner classification plane=${ownerPlane} (LABOR) — adjacent semantics only`,
      "Owner forbids seed/alias/rate-copy onto PACKAGE workId",
      "internalBase 118 FORBIDDEN as Evidence / OUR RATE",
      "Query terminology NOT explicitly authorized — default DENY (fail-closed)",
      "Does NOT constitute package→component authoritative mapping",
    ],
  };
}

function buildAdjacentButNotComponentCandidates(): PackageLaborComponentCandidate[] {
  return [
    {
      componentId: "cand_costsplit_labor_share",
      workId: null,
      label: "A09 costSplit laborRatio=0.5",
      unit: null,
      quantity: null,
      scope: "allocation ratio only",
      technology: null,
      provenance: "IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT",
      authority: "UNKNOWN",
      source: "ik-owner-create-a09-package-catalog.ts",
      effectiveDate: null,
      isCatalogCurrent: true,
      isDerived: true,
      isProvisional: false,
      mayUseAsResearchQueryTerminology: false,
      mayUsePriceAsEvidence: false,
      mayBecomeOurRate: false,
      notes: [
        "0.5 is labor/material allocation metadata for PACKAGE domain classification",
        "NOT a labor work identity · NOT a labor rate · NOT quantity",
        "Forbidden: packagePrice × 0.5 → OUR RATE / Evidence",
      ],
    },
    {
      componentId: "cand_g177_knr_55_01",
      workId: null,
      label: "G177 / KNR 55-01 reference",
      unit: "m2",
      quantity: null,
      scope: "package/reference context",
      technology: "GK",
      provenance: IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
      authority: "UNKNOWN",
      source: "A09 G177 verbatim BOQ (DISCOVERY_ONLY)",
      effectiveDate: null,
      isCatalogCurrent: false,
      isDerived: true,
      isProvisional: false,
      mayUseAsResearchQueryTerminology: true,
      mayUsePriceAsEvidence: false,
      mayBecomeOurRate: false,
      notes: [
        "DISCOVERY_ONLY — KNR number ≠ labor workId ≠ OUR RATE",
        "May inform query text / technology tags if Owner later authorizes research",
        "Does not mint componentWorkId",
      ],
    },
    {
      componentId: "cand_cc_w2_plyta_gk_zabudowa",
      workId: "cc-w2-plyta-gk-zabudowa",
      label: "Obudowa belek/słupów płytami GK",
      unit: "m2",
      quantity: null,
      scope: "LABOR — different object (beams/columns)",
      technology: "GK",
      provenance: "A09 decision collision review — excluded",
      authority: "REJECTED",
      source: "IK-OWNER-CREATE-A09-PACKAGE-DECISION.md §4",
      effectiveDate: null,
      isCatalogCurrent: true,
      isDerived: false,
      isProvisional: false,
      mayUseAsResearchQueryTerminology: false,
      mayUsePriceAsEvidence: false,
      mayBecomeOurRate: false,
      notes: ["Wrong object — not ścianki działowe GR"],
    },
    {
      componentId: "cand_technology_pack_leaf",
      workId: null,
      label: "TechnologyPack labour leaf for A09 package",
      unit: null,
      quantity: null,
      scope: "leaf under COMPOUND parent",
      technology: "GK",
      provenance: "assertLeafLaborResearchAllowed requires pack bound to parent",
      authority: "UNKNOWN",
      source: "technology-foundation (absent for A09)",
      effectiveDate: null,
      isCatalogCurrent: false,
      isDerived: false,
      isProvisional: false,
      mayUseAsResearchQueryTerminology: false,
      mayUsePriceAsEvidence: false,
      mayBecomeOurRate: false,
      notes: [
        "No TechnologyPack steps/labour bound to cc-w2-scianki-dzialowe-gr-pakiet-m2",
        "Parent Owner plane is UNKNOWN (not COMPOUND) — leaf path also blocked",
      ],
    },
    {
      componentId: "cand_provisional_bom_labor_only",
      workId: IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
      label: "Provisional BOM LABOR_ONLY (AUTO_G2 B1)",
      unit: "m2",
      quantity: null,
      scope: "LABOR_ONLY provisional — not AUTO_BOM",
      technology: "GK",
      provenance: "AUTO-G2 DF / GO24 B1=NO provisional ≠ authoritative component",
      authority: "PROVISIONAL",
      source: "docs/architecture/AUTO-G2-ACCEPT-DECISION-FRAMEWORK.md",
      effectiveDate: null,
      isCatalogCurrent: false,
      isDerived: true,
      isProvisional: true,
      mayUseAsResearchQueryTerminology: false,
      mayUsePriceAsEvidence: false,
      mayBecomeOurRate: false,
      notes: [
        "Must NOT upgrade PROVISIONAL → AUTHORITATIVE",
        "Does not create separate componentWorkId",
      ],
    },
  ];
}

export const GO31_NEGATIVE_INVARIANTS = Object.freeze([
  "package total → labor rate FORBIDDEN",
  "costSplit → labor rate FORBIDDEN",
  "companyPrice → labor rate FORBIDDEN",
  "rejected host price → labor rate / Evidence FORBIDDEN",
  "KNR number → labor rate FORBIDDEN",
  "material price → labor rate FORBIDDEN",
  "generic GK wall price with UNKNOWN_SCOPE → labor rate FORBIDDEN",
  "UNKNOWN → LABOR_LEAF classification mutation FORBIDDEN",
  "assertLaborResearchAllowed generic loosen FORBIDDEN",
]);

/**
 * Core GO31 audit for A09 GK package — pure / deterministic.
 */
export function auditPackageLaborComponentResearch(
  packageWorkId: string = IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
): PackageLaborComponentAuditResult {
  const ownerPlane = getOwnerClassificationPlane(packageWorkId);
  const classify = classifyEstimatorPricingPlane({
    workId: packageWorkId,
    namePl: "Ścianki działowe GR — pakiet GK",
    unit: "m2",
  });
  const der = deriveResearchClassification({
    workId: packageWorkId,
    namePl: "Ścianki działowe GR — pakiet GK",
    unit: "m2",
  });
  const rejectedHost = buildRejectedHostCandidate();
  const candidates = [rejectedHost, ...buildAdjacentButNotComponentCandidates()];

  const authoritative = candidates.filter((c) => c.authority === "AUTHORITATIVE");
  const missingFields = [
    "componentWorkId (authoritative labor leaf under package)",
    "package→component mapping table / TechnologyPack labour binding",
    "component quantity recipe (deterministic)",
    "Owner authorization for PACKAGE_LABOR_COMPONENT research",
  ];

  return {
    packageWorkId,
    canonicalClassification: ownerPlane ?? classify.plane,
    researchClassification: der.researchClassification,
    relationshipExists: false,
    verdict: "PACKAGE_COMPONENT_IDENTITY_UNSAFE",
    missingFields,
    a09CostSplit: {
      materialRatio: IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT.materialRatio,
      laborRatio: IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT.laborRatio,
      represents:
        "Labor/material allocation ratios to classify CatalogWork as LABOR_MATERIAL_PACKAGE (domain), not a priced split",
      identifiesSpecificLaborWork: false,
      mayConstructLaborRate: false,
      mayBeUsedAsResearchProfileMetadata: true,
      forbiddenConversion: "packagePrice × laborRatio → OUR RATE / Evidence",
    },
    g177Knr: {
      verbatim: IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
      knrRef: "55-01",
      interpretation: "DISCOVERY_ONLY",
      providesExactLaborWorkIdentity: false,
      mayBecomeOurRate: false,
    },
    rejectedHost,
    candidates,
    researchProfileProposal: {
      constructibleToday: false,
      missing: missingFields,
      proposedShape: {
        parentWorkId: packageWorkId,
        componentWorkId: null,
        unit: "m2",
        technology: "GK",
        scopeTarget: "LABOR_ONLY",
        componentProvenance: null,
        note: "Shape only — not constructible until AUTHORITATIVE componentWorkId exists",
      },
    },
    gateOptions: [
      {
        option: "A",
        title: "Package remains blocked entirely",
        falsePositiveRisk: "LOW",
        authority: "Matches A1 + A09 decomposition OUT OF SCOPE",
        autonomy: "LOW",
        compatibility: "Status quo GO29 CLASSIFICATION_BLOCK",
        complexity: "NONE",
        wouldUnlockToday: false,
      },
      {
        option: "B",
        title: "Research if component identity AUTHORITATIVE",
        falsePositiveRisk: "LOW when authoritative",
        authority: "Requires new Owner leaf / pack binding",
        autonomy: "MEDIUM–HIGH after component exists",
        compatibility: "Aligns leaf-research pattern; parent classification unchanged",
        complexity: "HIGH (Owner CREATE leaf or TechnologyPack)",
        wouldUnlockToday: authoritative.length > 0,
      },
      {
        option: "C",
        title: "Research if component derived from package metadata",
        falsePositiveRisk: "HIGH — inventing component from costSplit/label",
        authority: "WEAK — A09 forbids decomposition without GO",
        autonomy: "HIGH unsafe",
        compatibility: "Conflicts A09 §6 Decomposition NOT IN SCOPE",
        complexity: "MEDIUM",
        wouldUnlockToday: false,
      },
      {
        option: "D",
        title: "Research from costSplit / KNR / reference only",
        falsePositiveRisk: "VERY HIGH",
        authority: "NONE for identity",
        autonomy: "HIGH unsafe",
        compatibility: "Violates negative invariants",
        complexity: "LOW (but forbidden)",
        wouldUnlockToday: false,
      },
    ],
    recommendation: {
      option: "A",
      rationale: [
        "No AUTHORITATIVE labor componentWorkId under A09 package",
        "A09 decision: Decomposition NOT IN SCOPE without separate Owner GO",
        "costSplit/KNR/rejected host cannot mint component identity",
        "Option B is the only future safe unlock — after Owner creates component identity or TechnologyPack leaf",
        "Do not implement Option C/D",
      ],
    },
    go29Seam: {
      preferredPipeline: [
        "G1 trusted package identity",
        "package component resolution (AUTHORITATIVE)",
        "ResearchWorkProfile (parentWorkId + componentWorkId + LABOR_ONLY)",
        "GO29 evaluator",
        "existing research provider",
        "Evidence → Candidate (isOurRate=false)",
      ],
      canConsumePackageLaborComponentToday: false,
      requiredBeforeWire: [
        "AUTHORITATIVE componentWorkId",
        "Owner policy PACKAGE_LABOR_COMPONENT (separate from LABOR_LEAF)",
        "Explicit GO29 input fields parentWorkId/componentWorkId (no semantic change to UNKNOWN_SCOPE rules)",
        "No classification mutation of package workId",
      ],
    },
    negativeInvariants: [...GO31_NEGATIVE_INVARIANTS],
    policyRequirement: {
      needsSeparateOwnerPolicy: true,
      policyBoundary:
        "LABOR_LEAF research (assertLaborResearchAllowed plane=LABOR) ≠ PACKAGE_LABOR_COMPONENT research (parent PACKAGE/COMPOUND + AUTHORITATIVE labor leaf / leaf-pack auth). Second path requires explicit Owner policy and must not loosen the first gate.",
    },
    producersConsumers: listPackageLaborComponentProducersConsumers(),
    mutatesCanonical: false,
  };
}

/** Legacy control — no package labor component. */
export function auditLegacyPackageLaborComponentControl(): {
  workId: string;
  verdict: "IDENTITY_SEMANTIC_HOLD";
  hasSafePackageLaborComponent: false;
  researchClassification: string;
  laborGateOk: boolean;
} {
  const der = deriveResearchClassification({
    workId: VAGUE_LEGACY,
    namePl: "Roboty ogólnobudowlane",
    unit: "m2",
  });
  const gate = assertLaborResearchAllowed({ workId: VAGUE_LEGACY });
  return {
    workId: VAGUE_LEGACY,
    verdict: "IDENTITY_SEMANTIC_HOLD",
    hasSafePackageLaborComponent: false,
    researchClassification: der.researchClassification,
    laborGateOk: gate.ok,
  };
}

/** Assert negative invariants hold against a proposed misuse map. */
export function assertPackageLaborNegativeInvariants(misuse: {
  packageTotalAsLaborRate?: boolean;
  costSplitAsLaborRate?: boolean;
  companyPriceAsLaborRate?: boolean;
  rejectedHostPriceAsEvidence?: boolean;
  knrAsLaborRate?: boolean;
  materialPriceAsLaborRate?: boolean;
  unknownScopeGkAsLaborRate?: boolean;
}): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  if (misuse.packageTotalAsLaborRate) violations.push("package total → labor rate");
  if (misuse.costSplitAsLaborRate) violations.push("costSplit → labor rate");
  if (misuse.companyPriceAsLaborRate) violations.push("companyPrice → labor rate");
  if (misuse.rejectedHostPriceAsEvidence) violations.push("rejected host price → Evidence");
  if (misuse.knrAsLaborRate) violations.push("KNR → labor rate");
  if (misuse.materialPriceAsLaborRate) violations.push("material price → labor rate");
  if (misuse.unknownScopeGkAsLaborRate) violations.push("UNKNOWN_SCOPE GK → labor rate");
  return { ok: violations.length === 0, violations };
}
