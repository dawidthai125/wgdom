/**
 * MARKET-SYNC-01 P1 — Dry Run: budowa in-memory MarketCsvPreviewReport.
 * Prefer in-memory (DF O-P1-C) · publishFactor 1.0 · activeRegion.
 */

import { findMarketProduct } from "@/lib/market-sync/accept";
import type { MarketSyncStagingStore, ProviderQuote } from "@/lib/market-sync/types";
import type {
  MarketCsvPreviewReport,
  MarketCsvPreviewRow,
} from "@/lib/work-catalog/market-csv-preview";
import type { MarketRegionCode } from "@/lib/work-catalog/market-regions";
import {
  isMarketDiyOriginId,
  roundMarketPricePln,
  type MarketDiyOriginId,
  type MarketSourceSnapshot,
} from "@/lib/work-catalog/market-sources";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";

export const MARKET_SYNC_PUBLISH_FACTOR = 1.0 as const;

export interface DryRunBuildOptions {
  region: WgdomCostRegion & MarketRegionCode;
  publishedAtIso?: string;
  /** Quote IDs already Guard-eligible. */
  quoteIds: readonly string[];
}

export interface DryRunBuildResult {
  ok: boolean;
  reason?: string;
  preview: MarketCsvPreviewReport;
  quoteIdsIncluded: string[];
  rejectedCount: number;
}

function emptyParse(): MarketCsvPreviewReport["parse"] {
  return {
    ok: true,
    delimiter: ",",
    headers: ["workId", "origin", "region", "price", "confidence"],
    rows: [],
    rejected: [],
  };
}

function emptyPreview(): MarketCsvPreviewReport {
  return {
    mode: "preview",
    parse: emptyParse(),
    matched: [],
    lowConfidence: [],
    unmatched: [],
    rejected: [],
    summary: {
      totalInputRows: 0,
      parsedRows: 0,
      parseRejectedLines: 0,
      matched: 0,
      lowConfidence: 0,
      unmatched: 0,
      rejected: 0,
    },
  };
}

export function providerToDiyOrigin(provider: string): MarketDiyOriginId | null {
  return isMarketDiyOriginId(provider) ? provider : null;
}

export function buildPublishSnapshotFromQuote(
  quote: ProviderQuote,
  region: MarketRegionCode,
  publishedAtIso: string,
): MarketSourceSnapshot | null {
  const origin = providerToDiyOrigin(quote.provider);
  if (!origin) return null;
  const price = roundMarketPricePln(quote.grossPrice * MARKET_SYNC_PUBLISH_FACTOR);
  if (!(price > 0)) return null;
  const confidence =
    quote.matchConfidence != null && Number.isFinite(quote.matchConfidence)
      ? Math.max(0, Math.min(1, quote.matchConfidence))
      : 1;
  return {
    price,
    regionCode: region,
    coverage: "full",
    updatedAt: publishedAtIso,
    confidence,
    origin,
  };
}

/**
 * Buduje MarketCsvPreviewReport gotowy pod commitMarketQuotesImport.
 * Wiersze bez workId/snapshot → rejected (nie trafiają do apply matched).
 */
export function buildMarketSyncDryRunPreview(
  store: MarketSyncStagingStore,
  options: DryRunBuildOptions,
): DryRunBuildResult {
  const publishedAtIso = options.publishedAtIso ?? new Date().toISOString();
  const matched: MarketCsvPreviewRow[] = [];
  const rejected: MarketCsvPreviewRow[] = [];
  const quoteIdsIncluded: string[] = [];

  options.quoteIds.forEach((quoteId, rowIndex) => {
    const quote = store.providerQuotes.find((q) => q.id === quoteId);
    if (!quote) {
      rejected.push({
        rowIndex,
        lineNumber: null,
        origin: null,
        externalId: quoteId,
        workId: null,
        confidence: 0,
        status: "rejected",
        regionCode: null,
        price: null,
        errors: ["quote-not-found"],
        snapshot: null,
      });
      return;
    }
    const product = findMarketProduct(store, quote.marketProductId);
    const workId = product?.linkedWorkIds[0] ?? null;
    const origin = providerToDiyOrigin(quote.provider);
    const snapshot = buildPublishSnapshotFromQuote(quote, options.region, publishedAtIso);

    if (!workId || !origin || !snapshot) {
      rejected.push({
        rowIndex,
        lineNumber: null,
        origin,
        externalId: quote.providerSku || quote.id,
        workId,
        confidence: quote.matchConfidence ?? 0,
        status: "rejected",
        regionCode: options.region,
        price: snapshot?.price ?? null,
        errors: [
          !workId ? "missing-linked-work" : "",
          !origin ? "provider-not-diy" : "",
          !snapshot ? "invalid-snapshot" : "",
        ].filter(Boolean),
        snapshot: null,
      });
      return;
    }

    matched.push({
      rowIndex,
      lineNumber: null,
      origin,
      externalId: quote.providerSku || quote.id,
      workId,
      confidence: snapshot.confidence,
      status: "matched",
      regionCode: options.region,
      price: snapshot.price,
      errors: [],
      snapshot,
    });
    quoteIdsIncluded.push(quote.id);
  });

  const preview: MarketCsvPreviewReport = {
    ...emptyPreview(),
    matched,
    rejected,
    summary: {
      totalInputRows: options.quoteIds.length,
      parsedRows: matched.length + rejected.length,
      parseRejectedLines: 0,
      matched: matched.length,
      lowConfidence: 0,
      unmatched: 0,
      rejected: rejected.length,
    },
  };

  if (matched.length === 0) {
    return {
      ok: false,
      reason: "dry-run-empty",
      preview,
      quoteIdsIncluded,
      rejectedCount: rejected.length,
    };
  }

  return {
    ok: true,
    preview,
    quoteIdsIncluded,
    rejectedCount: rejected.length,
  };
}
