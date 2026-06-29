/**
 * PB-WRITE-C — reconcile legacy Bazy cen → Work Catalog (pure, idempotent).
 * Bez mirror-write; nie modyfikuje legacy KV.
 */

import type { WgdomCostCatalogStore, WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import { listWorksForRegion } from "@/lib/work-catalog/catalog-work-utils";
import {
  cloneWorkCatalogStore,
  countLegacyCatalogRates,
  migrateLegacyCostCatalogStoreToWorkCatalog,
} from "@/lib/work-catalog/work-catalog-migrate";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";

const REGIONS: WgdomCostRegion[] = ["wroclaw", "dolnyslask"];

export type PBWriteReconcileSkipReason =
  | "work_store_newer"
  | "work_item_newer"
  | "legacy_empty"
  | "no_delta"
  | "legacy_only_mode"
  | "work_empty";

export type PBWriteReconcileConflictReason = "same_timestamp_price_mismatch";

export type PBWriteReconcileConflict = {
  workId: string;
  region: WgdomCostRegion;
  reason: PBWriteReconcileConflictReason;
};

export type PBWriteReconcileDecision =
  | { action: "apply"; reason: "legacy_newer_or_equal" | "delta_detected" }
  | { action: "skip"; reason: PBWriteReconcileSkipReason };

export type PBWriteReconcileResult = {
  ok: boolean;
  saved: boolean;
  decision: PBWriteReconcileDecision;
  migrated: number;
  skipped: number;
  conflicts: number;
  conflictDetails: PBWriteReconcileConflict[];
  legacyCount: number;
  workCount: number;
  durationMs: number;
  store?: WorkCatalogStore;
  error?: unknown;
};

export type ReconcileLegacyToWorkOptions = {
  reconciledAtIso: string;
  nowMs: number;
  referenceHourlyPln?: number;
  /** Gdy true — nie zapisuje; tylko pure reconcile (testy). */
  dryRun?: boolean;
};

function parseTs(iso: string | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function countAllWorks(store: WorkCatalogStore): number {
  return REGIONS.reduce((sum, region) => sum + listWorksForRegion(store, region).length, 0);
}

function legacyStoreUpdatedAt(legacy: WgdomCostCatalogStore): string {
  if (legacy.updatedAt) return legacy.updatedAt;
  const regionTimes = REGIONS.map((r) => legacy.catalogs?.[r]?.updatedAt).filter(Boolean);
  if (regionTimes.length === 0) return "";
  return regionTimes.sort((a, b) => parseTs(b) - parseTs(a))[0] ?? "";
}

function pricesMatch(a: CatalogWork, b: CatalogWork): boolean {
  if (a.companyPricePln !== b.companyPricePln) return false;
  const aMat = a.costSplit?.materialRatio;
  const bMat = b.costSplit?.materialRatio;
  const aLab = a.costSplit?.laborRatio;
  const bLab = b.costSplit?.laborRatio;
  if (aMat !== bMat || aLab !== bLab) return false;
  return true;
}

function patchWorkFromLegacy(existing: CatalogWork, legacyWork: CatalogWork, reconciledAtIso: string): CatalogWork {
  return {
    ...existing,
    companyPricePln: legacyWork.companyPricePln,
    costSplit: legacyWork.costSplit
      ? {
          materialRatio: legacyWork.costSplit.materialRatio,
          laborRatio: legacyWork.costSplit.laborRatio,
        }
      : existing.costSplit,
    legacyCategoryId: legacyWork.legacyCategoryId ?? existing.legacyCategoryId,
    updatedAt: reconciledAtIso,
    freshnessStatus: legacyWork.freshnessStatus,
  };
}

/** Store-level guard + empty checks — SSOT dla orchestracji. */
export function decideWorkCatalogReconcile(
  legacy: WgdomCostCatalogStore,
  work: WorkCatalogStore,
): PBWriteReconcileDecision {
  if (countLegacyCatalogRates(legacy) === 0) {
    return { action: "skip", reason: "legacy_empty" };
  }

  if (countAllWorks(work) === 0) {
    return { action: "skip", reason: "work_empty" };
  }

  const legacyTs = parseTs(legacyStoreUpdatedAt(legacy));
  const workTs = parseTs(work.updatedAt);
  if (workTs > legacyTs && legacyTs > 0) {
    return { action: "skip", reason: "work_store_newer" };
  }

  return { action: "apply", reason: "legacy_newer_or_equal" };
}

/**
 * Pure reconcile: legacy rates → istniejące works (per-id LWW po updatedAt).
 * Nie usuwa works; nie resetuje migratedFromLegacyAt.
 */
export function reconcileLegacyRatesIntoWorkStore(
  legacy: WgdomCostCatalogStore,
  work: WorkCatalogStore,
  options: ReconcileLegacyToWorkOptions,
): {
  store: WorkCatalogStore;
  migrated: number;
  skipped: number;
  conflicts: number;
  conflictDetails: PBWriteReconcileConflict[];
  decision: PBWriteReconcileDecision;
} {
  const decision = decideWorkCatalogReconcile(legacy, work);
  const emptyStats = {
    store: cloneWorkCatalogStore(work),
    migrated: 0,
    skipped: 0,
    conflicts: 0,
    conflictDetails: [] as PBWriteReconcileConflict[],
    decision,
  };

  if (decision.action === "skip") {
    return emptyStats;
  }

  const { store: legacySnapshot } = migrateLegacyCostCatalogStoreToWorkCatalog(legacy, {
    migratedAtIso: options.reconciledAtIso,
    nowMs: options.nowMs,
    referenceHourlyPln: options.referenceHourlyPln,
  });

  const next = cloneWorkCatalogStore(work);
  let migrated = 0;
  let skipped = 0;
  let conflicts = 0;
  const conflictDetails: PBWriteReconcileConflict[] = [];

  for (const region of REGIONS) {
    const legacyWorks = listWorksForRegion(legacySnapshot, region);
    const workIndex = new Map(
      listWorksForRegion(next, region).map((w) => [w.id, w] as const),
    );

    for (const legacyWork of legacyWorks) {
      const existing = workIndex.get(legacyWork.id);
      const legacyTs = parseTs(legacyWork.updatedAt);

      if (!existing) {
        const slice = next.catalogs[region];
        slice.works = [...slice.works, { ...legacyWork, updatedAt: options.reconciledAtIso }];
        slice.works.sort((a, b) => a.id.localeCompare(b.id, "pl"));
        workIndex.set(legacyWork.id, legacyWork);
        migrated += 1;
        continue;
      }

      const workTs = parseTs(existing.updatedAt);
      if (workTs > legacyTs) {
        skipped += 1;
        continue;
      }

      if (workTs === legacyTs && !pricesMatch(existing, legacyWork)) {
        conflicts += 1;
        conflictDetails.push({
          workId: existing.id,
          region,
          reason: "same_timestamp_price_mismatch",
        });
        continue;
      }

      if (pricesMatch(existing, legacyWork)) {
        skipped += 1;
        continue;
      }

      const patched = patchWorkFromLegacy(existing, legacyWork, options.reconciledAtIso);
      const slice = next.catalogs[region];
      slice.works = slice.works.map((w) => (w.id === patched.id ? patched : w));
      workIndex.set(patched.id, patched);
      migrated += 1;
    }

    next.catalogs[region].updatedAt = options.reconciledAtIso;
  }

  if (migrated > 0) {
    next.updatedAt = options.reconciledAtIso;
  } else if (conflicts === 0 && skipped > 0) {
    return {
      store: cloneWorkCatalogStore(work),
      migrated: 0,
      skipped,
      conflicts: 0,
      conflictDetails: [],
      decision: { action: "skip", reason: "no_delta" },
    };
  }

  return {
    store: next,
    migrated,
    skipped,
    conflicts,
    conflictDetails,
    decision: migrated > 0
      ? { action: "apply", reason: "delta_detected" }
      : { action: "skip", reason: conflicts > 0 ? "no_delta" : "no_delta" },
  };
}

export function countWorkCatalogWorks(store: WorkCatalogStore): number {
  return countAllWorks(store);
}

export { countLegacyCatalogRates };
