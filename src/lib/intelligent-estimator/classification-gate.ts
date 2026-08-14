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
import { getOwnerClassificationPlane } from "./owner-classification-map";

function trimOrNull(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s ? s : null;
}

function flagsFor(plane: EstimatorPricingPlane): Pick<
  EstimatorClassifyResult,
  | "allowLaborCatalogLookup"
  | "allowLaborResearch"
  | "allowMaterialCatalogLookup"
  | "allowMaterialResearch"
  | "hold"
  | "holdKind"
> {
  switch (plane) {
    case "LABOR":
      return {
        allowLaborCatalogLookup: true,
        allowLaborResearch: true,
        allowMaterialCatalogLookup: false,
        allowMaterialResearch: false,
        hold: false,
        holdKind: "NONE",
      };
    case "MATERIAL":
      return {
        allowLaborCatalogLookup: false,
        allowLaborResearch: false,
        allowMaterialCatalogLookup: true,
        allowMaterialResearch: true,
        hold: false,
        holdKind: "NONE",
      };
    case "COMPOUND":
      return {
        allowLaborCatalogLookup: false,
        allowLaborResearch: false,
        allowMaterialCatalogLookup: false,
        allowMaterialResearch: false,
        hold: true,
        holdKind: "COMPOUND",
      };
    case "UNKNOWN":
    default:
      return {
        allowLaborCatalogLookup: false,
        allowLaborResearch: false,
        allowMaterialCatalogLookup: false,
        allowMaterialResearch: false,
        hold: true,
        holdKind: "UNKNOWN",
      };
  }
}

function buildResult(
  plane: EstimatorPricingPlane,
  partial: Omit<
    EstimatorClassifyResult,
    | "plane"
    | "allowLaborCatalogLookup"
    | "allowLaborResearch"
    | "allowMaterialCatalogLookup"
    | "allowMaterialResearch"
    | "hold"
    | "holdKind"
    | "schemaVersion"
  >,
): EstimatorClassifyResult {
  return {
    plane,
    schemaVersion: 1,
    ...partial,
    ...flagsFor(plane),
  };
}

/**
 * Central Classification Gate (Design Freeze).
 * Authority: Owner seed by workId → else mat.* materialKey → else UNKNOWN.
 * Never uses source availability. Never invents LABOR/MATERIAL from namePl.
 */
export function classifyEstimatorPricingPlane(
  input: EstimatorClassifyInput,
): EstimatorClassifyResult {
  const workId = trimOrNull(input.workId);
  const materialKey = trimOrNull(input.materialKey);
  const namePl = trimOrNull(input.namePl);
  const unit = trimOrNull(input.unit);

  if (workId) {
    const seeded = getOwnerClassificationPlane(workId);
    if (seeded) {
      return buildResult(seeded, {
        reasonCode: "OWNER_SEED",
        reasonPl: `Owner seed map → ${seeded}`,
        workId,
        materialKey,
        namePl,
        unit,
        classifiedBy: "owner_seed",
      });
    }
    return buildResult("UNKNOWN", {
      reasonCode: "NO_SAFE_CLASS",
      reasonPl: "Brak wpisu w Owner map — UNKNOWN (A1, bez heurystyk)",
      workId,
      materialKey,
      namePl,
      unit,
      classifiedBy: "fallback_unknown",
    });
  }

  // Pure material-key research (BOM / Price Memory) — MATERIAL plane without inventing workId.
  if (materialKey && materialKey.startsWith("mat.")) {
    return buildResult("MATERIAL", {
      reasonCode: "MATERIAL_KEY",
      reasonPl: "materialKey mat.* → MATERIAL plane (Price Memory / DIY)",
      workId: null,
      materialKey,
      namePl,
      unit,
      classifiedBy: "material_key",
    });
  }

  return buildResult("UNKNOWN", {
    reasonCode: workId || materialKey || namePl ? "NO_SAFE_CLASS" : "MISSING_IDENTITY",
    reasonPl: "Brak bezpiecznej tożsamości — UNKNOWN (bez invent)",
    workId,
    materialKey,
    namePl,
    unit,
    classifiedBy: "fallback_unknown",
  });
}

export function assertLaborResearchAllowed(
  input: EstimatorClassifyInput,
):
  | { ok: true; classify: EstimatorClassifyResult }
  | { ok: false; classify: EstimatorClassifyResult; blockReason: "CLASSIFICATION_GATE" } {
  const classify = classifyEstimatorPricingPlane(input);
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

  if (materialKey?.startsWith("mat.")) {
    const classify = classifyEstimatorPricingPlane({
      materialKey,
      workId: null,
      namePl: input.namePl,
      unit: input.unit,
    });
    return { ok: true, classify };
  }

  const classify = classifyEstimatorPricingPlane({
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
  const c = classifyEstimatorPricingPlane({ workId });
  return c.plane === "LABOR" && c.allowLaborResearch;
}
