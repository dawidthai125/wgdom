/**
 * SMART-PRICING-01 P1 — One-shot overlay (session only).
 * DF-P1-01: ZERO LocalStorage · ZERO Cloud · ZERO Quotes write.
 */

import type {
  SmartPricingOneShotOverlay,
  SmartPricingPriceEvidence,
} from "@/lib/smart-pricing/types";

export interface CreateOneShotOptions {
  lineId: string;
  tenderId?: string | null;
  evidence: SmartPricingPriceEvidence;
  appliedAtIso: string;
  /**
   * MANUAL ⇒ wymaga explicitSelection=true (DF §4.3).
   */
  confidence: "READY" | "REVIEW" | "MANUAL";
  explicitSelection?: boolean;
}

/**
 * Tworzy overlay w pamięci. Pure — nie zapisuje LS/Cloud/Quotes.
 * Zwraca null gdy MANUAL bez jawnego wyboru Evidence.
 */
export function createOneShotOverlay(
  opts: CreateOneShotOptions,
): SmartPricingOneShotOverlay | null {
  if (opts.confidence === "MANUAL" && !opts.explicitSelection) {
    return null;
  }
  const ev = opts.evidence;
  if (!(ev.price > 0) || ev.source !== "product_quotes") {
    return null;
  }
  return {
    lineId: opts.lineId,
    tenderId: opts.tenderId ?? null,
    evidenceId: ev.id,
    price: ev.price,
    currency: "PLN",
    provider: ev.provider,
    appliedAtIso: opts.appliedAtIso,
  };
}

/** Usuń overlay dla linii (session map helper — pure). */
export function clearOneShotForLine(
  map: Readonly<Record<string, SmartPricingOneShotOverlay>>,
  lineId: string,
): Record<string, SmartPricingOneShotOverlay> {
  if (!(lineId in map)) return { ...map };
  const next = { ...map };
  delete next[lineId];
  return next;
}
