/**
 * IK-OWNER-A01-LP5 OPS — idempotent catalog merge (no KV I/O).
 * Self-contained OPS slice — catalog work draft inlined for KV seed.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";

export const IK_OWNER_CREATE_A01_LP5_WORK_ID =
  "cc-w2-impregnacja-biobojcza-m2" as const;

export const IK_OWNER_A01_LP5_OPS_REGIONS = ["wroclaw", "dolnyslask"] as const;

export const IK_OWNER_A01_LP5_OPS_EXPECTED = Object.freeze({
  id: IK_OWNER_CREATE_A01_LP5_WORK_ID,
  namePl: "Impregnacja biobójcza ręczna",
  unit: "m2",
  tradeId: "PRZYGOTOWANIE",
});

export type A01Lp5RegionSeedStatus = "ABSENT" | "PRESENT_OK";

/** Owner-approved CatalogWork draft — catalog-wave-2-ops `makeWork` field contract. */
export function buildIkOwnerCreateA01Lp5CatalogWork(nowIso: string): CatalogWork {
  return {
    id: IK_OWNER_CREATE_A01_LP5_WORK_ID,
    tradeId: "PRZYGOTOWANIE",
    namePl: "Impregnacja biobójcza ręczna",
    unit: "m2",
    companyPricePln: 22,
    updatedAt: nowIso,
    freshnessStatus: "ok",
    descriptionPl:
      "Impregnacja biobójcza ręczna powierzchni muru / podłoża (WM Paczka V LP5/LP10)",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    costSplit: { materialRatio: 0.6, laborRatio: 0.4 },
  };
}

export function workMatchesOwnerApprovedA01Lp5Spec(
  work: CatalogWork | null | undefined,
): boolean {
  if (!work) return false;
  return (
    work.id === IK_OWNER_A01_LP5_OPS_EXPECTED.id &&
    work.namePl === IK_OWNER_A01_LP5_OPS_EXPECTED.namePl &&
    work.unit === IK_OWNER_A01_LP5_OPS_EXPECTED.unit &&
    work.tradeId === IK_OWNER_A01_LP5_OPS_EXPECTED.tradeId &&
    work.active === true
  );
}

export function assertA01Lp5NoConflictOrStop(
  existing: CatalogWork | null | undefined,
): A01Lp5RegionSeedStatus {
  if (!existing) return "ABSENT";
  if (workMatchesOwnerApprovedA01Lp5Spec(existing)) return "PRESENT_OK";
  throw new Error(
    `CONFLICT ${existing.id}: namePl=${JSON.stringify(existing.namePl)} ` +
      `unit=${JSON.stringify(existing.unit)} tradeId=${JSON.stringify(existing.tradeId)} ` +
      `active=${existing.active}`,
  );
}

export function applyA01Lp5CatalogSeed(
  store: WorkCatalogStore,
  nowIso: string,
): {
  changed: boolean;
  store: WorkCatalogStore;
  perRegion: Record<(typeof IK_OWNER_A01_LP5_OPS_REGIONS)[number], A01Lp5RegionSeedStatus>;
} {
  const draft = buildIkOwnerCreateA01Lp5CatalogWork(nowIso);
  let changed = false;
  const perRegion = {} as Record<
    (typeof IK_OWNER_A01_LP5_OPS_REGIONS)[number],
    A01Lp5RegionSeedStatus
  >;

  const catalogs = { ...store.catalogs };
  for (const region of IK_OWNER_A01_LP5_OPS_REGIONS) {
    const slice = catalogs[region];
    if (!slice) throw new Error(`missing region slice: ${region}`);
    const byId = new Map(slice.works.map((w) => [w.id, w]));
    const prev = byId.get(IK_OWNER_CREATE_A01_LP5_WORK_ID);
    const status = assertA01Lp5NoConflictOrStop(prev);
    perRegion[region] = status;

    if (status === "PRESENT_OK") continue;

    byId.set(IK_OWNER_CREATE_A01_LP5_WORK_ID, { ...draft, updatedAt: nowIso });
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
