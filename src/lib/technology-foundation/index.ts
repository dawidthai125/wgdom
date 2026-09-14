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
  hydratePackRegistryFromDurable,
  listAllPacks,
  listPackVersions,
  registerPack,
  requirePack,
} from "./pack-registry";

export {
  TECHNOLOGY_PACK_STORAGE_KEY,
  TECHNOLOGY_PACK_SCHEMA_VERSION,
  clearTechnologyPackDurableStoreForTests,
  emptyTechnologyPackDurableStore,
  loadTechnologyPackDurableStoreLocal,
  mergeTechnologyPackDataKey,
  mergeTechnologyPackDurableStore,
  normalizeTechnologyPackDurableStore,
  saveTechnologyPackDurableStoreLocal,
  upsertTechnologyPackDurable,
  type TechnologyPackDurableStore,
} from "./technology-pack-store";

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

/** Canonical production init — same packs as Execution Expert ensureFixtures. */
export { ensureBaselineTechnologyPacksRegistered } from "./ensure-baseline-technology-packs";

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

export {
  FIXTURE_GYPSUM_SKIM_CEILING_0815_05_PACK_ID,
  GYPSUM_SKIM_CEILING_0815_05_MATERIAL_KEY,
  GYPSUM_SKIM_CEILING_0815_05_QTY_FACTOR_KG_PER_M2,
  GYPSUM_SKIM_CEILING_0815_05_V1_APPROVED_AT,
  GYPSUM_SKIM_CEILING_0815_05_V1_SOURCE_REF,
  GYPSUM_SKIM_CEILING_0815_05_WORK_ID,
  gypsumSkimCeiling081505PackV1,
  seedGypsumSkimCeiling081505V1,
} from "./gypsum-skim-ceiling-0815-05-v1";

export {
  FIXTURE_PAINTING_KNR_4_01_1204_02_PACK_ID,
  PAINTING_KNR_4_01_1204_02_LABOUR_HOURS_PER_M2,
  PAINTING_KNR_4_01_1204_02_MATERIAL_KEY,
  PAINTING_KNR_4_01_1204_02_QTY_FACTOR_L_PER_M2,
  PAINTING_KNR_4_01_1204_02_V1_APPROVED_AT,
  PAINTING_KNR_4_01_1204_02_V1_SOURCE_REF,
  PAINTING_KNR_4_01_1204_02_WORK_ID,
  paintingKnr401120402PackV1,
  seedPaintingKnr401120402V1,
} from "./painting-knr-4-01-1204-02-v1";

export {
  FIXTURE_PAINTING_KNR_2_02_1505_01_PACK_ID,
  PAINTING_KNR_2_02_1505_01_LABOUR_HOURS_PER_M2,
  PAINTING_KNR_2_02_1505_01_MATERIAL_KEY,
  PAINTING_KNR_2_02_1505_01_QTY_FACTOR_L_PER_M2,
  PAINTING_KNR_2_02_1505_01_V1_APPROVED_AT,
  PAINTING_KNR_2_02_1505_01_V1_SOURCE_REF,
  PAINTING_KNR_2_02_1505_01_WORK_ID,
  paintingKnr202150501PackV1,
  seedPaintingKnr202150501V1,
} from "./painting-knr-2-02-1505-01-v1";

export {
  FIXTURE_PRIMING_NNRNKB_1134_01_PACK_ID,
  PRIMING_NNRNKB_1134_01_LABOUR_HOURS_PER_M2,
  PRIMING_NNRNKB_1134_01_MATERIAL_KEY,
  PRIMING_NNRNKB_1134_01_QTY_FACTOR_L_PER_M2,
  PRIMING_NNRNKB_1134_01_V1_APPROVED_AT,
  PRIMING_NNRNKB_1134_01_V1_SOURCE_REF,
  PRIMING_NNRNKB_1134_01_WORK_ID,
  primingNnrnkb113401PackV1,
  seedPrimingNnrnkb113401V1,
} from "./priming-nnrnkb-1134-01-v1";

export {
  FIXTURE_PRIMING_NNRNKB_1134_02_PACK_ID,
  PRIMING_NNRNKB_1134_02_LABOUR_HOURS_PER_M2,
  PRIMING_NNRNKB_1134_02_MATERIAL_KEY,
  PRIMING_NNRNKB_1134_02_QTY_FACTOR_L_PER_M2,
  PRIMING_NNRNKB_1134_02_V1_APPROVED_AT,
  PRIMING_NNRNKB_1134_02_V1_SOURCE_REF,
  PRIMING_NNRNKB_1134_02_WORK_ID,
  primingNnrnkb113402PackV1,
  seedPrimingNnrnkb113402V1,
} from "./priming-nnrnkb-1134-02-v1";

export { runTechnologyFoundationPipeline } from "./pipeline";
export type { TechnologyFoundationPipelineResult } from "./pipeline";
