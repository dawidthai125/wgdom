/**
 * A1 pure classification core — Owner map / mat.* only.
 * Extracted so discovery orchestration can import without circular deps.
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

export function flagsForEstimatorPlane(plane: EstimatorPricingPlane): Pick<
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

export function buildEstimatorClassifyResult(
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
    ...flagsForEstimatorPlane(plane),
  };
}

/**
 * A1: Owner seed by workId → else mat.* → else UNKNOWN.
 * Never invents LABOR/MATERIAL from namePl.
 */
export function classifyEstimatorPricingPlaneA1(
  input: EstimatorClassifyInput,
): EstimatorClassifyResult {
  const workId = trimOrNull(input.workId);
  const materialKey = trimOrNull(input.materialKey);
  const namePl = trimOrNull(input.namePl);
  const unit = trimOrNull(input.unit);

  if (workId) {
    const seeded = getOwnerClassificationPlane(workId);
    if (seeded) {
      return buildEstimatorClassifyResult(seeded, {
        reasonCode: "OWNER_SEED",
        reasonPl: `Owner seed map → ${seeded}`,
        workId,
        materialKey,
        namePl,
        unit,
        classifiedBy: "owner_seed",
      });
    }
    return buildEstimatorClassifyResult("UNKNOWN", {
      reasonCode: "NO_SAFE_CLASS",
      reasonPl: "Brak wpisu w Owner map — UNKNOWN (A1, bez heurystyk)",
      workId,
      materialKey,
      namePl,
      unit,
      classifiedBy: "fallback_unknown",
    });
  }

  if (materialKey && materialKey.startsWith("mat.")) {
    return buildEstimatorClassifyResult("MATERIAL", {
      reasonCode: "MATERIAL_KEY",
      reasonPl: "materialKey mat.* → MATERIAL plane (Price Memory / DIY)",
      workId: null,
      materialKey,
      namePl,
      unit,
      classifiedBy: "material_key",
    });
  }

  return buildEstimatorClassifyResult("UNKNOWN", {
    reasonCode: workId || materialKey || namePl ? "NO_SAFE_CLASS" : "MISSING_IDENTITY",
    reasonPl: "Brak bezpiecznej tożsamości — UNKNOWN (bez invent)",
    workId,
    materialKey,
    namePl,
    unit,
    classifiedBy: "fallback_unknown",
  });
}
