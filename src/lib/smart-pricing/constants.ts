/**
 * SMART-PRICING-01 — stałe Detect (O-SP-F) + P1 rank/confidence/flag.
 */

/** Min confidence „użyteczna cena” (Detect). */
export const SMART_PRICING_MIN_CONFIDENCE = 0.5;

/** Max wiek Quotes (dni) — starsze = brak (Detect). */
export const SMART_PRICING_STALE_DAYS = 180;

export const SMART_PRICING_MS_PER_DAY = 24 * 60 * 60 * 1000;

/** DF O-SP-G — domyślna kolejność providerów. */
export const SMART_PRICING_DEFAULT_PROVIDER_RANK: readonly string[] = [
  "wgdom",
  "leroy",
  "castorama",
  "kb_pl",
  "interbud",
  "sekocenbud",
] as const;

/** Feature flag P1 — default OFF (DF-P1-05). */
export const SMART_PRICING_P1_LS_KEY = "kw-smart-pricing-01-p1";
export const SMART_PRICING_P1_DEFAULT = false;

/** Confidence thresholds (DF epicki §6). */
export const SMART_PRICING_CONF_READY_STRONG = 0.85;
export const SMART_PRICING_CONF_READY = 0.75;
export const SMART_PRICING_CONF_REVIEW = 0.6;
