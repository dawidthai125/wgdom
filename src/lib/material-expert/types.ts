/**
 * Ekspert Materiałów — typy kompetencji (P0).
 * Zero cen · wejście z Eksperta Wykonania.
 */

/** Pewność (Transparent Reasoning). */
export type MaterialExpertConfidence = "high" | "medium" | "low";

/** Zgodność z rozumieniem wykonania. */
export type MaterialPcrAlignment = "aligned" | "partial" | "not_aligned";

export type MaterialConformityStatus = "zgodny" | "niezgodny" | "niepewny";

export type MaterialGapKind =
  | "tech_missing"
  | "boq_missing"
  | "incompatible"
  | "availability_risk";

export type MaterialVariantKind =
  | "rekomendowany"
  | "ekonomiczny"
  | "premium"
  | "ograniczona_dostepnosc";

export interface MaterialExpertBlocker {
  code: string;
  messagePl: string;
  kind?: MaterialGapKind;
  materialKey?: string;
}

export interface MaterialLineAssessment {
  materialKey: string;
  namePl: string;
  unit: string;
  quantity: number;
  conformity: MaterialConformityStatus;
  notePl?: string;
}

export interface MaterialGapOrRisk {
  kind: MaterialGapKind;
  code: string;
  messagePl: string;
  materialKey?: string;
}

export interface MaterialVariantOption {
  kind: MaterialVariantKind;
  materialKey: string;
  namePl: string;
  rationalePl: string;
}

export interface MaterialVariantSet {
  baseMaterialKey: string;
  baseNamePl: string;
  options: MaterialVariantOption[];
}

export type MaterialSystemCompleteness = "kompletny" | "czesciowy" | "niekompletny";

/** Pełny kontrakt Eksperta Materiałów. */
export interface MaterialExpertContract {
  co: string;
  dlaczego: string;
  naPodstawieCzego: string;
  pewnosc: MaterialExpertConfidence;
  blokery: MaterialExpertBlocker[];
  zgodnoscZRozumieniemWykonania: MaterialPcrAlignment;
  zgodnoscOpisPl: string;
}

export interface MaterialExpertAnalysisResult {
  contract: MaterialExpertContract;
  lines: MaterialLineAssessment[];
  gapsAndRisks: MaterialGapOrRisk[];
  variants: MaterialVariantSet[];
  completeness: MaterialSystemCompleteness;
  completenessNotePl: string;
  /** Ile pozycji Pack.materials pokrytych zgodnym BOM. */
  packMaterialCoverage: { required: number; present: number; conforming: number };
}
