/**
 * EPIC A / A0.2 OPS — idempotent catalog merge for 8 Środa CatalogWork (no KV I/O).
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  IK_OWNER_SRODA_A02_WORKS,
  buildSrodaA02CatalogWork,
  workMatchesSrodaA02Spec,
  type SrodaA02WorkSpec,
} from "@/lib/work-catalog/ik-owner-create-sroda-a02-catalog";

export const IK_OWNER_SRODA_A02_OPS_REGIONS = ["wroclaw", "dolnyslask"] as const;

export type SrodaA02RegionSeedStatus = "ABSENT" | "PRESENT_OK";

export type SrodaA02SeedReport = {
  changed: boolean;
  store: WorkCatalogStore;
  perWork: Record<
    string,
    Record<(typeof IK_OWNER_SRODA_A02_OPS_REGIONS)[number], SrodaA02RegionSeedStatus>
  >;
};

export function assertSrodaA02NoConflictOrStop(
  existing: CatalogWork | null | undefined,
  spec: SrodaA02WorkSpec,
): SrodaA02RegionSeedStatus {
  if (!existing) return "ABSENT";
  if (workMatchesSrodaA02Spec(existing, spec)) return "PRESENT_OK";
  throw new Error(
    `CONFLICT ${existing.id}: namePl=${JSON.stringify(existing.namePl)} ` +
      `unit=${JSON.stringify(existing.unit)} tradeId=${JSON.stringify(existing.tradeId)} ` +
      `keywords=${JSON.stringify(existing.keywords)} ` +
      `descriptionPl=${JSON.stringify(existing.descriptionPl)} ` +
      `active=${existing.active}`,
  );
}

/**
 * Insert all 8 A0.2 works into both regions when absent.
 * Does not modify existing works that already match the freeze.
 */
export function applySrodaA02CatalogSeed(
  store: WorkCatalogStore,
  nowIso: string,
): SrodaA02SeedReport {
  let changed = false;
  const perWork: SrodaA02SeedReport["perWork"] = {};
  const catalogs = { ...store.catalogs };

  for (const region of IK_OWNER_SRODA_A02_OPS_REGIONS) {
    const slice = catalogs[region];
    if (!slice) throw new Error(`missing region slice: ${region}`);
    const byId = new Map(slice.works.map((w) => [w.id, w]));
    let regionChanged = false;

    for (const spec of IK_OWNER_SRODA_A02_WORKS) {
      if (!perWork[spec.id]) {
        perWork[spec.id] = {
          wroclaw: "ABSENT",
          dolnyslask: "ABSENT",
        };
      }
      const prev = byId.get(spec.id);
      const status = assertSrodaA02NoConflictOrStop(prev, spec);
      perWork[spec.id][region] = status;
      if (status === "PRESENT_OK") continue;

      const draft = buildSrodaA02CatalogWork(spec, nowIso);
      byId.set(spec.id, { ...draft, updatedAt: nowIso });
      regionChanged = true;
      changed = true;
    }

    if (regionChanged) {
      catalogs[region] = {
        ...slice,
        works: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "pl")),
        updatedAt: nowIso,
      };
    }
  }

  if (!changed) {
    return { changed: false, store, perWork };
  }

  return {
    changed: true,
    perWork,
    store: {
      ...store,
      catalogs,
      updatedAt: nowIso,
    },
  };
}

export {
  IK_OWNER_SRODA_A02_WORKS,
  IK_OWNER_SRODA_A02_WORK_IDS,
  IK_OWNER_SRODA_A02_TENDER_ID,
  buildSrodaA02CatalogWork,
  buildAllSrodaA02CatalogWorks,
  workMatchesSrodaA02Spec,
  getSrodaA02WorkSpec,
} from "@/lib/work-catalog/ik-owner-create-sroda-a02-catalog";
