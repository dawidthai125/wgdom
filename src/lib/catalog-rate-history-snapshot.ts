/**
 * #5C-3D — pure projection WorkCatalogStore → CostCatalogSnapshot (history SSOT).
 * Zero I/O · deterministyczny fingerprint diff.
 */

import { computeLaborPlnPerUnitFromRbh } from "@/lib/labor-benchmark";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import {
  WGDOM_COST_CATEGORY_IDS,
  type WgdomCostCatalog,
  type WgdomCostRegion,
} from "@/lib/wgdom-cost-catalog";
import type { CostCatalogSnapshot } from "@/lib/wgdom-cost-catalog-history";
import { buildLegacyCostCatalogFromWorkStore } from "@/lib/work-catalog/work-catalog-engine-adapter";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";

interface CategoryRateRow {
  id: (typeof WGDOM_COST_CATEGORY_IDS)[number];
  unit: CostCatalogSnapshot["rates"][number]["unit"];
  materialPlnPerUnit: number;
  laborRbhPerUnit: number;
}

function listCategoryRatesFromCatalog(catalog: WgdomCostCatalog): CategoryRateRow[] {
  return WGDOM_COST_CATEGORY_IDS.map((id) => {
    const cat = catalog.categories.find((c) => c.id === id);
    const primary = cat?.rates[0];
    return {
      id,
      unit: primary?.unit ?? "m2",
      materialPlnPerUnit: primary?.materialPlnPerUnit ?? 0,
      laborRbhPerUnit: primary?.laborRbhPerUnit ?? 0,
    };
  });
}

function ratesFingerprintFromCatalog(catalog: WgdomCostCatalog): string {
  return listCategoryRatesFromCatalog(catalog)
    .map((r) => `${r.id}:${r.unit}:${r.laborRbhPerUnit}:${r.materialPlnPerUnit}`)
    .join("|");
}

function buildLegacyCatalogForFingerprint(
  store: WorkCatalogStore,
  region: WgdomCostRegion,
  referenceHourlyPln?: number,
): WgdomCostCatalog {
  return buildLegacyCostCatalogFromWorkStore(store, region, {
    referenceHourlyPln,
    updatedAtIso: store.updatedAt,
  });
}

export function hasWorkCatalogRateChange(
  previous: WorkCatalogStore,
  next: WorkCatalogStore,
  region?: WgdomCostRegion,
  referenceHourlyPln?: number,
): boolean {
  const targetRegion = region ?? next.activeRegion;
  const prevCatalog = buildLegacyCatalogForFingerprint(previous, targetRegion, referenceHourlyPln);
  const nextCatalog = buildLegacyCatalogForFingerprint(next, targetRegion, referenceHourlyPln);
  return ratesFingerprintFromCatalog(prevCatalog) !== ratesFingerprintFromCatalog(nextCatalog);
}

export function buildRateSnapshotFromWorkCatalog(
  store: WorkCatalogStore,
  costModel: TenderCompanyCostModel,
  region?: WgdomCostRegion,
): CostCatalogSnapshot {
  const targetRegion = region ?? store.activeRegion;
  const catalog = buildLegacyCostCatalogFromWorkStore(store, targetRegion, {
    referenceHourlyPln: costModel.avgGrossHourlyPln,
    updatedAtIso: store.updatedAt,
  });
  const rows = listCategoryRatesFromCatalog(catalog);
  return {
    at: new Date().toISOString(),
    region: targetRegion,
    rates: rows.map((row) => ({
      categoryId: row.id,
      unit: row.unit,
      laborRbhPerUnit: row.laborRbhPerUnit,
      laborPlnPerUnit: computeLaborPlnPerUnitFromRbh(row.laborRbhPerUnit, costModel),
      materialPlnPerUnit: row.materialPlnPerUnit,
    })),
  };
}
