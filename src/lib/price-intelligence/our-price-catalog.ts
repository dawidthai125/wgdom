/**
 * PRICE-MEMORY-CATALOG-01 — handlowa warstwa nad Price Memory (pure helpers).
 * ZERO live HTTP · ZERO second price DB · base = lookupPriceMemory.
 */

import { DEFAULT_MATERIAL_MARKET_MAP, resolveDemandProductIdentityExact } from "@/lib/pricing-expert/material-market-map";
import { roundMarketPricePln } from "@/lib/work-catalog/market-sources";
import type {
  CatalogWork,
  CommercialPricing,
  WorkCatalogStore,
} from "@/lib/work-catalog/types";
import { getRegionSlice, indexWorksById } from "@/lib/work-catalog/catalog-work-utils";
import type { MaterialCacheUsability } from "./market-material-research-types";
import { evaluateMaterialCache } from "./market-material-research-cache";
import {
  invoicePurchaseMaterialKeyFromWorkId,
  isInvoicePurchaseCatalogWorkId,
} from "./invoice-purchase-host";
import { lookupPriceMemory, type PriceMemoryHit } from "./price-memory";

export const OUR_PRICE_CATALOG_PAGE_SIZE = 100;

export type OurPriceCatalogFreshnessFilter = "ALL" | MaterialCacheUsability;

export type OurPriceChangeStatus = "KNOWN" | "UNKNOWN";

export interface OurPriceChange {
  status: OurPriceChangeStatus;
  deltaPln: number | null;
  deltaPct: number | null;
  direction: "up" | "down" | "flat" | null;
  previousPrice: number | null;
}

export interface OurSourceCoverage {
  observed: number;
  expected: number;
  label: string;
  origins: string[];
}

export interface OurPriceCatalogRow {
  workId: string;
  materialKey: string;
  namePl: string;
  unit: string;
  basePrice: number;
  priceObservedAt: string;
  freshness: MaterialCacheUsability;
  marginPct: number | null;
  marginUnset: boolean;
  sellPrice: number | null;
  commercialPricing: CommercialPricing | undefined;
  priceChange: OurPriceChange;
  sourceCoverage: OurSourceCoverage;
  history: CatalogWork["marketQuoteHistory"];
  companyPricePln: number;
}

export function computeSellPricePln(
  basePrice: number,
  marginPct: number | null | undefined,
): number | null {
  if (!Number.isFinite(basePrice) || !(basePrice > 0)) return null;
  if (marginPct == null || !Number.isFinite(marginPct)) return null;
  return roundMarketPricePln(basePrice * (1 + marginPct / 100));
}

export function resolveMarginPct(work: CatalogWork | null | undefined): number | null {
  const m = work?.commercialPricing?.marginPct;
  if (m == null || !Number.isFinite(m)) return null;
  return m;
}

/** Global floor: MAX(existing, global). UNSET → global becomes value. */
export function applyGlobalMarginFloor(
  existingMarginPct: number | null | undefined,
  globalMarginPct: number,
): number {
  const g = Number(globalMarginPct);
  if (!Number.isFinite(g)) return existingMarginPct ?? 0;
  if (existingMarginPct == null || !Number.isFinite(existingMarginPct)) return g;
  return Math.max(existingMarginPct, g);
}

export function computePriceChangeFromHistory(
  currentPrice: number,
  history: CatalogWork["marketQuoteHistory"] | undefined,
  priceObservedAt: string,
): OurPriceChange {
  if (!Number.isFinite(currentPrice) || !(currentPrice > 0)) {
    return {
      status: "UNKNOWN",
      deltaPln: null,
      deltaPct: null,
      direction: null,
      previousPrice: null,
    };
  }
  const entries = [...(history ?? [])].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
  // Prefer previous observation older than current LAST timestamp
  let previous: number | null = null;
  for (const e of entries) {
    if (!(e.price > 0)) continue;
    if (priceObservedAt && e.updatedAt >= priceObservedAt) continue;
    if (Math.abs(e.price - currentPrice) < 1e-9) continue;
    previous = e.price;
    break;
  }
  // Fallback: last history entry that differs from current
  if (previous == null) {
    for (const e of entries) {
      if (!(e.price > 0)) continue;
      if (Math.abs(e.price - currentPrice) < 1e-9) continue;
      previous = e.price;
      break;
    }
  }
  if (previous == null || !(previous > 0)) {
    return {
      status: "UNKNOWN",
      deltaPln: null,
      deltaPct: null,
      direction: null,
      previousPrice: null,
    };
  }
  const deltaPln = roundMarketPricePln(currentPrice - previous);
  const deltaPct = ((currentPrice - previous) / previous) * 100;
  const direction =
    deltaPln > 0 ? "up" : deltaPln < 0 ? "down" : "flat";
  return {
    status: "KNOWN",
    deltaPln,
    deltaPct,
    direction,
    previousPrice: previous,
  };
}

const DIY_COVERAGE_ORIGINS = ["leroy", "castorama", "wgdom"] as const;
const DIY_LABEL: Record<string, string> = {
  leroy: "LM",
  castorama: "Castorama",
  wgdom: "OBI/WGDOM",
};

/**
 * Coverage honesty (C6): OBI maps to wgdom origin — do not invent `obi` enum.
 * Expected DIY trio slots = 3 when any DIY/market origin present; else observed/observed.
 */
export function computeSourceCoverage(work: CatalogWork | null | undefined): OurSourceCoverage {
  const quotes = work?.marketQuotes;
  const present: string[] = [];
  if (quotes) {
    for (const origin of DIY_COVERAGE_ORIGINS) {
      const regions = quotes[origin];
      if (!regions) continue;
      const has = Object.values(regions).some((s) => s && s.price > 0);
      if (has) present.push(origin);
    }
    if (present.length === 0) {
      for (const [origin, regions] of Object.entries(quotes)) {
        if (!regions || typeof regions !== "object") continue;
        const has = Object.values(regions as Record<string, { price?: number }>).some(
          (s) => s && typeof s.price === "number" && s.price > 0,
        );
        if (has) present.push(origin);
      }
    }
  }
  const invoiceHost = isInvoicePurchaseCatalogWorkId(work?.id ?? "");
  const hasDiyShop = present.includes("leroy") || present.includes("castorama");
  // Invoice purchase → honest observed/observed. DIY market → trio (OBI→wgdom slot).
  const expectedFinal = invoiceHost
    ? Math.max(present.length, 1)
    : hasDiyShop || present.includes("wgdom")
      ? 3
      : Math.max(present.length, 1);
  const observed = present.length;
  const labels = present.map((o) => DIY_LABEL[o] ?? o.toUpperCase());
  return {
    observed,
    expected: expectedFinal,
    label: `${observed}/${expectedFinal}`,
    origins: labels,
  };
}

function collectCandidateMaterialKeys(store: WorkCatalogStore): string[] {
  const keys = new Set<string>();
  for (const entry of DEFAULT_MATERIAL_MARKET_MAP) {
    if (entry.materialKey) keys.add(entry.materialKey);
  }
  const slice = getRegionSlice(store);
  for (const work of slice?.works ?? []) {
    const inv = invoicePurchaseMaterialKeyFromWorkId(work.id);
    if (inv) keys.add(inv);
    const fromKw = (work.keywords ?? []).find((k) => k.startsWith("mat."));
    if (fromKw) keys.add(fromKw);
    const idExact = resolveDemandProductIdentityExact({ catalogWorkId: work.id });
    if (idExact) keys.add(idExact.materialKey);
  }
  return [...keys];
}

function rowFromHit(
  hit: PriceMemoryHit,
  work: CatalogWork,
  freshness: MaterialCacheUsability,
): OurPriceCatalogRow {
  const marginPct = resolveMarginPct(work);
  return {
    workId: hit.workId,
    materialKey: hit.materialKey ?? work.id,
    namePl: work.namePl,
    unit: work.unit,
    basePrice: hit.price,
    priceObservedAt: hit.updatedAt,
    freshness,
    marginPct,
    marginUnset: marginPct == null,
    sellPrice: computeSellPricePln(hit.price, marginPct),
    commercialPricing: work.commercialPricing,
    priceChange: computePriceChangeFromHistory(
      hit.price,
      work.marketQuoteHistory,
      hit.updatedAt,
    ),
    sourceCoverage: computeSourceCoverage(work),
    history: work.marketQuoteHistory,
    companyPricePln: work.companyPricePln,
  };
}

/**
 * Build catalog rows from existing Price Memory only (ZERO HTTP).
 * Dedup by workId — one commercial host row per Price Memory work.
 */
export function buildOurPriceCatalogRows(opts: {
  store: WorkCatalogStore;
  nowMs?: number;
  search?: string;
  freshnessFilter?: OurPriceCatalogFreshnessFilter;
}): OurPriceCatalogRow[] {
  const nowMs = opts.nowMs ?? Date.now();
  const slice = getRegionSlice(opts.store);
  const worksById = indexWorksById(slice?.works ?? []);
  const keys = collectCandidateMaterialKeys(opts.store);
  const byWork = new Map<string, OurPriceCatalogRow>();

  for (const materialKey of keys) {
    const cache = evaluateMaterialCache({
      materialKey,
      worksById,
      nowMs,
      region: opts.store.activeRegion,
    });
    if (cache.usability === "MISSING" || !cache.hit) continue;
    const work = worksById.get(cache.hit.workId);
    if (!work) continue;
    if (byWork.has(work.id)) continue;
    byWork.set(work.id, rowFromHit(cache.hit, work, cache.usability));
  }

  // Catch hosts with quotes not reachable via collected keys
  for (const work of slice?.works ?? []) {
    if (byWork.has(work.id)) continue;
    if (!work.marketQuotes || Object.keys(work.marketQuotes).length === 0) continue;
    const identity = resolveDemandProductIdentityExact({ catalogWorkId: work.id });
    const materialKey =
      identity?.materialKey ??
      invoicePurchaseMaterialKeyFromWorkId(work.id) ??
      work.id;
    const lookup = lookupPriceMemory({
      materialKey,
      catalogWorkId: work.id,
      worksById,
      nowMs,
      region: opts.store.activeRegion,
    });
    if (lookup.status !== "HIT") continue;
    const cache = evaluateMaterialCache({
      materialKey,
      catalogWorkId: work.id,
      worksById,
      nowMs,
      region: opts.store.activeRegion,
    });
    byWork.set(work.id, rowFromHit(lookup.hit, work, cache.usability));
  }

  let rows = [...byWork.values()].sort((a, b) =>
    a.namePl.localeCompare(b.namePl, "pl"),
  );

  const q = (opts.search ?? "").trim().toLowerCase();
  if (q) {
    rows = rows.filter(
      (r) =>
        r.namePl.toLowerCase().includes(q) ||
        r.materialKey.toLowerCase().includes(q) ||
        r.workId.toLowerCase().includes(q),
    );
  }

  const ff = opts.freshnessFilter ?? "ALL";
  if (ff !== "ALL") {
    rows = rows.filter((r) => r.freshness === ff);
  }

  return rows;
}

export function paginateOurPriceCatalogRows<T>(
  rows: readonly T[],
  page: number,
  pageSize = OUR_PRICE_CATALOG_PAGE_SIZE,
): { page: number; pageSize: number; total: number; totalPages: number; items: T[] } {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    pageSize,
    total,
    totalPages,
    items: rows.slice(start, start + pageSize) as T[],
  };
}

export function patchWorkCommercialPricing(
  store: WorkCatalogStore,
  workId: string,
  marginPct: number,
  updatedAtIso: string,
  source: CommercialPricing["source"] = "owner",
): WorkCatalogStore | null {
  const region = store.activeRegion;
  const slice = store.catalogs[region];
  const idx = slice.works.findIndex((w) => w.id === workId);
  if (idx < 0) return null;
  const work = slice.works[idx]!;
  const nextWork: CatalogWork = {
    ...work,
    commercialPricing: {
      marginPct: Math.max(0, Math.min(1000, marginPct)),
      updatedAt: updatedAtIso,
      source,
    },
  };
  const nextWorks = [...slice.works];
  nextWorks[idx] = nextWork;
  return {
    ...store,
    catalogs: {
      ...store.catalogs,
      [region]: { ...slice, works: nextWorks, updatedAt: updatedAtIso },
    },
    updatedAt: updatedAtIso,
  };
}

/**
 * Apply global min margin to listed workIds (MAX semantics).
 * Does NOT touch companyPricePln / marketQuotes / Bid minMargin.
 */
export function applyGlobalCommercialMarginFloorToStore(
  store: WorkCatalogStore,
  workIds: readonly string[],
  globalMarginPct: number,
  updatedAtIso: string,
): WorkCatalogStore {
  let next = store;
  for (const workId of workIds) {
    const region = next.activeRegion;
    const work = next.catalogs[region].works.find((w) => w.id === workId);
    if (!work) continue;
    const existing = resolveMarginPct(work);
    const newMargin = applyGlobalMarginFloor(existing, globalMarginPct);
    if (existing != null && Math.abs(existing - newMargin) < 1e-9) continue;
    const patched = patchWorkCommercialPricing(next, workId, newMargin, updatedAtIso, "owner");
    if (patched) next = patched;
  }
  return next;
}
