/**
 * P2.7 — filtry i liczniki listy pakietów robót (app layer).
 */

import { tradeLabelPl, type TradeId, type WorkBundle } from "@/lib/work-catalog";

export type WorkCatalogBundleActiveFilter = "all" | "active" | "inactive";

export interface WorkCatalogBundleListFilters {
  search: string;
  tradeId: TradeId | "all";
  active: WorkCatalogBundleActiveFilter;
}

export const DEFAULT_WORK_CATALOG_BUNDLE_LIST_FILTERS: WorkCatalogBundleListFilters = {
  search: "",
  tradeId: "all",
  active: "active",
};

export interface WorkCatalogBundleListCounts {
  total: number;
  filtered: number;
  active: number;
}

/** P2.8.2 — ulubione na górze, potem nazwa PL. */
export function sortWorkCatalogBundlesForDisplay(bundles: WorkBundle[]): WorkBundle[] {
  return bundles.slice().sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return a.namePl.localeCompare(b.namePl, "pl");
  });
}

function matchesSearch(bundle: WorkBundle, query: string): boolean {
  if (!query) return true;
  const haystack = [
    bundle.namePl,
    bundle.descriptionPl ?? "",
    tradeLabelPl(bundle.primaryTradeId),
  ]
    .join(" ")
    .toLocaleLowerCase("pl");
  return haystack.includes(query);
}

export function filterWorkCatalogBundleList(
  bundles: WorkBundle[],
  filters: WorkCatalogBundleListFilters,
): WorkBundle[] {
  const query = filters.search.trim().toLocaleLowerCase("pl");

  const filtered = bundles.filter((bundle) => {
    if (filters.tradeId !== "all" && bundle.primaryTradeId !== filters.tradeId) return false;
    if (filters.active === "active" && !bundle.active) return false;
    if (filters.active === "inactive" && bundle.active) return false;
    if (!matchesSearch(bundle, query)) return false;
    return true;
  });

  return sortWorkCatalogBundlesForDisplay(filtered);
}

export function countWorkCatalogBundleList(bundles: WorkBundle[]): WorkCatalogBundleListCounts {
  const active = bundles.filter((bundle) => bundle.active).length;
  return { total: bundles.length, filtered: bundles.length, active };
}

export function countFilteredWorkCatalogBundleList(
  allBundles: WorkBundle[],
  filteredBundles: WorkBundle[],
): WorkCatalogBundleListCounts {
  const base = countWorkCatalogBundleList(allBundles);
  return { ...base, filtered: filteredBundles.length };
}
