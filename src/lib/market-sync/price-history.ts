/**
 * MARKET-SYNC-01 P2 — PriceHistory (pure).
 * Append on Accept · cap 24 · Δ% alert ≥10% · NIGDY → average engine.
 */

import type {
  MarketSyncStagingStore,
  PriceHistoryEntry,
  ProviderId,
  ProviderQuote,
} from "@/lib/market-sync/types";
import { isMarketSyncP2Enabled } from "@/lib/market-sync/p2-flag";

/** DF D-P2-01 */
export const PRICE_HISTORY_CAP = 24;

/** DF D-P2-02 — informacyjny, nie blokuje Publish. */
export const PRICE_ALERT_PCT = 10;

export function historyRingKey(marketProductId: string, providerId: ProviderId): string {
  return `${marketProductId}::${providerId}`;
}

function roundPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function computeHistoryDeltaPct(
  newPrice: number,
  prevPrice: number | null | undefined,
): number | null {
  if (!(newPrice > 0) || prevPrice == null || !(prevPrice > 0)) return null;
  return roundPct(((newPrice - prevPrice) / prevPrice) * 100);
}

export function isPriceAlert(deltaPct: number | null | undefined): boolean {
  if (deltaPct == null || !Number.isFinite(deltaPct)) return false;
  return Math.abs(deltaPct) >= PRICE_ALERT_PCT;
}

export function listHistoryForProductProvider(
  store: MarketSyncStagingStore,
  marketProductId: string,
  providerId: ProviderId,
): PriceHistoryEntry[] {
  const list = (store.priceHistory ?? []).filter(
    (e) => e.marketProductId === marketProductId && e.providerId === providerId,
  );
  return [...list].sort((a, b) => a.at.localeCompare(b.at));
}

export function prunePriceHistoryRing(
  entries: readonly PriceHistoryEntry[],
  cap = PRICE_HISTORY_CAP,
): PriceHistoryEntry[] {
  if (entries.length <= cap) return [...entries];
  const sorted = [...entries].sort((a, b) => a.at.localeCompare(b.at));
  return sorted.slice(sorted.length - cap);
}

/**
 * Append PriceHistory przy Accept (tylko gdy P2 ON).
 * Skip duplicate quoteId · cap 24 per (product × provider).
 */
export function appendPriceHistoryOnAccept(
  store: MarketSyncStagingStore,
  quote: ProviderQuote,
  opts?: { atIso?: string; enabled?: boolean; sourceKind?: PriceHistoryEntry["sourceKind"] },
): MarketSyncStagingStore {
  const enabled = opts?.enabled ?? isMarketSyncP2Enabled();
  if (!enabled) return store;
  if (!quote.marketProductId) return store;
  if (!(quote.grossPrice > 0)) return store;

  const existing = store.priceHistory ?? [];
  if (existing.some((e) => e.quoteId === quote.id)) {
    return store;
  }

  const at = opts?.atIso ?? new Date().toISOString();
  const entry: PriceHistoryEntry = {
    id: `ph-${quote.id}`,
    marketProductId: quote.marketProductId,
    providerId: quote.provider,
    providerSku: quote.providerSku,
    pricePln: quote.grossPrice,
    at,
    sourceKind: opts?.sourceKind ?? "csv_export",
    syncRunId: quote.syncRunId ?? null,
    quoteId: quote.id,
  };

  const sameRing = existing.filter(
    (e) =>
      e.marketProductId === entry.marketProductId && e.providerId === entry.providerId,
  );
  const other = existing.filter(
    (e) =>
      !(
        e.marketProductId === entry.marketProductId && e.providerId === entry.providerId
      ),
  );
  const pruned = prunePriceHistoryRing([...sameRing, entry], PRICE_HISTORY_CAP);

  return {
    ...store,
    priceHistory: [...other, ...pruned],
    updatedAt: at,
  };
}

export function lastHistoryPrice(
  store: MarketSyncStagingStore,
  marketProductId: string,
  providerId: ProviderId,
): PriceHistoryEntry | null {
  const list = listHistoryForProductProvider(store, marketProductId, providerId);
  return list.length > 0 ? list[list.length - 1]! : null;
}

export function historyAlertForNewPrice(
  store: MarketSyncStagingStore,
  marketProductId: string,
  providerId: ProviderId,
  newPrice: number,
): { deltaPct: number | null; isAlert: boolean; prev: PriceHistoryEntry | null } {
  const prev = lastHistoryPrice(store, marketProductId, providerId);
  const deltaPct = computeHistoryDeltaPct(newPrice, prev?.pricePln);
  return { deltaPct, isAlert: isPriceAlert(deltaPct), prev };
}
