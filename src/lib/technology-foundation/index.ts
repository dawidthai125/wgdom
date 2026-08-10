/**
 * Public API — NG-TENDERS-TECHNOLOGY-FIRST-FOUNDATION-01 Phase B0.
 */

export { TECHNOLOGY_FOUNDATION_SCHEMA_VERSION } from "./types";
export type {
  BoqContext,
  BoqContextLine,
  BusinessProfileFixture,
  ExecutionPlan,
  ExecutionPlanStage,
  ExecutionPlanStep,
  ExplainIssue,
  ExplainLayer,
  FactorSourceKind,
  GeneratedBom,
  GeneratedBomEquipmentLine,
  GeneratedBomLabourLine,
  GeneratedBomMaterialLine,
  GeneratedWorkBundle,
  GeneratedWorkBundleStep,
  PackDependencyRule,
  PackEquipmentRecipeLine,
  PackLabourRecipeLine,
  PackMaterialRecipeLine,
  PackRegulatoryRef,
  PackStageTemplate,
  PackStepTemplate,
  RecipeFactorProvenance,
  TechnologyCapability,
  TechnologyDecisionKind,
  TechnologyDecisionResult,
  TechnologyDefinition,
  TechnologyPack,
  TechnologyPackLifecycle,
  ValidationResult,
  WastePolicy,
} from "./types";

export {
  assertNoPriceTokens,
  canonicalize,
  canonicalBoqContextKey,
  composeBomId,
  composeBomLineId,
  composeBundleId,
  composePlanId,
  composePlanRevision,
  deepEqualCanonical,
  fnv1aHex,
  FORBIDDEN_PRICE_RE,
  roundTripEqual,
  stableStringify,
} from "./identity";

export { normalizeTechnologyPack, validateTechnologyPack } from "./pack-schema";
export { canTransitionLifecycle, transitionPackLifecycle } from "./pack-lifecycle";
export {
  attemptEditPackInPlace,
  createNextVersion,
  type PackVersionPatch,
} from "./pack-versioning";

export {
  assertCapabilitiesExist,
  clearCapabilityRegistryForTests,
  getCapability,
  listCapabilities,
  registerCapability,
  requireCapability,
  seedBaselineCapabilities,
} from "./definition-registry";

export {
  clearDefinitionRegistryForTests,
  getDefinition,
  listDefinitions,
  registerDefinition,
  requireDefinition,
} from "./technology-definition";

export {
  clearPackRegistryForTests,
  getPack,
  listAllPacks,
  listPackVersions,
  registerPack,
  requirePack,
} from "./pack-registry";

export { deriveExecutionPlan } from "./execution-plan";
export { projectWorkBundle } from "./project-work-bundle";
export { projectBom, projectProductionBom } from "./project-bom";
export { validateStructural } from "./validate-structural";
export { validateBusiness } from "./validate-business";
export { decideTechnologyPack } from "./decision-hooks";

export {
  assertPackMayFeedProductionBom,
  canPackFeedProductionBom,
  canPromoteToActive,
  canPromoteToApproved,
  isRecipeLineProductionReady,
  isTrustedFactorSourceKind,
  normalizeRecipeProvenance,
  packHasOnlyFixtureLegacyFactors,
  validateRecipeProvenance,
  withLegacyFixtureProvenance,
} from "./recipe-provenance";

export {
  eticsBoqContext,
  eticsPackV1,
  FIXTURE_ETICS_PACK_ID,
  FIXTURE_KOSTKA_PACK_ID,
  FIXTURE_PAINTING_ECONOMY_PACK_ID,
  FIXTURE_PRIMING_ECONOMY_PACK_ID,
  FIXTURE_ELECTRICAL_CABLE_ECONOMY_PACK_ID,
  kostkaBoqContext,
  kostkaPackV1,
  PAINTING_ECONOMY_FACTOR_1_COAT,
  PAINTING_ECONOMY_FACTOR_2_COATS,
  PRIMING_ECONOMY_FACTOR_1_COAT,
  ELECTRICAL_CABLE_ECONOMY_QTY_FACTOR,
  paintingEconomyWhitePackV1,
  primingEconomyInteriorPackV1,
  electricalCableEconomyPackV1,
  seedB0Fixtures,
  seedPaintingEconomyWhiteV1,
  seedPrimingEconomyInteriorV1,
  seedElectricalCableEconomyV1,
} from "./fixtures";

export { filterPackRecipeForCoats } from "./pack-recipe-coats";
export type { PaintCoats as TfPaintCoats } from "./pack-recipe-coats";
export { filterPackRecipeForMaterialKey } from "./pack-recipe-material-key";

export {
  ELECTRICAL_CABLE_ECONOMY_V1_APPROVED_AT,
  ELECTRICAL_CABLE_ECONOMY_V1_SOURCE_REF,
} from "./electrical-cable-economy-v1";

export {
  PAINTING_ECONOMY_V1_APPROVED_AT,
  PAINTING_ECONOMY_V1_SOURCE_REF,
} from "./painting-economy-white-v1";

export {
  PRIMING_ECONOMY_V1_APPROVED_AT,
  PRIMING_ECONOMY_V1_SOURCE_REF,
} from "./priming-economy-interior-v1";

export {
  FIXTURE_SCREED_ECONOMY_WET_CEMENT_PACK_ID,
  SCREED_ECONOMY_WET_CEMENT_MATERIAL_KEY,
  SCREED_ECONOMY_WET_CEMENT_QTY_FACTOR,
  SCREED_ECONOMY_WET_CEMENT_THICKNESS_MAX_MM,
  SCREED_ECONOMY_WET_CEMENT_THICKNESS_MIN_MM,
  SCREED_ECONOMY_WET_CEMENT_V1_APPROVED_AT,
  SCREED_ECONOMY_WET_CEMENT_V1_SOURCE_REF,
  screedEconomyWetCementPackV1,
  seedScreedEconomyWetCementV1,
} from "./screed-economy-wet-cement-v1";

export { runTechnologyFoundationPipeline } from "./pipeline";
export type { TechnologyFoundationPipelineResult } from "./pipeline";
