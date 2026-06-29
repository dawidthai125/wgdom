/**
 * PB-3 — jednorazowy bootstrap Work Catalog z legacy Bazy cen.
 * Orchestracja tylko — logika migracji w work-catalog-migrate (P1.5).
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
import { saveWorkCatalogStore } from "@/lib/work-catalog/work-catalog-sync";

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

/** PB-3.1 — uruchamiać po fetchAndMergeDeferredBootstrap (legacy w LS). */
export async function maybeExecuteWorkCatalogBootstrap(): Promise<WorkCatalogBootstrapResult> {
  const legacy = loadWgdomCostCatalogStoreLocal();
  const work = loadWorkCatalogStoreLocal();
  const decision = decideWorkCatalogBootstrap(legacy, work);

  if (decision.action === "skip") {
    console.info("WORK CATALOG BOOTSTRAP SKIPPED", { reason: decision.reason });
    return { decision, migrated: false };
  }

  const migratedAtIso = new Date().toISOString();
  const { store } = migrateLegacyCostCatalogStoreToWorkCatalog(legacy, {
    migratedAtIso,
    nowMs: Date.now(),
  });

  await saveWorkCatalogStore(store, { updatedAtIso: migratedAtIso });
  console.info("WORK CATALOG BOOTSTRAP EXECUTED", {
    reason: decision.reason,
    migratedFromLegacyAt: store.migratedFromLegacyAt,
    workCount: countAllWorks(store),
    pricedCount: countPricedActiveWorks(store),
  });

  return { decision, migrated: true };
}
