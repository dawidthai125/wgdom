/**
 * P3.1 — silnik średniej rynkowej z fallbackiem regionalnym (pure).
 */

import {
  DEFAULT_MARKET_START_REGION,
  marketRegionFallbackChain,
  type MarketRegionCode,
} from "@/lib/work-catalog/market-regions";
import {
  MARKET_LEGACY_SEED_ORIGIN_ID,
  MARKET_MIN_CONFIDENCE_DEFAULT,
  MARKET_ORIGIN_IDS,
  roundMarketPricePln,
  type MarketOriginId,
  type MarketSourceSnapshot,
  type WorkMarketQuotes,
} from "@/lib/work-catalog/market-sources";
import type { CatalogWork } from "@/lib/work-catalog/types";

export type MarketAverageStrategy = "confidence_weighted";

export interface MarketResolutionContext {
  startRegionCode: MarketRegionCode;
}

export interface MarketSourceEngineConfig {
  enabledOrigins: readonly MarketOriginId[];
  minConfidence: number;
}

export interface ResolvedMarketQuote {
  origin: MarketOriginId;
  snapshot: MarketSourceSnapshot;
  resolvedRegionCode: MarketRegionCode;
  fallbackUsed: boolean;
}

export interface MarketAverageResult {
  pricePln: number | null;
  originCount: number;
  resolvedQuotes: ResolvedMarketQuote[];
  fallbackUsed: boolean;
  dominantRegionCode: MarketRegionCode | null;
  strategy: MarketAverageStrategy;
  computedAt: string;
  unavailable: boolean;
  legacyFallbackUsed: boolean;
}

export const DEFAULT_MARKET_RESOLUTION_CONTEXT: MarketResolutionContext = {
  startRegionCode: DEFAULT_MARKET_START_REGION,
};

export const DEFAULT_MARKET_SOURCE_ENGINE_CONFIG: MarketSourceEngineConfig = {
  enabledOrigins: MARKET_ORIGIN_IDS,
  minConfidence: MARKET_MIN_CONFIDENCE_DEFAULT,
};

export function defaultMarketResolutionContext(): MarketResolutionContext {
  return { ...DEFAULT_MARKET_RESOLUTION_CONTEXT };
}

export function defaultMarketSourceEngineConfig(): MarketSourceEngineConfig {
  return {
    enabledOrigins: [...DEFAULT_MARKET_SOURCE_ENGINE_CONFIG.enabledOrigins],
    minConfidence: DEFAULT_MARKET_SOURCE_ENGINE_CONFIG.minConfidence,
  };
}

export function isMarketSnapshotEligible(
  snapshot: MarketSourceSnapshot,
  minConfidence: number,
): boolean {
  return (
    Number.isFinite(snapshot.price)
    && snapshot.price > 0
    && Number.isFinite(snapshot.confidence)
    && snapshot.confidence >= minConfidence
  );
}

export function resolveOriginMarketQuote(
  quotes: WorkMarketQuotes | undefined,
  origin: MarketOriginId,
  chain: readonly MarketRegionCode[],
  minConfidence: number,
  startRegionCode: MarketRegionCode,
): ResolvedMarketQuote | null {
  const perOrigin = quotes?.[origin];
  if (!perOrigin) return null;

  for (const regionCode of chain) {
    const snapshot = perOrigin[regionCode];
    if (!snapshot || !isMarketSnapshotEligible(snapshot, minConfidence)) continue;

    return {
      origin,
      snapshot,
      resolvedRegionCode: regionCode,
      fallbackUsed: regionCode !== startRegionCode,
    };
  }

  return null;
}

export function computeConfidenceWeightedAverage(
  resolved: readonly ResolvedMarketQuote[],
): number | null {
  if (resolved.length === 0) return null;

  let weightedSum = 0;
  let weightTotal = 0;

  for (const entry of resolved) {
    const weight = entry.snapshot.confidence;
    if (weight <= 0) continue;
    weightedSum += entry.snapshot.price * weight;
    weightTotal += weight;
  }

  if (weightTotal <= 0) return null;
  return roundMarketPricePln(weightedSum / weightTotal);
}

export function pickDominantRegionCode(
  resolved: readonly ResolvedMarketQuote[],
): MarketRegionCode | null {
  if (resolved.length === 0) return null;

  const counts = new Map<MarketRegionCode, number>();
  for (const entry of resolved) {
    counts.set(entry.resolvedRegionCode, (counts.get(entry.resolvedRegionCode) ?? 0) + 1);
  }

  let best: MarketRegionCode | null = null;
  let bestCount = -1;
  for (const [code, count] of counts) {
    if (count > bestCount) {
      best = code;
      bestCount = count;
    }
  }

  return best;
}

/**
 * Legacy fallback (S2 · Opcja A) — jedyne źródło legacy to `marketQuotes.legacy_seed`
 * (region `polska`), materializowany przez migrację S0 z `marketAvgPln`.
 * `marketAvgPln` NIE jest SSOT — pozostaje deprecated/rollback; silnik go nie czyta.
 */
export function resolveLegacySeedPrice(work: CatalogWork): number | null {
  const snapshot = work.marketQuotes?.[MARKET_LEGACY_SEED_ORIGIN_ID]?.polska;
  if (!snapshot) return null;
  const price = snapshot.price;
  if (!Number.isFinite(price) || price <= 0) return null;
  return roundMarketPricePln(price);
}

export function computeMarketAverage(
  work: CatalogWork,
  context: MarketResolutionContext = DEFAULT_MARKET_RESOLUTION_CONTEXT,
  config: MarketSourceEngineConfig = DEFAULT_MARKET_SOURCE_ENGINE_CONFIG,
  computedAtIso: string,
): MarketAverageResult {
  const chain = marketRegionFallbackChain(context.startRegionCode);
  const resolved: ResolvedMarketQuote[] = [];

  for (const origin of config.enabledOrigins) {
    const quote = resolveOriginMarketQuote(
      work.marketQuotes,
      origin,
      chain,
      config.minConfidence,
      context.startRegionCode,
    );
    if (quote) resolved.push(quote);
  }

  if (resolved.length > 0) {
    const pricePln = computeConfidenceWeightedAverage(resolved);
    const fallbackUsed = resolved.some((entry) => entry.fallbackUsed);

    return {
      pricePln,
      originCount: resolved.length,
      resolvedQuotes: resolved,
      fallbackUsed,
      dominantRegionCode: pickDominantRegionCode(resolved),
      strategy: "confidence_weighted",
      computedAt: computedAtIso,
      unavailable: pricePln == null,
      legacyFallbackUsed: false,
    };
  }

  const legacyPrice = resolveLegacySeedPrice(work);
  if (legacyPrice != null) {
    return {
      pricePln: legacyPrice,
      originCount: 0,
      resolvedQuotes: [],
      fallbackUsed: false,
      dominantRegionCode: null,
      strategy: "confidence_weighted",
      computedAt: computedAtIso,
      unavailable: false,
      legacyFallbackUsed: true,
    };
  }

  return {
    pricePln: null,
    originCount: 0,
    resolvedQuotes: [],
    fallbackUsed: false,
    dominantRegionCode: null,
    strategy: "confidence_weighted",
    computedAt: computedAtIso,
    unavailable: true,
    legacyFallbackUsed: false,
  };
}

export function computeMarketAverageForWork(
  work: CatalogWork,
  options: {
    context?: MarketResolutionContext;
    config?: MarketSourceEngineConfig;
    computedAtIso?: string;
  } = {},
): MarketAverageResult {
  const computedAtIso = options.computedAtIso ?? work.updatedAt;
  return computeMarketAverage(
    work,
    options.context ?? DEFAULT_MARKET_RESOLUTION_CONTEXT,
    options.config ?? DEFAULT_MARKET_SOURCE_ENGINE_CONFIG,
    computedAtIso,
  );
}
