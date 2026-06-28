/**
 * Biblioteka Robót i Cennik v3.0 — integracja z cloud-sync (P1.11).
 * Wyłącznie hooki load/save przez istniejący registry — bez własnego transportu.
 */

import { fetchKeysFromCloud, persistKey } from "@/lib/cloud-sync";
import type { WorkBundleStore, WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  WORK_BUNDLE_STORAGE_KEY,
  defaultWorkBundleStore,
  loadWorkBundleStoreLocal,
  mergeWorkBundleStore,
  normalizeWorkBundleStore,
  saveWorkBundleStoreLocal,
  type SaveWorkBundleStoreLocalOptions,
} from "@/lib/work-catalog/work-bundle-store";
import {
  WORK_CATALOG_STORAGE_KEY,
  loadWorkCatalogStoreLocal,
  mergeWorkCatalogStore,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
  type SaveWorkCatalogStoreLocalOptions,
} from "@/lib/work-catalog/work-catalog-store";

export {
  WORK_BUNDLE_STORAGE_KEY,
  WORK_CATALOG_STORAGE_KEY,
  mergeWorkBundleStore,
  mergeWorkCatalogStore,
  normalizeWorkBundleStore,
  normalizeWorkCatalogStore,
};

export type SaveWorkCatalogStoreCloudOptions = SaveWorkCatalogStoreLocalOptions;
export type SaveWorkBundleStoreCloudOptions = SaveWorkBundleStoreLocalOptions;

/** Scal local + cloud (LWW D5) — używane przez cloud-sync `mergeDataKey`. */
export function mergeWorkCatalogFromSources(local: unknown, cloud: unknown): WorkCatalogStore {
  return mergeWorkCatalogStore(local, cloud);
}

export function mergeWorkBundleFromSources(local: unknown, cloud: unknown): WorkBundleStore {
  return mergeWorkBundleStore(local, cloud);
}

/** Pobierz z chmury, scal z localStorage, zapisz wynik lokalnie. */
export async function loadWorkCatalogStore(): Promise<WorkCatalogStore> {
  try {
    const local = loadWorkCatalogStoreLocal();
    const [cloud] = await fetchKeysFromCloud([WORK_CATALOG_STORAGE_KEY]);
    if (cloud == null) return local;
    const merged = mergeWorkCatalogStore(local, cloud);
    saveWorkCatalogStoreLocal(merged, { updatedAtIso: merged.updatedAt });
    return merged;
  } catch {
    return loadWorkCatalogStoreLocal();
  }
}

/** Zapis localStorage + `persistKey` (batch-set przez cloud-sync). */
export async function saveWorkCatalogStore(
  store: WorkCatalogStore,
  options: SaveWorkCatalogStoreCloudOptions = {},
): Promise<void> {
  const updatedAt = options.updatedAtIso ?? store.updatedAt;
  const next = normalizeWorkCatalogStore({ ...store, updatedAt });
  saveWorkCatalogStoreLocal(next, { updatedAtIso: next.updatedAt });
  await persistKey(WORK_CATALOG_STORAGE_KEY, next);
}

export async function loadWorkBundleStore(): Promise<WorkBundleStore> {
  try {
    const local = loadWorkBundleStoreLocal();
    const [cloud] = await fetchKeysFromCloud([WORK_BUNDLE_STORAGE_KEY]);
    if (cloud == null) return local;
    const merged = mergeWorkBundleStore(local, cloud);
    saveWorkBundleStoreLocal(merged, { updatedAtIso: merged.updatedAt });
    return merged;
  } catch {
    return loadWorkBundleStoreLocal();
  }
}

export async function saveWorkBundleStore(
  store: WorkBundleStore,
  options: SaveWorkBundleStoreCloudOptions = {},
): Promise<void> {
  const updatedAt = options.updatedAtIso ?? store.updatedAt;
  const next = normalizeWorkBundleStore({ ...store, updatedAt });
  saveWorkBundleStoreLocal(next, { updatedAtIso: next.updatedAt });
  await persistKey(WORK_BUNDLE_STORAGE_KEY, next);
}
