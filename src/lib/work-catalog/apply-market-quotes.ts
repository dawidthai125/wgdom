/**
 * WC-P3.2-S1 — Apply Market Quotes (pure, merge-not-replace).
 *
 * Nakłada snapshoty z raportu PREVIEW (S4) na `CatalogWork.marketQuotes` w wybranym
 * region-slice store'a. Granularność merge: `origin` + `regionCode`.
 *
 * Pure · deterministyczny · idempotentny · ZERO I/O / localStorage / cloud / runtime / UI.
 * NIE modyfikuje `updatedAt` (work/store) — bump należy do warstwy commit (S3).
 */

import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import { MARKET_REGION_CODES, type MarketRegionCode } from "@/lib/work-catalog/market-regions";
import type { MarketCsvPreviewReport } from "@/lib/work-catalog/market-csv-preview";
import {
  MARKET_QUOTE_ORIGIN_IDS,
  normalizeWorkMarketQuotes,
  type MarketQuoteOriginId,
  type MarketSourceSnapshot,
  type WorkMarketQuotes,
} from "@/lib/work-catalog/market-sources";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";

/** Stały fallback determinizmu (snapshoty niosą własny `updatedAt`). */
const APPLY_FALLBACK_UPDATED_AT = "2026-06-13T00:00:00.000Z";

export interface ApplyMarketQuotesOptions {
  /** Region-slice store'a do aktualizacji. Domyślnie `store.activeRegion`. */
  region?: WgdomCostRegion;
}

export interface ApplyMarketQuotesReport {
  region: WgdomCostRegion;
  worksTouched: number;
  cellsAdded: number;
  cellsOverwritten: number;
  cellsKept: number;
  entriesApplied: number;
  entriesSkippedNoWork: number;
  entriesSkippedNoSnapshot: number;
}

export interface MergeWorkMarketQuotesResult {
  quotes: WorkMarketQuotes | undefined;
  added: number;
  overwritten: number;
  kept: number;
}

function parseMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Polityka kolizji (origin+region) — DESIGN FREEZE D-A:
 *  1. brak wpisu → dodaj
 *  2. nowszy `updatedAt` → wygrywa
 *  3. remis `updatedAt` → wygrywa większy `confidence`
 *  4. pełny remis → zachowaj istniejący
 */
function incomingWins(incoming: MarketSourceSnapshot, existing: MarketSourceSnapshot): boolean {
  const inTs = parseMs(incoming.updatedAt);
  const exTs = parseMs(existing.updatedAt);
  if (inTs > exTs) return true;
  if (inTs < exTs) return false;
  return incoming.confidence > existing.confidence;
}

/** Kanoniczne przebudowanie mapy (origin × region w stałej kolejności) → stabilny fingerprint. */
function canonicalizeQuotes(
  cells: Map<MarketQuoteOriginId, Map<MarketRegionCode, MarketSourceSnapshot>>,
): WorkMarketQuotes {
  const out: WorkMarketQuotes = {};
  for (const origin of MARKET_QUOTE_ORIGIN_IDS) {
    const regionMap = cells.get(origin);
    if (!regionMap || regionMap.size === 0) continue;
    const perRegion: Partial<Record<MarketRegionCode, MarketSourceSnapshot>> = {};
    for (const region of MARKET_REGION_CODES) {
      const snap = regionMap.get(region);
      if (snap) perRegion[region] = snap;
    }
    out[origin] = perRegion;
  }
  return out;
}

function toCellMap(
  quotes: WorkMarketQuotes | undefined,
): Map<MarketQuoteOriginId, Map<MarketRegionCode, MarketSourceSnapshot>> {
  const cells = new Map<MarketQuoteOriginId, Map<MarketRegionCode, MarketSourceSnapshot>>();
  if (!quotes) return cells;
  for (const origin of MARKET_QUOTE_ORIGIN_IDS) {
    const perRegion = quotes[origin];
    if (!perRegion) continue;
    const regionMap = new Map<MarketRegionCode, MarketSourceSnapshot>();
    for (const region of MARKET_REGION_CODES) {
      const snap = perRegion[region];
      if (snap) regionMap.set(region, snap);
    }
    if (regionMap.size > 0) cells.set(origin, regionMap);
  }
  return cells;
}

/** Merge-not-replace pojedynczej roboty: nakłada snapshoty wg polityki D-A. */
export function mergeWorkMarketQuotes(
  existing: WorkMarketQuotes | undefined,
  incoming: readonly MarketSourceSnapshot[],
): MergeWorkMarketQuotesResult {
  const cells = toCellMap(existing);
  let added = 0;
  let overwritten = 0;
  let kept = 0;

  // Determinizm niezależny od kolejności wejścia: sort po origin, potem region.
  const sorted = [...incoming].sort((a, b) => {
    if (a.origin !== b.origin) return a.origin.localeCompare(b.origin);
    return a.regionCode.localeCompare(b.regionCode);
  });

  for (const snap of sorted) {
    let regionMap = cells.get(snap.origin);
    if (!regionMap) {
      regionMap = new Map<MarketRegionCode, MarketSourceSnapshot>();
      cells.set(snap.origin, regionMap);
    }
    const current = regionMap.get(snap.regionCode);
    if (!current) {
      regionMap.set(snap.regionCode, snap);
      added += 1;
    } else if (incomingWins(snap, current)) {
      regionMap.set(snap.regionCode, snap);
      overwritten += 1;
    } else {
      kept += 1;
    }
  }

  const quotes = normalizeWorkMarketQuotes(canonicalizeQuotes(cells), APPLY_FALLBACK_UPDATED_AT);
  return { quotes, added, overwritten, kept };
}

function collectPreviewSnapshots(
  preview: MarketCsvPreviewReport,
): { byWorkId: Map<string, MarketSourceSnapshot[]>; skippedNoSnapshot: number } {
  const byWorkId = new Map<string, MarketSourceSnapshot[]>();
  let skippedNoSnapshot = 0;

  const buckets = [preview.matched, preview.lowConfidence, preview.unmatched, preview.rejected];
  for (const bucket of buckets) {
    for (const row of bucket) {
      if (!row.workId || !row.snapshot) {
        skippedNoSnapshot += 1;
        continue;
      }
      const list = byWorkId.get(row.workId) ?? [];
      list.push(row.snapshot);
      byWorkId.set(row.workId, list);
    }
  }

  return { byWorkId, skippedNoSnapshot };
}

/**
 * Nakłada snapshoty PREVIEW na `marketQuotes` robót w `options.region` (domyślnie
 * `store.activeRegion`). Merge-not-replace na granularności origin+region.
 * Zwraca NOWY store (immutable) + raport. Idempotentny.
 */
export function applyMarketQuotesFromPreview(
  store: WorkCatalogStore,
  preview: MarketCsvPreviewReport,
  options: ApplyMarketQuotesOptions = {},
): { store: WorkCatalogStore; report: ApplyMarketQuotesReport } {
  const region = options.region ?? store.activeRegion;
  const slice = store.catalogs[region];

  const { byWorkId, skippedNoSnapshot } = collectPreviewSnapshots(preview);

  const report: ApplyMarketQuotesReport = {
    region,
    worksTouched: 0,
    cellsAdded: 0,
    cellsOverwritten: 0,
    cellsKept: 0,
    entriesApplied: 0,
    entriesSkippedNoWork: 0,
    entriesSkippedNoSnapshot: skippedNoSnapshot,
  };

  const workIds = new Set(slice.works.map((w) => w.id));
  for (const [workId, snaps] of byWorkId) {
    if (!workIds.has(workId)) report.entriesSkippedNoWork += snaps.length;
    else report.entriesApplied += snaps.length;
  }

  const nextWorks: CatalogWork[] = slice.works.map((work) => {
    const incoming = byWorkId.get(work.id);
    if (!incoming || incoming.length === 0) return work;

    const merged = mergeWorkMarketQuotes(work.marketQuotes, incoming);
    report.cellsAdded += merged.added;
    report.cellsOverwritten += merged.overwritten;
    report.cellsKept += merged.kept;

    if (merged.added + merged.overwritten === 0) return work;
    report.worksTouched += 1;
    return { ...work, marketQuotes: merged.quotes };
  });

  if (report.worksTouched === 0) {
    return { store, report };
  }

  const nextStore: WorkCatalogStore = {
    ...store,
    catalogs: {
      ...store.catalogs,
      [region]: { ...slice, works: nextWorks },
    },
  };

  return { store: nextStore, report };
}
