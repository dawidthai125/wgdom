/**
 * WC-P3.2-S3 — Commit Orchestration dla importu cen rynkowych.
 *
 * Domyka WC-P3.2: spina S1 (apply) + S2 (rollback) z istniejącą warstwą
 * persystencji (router + cloud-sync). BEZ duplikowania logiki.
 *
 * Kolejność obowiązkowa:
 *   load → capture snapshot → apply → validate fingerprint → save → persist → report
 *
 * Rollback WYŁĄCZNIE lokalny (bez cloud rollback). Respektuje `catalogWriteMode`
 * przez istniejący `saveWorkCatalogRouted`. No-op gdy apply nic nie zmienił.
 */

import type { AppSettings } from "@/lib/app-settings";
import {
  saveWorkCatalogRouted,
  type CatalogWriteBlockReason,
  type RoutedSaveResult,
} from "@/lib/catalog-write-router";
import type { MarketCsvPreviewReport } from "@/lib/work-catalog/market-csv-preview";
import {
  applyMarketQuotesFromPreview,
  type ApplyMarketQuotesReport,
} from "@/lib/work-catalog/apply-market-quotes";
import {
  captureMarketQuotesSnapshot,
  fingerprintWorkCatalogStore,
  restoreMarketQuotesSnapshot,
} from "@/lib/work-catalog/rollback-market-quotes";
import {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
} from "@/lib/work-catalog/work-catalog-store";
import {
  loadWorkCatalogStore,
  type SaveWorkCatalogStoreCloudOptions,
} from "@/lib/work-catalog/work-catalog-sync";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";

/** Wstrzykiwalne zależności I/O (produkcja = realne; testy = fejki). */
export interface CommitMarketQuotesDeps {
  /** read-merge-write: pobiera z chmury, scala LWW, zwraca aktualny store. */
  load: () => Promise<WorkCatalogStore> | WorkCatalogStore;
  /** zapis przez router (respektuje catalogWriteMode) + persist (cloud). */
  save: (
    store: WorkCatalogStore,
    options: SaveWorkCatalogStoreCloudOptions,
    settings?: AppSettings,
  ) => Promise<RoutedSaveResult> | RoutedSaveResult;
  /** odczyt lokalny do weryfikacji persist. */
  loadLocal: () => WorkCatalogStore;
  /** lokalny zapis (rollback po nieudanym save). */
  saveLocal: (store: WorkCatalogStore, options?: { updatedAtIso?: string }) => void;
}

const DEFAULT_DEPS: CommitMarketQuotesDeps = {
  load: loadWorkCatalogStore,
  save: saveWorkCatalogRouted,
  loadLocal: loadWorkCatalogStoreLocal,
  saveLocal: saveWorkCatalogStoreLocal,
};

export interface CommitMarketQuotesOptions {
  region?: WgdomCostRegion;
  updatedAtIso?: string;
  settings?: AppSettings;
  deps?: Partial<CommitMarketQuotesDeps>;
}

export type CommitMarketQuotesStatus =
  | "committed"
  | "noop"
  | "blocked"
  | "rolled-back";

export interface CommitMarketQuotesReport {
  status: CommitMarketQuotesStatus;
  saved: boolean;
  region: WgdomCostRegion;
  apply: ApplyMarketQuotesReport | null;
  preFingerprint: string;
  postFingerprint: string;
  persistVerified: boolean;
  rolledBack: boolean;
  blocked?: CatalogWriteBlockReason;
  reason?: string;
}

/** Projekcja tylko `marketQuotes` (stabilna względem bumpu updatedAt). */
function marketQuotesProjection(store: WorkCatalogStore): string {
  const pick = (works: WorkCatalogStore["catalogs"]["wroclaw"]["works"]) =>
    works.map((w) => ({ id: w.id, q: w.marketQuotes ?? null }));
  return JSON.stringify({
    wroclaw: pick(store.catalogs.wroclaw.works),
    dolnyslask: pick(store.catalogs.dolnyslask.works),
  });
}

/**
 * Orkiestracja commitu importu cen rynkowych (S3).
 * Zwraca raport; NIE rzuca na błędzie save — wykonuje lokalny rollback.
 */
export async function commitMarketQuotesImport(
  preview: MarketCsvPreviewReport,
  options: CommitMarketQuotesOptions = {},
): Promise<CommitMarketQuotesReport> {
  const deps: CommitMarketQuotesDeps = { ...DEFAULT_DEPS, ...(options.deps ?? {}) };

  // 1. load (read-merge-write)
  const loaded = await deps.load();
  const region = options.region ?? loaded.activeRegion;

  // 2. capture snapshot (token lokalnego rollbacku)
  const snapshot = captureMarketQuotesSnapshot(loaded);
  const preFingerprint = snapshot.fingerprint;

  // 3. apply (merge-not-replace, pure)
  const { store: applied, report: applyReport } = applyMarketQuotesFromPreview(
    loaded,
    preview,
    { region },
  );

  // 4. validate fingerprint
  const postFingerprint = fingerprintWorkCatalogStore(applied);

  // no-op: apply nic nie zmienił → nie zapisuj, nie zmieniaj updatedAt, nie sync
  if (applyReport.worksTouched === 0 || postFingerprint === preFingerprint) {
    return {
      status: "noop",
      saved: false,
      region,
      apply: applyReport,
      preFingerprint,
      postFingerprint,
      persistVerified: false,
      rolledBack: false,
      reason: "no-changes",
    };
  }

  // 5. save (router respektuje catalogWriteMode) + persist (cloud w środku save)
  let saveResult: RoutedSaveResult;
  try {
    saveResult = await deps.save(applied, { updatedAtIso: options.updatedAtIso }, options.settings);
  } catch (error) {
    saveResult = { ok: false, error };
  }

  // blocked przez router (catalogWriteMode = legacy_only)
  if (saveResult.ok && saveResult.saved === false) {
    return {
      status: "blocked",
      saved: false,
      region,
      apply: applyReport,
      preFingerprint,
      postFingerprint,
      persistVerified: false,
      rolledBack: false,
      blocked: saveResult.blocked,
      reason: "write-mode-blocked",
    };
  }

  // save error → LOKALNY rollback (bez cloud)
  if (!saveResult.ok) {
    const restored = restoreMarketQuotesSnapshot(applied, snapshot);
    if (restored.restored) {
      deps.saveLocal(restored.store, { updatedAtIso: loaded.updatedAt });
    }
    return {
      status: "rolled-back",
      saved: false,
      region,
      apply: applyReport,
      preFingerprint,
      postFingerprint,
      persistVerified: false,
      rolledBack: restored.restored,
      reason: "save-failed",
    };
  }

  // 6. persist verification — reload lokalny, porównaj projekcję marketQuotes
  const persisted = deps.loadLocal();
  const persistVerified = marketQuotesProjection(persisted) === marketQuotesProjection(applied);

  return {
    status: "committed",
    saved: true,
    region,
    apply: applyReport,
    preFingerprint,
    postFingerprint,
    persistVerified,
    rolledBack: false,
  };
}
