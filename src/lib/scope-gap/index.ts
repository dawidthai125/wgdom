/**
 * Scope Gap MVP — public API (RO).
 */

export {
  SCOPE_GAP_MVP_DISCLAIMER_PL,
  SCOPE_GAP_MVP_EMPTY_WARNINGS_PL,
  SCOPE_GAP_MVP_ENGINE_VERSION,
  type ScopeGapInvestmentTemplate,
  type ScopeGapMvpInput,
  type ScopeGapReport,
  type ScopeGapRuleCode,
  type ScopeGapSeverity,
  type ScopeGapWarning,
} from "./types";

export { buildScopeGapReport } from "./build-scope-gap-report";

export {
  SCOPE_GAP_MVP,
  SCOPE_GAP_MVP_DEFAULT,
  SCOPE_GAP_MVP_LS_KEY,
  forceScopeGapMvpForTests,
  isScopeGapMvpEnabled,
  shouldRenderScopeGapPanel,
} from "./flag";

export {
  SCOPE_GAP_LABEL_PL,
  SCOPE_GAP_PRESENT_TOKENS,
  expectedCodesForTemplate,
  isCodePresentInBlob,
  normalizeScopeGapText,
  resolveInvestmentTemplate,
} from "./rules-mvp-1";

export {
  buildPresentTextBlob,
  buildScopeGapMvpInput,
  buildSwzTextBlob,
  smartMissingLineIdsFromDetect,
} from "./collect-mvp-input";
