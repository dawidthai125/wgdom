/**
 * Biblioteka Robót i Cennik v3.0 — persystencja lokalna WorkCatalogStore (P1.7).
 * Wyłącznie localStorage — bez cloud-sync / upload / download.
 */

import type { WgdomCostCategoryId, WgdomCostRegion, WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import {
  MARKET_LEGACY_SEED_ORIGIN_ID,
  isMarketCoverage,
  isMarketQuoteOriginId,
  normalizeWorkMarketQuotes,
  type WorkMarketQuotes,
} from "@/lib/work-catalog/market-sources";
import { isMarketRegionCode } from "@/lib/work-catalog/market-regions";
import { isTradeId, TRADE_IDS, type TradeId } from "@/lib/work-catalog/trades";
import { defaultWorkCatalogStore } from "@/lib/work-catalog/work-catalog-migrate";
import {
  WORK_CATALOG_SCHEMA_VERSION,
  type CatalogWork,
  type CommercialPricing,
  type CommercialPricingSource,
  type MarketQuoteHistoryEntry,
  type WorkCatalogRegionSlice,
  type WorkCatalogSource,
  type WorkCatalogStore,
  type WorkCostSplit,
  type WorkFreshnessStatus,
} from "@/lib/work-catalog/types";

export const WORK_CATALOG_STORAGE_KEY = "kw-wgdom-work-catalog";

/** Stała domyślna `updatedAt` (determinizm normalize — bez Date.now()). */
export const WORK_CATALOG_DEFAULT_UPDATED_AT = "2026-06-13T00:00:00.000Z";

const VALID_UNITS: WgdomCostUnit[] = ["m2", "mb", "szt", "rbh", "m3", "kpl", "kg", "l"];
const VALID_FRESHNESS: WorkFreshnessStatus[] = ["ok", "stale", "missing"];
const VALID_SOURCES: WorkCatalogSource[] = ["seed", "custom", "copied"];
const LEGACY_CATEGORY_SET = new Set<WgdomCostCategoryId>([
  ...(["ROZBIORKI", "ROBOTY_OGOLNOBUDOWLANE", "TRANSPORT_UTYLIZACJA", "GK", "GLADZIE_TYNKI", "MALOWANIE", "GLAZURA", "PODLOGI", "ELEKTRYKA", "INSTALACJE_GAZ", "INSTALACJE_CO", "HYDRAULIKA", "WENTYLACJA", "STOLARKA", "WYPOSAZENIE", "UNKNOWN"] as WgdomCostCategoryId[]),
]);

export interface SaveWorkCatalogStoreLocalOptions {
  /** Jawny znacznik zapisu (testy); prod może pominąć → Date.now() w save. */
  updatedAtIso?: string;
}

function parseUpdatedAtMs(iso: string | undefined | null): number {
  if (!iso?.trim()) return 0;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : 0;
}

function isValidUnit(value: unknown): value is WgdomCostUnit {
  return typeof value === "string" && (VALID_UNITS as readonly string[]).includes(value);
}

function isValidFreshness(value: unknown): value is WorkFreshnessStatus {
  return typeof value === "string" && (VALID_FRESHNESS as readonly string[]).includes(value as WorkFreshnessStatus);
}

function isValidSource(value: unknown): value is WorkCatalogSource {
  return typeof value === "string" && (VALID_SOURCES as readonly string[]).includes(value as WorkCatalogSource);
}

function isValidLegacyCategoryId(value: unknown): value is WgdomCostCategoryId {
  return typeof value === "string" && LEGACY_CATEGORY_SET.has(value as WgdomCostCategoryId);
}

function normalizeCostSplit(raw: unknown): WorkCostSplit | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const split = raw as Partial<WorkCostSplit>;
  const material = Number(split.materialRatio);
  const labor = Number(split.laborRatio);
  if (!Number.isFinite(material) || !Number.isFinite(labor)) return undefined;
  return {
    materialRatio: Math.max(0, material),
    laborRatio: Math.max(0, labor),
  };
}

/** S1-A — opcjonalny ring historii Quotes (fail-soft, bez backfill). */
function normalizeMarketQuoteHistoryField(
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

/**
 * v3→v4 — normalizacja `marketQuotes` z syntezą legacy_seed (P3.0 migracja).
 * Priorytet: istniejące `marketQuotes` (normalizowane). Fallback: `marketAvgPln>0`
 * → `marketQuotes[legacy_seed][polska]` (confidence 0.5, coverage indicative).
 */
function deriveMarketQuotes(
  rawQuotes: unknown,
  marketAvgPln: number | undefined,
  updatedAt: string,
): WorkMarketQuotes | undefined {
  const normalized = normalizeWorkMarketQuotes(rawQuotes, updatedAt);
  if (normalized) return normalized;

  if (marketAvgPln != null && Number.isFinite(marketAvgPln) && marketAvgPln > 0) {
    return normalizeWorkMarketQuotes(
      {
        [MARKET_LEGACY_SEED_ORIGIN_ID]: {
          polska: {
            price: marketAvgPln,
            regionCode: "polska",
            coverage: "indicative",
            updatedAt,
            confidence: 0.5,
            origin: MARKET_LEGACY_SEED_ORIGIN_ID,
          },
        },
      },
      updatedAt,
    );
  }

  return undefined;
}

const VALID_COMMERCIAL_SOURCES: CommercialPricingSource[] = ["default", "owner"];

/** C1 — preserve commercialPricing through load/save/normalize/sync. */
export function normalizeCommercialPricing(raw: unknown): CommercialPricing | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const cp = raw as Partial<CommercialPricing>;
  const marginPct = Number(cp.marginPct);
  if (!Number.isFinite(marginPct)) return undefined;
  const updatedAt =
    typeof cp.updatedAt === "string" && cp.updatedAt.trim() ? cp.updatedAt.trim() : "";
  if (!updatedAt) return undefined;
  const source = VALID_COMMERCIAL_SOURCES.includes(cp.source as CommercialPricingSource)
    ? (cp.source as CommercialPricingSource)
    : "owner";
  return {
    marginPct: Math.max(0, Math.min(1000, marginPct)),
    updatedAt,
    source,
  };
}

function normalizeCatalogWork(raw: unknown, fallbackUpdatedAt: string): CatalogWork | null {
  if (!raw || typeof raw !== "object") return null;
  const work = raw as Partial<CatalogWork>;
  if (typeof work.id !== "string" || !work.id.trim()) return null;
  if (!isTradeId(work.tradeId)) return null;
  if (typeof work.namePl !== "string" || !work.namePl.trim()) return null;
  if (!isValidUnit(work.unit)) return null;

  const companyPricePln = Number(work.companyPricePln);
  const usageCount = Number(work.usageCount);
  const workUpdatedAt =
    typeof work.updatedAt === "string" && work.updatedAt.trim() ? work.updatedAt : fallbackUpdatedAt;
  const marketAvgPln = Number.isFinite(Number(work.marketAvgPln))
    ? Number(work.marketAvgPln)
    : undefined;
  const commercialPricing = normalizeCommercialPricing(
    (work as { commercialPricing?: unknown }).commercialPricing,
  );

  return {
    id: work.id.trim(),
    tradeId: work.tradeId,
    namePl: work.namePl.trim(),
    unit: work.unit,
    companyPricePln: Number.isFinite(companyPricePln) ? Math.max(0, companyPricePln) : 0,
    marketAvgPln,
    marketMinPln: Number.isFinite(Number(work.marketMinPln)) ? Number(work.marketMinPln) : undefined,
    marketMaxPln: Number.isFinite(Number(work.marketMaxPln)) ? Number(work.marketMaxPln) : undefined,
    suggestedPricePln: Number.isFinite(Number(work.suggestedPricePln))
      ? Number(work.suggestedPricePln)
      : undefined,
    marketQuotes: deriveMarketQuotes(work.marketQuotes, marketAvgPln, workUpdatedAt),
    marketQuoteHistory: normalizeMarketQuoteHistoryField(
      (work as { marketQuoteHistory?: unknown }).marketQuoteHistory,
      work.id.trim(),
    ),
    ...(commercialPricing ? { commercialPricing } : {}),
    updatedAt: workUpdatedAt,
    freshnessStatus: isValidFreshness(work.freshnessStatus) ? work.freshnessStatus : "missing",
    descriptionPl:
      typeof work.descriptionPl === "string" && work.descriptionPl.trim()
        ? work.descriptionPl.trim()
        : undefined,
    keywords: Array.isArray(work.keywords)
      ? work.keywords.map(String).map((kw) => kw.trim()).filter(Boolean)
      : [],
    active: typeof work.active === "boolean" ? work.active : true,
    favorite: typeof work.favorite === "boolean" ? work.favorite : false,
    usageCount: Number.isFinite(usageCount) && usageCount >= 0 ? usageCount : 0,
    lastUsedAt:
      typeof work.lastUsedAt === "string" && work.lastUsedAt.trim() ? work.lastUsedAt : undefined,
    source: isValidSource(work.source) ? work.source : "custom",
    legacyCategoryId: isValidLegacyCategoryId(work.legacyCategoryId)
      ? work.legacyCategoryId
      : undefined,
    costSplit: normalizeCostSplit(work.costSplit),
  };
}

function normalizeRegionSlice(
  region: WgdomCostRegion,
  raw: unknown,
  fallbackUpdatedAt: string,
): WorkCatalogRegionSlice {
  const base: WorkCatalogRegionSlice = {
    region,
    works: [],
    updatedAt: fallbackUpdatedAt,
  };

  if (!raw || typeof raw !== "object") return base;
  const slice = raw as Partial<WorkCatalogRegionSlice>;
  const updatedAt =
    typeof slice.updatedAt === "string" && slice.updatedAt.trim() ? slice.updatedAt : fallbackUpdatedAt;

  const works: CatalogWork[] = [];
  const seenIds = new Set<string>();

  if (Array.isArray(slice.works)) {
    for (const entry of slice.works) {
      const work = normalizeCatalogWork(entry, updatedAt);
      if (!work || seenIds.has(work.id)) continue;
      seenIds.add(work.id);
      works.push(work);
    }
  }

  works.sort((a, b) => a.id.localeCompare(b.id, "pl"));

  return {
    region,
    works,
    updatedAt,
  };
}

function normalizeTradesOrder(raw: unknown): TradeId[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const order: TradeId[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (!isTradeId(item) || seen.has(item)) continue;
    seen.add(item);
    order.push(item);
  }
  return order.length > 0 ? order : undefined;
}

export function defaultWorkCatalogStoreForPersist(
  updatedAtIso: string = WORK_CATALOG_DEFAULT_UPDATED_AT,
): WorkCatalogStore {
  return defaultWorkCatalogStore(updatedAtIso);
}

/** Sanityzacja / domyślny store v3 — bez I/O. */
export function normalizeWorkCatalogStore(raw: unknown): WorkCatalogStore {
  const base = defaultWorkCatalogStoreForPersist();
  if (!raw || typeof raw !== "object") return base;

  const input = raw as Partial<WorkCatalogStore>;
  const updatedAt =
    typeof input.updatedAt === "string" && input.updatedAt.trim()
      ? input.updatedAt
      : WORK_CATALOG_DEFAULT_UPDATED_AT;
  const activeRegion: WgdomCostRegion =
    input.activeRegion === "dolnyslask" ? "dolnyslask" : "wroclaw";

  const catalogsRaw =
    input.catalogs && typeof input.catalogs === "object"
      ? (input.catalogs as Record<string, unknown>)
      : {};

  const tradesOrder = normalizeTradesOrder(input.tradesOrder) ?? [...TRADE_IDS];

  return {
    schemaVersion: WORK_CATALOG_SCHEMA_VERSION,
    activeRegion,
    catalogs: {
      wroclaw: normalizeRegionSlice("wroclaw", catalogsRaw.wroclaw, updatedAt),
      dolnyslask: normalizeRegionSlice("dolnyslask", catalogsRaw.dolnyslask, updatedAt),
    },
    tradesOrder,
    updatedAt,
    migratedFromLegacyAt:
      typeof input.migratedFromLegacyAt === "string" && input.migratedFromLegacyAt.trim()
        ? input.migratedFromLegacyAt
        : undefined,
    seedManifestVersion:
      typeof input.seedManifestVersion === "string" && input.seedManifestVersion.trim()
        ? input.seedManifestVersion
        : base.seedManifestVersion,
  };
}

/**
 * Merge LWW (D5) — porównanie `updatedAt` na poziomie całego store.
 * Bez synchronizacji chmury; używane przez warstwę cloud-sync w P1.11.
 */
export function mergeWorkCatalogStore(local: unknown, cloud: unknown): WorkCatalogStore {
  const left = normalizeWorkCatalogStore(local);
  const right = normalizeWorkCatalogStore(cloud);
  const leftTs = parseUpdatedAtMs(left.updatedAt);
  const rightTs = parseUpdatedAtMs(right.updatedAt);

  if (rightTs === 0 && leftTs === 0) return left;
  if (leftTs >= rightTs) return left;
  return right;
}

export function loadWorkCatalogStoreLocal(): WorkCatalogStore {
  try {
    if (typeof localStorage === "undefined") {
      return defaultWorkCatalogStoreForPersist();
    }
    const raw = localStorage.getItem(WORK_CATALOG_STORAGE_KEY);
    if (!raw) return defaultWorkCatalogStoreForPersist();
    return normalizeWorkCatalogStore(JSON.parse(raw));
  } catch {
    return defaultWorkCatalogStoreForPersist();
  }
}

/** Zapis do localStorage — normalizuje payload; nie wywołuje cloud-sync. */
export function saveWorkCatalogStoreLocal(
  store: WorkCatalogStore,
  options: SaveWorkCatalogStoreLocalOptions = {},
): void {
  if (typeof localStorage === "undefined") return;

  const updatedAt = options.updatedAtIso ?? store.updatedAt ?? WORK_CATALOG_DEFAULT_UPDATED_AT;
  const next = normalizeWorkCatalogStore({
    ...store,
    schemaVersion: WORK_CATALOG_SCHEMA_VERSION,
    updatedAt,
    catalogs: {
      wroclaw: { ...store.catalogs.wroclaw, updatedAt: store.catalogs.wroclaw.updatedAt || updatedAt },
      dolnyslask: {
        ...store.catalogs.dolnyslask,
        updatedAt: store.catalogs.dolnyslask.updatedAt || updatedAt,
      },
    },
  });

  localStorage.setItem(WORK_CATALOG_STORAGE_KEY, JSON.stringify(next));
}
