/**
 * MARKET-SYNC-01 P0 — pipeline Import → Normalize → Match → Preview (STOP).
 * BEZ Accept · BEZ commitMarketQuotesImport · BEZ Quotes write.
 */

import { importProviderQuotesFromCsv, type ImportCsvOptions } from "@/lib/market-sync/import-csv";
import { matchAllQuotes } from "@/lib/market-sync/match";
import { buildPreviewReport, type PreviewReport } from "@/lib/market-sync/preview";
import {
  appendImportToStaging,
  replaceQuotesInStaging,
} from "@/lib/market-sync/staging-store";
import type { MarketSyncStagingStore } from "@/lib/market-sync/types";

export interface RunMarketSyncImportResult {
  store: MarketSyncStagingStore;
  preview: PreviewReport;
  syncRunId: string;
  parseRejected: { lineNumber: number; reason: string }[];
}

/** Import CSV → append quotes → Match → Preview. Persist caller decides. */
export function runMarketSyncCsvImport(
  store: MarketSyncStagingStore,
  csvText: string,
  options: ImportCsvOptions = {},
): RunMarketSyncImportResult {
  const { syncRun, quotes, parseRejected } = importProviderQuotesFromCsv(csvText, options);
  const withImport = appendImportToStaging(store, syncRun, quotes);
  const matched = matchAllQuotes(withImport.providerQuotes, withImport.marketProducts);
  const next = replaceQuotesInStaging(withImport, matched);
  const preview = buildPreviewReport(next.providerQuotes, next.marketProducts);
  return {
    store: next,
    preview,
    syncRunId: syncRun.id,
    parseRejected,
  };
}

/** Manual refresh: re-run Match + Preview na istniejącym staging. */
export function refreshMarketSyncMatch(
  store: MarketSyncStagingStore,
): { store: MarketSyncStagingStore; preview: PreviewReport } {
  const matched = matchAllQuotes(store.providerQuotes, store.marketProducts);
  const next = replaceQuotesInStaging(store, matched);
  return {
    store: next,
    preview: buildPreviewReport(next.providerQuotes, next.marketProducts),
  };
}

export function previewFromStaging(store: MarketSyncStagingStore): PreviewReport {
  return buildPreviewReport(store.providerQuotes, store.marketProducts);
}
