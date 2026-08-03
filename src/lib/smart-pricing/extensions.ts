/**
 * SMART-PRICING-01 — punkty rozszerzeń P1–P3.
 * P1: Evidence + One-shot available · P2/P3 nadal false.
 */

import type { SmartPricingExtensionPoint } from "@/lib/smart-pricing/types";

export const SMART_PRICING_EXTENSIONS: readonly SmartPricingExtensionPoint[] = [
  {
    phase: "P1_evidence",
    available: true,
    notePl: "P1 — Price Evidence + Resolution + Confidence + Odrzuć.",
  },
  {
    phase: "P1_one_shot",
    available: true,
    notePl: "P1 — overlay sesji wyceny · zero zapisu Quotes · zero LS.",
  },
  {
    phase: "P2_ms_staging",
    available: true,
    notePl: "P2 — odczyt RO MARKET-SYNC staging → Evidence · merge · Rank B1.",
  },
  {
    phase: "P3_save",
    available: false,
    notePl: "P3 — Save wyłącznie przez istniejący commit Quotes (MS P1 path) + Kill Switch.",
  },
] as const;

export function isSmartPricingExtensionAvailable(
  phase: SmartPricingExtensionPoint["phase"],
): boolean {
  const hit = SMART_PRICING_EXTENSIONS.find((e) => e.phase === phase);
  return hit?.available === true;
}
