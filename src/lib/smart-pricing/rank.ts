/**
 * SMART-PRICING-01 P1 — Rank Evidence (sort only).
 * DF-P1-04 · nie mutuje payloadu źródła · O-SP-G default.
 */

import { SMART_PRICING_DEFAULT_PROVIDER_RANK } from "@/lib/smart-pricing/constants";
import type { SmartPricingPriceEvidence } from "@/lib/smart-pricing/types";

export interface RankEvidenceOptions {
  /** Kolejność providerów (domyślnie O-SP-G). */
  providerRank?: readonly string[];
  /**
   * Preferowany dostawca przy near-tie (O-SP-I) — tylko reorder prezentacji.
   * Δ ≤ 3% lub ≤ 0.50 PLN.
   */
  preferredProvider?: string | null;
}

function providerRankIndex(provider: string, rank: readonly string[]): number {
  const i = rank.indexOf(provider);
  return i >= 0 ? i : rank.length + provider.localeCompare("zzzz", "pl");
}

function nearTie(a: SmartPricingPriceEvidence, b: SmartPricingPriceEvidence): boolean {
  const pa = a.price;
  const pb = b.price;
  if (!(pa > 0 && pb > 0)) return false;
  const abs = Math.abs(pa - pb);
  if (abs <= 0.5) return true;
  const rel = abs / Math.max(pa, pb);
  return rel <= 0.03;
}

/**
 * Zwraca **nową** tablicę posortowaną — elementy Evidence bez mutacji pól.
 */
export function rankEvidence(
  evidence: readonly SmartPricingPriceEvidence[],
  opts: RankEvidenceOptions = {},
): SmartPricingPriceEvidence[] {
  const providerRank = opts.providerRank ?? SMART_PRICING_DEFAULT_PROVIDER_RANK;
  const preferred = opts.preferredProvider?.trim() || null;

  const sorted = evidence.slice().sort((a, b) => {
    const ra = providerRankIndex(a.provider, providerRank);
    const rb = providerRankIndex(b.provider, providerRank);
    if (ra !== rb) return ra - rb;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    const ta = a.acquiredAt || "";
    const tb = b.acquiredAt || "";
    if (ta !== tb) return tb.localeCompare(ta);
    return a.id.localeCompare(b.id);
  });

  if (
    preferred &&
    sorted.length >= 2 &&
    nearTie(sorted[0]!, sorted[1]!) &&
    sorted[1]!.provider === preferred &&
    sorted[0]!.provider !== preferred
  ) {
    const next = sorted.slice();
    const tmp = next[0]!;
    next[0] = next[1]!;
    next[1] = tmp;
    return next;
  }

  return sorted;
}
