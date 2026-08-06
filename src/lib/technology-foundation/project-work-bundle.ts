/**
 * Generated WorkBundle — projection from ExecutionPlan (TF-4).
 */

import { composeBundleId } from "./identity";
import type { ExecutionPlan, GeneratedWorkBundle, TechnologyPack } from "./types";

export function projectWorkBundle(
  pack: TechnologyPack,
  plan: ExecutionPlan,
): GeneratedWorkBundle {
  const steps = plan.stages
    .flatMap((st) => st.steps)
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      order: s.order,
      workId: s.catalogWorkId,
      quantityDefault: s.quantity,
      notePl: s.namePl,
      stepId: s.stepId,
      stageId: s.stageId,
    }));

  return {
    bundleId: composeBundleId(pack.packId, pack.packVersion, plan.planRevision),
    namePl: pack.namePl,
    packId: pack.packId,
    packVersion: pack.packVersion,
    planRevision: plan.planRevision,
    steps,
  };
}
