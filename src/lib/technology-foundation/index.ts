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
  kostkaBoqContext,
  kostkaPackV1,
  seedB0Fixtures,
} from "./fixtures";

export { runTechnologyFoundationPipeline } from "./pipeline";
export type { TechnologyFoundationPipelineResult } from "./pipeline";
