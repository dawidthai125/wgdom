/**
 * Biblioteka Robót i Cennik v3.0 — adapter WorkCatalogStore → WgdomCostCatalog (silnik legacy).
 * Pure · deterministyczny · bez I/O.
 */

import {
  WGDOM_COST_CATEGORY_IDS,
  defaultWgdomCostCatalog,
  findCategoryDef,
  type WgdomCategoryRate,
  type WgdomCostCatalog,
  type WgdomCostCategoryDef,
  type WgdomCostCategoryId,
  type WgdomCostRegion,
  type WgdomCostUnit,
  type WgdomUnknownFallback,
} from "@/lib/wgdom-cost-catalog";
import { getRegionSlice, listActiveWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import {
  WORK_CATALOG_REFERENCE_HOURLY_PLN,
  deriveCostSplitFromLegacyRate,
  resolveReferenceHourlyPln,
  roundWorkCatalogPln,
  splitCompanyPrice,
} from "@/lib/work-catalog/cost-split";
import { LEGACY_CATEGORY_TO_TRADE } from "@/lib/work-catalog/work-catalog-migrate";
import type { TradeId } from "@/lib/work-catalog/trades";
import type { CatalogWork, WorkCatalogRegionSlice, WorkCatalogStore } from "@/lib/work-catalog/types";

export { LEGACY_CATEGORY_TO_TRADE };

export interface BuildLegacyCostCatalogOptions {
  /** Stawka/h do odwrotnego splitu rbh (domyślnie 85 — zgodnie z migracją P1.5). */
  referenceHourlyPln?: number;
  /** ISO `updatedAt` katalogu (bez Date.now()). */
  updatedAtIso?: string;
}

/** Region slice ze store v3 (D1 — catalogs per region). */
export function resolveRegionSlice(
  store: WorkCatalogStore,
  region?: WgdomCostRegion,
): WorkCatalogRegionSlice | undefined {
  return getRegionSlice(store, region);
}

/** Unia słów kluczowych (kolejność pierwszego wystąpienia, deduplikacja PL). */
export function mergeKeywords(keywordLists: readonly string[][]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];

  for (const list of keywordLists) {
    for (const raw of list) {
      const kw = raw.trim();
      if (!kw) continue;
      const key = kw.toLocaleLowerCase("pl-PL");
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(kw);
    }
  }

  return merged;
}

/** Branże v3 mapujące na daną kategorię legacy (odwrotność LEGACY_CATEGORY_TO_TRADE). */
export function listTradeIdsForLegacyCategory(categoryId: WgdomCostCategoryId): TradeId[] {
  if (categoryId === "UNKNOWN") return ["POZOSTALE"];
  const trades: TradeId[] = [];
  for (const [legacyId, tradeId] of Object.entries(LEGACY_CATEGORY_TO_TRADE)) {
    if (legacyId === categoryId && !trades.includes(tradeId)) {
      trades.push(tradeId);
    }
  }
  return trades;
}

function groupActiveWorksByLegacyCategory(works: CatalogWork[]): Map<WgdomCostCategoryId, CatalogWork[]> {
  const map = new Map<WgdomCostCategoryId, CatalogWork[]>();

  for (const work of works) {
    if (!work.active) continue;
    const categoryId = work.legacyCategoryId ?? "UNKNOWN";
    const bucket = map.get(categoryId) ?? [];
    bucket.push(work);
    map.set(categoryId, bucket);
  }

  for (const bucket of map.values()) {
    bucket.sort((a, b) => a.id.localeCompare(b.id, "pl"));
  }

  return map;
}

function workToLegacyRate(
  work: CatalogWork,
  regionMultiplier: number,
  referenceHourlyPln: number,
): WgdomCategoryRate {
  const split =
    work.costSplit ??
    deriveCostSplitFromLegacyRate(0, 0, referenceHourlyPln);
  const hourly = resolveReferenceHourlyPln(referenceHourlyPln);
  const resolved = splitCompanyPrice(work.companyPricePln, split, hourly);
  const multiplier = regionMultiplier > 0 ? regionMultiplier : 1;

  return {
    unit: work.unit,
    materialPlnPerUnit: roundWorkCatalogPln(resolved.materialPlnPerUnit / multiplier),
    laborRbhPerUnit: resolved.laborRbhPerUnit,
  };
}

function buildRatesForCategory(
  works: CatalogWork[],
  regionMultiplier: number,
  referenceHourlyPln: number,
): WgdomCategoryRate[] {
  const byUnit = new Map<WgdomCostUnit, WgdomCategoryRate>();

  for (const work of works) {
    byUnit.set(work.unit, workToLegacyRate(work, regionMultiplier, referenceHourlyPln));
  }

  return [...byUnit.entries()]
    .sort(([unitA], [unitB]) => unitA.localeCompare(unitB, "pl"))
    .map(([, rate]) => rate);
}

function buildUnknownFallback(
  unknownWorks: CatalogWork[],
  template: WgdomUnknownFallback,
  regionMultiplier: number,
  referenceHourlyPln: number,
): WgdomUnknownFallback {
  if (unknownWorks.length === 0) {
    return {
      materialPlnPerUnit: template.materialPlnPerUnit,
      laborRbhPerUnit: template.laborRbhPerUnit,
      defaultUnit: template.defaultUnit,
    };
  }

  const work = unknownWorks[0];
  const rate = workToLegacyRate(work, regionMultiplier, referenceHourlyPln);
  return {
    materialPlnPerUnit: rate.materialPlnPerUnit,
    laborRbhPerUnit: rate.laborRbhPerUnit,
    defaultUnit: rate.unit,
  };
}

function buildCategoryDef(
  categoryId: Exclude<WgdomCostCategoryId, "UNKNOWN">,
  works: CatalogWork[],
  template: WgdomCostCatalog,
  regionMultiplier: number,
  referenceHourlyPln: number,
): WgdomCostCategoryDef {
  const templateDef = findCategoryDef(template, categoryId);
  const labelPl = templateDef?.labelPl ?? categoryId;
  const marketRefNote = templateDef?.marketRefNote;

  const rates =
    works.length > 0
      ? buildRatesForCategory(works, regionMultiplier, referenceHourlyPln)
      : (templateDef?.rates.map((rate) => ({ ...rate })) ?? []);

  const keywords =
    works.length > 0
      ? mergeKeywords(works.map((work) => work.keywords))
      : [...(templateDef?.keywords ?? [])];

  return {
    id: categoryId,
    labelPl,
    rates,
    keywords,
    ...(marketRefNote ? { marketRefNote } : {}),
  };
}

/**
 * Buduje `WgdomCostCatalog` (schema v1) z Work Catalog v3 dla silnika `wgdom-catalog-cost-engine`.
 * Nie mutuje wejściowego store.
 */
export function buildLegacyCostCatalogFromWorkStore(
  store: WorkCatalogStore,
  region?: WgdomCostRegion,
  options: BuildLegacyCostCatalogOptions = {},
): WgdomCostCatalog {
  const targetRegion = region ?? store.activeRegion;
  const slice = resolveRegionSlice(store, targetRegion);
  const template = defaultWgdomCostCatalog(targetRegion);
  const referenceHourlyPln = resolveReferenceHourlyPln(options.referenceHourlyPln);
  const updatedAt = options.updatedAtIso ?? slice?.updatedAt ?? store.updatedAt ?? template.updatedAt;
  const activeWorks = listActiveWorksForRegion(store, targetRegion);
  const worksByCategory = groupActiveWorksByLegacyCategory(activeWorks);

  const categories = WGDOM_COST_CATEGORY_IDS.map((categoryId) =>
    buildCategoryDef(
      categoryId,
      worksByCategory.get(categoryId) ?? [],
      template,
      template.regionMultiplier,
      referenceHourlyPln,
    ),
  );

  const unknownFallback = buildUnknownFallback(
    worksByCategory.get("UNKNOWN") ?? [],
    template.unknownFallback,
    template.regionMultiplier,
    referenceHourlyPln,
  );

  return {
    schemaVersion: 1,
    region: targetRegion,
    regionMultiplier: template.regionMultiplier,
    categories,
    unknownFallback,
    updatedAt,
  };
}
