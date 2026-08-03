/**
 * MARKET-SYNC-01 P2 — Coverage retail RO (pure).
 */

import type { MarketSyncStagingStore, ProviderId } from "@/lib/market-sync/types";
import {
  computeHistoryDeltaPct,
  isPriceAlert,
  listHistoryForProductProvider,
} from "@/lib/market-sync/price-history";

export interface MarketSyncCoverageView {
  productCount: number;
  quoteCount: number;
  acceptedCount: number;
  publishedCount: number;
  linkedProductCount: number;
  historyEntryCount: number;
  productsWithHistory: number;
  alertCount: number;
}

/**
 * KPI RO ze staging — zero mutacji.
 */
export function buildMarketSyncCoverageView(
  store: MarketSyncStagingStore,
): MarketSyncCoverageView {
  const products = store.marketProducts ?? [];
  const quotes = store.providerQuotes ?? [];
  const history = store.priceHistory ?? [];

  const linkedProductCount = products.filter((p) => p.linkedWorkIds.length === 1).length;
  const acceptedCount = quotes.filter((q) => q.status === "accepted").length;
  const publishedCount = quotes.filter((q) => q.status === "published").length;

  const productProviderKeys = new Set(
    history.map((e) => `${e.marketProductId}::${e.providerId}`),
  );

  let alertCount = 0;
  for (const key of productProviderKeys) {
    const sep = key.indexOf("::");
    if (sep < 0) continue;
    const mpId = key.slice(0, sep);
    const providerId = key.slice(sep + 2) as ProviderId;
    const list = listHistoryForProductProvider(store, mpId, providerId);
    if (list.length < 2) continue;
    const last = list[list.length - 1]!;
    const prev = list[list.length - 2]!;
    const delta = computeHistoryDeltaPct(last.pricePln, prev.pricePln);
    if (isPriceAlert(delta)) alertCount += 1;
  }

  return {
    productCount: products.length,
    quoteCount: quotes.length,
    acceptedCount,
    publishedCount,
    linkedProductCount,
    historyEntryCount: history.length,
    productsWithHistory: productProviderKeys.size,
    alertCount,
  };
}
