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
  resolvePrimingEconomyV1Eligibility,
  type PrimingEconomyV1Eligibility,
} from "./priming-eligibility";
export {
  ECONOMY_ELECTRICAL_CABLE_V1_KEYS,
  ECONOMY_ELECTRICAL_CIRCUIT_TO_KEY,
  materialKeyForNormalizedCircuitSpec,
  normalizeElectricalCircuitSpec,
  resolveEconomyElectricalCableV1,
  type EconomyElectricalCableResolve,
  type EconomyElectricalCableResolveKind,
  type EconomyElectricalCableV1Key,
} from "./electrical-circuit-spec";
export {
  aggregateLineStatus,
  decomposeOfferBoqLine,
  techUnitFamilyToCostItemFamily,
  type LineAggregateStatus,
  type LineDecompositionResult,
  type TechUnit,
  type TechUnitFamily,
  type TechUnitParameters,
  type TechUnitQuantityInput,
  type TechUnitRecipeBinding,
  type TechUnitRole,
  type TechUnitStatus,
} from "./technology-decomposition";
export {
  analyzeTechnologyLineBindings,
  annotateBomProvenance,
  buildTechnologyLineBindings,
  mergeGeneratedBoms,
  projectAndMergeBomFromBindings,
  type TechnologyBindStatus,
  type TechnologyLineBinding,
  type TechnologyLineBindingResult,
} from "./technology-line-binding";
