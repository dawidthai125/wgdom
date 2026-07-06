/**
 * PB-WRITE-A — jedyny publiczny entry point zapisu katalogów cenowych.
 * Deleguje do istniejących persist helperów; bez mirror-write.
 */

import {
  loadAppSettingsLocal,
  mergeCatalogWriteMode,
  normalizeCatalogWriteMode,
  type AppSettings,
  type CatalogWriteMode,
} from "@/lib/app-settings";
import type { WgdomCostCatalogStore } from "@/lib/wgdom-cost-catalog";
import {
  appendCostCatalogHistoryIfRatesChanged,
  hasCatalogRateChange,
  loadWgdomCostCatalogHistoryLocal,
  type WgdomCostCatalogHistoryStore,
} from "@/lib/wgdom-cost-catalog-history";
import { saveWgdomCostCatalogStore } from "@/lib/wgdom-cost-catalog-store";
import { appendWorkCatalogRateHistoryIfChanged } from "@/lib/catalog-rate-history";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  saveWorkCatalogStore,
  type SaveWorkCatalogStoreCloudOptions,
} from "@/lib/work-catalog/work-catalog-sync";
import { loadCompanyProfileLocal, type TenderCompanyCostModel } from "@/lib/tenders-bzp-company";

export type { CatalogWriteMode };

export type CatalogWriteBlockReason =
  | "work_only_blocks_legacy"
  | "legacy_only_blocks_work";

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

export function canWriteLegacyCatalog(settings?: AppSettings): boolean {
  return resolveCatalogWriteMode(settings) !== "work_only";
}

export function canWriteWorkCatalog(settings?: AppSettings): boolean {
  return resolveCatalogWriteMode(settings) !== "legacy_only";
}

export async function saveLegacyCostCatalogRouted(
  store: WgdomCostCatalogStore,
  settings?: AppSettings,
): Promise<RoutedSaveResult> {
  if (!canWriteLegacyCatalog(settings)) {
    console.info("CATALOG WRITE ROUTER", { blocked: "work_only_blocks_legacy" });
    return { ok: true, saved: false, blocked: "work_only_blocks_legacy" };
  }
  try {
    await saveWgdomCostCatalogStore(store);
    return { ok: true, saved: true };
  } catch (error) {
    return { ok: false, error };
  }
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
    return { ok: false, error };
  }
}

export type RoutedHistoryAppendResult =
  | { ok: true; saved: true; history: WgdomCostCatalogHistoryStore }
  | { ok: true; saved: false; blocked: CatalogWriteBlockReason; history: WgdomCostCatalogHistoryStore }
  | { ok: false; error: unknown };

export async function appendCostCatalogHistoryRouted(
  previous: WgdomCostCatalogStore,
  next: WgdomCostCatalogStore,
  costModel: TenderCompanyCostModel,
  settings?: AppSettings,
): Promise<RoutedHistoryAppendResult> {
  if (!canWriteLegacyCatalog(settings)) {
    console.info("CATALOG WRITE ROUTER", { blocked: "work_only_blocks_legacy", scope: "history" });
    return {
      ok: true,
      saved: false,
      blocked: "work_only_blocks_legacy",
      history: loadWgdomCostCatalogHistoryLocal(),
    };
  }
  try {
    const region = next.activeRegion;
    const willChange = hasCatalogRateChange(previous, next, region);
    const history = await appendCostCatalogHistoryIfRatesChanged(previous, next, costModel);
    return { ok: true, saved: willChange, history };
  } catch (error) {
    return { ok: false, error };
  }
}

export { mergeCatalogWriteMode, normalizeCatalogWriteMode };
