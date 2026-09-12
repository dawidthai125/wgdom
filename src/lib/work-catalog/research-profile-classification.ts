/**
 * GO30 — Research Profile Semantic Enrichment (READ-ONLY).
 *
 * Separates:
 *   A) canonical Work Catalog / Owner classification (UNCHANGED)
 *   B) researchClassification — derived, advisory, never mutates A
 *
 * NEVER writes OUR RATE · NEVER Accept · NEVER PASS4 · NEVER Owner map edit.
 * Pure · deterministic · no HTTP.
 */

import type { EstimatorPricingPlane } from "@/lib/intelligent-estimator/classification-types";
import { assertLaborResearchAllowed } from "@/lib/intelligent-estimator/classification-gate";
import { classifyEstimatorPricingPlaneA1 as classifyEstimatorPricingPlane } from "@/lib/intelligent-estimator/classification-a1-core";
import { getOwnerClassificationPlane } from "@/lib/intelligent-estimator/owner-classification-map";
import {
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
  IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
} from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";
import { resolveWorkRateWorkFamily } from "@/lib/work-catalog/work-rate-discovery-allowlist";
import { listWorkRateMatchNamesPl } from "@/lib/work-catalog/work-rate-synonyms";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";

export type ResearchClassification =
  | "LABOR_LEAF"
  | "LABOR_COMPOUND"
  | "MATERIAL"
  | "SERVICE"
  | "UNKNOWN"
  | "UNSAFE";

export type ResearchGateOption = "A" | "B" | "C" | "D";

export type MetadataFieldAudit = {
  field: string;
  source: string;
  authority: "OWNER_SSOT" | "CATALOG" | "G1_IDENTITY" | "HEURISTIC" | "ABSENT" | "DERIVED";
  reliability: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  availableForGk: boolean;
  availableForLegacy: boolean;
  gkValue: unknown;
  legacyValue: unknown;
};

export type ResearchClassificationDerivation = {
  workId: string;
  canonicalOwnerPlane: EstimatorPricingPlane | null;
  canonicalClassifyPlane: EstimatorPricingPlane;
  canonicalReasonCode: string;
  researchClassification: ResearchClassification;
  derivationBasis: string[];
  mayResearchAdvisory: boolean;
  laborComponentTarget: {
    mode: "DIRECT_LABOR_LEAF" | "PACKAGE_LABOR_COMPONENT" | "NONE";
    note: string;
    rejectedLaborHostId: string | null;
  };
  mutatesCanonical: false;
};

export type ResearchGateSimulation = {
  option: ResearchGateOption;
  wouldUnlockProvider: boolean;
  reasons: string[];
  researchClassification: ResearchClassification;
  canonicalStillUnchanged: true;
};

const VAGUE_LEGACY_WORK_IDS = new Set([
  "legacy-roboty_ogolnobudowlane-m2",
  "legacy-roboty_ogolnobudowlane-mb",
  "legacy-roboty_ogolnobudowlane-szt",
]);

const PACKAGE_RATIO_THRESHOLD = 0.25;

/** Exact seam causing GO29 CLASSIFICATION_BLOCK (do not change in GO30). */
export const GO29_CLASSIFICATION_BLOCK_SEAM = Object.freeze({
  ownerMapFile: "src/lib/intelligent-estimator/owner-classification-map.ts",
  ownerLookup: "getOwnerClassificationPlane(workId)",
  classifyFile: "src/lib/intelligent-estimator/classification-gate.ts",
  classifyFn: "classifyEstimatorPricingPlane",
  gateFn: "assertLaborResearchAllowed",
  gateCondition:
    "!classify.allowLaborResearch || classify.plane !== \"LABOR\" → blockReason CLASSIFICATION_GATE",
  go29File: "src/lib/work-catalog/autonomous-rate-research-eval.ts",
  go29Lines: "laborGate = assertLaborResearchAllowed(...) ; if (!laborGate.ok) blocks.push(CLASSIFICATION_BLOCK)",
  providerSkip:
    "runSelectiveWorkRateResearch only when laborGate.ok && trusted && !vagueLegacy",
});

export function findCatalogWork(
  store: WorkCatalogStore | null | undefined,
  workId: string,
): CatalogWork | null {
  if (!store?.catalogs) return null;
  const id = String(workId || "").trim();
  for (const region of Object.keys(store.catalogs)) {
    const w = store.catalogs[region]?.works?.find((x) => x.id === id);
    if (w) return w;
  }
  return null;
}

/**
 * READ-ONLY derived researchClassification.
 * Never writes Owner map / catalog / OUR RATE.
 */
export function deriveResearchClassification(input: {
  workId: string;
  namePl?: string | null;
  unit?: string | null;
  catalogWork?: CatalogWork | null;
  /** Optional TechnologyPack presence for Option D simulation */
  hasLaborTechnologyPack?: boolean;
}): ResearchClassificationDerivation {
  const workId = String(input.workId || "").trim();
  const namePl = String(input.namePl || input.catalogWork?.namePl || workId).trim();
  const unit = String(input.unit || input.catalogWork?.unit || "").trim() || null;

  const ownerPlane = getOwnerClassificationPlane(workId);
  const classify = classifyEstimatorPricingPlane({ workId, namePl, unit });
  const basis: string[] = [];

  let researchClassification: ResearchClassification = "UNKNOWN";
  let laborMode: ResearchClassificationDerivation["laborComponentTarget"]["mode"] =
    "NONE";
  let laborNote = "Insufficient semantics for labor research unlock";
  let rejectedHost: string | null = null;

  // 1) Canonical Owner plane — strongest authority when LABOR/MATERIAL/COMPOUND
  if (ownerPlane === "LABOR") {
    researchClassification = "LABOR_LEAF";
    basis.push("OWNER_SEED plane=LABOR → researchClassification=LABOR_LEAF");
    laborMode = "DIRECT_LABOR_LEAF";
    laborNote = "Canonical LABOR — research targets this workId directly";
  } else if (ownerPlane === "COMPOUND") {
    researchClassification = "LABOR_COMPOUND";
    basis.push("OWNER_SEED plane=COMPOUND → researchClassification=LABOR_COMPOUND");
    laborMode = "PACKAGE_LABOR_COMPONENT";
    laborNote =
      "Canonical COMPOUND — research must target labor component / leaf only (LABOR_ONLY scope)";
  } else if (ownerPlane === "MATERIAL") {
    researchClassification = "MATERIAL";
    basis.push("OWNER_SEED plane=MATERIAL");
  } else if (ownerPlane === "UNKNOWN") {
    basis.push("OWNER_SEED plane=UNKNOWN (explicit)");
  } else {
    basis.push("OWNER_MAP_MISS → classify UNKNOWN (NO_SAFE_CLASS)");
  }

  // 2) PACKAGE costSplit evidence (catalog or A09 SSOT for known package work)
  const costSplit =
    input.catalogWork?.costSplit ??
    (workId === IK_OWNER_CREATE_A09_PACKAGE_WORK_ID
      ? { ...IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT }
      : null);

  if (
    researchClassification === "UNKNOWN" &&
    costSplit &&
    Number(costSplit.laborRatio) >= PACKAGE_RATIO_THRESHOLD &&
    Number(costSplit.materialRatio) >= PACKAGE_RATIO_THRESHOLD
  ) {
    researchClassification = "LABOR_COMPOUND";
    basis.push(
      `costSplit labor=${costSplit.laborRatio} material=${costSplit.materialRatio} ≥${PACKAGE_RATIO_THRESHOLD} → PACKAGE/LABOR_COMPOUND (not LABOR_LEAF)`,
    );
    laborMode = "PACKAGE_LABOR_COMPONENT";
    laborNote =
      "Package work — research must seek LABOR_ONLY observations; reject L+M package totals; do not invent labor share";
    if (workId === IK_OWNER_CREATE_A09_PACKAGE_WORK_ID) {
      rejectedHost = IK_OWNER_A09_REJECTED_LABOR_HOST_ID;
      basis.push(
        `A09 REJECTED LABOR host ${IK_OWNER_A09_REJECTED_LABOR_HOST_ID} — must not seed/alias/rate-copy`,
      );
      basis.push(`A09 G177 verbatim BOQ/KNR hint present (provenance only)`);
    }
  } else if (
    researchClassification === "UNKNOWN" &&
    costSplit &&
    Number(costSplit.laborRatio) === 1 &&
    Number(costSplit.materialRatio) === 0
  ) {
    researchClassification = "LABOR_LEAF";
    basis.push("costSplit labor=1 material=0 → LABOR_LEAF");
    laborMode = "DIRECT_LABOR_LEAF";
    laborNote = "Catalog labor-only split";
  } else if (
    researchClassification === "UNKNOWN" &&
    costSplit &&
    Number(costSplit.materialRatio) === 1 &&
    Number(costSplit.laborRatio) === 0
  ) {
    researchClassification = "MATERIAL";
    basis.push("costSplit material=1 labor=0 → MATERIAL");
  }

  // 3) Vague legacy buckets — fail closed
  if (VAGUE_LEGACY_WORK_IDS.has(workId)) {
    researchClassification = "UNSAFE";
    basis.push("VAGUE_LEGACY_BUCKET → UNSAFE / IDENTITY_SEMANTIC_HOLD");
    laborMode = "NONE";
    laborNote = "Do not invent generic construction labor rate";
  }

  // Never force LABOR_LEAF from Polish/English label alone when still UNKNOWN
  if (researchClassification === "UNKNOWN") {
    basis.push("No deterministic leaf/compound evidence — remain UNKNOWN (no label invent)");
  }

  const mayResearchAdvisory =
    researchClassification === "LABOR_LEAF" ||
    researchClassification === "LABOR_COMPOUND";

  return {
    workId,
    canonicalOwnerPlane: ownerPlane,
    canonicalClassifyPlane: classify.plane,
    canonicalReasonCode: classify.reasonCode,
    researchClassification,
    derivationBasis: basis,
    mayResearchAdvisory,
    laborComponentTarget: {
      mode: laborMode,
      note: laborNote,
      rejectedLaborHostId: rejectedHost,
    },
    mutatesCanonical: false,
  };
}

/** Simulate research-gate unlock options — advisory only (no production wire). */
export function simulateResearchGateUnlock(input: {
  derivation: ResearchClassificationDerivation;
  option: ResearchGateOption;
  hasLaborTechnologyPack?: boolean;
}): ResearchGateSimulation {
  const { derivation, option } = input;
  const hasPack = Boolean(input.hasLaborTechnologyPack);
  const reasons: string[] = [];
  let wouldUnlockProvider = false;

  // Baseline: current production gate
  const laborGate = assertLaborResearchAllowed({
    workId: derivation.workId,
  });
  reasons.push(
    `production assertLaborResearchAllowed ok=${laborGate.ok} plane=${laborGate.classify.plane}`,
  );

  switch (option) {
    case "A":
      wouldUnlockProvider = laborGate.ok;
      reasons.push("OPTION A: canonical LABOR required (status quo)");
      break;
    case "B":
      wouldUnlockProvider =
        derivation.researchClassification === "LABOR_LEAF" ||
        derivation.researchClassification === "LABOR_COMPOUND";
      reasons.push(
        `OPTION B: researchClassification=${derivation.researchClassification} mayUnlock=${wouldUnlockProvider}`,
      );
      if (derivation.researchClassification === "LABOR_COMPOUND") {
        reasons.push(
          "COMPOUND unlock requires LABOR_ONLY scope filter (GO29) — package totals stay UNKNOWN_SCOPE",
        );
      }
      break;
    case "C":
      wouldUnlockProvider = derivation.researchClassification === "LABOR_LEAF";
      reasons.push(
        `OPTION C: only LABOR_LEAF unlocks; got ${derivation.researchClassification}`,
      );
      break;
    case "D":
      wouldUnlockProvider = hasPack;
      reasons.push(
        `OPTION D: TechnologyPack labor leaf auth required; hasPack=${hasPack}`,
      );
      break;
  }

  return {
    option,
    wouldUnlockProvider,
    reasons,
    researchClassification: derivation.researchClassification,
    canonicalStillUnchanged: true,
  };
}

export function auditResearchMetadataFields(input: {
  gkWork?: CatalogWork | null;
  legacyWork?: CatalogWork | null;
}): MetadataFieldAudit[] {
  const gk = input.gkWork;
  const leg = input.legacyWork;
  const gkId = IK_OWNER_CREATE_A09_PACKAGE_WORK_ID;
  const legId = "legacy-roboty_ogolnobudowlane-m2";

  const row = (
    field: string,
    source: string,
    authority: MetadataFieldAudit["authority"],
    reliability: MetadataFieldAudit["reliability"],
    gkValue: unknown,
    legacyValue: unknown,
  ): MetadataFieldAudit => ({
    field,
    source,
    authority,
    reliability,
    availableForGk: gkValue != null && gkValue !== "" && gkValue !== false,
    availableForLegacy: legacyValue != null && legacyValue !== "" && legacyValue !== false,
    gkValue: gkValue ?? null,
    legacyValue: legacyValue ?? null,
  });

  return [
    row(
      "catalogWorkId",
      "G1 OfferBoq / package line",
      "G1_IDENTITY",
      "HIGH",
      gkId,
      legId,
    ),
    row("label/namePl", "CatalogWork.namePl", "CATALOG", "HIGH", gk?.namePl ?? null, leg?.namePl ?? null),
    row(
      "description",
      "CatalogWork.descriptionPl / A09 G177",
      "OWNER_SSOT",
      "HIGH",
      gk?.descriptionPl ?? IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
      leg?.descriptionPl ?? null,
    ),
    row("unit", "CatalogWork.unit / OfferBoq", "CATALOG", "HIGH", gk?.unit ?? "m2", leg?.unit ?? "m2"),
    row(
      "technology",
      "A09 GK package identity + description",
      "OWNER_SSOT",
      "HIGH",
      "GK",
      null,
    ),
    row(
      "workFamily",
      "resolveWorkRateWorkFamily",
      "HEURISTIC",
      "MEDIUM",
      resolveWorkRateWorkFamily({ workId: gkId, namePl: gk?.namePl }),
      resolveWorkRateWorkFamily({ workId: legId, namePl: leg?.namePl }),
    ),
    row(
      "aliases/synonyms",
      "listWorkRateMatchNamesPl",
      "HEURISTIC",
      "MEDIUM",
      listWorkRateMatchNamesPl(gk?.namePl || "Ścianki działowe GR"),
      listWorkRateMatchNamesPl(leg?.namePl || "Roboty ogólnobudowlane"),
    ),
    row(
      "KNR hints",
      "A09 G177 verbatim (55-01)",
      "OWNER_SSOT",
      "MEDIUM",
      "KNR 55-01 (provenance)",
      null,
    ),
    row("catalogBasis", "not a separate field on CatalogWork", "ABSENT", "NONE", null, null),
    row(
      "canonical classification",
      "getOwnerClassificationPlane",
      "OWNER_SSOT",
      "HIGH",
      getOwnerClassificationPlane(gkId),
      getOwnerClassificationPlane(legId),
    ),
    row(
      "costSplit",
      "CatalogWork.costSplit / A09 PACKAGE",
      "OWNER_SSOT",
      "HIGH",
      gk?.costSplit ?? { ...IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT },
      leg?.costSplit ?? null,
    ),
    row(
      "BOM metadata / TechnologyPack",
      "technology-foundation packs",
      "ABSENT",
      "NONE",
      null,
      null,
    ),
    row(
      "rejectedLaborHost",
      "A09 IK_OWNER_A09_REJECTED_LABOR_HOST_ID",
      "OWNER_SSOT",
      "HIGH",
      IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
      null,
    ),
    row(
      "labor/material semantics",
      "costSplit ratios",
      "DERIVED",
      "HIGH",
      "PACKAGE 0.5/0.5",
      "UNKNOWN (no safe split)",
    ),
  ];
}

export function evaluateResearchGateOptions(): Array<{
  option: ResearchGateOption;
  title: string;
  safety: string;
  autonomy: string;
  falsePositiveRisk: string;
  ssotCompatibility: string;
  complexity: string;
}> {
  return [
    {
      option: "A",
      title: "Canonical classification required",
      safety: "HIGHEST — A1 zero-heuristics preserved",
      autonomy: "LOW — UNKNOWN works never research",
      falsePositiveRisk: "LOW",
      ssotCompatibility: "Exact current assertLaborResearchAllowed",
      complexity: "NONE (status quo)",
    },
    {
      option: "B",
      title: "Trusted researchClassification may unlock research",
      safety: "MEDIUM — COMPOUND may unlock with LABOR_ONLY filter",
      autonomy: "HIGH — GK PACKAGE could reach PASS1/2",
      falsePositiveRisk: "HIGH if package totals accepted as labor",
      ssotCompatibility: "Requires parallel B field; A untouched",
      complexity: "MEDIUM — wire GO29 gate bypass advisory",
    },
    {
      option: "C",
      title: "Only deterministic LABOR_LEAF unlocks",
      safety: "HIGH — packages stay blocked",
      autonomy: "MEDIUM — only true labor leaves",
      falsePositiveRisk: "LOW",
      ssotCompatibility: "Aligns GO28 P6 leaf-under-COMPOUND spirit",
      complexity: "LOW — derive field + leaf-only unlock",
    },
    {
      option: "D",
      title: "Only explicit labor TechnologyPack unlocks",
      safety: "HIGH — pack auth already leaf-gated",
      autonomy: "LOW today — no GK pack exists",
      falsePositiveRisk: "LOW",
      ssotCompatibility: "REUSE leaf research orchestrator auth",
      complexity: "MEDIUM — pack authoring for GK",
    },
  ];
}

/** Owner recommendation for GO30 (policy not applied). */
export const GO30_RECOMMENDATION = Object.freeze({
  option: "C" as ResearchGateOption,
  rationale: [
    "GK PACKAGE costSplit 0.5/0.5 → researchClassification=LABOR_COMPOUND, NOT LABOR_LEAF",
    "Unlocking package workId via Option B risks treating L+M package prices as labor (GO29 UNKNOWN_SCOPE exists but FP still high at gate)",
    "Option C preserves A1: only deterministic LABOR_LEAF may unlock provider",
    "COMPOUND/PACKAGE path: future Owner GO for leaf labor identity or TechnologyPack (Option D) — not silent UNKNOWN→LABOR",
    "Legacy vague bucket → UNSAFE — remain IDENTITY_SEMANTIC_HOLD under all options",
  ],
  go29Impact: [
    "Profile construction already works without LABOR plane",
    "CLASSIFICATION_BLOCK remains for GK under Option C (expected — not LABOR_LEAF)",
    "Option B would unlock GO29 provider call for GK COMPOUND with LABOR_ONLY scope — NOT recommended without separate Owner GO",
    "No production wire in GO30",
  ],
});
