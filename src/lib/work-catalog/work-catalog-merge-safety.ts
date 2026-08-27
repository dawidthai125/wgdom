/**
 * WORK-CATALOG-P0 — union merge + shrink-safe reconcile (preserve cloud workIds).
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import {
  normalizeWorkCatalogStore,
} from "@/lib/work-catalog/work-catalog-store";
import { preserveOurWorkRatesFromDonor } from "@/lib/work-catalog/work-rate-preserve";

const REGIONS: WgdomCostRegion[] = ["wroclaw", "dolnyslask"];

function parseUpdatedAtMs(iso: string | undefined | null): number {
  if (typeof iso !== "string") return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}

function pickNewerWork(a: CatalogWork, b: CatalogWork): CatalogWork {
  const aTs = parseUpdatedAtMs(a.updatedAt);
  const bTs = parseUpdatedAtMs(b.updatedAt);
  if (aTs === bTs) return a;
  return aTs > bTs ? a : b;
}

function mergeRegionWorks(cloudWorks: CatalogWork[], candidateWorks: CatalogWork[]): CatalogWork[] {
  const byId = new Map<string, CatalogWork>();
  for (const w of cloudWorks) byId.set(w.id, w);
  for (const w of candidateWorks) {
    const existing = byId.get(w.id);
    byId.set(w.id, existing ? pickNewerWork(existing, w) : w);
  }
  return [...byId.values()];
}

/**
 * Union merge — cloud authoritative workIds are preserved; candidate overlays/adds.
 * Safe for stale local subset (41) vs fresher cloud superset (43).
 */
export function unionMergeWorkCatalogStore(
  cloud: WorkCatalogStore,
  candidate: WorkCatalogStore,
): WorkCatalogStore {
  const left = normalizeWorkCatalogStore(cloud);
  const right = normalizeWorkCatalogStore(candidate);
  const catalogs = { ...left.catalogs };

  for (const region of REGIONS) {
    const cloudSlice = left.catalogs[region];
    const candSlice = right.catalogs[region];
    const mergedWorks = mergeRegionWorks(
      cloudSlice?.works ?? [],
      candSlice?.works ?? [],
    );
    const sliceUpdatedAt =
      parseUpdatedAtMs(candSlice?.updatedAt) >= parseUpdatedAtMs(cloudSlice?.updatedAt)
        ? candSlice?.updatedAt ?? right.updatedAt
        : cloudSlice?.updatedAt ?? left.updatedAt;
    catalogs[region] = {
      region,
      works: mergedWorks,
      updatedAt: sliceUpdatedAt || right.updatedAt || left.updatedAt,
    };
  }

  const storeUpdatedAt =
    parseUpdatedAtMs(right.updatedAt) >= parseUpdatedAtMs(left.updatedAt)
      ? right.updatedAt
      : left.updatedAt;

  let merged = normalizeWorkCatalogStore({
    ...right,
    catalogs,
    activeRegion: right.activeRegion || left.activeRegion,
    updatedAt: storeUpdatedAt,
    migratedFromLegacyAt: right.migratedFromLegacyAt ?? left.migratedFromLegacyAt,
    seedManifestVersion: right.seedManifestVersion ?? left.seedManifestVersion,
  });
  merged = preserveOurWorkRatesFromDonor(merged, left);
  merged = preserveOurWorkRatesFromDonor(merged, right);
  return merged;
}
