/**
 * Ekspert Wykonania — kontrakt kompetencji domenowej (P0).
 * Technology Foundation = narzędzie wewnętrzne (bez cen).
 */

import type {
  ExecutionPlan,
  GeneratedBom,
  GeneratedWorkBundle,
  TechnologyDecisionKind,
  TechnologyPack,
} from "@/lib/technology-foundation";

/** Pewność kompetencji (Transparent Reasoning). */
export type ExecutionExpertConfidence = "high" | "medium" | "low";

/** Zgodność z rozumieniem wykonania (PCR Alignment — bez persony PCR). */
export type ExecutionPcrAlignment = "aligned" | "partial" | "not_aligned";

export type ExecutionGapKind = "hidden_work" | "missing_in_boq" | "uncovered_boq_line" | "execution_risk";

export interface ExecutionExpertBlocker {
  code: string;
  messagePl: string;
  kind?: ExecutionGapKind;
}

export interface ExecutionGapOrRisk {
  kind: ExecutionGapKind;
  code: string;
  messagePl: string;
  relatedStepId?: string;
  relatedLineId?: string;
  relatedCatalogWorkId?: string;
}

/** Pełny kontrakt Eksperta Wykonania (P0.2). */
export interface ExecutionExpertContract {
  /** Co */
  co: string;
  /** Dlaczego */
  dlaczego: string;
  /** Na podstawie czego */
  naPodstawieCzego: string;
  /** Pewność */
  pewnosc: ExecutionExpertConfidence;
  /** Blokery */
  blokery: ExecutionExpertBlocker[];
  /** Zgodność z rozumieniem wykonania */
  zgodnoscZRozumieniemWykonania: ExecutionPcrAlignment;
  zgodnoscOpisPl: string;
}

export interface ExecutionPackSelection {
  packId: string;
  packVersion: string;
  namePl: string;
  score: number;
  matchReasonsPl: string[];
  matchedLineIds: string[];
}

export interface ExecutionExpertAnalysisResult {
  contract: ExecutionExpertContract;
  selection: ExecutionPackSelection | null;
  /** Wyniki wewnętrzne TF — bez cen. */
  technologyDecision: TechnologyDecisionKind | null;
  plan: ExecutionPlan | null;
  bundle: GeneratedWorkBundle | null;
  bom: GeneratedBom | null;
  gapsAndRisks: ExecutionGapOrRisk[];
  /** Pack użyty (referencja odczytowa). */
  pack: TechnologyPack | null;
}

/** Minimalny profil firmy do walidacji biznesowej TF (REUSE BusinessProfileFixture). */
export interface ExecutionExpertBusinessProfile {
  companyCapabilityIds: string[];
  availableEquipmentKeys: string[];
  orgConstraintCodes?: string[];
}
