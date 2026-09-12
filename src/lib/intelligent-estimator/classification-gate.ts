/**
 * INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE
 *
 * SSOT: classifyEstimatorPricingPlane — upstream of source selection / research.
 * A1: Owner map only · miss → UNKNOWN · ZERO heuristics.
 * Pure · ZERO Evidence / Catalog / OUR RATE / Accept / margin / HTTP.
 */

import type {
  EstimatorClassifyInput,
  EstimatorClassifyResult,
  EstimatorPricingPlane,
} from "./classification-types";
import { classifyEstimatorPricingPlaneA1 } from "./classification-a1-core";
import {
  classifyEstimatorPricingPlaneWithDiscovery,
  type ResolveUnknownPricingPlaneInput,
} from "./autonomous-unknown-plane-discovery";
import { isInvoicePurchaseMaterialKey } from "@/lib/price-intelligence/invoice-purchase-host";
import type { TechnologyPack } from "@/lib/technology-foundation";
import { LEAF_RESEARCH_PACK_LIFECYCLES } from "@/lib/tender-position-cost/bom-technology-adapter";

/** Expert line status: parent COMPOUND — research intentionally not executed. */
export const IK_RESEARCH_HELD_COMPOUND_STATUS = "RESEARCH_HELD_COMPOUND" as const;

/** PL copy for RESEARCH_HELD_COMPOUND (Labor/Material Expert lines). */
export const IK_RESEARCH_HELD_COMPOUND_MESSAGE_PL =
  "Research celowo wstrzymany — parent COMPOUND.";

function trimOrNull(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

/**
 * Central Classification Gate — A1 Owner map / mat.* (pure).
 * For Orchestra / research gating with autonomous discovery, use
 * classifyEstimatorPricingPlaneWithDiscovery / assert* (discovery-aware).
 */
export function classifyEstimatorPricingPlane(
  input: EstimatorClassifyInput,
): EstimatorClassifyResult {
  return classifyEstimatorPricingPlaneA1(input);
}

export function assertLaborResearchAllowed(
  input: ResolveUnknownPricingPlaneInput,
):
  | { ok: true; classify: EstimatorClassifyResult }
  | { ok: false; classify: EstimatorClassifyResult; blockReason: "CLASSIFICATION_GATE" } {
  const classify = classifyEstimatorPricingPlaneWithDiscovery(input);
  if (!classify.allowLaborResearch || classify.plane !== "LABOR") {
    return { ok: false, classify, blockReason: "CLASSIFICATION_GATE" };
  }
  return { ok: true, classify };
}

/**
 * Material research guard (A3 + A5).
 * - mat.* keys → allow (existing Price Memory / BOM DIY)
 * - catalogWorkId / workId in Owner map → allow only MATERIAL
 * - otherwise UNKNOWN/COMPOUND/LABOR → block
 */
export function assertMaterialResearchAllowed(input: {
  materialKey?: string | null;
  catalogWorkId?: string | null;
  workId?: string | null;
  namePl?: string | null;
  unit?: string | null;
}):
  | { ok: true; classify: EstimatorClassifyResult }
  | { ok: false; classify: EstimatorClassifyResult; blockReason: "CLASSIFICATION_GATE" } {
  const materialKey = trimOrNull(input.materialKey);
  const workId = trimOrNull(input.workId) ?? trimOrNull(input.catalogWorkId);

  // IK-P1 G2: mat.inv.* = historical purchase — HARD-FORBID DIY Research (before mat.* allow).
  if (materialKey && isInvoicePurchaseMaterialKey(materialKey)) {
    const classify = classifyEstimatorPricingPlane({
      materialKey,
      workId: null,
      namePl: input.namePl,
      unit: input.unit,
    });
    return { ok: false, classify, blockReason: "CLASSIFICATION_GATE" };
  }

  if (materialKey?.startsWith("mat.")) {
    const classify = classifyEstimatorPricingPlane({
      materialKey,
      workId: null,
      namePl: input.namePl,
      unit: input.unit,
    });
    return { ok: true, classify };
  }

  const classify = classifyEstimatorPricingPlaneWithDiscovery({
    workId,
    materialKey,
    namePl: input.namePl,
    unit: input.unit,
  });
  if (!classify.allowMaterialResearch || classify.plane !== "MATERIAL") {
    return { ok: false, classify, blockReason: "CLASSIFICATION_GATE" };
  }
  return { ok: true, classify };
}

export function isLaborGapJobAllowed(workId: string): boolean {
  const c = classifyEstimatorPricingPlaneWithDiscovery({ workId });
  return c.plane === "LABOR" && c.allowLaborResearch;
}

/** Only Leaf Research Orchestrator may mint leaf auth — never Experts / Composite. */
export const IK_LEAF_RESEARCH_CALL_SITE = "LEAF_RESEARCH_ORCHESTRATOR" as const;

export type IkLeafResearchCallSite = typeof IK_LEAF_RESEARCH_CALL_SITE;

export type IkLeafLaborResearchAuth = {
  kind: "LEAF_PACK_AUTHORIZED";
  leafWorkId: string;
  parentWorkId: string;
  packId: string;
  packVersion: string;
  packLifecycle: TechnologyPack["lifecycle"];
  callSite: IkLeafResearchCallSite;
};

export type IkLeafLaborResearchBlockReason =
  | "CLASSIFICATION_GATE"
  | "LEAF_CALL_SITE"
  | "LEAF_PARENT_NOT_COMPOUND"
  | "LEAF_PACK_LIFECYCLE"
  | "LEAF_PACK_NOT_BOUND"
  | "LEAF_NOT_IN_PACK"
  | "LEAF_SELF_BIND_REQUIRES_LABOUR";

function packBoundToParent(pack: TechnologyPack, parentWorkId: string): boolean {
  const id = String(parentWorkId || "").trim();
  if (!id) return false;
  return pack.steps.some((s) => String(s.catalogWorkId || "").trim() === id);
}

function labourKeysOf(pack: TechnologyPack): Set<string> {
  return new Set(
    (pack.labour || [])
      .map((l) => String(l.labourKey || "").trim())
      .filter(Boolean),
  );
}

function stepWorkIdsOf(pack: TechnologyPack): Set<string> {
  return new Set(
    (pack.steps || [])
      .map((s) => String(s.catalogWorkId || "").trim())
      .filter(Boolean),
  );
}

function materialKeysOf(pack: TechnologyPack): Set<string> {
  return new Set(
    (pack.materials || [])
      .map((m) => String(m.materialKey || "").trim())
      .filter(Boolean),
  );
}

/**
 * Leaf labor under COMPOUND parent — fail-closed.
 * Direct COMPOUND research stays blocked via assertLaborResearchAllowed.
 * Self-bind (leaf === parent) requires explicit pack.labour[].labourKey.
 */
export function assertLeafLaborResearchAllowed(input: {
  leafWorkId: string;
  parentWorkId: string;
  pack: TechnologyPack;
  callSite: string;
  namePl?: string | null;
  unit?: string | null;
}):
  | { ok: true; classify: EstimatorClassifyResult; auth: IkLeafLaborResearchAuth }
  | {
      ok: false;
      classify: EstimatorClassifyResult;
      blockReason: IkLeafLaborResearchBlockReason;
    } {
  const leafWorkId = trimOrNull(input.leafWorkId) || "";
  const parentWorkId = trimOrNull(input.parentWorkId) || "";
  const classify = classifyEstimatorPricingPlaneWithDiscovery({
    workId: parentWorkId || leafWorkId || null,
    namePl: input.namePl,
    unit: input.unit,
    packs: [input.pack],
  });

  if (input.callSite !== IK_LEAF_RESEARCH_CALL_SITE) {
    return { ok: false, classify, blockReason: "LEAF_CALL_SITE" };
  }
  if (!leafWorkId || !parentWorkId) {
    return { ok: false, classify, blockReason: "CLASSIFICATION_GATE" };
  }
  if (classify.plane !== "COMPOUND") {
    return { ok: false, classify, blockReason: "LEAF_PARENT_NOT_COMPOUND" };
  }
  if (!LEAF_RESEARCH_PACK_LIFECYCLES.has(input.pack.lifecycle)) {
    return { ok: false, classify, blockReason: "LEAF_PACK_LIFECYCLE" };
  }
  if (!packBoundToParent(input.pack, parentWorkId)) {
    return { ok: false, classify, blockReason: "LEAF_PACK_NOT_BOUND" };
  }

  const labourKeys = labourKeysOf(input.pack);
  const stepIds = stepWorkIdsOf(input.pack);
  const selfBind = leafWorkId === parentWorkId;

  if (selfBind) {
    // Explicit labour self-bind — steps alone are NOT enough (≠ parent research).
    if (!labourKeys.has(leafWorkId)) {
      return { ok: false, classify, blockReason: "LEAF_SELF_BIND_REQUIRES_LABOUR" };
    }
  } else if (!labourKeys.has(leafWorkId) && !stepIds.has(leafWorkId)) {
    return { ok: false, classify, blockReason: "LEAF_NOT_IN_PACK" };
  }

  return {
    ok: true,
    classify,
    auth: {
      kind: "LEAF_PACK_AUTHORIZED",
      leafWorkId,
      parentWorkId,
      packId: input.pack.packId,
      packVersion: input.pack.packVersion,
      packLifecycle: input.pack.lifecycle,
      callSite: IK_LEAF_RESEARCH_CALL_SITE,
    },
  };
}

/**
 * Leaf material under COMPOUND parent — pack.materials[] → mat.* only.
 * Never authorizes parent workId as material research target.
 */
export function assertLeafMaterialResearchAllowed(input: {
  materialKey: string;
  parentWorkId: string;
  pack: TechnologyPack;
  callSite: string;
  namePl?: string | null;
  unit?: string | null;
}):
  | { ok: true; classify: EstimatorClassifyResult }
  | {
      ok: false;
      classify: EstimatorClassifyResult;
      blockReason: IkLeafLaborResearchBlockReason | "LEAF_MATERIAL_NOT_IN_PACK" | "LEAF_MATERIAL_KEY";
    } {
  const materialKey = trimOrNull(input.materialKey) || "";
  const parentWorkId = trimOrNull(input.parentWorkId) || "";
  const parentClassify = classifyEstimatorPricingPlaneWithDiscovery({
    workId: parentWorkId,
    namePl: input.namePl,
    unit: input.unit,
    packs: [input.pack],
  });

  if (input.callSite !== IK_LEAF_RESEARCH_CALL_SITE) {
    return { ok: false, classify: parentClassify, blockReason: "LEAF_CALL_SITE" };
  }
  if (!materialKey.startsWith("mat.")) {
    return { ok: false, classify: parentClassify, blockReason: "LEAF_MATERIAL_KEY" };
  }
  if (parentClassify.plane !== "COMPOUND") {
    return { ok: false, classify: parentClassify, blockReason: "LEAF_PARENT_NOT_COMPOUND" };
  }
  if (!LEAF_RESEARCH_PACK_LIFECYCLES.has(input.pack.lifecycle)) {
    return { ok: false, classify: parentClassify, blockReason: "LEAF_PACK_LIFECYCLE" };
  }
  if (!packBoundToParent(input.pack, parentWorkId)) {
    return { ok: false, classify: parentClassify, blockReason: "LEAF_PACK_NOT_BOUND" };
  }
  if (!materialKeysOf(input.pack).has(materialKey)) {
    return { ok: false, classify: parentClassify, blockReason: "LEAF_MATERIAL_NOT_IN_PACK" };
  }

  // Legal mat.* path — never pass parent COMPOUND workId into material assert.
  return assertMaterialResearchAllowed({
    materialKey,
    workId: null,
    catalogWorkId: null,
    namePl: input.namePl,
    unit: input.unit,
  });
}
