/**
 * Validation Expert P0 — typy (LOCKED DF VALIDATION-EXPERT-01).
 * Zero domain calc · zero Expert rewrite · wejście wyłącznie dossier.
 */

export const SOFT_FINDINGS_VALIDATED_MAX = 3 as const;

export type ValidationFindingSeverity = "hard" | "soft";

export type ValidationFindingCategory =
  | "consistency"
  | "qa"
  | "completeness"
  | "risk"
  | "trace_rollup";

export type ValidationFindingSource =
  | "dossier"
  | "execution"
  | "materials"
  | "pricing"
  | "cost"
  | "offer"
  | "cross_chain";

export type ValidationFindingCode =
  | "VAL_C1_MISSING_COST_OR_OFFER"
  | "VAL_C2_REAL_IDENTITY_MISMATCH"
  | "VAL_C3_MISSING_DECYDENT_SIGNAL"
  | "VAL_C4_ME_INCOMPLETE"
  | "VAL_C5_RESIDUAL_RETURN"
  | "VAL_C6_TRACE_NOT_ALIGNED"
  | "VAL_C7_TRACE_MISSING"
  | "VAL_C8_PRIMARY_NOT_IN_SCENARIOS"
  | "VAL_Q1_COMPARATIVE_OUTLIER"
  | "VAL_Q2_LOW_MATERIAL_COVERAGE"
  | "VAL_Q3_PRICE_RISK_CONCENTRATION"
  | "VAL_Q4_LOW_CONFIDENCE_ROLLUP"
  | "VAL_Q5_EXPERT_BLOCKER_ROLLUP"
  | "VAL_Q6_PARTIAL_PURCHASE_IMPACT";

export interface ValidationFindingEvidence {
  path: string;
  expert?: ValidationFindingSource;
  traceField?: string;
  sourceCode?: string;
  values?: Record<string, string | number | boolean | null>;
}

export interface ValidationFinding {
  id: string;
  severity: ValidationFindingSeverity;
  category: ValidationFindingCategory;
  source: ValidationFindingSource;
  code: ValidationFindingCode;
  messagePl: string;
  evidence: ValidationFindingEvidence;
  recommendationPl: string;
}

export type ValidationVerdict = "validated" | "needs_review" | "blocked";

export type ValidationExpertConfidence = "high" | "medium" | "low";

export type ValidationPcrAlignment = "aligned" | "partial" | "not_aligned";

export interface ValidationExpertBlocker {
  code: string;
  messagePl: string;
}

/** Pełny kontrakt Trace — kształt Experts P0. */
export interface ValidationExpertContract {
  co: string;
  dlaczego: string;
  naPodstawieCzego: string;
  pewnosc: ValidationExpertConfidence;
  blokery: ValidationExpertBlocker[];
  zgodnoscZRozumieniemWykonania: ValidationPcrAlignment;
  zgodnoscOpisPl: string;
}

export interface ValidationReport {
  summaryPl: string;
  checksRun: ValidationFindingCode[];
  hardCount: number;
  softCount: number;
  softLimit: number;
  chainCoverage: {
    execution: boolean;
    materials: boolean;
    pricing: boolean;
    cost: boolean;
    offer: boolean;
  };
  notesPl: string[];
}

export interface ValidationExpertAnalysisResult {
  contract: ValidationExpertContract;
  findings: ValidationFinding[];
  hardFindings: ValidationFinding[];
  softFindings: ValidationFinding[];
  report: ValidationReport;
  verdict: ValidationVerdict;
}

/** Wynik częściowy reguł (consistency / QA). */
export interface ValidationRulePass {
  findings: ValidationFinding[];
  checksRun: ValidationFindingCode[];
}
