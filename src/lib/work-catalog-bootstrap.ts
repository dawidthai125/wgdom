/**
 * PB-3 / #5C-5B — Work Catalog deferred finalize (ONE-SHOT migrate from legacy LS).
 * Orchestracja tylko — logika migracji w work-catalog-migrate (P1.5).
 * #5C-5B: bez cyklicznego legacy read (scenariusz A) · bez reconcile w deferred path.
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
import { countLegacyCatalogRates } from "@/lib/work-catalog/work-catalog-migrate";
import { loadWorkCatalogStoreLocal } from "@/lib/work-catalog/work-catalog-store";
import { saveWorkCatalogRouted } from "@/lib/catalog-write-router";

export type WorkCatalogBootstrapSkipReason =
  | "already_migrated"
  | "priced_work_exists"
  | "legacy_empty";

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

/** PB-3.0 — pure guard; SSOT dla logów i diagnostyki bootstrap. */
export function decideWorkCatalogBootstrap(
  legacy: WgdomCostCatalogStore,
  work: WorkCatalogStore,
): WorkCatalogBootstrapDecision {
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
 */
export async function finalizeWorkCatalogAfterDeferredMerge(): Promise<WorkCatalogBootstrapResult> {
  const work = loadWorkCatalogStoreLocal();

  if (work.migratedFromLegacyAt) {
    return skipResult("already_migrated");
  }

  if (countPricedActiveWorks(work) > 0 || countAllWorks(work) > 0) {
    return skipResult("priced_work_exists");
  }

  const legacy = loadWgdomCostCatalogStoreLocal();
  const decision = decideWorkCatalogBootstrap(legacy, work);

  if (decision.action === "skip") {
    return skipResult(decision.reason);
  }

  const migratedAtIso = new Date().toISOString();
  const { store } = migrateLegacyCostCatalogStoreToWorkCatalog(legacy, {
    migratedAtIso,
    nowMs: Date.now(),
  });

  const saveResult = await saveWorkCatalogRouted(store, { updatedAtIso: migratedAtIso });
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

/** @deprecated alias — SSOT: finalizeWorkCatalogAfterDeferredMerge (#5C-5B) */
export async function maybeExecuteWorkCatalogBootstrap(): Promise<WorkCatalogBootstrapResult> {
  return finalizeWorkCatalogAfterDeferredMerge();
}
