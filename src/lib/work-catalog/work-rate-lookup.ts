/**
 * WORK-CATALOG-REBUILD-01 P0 — cache-first lookup OUR RATE.
 * ZERO HTTP · ZERO research · ZERO mutacji.
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  deriveOurWorkRateFreshness,
  isOurRatePresent,
  workRateFreshnessLabelPl,
} from "@/lib/work-catalog/work-rate-freshness";
import type {
  OurWorkRate,
  WorkRateFreshnessStatus,
  WorkRateRegionScope,
  WorkRateSourceType,
} from "@/lib/work-catalog/work-rate-types";
import { buildWorkRateIdentityKey } from "@/lib/work-catalog/work-rate-types";

export type LookupWorkRateHit = {
  status: Exclude<WorkRateFreshnessStatus, "MISSING">;
  statusLabelPl: string;
  workId: string;
  unit: WgdomCostUnit;
  ourRatePln: number;
  sourceType: WorkRateSourceType;
  regionScope: WorkRateRegionScope;
  observedAt: string;
  updatedAt: string;
  rate: OurWorkRate;
  identityKey: string;
};

export type LookupWorkRateMiss = {
  status: "MISSING";
  statusLabelPl: string;
  workId: string;
  unit: WgdomCostUnit;
  ourRatePln: null;
  identityKey: string;
};

export type LookupWorkRateResult = LookupWorkRateHit | LookupWorkRateMiss;

function findWorkForIdentity(
  store: WorkCatalogStore,
  workId: string,
  unit: WgdomCostUnit,
): CatalogWork | null {
  const id = workId.trim();
  const regions: Array<keyof WorkCatalogStore["catalogs"]> = [
    store.activeRegion,
    store.activeRegion === "wroclaw" ? "dolnyslask" : "wroclaw",
  ];
  for (const region of regions) {
    const work = store.catalogs[region].works.find((w) => w.id === id);
    if (!work) continue;
    if (work.unit !== unit) {
      return null;
    }
    return work;
  }
  return null;
}

/**
 * Lookup Nasz Katalog Robót — pure, bez I/O sieciowego.
 * CURRENT → REUSE · STALE → zwróć stawkę + STALE · MISSING → BRAK STAWKI.
 * NIE czyta companyPricePln jako OUR RATE (C-NO-SEED).
 */
export function lookupWorkRate(
  store: WorkCatalogStore,
  workId: string,
  unit: WgdomCostUnit,
  nowMs: number,
): LookupWorkRateResult {
  const identityKey = buildWorkRateIdentityKey(workId, unit);
  const miss = (): LookupWorkRateMiss => ({
    status: "MISSING",
    statusLabelPl: workRateFreshnessLabelPl("MISSING"),
    workId: workId.trim(),
    unit,
    ourRatePln: null,
    identityKey,
  });

  const work = findWorkForIdentity(store, workId, unit);
  if (!work) return miss();

  const rate = work.ourWorkRate;
  const freshness = deriveOurWorkRateFreshness(rate, nowMs);
  if (freshness === "MISSING" || !rate || !isOurRatePresent(rate.ourRatePln)) {
    return miss();
  }

  return {
    status: freshness,
    statusLabelPl: workRateFreshnessLabelPl(freshness),
    workId: rate.workId,
    unit: rate.unit,
    ourRatePln: rate.ourRatePln,
    sourceType: rate.sourceType,
    regionScope: rate.regionScope,
    observedAt: rate.observedAt,
    updatedAt: rate.updatedAt,
    rate,
    identityKey,
  };
}
