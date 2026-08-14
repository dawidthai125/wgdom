/**
 * PB-3 / #5C-5B — Work Catalog deferred finalize (ONE-SHOT migrate from legacy LS).
 * Orchestracja tylko — logika migracji w work-catalog-migrate (P1.5).
 * #5C-5B: bez cyklicznego legacy read (scenariusz A) · bez reconcile w deferred path.
 * WORK-CATALOG-MIGRATION-SAFETY-01 — nie persistuj legacy-synthetic store nad
 * istniejącym authoritative cloud catalog.
 */

import { loadWgdomCostCatalogStoreLocal } from "@/lib/wgdom-cost-catalog-store";
import type { WgdomCostCatalogStore } from "@/lib/wgdom-cost-catalog";
import {
  isCompanyPricePresent,
  listActiveWorksForRegion,
  listWorksForRegion,
  migrateLegacyCostCatalogStoreToWorkCatalog,
  type WorkCatalogStore,
} from "@/lib/work-catalog";
import {
  isAuthoritativeWorkCatalogStore,
  isDestructiveWorkCatalogReplace,
  isEmptyWorkCatalogStore,
} from "@/lib/work-catalog/work-catalog-authority";
import { countLegacyCatalogRates } from "@/lib/work-catalog/work-catalog-migrate";
import {
  loadWorkCatalogStoreLocal,
  mergeWorkCatalogStore,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
} from "@/lib/work-catalog/work-catalog-store";
import { saveWorkCatalogRouted } from "@/lib/catalog-write-router";

export type WorkCatalogBootstrapSkipReason =
  | "already_migrated"
  | "priced_work_exists"
  | "legacy_empty"
  | "cloud_catalog_present";

export type WorkCatalogBootstrapMigrateReason = "legacy_present";

export type WorkCatalogBootstrapReason =
  | WorkCatalogBootstrapMigrateReason
  | WorkCatalogBootstrapSkipReason;

export type WorkCatalogBootstrapDecision =
  | { action: "migrate"; reason: WorkCatalogBootstrapMigrateReason }
  | { action: "skip"; reason: WorkCatalogBootstrapSkipReason };

export interface WorkCatalogBootstrapResult {
  decision: WorkCatalogBootstrapDecision;
  migrated: boolean;
}

export type FinalizeWorkCatalogOptions = {
  /** Snapshot z deferred `batch-get` — nie polegaj wyłącznie na LS po nieudanym persist. */
  cloud?: unknown;
};

function countPricedActiveWorks(store: WorkCatalogStore): number {
  const regions: Array<"wroclaw" | "dolnyslask"> = ["wroclaw", "dolnyslask"];
  return regions.reduce(
    (sum, region) =>
      sum
      + listActiveWorksForRegion(store, region).filter((work) =>
        isCompanyPricePresent(work.companyPricePln),
      ).length,
    0,
  );
}

function countAllWorks(store: WorkCatalogStore): number {
  return listWorksForRegion(store, "wroclaw").length + listWorksForRegion(store, "dolnyslask").length;
}

function skipResult(reason: WorkCatalogBootstrapSkipReason): WorkCatalogBootstrapResult {
  console.info("WORK CATALOG DEFERRED FINALIZE skipped", { reason });
  return { decision: { action: "skip", reason }, migrated: false };
}

function rehydrateLocalFromAuthoritative(local: WorkCatalogStore, authoritative: WorkCatalogStore): void {
  if (!isDestructiveWorkCatalogReplace(local, authoritative)) return;
  saveWorkCatalogStoreLocal(authoritative, { updatedAtIso: authoritative.updatedAt });
}

/** PB-3.0 — pure guard; SSOT dla logów i diagnostyki bootstrap. */
export function decideWorkCatalogBootstrap(
  legacy: WgdomCostCatalogStore,
  work: WorkCatalogStore,
  cloud?: unknown,
): WorkCatalogBootstrapDecision {
  if (cloud !== undefined && cloud != null) {
    const cloudStore = normalizeWorkCatalogStore(cloud);
    if (!isEmptyWorkCatalogStore(cloudStore)) {
      return { action: "skip", reason: "cloud_catalog_present" };
    }
  }

  if (work.migratedFromLegacyAt) {
    return { action: "skip", reason: "already_migrated" };
  }

  if (countPricedActiveWorks(work) > 0 || countAllWorks(work) > 0) {
    return { action: "skip", reason: "priced_work_exists" };
  }

  if (countLegacyCatalogRates(legacy) === 0) {
    return { action: "skip", reason: "legacy_empty" };
  }

  return { action: "migrate", reason: "legacy_present" };
}

/**
 * #5C-5B — uruchamiać po fetchAndMergeDeferredBootstrap (work catalog z deferred merge).
 * ONE-SHOT legacy read tylko gdy work pusty i brak migratedFromLegacyAt (scenariusz B).
 * SAFETY-01: gdy cloud ma jakikolwiek katalog, NIE migruj i nie nadpisuj chmury.
 */
export async function finalizeWorkCatalogAfterDeferredMerge(
  options: FinalizeWorkCatalogOptions = {},
): Promise<WorkCatalogBootstrapResult> {
  const work = loadWorkCatalogStoreLocal();
  const cloudRaw = options.cloud;
  const cloudStore =
    cloudRaw === undefined || cloudRaw == null ? null : normalizeWorkCatalogStore(cloudRaw);

  if (cloudStore && !isEmptyWorkCatalogStore(cloudStore)) {
    const merged = mergeWorkCatalogStore(work, cloudStore);
    rehydrateLocalFromAuthoritative(work, merged);
    return skipResult("cloud_catalog_present");
  }

  if (isAuthoritativeWorkCatalogStore(work)) {
    return skipResult("priced_work_exists");
  }

  if (work.migratedFromLegacyAt) {
    return skipResult("already_migrated");
  }

  if (countPricedActiveWorks(work) > 0 || countAllWorks(work) > 0) {
    return skipResult("priced_work_exists");
  }

  const legacy = loadWgdomCostCatalogStoreLocal();
  const decision = decideWorkCatalogBootstrap(legacy, work, cloudRaw);

  if (decision.action === "skip") {
    return skipResult(decision.reason);
  }

  const migratedAtIso = new Date().toISOString();
  const { store } = migrateLegacyCostCatalogStoreToWorkCatalog(legacy, {
    migratedAtIso,
    nowMs: Date.now(),
  });

  const saveResult = await saveWorkCatalogRouted(store, { updatedAtIso: migratedAtIso });
  if (saveResult.ok && saveResult.saved === false && saveResult.blocked === "destructive_catalog_replace") {
    return skipResult("cloud_catalog_present");
  }
  if (!saveResult.ok || !saveResult.saved) {
    throw new Error("Work catalog bootstrap save blocked or failed");
  }
  console.info("WORK CATALOG DEFERRED FINALIZE ONE_SHOT_MIGRATE", {
    reason: decision.reason,
    migratedFromLegacyAt: store.migratedFromLegacyAt,
    workCount: countAllWorks(store),
    pricedCount: countPricedActiveWorks(store),
  });

  return { decision, migrated: true };
}
