/**
 * SMART-PRICING-01 P1 — feature flag (default OFF).
 * DF-P1-05 · LS `kw-smart-pricing-01-p1` · OFF ⇒ parity P0 only.
 */

import {
  SMART_PRICING_P1_DEFAULT,
  SMART_PRICING_P1_LS_KEY,
} from "@/lib/smart-pricing/constants";

export { SMART_PRICING_P1_DEFAULT, SMART_PRICING_P1_LS_KEY };

let smartPricingP1ForTests: boolean | null = null;

/** Test-only override (null = LS / default). */
export function forceSmartPricingP1ForTests(on: boolean | null): void {
  smartPricingP1ForTests = on;
}

/**
 * Czy UI/lib P1 (Evidence · One-shot) jest włączone.
 * OFF ⇒ Detect P0 only.
 */
export function isSmartPricingP1Enabled(): boolean {
  if (smartPricingP1ForTests != null) return smartPricingP1ForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(SMART_PRICING_P1_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return SMART_PRICING_P1_DEFAULT;
}
