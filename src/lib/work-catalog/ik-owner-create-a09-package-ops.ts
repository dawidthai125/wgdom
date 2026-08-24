/**
 * IK-OWNER-A09-PACKAGE OPS — idempotent catalog merge (no KV I/O).
 * Self-contained OPS slice — PACKAGE catalog draft for G177 KV seed.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
  buildIkOwnerCreateA09PackageCatalogWork,
} from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";

export {
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_G177_VERBATIM_BOQ,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
  buildIkOwnerCreateA09PackageCatalogWork,
} from "@/lib/work-catalog/ik-owner-create-a09-package-catalog";

export const IK_OWNER_A09_PACKAGE_OPS_REGIONS = ["wroclaw", "dolnyslask"] as const;

export const IK_OWNER_A09_PACKAGE_OPS_EXPECTED = Object.freeze({
  id: IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
  namePl: "Ścianki działowe GR — pakiet GK (ruszt, obustronnie)",
  unit: "m2",
  tradeId: "SCIANY_GK",
  costSplit: IK_OWNER_CREATE_A09_PACKAGE_COST_SPLIT,
  companyPricePln: 0,
  freshnessStatus: "missing" as const,
});

export type A09PackageRegionSeedStatus = "ABSENT" | "PRESENT_OK";

export function workMatchesOwnerApprovedA09PackageSpec(
  work: CatalogWork | null | undefined,
): boolean {
  if (!work) return false;
  const split = work.costSplit;
  return (
    work.id === IK_OWNER_A09_PACKAGE_OPS_EXPECTED.id &&
    work.namePl === IK_OWNER_A09_PACKAGE_OPS_EXPECTED.namePl &&
    work.unit === IK_OWNER_A09_PACKAGE_OPS_EXPECTED.unit &&
    work.tradeId === IK_OWNER_A09_PACKAGE_OPS_EXPECTED.tradeId &&
    work.active === true &&
    work.companyPricePln === IK_OWNER_A09_PACKAGE_OPS_EXPECTED.companyPricePln &&
    work.freshnessStatus === IK_OWNER_A09_PACKAGE_OPS_EXPECTED.freshnessStatus &&
    work.ourWorkRate == null &&
    split != null &&
    split.materialRatio === IK_OWNER_A09_PACKAGE_OPS_EXPECTED.costSplit.materialRatio &&
    split.laborRatio === IK_OWNER_A09_PACKAGE_OPS_EXPECTED.costSplit.laborRatio
  );
}

export function assertA09PackageNoConflictOrStop(
  existing: CatalogWork | null | undefined,
): A09PackageRegionSeedStatus {
  if (!existing) return "ABSENT";
  if (workMatchesOwnerApprovedA09PackageSpec(existing)) return "PRESENT_OK";
  throw new Error(
    `CONFLICT ${existing.id}: namePl=${JSON.stringify(existing.namePl)} ` +
      `unit=${JSON.stringify(existing.unit)} tradeId=${JSON.stringify(existing.tradeId)} ` +
      `companyPricePln=${existing.companyPricePln} active=${existing.active}`,
  );
}

export function applyA09PackageCatalogSeed(
  store: WorkCatalogStore,
  nowIso: string,
): {
  changed: boolean;
  store: WorkCatalogStore;
  perRegion: Record<(typeof IK_OWNER_A09_PACKAGE_OPS_REGIONS)[number], A09PackageRegionSeedStatus>;
} {
  const draft = buildIkOwnerCreateA09PackageCatalogWork(nowIso);
  let changed = false;
  const perRegion = {} as Record<
    (typeof IK_OWNER_A09_PACKAGE_OPS_REGIONS)[number],
    A09PackageRegionSeedStatus
  >;

  const catalogs = { ...store.catalogs };
  for (const region of IK_OWNER_A09_PACKAGE_OPS_REGIONS) {
    const slice = catalogs[region];
    if (!slice) throw new Error(`missing region slice: ${region}`);
    const byId = new Map(slice.works.map((w) => [w.id, w]));
    const prev = byId.get(IK_OWNER_CREATE_A09_PACKAGE_WORK_ID);
    const status = assertA09PackageNoConflictOrStop(prev);
    perRegion[region] = status;

    if (status === "PRESENT_OK") continue;

    byId.set(IK_OWNER_CREATE_A09_PACKAGE_WORK_ID, { ...draft, updatedAt: nowIso });
    changed = true;
    catalogs[region] = {
      ...slice,
      works: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "pl")),
      updatedAt: nowIso,
    };
  }

  if (!changed) {
    return { changed: false, store, perRegion };
  }

  return {
    changed: true,
    perRegion,
    store: {
      ...store,
      catalogs,
      updatedAt: nowIso,
    },
  };
}

/** Guard: seed must not mutate or alias the rejected LABOR host row. */
export function assertA09LaborHostUntouched(
  before: CatalogWork | null | undefined,
  after: CatalogWork | null | undefined,
): boolean {
  if (!before && !after) return true;
  if (!before || !after) return false;
  return (
    before.id === IK_OWNER_A09_REJECTED_LABOR_HOST_ID &&
    after.id === before.id &&
    after.namePl === before.namePl &&
    after.unit === before.unit &&
    after.tradeId === before.tradeId &&
    after.companyPricePln === before.companyPricePln &&
    after.ourWorkRate === before.ourWorkRate
  );
}
