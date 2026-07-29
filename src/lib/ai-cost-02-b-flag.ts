/**
 * AI-COST-02-B — Feature flag Explain + Queue (UI only).
 * DF: default OFF · LS `kw-ai-cost-02-b-explain-queue` · izolacja od wyceny/Bid/GAP-A.
 */

export const AI_COST_02_B_EXPLAIN_QUEUE_DEFAULT = false;

export const AI_COST_02_B_EXPLAIN_QUEUE_LS_KEY = "kw-ai-cost-02-b-explain-queue";

/** Alias nazwy z DF. */
export const AI_COST_02_B_EXPLAIN_QUEUE = AI_COST_02_B_EXPLAIN_QUEUE_DEFAULT;

let aiCost02bExplainQueueForTests: boolean | null = null;

/** Test-only override (null = użyj LS / default). */
export function forceAiCost02bExplainQueueForTests(on: boolean | null): void {
  aiCost02bExplainQueueForTests = on;
}

/**
 * Czy UI Explain enrichment + Queue 02-B jest włączone.
 * OFF ⇒ tip parity (brak bloków 02-B). Nie zmienia S4/S6/Bid.
 */
export function isAiCost02bExplainQueueEnabled(): boolean {
  if (aiCost02bExplainQueueForTests != null) return aiCost02bExplainQueueForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(AI_COST_02_B_EXPLAIN_QUEUE_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return AI_COST_02_B_EXPLAIN_QUEUE_DEFAULT;
}
