/**
 * P2.5 — porównanie cena firmy vs rynek (app layer; P1 zamrożony).
 * Produktowo „cena rynkowa” = pole P1 `marketAvgPln` (alias `marketPricePln` w UI).
 */

import type { CatalogWork } from "@/lib/work-catalog";

export type MarketComparisonBand = "ok" | "warn" | "alert" | "unavailable";

export interface MarketComparisonResult {
  marketPricePln: number | null;
  diffPercent: number | null;
  band: MarketComparisonBand;
  statusEmoji: string;
  statusLabelPl: string;
  marketDisplayPl: string;
}

const GREEN_MAX_PERCENT = 10;
const YELLOW_MAX_PERCENT = 25;

export function roundMarketPricePln(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100;
}

/** SSOT rynku w UI — odczyt z `marketAvgPln` (P1), bez mutacji. */
export function resolveMarketPricePln(work: CatalogWork): number | null {
  const raw = work.marketAvgPln;
  if (raw == null || !Number.isFinite(raw) || raw <= 0) {
    return null;
  }
  return roundMarketPricePln(raw);
}

export function formatMarketPriceDisplayPl(marketPricePln: number | null): string {
  if (marketPricePln == null) return "—";
  return `${marketPricePln.toFixed(2).replace(".", ",")} zł`;
}

export function computeMarketDiffPercent(
  companyPricePln: number,
  marketPricePln: number,
): number {
  const company = roundMarketPricePln(
    Number.isFinite(companyPricePln) ? companyPricePln : 0,
  );
  const market = roundMarketPricePln(marketPricePln);
  if (market <= 0) return 0;
  return roundMarketPricePln((Math.abs(company - market) / market) * 100);
}

export function marketComparisonBand(diffPercent: number): Exclude<MarketComparisonBand, "unavailable"> {
  if (diffPercent <= GREEN_MAX_PERCENT) return "ok";
  if (diffPercent <= YELLOW_MAX_PERCENT) return "warn";
  return "alert";
}

export function marketComparisonStatusLabelPl(
  band: Exclude<MarketComparisonBand, "unavailable">,
): string {
  switch (band) {
    case "ok":
      return "Cena firmy ≈ rynek";
    case "warn":
      return "Cena firmy odbiega od rynku (11–25%)";
    case "alert":
      return "Cena firmy znacznie odbiega od rynku (>25%)";
    default:
      return "";
  }
}

export function marketComparisonStatusEmoji(
  band: Exclude<MarketComparisonBand, "unavailable">,
): string {
  switch (band) {
    case "ok":
      return "🟢";
    case "warn":
      return "🟡";
    case "alert":
      return "🔴";
    default:
      return "";
  }
}

export function buildMarketComparison(
  companyPricePln: number,
  marketPricePln: number | null,
): MarketComparisonResult {
  if (marketPricePln == null) {
    return {
      marketPricePln: null,
      diffPercent: null,
      band: "unavailable",
      statusEmoji: "",
      statusLabelPl: "",
      marketDisplayPl: "—",
    };
  }

  const diffPercent = computeMarketDiffPercent(companyPricePln, marketPricePln);
  const band = marketComparisonBand(diffPercent);

  return {
    marketPricePln,
    diffPercent,
    band,
    statusEmoji: marketComparisonStatusEmoji(band),
    statusLabelPl: marketComparisonStatusLabelPl(band),
    marketDisplayPl: formatMarketPriceDisplayPl(marketPricePln),
  };
}

export function buildMarketComparisonForWork(work: CatalogWork): MarketComparisonResult {
  return buildMarketComparison(work.companyPricePln, resolveMarketPricePln(work));
}
