/**
 * Technology Pack schema — TF-1 price forbid + normalize + 01A provenance pass-through.
 */

import { assertNoPriceTokens } from "./identity";
import { normalizeRecipeProvenance } from "./recipe-provenance";
import type {
  PackEquipmentRecipeLine,
  PackLabourRecipeLine,
  PackMaterialRecipeLine,
  TechnologyPack,
  TechnologyPackLifecycle,
} from "./types";

const LIFECYCLES: readonly TechnologyPackLifecycle[] = [
  "DRAFT",
  "REVIEW",
  "APPROVED",
  "ACTIVE",
  "DEPRECATED",
  "ARCHIVED",
];

function normalizeMaterial(m: PackMaterialRecipeLine): PackMaterialRecipeLine {
  const p = normalizeRecipeProvenance(m);
  const coats = m.coats === 1 || m.coats === 2 ? m.coats : undefined;
  return {
    materialKey: String(m.materialKey || "").trim(),
    namePl: String(m.namePl || m.materialKey),
    unit: String(m.unit || "").trim(),
    qtyFactor: Number(m.qtyFactor),
    ...(coats != null ? { coats } : {}),
    ...p,
  };
}

function normalizeEquipment(e: PackEquipmentRecipeLine): PackEquipmentRecipeLine {
  const p = normalizeRecipeProvenance(e);
  return {
    equipmentKey: String(e.equipmentKey || "").trim(),
    namePl: String(e.namePl || e.equipmentKey),
    unit: String(e.unit || "").trim(),
    qtyFactor: Number(e.qtyFactor),
    ...p,
  };
}

function normalizeLabour(l: PackLabourRecipeLine): PackLabourRecipeLine {
  const p = normalizeRecipeProvenance(l);
  return {
    labourKey: String(l.labourKey || "").trim(),
    namePl: String(l.namePl || l.labourKey),
    hoursPerUnit: Number(l.hoursPerUnit),
    ...p,
  };
}

export function normalizeTechnologyPack(raw: TechnologyPack): TechnologyPack {
  assertNoPriceTokens(raw, "TechnologyPack");

  if (!raw.packId?.trim()) throw new Error("packId required");
  if (!raw.packVersion?.trim()) throw new Error("packVersion required");
  if (!raw.definitionId?.trim()) throw new Error("definitionId required");
  if (!LIFECYCLES.includes(raw.lifecycle)) {
    throw new Error(`invalid lifecycle: ${raw.lifecycle}`);
  }

  const stages = [...(raw.stages ?? [])].sort((a, b) => a.order - b.order);
  const steps = [...(raw.steps ?? [])].sort((a, b) => a.order - b.order);
  const stageIds = new Set(stages.map((s) => s.stageId));

  for (const st of steps) {
    if (!stageIds.has(st.stageId)) {
      throw new Error(`step ${st.stepId} references unknown stage ${st.stageId}`);
    }
    if (!st.catalogWorkId?.trim()) {
      throw new Error(`step ${st.stepId} missing catalogWorkId`);
    }
  }

  const stepIds = new Set(steps.map((s) => s.stepId));
  for (const d of raw.dependencies ?? []) {
    if (!stepIds.has(d.predecessorStepId) || !stepIds.has(d.successorStepId)) {
      throw new Error(
        `dependency ${d.predecessorStepId}→${d.successorStepId} references unknown step`,
      );
    }
  }

  return {
    packId: raw.packId.trim(),
    packVersion: raw.packVersion.trim(),
    definitionId: raw.definitionId.trim(),
    packCapabilities: [...new Set((raw.packCapabilities ?? []).map((c) => c.trim()).filter(Boolean))].sort(),
    lifecycle: raw.lifecycle,
    namePl: String(raw.namePl || raw.packId),
    stages,
    steps,
    dependencies: [...(raw.dependencies ?? [])],
    materials: (raw.materials ?? []).map(normalizeMaterial),
    equipment: (raw.equipment ?? []).map(normalizeEquipment),
    labour: (raw.labour ?? []).map(normalizeLabour),
    regulatory: [...(raw.regulatory ?? [])],
  };
}

export function validateTechnologyPack(raw: TechnologyPack): TechnologyPack {
  return normalizeTechnologyPack(raw);
}
