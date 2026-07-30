/**
 * MARKET-SYNC-01 P1 — Delta Preview (new / changed / unchanged / skip).
 */

import type { MarketCsvPreviewReport } from "@/lib/work-catalog/market-csv-preview";
import type { MarketQuoteOriginId, MarketRegionCode } from "@/lib/work-catalog/market-sources";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";

export type DeltaKind = "new" | "changed" | "unchanged" | "skip";

export interface DeltaPreviewRow {
  workId: string;
  origin: MarketQuoteOriginId;
  regionCode: MarketRegionCode;
  kind: DeltaKind;
  existingPrice: number | null;
  incomingPrice: number | null;
  absDelta: number | null;
}

export interface DeltaPreviewReport {
  rows: DeltaPreviewRow[];
  counts: Record<DeltaKind, number>;
  /** Domyślny scope Publish: new + changed. */
  publishScopeQuoteKeys: string[];
}

const PRICE_EPS = 0.01;

function cellKey(workId: string, origin: string, region: string): string {
  return `${workId}::${origin}::${region}`;
}

export function buildMarketSyncDeltaPreview(
  catalog: WorkCatalogStore,
  dryRun: MarketCsvPreviewReport,
  region: WgdomCostRegion,
): DeltaPreviewReport {
  const slice = catalog.catalogs[region];
  const byWork = new Map(slice.works.map((w) => [w.id, w]));
  const rows: DeltaPreviewRow[] = [];
  const counts: Record<DeltaKind, number> = {
    new: 0,
    changed: 0,
    unchanged: 0,
    skip: 0,
  };
  const publishScopeQuoteKeys: string[] = [];

  for (const row of dryRun.matched) {
    if (!row.workId || !row.snapshot || !row.origin) {
      counts.skip += 1;
      rows.push({
        workId: row.workId ?? "",
        origin: (row.origin ?? "wgdom") as MarketQuoteOriginId,
        regionCode: (row.regionCode ?? region) as MarketRegionCode,
        kind: "skip",
        existingPrice: null,
        incomingPrice: row.price,
        absDelta: null,
      });
      continue;
    }

    const work = byWork.get(row.workId);
    const existing =
      work?.marketQuotes?.[row.origin as MarketQuoteOriginId]?.[row.snapshot.regionCode] ?? null;
    const incomingPrice = row.snapshot.price;

    let kind: DeltaKind;
    let existingPrice: number | null = null;
    let absDelta: number | null = null;

    if (!existing) {
      kind = "new";
    } else {
      existingPrice = existing.price;
      absDelta = Math.abs(existing.price - incomingPrice);
      kind = absDelta < PRICE_EPS ? "unchanged" : "changed";
    }

    rows.push({
      workId: row.workId,
      origin: row.origin as MarketQuoteOriginId,
      regionCode: row.snapshot.regionCode,
      kind,
      existingPrice,
      incomingPrice,
      absDelta,
    });
    counts[kind] += 1;
    if (kind === "new" || kind === "changed") {
      publishScopeQuoteKeys.push(cellKey(row.workId, String(row.origin), row.snapshot.regionCode));
    }
  }

  return { rows, counts, publishScopeQuoteKeys };
}

/** Filtruje Dry Run do new+changed (domyślny scope Publish). */
export function filterDryRunToPublishScope(
  dryRun: MarketCsvPreviewReport,
  delta: DeltaPreviewReport,
): MarketCsvPreviewReport {
  const scope = new Set(delta.publishScopeQuoteKeys);
  const matched = dryRun.matched.filter((row) => {
    if (!row.workId || !row.snapshot || !row.origin) return false;
    return scope.has(cellKey(row.workId, String(row.origin), row.snapshot.regionCode));
  });
  return {
    ...dryRun,
    matched,
    summary: {
      ...dryRun.summary,
      matched: matched.length,
    },
  };
}
