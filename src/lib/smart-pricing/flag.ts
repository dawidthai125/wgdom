/**
 * SMART-PRICING-01 — feature flags P1 + P2 (default OFF).
 * DF-P1-05 · DF-P2-04 · P2 ON ⇒ P1 ON.
 */

import {
  SMART_PRICING_P1_DEFAULT,
  SMART_PRICING_P1_LS_KEY,
  SMART_PRICING_P2_DEFAULT,
  SMART_PRICING_P2_LS_KEY,
} from "@/lib/smart-pricing/constants";

export {
  SMART_PRICING_P1_DEFAULT,
  SMART_PRICING_P1_LS_KEY,
  SMART_PRICING_P2_DEFAULT,
  SMART_PRICING_P2_LS_KEY,
};

let smartPricingP1ForTests: boolean | null = null;
let smartPricingP2ForTests: boolean | null = null;

/** Test-only override P1 (null = LS / default). */
export function forceSmartPricingP1ForTests(on: boolean | null): void {
  smartPricingP1ForTests = on;
}

/** Test-only override P2 (null = LS / default). */
export function forceSmartPricingP2ForTests(on: boolean | null): void {
  smartPricingP2ForTests = on;
}

/**
 * Czy UI/lib P1 (Evidence Quotes · One-shot) jest włączone.
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

/**
 * Czy tor P2 (MS staging Evidence) jest włączony.
 * DF-P2-04: wymaga P1 ON · default OFF.
 */
export function isSmartPricingP2Enabled(): boolean {
  if (!isSmartPricingP1Enabled()) return false;
  if (smartPricingP2ForTests != null) return smartPricingP2ForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(SMART_PRICING_P2_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return SMART_PRICING_P2_DEFAULT;
}
