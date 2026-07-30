/**
 * MARKET-SYNC-01 P1 — Undo (R2): restore capture + routed save · single.
 * Staging: published → accepted.
 */

import { revertPublishedQuotesToAccepted } from "@/lib/market-sync/accept";
import type { MarketSyncStagingStore } from "@/lib/market-sync/types";
import {
  saveWorkCatalogRouted,
  type RoutedSaveResult,
} from "@/lib/catalog-write-router";
import type { AppSettings } from "@/lib/app-settings";
import {
  restoreMarketQuotesSnapshot,
  type MarketQuotesRollbackSnapshot,
} from "@/lib/work-catalog/rollback-market-quotes";
import type { SaveWorkCatalogStoreCloudOptions } from "@/lib/work-catalog/work-catalog-sync";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";

export interface UndoMarketSyncPublishDeps {
  save: (
    store: WorkCatalogStore,
    options: SaveWorkCatalogStoreCloudOptions,
    settings?: AppSettings,
  ) => Promise<RoutedSaveResult> | RoutedSaveResult;
}

const DEFAULT_DEPS: UndoMarketSyncPublishDeps = {
  save: saveWorkCatalogRouted,
};

export interface UndoMarketSyncPublishResult {
  ok: boolean;
  reason?: string;
  staging: MarketSyncStagingStore;
  catalog: WorkCatalogStore | null;
  save: RoutedSaveResult | null;
}

/**
 * Single undo po sukcesie Publish.
 * Przywraca Quotes ze snapshotu + cofa status staging published→accepted.
 */
export async function undoMarketSyncPublish(input: {
  staging: MarketSyncStagingStore;
  currentCatalog: WorkCatalogStore;
  snapshot: MarketQuotesRollbackSnapshot;
  publishedQuoteIds: readonly string[];
  settings?: AppSettings;
  deps?: Partial<UndoMarketSyncPublishDeps>;
}): Promise<UndoMarketSyncPublishResult> {
  const deps = { ...DEFAULT_DEPS, ...(input.deps ?? {}) };
  const restored = restoreMarketQuotesSnapshot(input.currentCatalog, input.snapshot);
  if (!restored.restored) {
    return {
      ok: false,
      reason: restored.reason,
      staging: input.staging,
      catalog: null,
      save: null,
    };
  }

  let saveResult: RoutedSaveResult;
  try {
    saveResult = await deps.save(
      restored.store,
      { previousStore: input.currentCatalog },
      input.settings,
    );
  } catch (error) {
    return {
      ok: false,
      reason: "save-failed",
      staging: input.staging,
      catalog: restored.store,
      save: { ok: false, error },
    };
  }

  if (!saveResult.ok || saveResult.saved === false) {
    return {
      ok: false,
      reason: saveResult.ok === false ? "save-failed" : "write-mode-blocked",
      staging: input.staging,
      catalog: restored.store,
      save: saveResult,
    };
  }

  const staging = revertPublishedQuotesToAccepted(input.staging, input.publishedQuoteIds);
  return {
    ok: true,
    staging,
    catalog: restored.store,
    save: saveResult,
  };
}
