/**
 * P2.1–P2.3 — WorkCatalogStore: odczyt + edycja ceny i aktywności (@/lib/work-catalog).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { WGDOM_DEFERRED_BOOTSTRAP_EVENT } from "@/lib/cloud-sync";
import {
  TRADE_IDS,
  countActiveWorks,
  listWorksForRegion,
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStore,
  withFreshnessStatusAll,
  type CatalogWork,
  type TradeId,
  type WorkCatalogStore,
} from "@/lib/work-catalog";
import { patchWorkActiveInStore } from "@/app/work-catalog/work-catalog-active";
import { patchBulkCompanyPricesInStore } from "@/app/work-catalog/work-catalog-bulk-price";
import { patchWorkCompanyPriceInStore } from "@/app/work-catalog/work-catalog-price";

export type UseWorkCatalogResult = {
  store: WorkCatalogStore;
  works: CatalogWork[];
  totalCount: number;
  activeCount: number;
  tradesOrder: TradeId[];
  regionLabel: string;
  updateCompanyPrice: (workId: string, companyPricePln: number) => Promise<UpdateCompanyPriceResult>;
  updateWorkActive: (workId: string, active: boolean) => Promise<UpdateWorkActiveResult>;
  updateBulkCompanyPrices: (
    priceByWorkId: Record<string, number>,
  ) => Promise<UpdateBulkCompanyPricesResult>;
};

export type UpdateCompanyPriceResult =
  | { ok: true }
  | { ok: false; message: string };

export type UpdateWorkActiveResult =
  | { ok: true }
  | { ok: false; message: string };

export type UpdateBulkCompanyPricesResult =
  | { ok: true; updatedIds: string[] }
  | { ok: false; message: string };

const REGION_LABELS_PL: Record<string, string> = {
  wroclaw: "Wrocław",
  dolnyslask: "Dolny Śląsk",
};

export function useWorkCatalog(): UseWorkCatalogResult {
  const [store, setStore] = useState<WorkCatalogStore>(() => loadWorkCatalogStoreLocal());

  const reloadFromLocal = useCallback(() => {
    setStore(loadWorkCatalogStoreLocal());
  }, []);

  useEffect(() => {
    const onDeferredBootstrap = () => {
      reloadFromLocal();
    };
    window.addEventListener(WGDOM_DEFERRED_BOOTSTRAP_EVENT, onDeferredBootstrap);
    return () => window.removeEventListener(WGDOM_DEFERRED_BOOTSTRAP_EVENT, onDeferredBootstrap);
  }, [reloadFromLocal]);

  const works = useMemo(() => {
    const raw = listWorksForRegion(store);
    return withFreshnessStatusAll(raw, Date.now());
  }, [store]);

  const tradesOrder = store.tradesOrder?.length ? store.tradesOrder : [...TRADE_IDS];

  const updateCompanyPrice = useCallback(
    async (workId: string, companyPricePln: number): Promise<UpdateCompanyPriceResult> => {
      const updatedAtIso = new Date().toISOString();
      const next = patchWorkCompanyPriceInStore(store, workId, companyPricePln, updatedAtIso);
      if (!next) {
        return { ok: false, message: "Nie znaleziono roboty w aktywnym regionie" };
      }

      setStore(next);

      try {
        await saveWorkCatalogStore(next, { updatedAtIso });
        return { ok: true };
      } catch {
        return {
          ok: false,
          message: "Zapis lokalny OK — synchronizacja chmury nie powiodła się",
        };
      }
    },
    [store],
  );

  const updateWorkActive = useCallback(
    async (workId: string, active: boolean): Promise<UpdateWorkActiveResult> => {
      const updatedAtIso = new Date().toISOString();
      const next = patchWorkActiveInStore(store, workId, active, updatedAtIso);
      if (!next) {
        return { ok: false, message: "Nie znaleziono roboty w aktywnym regionie" };
      }

      if (next !== store) {
        setStore(next);
        try {
          await saveWorkCatalogStore(next, { updatedAtIso });
        } catch {
          return {
            ok: false,
            message: "Zapis lokalny OK — synchronizacja chmury nie powiodła się",
          };
        }
      }

      return { ok: true };
    },
    [store],
  );

  const updateBulkCompanyPrices = useCallback(
    async (priceByWorkId: Record<string, number>): Promise<UpdateBulkCompanyPricesResult> => {
      const updatedAtIso = new Date().toISOString();
      const result = patchBulkCompanyPricesInStore(store, priceByWorkId, updatedAtIso);
      if (!result) {
        return { ok: false, message: "Nie znaleziono jednej lub więcej robót w regionie" };
      }

      if (result.updatedIds.length === 0) {
        return { ok: true, updatedIds: [] };
      }

      setStore(result.store);

      try {
        await saveWorkCatalogStore(result.store, { updatedAtIso });
        return { ok: true, updatedIds: result.updatedIds };
      } catch {
        return {
          ok: false,
          message: "Zapis lokalny OK — synchronizacja chmury nie powiodła się",
        };
      }
    },
    [store],
  );

  return {
    store,
    works,
    totalCount: works.length,
    activeCount: countActiveWorks(works),
    tradesOrder,
    regionLabel: REGION_LABELS_PL[store.activeRegion] ?? store.activeRegion,
    updateCompanyPrice,
    updateWorkActive,
    updateBulkCompanyPrices,
  };
}
