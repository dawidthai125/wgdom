/**
 * SMART-PRICING-01 P2 — Merge Evidence (pure · deterministic · memory only).
 * DF-P2-01: nie mutuje wejść · wynik tylko w pamięci.
 */

import type { SmartPricingPriceEvidence } from "@/lib/smart-pricing/types";

/**
 * Scala Quotes Evidence + Staging Evidence.
 * - Pure · deterministic (sort id ASC w ramach konkatenacji przed Rank)
 * - Nie mutuje tablic wejściowych ani elementów
 * - Memory only — brak I/O
 */
export function mergeSmartPricingEvidence(
  quotesEvidence: readonly SmartPricingPriceEvidence[],
  stagingEvidence: readonly SmartPricingPriceEvidence[],
): SmartPricingPriceEvidence[] {
  const quotes = quotesEvidence.slice();
  const staging = stagingEvidence.slice();
  // Deterministic concat order: Quotes block, then staging block (Rank B1 dopina kolejność).
  // Within each block preserve relative order; stable id tie-break for identical ids.
  const byId = new Map<string, SmartPricingPriceEvidence>();
  for (const ev of quotes) {
    if (ev.source !== "product_quotes") continue;
    byId.set(ev.id, ev);
  }
  for (const ev of staging) {
    if (ev.source !== "market_sync_staging") continue;
    if (!byId.has(ev.id)) byId.set(ev.id, ev);
  }
  return Array.from(byId.values()).sort((a, b) => {
    if (a.source !== b.source) {
      return a.source === "product_quotes" ? -1 : 1;
    }
    return a.id.localeCompare(b.id);
  });
}
