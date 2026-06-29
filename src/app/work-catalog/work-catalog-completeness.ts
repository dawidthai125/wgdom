/**
 * P2.6 — kompletność Biblioteki Robót (app layer; P1 zamrożony).
 * Kompletna robota = companyPricePln > 0.
 */

import {
  isCompanyPricePresent,
  tradeLabelPl,
  type CatalogWork,
  type TradeId,
} from "@/lib/work-catalog";

export type CompletenessBand = "ok" | "warn" | "alert";

export interface TradeCompletenessRow {
  tradeId: TradeId;
  labelPl: string;
  pricedCount: number;
  totalCount: number;
  percent: number;
  band: CompletenessBand;
  statusEmoji: string;
}

export interface LibraryCompletenessSummary {
  pricedCount: number;
  totalCount: number;
  percent: number;
  band: CompletenessBand;
  statusEmoji: string;
  trades: TradeCompletenessRow[];
}

export function isWorkCatalogEntryPriced(work: CatalogWork): boolean {
  return isCompanyPricePresent(work.companyPricePln);
}

export function completenessPercent(pricedCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Math.round((pricedCount / totalCount) * 100);
}

/** 🟢 100% · 🟡 50–99% · 🔴 <50% */
export function completenessBand(percent: number): CompletenessBand {
  if (percent >= 100) return "ok";
  if (percent >= 50) return "warn";
  return "alert";
}

export function completenessStatusEmoji(band: CompletenessBand): string {
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

export function computeTradeCompletenessRow(
  tradeId: TradeId,
  works: CatalogWork[],
): TradeCompletenessRow | null {
  const tradeWorks = works.filter((work) => work.tradeId === tradeId);
  if (tradeWorks.length === 0) return null;

  const totalCount = tradeWorks.length;
  const pricedCount = tradeWorks.filter(isWorkCatalogEntryPriced).length;
  const percent = completenessPercent(pricedCount, totalCount);
  const band = completenessBand(percent);

  return {
    tradeId,
    labelPl: tradeLabelPl(tradeId),
    pricedCount,
    totalCount,
    percent,
    band,
    statusEmoji: completenessStatusEmoji(band),
  };
}

export function computeLibraryCompleteness(
  works: CatalogWork[],
  tradesOrder: TradeId[],
): LibraryCompletenessSummary {
  const totalCount = works.length;
  const pricedCount = works.filter(isWorkCatalogEntryPriced).length;
  const percent = completenessPercent(pricedCount, totalCount);
  const band = completenessBand(percent);

  const trades: TradeCompletenessRow[] = [];
  for (const tradeId of tradesOrder) {
    const row = computeTradeCompletenessRow(tradeId, works);
    if (row) trades.push(row);
  }

  return {
    pricedCount,
    totalCount,
    percent,
    band,
    statusEmoji: completenessStatusEmoji(band),
    trades,
  };
}
