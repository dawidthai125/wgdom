/**
 * MOPS Electrical RC-1 OPS — idempotent CatalogWork seed (no I/O in apply*).
 * Persist via caller: catalog-ik-owner-mops-electrical-rc1-ops.mjs --execute
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  MOPS_ELEC_RC1_CREATE_WORKS,
  MOPS_ELEC_RC1_CREATE_WORK_IDS,
  buildMopsElecRc1CatalogWork,
  workMatchesMopsElecRc1Spec,
  type MopsElecRc1WorkSpec,
} from "@/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog";

export const MOPS_ELEC_RC1_OPS_REGIONS = ["wroclaw", "dolnyslask"] as const;

export {
  MOPS_ELEC_RC1_CREATE_WORK_IDS,
  MOPS_ELEC_RC1_CREATE_WORKS,
  getMopsElecRc1WorkSpec,
  workMatchesMopsElecRc1Spec,
  isMopsElecRc1CreateWorkId,
} from "@/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog";

export type MopsElecRc1RegionSeedStatus = "ABSENT" | "PRESENT_OK";

export type MopsElecRc1SeedReport = {
  changed: boolean;
  store: WorkCatalogStore;
  createdWorkIds: string[];
  beforeCount: { wroclaw: number; dolnyslask: number };
  afterCount: { wroclaw: number; dolnyslask: number };
  perWork: Record<
    string,
    Record<(typeof MOPS_ELEC_RC1_OPS_REGIONS)[number], MopsElecRc1RegionSeedStatus>
  >;
};

export function assertMopsElecRc1NoConflictOrStop(
  existing: CatalogWork | null | undefined,
  spec: MopsElecRc1WorkSpec,
): MopsElecRc1RegionSeedStatus {
  if (!existing) return "ABSENT";
  if (workMatchesMopsElecRc1Spec(existing, spec)) return "PRESENT_OK";
  throw new Error(
    `CONFLICT ${existing.id}: namePl=${JSON.stringify(existing.namePl)} ` +
      `unit=${JSON.stringify(existing.unit)} tradeId=${JSON.stringify(existing.tradeId)} ` +
      `hasOurRate=${Boolean(existing.ourWorkRate)} ` +
      `descriptionPl=${JSON.stringify(existing.descriptionPl)}`,
  );
}

/**
 * Insert CREATE candidates into both regions when absent.
 * Does not modify CONNECT targets · does not set OUR RATE · does not invent BOM.
 */
export function applyMopsElecRc1CatalogSeed(
  store: WorkCatalogStore,
  nowIso: string,
): MopsElecRc1SeedReport {
  let changed = false;
  const createdWorkIds: string[] = [];
  const perWork: MopsElecRc1SeedReport["perWork"] = {};
  const catalogs = { ...store.catalogs };

  const beforeCount = {
    wroclaw: catalogs.wroclaw?.works.length ?? 0,
    dolnyslask: catalogs.dolnyslask?.works.length ?? 0,
  };

  for (const region of MOPS_ELEC_RC1_OPS_REGIONS) {
    const slice = catalogs[region];
    if (!slice) throw new Error(`missing region slice: ${region}`);
    const byId = new Map(slice.works.map((w) => [w.id, w]));
    let regionChanged = false;

    for (const spec of MOPS_ELEC_RC1_CREATE_WORKS) {
      if (!perWork[spec.id]) {
        perWork[spec.id] = { wroclaw: "ABSENT", dolnyslask: "ABSENT" };
      }
      const prev = byId.get(spec.id);
      const status = assertMopsElecRc1NoConflictOrStop(prev, spec);
      perWork[spec.id][region] = status;
      if (status === "PRESENT_OK") continue;

      const draft = buildMopsElecRc1CatalogWork(spec, nowIso);
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
