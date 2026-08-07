/**
 * Ekspert Materiałów — public API.
 */

export type {
  MaterialConformityStatus,
  MaterialExpertAnalysisResult,
  MaterialExpertBlocker,
  MaterialExpertConfidence,
  MaterialExpertContract,
  MaterialGapKind,
  MaterialGapOrRisk,
  MaterialLineAssessment,
  MaterialPcrAlignment,
  MaterialSystemCompleteness,
  MaterialVariantKind,
  MaterialVariantOption,
  MaterialVariantSet,
} from "./types";

export { assessBomMaterialsAgainstPack } from "./conformity";
export { detectMaterialGaps } from "./gaps";
export { proposeMaterialVariants } from "./variants";
export { assessMaterialSystemCompleteness, detectAvailabilityRisks } from "./availability";
export { buildMaterialExpertContract } from "./interpret";
export { analyzeMaterialsFromExecution } from "./analyze";
