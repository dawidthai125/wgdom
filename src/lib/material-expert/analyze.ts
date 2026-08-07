/**
 * Ekspert Materiałów — czynność domenowa (P0).
 *
 * Wejście wyłącznie: ExecutionExpertAnalysisResult.
 * Analiza: BOM.materials[] + TechnologyPack.materials.
 * ZERO cen · ZERO projectBom.
 */

import type { ExecutionExpertAnalysisResult } from "@/lib/execution-expert";
import { assessMaterialSystemCompleteness, detectAvailabilityRisks } from "./availability";
import { assessBomMaterialsAgainstPack } from "./conformity";
import { detectMaterialGaps } from "./gaps";
import { buildMaterialExpertContract } from "./interpret";
import type { MaterialExpertAnalysisResult } from "./types";
import { proposeMaterialVariants } from "./variants";

export function analyzeMaterialsFromExecution(
  execution: ExecutionExpertAnalysisResult,
): MaterialExpertAnalysisResult {
  const pack = execution.pack;
  const bom = execution.bom;
  const hasExecutionBasis = Boolean(pack && bom);

  const lines = assessBomMaterialsAgainstPack(bom, pack);
  const gapsCore = detectMaterialGaps({ execution, pack, lines });
  const variants = proposeMaterialVariants(lines.map((l) => l.materialKey));
  const availRisks = detectAvailabilityRisks(lines, variants);
  const gapsAndRisks = [...gapsCore, ...availRisks];

  const packRequired = pack?.materials.length ?? 0;
  const bomKeys = new Set((bom?.materials ?? []).map((m) => m.materialKey));
  const present = pack ? pack.materials.filter((m) => bomKeys.has(m.materialKey)).length : 0;
  const conforming = lines.filter((l) => l.conformity === "zgodny").length;
  const incompatible = gapsAndRisks.filter((g) => g.kind === "incompatible").length;

  const { completeness, notePl: completenessNotePl } = assessMaterialSystemCompleteness({
    packRequired,
    conforming,
    techMissing: gapsAndRisks.filter((g) => g.code === "MAT_TECH_MISSING").length,
    incompatible,
    hasExecutionBasis,
  });

  const packMaterialCoverage = {
    required: packRequired,
    present,
    conforming,
  };

  const contract = buildMaterialExpertContract({
    hasExecutionBasis,
    packNamePl: pack?.namePl ?? null,
    lines,
    gapsAndRisks,
    variants,
    completeness,
    completenessNotePl,
    packMaterialCoverage,
  });

  return {
    contract,
    lines,
    gapsAndRisks,
    variants,
    completeness,
    completenessNotePl,
    packMaterialCoverage,
  };
}
