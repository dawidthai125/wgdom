/**
 * PB-WRITE-A — jedyny publiczny entry point zapisu katalogów cenowych.
 * #5C-5C F2 — tylko Work Catalog path; legacy write usunięty.
 */

import {
  loadAppSettingsLocal,
  mergeCatalogWriteMode,
  normalizeCatalogWriteMode,
  type AppSettings,
  type CatalogWriteMode,
} from "@/lib/app-settings";
import { appendWorkCatalogRateHistoryIfChanged } from "@/lib/catalog-rate-history";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { WorkCatalogDestructivePersistError } from "@/lib/work-catalog/work-catalog-authority";
import {
  saveWorkCatalogStore,
  type SaveWorkCatalogStoreCloudOptions,
} from "@/lib/work-catalog/work-catalog-sync";
import { loadCompanyProfileLocal } from "@/lib/tenders-bzp-company";

export type { CatalogWriteMode };

export type CatalogWriteBlockReason = "legacy_only_blocks_work" | "destructive_catalog_replace";

export type RoutedSaveResult =
  | { ok: true; saved: true }
  | { ok: true; saved: false; blocked: CatalogWriteBlockReason }
  | { ok: false; error: unknown };

export function resolveCatalogWriteMode(settings?: AppSettings): CatalogWriteMode {
  if (settings?.catalogWriteMode) {
    return normalizeCatalogWriteMode(settings.catalogWriteMode);
  }
  return normalizeCatalogWriteMode(loadAppSettingsLocal().catalogWriteMode);
}

export function canWriteWorkCatalog(settings?: AppSettings): boolean {
  return resolveCatalogWriteMode(settings) !== "legacy_only";
}

export type SaveWorkCatalogRoutedOptions = SaveWorkCatalogStoreCloudOptions & {
  /** Store sprzed zapisu — wymagany do snapshotu historii stawek (#5C-3D). */
  previousStore?: WorkCatalogStore;
};

export async function saveWorkCatalogRouted(
  store: WorkCatalogStore,
  options: SaveWorkCatalogRoutedOptions = {},
  settings?: AppSettings,
): Promise<RoutedSaveResult> {
  if (!canWriteWorkCatalog(settings)) {
    console.info("CATALOG WRITE ROUTER", { blocked: "legacy_only_blocks_work" });
    return { ok: true, saved: false, blocked: "legacy_only_blocks_work" };
  }
  try {
    const { previousStore, ...saveOptions } = options;
    await saveWorkCatalogStore(store, saveOptions);
    if (previousStore) {
      const costModel = loadCompanyProfileLocal().costModel;
      await appendWorkCatalogRateHistoryIfChanged(previousStore, store, costModel);
    }
    return { ok: true, saved: true };
  } catch (error) {
    if (error instanceof WorkCatalogDestructivePersistError) {
      console.warn("CATALOG WRITE ROUTER", { blocked: error.code });
      return { ok: true, saved: false, blocked: error.code };
    }
    return { ok: false, error };
  }
}

export { mergeCatalogWriteMode, normalizeCatalogWriteMode };
