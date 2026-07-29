/**
 * WORK-CATALOG-P3.3 — Feature flag Market Pricing UX (S4–S5 UI only).
 * DF: default OFF · LS `kw-wc-p33-market-pricing-ux` · nie owija S1–S3.
 */

export const WC_P33_MARKET_PRICING_UX_DEFAULT = false;

export const WC_P33_MARKET_PRICING_UX_LS_KEY = "kw-wc-p33-market-pricing-ux";

/** Alias nazwy z DF. */
export const WC_P33_MARKET_PRICING_UX = WC_P33_MARKET_PRICING_UX_DEFAULT;

let wcP33MarketPricingUxForTests: boolean | null = null;

/** Test-only override (null = użyj LS / default). */
export function forceWcP33MarketPricingUxForTests(on: boolean | null): void {
  wcP33MarketPricingUxForTests = on;
}

/**
 * Czy UI import CSV+commit oraz coverage P3.3 jest włączone.
 * OFF ⇒ tip parity (brak entry/coverage). Nie chowa porównania S1–S3.
 */
export function isWcP33MarketPricingUxEnabled(): boolean {
  if (wcP33MarketPricingUxForTests != null) return wcP33MarketPricingUxForTests;
  if (typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(WC_P33_MARKET_PRICING_UX_LS_KEY);
      if (raw === "1") return true;
      if (raw === "0") return false;
    } catch {
      /* private mode */
    }
  }
  return WC_P33_MARKET_PRICING_UX_DEFAULT;
}
