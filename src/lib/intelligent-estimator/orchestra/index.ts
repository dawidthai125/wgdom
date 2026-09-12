/**
 * W1 Orchestra — public exports (IK sequencer extraction from IkEntryHost).
 */

export type {
  IkOrchestraFlags,
  IkOrchestraHostInput,
  IkOrchestraPipelineIngest,
  IkOrchestraSnapshot,
  IkOrchestraSyncInput,
  IkOrchestraSyncSnapshot,
  IkKnrAppDiag,
  IkKnrKnowledgeDiag,
  IkOwnerGateApi,
} from "./orchestra-types";

export type { IkKnrReanalysisDiag } from "./ik-knr-reanalysis-seam";

export type {
  IkIdentityContext,
  OwnerManualIdentityOverride,
} from "./ik-identity-phase";

export type { IkIdentityPersistOutcome } from "./ik-identity-persist-glue";
export { runIkIdentityPhase } from "./ik-identity-phase";
export {
  computeOfferBoqIdentityPayloadHash,
  runGatedIdentityPersist,
} from "./ik-identity-persist-glue";
export {
  hasCompleteTrustedIdentityTuple,
  preserveOfferBoqLineIfTrusted,
  TRUSTED_IDENTITY_MATCH_METHODS,
} from "../ik-identity-trusted-preserve";

export {
  evaluateAutoG1Contract,
  applyAutoG1AcceptToLine,
  applyAutoG1ExceptionToLine,
  AUTO_G1_MATCH_METHOD,
  AUTO_G1_GK_LOCKED_WINNER,
  AUTO_G1_RULE_GK_CLADDING_SCIANKI,
  AUTO_G1_WINDOW_SASH_LOCKED_WINNER,
  AUTO_G1_RULE_WINDOW_SASH_STOLARKA,
  isAutoG1NoiseDescription,
  isWindowSashFamilyDescription,
  isGkCladdingFamilyDescription,
} from "./auto-g1-accept-contract";
export type { AutoG1ContractResult, AutoG1Decision } from "./auto-g1-accept-contract";

export {
  evaluateCompoundToLaborLeafRebind,
  applyCompoundLaborLeafRebindToLine,
  isCeilingSingleLayerGypsumSkimActivity,
  selectCllrRelevantTechnologyPacks,
  COMPOUND_LABOR_LEAF_REBIND_DECISION_ID,
  COMPOUND_LABOR_LEAF_REBIND_POLICY_VERSION,
  CLLR_RULE_CEILING_SINGLE_GYPSUM_SKIM,
  CLLR_LEAF_0815_05,
} from "./compound-to-labor-leaf-rebind-contract";
export type {
  CompoundLaborLeafRebindResult,
  CompoundLaborLeafRebindDecision,
} from "./compound-to-labor-leaf-rebind-contract";

export {
  evaluateAutoRateContract,
  evaluateAutoBomContract,
  applyAutoRateAcceptToLine,
  applyAutoBomAcceptToLine,
  AUTO_RATE_DECISION_ID,
  AUTO_BOM_DECISION_ID,
  AUTO_G2_FORBIDDEN,
} from "./auto-g2-accept-contract";
export type {
  AutoRateContractResult,
  AutoBomContractResult,
} from "./auto-g2-accept-contract";
export {
  evaluateLaborOnlyAutoBomV1Contract,
  isLaborOnlyAutoBomV1Eligible,
  LABOR_ONLY_AUTO_BOM_V1_DECISION_ID,
  LABOR_ONLY_AUTO_BOM_V1_RULE_ID,
  AUTO_BOM_RULE_LABOR_ONLY_AUTO_BOM_V1,
} from "./labor-only-auto-bom-v1-contract";
export type { LaborOnlyAutoBomV1Result } from "./labor-only-auto-bom-v1-contract";
export { runIkAutoG2Phase } from "./ik-auto-g2-phase";
export type { IkAutoG2PhaseResult } from "./ik-auto-g2-phase";
export {
  runIkAtesdTechnologyPhase,
  buildAtesdLeavesFromOrchestraOfferBoq,
  extractOfferBoqTableCodeTokens,
  IK_ATESD_TECHNOLOGY_PHASE_SEAM_ID,
} from "./ik-atesd-technology-phase";
export type { IkAtesdTechnologyPhaseResult } from "./ik-atesd-technology-phase";

export type {
  ChiefAdvisoryPort,
  IngestMergePort,
  KnrKnowledgePort,
  OncePerKeyPort,
  P2IngestPort,
  P5SettlePort,
  ParentBridgePort,
  PipelineWaitPort,
} from "./orchestra-ports";

export { resolveEffectiveItem } from "./orchestra-ports";
export { computeIkOrchestraSyncSnapshot } from "./ik-orchestra-engine";

export {
  runIkCompoundIdentityPhase,
  deriveOrchestraNextLegalTransaction,
  collectCompoundParentsFromClassification,
  IK_COMPOUND_IDENTITY_PHASE_VERSION,
} from "./ik-compound-identity-phase";
export type {
  IkCompoundIdentityPhaseResult,
  IkCompoundIdentityParentResult,
  RunIkCompoundIdentityPhaseInput,
} from "./ik-compound-identity-phase";
export {
  buildKnrReanalysisSignalFromHostResult,
  buildKnrReanalysisDiag,
  planKnrReanalysisOrchestraInvalidation,
  shouldDeferIkDownstreamUntilKnrKnowledge,
  buildDeferredIdentityBlockedContext,
  resolveKnrVerifyActorFromAdminSession,
} from "./ik-knr-reanalysis-seam";
export type {
  IkKnrReanalysisSignal,
  IkKnrReanalysisTarget,
  IkKnrReanalysisDiag,
} from "./ik-knr-reanalysis-seam";
export { useIkOrchestra } from "./use-ik-orchestra";
export {
  promoteSliceDHitToTrustedTuple,
  P4_TRUST_MATCH_METHOD,
  P4_TRUST_MATCH_CONFIDENCE,
} from "./ik-knr-wc-p4-trust-seam";
export type {
  PromoteSliceDHitToTrustedTupleInput,
  PromoteSliceDHitToTrustedTupleResult,
} from "./ik-knr-wc-p4-trust-seam";
export { buildIkPackageBlockerReport } from "./ik-package-blocker-report";
export type {
  IkPackageBlockerLine,
  IkPackageBlockerReport,
  IkPackageBlockerClassification,
} from "./ik-package-blocker-report";
export { buildIkOwnerActionQueue, listUnresolvedOwnerInputBatch } from "./ik-owner-action-queue";
export type {
  IkOwnerActionDomain,
  IkOwnerActionItem,
  IkOwnerActionQueueReport,
  BuildIkOwnerActionQueueInput,
} from "./ik-owner-action-queue";
export {
  buildG1ManualOverride,
  buildG1RejectKey,
  findLaborLineCandidate,
  findMaterialLineCandidate,
  resolveSuggestedCatalogWorkIdForG1,
  upsertManualOverride,
} from "./ik-owner-gate-actions";
export {
  buildLaborCandidateAcceptFingerprint,
  isLaborAcceptIdempotentNoop,
} from "./ik-owner-gate-labor-idem";
export type { IkIdentityCoverageOpsView } from "./ik-identity-coverage-ops";
export {
  buildOwnerInputRefreshKey,
  materializeIkF5OnPackage,
} from "./ik-f5-package-refresh";
export type { IkF5PackageRefreshResult } from "./ik-f5-package-refresh";
export {
  resolveIkOwnerActionDeepLink,
  focusIkOwnerActionTarget,
  navigateIkOwnerActionTarget,
  IK_OWNER_ACTION_ANCHOR,
} from "./ik-owner-action-deeplink";
export type {
  IkOwnerActionDeepLinkResolution,
  IkOwnerActionDeepLinkContext,
  IkOwnerActionNavigationKind,
  IkOwnerActionNavigateHandlers,
} from "./ik-owner-action-deeplink";
export { buildIkOwnerActionFreshnessKey } from "./ik-owner-action-freshness";

export {
  resolveW3ChiefOrchestraConnect,
  chiefSessionDelegatesIkToOrchestra,
} from "./chief-start-orchestra-connect";
export type {
  IkSequencerAuthority,
  ResolveW3ChiefOrchestraConnectInput,
  W3ChiefOrchestraConnect,
  W3ChiefOrchestraConnectStatus,
} from "./chief-start-orchestra-connect";

export {
  resolveHubAcceptRefreshPhaseKind,
  shouldPreferOrchestraRefreshPhase,
} from "./orchestra-refresh-phase";
export type {
  HubPricingAcceptedMeta,
  IkOrchestraRefreshPhaseKind,
} from "./orchestra-refresh-phase";
