/**
 * MARKET-SYNC-01 P3 — ingest run: adapter → P0 CSV import → staging Preview.
 * BEZ Publish · BEZ Accept · BEZ drugiego toru Quotes.
 */

import {
  marketSyncIngestRowsToCsv,
  mockIngestAdapter,
  refuseLiveIngestIfBlocked,
  type MarketSyncIngestAdapter,
  type MarketSyncIngestContext,
  type MarketSyncIngestResult,
} from "@/lib/market-sync/ingest-adapter";
import {
  MARKET_SYNC_P3_DEFAULT_PROVIDER,
  isMarketSyncP3Enabled,
} from "@/lib/market-sync/p3-flag";
import {
  runMarketSyncCsvImport,
  type RunMarketSyncImportResult,
} from "@/lib/market-sync/pipeline";
import type { MarketSyncStagingStore, ProviderId } from "@/lib/market-sync/types";

export interface RunMarketSyncP3IngestOptions {
  providerId?: ProviderId;
  /** Default false — mock path. true → Legal Gate check. */
  allowLiveNetwork?: boolean;
  actorAdminId?: string | null;
  /** Test/DI — default mockIngestAdapter (jedyny w P3-A). */
  adapter?: MarketSyncIngestAdapter;
  nowIso?: string;
  newId?: () => string;
}

export interface RunMarketSyncP3IngestResult {
  ok: boolean;
  store: MarketSyncStagingStore;
  preview: RunMarketSyncImportResult["preview"] | null;
  syncRunId: string | null;
  ingest: MarketSyncIngestResult;
  parseRejected: { lineNumber: number; reason: string }[];
  errors: string[];
}

/**
 * Manual P3 ingest → staging Preview (REUSE runMarketSyncCsvImport).
 * Nie woła Publish / commitMarketQuotesImport.
 */
export function runMarketSyncP3Ingest(
  store: MarketSyncStagingStore,
  options: RunMarketSyncP3IngestOptions = {},
): RunMarketSyncP3IngestResult {
  const providerId = options.providerId ?? MARKET_SYNC_P3_DEFAULT_PROVIDER;
  const allowLiveNetwork = options.allowLiveNetwork === true;
  const adapter = options.adapter ?? mockIngestAdapter;

  const ctx: MarketSyncIngestContext = {
    providerId,
    sourceKind: allowLiveNetwork ? "licensed_api" : "csv_export",
    allowLiveNetwork,
  };

  const early = refuseLiveIngestIfBlocked(ctx);
  if (early) {
    return {
      ok: false,
      store,
      preview: null,
      syncRunId: null,
      ingest: early,
      parseRejected: [],
      errors: early.errors,
    };
  }

  if (!isMarketSyncP3Enabled()) {
    const ingest: MarketSyncIngestResult = {
      ok: false,
      rows: [],
      errors: ["P3 flag OFF — ustaw kw-market-sync-01-p3=1 (default OFF)."],
      sourceKind: "csv_export",
      providerId,
    };
    return {
      ok: false,
      store,
      preview: null,
      syncRunId: null,
      ingest,
      parseRejected: [],
      errors: ingest.errors,
    };
  }

  const ingest = adapter.run(ctx);
  if (!ingest.ok || ingest.rows.length === 0) {
    return {
      ok: false,
      store,
      preview: null,
      syncRunId: null,
      ingest,
      parseRejected: [],
      errors: ingest.errors.length > 0 ? ingest.errors : ["Ingest: brak wierszy"],
    };
  }

  /* Single-provider: drop any row that drifted provider (defense). */
  const rows = ingest.rows.filter((r) => r.provider === providerId);
  if (rows.length === 0) {
    return {
      ok: false,
      store,
      preview: null,
      syncRunId: null,
      ingest: { ...ingest, ok: false, rows: [], errors: ["Single-provider: 0 rows po filtrze"] },
      parseRejected: [],
      errors: ["Single-provider: 0 rows po filtrze"],
    };
  }

  const csvText = marketSyncIngestRowsToCsv(rows);
  const imported = runMarketSyncCsvImport(store, csvText, {
    actorAdminId: options.actorAdminId ?? null,
    fileName: `p3-mock-${providerId}.csv`,
    defaultProvider: providerId,
    nowIso: options.nowIso,
    newId: options.newId,
  });

  return {
    ok: true,
    store: imported.store,
    preview: imported.preview,
    syncRunId: imported.syncRunId,
    ingest: { ...ingest, rows, providerId },
    parseRejected: imported.parseRejected,
    errors: [],
  };
}
