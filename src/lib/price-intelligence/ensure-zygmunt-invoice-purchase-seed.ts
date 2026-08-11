/**
 * Ensure Zygmunt invoice HISTORICAL PURCHASE seed in local work catalog (+ optional cloud).
 */

import { pushKeysToCloud } from "@/lib/cloud-sync";
import {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "@/lib/work-catalog/work-catalog-store";
import { applyZygmuntInvoicePurchaseSeedToWorkCatalog } from "./apply-zygmunt-invoice-purchase-seed";

export interface EnsureZygmuntInvoicePurchaseSeedResult {
  catalogChanged: boolean;
  worksUpserted: number;
  worksUpdated: number;
  seedCount: number;
  catalogStore: ReturnType<typeof loadWorkCatalogStoreLocal>;
}

export function ensureZygmuntInvoicePurchaseSeedLocal(opts?: {
  pushCloud?: boolean;
}): EnsureZygmuntInvoicePurchaseSeedResult {
  const applied = applyZygmuntInvoicePurchaseSeedToWorkCatalog(loadWorkCatalogStoreLocal());
  if (applied.changed) {
    saveWorkCatalogStoreLocal(applied.store);
  }

  if (opts?.pushCloud && applied.changed && typeof window !== "undefined") {
    void pushKeysToCloud([WORK_CATALOG_STORAGE_KEY], [applied.store]).catch(() => {
      /* soft */
    });
  }

  return {
    catalogChanged: applied.changed,
    worksUpserted: applied.worksUpserted,
    worksUpdated: applied.worksUpdated,
    seedCount: applied.seedCount,
    catalogStore: applied.store,
  };
}
