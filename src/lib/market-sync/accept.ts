/**
 * MARKET-SYNC-01 P1 — Accept / Reject / Defer + link N:1 (staging only).
 * ZERO zapisu Product Quotes / Work Catalog.
 */

import type {
  MarketProduct,
  MarketSyncStagingStore,
  ProviderQuote,
  ProviderQuoteStatus,
} from "@/lib/market-sync/types";

function nowIso(): string {
  return new Date().toISOString();
}

const ACCEPT_FROM: ReadonlySet<ProviderQuoteStatus> = new Set([
  "proposed",
  "imported",
  "deferred",
  "accepted",
]);

export type AcceptDecision = "accepted" | "rejected" | "deferred";

export interface AcceptQuoteResult {
  store: MarketSyncStagingStore;
  ok: boolean;
  reason?: string;
  quote: ProviderQuote | null;
}

/** Ustaw linkedWorkIds (N:1 — max 1 workId). Staging only. */
export function setMarketProductLinkedWorkIds(
  store: MarketSyncStagingStore,
  productId: string,
  workIds: readonly string[],
): MarketSyncStagingStore {
  const linked = workIds
    .map((id) => String(id).trim())
    .filter(Boolean)
    .slice(0, 1);
  const ts = nowIso();
  return {
    ...store,
    updatedAt: ts,
    marketProducts: store.marketProducts.map((p) =>
      p.id === productId ? { ...p, linkedWorkIds: linked, updatedAt: ts } : p,
    ),
  };
}

export function decideProviderQuoteStatus(
  store: MarketSyncStagingStore,
  quoteId: string,
  decision: AcceptDecision,
): AcceptQuoteResult {
  const quote = store.providerQuotes.find((q) => q.id === quoteId) ?? null;
  if (!quote) {
    return { store, ok: false, reason: "quote-not-found", quote: null };
  }
  if (decision === "accepted") {
    if (!ACCEPT_FROM.has(quote.status)) {
      return { store, ok: false, reason: `cannot-accept-from-${quote.status}`, quote };
    }
    if (quote.status === "conflict" || quote.status === "unmatched" || quote.status === "rejected_row") {
      return { store, ok: false, reason: "blocked-status", quote };
    }
    if (!quote.marketProductId) {
      return { store, ok: false, reason: "missing-market-product", quote };
    }
  }
  if (quote.status === "published" && decision !== "deferred") {
    return { store, ok: false, reason: "already-published", quote };
  }

  const nextStatus: ProviderQuoteStatus = decision;
  const nextQuotes = store.providerQuotes.map((q) =>
    q.id === quoteId ? { ...q, status: nextStatus } : q,
  );
  const next: MarketSyncStagingStore = {
    ...store,
    providerQuotes: nextQuotes,
    updatedAt: nowIso(),
  };
  return {
    store: next,
    ok: true,
    quote: nextQuotes.find((q) => q.id === quoteId) ?? null,
  };
}

export function findMarketProduct(
  store: MarketSyncStagingStore,
  productId: string | null | undefined,
): MarketProduct | null {
  if (!productId) return null;
  return store.marketProducts.find((p) => p.id === productId) ?? null;
}

/** Po Undo Publish — published → accepted (staging). */
export function revertPublishedQuotesToAccepted(
  store: MarketSyncStagingStore,
  quoteIds: readonly string[],
): MarketSyncStagingStore {
  const set = new Set(quoteIds);
  return {
    ...store,
    updatedAt: nowIso(),
    providerQuotes: store.providerQuotes.map((q) =>
      set.has(q.id) && q.status === "published" ? { ...q, status: "accepted" } : q,
    ),
  };
}

/** Po udanym commit — accepted → published. */
export function markQuotesPublished(
  store: MarketSyncStagingStore,
  quoteIds: readonly string[],
): MarketSyncStagingStore {
  const set = new Set(quoteIds);
  return {
    ...store,
    updatedAt: nowIso(),
    providerQuotes: store.providerQuotes.map((q) =>
      set.has(q.id) && q.status === "accepted" ? { ...q, status: "published" } : q,
    ),
  };
}
