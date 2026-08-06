/**
 * Structural validation — TF-9 (graph / schema / completeness).
 */

import type {
  ExplainIssue,
  TechnologyPack,
  ValidationResult,
} from "./types";

function issue(code: string, message: string): ExplainIssue {
  return { code, message, layer: "structural" };
}

export function validateStructural(pack: TechnologyPack): ValidationResult {
  const warnings: ExplainIssue[] = [];
  const blockingIssues: ExplainIssue[] = [];

  if (!pack.stages.length) {
    blockingIssues.push(issue("STRUCT_NO_STAGES", "Pack has no stages"));
  }
  if (!pack.steps.length) {
    blockingIssues.push(issue("STRUCT_NO_STEPS", "Pack has no steps"));
  }

  const stageIds = new Set(pack.stages.map((s) => s.stageId));
  const stepIds = new Set(pack.steps.map((s) => s.stepId));

  for (const st of pack.steps) {
    if (!stageIds.has(st.stageId)) {
      blockingIssues.push(
        issue("STRUCT_ORPHAN_STEP", `Step ${st.stepId} has unknown stage ${st.stageId}`),
      );
    }
    if (!st.catalogWorkId?.trim()) {
      blockingIssues.push(issue("STRUCT_NO_CATALOG", `Step ${st.stepId} missing catalogWorkId`));
    }
  }

  // Dependency DAG: no self-loop; detect cycles via Kahn
  const preds = new Map<string, Set<string>>();
  for (const id of stepIds) preds.set(id, new Set());
  for (const d of pack.dependencies) {
    if (d.predecessorStepId === d.successorStepId) {
      blockingIssues.push(
        issue("STRUCT_DEP_SELF", `Self-dependency on ${d.predecessorStepId}`),
      );
      continue;
    }
    if (!stepIds.has(d.predecessorStepId) || !stepIds.has(d.successorStepId)) {
      blockingIssues.push(
        issue(
          "STRUCT_DEP_UNKNOWN",
          `Unknown dependency ${d.predecessorStepId}→${d.successorStepId}`,
        ),
      );
      continue;
    }
    preds.get(d.successorStepId)!.add(d.predecessorStepId);
  }

  const indeg = new Map<string, number>();
  for (const [id, set] of preds) indeg.set(id, set.size);
  const q = [...stepIds].filter((id) => (indeg.get(id) ?? 0) === 0);
  let visited = 0;
  while (q.length) {
    const n = q.shift()!;
    visited += 1;
    for (const [succ, set] of preds) {
      if (set.has(n)) {
        set.delete(n);
        indeg.set(succ, set.size);
        if (set.size === 0) q.push(succ);
      }
    }
  }
  if (stepIds.size > 0 && visited < stepIds.size) {
    blockingIssues.push(issue("STRUCT_DEP_CYCLE", "Step dependency graph has a cycle"));
  }

  if (!pack.materials.length && !pack.equipment.length && !pack.labour.length) {
    warnings.push(
      issue("STRUCT_EMPTY_BOM_RECIPE", "Pack has empty materials/equipment/labour recipes"),
    );
  }

  if (!pack.packCapabilities.length) {
    warnings.push(issue("STRUCT_NO_CAPABILITIES", "packCapabilities is empty"));
  }

  return { warnings, blockingIssues };
}
