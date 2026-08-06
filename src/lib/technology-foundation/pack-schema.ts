/**
 * Technology Pack schema — TF-1 price forbid + normalize.
 */

import { assertNoPriceTokens } from "./identity";
import type { TechnologyPack, TechnologyPackLifecycle } from "./types";

const LIFECYCLES: readonly TechnologyPackLifecycle[] = [
  "DRAFT",
  "ACTIVE",
  "DEPRECATED",
  "ARCHIVED",
];

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
    materials: [...(raw.materials ?? [])],
    equipment: [...(raw.equipment ?? [])],
    labour: [...(raw.labour ?? [])],
    regulatory: [...(raw.regulatory ?? [])],
  };
}

export function validateTechnologyPack(raw: TechnologyPack): TechnologyPack {
  return normalizeTechnologyPack(raw);
}
