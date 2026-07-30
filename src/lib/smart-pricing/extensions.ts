/**
 * SMART-PRICING-01 — punkty rozszerzeń P1–P3 (P0: tylko kontrakt).
 * Zakaz wywołań z UI P0 — zapobiega przypadkowemu Evidence/One-shot/Save/MS.
 */

import type { SmartPricingExtensionPoint } from "@/lib/smart-pricing/types";

export const SMART_PRICING_EXTENSIONS: readonly SmartPricingExtensionPoint[] = [
  {
    phase: "P1_evidence",
    available: false,
    notePl: "P1 — Price Evidence + Resolution + Confidence + One-shot (po Owner GO P1).",
  },
  {
    phase: "P1_one_shot",
    available: false,
    notePl: "P1 — overlay sesji wyceny · zero zapisu Quotes.",
  },
  {
    phase: "P2_ms_staging",
    available: false,
    notePl: "P2 — odczyt RO MARKET-SYNC staging (nie ownership Publish).",
  },
  {
    phase: "P3_save",
    available: false,
    notePl: "P3 — Save wyłącznie przez istniejący commit Quotes (MS P1 path) + Kill Switch.",
  },
] as const;

/** P0: zawsze false — brak Evidence/One-shot/Save/MS. */
export function isSmartPricingExtensionAvailable(
  phase: SmartPricingExtensionPoint["phase"],
): boolean {
  const hit = SMART_PRICING_EXTENSIONS.find((e) => e.phase === phase);
  return hit?.available === true;
}
