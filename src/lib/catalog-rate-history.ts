/**
 * #5C-3D — neutral facade for catalog rate history (read + work-catalog write SSOT).
 */

import {
  buildRateSnapshotFromWorkCatalog,
  hasWorkCatalogRateChange,
} from "@/lib/catalog-rate-history-snapshot";
import type { TenderCompanyCostModel } from "@/lib/tenders-bzp-company";
import {
  COST_CATALOG_HISTORY_MAX_SNAPSHOTS,
  loadWgdomCostCatalogHistory,
  loadWgdomCostCatalogHistoryLocal,
  saveWgdomCostCatalogHistoryStore,
  type WgdomCostCatalogHistoryStore,
} from "@/lib/wgdom-cost-catalog-history";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";

export type { WgdomCostCatalogHistoryStore as CatalogRateHistoryStore };

export function loadCatalogRateHistoryLocal(): WgdomCostCatalogHistoryStore {
  return loadWgdomCostCatalogHistoryLocal();
}

export async function loadCatalogRateHistory(): Promise<WgdomCostCatalogHistoryStore> {
  return loadWgdomCostCatalogHistory();
}

export async function appendWorkCatalogRateHistoryIfChanged(
  previous: WorkCatalogStore,
  next: WorkCatalogStore,
  costModel: TenderCompanyCostModel,
): Promise<WgdomCostCatalogHistoryStore> {
  const region = next.activeRegion;
  const referenceHourlyPln = costModel.avgGrossHourlyPln;
  if (!hasWorkCatalogRateChange(previous, next, region, referenceHourlyPln)) {
    return loadWgdomCostCatalogHistoryLocal();
  }
  const history = loadWgdomCostCatalogHistoryLocal();
  const snapshot = buildRateSnapshotFromWorkCatalog(next, costModel, region);
  const updated: WgdomCostCatalogHistoryStore = {
    schemaVersion: 1,
    snapshots: [snapshot, ...history.snapshots].slice(0, COST_CATALOG_HISTORY_MAX_SNAPSHOTS),
    updatedAt: new Date().toISOString(),
  };
  await saveWgdomCostCatalogHistoryStore(updated);
  return updated;
}
