/**
 * Work Catalog insert helpers — P5.26 CREATE pattern reuse (KNR WC Identity Bridge P3).
 * Single authority path: callers persist via saveWorkCatalogRouted only.
 */

import type { WgdomCostRegion } from "@/lib/wgdom-cost-catalog";
import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";

const WORK_CATALOG_REGIONS: readonly WgdomCostRegion[] = ["wroclaw", "dolnyslask"];

export class CatalogWorkDuplicateIdError extends Error {
  readonly code = "duplicate_work_id" as const;
  readonly workId: string;
  readonly region: WgdomCostRegion;

  constructor(workId: string, region: WgdomCostRegion) {
    super(`DUPLICATE_IN_REGION ${region} ${workId}`);
    this.name = "CatalogWorkDuplicateIdError";
    this.workId = workId;
    this.region = region;
  }
}

/** True if workId exists in either catalog region slice. */
export function catalogWorkExistsInStore(
  store: WorkCatalogStore,
  workId: string,
): boolean {
  const id = String(workId ?? "").trim();
  if (!id) return false;
  return WORK_CATALOG_REGIONS.some(
    (region) => getWorkByIdFromStore(store, id, region) != null,
  );
}

/** Throws CatalogWorkDuplicateIdError when workId already present in any region. */
export function assertWorkIdNotDuplicateInStore(
  store: WorkCatalogStore,
  workId: string,
): void {
  const id = String(workId ?? "").trim();
  if (!id) throw new Error("workId required");
  for (const region of WORK_CATALOG_REGIONS) {
    if (getWorkByIdFromStore(store, id, region) != null) {
      throw new CatalogWorkDuplicateIdError(id, region);
    }
  }
}

/**
 * Append one work to both region slices (P5.26 convention).
 * Does not persist — caller routes through saveWorkCatalogRouted.
 */
export function insertWorkBothRegions(
  store: WorkCatalogStore,
  work: CatalogWork,
  nowIso: string,
): WorkCatalogStore {
  assertWorkIdNotDuplicateInStore(store, work.id);

  const catalogs = { ...store.catalogs };
  for (const region of WORK_CATALOG_REGIONS) {
    const slice = catalogs[region];
    if (!slice) continue;
    catalogs[region] = {
      ...slice,
      works: [...slice.works, { ...work, updatedAt: nowIso }],
      updatedAt: nowIso,
    };
  }

  return {
    ...store,
    catalogs,
    updatedAt: nowIso,
  };
}
