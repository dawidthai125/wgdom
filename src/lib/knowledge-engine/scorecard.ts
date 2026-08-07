/**
 * KE-E1 — Source Scorecard (DF §5). Pure.
 */

import {
  KE_SCORE_WEIGHTS,
  type KnowledgeCandidate,
  type KnowledgeConfidenceLevel,
  type KnowledgeFreshness,
  type KnowledgeScorecard,
} from "./types";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

export function confidenceTo01(level: KnowledgeConfidenceLevel): number {
  if (level === "high") return 0.9;
  if (level === "medium") return 0.6;
  return 0.3;
}

export function freshnessTo01(f: KnowledgeFreshness): number {
  if (f === "fresh") return 1;
  if (f === "ok") return 0.7;
  if (f === "stale") return 0.25;
  return 0.35; // missing — neutral-low (nie karz legacy CK bez asOf)
}

/** nScore: 0 przy 0, ~0.5 przy N_min, →1 przy N_sole. */
export function nTo01(n: number, nMin: number, nSole: number): number {
  if (!(n > 0)) return 0;
  if (n >= nSole) return 1;
  if (n >= nMin) return 0.5 + 0.5 * ((n - nMin) / Math.max(1, nSole - nMin));
  return 0.5 * (n / nMin);
}

/** variance: 0 = ideal, 1 = bardzo rozproszone; score = 1 - clamp(v). */
export function varianceTo01(variance: number | null | undefined): number {
  if (variance == null || !Number.isFinite(variance)) return 0.7; // unknown → neutral
  return clamp01(1 - Math.abs(variance));
}

/**
 * Agreement vs peer price (np. Market): |a-b|/b.
 * Brak peera → 0.5 neutral.
 */
export function agreementTo01(
  price: number,
  peerPrice: number | null | undefined,
): number {
  if (peerPrice == null || !(peerPrice > 0) || !(price > 0)) return 0.5;
  const rel = Math.abs(price - peerPrice) / peerPrice;
  if (rel <= 0.1) return 1;
  if (rel <= 0.25) return 0.75;
  if (rel <= 0.35) return 0.5;
  if (rel <= 0.5) return 0.3;
  return 0.1;
}

export function levelFromTotal(total: number): KnowledgeConfidenceLevel {
  if (total >= 0.75) return "high";
  if (total >= 0.5) return "medium";
  return "low";
}

export function buildScorecard(
  c: KnowledgeCandidate,
  opts: {
    nMin: number;
    nSole: number;
    peerMarketPrice?: number | null;
  },
): KnowledgeScorecard {
  const confidence = confidenceTo01(c.confidence);
  const freshness = freshnessTo01(c.freshness);
  const n = nTo01(c.n, opts.nMin, opts.nSole);
  const variance = varianceTo01(c.variance);
  const agreement = agreementTo01(c.unitPricePln, opts.peerMarketPrice);
  const totalScore = clamp01(
    KE_SCORE_WEIGHTS.confidence * confidence +
      KE_SCORE_WEIGHTS.freshness * freshness +
      KE_SCORE_WEIGHTS.n * n +
      KE_SCORE_WEIGHTS.variance * variance +
      KE_SCORE_WEIGHTS.agreement * agreement,
  );
  return {
    confidence,
    freshness,
    n,
    variance,
    agreement,
    totalScore,
    level: levelFromTotal(totalScore),
  };
}
