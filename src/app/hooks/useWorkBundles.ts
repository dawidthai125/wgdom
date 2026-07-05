/**
 * P2.7 — WorkBundleStore: odczyt + CRUD (@/lib/work-catalog public API).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeferredBootstrap } from "@/app/context/DeferredBootstrapContext";
import {
  loadWorkBundleStoreLocal,
  saveWorkBundleStore,
  type WorkBundle,
  type WorkBundleStore,
  type WorkCatalogStore,
} from "@/lib/work-catalog";
import {
  createEmptyBundleDraft,
  duplicateBundleInStore,
  patchBundleActiveInStore,
  patchBundleFavoriteInStore,
  removeBundleFromStore,
  upsertBundleInStore,
  validateBundleForSave,
} from "@/app/work-catalog/work-catalog-bundle";

export type BundleMutationResult =
  | { ok: true; bundleId?: string }
  | { ok: false; message: string };

export type UseWorkBundlesResult = {
  store: WorkBundleStore;
  bundles: WorkBundle[];
  totalCount: number;
  saveBundle: (
    bundle: WorkBundle,
    catalogStore: WorkCatalogStore,
  ) => Promise<BundleMutationResult>;
  deleteBundle: (bundleId: string) => Promise<BundleMutationResult>;
  duplicateBundle: (bundleId: string) => Promise<BundleMutationResult>;
  toggleBundleActive: (bundleId: string, active: boolean) => Promise<BundleMutationResult>;
  toggleBundleFavorite: (bundleId: string, favorite: boolean) => Promise<BundleMutationResult>;
  createBundleDraft: () => WorkBundle;
};

async function persistBundleStore(
  next: WorkBundleStore,
  updatedAtIso: string,
): Promise<BundleMutationResult> {
  try {
    await saveWorkBundleStore(next, { updatedAtIso });
    return { ok: true };
  } catch {
    return {
      ok: false,
      message: "Zapis lokalny OK — synchronizacja chmury nie powiodła się",
    };
  }
}

export function useWorkBundles(): UseWorkBundlesResult {
  const [store, setStore] = useState<WorkBundleStore>(() => loadWorkBundleStoreLocal());

  const reloadFromLocal = useCallback(() => {
    setStore(loadWorkBundleStoreLocal());
  }, []);

  const { generation } = useDeferredBootstrap();

  useEffect(() => {
    if (generation === 0) return;
    reloadFromLocal();
  }, [generation, reloadFromLocal]);

  const bundles = useMemo(() => store.bundles, [store.bundles]);

  const saveBundle = useCallback(
    async (
      bundle: WorkBundle,
      catalogStore: WorkCatalogStore,
    ): Promise<BundleMutationResult> => {
      const validation = validateBundleForSave(bundle, catalogStore);
      if (!validation.ok) return validation;

      const updatedAtIso = new Date().toISOString();
      const next = upsertBundleInStore(store, bundle, updatedAtIso);
      setStore(next);

      const result = await persistBundleStore(next, updatedAtIso);
      if (!result.ok) return result;
      return { ok: true, bundleId: bundle.id };
    },
    [store],
  );

  const deleteBundle = useCallback(
    async (bundleId: string): Promise<BundleMutationResult> => {
      const updatedAtIso = new Date().toISOString();
      const next = removeBundleFromStore(store, bundleId, updatedAtIso);
      if (next.bundles.length === store.bundles.length) {
        return { ok: false, message: "Nie znaleziono pakietu" };
      }

      setStore(next);
      const result = await persistBundleStore(next, updatedAtIso);
      if (!result.ok) return result;
      return { ok: true };
    },
    [store],
  );

  const duplicateBundle = useCallback(
    async (bundleId: string): Promise<BundleMutationResult> => {
      const updatedAtIso = new Date().toISOString();
      const duplicated = duplicateBundleInStore(store, bundleId, updatedAtIso);
      if (!duplicated) {
        return { ok: false, message: "Nie znaleziono pakietu do duplikacji" };
      }

      setStore(duplicated.store);
      const result = await persistBundleStore(duplicated.store, updatedAtIso);
      if (!result.ok) return result;
      return { ok: true, bundleId: duplicated.newBundleId };
    },
    [store],
  );

  const toggleBundleActive = useCallback(
    async (bundleId: string, active: boolean): Promise<BundleMutationResult> => {
      const updatedAtIso = new Date().toISOString();
      const next = patchBundleActiveInStore(store, bundleId, active, updatedAtIso);
      if (!next) {
        return { ok: false, message: "Nie znaleziono pakietu" };
      }

      if (next !== store) {
        setStore(next);
        const result = await persistBundleStore(next, updatedAtIso);
        if (!result.ok) return result;
      }

      return { ok: true, bundleId };
    },
    [store],
  );

  const toggleBundleFavorite = useCallback(
    async (bundleId: string, favorite: boolean): Promise<BundleMutationResult> => {
      const updatedAtIso = new Date().toISOString();
      const next = patchBundleFavoriteInStore(store, bundleId, favorite, updatedAtIso);
      if (!next) {
        return { ok: false, message: "Nie znaleziono pakietu" };
      }

      if (next !== store) {
        setStore(next);
        const result = await persistBundleStore(next, updatedAtIso);
        if (!result.ok) return result;
      }

      return { ok: true, bundleId };
    },
    [store],
  );

  const createBundleDraft = useCallback(() => {
    return createEmptyBundleDraft("MALOWANIE", new Date().toISOString());
  }, []);

  return {
    store,
    bundles,
    totalCount: bundles.length,
    saveBundle,
    deleteBundle,
    duplicateBundle,
    toggleBundleActive,
    toggleBundleFavorite,
    createBundleDraft,
  };
}
