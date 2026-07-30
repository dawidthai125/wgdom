/**
 * MARKET-SYNC-01 P0 — Preview buckets (pure, staging only).
 */

import type {
  MarketProduct,
  PreviewBucketId,
  ProviderQuote,
} from "@/lib/market-sync/types";

const PRICE_EPS = 0.01;

export interface PreviewRow {
  quote: ProviderQuote;
  bucket: PreviewBucketId;
  canonicalName: string | null;
  proposedProductId: string | null;
  previousPrice: number | null;
  priceDelta: number | null;
}

export interface PreviewReport {
  rows: PreviewRow[];
  counts: Record<PreviewBucketId, number>;
  diagnostics: {
    totalQuotes: number;
    activeProducts: number;
    proposed: number;
    unmatched: number;
    conflict: number;
    rejected: number;
    priceChanges: number;
    newProducts: number;
    fuzzyAutoLinkCount: number;
  };
}

function quoteKey(q: ProviderQuote): string {
  const sku = (q.providerSku || "").trim();
  if (sku) return `${q.provider}|sku:${sku}`;
  return `${q.provider}|ean:${q.ean ?? ""}`;
}

function findPreviousPrice(
  quote: ProviderQuote,
  all: readonly ProviderQuote[],
): number | null {
  const key = quoteKey(quote);
  let best: ProviderQuote | null = null;
  for (const prev of all) {
    if (prev.id === quote.id) continue;
    if (prev.status === "rejected_row") continue;
    if (quoteKey(prev) !== key) continue;
    if (!best || prev.importedAt > best.importedAt) best = prev;
  }
  return best ? best.grossPrice : null;
}

function assignBucket(
  quote: ProviderQuote,
  previousPrice: number | null,
): PreviewBucketId {
  if (quote.status === "rejected_row") {
    if (quote.rejectReason === "unknown_unit") return "unit_conflict";
    return "rejected_row";
  }
  if (quote.status === "conflict") return "conflict";
  if (quote.status === "unmatched") return "unmatched";

  if (previousPrice != null) {
    const delta = Math.abs(quote.grossPrice - previousPrice);
    if (delta >= PRICE_EPS) return "price_change";
    if (quote.status === "proposed") return "proposed";
    return "unchanged";
  }

  // Brak historii ceny → nowe
  if (quote.status === "proposed" || quote.status === "unmatched" || quote.status === "imported") {
    return "new_product";
  }
  return "proposed";
}

export function buildPreviewReport(
  quotes: readonly ProviderQuote[],
  products: readonly MarketProduct[],
): PreviewReport {
  const byId = new Map(products.map((p) => [p.id, p]));
  const counts: Record<PreviewBucketId, number> = {
    new_product: 0,
    price_change: 0,
    unmatched: 0,
    conflict: 0,
    proposed: 0,
    rejected_row: 0,
    unit_conflict: 0,
    unchanged: 0,
  };

  const rows: PreviewRow[] = quotes.map((quote) => {
    const previousPrice = findPreviousPrice(quote, quotes);
    let bucket = assignBucket(quote, previousPrice);

    // Prefer explicit status buckets over new_product when unmatched/conflict
    if (quote.status === "unmatched") bucket = "unmatched";
    if (quote.status === "conflict") bucket = "conflict";
    if (quote.status === "proposed" && previousPrice == null) {
      // DF: new AND proposed — pokazuj jako new_product, ale proposed też w filtrze
      bucket = "new_product";
    }
    if (quote.status === "proposed" && previousPrice != null) {
      const delta = Math.abs(quote.grossPrice - previousPrice);
      bucket = delta >= PRICE_EPS ? "price_change" : "proposed";
    }

    counts[bucket] += 1;

    const mp = quote.marketProductId ? byId.get(quote.marketProductId) : undefined;
    return {
      quote,
      bucket,
      canonicalName: mp?.canonicalName ?? null,
      proposedProductId: quote.marketProductId,
      previousPrice,
      priceDelta:
        previousPrice != null ? quote.grossPrice - previousPrice : null,
    };
  });

  // Dla filtrów UI: wiersze proposed też liczone osobno w diagnostyce
  const proposed = quotes.filter((q) => q.status === "proposed").length;

  return {
    rows,
    counts,
    diagnostics: {
      totalQuotes: quotes.length,
      activeProducts: products.filter((p) => p.active !== false).length,
      proposed,
      unmatched: quotes.filter((q) => q.status === "unmatched").length,
      conflict: quotes.filter((q) => q.status === "conflict").length,
      rejected: quotes.filter((q) => q.status === "rejected_row").length,
      priceChanges: counts.price_change,
      newProducts: counts.new_product,
      fuzzyAutoLinkCount: 0,
    },
  };
}

export const PREVIEW_BUCKET_LABEL_PL: Record<PreviewBucketId, string> = {
  new_product: "Nowe produkty",
  price_change: "Zmienione ceny",
  unmatched: "Brak dopasowania",
  conflict: "Konflikt",
  proposed: "Proponowany Match",
  rejected_row: "Odrzucone",
  unit_conflict: "Konflikt jednostki",
  unchanged: "Bez zmiany ceny",
};
