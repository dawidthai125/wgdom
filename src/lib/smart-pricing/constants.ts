/**
 * SMART-PRICING-01 — stałe Detect (DF O-SP-F).
 * Konfiguracja biznesowa zamrożona w DF — nie hardcode w UI.
 */

/** Min confidence „użyteczna cena” (Detect). */
export const SMART_PRICING_MIN_CONFIDENCE = 0.5;

/** Max wiek Quotes (dni) — starsze = brak (Detect). */
export const SMART_PRICING_STALE_DAYS = 180;

export const SMART_PRICING_MS_PER_DAY = 24 * 60 * 60 * 1000;
