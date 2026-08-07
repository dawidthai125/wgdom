/**
 * SCOPE-COMPLETENESS-01 Stage A — public API (RO).
 * Feature flag REUSE kw-scope-gap-mvp · engine prod = scope-completeness-a1.
 */

export {
  SCOPE_COMPLETENESS_A1_EMPTY_WARNINGS_PL,
  SCOPE_COMPLETENESS_A1_ENGINE_VERSION,
  SCOPE_COMPLETENESS_A1_WARNINGS_CAP,
  SCOPE_GAP_MVP_DISCLAIMER_PL,
  SCOPE_GAP_MVP_EMPTY_WARNINGS_PL,
  SCOPE_GAP_MVP_ENGINE_VERSION,
  SCOPE_GAP_MVP_WARNINGS_CAP,
  type ScopeGapEngineVersion,
  type ScopeGapInvestmentTemplate,
  type ScopeGapMvpInput,
  type ScopeGapReport,
  type ScopeGapRuleCode,
  type ScopeGapSeverity,
  type ScopeGapWarning,
} from "./types";

export { buildScopeGapReport, buildScopeGapReportMvp1 } from "./build-scope-gap-report";

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
  SCOPE_GAP_A1_LABEL_PL,
  SCOPE_GAP_A1_PRESENT_TOKENS,
  expectedCodesForTemplateA1,
  isCodePresentInBlobA1,
} from "./rules-a1";

export {
  buildPresentTextBlob,
  buildScopeGapMvpInput,
  buildSwzTextBlob,
} from "./collect-mvp-input";
