/**
 * WC-P3.3 · S1 — Public API Engine (app layer, pure).
 *
 * Cienki adapter między silnikiem P3.1 (`computeMarketAverageForWork`, czyta `marketQuotes`)
 * a warstwą UI Biblioteki Robót. Decyzje DESIGN FREEZE P3.3:
 *  - D-A (a2): nowy moduł obok; legacy `marketAvgPln` pozostaje jako fallback/rollback,
 *              `work-catalog-market-comparison.ts` NIE jest ruszany w S1.
 *  - D-B (b1): kontekst regionu = `store.activeRegion` (WgdomCostRegion) → MarketRegionCode.
 *
 * Reuse First: progi 🟢🟡🔴 pochodzą z `buildMarketComparison` (SSOT P2.5) — bez duplikacji.
 * Pure · deterministyczny · bez React · bez I/O · bez Date.now().
 */

import {
  DEFAULT_MARKET_START_REGION,
  MARKET_ORIGIN_LABELS_PL,
  computeMarketAverageForWork,
  isMarketRegionCode,
  marketRegionLabelPl,
  type CatalogWork,
  type MarketOriginId,
  type MarketRegionCode,
} from "@/lib/work-catalog";
import {
  buildMarketComparison,
  resolveMarketPricePln,
  type MarketComparisonResult,
} from "@/app/work-catalog/work-catalog-market-comparison";

/** Skąd pochodzi ostatecznie pokazana cena rynkowa. */
export type EngineMarketPriceOrigin = "engine" | "legacy_seed" | "legacy_avg" | "none";

/** Widok pojedynczego źródła rynkowego dla UI (S3 skonsumuje `sources`). */
export interface EngineMarketSourceView {
  origin: MarketOriginId;
  originLabelPl: string;
  pricePln: number;
  confidence: number;
  regionCode: MarketRegionCode;
  regionLabelPl: string;
  /** Cena pochodzi z regionu innego niż startowy (fallback hierarchii). */
  fallbackUsed: boolean;
}

/** Wynik publicznego API silnika dla jednej roboty (S1). */
export interface EngineMarketComparison {
  /** Ostateczna cena rynkowa (silnik → legacy_seed → legacy_avg → null). */
  marketPricePln: number | null;
  priceOrigin: EngineMarketPriceOrigin;
  /** Ile źródeł weszło do średniej silnika (0 dla fallbacków legacy). */
  originCount: number;
  /** Czy którekolwiek źródło silnika użyło fallbacku regionalnego. */
  fallbackUsed: boolean;
  dominantRegionCode: MarketRegionCode | null;
  sources: EngineMarketSourceView[];
  /** Porównanie firma vs rynek (band/emoji/label) — reuse progów P2.5. */
  comparison: MarketComparisonResult;
  computedAt: string;
}

export interface BuildEngineMarketComparisonOptions {
  /** Region startowy hierarchii fallback (domyślnie z `resolveMarketStartRegion`). */
  startRegionCode?: MarketRegionCode;
  /** ISO znacznik wyliczenia (bez Date.now() — wstrzykiwany w testach). */
  computedAtIso?: string;
}

/**
 * Mapuje aktywny region katalogu (`WgdomCostRegion`) na `MarketRegionCode` startu
 * hierarchii fallback. Nieznane/undefined → `DEFAULT_MARKET_START_REGION` (Wrocław).
 */
export function resolveMarketStartRegion(region: string | undefined | null): MarketRegionCode {
  return isMarketRegionCode(region) ? region : DEFAULT_MARKET_START_REGION;
}

function buildSourceViews(
  resolvedQuotes: ReturnType<typeof computeMarketAverageForWork>["resolvedQuotes"],
): EngineMarketSourceView[] {
  return resolvedQuotes.map((quote) => ({
    origin: quote.origin,
    originLabelPl: MARKET_ORIGIN_LABELS_PL[quote.origin] ?? quote.origin,
    pricePln: quote.snapshot.price,
    confidence: quote.snapshot.confidence,
    regionCode: quote.resolvedRegionCode,
    regionLabelPl: marketRegionLabelPl(quote.resolvedRegionCode),
    fallbackUsed: quote.fallbackUsed,
  }));
}

/**
 * Publiczne API S1: liczy średnią rynkową robocie przez silnik P3.1, z fallbackiem
 * regionalnym (D-B) i legacy (D-A). Nie mutuje wejścia.
 */
export function buildEngineMarketComparisonForWork(
  work: CatalogWork,
  options: BuildEngineMarketComparisonOptions = {},
): EngineMarketComparison {
  const startRegionCode = options.startRegionCode ?? DEFAULT_MARKET_START_REGION;
  const engine = computeMarketAverageForWork(work, {
    context: { startRegionCode },
    computedAtIso: options.computedAtIso,
  });

  let marketPricePln: number | null = null;
  let priceOrigin: EngineMarketPriceOrigin = "none";

  if (engine.pricePln != null && engine.originCount > 0) {
    marketPricePln = engine.pricePln;
    priceOrigin = "engine";
  } else if (engine.pricePln != null && engine.legacyFallbackUsed) {
    marketPricePln = engine.pricePln;
    priceOrigin = "legacy_seed";
  } else {
    const legacyAvg = resolveMarketPricePln(work);
    if (legacyAvg != null) {
      marketPricePln = legacyAvg;
      priceOrigin = "legacy_avg";
    }
  }

  return {
    marketPricePln,
    priceOrigin,
    originCount: engine.originCount,
    fallbackUsed: engine.fallbackUsed,
    dominantRegionCode: engine.dominantRegionCode,
    sources: priceOrigin === "engine" ? buildSourceViews(engine.resolvedQuotes) : [],
    comparison: buildMarketComparison(work.companyPricePln, marketPricePln),
    computedAt: engine.computedAt,
  };
}
