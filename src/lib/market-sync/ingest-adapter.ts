/**
 * MARKET-SYNC-01 P3 — Ingest adapter (one interface · one Mock implementation).
 * DF: 0 fetch · 0 secrets · live refuse without Legal PASS.
 */

import type { MarketSyncSourceKind, ProviderId } from "@/lib/market-sync/types";
import {
  MARKET_SYNC_P3_DEFAULT_PROVIDER,
  isMarketSyncP3LegalPass,
} from "@/lib/market-sync/p3-flag";

export type MarketSyncP3ProviderId = ProviderId;

export interface MarketSyncIngestRawRow {
  provider: string;
  providerSku: string;
  ean?: string;
  productName: string;
  unit: string;
  grossPrice: string;
  currency: string;
  sourceUrl?: string;
}

export interface MarketSyncIngestContext {
  providerId: MarketSyncP3ProviderId;
  sourceKind: "licensed_api" | "scraper" | "csv_export" | "manual";
  /** Live network — wolno tylko gdy Legal PASS; mock = false. */
  allowLiveNetwork: boolean;
}

export interface MarketSyncIngestResult {
  ok: boolean;
  rows: MarketSyncIngestRawRow[];
  errors: string[];
  sourceKind: MarketSyncSourceKind;
  providerId: ProviderId;
}

export interface MarketSyncIngestAdapter {
  readonly id: string;
  run(ctx: MarketSyncIngestContext): MarketSyncIngestResult;
}

/** Refuse live when Legal Gate !== PASS (D-P3-10). */
export function refuseLiveIngestIfBlocked(
  ctx: MarketSyncIngestContext,
): MarketSyncIngestResult | null {
  if (!ctx.allowLiveNetwork) return null;
  if (isMarketSyncP3LegalPass()) return null;
  return {
    ok: false,
    rows: [],
    errors: [
      "Legal Gate OPEN — live ingest zablokowany (D-P3-10). Użyj mock (allowLiveNetwork=false).",
    ],
    sourceKind: ctx.sourceKind,
    providerId: ctx.providerId,
  };
}

/**
 * Jedyna implementacja adaptera w P3-A — fixture rows, bez sieci.
 */
export const mockIngestAdapter: MarketSyncIngestAdapter = {
  id: "mock-v1",
  run(ctx: MarketSyncIngestContext): MarketSyncIngestResult {
    const blocked = refuseLiveIngestIfBlocked({ ...ctx, allowLiveNetwork: ctx.allowLiveNetwork });
    if (blocked) return blocked;

    const providerId = ctx.providerId || MARKET_SYNC_P3_DEFAULT_PROVIDER;
    const sku = `${providerId.toUpperCase()}-P3-MOCK-001`;
    return {
      ok: true,
      rows: [
        {
          provider: providerId,
          providerSku: sku,
          ean: "5901234123999",
          productName: `P3 mock ${providerId} — klej stub`,
          unit: "szt",
          grossPrice: "27.50",
          currency: "PLN",
          sourceUrl: "",
        },
        {
          provider: providerId,
          providerSku: `${providerId.toUpperCase()}-P3-MOCK-002`,
          productName: `P3 mock ${providerId} — płyta stub`,
          unit: "m2",
          grossPrice: "19.90",
          currency: "PLN",
        },
      ],
      errors: [],
      sourceKind: "csv_export",
      providerId,
    };
  },
};

/** Serialize rows → CSV for REUSE `runMarketSyncCsvImport`. */
export function marketSyncIngestRowsToCsv(rows: MarketSyncIngestRawRow[]): string {
  const header =
    "provider,providerSku,ean,productName,unit,grossPrice,currency,sourceUrl";
  const lines = rows.map((r) =>
    [
      r.provider,
      r.providerSku,
      r.ean ?? "",
      r.productName,
      r.unit,
      r.grossPrice,
      r.currency,
      r.sourceUrl ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

function csvEscape(v: string): string {
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}
