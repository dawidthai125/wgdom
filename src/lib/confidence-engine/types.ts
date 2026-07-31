/**
 * Confidence MVP — typy (RO). Thin DF: CONFIDENCE-MVP-THIN-DESIGN-FREEZE-01.
 */

export type ConfidenceBand = "low" | "medium" | "high";

/** Score 0–100 (integer). */
export type ConfidenceScore = number;

export interface ConfidenceDriver {
  id: string;
  labelPl: string;
  /** Udział w score po wadze, ze znakiem (ujemny = obniża). */
  impact: number;
  evidencePl: string;
}

export interface ConfidenceReport {
  available: boolean;
  emptyReasonPl: string | null;
  score0to100: ConfidenceScore;
  band: ConfidenceBand;
  drivers: ConfidenceDriver[];
  disclaimerPl: string;
  formulaVersion: "confidence-mvp-1";
  computedAt: string;
  /** Debug / OV — nie musi być w UI. */
  factorsUsed: string[];
}

/** Model prezentacji badge (UI). */
export interface ConfidenceBadgeModel {
  labelPl: string;
  scoreDisplay: string;
  band: ConfidenceBand;
  bandLabelPl: string;
  titleAttr: string;
  formulaVersion: "confidence-mvp-1";
}

/** Confidence MVP — tylko odczyt; brak History/Scope. */
export interface ConfidenceMvpInput {
  lineCount: number;
  mappedCount: number;
  /** Linie z priceOrigin.kind === controlled_market (jak TV-01). */
  quotesPricedCount: number;
  /** S7 — cytat, nie przeliczamy. */
  s7QualityScore: number | null;
  /** averageConfidence OfferBoq → high=100, medium=60, low=25; null = pomiń czynnik. */
  averagePricingConfidence: "high" | "medium" | "low" | null;
  /** SMART Detect — null = pomiń czynnik (renormalizacja). */
  smartMissingCount: number | null;
  smartMissingUnmappedCount: number | null;
  /** Bid */
  bidOk: boolean | null;
  bidWarningCount: number | null;
  /** Docs: true jeśli jest przedmiar/snapshot OK; SWZ osobno. */
  hasKosztorysSnapshot: boolean;
  hasSwzSignal: boolean;
  computedAtIso: string;
}

export const CONFIDENCE_MVP_DISCLAIMER_PL =
  "Ocena wiarygodności całej analizy — nie zmienia wyceny ani oferty. To nie jest „AI Quality Score” gotowości kosztorysu (S7).";

export const CONFIDENCE_MVP_FORMULA_VERSION = "confidence-mvp-1" as const;
