/**
 * Sępa A1/A2 OPS — idempotent CatalogWork seed (no I/O in apply*).
 * Persist via caller: saveWorkCatalogRouted / cloud OPS script.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  SEPA_KNNR_1301_WORKS,
  SEPA_KNNR_1301_WORK_IDS,
  buildSepaKnr1301PomiarCatalogWork,
  workMatchesSepaKnr1301Spec,
  type SepaKnr1301WorkSpec,
} from "@/lib/work-catalog/ik-owner-create-sepa-1301-pomiar-catalog";

export const SEPA_KNNR_1301_OPS_REGIONS = ["wroclaw", "dolnyslask"] as const;

export {
  SEPA_KNNR_1301_WORK_IDS,
  SEPA_KNNR_1301_WORKS,
  getSepaKnr1301WorkSpec,
  workMatchesSepaKnr1301Spec,
} from "@/lib/work-catalog/ik-owner-create-sepa-1301-pomiar-catalog";

export type SepaKnr1301RegionSeedStatus = "ABSENT" | "PRESENT_OK";

export type SepaKnr1301SeedReport = {
  changed: boolean;
  store: WorkCatalogStore;
  createdWorkIds: string[];
  beforeCount: { wroclaw: number; dolnyslask: number };
  afterCount: { wroclaw: number; dolnyslask: number };
  perWork: Record<
    string,
    Record<(typeof SEPA_KNNR_1301_OPS_REGIONS)[number], SepaKnr1301RegionSeedStatus>
  >;
};

export function assertSepaKnr1301NoConflictOrStop(
  existing: CatalogWork | null | undefined,
  spec: SepaKnr1301WorkSpec,
): SepaKnr1301RegionSeedStatus {
  if (!existing) return "ABSENT";
  if (workMatchesSepaKnr1301Spec(existing, spec)) return "PRESENT_OK";
  throw new Error(
    `CONFLICT ${existing.id}: namePl=${JSON.stringify(existing.namePl)} ` +
      `unit=${JSON.stringify(existing.unit)} tradeId=${JSON.stringify(existing.tradeId)} ` +
      `costSplit=${JSON.stringify(existing.costSplit)} ` +
      `descriptionPl=${JSON.stringify(existing.descriptionPl)} ` +
      `active=${existing.active}`,
  );
}

/**
 * Insert A1+A2 into both regions when absent.
 * Does not modify matching existing rows · does not touch 1305 / other works.
 */
export function applySepaKnr1301PomiarCatalogSeed(
  store: WorkCatalogStore,
  nowIso: string,
): SepaKnr1301SeedReport {
  let changed = false;
  const createdWorkIds: string[] = [];
  const perWork: SepaKnr1301SeedReport["perWork"] = {};
  const catalogs = { ...store.catalogs };

  const beforeCount = {
    wroclaw: catalogs.wroclaw?.works.length ?? 0,
    dolnyslask: catalogs.dolnyslask?.works.length ?? 0,
  };

  for (const region of SEPA_KNNR_1301_OPS_REGIONS) {
    const slice = catalogs[region];
    if (!slice) throw new Error(`missing region slice: ${region}`);
    const byId = new Map(slice.works.map((w) => [w.id, w]));
    let regionChanged = false;

    for (const spec of SEPA_KNNR_1301_WORKS) {
      if (!perWork[spec.id]) {
        perWork[spec.id] = {
          wroclaw: "ABSENT",
          dolnyslask: "ABSENT",
        };
      }
      const prev = byId.get(spec.id);
      const status = assertSepaKnr1301NoConflictOrStop(prev, spec);
      perWork[spec.id][region] = status;
      if (status === "PRESENT_OK") continue;

      const draft = buildSepaKnr1301PomiarCatalogWork(spec, nowIso);
      byId.set(spec.id, { ...draft, updatedAt: nowIso });
      regionChanged = true;
      changed = true;
      if (region === "wroclaw" && !createdWorkIds.includes(spec.id)) {
        createdWorkIds.push(spec.id);
      }
    }

    if (regionChanged) {
      catalogs[region] = {
        ...slice,
        works: [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, "pl")),
        updatedAt: nowIso,
      };
    }
  }

  const nextStore: WorkCatalogStore = changed
    ? { ...store, catalogs, updatedAt: nowIso }
    : store;

  return {
    changed,
    store: nextStore,
    createdWorkIds,
    beforeCount,
    afterCount: {
      wroclaw: nextStore.catalogs.wroclaw?.works.length ?? 0,
      dolnyslask: nextStore.catalogs.dolnyslask?.works.length ?? 0,
    },
    perWork,
  };
}
