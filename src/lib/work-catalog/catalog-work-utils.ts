/**
 * Biblioteka Robót i Cennik v3.0 — pure helpers na liście robót / store (bez I/O).
 */

import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import type { TradeId } from "@/lib/work-catalog/trades";
import type { CatalogWork, WorkCatalogRegionSlice, WorkCatalogStore } from "@/lib/work-catalog/types";

export function getRegionSlice(
  store: WorkCatalogStore,
  region?: WgdomCostRegion,
): WorkCatalogRegionSlice | undefined {
  const target = region ?? store.activeRegion;
  return store.catalogs[target];
}

export function listWorksForRegion(
  store: WorkCatalogStore,
  region?: WgdomCostRegion,
): CatalogWork[] {
  return getRegionSlice(store, region)?.works ?? [];
}

export function getWorkById(works: CatalogWork[], id: string): CatalogWork | undefined {
  if (!id) return undefined;
  return works.find((work) => work.id === id);
}

export function getWorkByIdFromStore(
  store: WorkCatalogStore,
  workId: string,
  region?: WgdomCostRegion,
): CatalogWork | undefined {
  return getWorkById(listWorksForRegion(store, region), workId);
}

export function listActiveWorks(works: CatalogWork[]): CatalogWork[] {
  return works.filter((work) => work.active);
}

export function listActiveWorksForRegion(
  store: WorkCatalogStore,
  region?: WgdomCostRegion,
): CatalogWork[] {
  return listActiveWorks(listWorksForRegion(store, region));
}

export function listWorksByTradeId(works: CatalogWork[], tradeId: TradeId): CatalogWork[] {
  return works.filter((work) => work.tradeId === tradeId);
}

export function listActiveWorksByTradeId(
  works: CatalogWork[],
  tradeId: TradeId,
): CatalogWork[] {
  return listActiveWorks(listWorksByTradeId(works, tradeId));
}

export function countActiveWorks(works: CatalogWork[]): number {
  return listActiveWorks(works).length;
}

export function indexWorksById(works: CatalogWork[]): Map<string, CatalogWork> {
  const map = new Map<string, CatalogWork>();
  for (const work of works) {
    if (work.id) map.set(work.id, work);
  }
  return map;
}
