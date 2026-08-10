/**
 * Generated BOM — Materials | Equipment | Labour (PLAN-R3). Never PLN (TF-1).
 * TECHNOLOGY-RECIPE-CONSUMPTION-01A: production path gated by provenance.
 */

import { composeBomId, composeBomLineId } from "./identity";
import { assertPackMayFeedProductionBom } from "./recipe-provenance";
import type {
  BoqContext,
  ExecutionPlan,
  GeneratedBom,
  TechnologyPack,
} from "./types";

function primaryBoqQty(ctx: BoqContext): number {
  const lines = ctx.lines ?? [];
  if (lines.length === 0) return 1;
  return lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0) || 1;
}

/**
 * Pure qty derivation (tests / inspection). Does not enforce production gate.
 * Formula: derivedQty = boqQty × qtyFactor
 */
export function projectBom(
  pack: TechnologyPack,
  plan: ExecutionPlan,
  ctx: BoqContext,
): GeneratedBom {
  const qty = primaryBoqQty(ctx);

  const materials = pack.materials.map((m) => ({
    bomLineId: composeBomLineId(pack.packId, pack.packVersion, "mat", m.materialKey),
    materialKey: m.materialKey,
    namePl: m.namePl,
    unit: m.unit,
    quantity: Number((qty * m.qtyFactor).toFixed(6)),
  }));

  const equipment = pack.equipment.map((e) => ({
    bomLineId: composeBomLineId(pack.packId, pack.packVersion, "eq", e.equipmentKey),
    equipmentKey: e.equipmentKey,
    namePl: e.namePl,
    unit: e.unit,
    quantity: Number((qty * e.qtyFactor).toFixed(6)),
  }));

  const labour = pack.labour.map((l) => ({
    bomLineId: composeBomLineId(pack.packId, pack.packVersion, "lab", l.labourKey),
    labourKey: l.labourKey,
    namePl: l.namePl,
    hours: Number((qty * l.hoursPerUnit).toFixed(6)),
  }));

  return {
    bomId: composeBomId(pack.packId, pack.packVersion, plan.planRevision),
    packId: pack.packId,
    packVersion: pack.packVersion,
    planRevision: plan.planRevision,
    materials,
    equipment,
    labour,
  };
}

/**
 * Production BOM — ACTIVE + production-ready provenance required.
 */
export function projectProductionBom(
  pack: TechnologyPack,
  plan: ExecutionPlan,
  ctx: BoqContext,
): GeneratedBom {
  assertPackMayFeedProductionBom(pack);
  return projectBom(pack, plan, ctx);
}
