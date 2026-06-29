/**
 * PRICE-BRIDGE PB-1 — jedyny publiczny entry point wyceny katalogowej dla modułu Przetargów.
 * Pure · read-only · bez persist / cloud.
 */

import type { WgdomCostCatalog, WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import { getActiveCatalog, loadWgdomCostCatalogStoreLocal } from "@/lib/wgdom-cost-catalog-store";
import {
  isCompanyPricePresent,
  listActiveWorksForRegion,
  loadWorkCatalogStoreLocal,
  resolveCatalogForEngine,
} from "@/lib/work-catalog";

export type TenderCatalogSource = "work" | "legacy";

export interface ResolveActiveCatalogForTenderOptions {
  region?: WgdomCostRegion;
  referenceHourlyPln?: number;
  updatedAtIso?: string;
}

export interface ActiveTenderCatalogResolution {
  catalog: WgdomCostCatalog;
  source: TenderCatalogSource;
  /** true gdy efektywny katalog pochodzi z legacy (Baza cen), nie z Biblioteki Robót. */
  isFallback: boolean;
  activeRegion: WgdomCostRegion;
  pricedActiveWorkCount: number;
}

function resolveActiveRegion(
  options: ResolveActiveCatalogForTenderOptions,
  legacyStore: ReturnType<typeof loadWgdomCostCatalogStoreLocal>,
  workStore: ReturnType<typeof loadWorkCatalogStoreLocal>,
): WgdomCostRegion {
  if (options.region) return options.region;
  return legacyStore.activeRegion ?? workStore.activeRegion ?? "wroclaw";
}

function countPricedActiveWorks(
  workStore: ReturnType<typeof loadWorkCatalogStoreLocal>,
  region: WgdomCostRegion,
): number {
  return listActiveWorksForRegion(workStore, region).filter((work) =>
    isCompanyPricePresent(work.companyPricePln),
  ).length;
}

/**
 * Work-first / legacy-fallback — wewnętrznie wyłącznie `resolveCatalogForEngine`.
 */
export function resolveActiveCatalogForTender(
  options: ResolveActiveCatalogForTenderOptions = {},
): ActiveTenderCatalogResolution {
  const workStore = loadWorkCatalogStoreLocal();
  const legacyStore = loadWgdomCostCatalogStoreLocal();
  const activeRegion = resolveActiveRegion(options, legacyStore, workStore);
  const compatOpts = {
    region: activeRegion,
    referenceHourlyPln: options.referenceHourlyPln,
    updatedAtIso: options.updatedAtIso,
  };
  const pricedActiveWorkCount = countPricedActiveWorks(workStore, activeRegion);

  if (pricedActiveWorkCount > 0) {
    const adapted = resolveCatalogForEngine(workStore, compatOpts);
    if (adapted) {
      return {
        catalog: adapted,
        source: "work",
        isFallback: false,
        activeRegion,
        pricedActiveWorkCount,
      };
    }
  }

  const legacyCatalog =
    resolveCatalogForEngine(legacyStore, compatOpts) ?? getActiveCatalog(legacyStore);

  return {
    catalog: legacyCatalog,
    source: "legacy",
    isFallback: true,
    activeRegion,
    pricedActiveWorkCount,
  };
}
