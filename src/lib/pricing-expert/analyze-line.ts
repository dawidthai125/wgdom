/**
 * P0.3 — analiza Market Price jednej pozycji (REUSE computeMarketAverage / Quotes).
 */

import type { PriceHistoryEntry } from "@/lib/market-sync/types";
import {
  computeHistoryDeltaPct,
  isPriceAlert,
} from "@/lib/market-sync/price-history";
import {
  computeMarketAverage,
  defaultMarketResolutionContext,
  defaultMarketSourceEngineConfig,
  type MarketResolutionContext,
  type MarketSourceEngineConfig,
} from "@/lib/work-catalog/market-average-engine";
import type { CatalogWork } from "@/lib/work-catalog/types";
import type { MarketCoverage } from "@/lib/work-catalog/market-sources";
import { deriveMarketQuoteFreshness, worstFreshness } from "./market-freshness";
import type { MaterialMarketMapEntry } from "./types";
import type {
  MarketPriceRiskLevel,
  MarketTrendKind,
  PricingLineMarketAnalysis,
  PricingSourceView,
} from "./types";

function pickDominantCoverage(sources: PricingSourceView[]): MarketCoverage | null {
  if (sources.length === 0) return null;
  const rank: Record<MarketCoverage, number> = { full: 3, partial: 2, indicative: 1 };
  let best: MarketCoverage = sources[0]!.coverage;
  for (const s of sources) {
    if (rank[s.coverage] > rank[best]) best = s.coverage;
  }
  // worst for risk: if any indicative, surface it
  if (sources.some((s) => s.coverage === "indicative")) return "indicative";
  if (sources.some((s) => s.coverage === "partial") && best === "full") return "partial";
  return best;
}

function computeSpreadPct(prices: number[]): number | null {
  if (prices.length < 2) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  if (!(avg > 0)) return null;
  return Math.round(((max - min) / avg) * 10000) / 100;
}

function trendFromHistory(
  history: readonly PriceHistoryEntry[],
  marketProductId: string | undefined,
  currentPrice: number | null,
): { trend: MarketTrendKind; deltaPct: number | null } {
  if (!marketProductId) return { trend: "unknown", deltaPct: null };
  const mine = history
    .filter((e) => e.marketProductId === marketProductId)
    .sort((a, b) => a.at.localeCompare(b.at));
  if (mine.length >= 2) {
    const prev = mine[mine.length - 2]!;
    const last = mine[mine.length - 1]!;
    const deltaPct = computeHistoryDeltaPct(last.pricePln, prev.pricePln);
    if (deltaPct == null) return { trend: "unknown", deltaPct: null };
    if (Math.abs(deltaPct) < 2) return { trend: "flat", deltaPct };
    return { trend: deltaPct > 0 ? "up" : "down", deltaPct };
  }
  if (mine.length === 1 && currentPrice != null) {
    const deltaPct = computeHistoryDeltaPct(currentPrice, mine[0]!.pricePln);
    if (deltaPct == null) return { trend: "unknown", deltaPct: null };
    if (Math.abs(deltaPct) < 2) return { trend: "flat", deltaPct };
    return { trend: deltaPct > 0 ? "up" : "down", deltaPct };
  }
  return { trend: "unknown", deltaPct: null };
}

export function analyzeMaterialMarketLine(opts: {
  materialKey: string;
  namePl: string;
  quantity: number;
  unit: string;
  map: MaterialMarketMapEntry | null;
  work: CatalogWork | null;
  priceHistory?: readonly PriceHistoryEntry[];
  nowMs: number;
  computedAtIso: string;
  resolutionContext?: MarketResolutionContext;
  engineConfig?: MarketSourceEngineConfig;
  /** Sygnały z ME — bez mutacji. */
  materialReturnHints?: string[];
}): PricingLineMarketAnalysis {
  const {
    materialKey,
    namePl,
    quantity,
    unit,
    map,
    work,
    priceHistory = [],
    nowMs,
    computedAtIso,
    resolutionContext = defaultMarketResolutionContext(),
    engineConfig = defaultMarketSourceEngineConfig(),
    materialReturnHints = [],
  } = opts;

  if (!map) {
    return {
      materialKey,
      namePl,
      quantity,
      unit,
      mappedWorkId: null,
      mapLabelPl: null,
      marketPricePln: null,
      originCount: 0,
      sources: [],
      dominantCoverage: null,
      freshness: "missing",
      freshestUpdatedAt: null,
      trend: "unknown",
      trendDeltaPct: null,
      spreadPct: null,
      priceRisk: "high",
      riskNotesPl: ["Brak mapowania materiał → Market Quote."],
      requiresReanalysis: true,
      returnToMaterialExpert: true,
      returnReasonPl: "Brak mapy rynkowej — wymagany powrót do Eksperta Materiałów (wariant/klucz).",
    };
  }

  if (!work || !work.marketQuotes) {
    return {
      materialKey,
      namePl,
      quantity,
      unit,
      mappedWorkId: map.workId,
      mapLabelPl: map.labelPl,
      marketPricePln: null,
      originCount: 0,
      sources: [],
      dominantCoverage: null,
      freshness: "missing",
      freshestUpdatedAt: null,
      trend: "unknown",
      trendDeltaPct: null,
      spreadPct: null,
      priceRisk: "high",
      riskNotesPl: ["Zmapowano workId, lecz brak marketQuotes w katalogu RO."],
      requiresReanalysis: true,
      returnToMaterialExpert: false,
      returnReasonPl: null,
    };
  }

  const avg = computeMarketAverage(work, resolutionContext, engineConfig, computedAtIso);
  const sources: PricingSourceView[] = avg.resolvedQuotes.map((q) => ({
    origin: q.origin,
    pricePln: q.snapshot.price,
    regionCode: q.resolvedRegionCode,
    coverage: q.snapshot.coverage,
    confidence: q.snapshot.confidence,
    updatedAt: q.snapshot.updatedAt,
    fallbackUsed: q.fallbackUsed,
  }));

  const freshnessStatuses = sources.map((s) => deriveMarketQuoteFreshness(s.updatedAt, nowMs));
  const freshness = worstFreshness(freshnessStatuses);
  const freshestUpdatedAt =
    sources.length > 0
      ? [...sources].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]!.updatedAt
      : null;

  const spreadPct = computeSpreadPct(sources.map((s) => s.pricePln));
  const { trend, deltaPct: trendDeltaPct } = trendFromHistory(
    priceHistory,
    map.marketProductId,
    avg.pricePln,
  );

  const riskNotesPl: string[] = [];
  let priceRisk: MarketPriceRiskLevel = "low";

  if (avg.pricePln == null || avg.unavailable) {
    priceRisk = "high";
    riskNotesPl.push("Brak wyliczalnej ceny rynkowej (Market Average unavailable).");
  }
  if (freshness === "stale" || freshness === "missing") {
    priceRisk = priceRisk === "low" ? "medium" : "high";
    riskNotesPl.push(
      freshness === "missing"
        ? "Brak daty aktualności snapshotu rynkowego."
        : "Dane rynkowe nieświeże (REUSE okno freshness).",
    );
  }
  if (avg.dominantRegionCode && sources.some((s) => s.coverage === "indicative")) {
    priceRisk = priceRisk === "low" ? "medium" : priceRisk;
    riskNotesPl.push("Pokrycie indicative — wiarygodność ograniczona.");
  }
  if (spreadPct != null && spreadPct >= 25) {
    priceRisk = "high";
    riskNotesPl.push(`Duży rozrzut rynku (${spreadPct}%).`);
  } else if (spreadPct != null && spreadPct >= 12) {
    if (priceRisk === "low") priceRisk = "medium";
    riskNotesPl.push(`Umiarkowany rozrzut rynku (${spreadPct}%).`);
  }
  if (trendDeltaPct != null && isPriceAlert(trendDeltaPct)) {
    if (priceRisk === "low") priceRisk = "medium";
    riskNotesPl.push(`Trend cenowy z alertem historii (Δ ${trendDeltaPct}%).`);
  }
  if (avg.legacyFallbackUsed) {
    priceRisk = "high";
    riskNotesPl.push("Użyto legacy_seed — nie traktować jako pełny rynek wieloźródłowy.");
  }
  if (avg.originCount < 2 && avg.pricePln != null && !avg.legacyFallbackUsed) {
    if (priceRisk === "low") priceRisk = "medium";
    riskNotesPl.push("Tylko jedno źródło rynkowe — ograniczona weryfikacja rozrzutu.");
  }

  for (const h of materialReturnHints) {
    riskNotesPl.push(h);
  }

  const requiresReanalysis = priceRisk === "high" || avg.pricePln == null;
  const returnToMaterialExpert =
    materialReturnHints.length > 0 ||
    (avg.pricePln == null && Boolean(map.marketProductId));

  return {
    materialKey,
    namePl,
    quantity,
    unit,
    mappedWorkId: map.workId,
    mapLabelPl: map.labelPl,
    marketPricePln: avg.pricePln,
    originCount: avg.originCount,
    sources,
    dominantCoverage: pickDominantCoverage(sources),
    freshness,
    freshestUpdatedAt,
    trend,
    trendDeltaPct,
    spreadPct,
    priceRisk,
    riskNotesPl,
    requiresReanalysis,
    returnToMaterialExpert,
    returnReasonPl: returnToMaterialExpert
      ? materialReturnHints[0] ??
        "Brak solidnej ceny rynkowej — rozważyć wariant materiałowy / ponowną analizę ME."
      : null,
  };
}
