/**
 * P2.1–P2.3 — WorkCatalogStore: odczyt + edycja ceny i aktywności (@/lib/work-catalog).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeferredBootstrap } from "@/app/context/DeferredBootstrapContext";
import { useTendersContextOptional } from "@/app/tenders/context/TendersContext";
import {
  TRADE_IDS,
  countActiveWorks,
  listWorksForRegion,
  loadWorkCatalogStoreLocal,
  withFreshnessStatusAll,
  type CatalogWork,
  type TradeId,
  type WorkCatalogStore,
} from "@/lib/work-catalog";
import { saveWorkCatalogRouted } from "@/lib/catalog-write-router";
import { patchWorkActiveInStore } from "@/app/work-catalog/work-catalog-active";
import { patchWorkFavoriteInStore } from "@/app/work-catalog/work-catalog-favorite";
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
  toggleWorkFavorite: (workId: string, favorite: boolean) => Promise<UpdateWorkFavoriteResult>;
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

export type UpdateWorkFavoriteResult =
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
  const tendersCtx = useTendersContextOptional();

  const notifyPricingCatalogChanged = useCallback(() => {
    tendersCtx?.bumpPricingCatalogRevision();
  }, [tendersCtx]);

  const reloadFromLocal = useCallback(() => {
    setStore(loadWorkCatalogStoreLocal());
  }, []);

  const { generation } = useDeferredBootstrap();

  useEffect(() => {
    if (generation === 0) return;
    reloadFromLocal();
  }, [generation, reloadFromLocal]);

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
        const result = await saveWorkCatalogRouted(next, { updatedAtIso, previousStore: store });
        if (!result.ok) {
          return {
            ok: false,
            message: "Zapis lokalny OK — synchronizacja chmury nie powiodła się",
          };
        }
        if (!result.saved) {
          return { ok: false, message: "Zapis zablokowany przez tryb katalogu" };
        }
        notifyPricingCatalogChanged();
        return { ok: true };
      } catch {
        return {
          ok: false,
          message: "Zapis lokalny OK — synchronizacja chmury nie powiodła się",
        };
      }
    },
    [store, notifyPricingCatalogChanged],
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
          const saveResult = await saveWorkCatalogRouted(next, { updatedAtIso, previousStore: store });
          if (!saveResult.ok || !saveResult.saved) {
            return {
              ok: false,
              message: "Zapis lokalny OK — synchronizacja chmury nie powiodła się",
            };
          }
        } catch {
          return {
            ok: false,
            message: "Zapis lokalny OK — synchronizacja chmury nie powiodła się",
          };
        }
        notifyPricingCatalogChanged();
      }

      return { ok: true };
    },
    [store, notifyPricingCatalogChanged],
  );

  const toggleWorkFavorite = useCallback(
    async (workId: string, favorite: boolean): Promise<UpdateWorkFavoriteResult> => {
      const updatedAtIso = new Date().toISOString();
      const next = patchWorkFavoriteInStore(store, workId, favorite, updatedAtIso);
      if (!next) {
        return { ok: false, message: "Nie znaleziono roboty w aktywnym regionie" };
      }

      if (next !== store) {
        setStore(next);
        try {
          const saveResult = await saveWorkCatalogRouted(next, { updatedAtIso, previousStore: store });
          if (!saveResult.ok || !saveResult.saved) {
            return {
              ok: false,
              message: "Zapis lokalny OK — synchronizacja chmury nie powiodła się",
            };
          }
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
        const saveResult = await saveWorkCatalogRouted(result.store, { updatedAtIso, previousStore: store });
        if (!saveResult.ok || !saveResult.saved) {
          return {
            ok: false,
            message: "Zapis lokalny OK — synchronizacja chmury nie powiodła się",
          };
        }
        notifyPricingCatalogChanged();
        return { ok: true, updatedIds: result.updatedIds };
      } catch {
        return {
          ok: false,
          message: "Zapis lokalny OK — synchronizacja chmury nie powiodła się",
        };
      }
    },
    [store, notifyPricingCatalogChanged],
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
    toggleWorkFavorite,
    updateBulkCompanyPrices,
  };
}
