/**
 * Validation Expert — public API (P0).
 * Pure-lib QA na ChiefDecydentDossier.
 */

export type {
  ValidationExpertAnalysisResult,
  ValidationExpertBlocker,
  ValidationExpertConfidence,
  ValidationExpertContract,
  ValidationFinding,
  ValidationFindingCategory,
  ValidationFindingCode,
  ValidationFindingEvidence,
  ValidationFindingSeverity,
  ValidationFindingSource,
  ValidationPcrAlignment,
  ValidationReport,
  ValidationRulePass,
  ValidationVerdict,
} from "./types";

export { SOFT_FINDINGS_VALIDATED_MAX } from "./types";

export { analyzeValidationFromDossier } from "./analyze";

export {
  buildFinding,
  dedupeFindings,
  filterHard,
  filterSoft,
  mergeChecksRun,
  sortFindings,
} from "./findings";

export { runConsistencyChecks } from "./consistency";
export { runQaRules } from "./qa-rules";
export { buildSummaryPl, computeVerdict } from "./verdict";
export { buildValidationContract } from "./trace";
