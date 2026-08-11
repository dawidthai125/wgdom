/**
 * PRICE-PATH-01 — ensure product CatalogWork hosts (structure only).
 * NEVER invents marketQuotes / Purchase PLN.
 */

import { pushKeysToCloud } from "@/lib/cloud-sync";
import {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "@/lib/work-catalog/work-catalog-store";
import { applyEconomyProductHostsToWorkCatalog } from "./apply-economy-product-hosts";
import { assertEconomyProductHostsMapAligned } from "./economy-product-hosts-seed";

export interface EnsureEconomyProductHostsResult {
  catalogChanged: boolean;
  worksUpserted: number;
  catalogStore: ReturnType<typeof loadWorkCatalogStoreLocal>;
}

/**
 * Idempotent: upsert 3 economy product hosts without Quotes/Purchase invent.
 * Optional cloud push when catalog changed.
 */
export function ensureEconomyProductHostsLocal(opts?: {
  pushCloud?: boolean;
}): EnsureEconomyProductHostsResult {
  assertEconomyProductHostsMapAligned();
  const applied = applyEconomyProductHostsToWorkCatalog(loadWorkCatalogStoreLocal());
  if (applied.changed) {
    saveWorkCatalogStoreLocal(applied.store);
  }

  if (opts?.pushCloud && applied.changed && typeof window !== "undefined") {
    void pushKeysToCloud([WORK_CATALOG_STORAGE_KEY], [applied.store]).catch(() => {
      /* soft — mirror best-effort */
    });
  }

  return {
    catalogChanged: applied.changed,
    worksUpserted: applied.worksUpserted,
    catalogStore: applied.store,
  };
}
