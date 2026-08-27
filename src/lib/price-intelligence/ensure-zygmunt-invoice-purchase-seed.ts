/**
 * Ensure Zygmunt invoice HISTORICAL PURCHASE seed in local work catalog (+ optional cloud).
 */

import { pushWorkCatalogStoreToCloudSafe } from "@/lib/work-catalog/work-catalog-cloud-push";
import {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
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
    void pushWorkCatalogStoreToCloudSafe(applied.store, { mode: "union" }).catch(() => {
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
