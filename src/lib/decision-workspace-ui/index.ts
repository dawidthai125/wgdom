/**
 * DECISION-WORKSPACE-01 — public API (presentational + validation cache).
 */

export {
  DECISION_WORKSPACE_DEFAULT,
  DECISION_WORKSPACE_LS_KEY,
  forceDecisionWorkspaceForTests,
  isDecisionWorkspaceEnabled,
} from "./flag";

export {
  BID_PLN_SOURCE_BADGE_PL,
  COST_OFFERBOQ_DIRECT_BADGE_PL,
  DECISION_WORKSPACE_SUBTITLE_PL,
  DECISION_WORKSPACE_TITLE_PL,
  OFFER_BID_MISMATCH_BADGE_PL,
  OFFER_PLN_SOURCE_BADGE_PL,
  TRE01_NOTE_PL,
  businessDecisionChipPl,
  labelActionPl,
  labelProcessStatusPl,
  labelVerdictPl,
} from "./labels";

export type {
  BuildDecisionWorkspaceViewModelInput,
} from "./view-model";
export { buildDecisionWorkspaceViewModel } from "./view-model";

export type {
  DecydentActionId,
  DecydentLocalDecision,
  DecisionChainCoverageView,
  DecisionFindingRowView,
  DecisionWorkspaceUiPhase,
  DecisionWorkspaceViewModel,
} from "./types";

export {
  buildValidationCacheKey,
  clearValidationCache,
  dropValidationCacheForCase,
  getValidationAnalyzeCallCountForTests,
  resetValidationCacheForTests,
  resolveValidationForDossier,
} from "./validation-cache";
