/**
 * DEMAND-RESEARCH-01 S1-A — PRICE MEMORY lookup / reuse / history helpers (pure + thin I/O).
 * LAST SSOT = marketQuotes · HISTORY = CatalogWork.marketQuoteHistory ring · 0 fuzzy · 0 LLM.
 */

import {
  deriveMarketQuoteFreshness,
} from "@/lib/pricing-expert/market-freshness";
import {
  mapMaterialToMarketWork,
  preferProductCatalogWorkId,
  resolveDemandProductIdentityExact,
} from "@/lib/pricing-expert/material-market-map";
import { resolveMarketLayerForDemand } from "./demand-resolve-layer";
import {
  loadPriceDemandStoreLocal,
  savePriceDemandStoreLocal,
} from "./demand-record";
import type { PriceDemandRecord } from "./demand-types";
import {
  MARKET_QUOTE_ORIGIN_IDS,
  MARKET_ORIGIN_IDS,
  isMarketQuoteOriginId,
  isMarketCoverage,
  isMarketOriginId,
  type MarketCoverage,
  type MarketQuoteOriginId,
  type MarketSourceSnapshot,
} from "@/lib/work-catalog/market-sources";
import {
  isMarketRegionCode,
  marketRegionFallbackChain,
  type MarketRegionCode,
} from "@/lib/work-catalog/market-regions";
import { workFreshnessStaleAfterMs } from "@/lib/work-catalog/freshness";
import type { CatalogWork, MarketQuoteHistoryEntry, WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import {
  findMapping,
  type MarketWorkMappingStore,
} from "@/lib/work-catalog/market-work-mapping";
import { TRADE_LABELS_PL } from "@/lib/work-catalog/trades";

export const MARKET_QUOTE_HISTORY_CAP = 24;

/** UX-only buckets — semantyka PE 90d bez zmian. */
export type PriceMemoryFreshnessUx = "fresh" | "usable" | "stale";

export type PriceMemoryConfidenceLabel =
  | "EXACT"
  | "HIGH"
  | "MEDIUM"
  | "LOW"
  | "UNKNOWN";

export interface PriceMemoryHit {
  workId: string;
  materialKey: string | null;
  price: number;
  origin: MarketQuoteOriginId;
  region: MarketRegionCode;
  updatedAt: string;
  confidence: number;
  coverage: MarketCoverage;
  confidenceLabel: PriceMemoryConfidenceLabel;
  freshnessUx: PriceMemoryFreshnessUx;
  sourceLabelPl: string;
}

export type PriceMemoryLookupResult =
  | { status: "HIT"; hit: PriceMemoryHit }
  | { status: "MISS"; reason: "no_identity" | "no_quote" };

export interface PriceMemoryLookupInput {
  catalogWorkId?: string | null;
  materialKey?: string | null;
  region?: string | null;
  worksById: ReadonlyMap<string, CatalogWork>;
  /** Opcjonalnie — exact MarketWorkMapping (origin+externalId), nie fuzzy. */
  mappingStore?: MarketWorkMappingStore | null;
  mappingOrigin?: string | null;
  mappingExternalId?: string | null;
  nowMs?: number;
  materialMap?: readonly MaterialMarketMapEntry[];
}

const ORIGIN_LABEL_PL: Partial<Record<MarketQuoteOriginId, string>> = {
  leroy: "Leroy Merlin",
  castorama: "Castorama",
  wgdom: "WGDOM",
  kb_pl: "KB.pl",
  interbud: "Interbud",
  sekocenbud: "Sekocenbud",
  legacy_seed: "Legacy",
};

const MS_DAY = 24 * 60 * 60 * 1000;
/** UX-only: Fresh < 30d; Usable < 90d (PE stale); Stale ≥ 90d. */
const UX_FRESH_DAYS = 30;

function trimStr(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function resolveRegionCode(region: string | null | undefined): MarketRegionCode {
  const r = trimStr(region) || "wroclaw";
  if (isMarketRegionCode(r)) return r;
  if (r === "dolny_slask" || r === "dolny-slask") return "dolnyslask";
  return "wroclaw";
}

export function marketQuoteOriginLabelPl(origin: MarketQuoteOriginId): string {
  return ORIGIN_LABEL_PL[origin] ?? origin;
}

export function derivePriceMemoryFreshnessUx(
  updatedAt: string,
  nowMs: number,
): PriceMemoryFreshnessUx {
  const pe = deriveMarketQuoteFreshness(updatedAt, nowMs);
  if (pe === "missing" || pe === "stale") return "stale";
  const t = Date.parse(updatedAt);
  if (!Number.isFinite(t)) return "stale";
  const age = nowMs - t;
  if (age < UX_FRESH_DAYS * MS_DAY) return "fresh";
  if (age < workFreshnessStaleAfterMs()) return "usable";
  return "stale";
}

/**
 * Mapowanie 0–1 → UX label. Nie bump za „poprzedni tender”.
 */
export function mapConfidenceToUxLabel(
  confidence: number,
  coverage: MarketCoverage,
  freshnessUx: PriceMemoryFreshnessUx,
): PriceMemoryConfidenceLabel {
  if (!Number.isFinite(confidence) || confidence < 0) return "UNKNOWN";
  if (confidence >= 0.85 && coverage === "full" && freshnessUx === "fresh") return "EXACT";
  if (confidence >= 0.7 && freshnessUx !== "stale") return "HIGH";
  if (confidence >= 0.5) return "MEDIUM";
  if (confidence > 0) return "LOW";
  return "UNKNOWN";
}

function workHasQuoteCell(work: CatalogWork | null | undefined): boolean {
  if (!work?.marketQuotes) return false;
  return Object.keys(work.marketQuotes).length > 0;
}

/** Prefer DIY research origins, potem product (wgdom…), potem legacy. */
function pickBestQuoteCell(
  work: CatalogWork,
  startRegion: MarketRegionCode,
): { origin: MarketQuoteOriginId; region: MarketRegionCode; snap: MarketSourceSnapshot } | null {
  const chain = marketRegionFallbackChain(startRegion);
  const originOrder: MarketQuoteOriginId[] = [
    "leroy",
    "castorama",
    ...MARKET_ORIGIN_IDS,
    "legacy_seed",
  ];
  const seen = new Set<string>();
  for (const origin of originOrder) {
    if (!isMarketQuoteOriginId(origin)) continue;
    if (seen.has(origin)) continue;
    seen.add(origin);
    const per = work.marketQuotes?.[origin];
    if (!per) continue;
    for (const region of chain) {
      const snap = per[region];
      if (snap && snap.price > 0 && Number.isFinite(snap.price)) {
        return { origin, region, snap };
      }
    }
  }
  for (const origin of MARKET_QUOTE_ORIGIN_IDS) {
    if (seen.has(origin)) continue;
    const per = work.marketQuotes?.[origin];
    if (!per) continue;
    for (const region of chain) {
      const snap = per[region];
      if (snap && snap.price > 0) return { origin, region, snap };
    }
  }
  return null;
}

function resolveWorkId(
  input: PriceMemoryLookupInput,
): { workId: string; materialKey: string | null } | null {
  const mk = trimStr(input.materialKey) || null;
  const cw = trimStr(input.catalogWorkId);
  if (cw && input.worksById.has(cw)) {
    return { workId: cw, materialKey: mk };
  }

  if (mk) {
    const identity = resolveDemandProductIdentityExact({ materialKey: mk });
    if (identity) {
      const w = input.worksById.get(identity.catalogWorkId);
      if (workHasQuoteCell(w)) {
        return { workId: identity.catalogWorkId, materialKey: identity.materialKey };
      }
      if (input.worksById.has(identity.catalogWorkId)) {
        return { workId: identity.catalogWorkId, materialKey: identity.materialKey };
      }
    }
    const map = mapMaterialToMarketWork(mk);
    if (map) {
      const preferred = preferProductCatalogWorkId(map);
      const pref = input.worksById.get(preferred);
      if (workHasQuoteCell(pref)) return { workId: preferred, materialKey: mk };
      for (const id of map.candidateWorkIds ?? []) {
        const w = input.worksById.get(id);
        if (workHasQuoteCell(w)) return { workId: id, materialKey: mk };
      }
      const w = input.worksById.get(map.workId);
      if (workHasQuoteCell(w)) return { workId: map.workId, materialKey: mk };
      if (input.worksById.has(preferred)) return { workId: preferred, materialKey: mk };
      if (input.worksById.has(map.workId)) return { workId: map.workId, materialKey: mk };
    }
  }

  const origin = trimStr(input.mappingOrigin);
  const externalId = trimStr(input.mappingExternalId);
  if (input.mappingStore && origin && externalId && isMarketOriginId(origin)) {
    const found = findMapping(input.mappingStore, origin, externalId);
    if (found?.mapping?.workId && input.worksById.has(found.mapping.workId)) {
      return { workId: found.mapping.workId, materialKey: mk };
    }
  }

  return null;
}

export function lookupPriceMemory(input: PriceMemoryLookupInput): PriceMemoryLookupResult {
  const nowMs = input.nowMs ?? Date.now();
  const startRegion = resolveRegionCode(input.region);
  const resolved = resolveWorkId(input);
  if (!resolved) return { status: "MISS", reason: "no_identity" };

  const work = input.worksById.get(resolved.workId);
  if (!workHasQuoteCell(work)) return { status: "MISS", reason: "no_quote" };

  const cell = pickBestQuoteCell(work!, startRegion);
  if (!cell) return { status: "MISS", reason: "no_quote" };

  const freshnessUx = derivePriceMemoryFreshnessUx(cell.snap.updatedAt, nowMs);
  const confidenceLabel = mapConfidenceToUxLabel(
    cell.snap.confidence,
    cell.snap.coverage,
    freshnessUx,
  );

  return {
    status: "HIT",
    hit: {
      workId: resolved.workId,
      materialKey: resolved.materialKey,
      price: cell.snap.price,
      origin: cell.origin,
      region: cell.region,
      updatedAt: cell.snap.updatedAt,
      confidence: cell.snap.confidence,
      coverage: cell.snap.coverage,
      confidenceLabel,
      freshnessUx,
      sourceLabelPl: marketQuoteOriginLabelPl(cell.origin),
    },
  };
}

export interface ResearchBrief {
  normalizedName: string;
  materialKey: string;
  catalogWorkId: string | null;
  unit: string;
  region: string;
  tradeLabelPl: string | null;
  missingLayer: string;
  hintPl: string;
}

export function buildManualResearchBrief(
  demand: PriceDemandRecord,
  work?: CatalogWork | null,
): ResearchBrief {
  return {
    normalizedName: demand.normalizedName || demand.materialKey,
    materialKey: demand.materialKey,
    catalogWorkId: demand.catalogWorkId,
    unit: demand.unit || "",
    region: demand.region || "wroclaw",
    tradeLabelPl: work?.tradeId ? TRADE_LABELS_PL[work.tradeId] ?? work.tradeId : null,
    missingLayer: demand.missingLayer,
    hintPl:
      "Wpisz cenę netto z legalnego źródła (sklep / oferta / faktura własna → Purchase osobno). Bez automatycznego pobierania.",
  };
}

/**
 * UŻYJ TEJ CENY — resolve MARKET demand · ZERO Quotes rewrite · ZERO HTTP.
 */
export function useExistingMarketPrice(opts: {
  materialKey: string;
  catalogWorkId: string | null;
  region: string;
  resolvedAt?: string;
}): {
  ok: true;
  wroteQuotes: false;
  wroteCompanyKnowledge: false;
  wrotePurchase: false;
  demandResolved: boolean;
  demandChanged: boolean;
} {
  const resolvedAt = opts.resolvedAt ?? new Date().toISOString();
  const store = loadPriceDemandStoreLocal();
  const result = resolveMarketLayerForDemand(store, {
    materialKey: opts.materialKey,
    catalogWorkId: opts.catalogWorkId,
    region: opts.region || "wroclaw",
    resolvedAt,
  });
  if (result.changed) savePriceDemandStoreLocal(result.store);
  return {
    ok: true,
    wroteQuotes: false,
    wroteCompanyKnowledge: false,
    wrotePurchase: false,
    demandResolved: result.resolved > 0,
    demandChanged: result.changed,
  };
}

/** Pure variant for tests (in-memory demand store). */
export function useExistingMarketPricePure(opts: {
  demandStore: import("./demand-types").PriceDemandStore;
  materialKey: string;
  catalogWorkId: string | null;
  region: string;
  resolvedAt: string;
}): {
  wroteQuotes: false;
  nextDemandStore: import("./demand-types").PriceDemandStore;
  demandResolved: boolean;
  demandChanged: boolean;
} {
  const result = resolveMarketLayerForDemand(opts.demandStore, {
    materialKey: opts.materialKey,
    catalogWorkId: opts.catalogWorkId,
    region: opts.region || "wroclaw",
    resolvedAt: opts.resolvedAt,
  });
  return {
    wroteQuotes: false,
    nextDemandStore: result.store,
    demandResolved: result.resolved > 0,
    demandChanged: result.changed,
  };
}

function historyDayKey(iso: string): string {
  const d = iso.includes("T") ? iso.slice(0, 10) : iso.slice(0, 10);
  return d || iso;
}

export function isMarketQuoteHistoryDuplicate(
  a: Pick<MarketQuoteHistoryEntry, "price" | "origin" | "regionCode" | "updatedAt">,
  b: Pick<MarketQuoteHistoryEntry, "price" | "origin" | "regionCode" | "updatedAt">,
): boolean {
  return (
    a.price === b.price &&
    a.origin === b.origin &&
    a.regionCode === b.regionCode &&
    historyDayKey(a.updatedAt) === historyDayKey(b.updatedAt)
  );
}

export function listMarketQuoteHistoryForCell(
  history: readonly MarketQuoteHistoryEntry[] | undefined,
  workId: string,
  origin: MarketQuoteOriginId,
  regionCode: MarketRegionCode,
): MarketQuoteHistoryEntry[] {
  return (history ?? [])
    .filter((e) => e.workId === workId && e.origin === origin && e.regionCode === regionCode)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
}

/**
 * Append poprzedni LAST do ring (cap 24 per workId|origin|region). Duplicate day → no-op.
 */
export function appendMarketQuoteHistoryEntry(
  existing: readonly MarketQuoteHistoryEntry[] | undefined,
  entry: MarketQuoteHistoryEntry,
): MarketQuoteHistoryEntry[] {
  const all = [...(existing ?? [])];
  const ring = listMarketQuoteHistoryForCell(all, entry.workId, entry.origin, entry.regionCode);
  if (ring.some((e) => isMarketQuoteHistoryDuplicate(e, entry))) {
    return all;
  }
  const other = all.filter(
    (e) =>
      !(e.workId === entry.workId && e.origin === entry.origin && e.regionCode === entry.regionCode),
  );
  const nextRing = [...ring, entry].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  const pruned =
    nextRing.length > MARKET_QUOTE_HISTORY_CAP
      ? nextRing.slice(nextRing.length - MARKET_QUOTE_HISTORY_CAP)
      : nextRing;
  return [...other, ...pruned];
}

export function snapshotToHistoryEntry(
  workId: string,
  snap: MarketSourceSnapshot,
): MarketQuoteHistoryEntry {
  return {
    workId,
    price: snap.price,
    origin: snap.origin,
    regionCode: snap.regionCode,
    updatedAt: snap.updatedAt,
    confidence: snap.confidence,
    coverage: snap.coverage,
  };
}

export function readQuoteCell(
  work: CatalogWork | null | undefined,
  origin: MarketQuoteOriginId,
  regionCode: MarketRegionCode,
): MarketSourceSnapshot | null {
  const snap = work?.marketQuotes?.[origin]?.[regionCode];
  if (!snap || !(snap.price > 0)) return null;
  return snap;
}

export function normalizeMarketQuoteHistory(
  raw: unknown,
  workId: string,
): MarketQuoteHistoryEntry[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: MarketQuoteHistoryEntry[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const e = row as Partial<MarketQuoteHistoryEntry>;
    const origin = isMarketQuoteOriginId(e.origin) ? e.origin : null;
    const regionCode = isMarketRegionCode(e.regionCode) ? e.regionCode : null;
    const coverage = isMarketCoverage(e.coverage) ? e.coverage : null;
    const price = Number(e.price);
    const confidence = Number(e.confidence);
    const updatedAt = typeof e.updatedAt === "string" ? e.updatedAt.trim() : "";
    const wid = typeof e.workId === "string" && e.workId.trim() ? e.workId.trim() : workId;
    if (!origin || !regionCode || !coverage || !updatedAt) continue;
    if (!Number.isFinite(price) || !(price > 0)) continue;
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) continue;
    out.push({
      workId: wid,
      price,
      origin,
      regionCode,
      updatedAt,
      confidence,
      coverage,
    });
  }
  return out.length > 0 ? out : undefined;
}

export function catalogSliceForRegion(region: string): WgdomCostRegion {
  const r = resolveRegionCode(region);
  return r === "dolnyslask" ? "dolnyslask" : "wroclaw";
}

export interface PreviousQuoteCell {
  workId: string;
  origin: MarketQuoteOriginId;
  regionCode: MarketRegionCode;
  snap: MarketSourceSnapshot;
}

/** Odczyt poprzedniego LAST przed ACCEPT (dla A2 history). */
export function collectPreviousQuoteCellsForPreview(
  store: WorkCatalogStore,
  matched: ReadonlyArray<{
    workId?: string | null;
    origin?: MarketQuoteOriginId | string | null;
    regionCode?: MarketRegionCode | string | null;
    snapshot?: MarketSourceSnapshot | null;
  }>,
  catalogRegion: WgdomCostRegion,
): PreviousQuoteCell[] {
  const works = store.catalogs[catalogRegion]?.works ?? [];
  const byId = new Map(works.map((w) => [w.id, w]));
  const out: PreviousQuoteCell[] = [];
  const seen = new Set<string>();
  for (const row of matched) {
    const workId = trimStr(row.workId);
    const origin = isMarketQuoteOriginId(row.origin) ? row.origin : null;
    const regionCode = isMarketRegionCode(row.regionCode)
      ? row.regionCode
      : row.snapshot?.regionCode && isMarketRegionCode(row.snapshot.regionCode)
        ? row.snapshot.regionCode
        : null;
    if (!workId || !origin || !regionCode) continue;
    const key = `${workId}|${origin}|${regionCode}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const prev = readQuoteCell(byId.get(workId), origin, regionCode);
    if (prev) out.push({ workId, origin, regionCode, snap: prev });
  }
  return out;
}

/**
 * A2 — po udanym update LAST: poprzedni LAST → history (cap 24).
 * Duplikat previous↔new (ten sam dzień) → no-op dla tej komórki.
 */
export function archivePreviousQuotesIntoHistory(
  store: WorkCatalogStore,
  previousCells: readonly PreviousQuoteCell[],
  catalogRegion: WgdomCostRegion,
): { store: WorkCatalogStore; appended: number } {
  if (previousCells.length === 0) {
    return { store, appended: 0 };
  }
  const slice = store.catalogs[catalogRegion];
  if (!slice) return { store, appended: 0 };

  let appended = 0;
  const nextWorks = slice.works.map((work) => {
    const forWork = previousCells.filter((c) => c.workId === work.id);
    if (forWork.length === 0) return work;
    let history = [...(work.marketQuoteHistory ?? [])];
    let changed = false;
    for (const cell of forWork) {
      const nextSnap = readQuoteCell(work, cell.origin, cell.regionCode);
      if (
        nextSnap &&
        isMarketQuoteHistoryDuplicate(
          {
            price: cell.snap.price,
            origin: cell.origin,
            regionCode: cell.regionCode,
            updatedAt: cell.snap.updatedAt,
          },
          {
            price: nextSnap.price,
            origin: cell.origin,
            regionCode: cell.regionCode,
            updatedAt: nextSnap.updatedAt,
          },
        )
      ) {
        continue;
      }
      const before = history.length;
      history = appendMarketQuoteHistoryEntry(
        history,
        snapshotToHistoryEntry(cell.workId, cell.snap),
      );
      if (history.length !== before) {
        appended += 1;
        changed = true;
      }
    }
    if (!changed) return work;
    return {
      ...work,
      marketQuoteHistory: history.length > 0 ? history : undefined,
    };
  });

  if (appended === 0) return { store, appended: 0 };
  return {
    store: {
      ...store,
      catalogs: {
        ...store.catalogs,
        [catalogRegion]: { ...slice, works: nextWorks },
      },
    },
    appended,
  };
}

export function priceMemoryFreshnessLabelPl(ux: PriceMemoryFreshnessUx): string {
  if (ux === "fresh") return "Fresh";
  if (ux === "usable") return "Usable";
  return "Stale";
}
