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
  forceIkIdentityCoverageForTests,
  forceIkChiefWiringForTests,
  forceIkLaborE2eForTests,
  forceIkLaborResearchForTests,
  forceIkMaterialE2eForTests,
  forceIkMaterialResearchForTests,
  forceIkF5E2eForTests,
  forceIkRiskDecisionE2eForTests,
  isIkEntryEnabled,
  isIkAutoIngestEnabled,
  isIkIdentityCoverageEnabled,
  isIkChiefWiringEnabled,
  isIkLaborE2eEnabled,
  isIkLaborResearchEnabled,
  isIkMaterialE2eEnabled,
  isIkMaterialResearchEnabled,
  isIkF5E2eEnabled,
  isIkRiskDecisionE2eEnabled,
  isIkP2DocumentsBoqActive,
  isIkP3IdentityCoverageActive,
  isIkP4ChiefWiringPreferenceActive,
  isIkP4ChiefSessionEligible,
  resolveIkP4ChiefEligible,
  isIkP5LaborE2eActive,
  isIkP5LaborExecuteResearchActive,
  resolveIkP5LaborExecuteResearch,
  isIkP6MaterialE2eActive,
  isIkP6MaterialExecuteResearchActive,
  resolveIkP6MaterialExecuteResearch,
  isIkP7F5E2eActive,
  resolveIkP7F5E2eActive,
  isIkP8RiskDecisionE2eActive,
  resolveIkP8RiskDecisionE2eActive,
  resolveIkDetailFirstScreen,
} from "./ik-entry-flag";

export {
  forceIkProvisionalEstimationForTests,
  isIkProvisionalEstimationEnabled,
  aggregateProvisionalPricingSummary,
  resolveProvisionalEstimatePlane,
  resolveProvisionalMapperLinePatch,
  tryResolveProvisionalLaborInput,
  tryResolveProvisionalMaterialSell,
  isSeamProvisionalPricingStatus,
  mapProvisionalAttestationToUiStatus,
  PROVISIONAL_REVIEW_TAG_OWNER,
  PROVISIONAL_REVIEW_TAG_UNIT,
} from "./ik-provisional-estimation";
export type {
  ProvisionalEstimatePlane,
  ProvisionalLaborResolution,
  ProvisionalMaterialResolution,
  ProvisionalPricingStatus,
  ProvisionalRateSource,
  ProvisionalLineAttestation,
  ProvisionalPricingSummary,
  ProvisionalUiLineStatus,
  ProvisionalResolveContext,
} from "./ik-provisional-estimation";

export type { IkE2eMode } from "@/lib/app-settings";
export type {
  IkDetailFirstScreen,
  IkP4ChiefEligibilityInput,
  IkP4BoqGateStatus,
  IkP5LaborExecuteResearchInput,
  IkP6MaterialExecuteResearchInput,
  IkP7F5E2eEligibilityInput,
} from "./ik-entry-flag";

export {
  IK_P5_MAX_HTTP_PER_RUN,
  IK_P5_MAX_HTTP_PER_WORK,
  IkP5ResearchBudget,
  wrapLookupPortWithIkP5Budget,
} from "./ik-p5-labor-budget";
export {
  IK_P6_MAX_ACTIVE_CLAIMS_PER_PASS,
  IK_P6_MAX_SHOP_HTTP_PER_RUN,
  IK_P6_SHOP_HTTP_PER_CLAIM_ESTIMATE,
  IkP6MaterialBudget,
} from "./ik-p6-material-budget";
export { buildInternalFirstIndexFromCatalogWorks } from "./ik-p5-internal-first-index";

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
  OBSERVATION_STAGE_IDS,
  OBSERVATION_STAGE_WEIGHTS,
  buildAnalysisObservation,
  computeAnalysisProgress,
  contributionFactor,
  mapCompositeReportStatus,
  mapDocumentExpertStatus,
  mapKnrExpertStatus,
  mapNg02IngestPhase,
  mapP7Status,
  mapP8Status,
  mapReadyBlockedPartial,
} from "./analysis-observation";
export type {
  AnalysisEta,
  AnalysisObservation,
  AnalysisProgress,
  AnalysisStageObservation,
  BuildAnalysisObservationOpts,
  FinalTeamWrapUp,
  ObservationActor,
  ObservationStageId,
  ObservationStageStatus,
  ObservationWeightedStageId,
} from "./analysis-observation";

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

export { runIkKnrExpert } from "./ik-knr-expert";
export type {
  IkKnrExpertCounts,
  IkKnrExpertLineResult,
  IkKnrExpertReport,
  IkKnrExpertStatus,
  IkKnrLineStatus,
} from "./ik-knr-expert";

export {
  HISTORICAL_EXECUTED_IMPLEMENTED,
  HISTORICAL_EXECUTED_AUTHORITY,
  HISTORICAL_EXECUTED_HOST_HYDRATE,
  HISTORICAL_EXECUTED_SCHEMA_VERSION,
  buildHistoricalExecutedIndexFromAthSources,
  buildHistoricalExecutedIndexFromOccurrences,
  emptyHistoricalExecutedIndex,
  lookupHistoricalExecuted,
  makeHistoricalOccurrence,
  summarizeHistoricalKinds,
  discoverHistoricalExecutedAthCandidates,
  hydrateHistoricalExecutedIndexFromJobs,
  resetHistoricalExecutedHostHydrateCachesForTests,
} from "./historical-executed";
export type {
  HistoricalExecutedIndex,
  HistoricalLookupQuery,
  HistoricalLookupResult,
  HistoricalMatchKind,
  HistoricalExecutedOccurrence,
  HistoricalExecutedAthCandidate,
  HistoricalHydrateReport,
} from "./historical-executed";

export {
  buildIkKnrConversation,
  IK_KNR_CONVERSATION_EXPERT_LABEL_PL,
  IK_KNR_CONVERSATION_LEAD_LABEL_PL,
} from "./ik-knr-conversation";
export type {
  IkKnrConversationActor,
  IkKnrConversationEvent,
  IkKnrConversationSourceRef,
  IkKnrConversationSourceRefKind,
  IkKnrConversationStep,
  IkKnrConversationStepId,
  IkKnrConversationStepStatus,
  IkKnrConversationView,
} from "./ik-knr-conversation";

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

export {
  runIkCompositeBothHold,
  IK_COMPOSITE_BOTH_HOLD_SCHEMA_VERSION,
  IK_COMPOSITE_P2_KEEP_GAP_WORK_IDS,
} from "./ik-composite-both-hold";
export type {
  IkCompositeBothHoldReport,
  IkCompositeLineResult,
  IkCompositeGapCode,
  IkCompositeLineStatus,
} from "./ik-composite-both-hold";

export {
  runIkP7PositionCostBid,
  IK_P7_POSITION_COST_BID_SCHEMA_VERSION,
} from "./ik-p7-position-cost-bid";
export type {
  IkP7PositionCostBidReport,
  IkP7PositionCostBidStatus,
} from "./ik-p7-position-cost-bid";
