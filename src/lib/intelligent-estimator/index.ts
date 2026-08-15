/**
 * INTELLIGENT-ESTIMATOR-CLASSIFICATION-GATE — public exports.
 */

export type {
  EstimatorClassifyInput,
  EstimatorClassifyReasonCode,
  EstimatorClassifyResult,
  EstimatorPricingPlane,
} from "./classification-types";

export {
  classifyEstimatorPricingPlane,
  assertLaborResearchAllowed,
  assertMaterialResearchAllowed,
  isLaborGapJobAllowed,
} from "./classification-gate";

export {
  ESTIMATOR_OWNER_CLASSIFICATION_COUNTS,
  ESTIMATOR_OWNER_CLASSIFICATION_MAP,
  getOwnerClassificationPlane,
} from "./owner-classification-map";

export {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
} from "./ik-entry-flag";
export type { IkDetailFirstScreen } from "./ik-entry-flag";

export {
  collectIkEntryPipelineFacts,
} from "./ik-entry-pipeline-facts";
export type {
  IkBoqReadiness,
  IkEntryPipelineFacts,
  IkEntrySourceRef,
} from "./ik-entry-pipeline-facts";

export {
  buildIkEntryConversationViewModel,
} from "./ik-entry-conversation";
export type { IkEntryConversationOpts } from "./ik-entry-conversation";

export {
  inventoryIkDocuments,
  runIkDocumentExpert,
  przedmiarBranchLabelPl,
} from "./ik-document-expert";
export type {
  IkDocumentExpertReport,
  IkDocumentExpertStatus,
  IkInventoryDocument,
  IkMasterBoqLineRef,
  IkPrzedmiarSource,
} from "./ik-document-expert";

export {
  needsIkNg02Ingest,
  runIkNg02IngestBridge,
} from "./ik-ng02-ingest-bridge";
export type {
  IkNg02IngestBridgeResult,
  IkNg02IngestPhase,
  IkZipInnerEntryEvidence,
} from "./ik-ng02-ingest-bridge";

export {
  assessDwellingMappingCoverage,
  applyExplicitOwnerDwellingMap,
  buildDwellingMappingCandidates,
  computeCompositionLineIntegrity,
  countKeepOneCollapsedFromWarnings,
  countSourceLinesInArtifacts,
} from "./ik-dwelling-mapping";
export type {
  IkApplyOwnerMapResult,
  IkDwellingMappingAssessment,
  IkDwellingMappingCandidate,
  IkDwellingMappingCandidateKind,
  IkExplicitOwnerDwelling,
  IkExplicitOwnerMapping,
  IkLineIntegrityReport,
} from "./ik-dwelling-mapping";

export { runIkMasterBoqClassification } from "./ik-classification";
export type {
  IkClassificationCounts,
  IkClassificationHandoff,
  IkClassificationReport,
  IkClassifiedMasterLine,
  IkIdentityStatus,
} from "./ik-classification";

export {
  runIkMasterBoqLaborExpert,
  mapAndResolveWorkIdentityForLine,
  normalizeUnitForLaborLookup,
  summarizeIkLaborForTrustedWorkLines,
} from "./ik-labor-expert";
export type {
  IkLaborBucket,
  IkLaborExpertCounts,
  IkLaborExpertLineResult,
  IkLaborExpertReport,
  IkLaborRateStatus,
  IkTrustedWorkLaborSummary,
} from "./ik-labor-expert";

export {
  runIkMasterBoqMaterialExpert,
  acceptIkMaterialResearchCandidate,
  resetMaterialResearchSessionCooldownForTests,
  summarizeIkMaterialForFocusLines,
} from "./ik-material-expert";
export type {
  IkMaterialBucket,
  IkMaterialExpertCounts,
  IkMaterialExpertLineResult,
  IkMaterialExpertReport,
  IkMaterialIdentity,
  IkMaterialPriceStatus,
  IkMaterialFocusCoverageStatus,
  IkTrustedMaterialFocusSummary,
} from "./ik-material-expert";

export {
  runIkMasterBoqIdentityCoverage,
} from "./ik-identity-coverage";
export type {
  IkIdentityCoverageCounts,
  IkIdentityCoverageLineResult,
  IkIdentityCoverageReport,
  IkIdentityCoverageStatus,
  IkWave2SeedAudit,
} from "./ik-identity-coverage";
