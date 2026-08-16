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
  forceIkAutoIngestForTests,
  isIkEntryEnabled,
  isIkAutoIngestEnabled,
  isIkP2DocumentsBoqActive,
  resolveIkDetailFirstScreen,
} from "./ik-entry-flag";
export type { IkDetailFirstScreen } from "./ik-entry-flag";

export {
  IK_CONVERSATION_SOURCE_REF_KINDS,
  canPresentAsVerifiedFact,
  enforceIkConversationTruth,
  hasValidIkSourceRef,
  isAllowedIkSourceRefKind,
  toIkConversationEvent,
} from "./ik-conversation-event";
export type {
  IkConversationEvent,
  IkConversationEventActor,
  IkConversationEventStatus,
  IkConversationSourceRefKind,
} from "./ik-conversation-event";

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
  buildMaterialDemandResearchKey,
  isMaterialDemandResearchKey,
  MATERIAL_DEMAND_RESEARCH_KEY_PREFIX,
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

export {
  classifyIkMaterialIdentityP59,
  runIkMaterialIdentityP59,
  P59_FOCUS_WORK_ZAWOR,
  P59_FOCUS_WORK_ZAPRAWIANIE,
  P59_ZZK_FOCUS_LINE_SPECS,
} from "./ik-material-identity-p59";
export type {
  IkMaterialIdentityP59Counts,
  IkMaterialIdentityP59LineInput,
  IkMaterialIdentityP59LineResult,
  IkMaterialIdentityP59Outcome,
  IkMaterialIdentityP59Report,
  IkMaterialIdentityP59Resolved,
} from "./ik-material-identity-p59";

/** P5.25-FIX — INTERNAL-FIRST domain gate + semantic reuse (no pricing engine). */
export type { InternalFirstPriceDomain, DomainCompatResult } from "./internal-first-domain";
export {
  domainsCompatibleForFinalPriceReuse,
  normalizeInternalFirstDomain,
  internalFirstSearchLayers,
  domainToLayerLabel,
} from "./internal-first-domain";
export {
  softInternalFirstText,
  tokensInternalFirst,
  mapInternalFirstUnit,
  unitsCompatibleInternalFirst,
  extractActionStems,
  actionContextCompatible,
  INTERNAL_FIRST_ACTION_STEMS,
} from "./internal-first-text";
export type { ActionContextCompat } from "./internal-first-text";
export {
  scoreInternalFirstSemantic,
  lookupInternalFirst,
  wouldRejectCrossDomainPriceReuse,
} from "./internal-first-semantic-match";
export type {
  InternalFirstCatalogRow,
  InternalFirstLookupResult,
  InternalFirstMatchConfidence,
  SemanticScoreResult,
} from "./internal-first-semantic-match";
export {
  hostObjectSafetyGate,
  P526E_MONTAZ_GRZEJNIKA_WORK_ID,
  P526E_MALOWANIE_EMULSJA_WORK_ID,
  P526E_WYKUCIE_BRUZD_WORK_ID,
  P526E_ZAPRAWIANIE_BRUZD_WORK_ID,
} from "./internal-first-host-safety";
export type { HostObjectSafetyResult } from "./internal-first-host-safety";
export {
  buildInternalFirstResearchKey,
  InternalFirstResearchKeyDedupe,
} from "./internal-first-research-key";
export type { RetainedResearchCandidate } from "./internal-first-research-key";
export {
  classifySourceHealthError,
  InternalFirstSourceHealthTracker,
} from "./internal-first-source-health";
export type { SourceHealthErrorKind, SourceHealthState } from "./internal-first-source-health";
