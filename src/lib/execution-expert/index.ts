/**
 * Ekspert Wykonania — public API (kompetencja domenowa).
 * Technology Foundation jest narzędziem wewnętrznym.
 */

export type {
  ExecutionExpertAnalysisResult,
  ExecutionExpertBlocker,
  ExecutionExpertBusinessProfile,
  ExecutionExpertConfidence,
  ExecutionExpertContract,
  ExecutionGapKind,
  ExecutionGapOrRisk,
  ExecutionPackSelection,
  ExecutionPcrAlignment,
} from "./types";

export {
  isOfferBoqLineEligibleForExecution,
  offerBoqLineToBoqContextLine,
  offerBoqToBoqContext,
  offerBoqToBoqContextForPack,
  type OfferBoqLineLike,
} from "./offer-boq-adapter";

export { selectTechnologyPackForOfferBoq } from "./pack-selection";
export { detectExecutionGapsAndRisks } from "./gaps-and-risks";
export { buildExecutionExpertContract } from "./interpret";
export {
  analyzeExecutionFromOfferBoq,
  defaultExecutionExpertBusinessProfile,
} from "./analyze";
export {
  classifyCostItemFamily,
  type CostItemFamily,
} from "./cost-item-family";
export {
  resolvePaintCoats,
  type PaintCoats,
} from "./paint-coats";
export {
  analyzeTechnologyLineBindings,
  buildTechnologyLineBindings,
  mergeGeneratedBoms,
  projectAndMergeBomFromBindings,
  type TechnologyBindStatus,
  type TechnologyLineBinding,
  type TechnologyLineBindingResult,
} from "./technology-line-binding";
