/**
 * PB-WRITE-C — orchestracja reconcile (read legacy, write work via router).
 */

import { loadWgdomCostCatalogStoreLocal } from "@/lib/wgdom-cost-catalog-store";
import type { WgdomCostCatalogStore } from "@/lib/wgdom-cost-catalog";
import { resolveCatalogWriteMode, saveWorkCatalogRouted } from "@/lib/catalog-write-router";
import { loadAppSettingsLocal } from "@/lib/app-settings";
import { defaultCompanyProfile } from "@/lib/tenders-bzp-company";
import {
  countLegacyCatalogRates,
  reconcileLegacyRatesIntoWorkStore,
  decideWorkCatalogReconcile,
  countWorkCatalogWorks,
  type PBWriteReconcileResult,
  type ReconcileLegacyToWorkOptions,
} from "@/lib/work-catalog-reconcile";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";

export type { PBWriteReconcileResult };

export async function reconcileLegacyToWorkCatalog(
  legacy?: WgdomCostCatalogStore,
  work?: WorkCatalogStore,
  options?: Partial<ReconcileLegacyToWorkOptions>,
): Promise<PBWriteReconcileResult> {
  const started = Date.now();
  const legacyStore = legacy ?? loadWgdomCostCatalogStoreLocal();
  const workStore = work ?? loadWorkCatalogStoreLocal();
  const legacyCount = countLegacyCatalogRates(legacyStore);
  const workCount = countWorkCatalogWorks(workStore);

  const mode = resolveCatalogWriteMode(loadAppSettingsLocal());
  if (mode === "legacy_only") {
    return {
      ok: true,
      saved: false,
      decision: { action: "skip", reason: "legacy_only_mode" },
      migrated: 0,
      skipped: 0,
      conflicts: 0,
      conflictDetails: [],
      legacyCount,
      workCount,
      durationMs: Date.now() - started,
    };
  }

  const reconciledAtIso = options?.reconciledAtIso ?? new Date().toISOString();
  const reconcileOptions: ReconcileLegacyToWorkOptions = {
    reconciledAtIso,
    nowMs: options?.nowMs ?? Date.now(),
    referenceHourlyPln:
      options?.referenceHourlyPln ?? defaultCompanyProfile().costModel.referenceHourlyPln,
    dryRun: options?.dryRun,
  };

  const decision = decideWorkCatalogReconcile(legacyStore, workStore);
  if (decision.action === "skip") {
    return {
      ok: true,
      saved: false,
      decision,
      migrated: 0,
      skipped: 0,
      conflicts: 0,
      conflictDetails: [],
      legacyCount,
      workCount,
      durationMs: Date.now() - started,
    };
  }

  const {
    store: nextStore,
    migrated,
    skipped,
    conflicts,
    conflictDetails,
    decision: applyDecision,
  } = reconcileLegacyRatesIntoWorkStore(legacyStore, workStore, reconcileOptions);

  if (applyDecision.action === "skip" || migrated === 0) {
    return {
      ok: true,
      saved: false,
      decision: applyDecision,
      migrated,
      skipped,
      conflicts,
      conflictDetails,
      legacyCount,
      workCount,
      durationMs: Date.now() - started,
      store: nextStore,
    };
  }

  if (reconcileOptions.dryRun) {
    return {
      ok: true,
      saved: false,
      decision: applyDecision,
      migrated,
      skipped,
      conflicts,
      conflictDetails,
      legacyCount,
      workCount,
      durationMs: Date.now() - started,
      store: nextStore,
    };
  }

  try {
    const saveResult = await saveWorkCatalogRouted(nextStore, {
      updatedAtIso: reconciledAtIso,
    });
    if (!saveResult.ok) {
      return {
        ok: false,
        saved: false,
        decision: applyDecision,
        migrated,
        skipped,
        conflicts,
        conflictDetails,
        legacyCount,
        workCount,
        durationMs: Date.now() - started,
        store: nextStore,
        error: saveResult.error,
      };
    }
    if (!saveResult.saved) {
      return {
        ok: true,
        saved: false,
        decision: applyDecision,
        migrated,
        skipped,
        conflicts,
        conflictDetails,
        legacyCount,
        workCount,
        durationMs: Date.now() - started,
        store: nextStore,
      };
    }

    console.info("WORK CATALOG RECONCILE", {
      migrated,
      skipped,
      conflicts,
      legacyCount,
      workCount,
      legacyUpdatedAt: legacyStore.updatedAt,
      workUpdatedAt: nextStore.updatedAt,
    });

    return {
      ok: true,
      saved: true,
      decision: applyDecision,
      migrated,
      skipped,
      conflicts,
      conflictDetails,
      legacyCount,
      workCount,
      durationMs: Date.now() - started,
      store: nextStore,
    };
  } catch (error) {
    return {
      ok: false,
      saved: false,
      decision: applyDecision,
      migrated,
      skipped,
      conflicts,
      conflictDetails,
      legacyCount,
      workCount,
      durationMs: Date.now() - started,
      store: nextStore,
      error,
    };
  }
}

/** Uruchamiać po PB-3 bootstrap (deferred bootstrap path). */
export async function maybeExecuteWorkCatalogReconcile(): Promise<PBWriteReconcileResult> {
  return reconcileLegacyToWorkCatalog();
}
