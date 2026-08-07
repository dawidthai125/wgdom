/**
 * Catalog → PricingExpertCatalogRo.worksById.
 * READ ONLY · REUSE work-catalog loaders + indexWorksById.
 */

import type { AnalyzeMarketPricingOptions } from "@/lib/pricing-expert";
import {
  indexWorksById,
  listActiveWorksForRegion,
  loadWorkCatalogStoreLocal,
} from "@/lib/work-catalog";
import type { BuildChiefPricingOptionsRoResult, ChiefWireAdapterGap } from "./types";

export function buildChiefPricingOptionsRo(): BuildChiefPricingOptionsRoResult {
  const gaps: ChiefWireAdapterGap[] = [];
  try {
    const store = loadWorkCatalogStoreLocal();
    const works = listActiveWorksForRegion(store, store.activeRegion);
    const worksById = indexWorksById(works);
    if (worksById.size === 0) {
      gaps.push({
        code: "CATALOG_EMPTY",
        field: "pricing.catalog.worksById",
        messagePl: "Katalog robót aktywnych jest pusty dla aktywnego regionu.",
        severity: "info",
      });
    }
    const pricing: AnalyzeMarketPricingOptions = {
      catalog: { worksById },
    };
    return {
      pricing,
      gaps,
      source: "kw-wgdom-work-catalog",
    };
  } catch {
    gaps.push({
      code: "CATALOG_UNAVAILABLE",
      field: "pricing",
      messagePl: "Nie udało się odczytać kw-wgdom-work-catalog.",
      severity: "warn",
    });
    return {
      pricing: null,
      gaps,
      source: "unavailable",
    };
  }
}
