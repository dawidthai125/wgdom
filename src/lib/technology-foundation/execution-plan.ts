/**
 * Derived ExecutionPlan — TF-10 · C-DET.
 */

import {
  composePlanId,
  composePlanRevision,
} from "./identity";
import type {
  BoqContext,
  ExecutionPlan,
  ExecutionPlanStage,
  ExecutionPlanStep,
  TechnologyPack,
} from "./types";

function resolveBoqQuantity(pack: TechnologyPack, ctx: BoqContext, stepCatalogWorkId: string): number {
  const lines = ctx.lines ?? [];
  const match = lines.find(
    (l) => l.catalogWorkIdHint && l.catalogWorkIdHint === stepCatalogWorkId,
  );
  if (match) return Number(match.quantity) || 0;
  // Fallback: sum all BOQ quantities when no hint match (single-scope packs).
  if (lines.length === 1) return Number(lines[0].quantity) || 0;
  if (lines.length > 1) {
    const sum = lines.reduce((acc, l) => acc + (Number(l.quantity) || 0), 0);
    return sum > 0 ? sum : 1;
  }
  return 1;
}

export function deriveExecutionPlan(pack: TechnologyPack, ctx: BoqContext): ExecutionPlan {
  const planRevision = composePlanRevision(pack.packId, pack.packVersion, ctx);
  const planId = composePlanId(pack.packId, pack.packVersion, planRevision);

  const stagesSorted = [...pack.stages].sort((a, b) => a.order - b.order);
  const stepsSorted = [...pack.steps].sort((a, b) => a.order - b.order);

  const stages: ExecutionPlanStage[] = stagesSorted.map((stage) => {
    const steps: ExecutionPlanStep[] = stepsSorted
      .filter((s) => s.stageId === stage.stageId)
      .map((s) => {
        const quantity =
          s.quantityFromBoq === false
            ? 1
            : resolveBoqQuantity(pack, ctx, s.catalogWorkId);
        return {
          stepId: s.stepId,
          stageId: s.stageId,
          order: s.order,
          namePl: s.namePl,
          catalogWorkId: s.catalogWorkId,
          quantity,
        };
      });
    return {
      stageId: stage.stageId,
      order: stage.order,
      namePl: stage.namePl,
      steps,
    };
  });

  return {
    planId,
    planRevision,
    packId: pack.packId,
    packVersion: pack.packVersion,
    stages,
  };
}
