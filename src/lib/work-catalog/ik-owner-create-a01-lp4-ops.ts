/**
 * IK-OWNER-A01-LP4 OPS — idempotent catalog merge (no KV I/O).
 * Self-contained OPS slice — catalog work draft SSOT from ik-owner-create-a01-lp4-catalog.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  IK_OWNER_CREATE_A01_LP4_WORK_ID,
  buildIkOwnerCreateA01Lp4CatalogWork,
} from "@/lib/work-catalog/ik-owner-create-a01-lp4-catalog";

export {
  IK_OWNER_CREATE_A01_LP4_WORK_ID,
  buildIkOwnerCreateA01Lp4CatalogWork,
} from "@/lib/work-catalog/ik-owner-create-a01-lp4-catalog";

export const IK_OWNER_A01_LP4_OPS_REGIONS = ["wroclaw", "dolnyslask"] as const;

export const IK_OWNER_A01_LP4_OPS_EXPECTED = Object.freeze({
  id: IK_OWNER_CREATE_A01_LP4_WORK_ID,
  namePl: "Oczyszczenie / zmywanie podłoża",
  unit: "m2",
  tradeId: "PRZYGOTOWANIE",
});

export type A01Lp4RegionSeedStatus = "ABSENT" | "PRESENT_OK";

export function workMatchesOwnerApprovedA01Lp4Spec(
  work: CatalogWork | null | undefined,
): boolean {
  if (!work) return false;
  return (
    work.id === IK_OWNER_A01_LP4_OPS_EXPECTED.id &&
    work.namePl === IK_OWNER_A01_LP4_OPS_EXPECTED.namePl &&
    work.unit === IK_OWNER_A01_LP4_OPS_EXPECTED.unit &&
    work.tradeId === IK_OWNER_A01_LP4_OPS_EXPECTED.tradeId &&
    work.active === true
  );
}

export function assertA01Lp4NoConflictOrStop(
  existing: CatalogWork | null | undefined,
): A01Lp4RegionSeedStatus {
  if (!existing) return "ABSENT";
  if (workMatchesOwnerApprovedA01Lp4Spec(existing)) return "PRESENT_OK";
  throw new Error(
    `CONFLICT ${existing.id}: namePl=${JSON.stringify(existing.namePl)} ` +
      `unit=${JSON.stringify(existing.unit)} tradeId=${JSON.stringify(existing.tradeId)} ` +
      `active=${existing.active}`,
  );
}

export function applyA01Lp4CatalogSeed(
  store: WorkCatalogStore,
  nowIso: string,
): {
  changed: boolean;
  store: WorkCatalogStore;
  perRegion: Record<(typeof IK_OWNER_A01_LP4_OPS_REGIONS)[number], A01Lp4RegionSeedStatus>;
} {
  const draft = buildIkOwnerCreateA01Lp4CatalogWork(nowIso);
  let changed = false;
  const perRegion = {} as Record<
    (typeof IK_OWNER_A01_LP4_OPS_REGIONS)[number],
    A01Lp4RegionSeedStatus
  >;

  const catalogs = { ...store.catalogs };
  for (const region of IK_OWNER_A01_LP4_OPS_REGIONS) {
    const slice = catalogs[region];
    if (!slice) throw new Error(`missing region slice: ${region}`);
    const byId = new Map(slice.works.map((w) => [w.id, w]));
    const prev = byId.get(IK_OWNER_CREATE_A01_LP4_WORK_ID);
    const status = assertA01Lp4NoConflictOrStop(prev);
    perRegion[region] = status;

    if (status === "PRESENT_OK") continue;

    byId.set(IK_OWNER_CREATE_A01_LP4_WORK_ID, { ...draft, updatedAt: nowIso });
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
