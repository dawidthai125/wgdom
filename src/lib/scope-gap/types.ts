/**
 * Scope Gap MVP — typy (RO). Thin DF: SCOPE-GAP-MVP-THIN-DESIGN-FREEZE-01.
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
  engineVersion: "scope-gap-mvp-1";
  investmentTemplate: ScopeGapInvestmentTemplate;
  warnings: ScopeGapWarning[];
  disclaimerPl: string;
  computedAt: string;
}

/** Scope Gap MVP — tylko odczyt; History peers OUT. */
export interface ScopeGapMvpInput {
  presentTextBlob: string;
  investmentTemplate: ScopeGapInvestmentTemplate;
  hasOfferBoqLines: boolean;
  lineCount: number;
  swzTextBlob: string | null;
  /**
   * Anti-dup ze SMART (kontrakt DF) — Scope nie emituje ostrzeżeń cenowych;
   * pole zachowane dla wire / przyszłego copy; null = brak filtra.
   */
  smartMissingLineIds: string[] | null;
  computedAtIso: string;
}

export const SCOPE_GAP_MVP_DISCLAIMER_PL =
  "Ostrzeżenia luk zakresu — nie zmieniają wyceny ani oferty. To nie jest SMART (brak Quotes) ani AI Quality Score (S7).";

export const SCOPE_GAP_MVP_ENGINE_VERSION = "scope-gap-mvp-1" as const;

export const SCOPE_GAP_MVP_EMPTY_WARNINGS_PL =
  "Brak typowych ostrzeżeń zakresu (MVP)";
