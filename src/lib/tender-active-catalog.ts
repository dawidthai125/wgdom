/**
 * PRICE-BRIDGE PB-1 / #5C-1 — jedyny publiczny entry point wyceny katalogowej dla modułu Przetargów.
 * Pure · read-only · Work Catalog SSOT · bez legacy KV w resolverze.
 */

import type { WgdomCostCatalog, WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import { defaultWgdomCostCatalog } from "@/lib/wgdom-cost-catalog";
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
  /** #5C-1 — zawsze false; legacy fallback usunięty z resolvera. */
  isFallback: boolean;
  activeRegion: WgdomCostRegion;
  /** Diagnostyczny — nie wpływa na wybór źródła danych. */
  pricedActiveWorkCount: number;
}

function resolveActiveRegion(
  options: ResolveActiveCatalogForTenderOptions,
  workStore: ReturnType<typeof loadWorkCatalogStoreLocal>,
): WgdomCostRegion {
  if (options.region) return options.region;
  return workStore.activeRegion ?? "wroclaw";
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
 * #5C-1 — Work Catalog only: `resolveCatalogForEngine(workStore)` + seed template gdy adapter null.
 */
export function resolveActiveCatalogForTender(
  options: ResolveActiveCatalogForTenderOptions = {},
): ActiveTenderCatalogResolution {
  const workStore = loadWorkCatalogStoreLocal();
  const activeRegion = resolveActiveRegion(options, workStore);
  const compatOpts = {
    region: activeRegion,
    referenceHourlyPln: options.referenceHourlyPln,
    updatedAtIso: options.updatedAtIso,
  };
  const pricedActiveWorkCount = countPricedActiveWorks(workStore, activeRegion);

  const catalog =
    resolveCatalogForEngine(workStore, compatOpts) ??
    defaultWgdomCostCatalog(activeRegion);

  return {
    catalog,
    source: "work",
    isFallback: false,
    activeRegion,
    pricedActiveWorkCount,
  };
}
