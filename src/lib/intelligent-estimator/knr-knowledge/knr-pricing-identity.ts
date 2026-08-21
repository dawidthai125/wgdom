/**
 * IK-KNR KL-APP-2-ID — resolveKnrPricingIdentity (PURE · ZERO PLN).
 *
 * Position labor: REUSE Slice D exact-one + ownerApproval + unit (no BOQ write).
 * R-lines: evidence-only · never workId.
 * M-lines: Owner material table · never Price Memory / SELL.
 * S-lines: UNSUPPORTED v1.
 */

import {
  OWNER_KNR_MAPPINGS,
  type OwnerKnrMappingRow,
} from "../ik-knr-owner-mapping";
import { normalizeWorkRateUnitToken } from "@/lib/work-catalog/work-rate-qualify";
import { foldKnrNormAppUnit } from "./knr-norm-application";
import type { KnrResourceRequirementLine } from "./knr-norm-application-types";
import type {
  KnrPricingIdentityEquipmentLine,
  KnrPricingIdentityInput,
  KnrPricingIdentityMaterialLine,
  KnrPricingIdentityPositionLabor,
  KnrPricingIdentityResult,
  KnrPricingIdentityStatus,
  KnrPricingIdentityWorkRef,
  OwnerKnrMaterialMappingRow,
} from "./knr-pricing-identity-types";
import {
  KNR_APP2_ID_MATERIAL_TABLE_VERSION,
  KNR_APP2_ID_POSITION_TABLE_VERSION,
} from "./knr-pricing-identity-types";

export {
  KNR_APP2_ID_MATERIAL_TABLE_VERSION,
  KNR_APP2_ID_POSITION_TABLE_VERSION,
  type KnrPricingIdentityEquipmentLine,
  type KnrPricingIdentityInput,
  type KnrPricingIdentityMaterialLine,
  type KnrPricingIdentityPositionLabor,
  type KnrPricingIdentityProvenance,
  type KnrPricingIdentityResult,
  type KnrPricingIdentityStatus,
  type KnrPricingIdentitySummary,
  type KnrPricingIdentityWorkRef,
  type OwnerKnrMaterialMappingProvenance,
  type OwnerKnrMaterialMappingRow,
} from "./knr-pricing-identity-types";

export const KNR_KNOWLEDGE_KL_APP2_ID_IMPLEMENTED = true as const;

/** Production v1 — empty is legal. Do not seed KNR material codes here. */
export const OWNER_KNR_MATERIAL_MAPPINGS: readonly OwnerKnrMaterialMappingRow[] = [];

/** Slice D unit triple-check — same tokens as applyOwnerKnrMapping. */
function sliceDUnitsCompatible(
  boqUnit: string,
  mappingCatalogUnit: string,
  workUnit: string,
): boolean {
  const line = normalizeWorkRateUnitToken(boqUnit);
  const mapped = normalizeWorkRateUnitToken(mappingCatalogUnit);
  const work = normalizeWorkRateUnitToken(workUnit);
  if (!line || !mapped || !work) return false;
  return line === mapped && line === work;
}

function materialUnitsCompatible(resourceUnit: string, row: OwnerKnrMaterialMappingRow): boolean {
  const req = foldKnrNormAppUnit(resourceUnit);
  const rowRes = foldKnrNormAppUnit(row.resourceUnit);
  const pricing = foldKnrNormAppUnit(row.pricingUnit);
  if (!req || !rowRes || !pricing) return false;
  return req === rowRes && req === pricing;
}

/**
 * Resolve position → catalogWorkId using Slice D table semantics (read-only · no overlay write).
 */
function resolvePositionLabor(
  catalogBasisNormalizedKey: string | null | undefined,
  boqUnit: string,
  positionTable: readonly OwnerKnrMappingRow[],
  works: readonly KnrPricingIdentityWorkRef[],
): KnrPricingIdentityPositionLabor {
  const base: KnrPricingIdentityPositionLabor = {
    status: "UNMAPPED",
    laborNormsEvidenceOnly: true,
  };

  const key = String(catalogBasisNormalizedKey ?? "").trim();
  if (!key) return base;

  const allForKey = positionTable.filter((r) => String(r.normalizedKey ?? "") === key);
  if (allForKey.length === 0) return base;

  const legal = allForKey.filter((r) => r.active === true && r.ownerApproval === true);
  if (legal.length === 0) {
    return { ...base, status: "STALE" };
  }
  if (legal.length > 1) {
    return { ...base, status: "AMBIGUOUS" };
  }

  const row = legal[0]!;
  const workById = new Map(works.map((w) => [w.id, w]));
  const work = workById.get(row.workId);
  if (!work || work.active !== true) {
    return { ...base, status: "INVALID", mappingId: row.mappingId };
  }
  if (!sliceDUnitsCompatible(boqUnit, row.catalogUnit, work.unit)) {
    return { ...base, status: "INVALID", mappingId: row.mappingId };
  }

  return {
    status: "MAPPED",
    catalogWorkId: work.id,
    mappingId: row.mappingId,
    laborNormsEvidenceOnly: true,
  };
}

function resolveMaterialLine(
  line: KnrResourceRequirementLine,
  materialTable: readonly OwnerKnrMaterialMappingRow[],
): KnrPricingIdentityMaterialLine {
  const normCode = String(line.code ?? "");
  const resourceUnit = String(line.resourceUnit ?? "");
  const requiredQuantity = line.requiredQuantity;

  const base: KnrPricingIdentityMaterialLine = {
    normCode,
    resourceUnit,
    requiredQuantity,
    status: "UNMAPPED",
  };

  if (!normCode) return base;

  const allForCode = materialTable.filter((r) => String(r.knrNormCode ?? "") === normCode);
  if (allForCode.length === 0) return base;

  const approved = allForCode.filter((r) => r.active === true && r.ownerApproval === true);
  if (approved.length === 0) {
    return { ...base, status: "STALE" };
  }

  const unitOk = approved.filter((r) => materialUnitsCompatible(resourceUnit, r));
  if (unitOk.length === 0) {
    return { ...base, status: "INVALID" };
  }
  if (unitOk.length > 1) {
    return { ...base, status: "AMBIGUOUS" };
  }

  const row = unitOk[0]!;
  return {
    normCode,
    resourceUnit,
    requiredQuantity,
    status: "MAPPED",
    materialKey: row.materialKey,
    pricingUnit: row.pricingUnit,
    mappingId: row.mappingId,
  };
}

function resolveEquipmentLine(
  line: KnrResourceRequirementLine,
): KnrPricingIdentityEquipmentLine {
  return {
    normCode: String(line.code ?? ""),
    resourceUnit: String(line.resourceUnit ?? ""),
    requiredQuantity: line.requiredQuantity,
    status: "UNSUPPORTED",
  };
}

/**
 * Pure pricing-identity resolve. Deterministic · side-effect free · never PLN.
 * Does not call labor-rate lookup · Price Memory · F5 · applyOwnerKnrMapping write.
 * Isolation: no KNR acquire / miss-path providers.
 */
export function resolveKnrPricingIdentity(
  input: KnrPricingIdentityInput,
): KnrPricingIdentityResult {
  const positionTable = input.positionTable ?? OWNER_KNR_MAPPINGS;
  const materialTable = input.materialTable ?? OWNER_KNR_MATERIAL_MAPPINGS;
  const works = input.works ?? [];

  const positionLabor = resolvePositionLabor(
    input.catalogBasisNormalizedKey,
    input.boqUnit,
    positionTable,
    works,
  );

  // R-lines: never consulted for workId — evidence-only flag already on positionLabor.
  void input.labor;

  const materials = (input.materials ?? []).map((line) =>
    resolveMaterialLine(line, materialTable),
  );
  const equipment = (input.equipment ?? []).map((line) => resolveEquipmentLine(line));

  const canFeedP5 = positionLabor.status === "MAPPED";
  const canFeedP6Partial = materials.some((m) => m.status === "MAPPED");

  return {
    lineId: input.lineId,
    knrIdentityKeyV2: input.knrIdentityKeyV2,
    positionLabor,
    materials,
    equipment,
    summary: {
      canFeedP5,
      canFeedP6Partial,
      canFeedF5Equipment: false,
    },
    provenance: {
      source: "KL_APP_2_ID",
      appliedAt: input.nowIso,
      tableVersions: {
        positionTableVersion: KNR_APP2_ID_POSITION_TABLE_VERSION,
        materialTableVersion: KNR_APP2_ID_MATERIAL_TABLE_VERSION,
      },
    },
  };
}

/** Status helper for tests / callers. */
export function isKnrPricingIdentityMapped(status: KnrPricingIdentityStatus): boolean {
  return status === "MAPPED";
}
