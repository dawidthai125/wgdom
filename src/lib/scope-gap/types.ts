/**
 * SCOPE-COMPLETENESS-01 Stage A — typy (RO).
 * DF: SCOPE-COMPLETENESS-01-STAGE-A-DESIGN-FREEZE
 * Parent MVP: SCOPE-GAP-MVP-THIN-DESIGN-FREEZE-01
 */

export type ScopeGapInvestmentTemplate =
  | "pustostan_remont"
  | "elewacja"
  | "instalacje"
  | "generic_unknown";

export type ScopeGapSeverity = "info" | "warn" | "high";

export type ScopeGapRuleCode =
  | "WASTE_DISPOSAL"
  | "PREP_WORKS"
  | "PROTECTION"
  | "MEASUREMENTS"
  | "SCAFFOLDING"
  | "TRAFFIC_ORG";

export type ScopeGapEngineVersion = "scope-gap-mvp-1" | "scope-completeness-a1";

export interface ScopeGapWarning {
  id: string;
  code: ScopeGapRuleCode;
  labelPl: string;
  severity: ScopeGapSeverity;
  confidence: number;
  rationalePl: string;
  evidencePresentPl: string;
  sources: Array<"rule" | "swz">;
}

export interface ScopeGapReport {
  available: boolean;
  emptyReasonPl: string | null;
  engineVersion: ScopeGapEngineVersion;
  investmentTemplate: ScopeGapInvestmentTemplate;
  warnings: ScopeGapWarning[];
  disclaimerPl: string;
  computedAt: string;
}

/** Stage A input — RO; smartMissingLineIds REMOVED (DF wariant B). */
export interface ScopeGapMvpInput {
  presentTextBlob: string;
  investmentTemplate: ScopeGapInvestmentTemplate;
  hasOfferBoqLines: boolean;
  lineCount: number;
  swzTextBlob: string | null;
  computedAtIso: string;
}

export const SCOPE_GAP_MVP_DISCLAIMER_PL =
  "Ostrzeżenia luk zakresu — nie zmieniają wyceny ani oferty. To nie jest SMART (brak Quotes) ani AI Quality Score (S7).";

/** @deprecated compat label — prod emit = SCOPE_COMPLETENESS_A1_ENGINE_VERSION */
export const SCOPE_GAP_MVP_ENGINE_VERSION = "scope-gap-mvp-1" as const;

export const SCOPE_COMPLETENESS_A1_ENGINE_VERSION = "scope-completeness-a1" as const;

export const SCOPE_GAP_MVP_EMPTY_WARNINGS_PL =
  "Brak typowych ostrzeżeń zakresu (MVP)";

export const SCOPE_COMPLETENESS_A1_EMPTY_WARNINGS_PL =
  "Brak typowych ostrzeżeń zakresu";

/** Stage A cap (DF) — MVP było 8. */
export const SCOPE_COMPLETENESS_A1_WARNINGS_CAP = 12;

export const SCOPE_GAP_MVP_WARNINGS_CAP = 8;
