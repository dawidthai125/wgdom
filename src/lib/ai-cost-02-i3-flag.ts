/**
 * AI-COST-02-I3 — Feature flag Competitiveness RO (UI extension of 02-B Explain).
 * DF: default OFF · LS `kw-ai-cost-02-i3-competitiveness` · izolacja od wyceny/Bid/Quotes.
 */

export const AI_COST_02_I3_COMPETITIVENESS_DEFAULT = false;

export const AI_COST_02_I3_COMPETITIVENESS_LS_KEY = "kw-ai-cost-02-i3-competitiveness";

/** Alias nazwy z DF. */
export const AI_COST_02_I3_COMPETITIVENESS = AI_COST_02_I3_COMPETITIVENESS_DEFAULT;

let aiCost02I3CompetitivenessForTests: boolean | null = null;

/** Test-only override (null = użyj LS / default). */
export function forceAiCost02I3CompetitivenessForTests(on: boolean | null): void {
  aiCost02I3CompetitivenessForTests = on;
}

/**
 * Czy UI/logika flaga I3 jest włączona (LS / test).
 * UI montuje I3 dopiero przy I3 ON ∧ 02-B Explain ON (kontrakt UI DF §7.2).
 */
export function isAiCost02I3CompetitivenessEnabled(): boolean {
  if (aiCost02I3CompetitivenessForTests != null) return aiCost02I3CompetitivenessForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(AI_COST_02_I3_COMPETITIVENESS_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return AI_COST_02_I3_COMPETITIVENESS_DEFAULT;
}
