/**
 * C2 MOPS — Owner OUR RATE seed (M5) for KNNR 1305-01/02 prob works.
 *
 * Source: Owner decision — kalkulacja_97_pozycji_przetarg_3_mieszkania
 * REUSE patchOurWorkRateInStore — NIE mutuje companyPricePln / marketQuotes.
 */

import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { patchOurWorkRateInStore } from "@/lib/work-catalog/work-rate-patch";
import { lookupWorkRate } from "@/lib/work-catalog/work-rate-lookup";
import { buildWorkRateIdentityKey } from "@/lib/work-catalog/work-rate-types";
import {
  C2_KNR_WC_1305_01_WORK_ID,
  C2_KNR_WC_1305_02_WORK_ID,
  type C2KnrWcProbTableCode,
} from "./c2-knr-wc-prob-owner-create";

/** Owner GO — PLN / prob (kalkulacja ofertowa WGDOM). */
export const C2_OWNER_OUR_RATE_PLN: Readonly<Record<C2KnrWcProbTableCode, number>> =
  Object.freeze({
    "1305-01": 60.0,
    "1305-02": 20.0,
  });

export const C2_OUR_RATE_REGIONS = ["wroclaw", "dolnyslask"] as const;

export type C2OurRateTarget = {
  workId: string;
  tableCode: C2KnrWcProbTableCode;
  unit: "prob";
  ourRatePln: number;
};

export const C2_OUR_RATE_TARGETS: readonly C2OurRateTarget[] = [
  {
    workId: C2_KNR_WC_1305_01_WORK_ID,
    tableCode: "1305-01",
    unit: "prob",
    ourRatePln: C2_OWNER_OUR_RATE_PLN["1305-01"],
  },
  {
    workId: C2_KNR_WC_1305_02_WORK_ID,
    tableCode: "1305-02",
    unit: "prob",
    ourRatePln: C2_OWNER_OUR_RATE_PLN["1305-02"],
  },
] as const;

export type C2OurRateRegionStatus =
  | "ABSENT_WORK"
  | "MISSING_RATE"
  | "WRONG_RATE"
  | "PRESENT_OK";

export function probeC2OurRateRegion(
  store: WorkCatalogStore,
  workId: string,
  region: (typeof C2_OUR_RATE_REGIONS)[number],
  expectedPln: number,
): C2OurRateRegionStatus {
  const work = getWorkByIdFromStore(store, workId, region);
  if (!work) return "ABSENT_WORK";
  if (!work.ourWorkRate) return "MISSING_RATE";
  const rate = work.ourWorkRate.ourRatePln;
  if (
    work.ourWorkRate.sourceType !== "OWNER" ||
    work.unit !== "prob" ||
    !Number.isFinite(rate) ||
    rate !== expectedPln
  ) {
    return "WRONG_RATE";
  }
  return "PRESENT_OK";
}

export function workHasExpectedC2OurRate(
  work: CatalogWork | null | undefined,
  expectedPln: number,
): boolean {
  if (!work) return false;
  return (
    work.unit === "prob" &&
    work.ourWorkRate?.sourceType === "OWNER" &&
    work.ourWorkRate.ourRatePln === expectedPln
  );
}

function c2OurRateNeedsPatch(
  store: WorkCatalogStore,
  target: C2OurRateTarget,
): boolean {
  return C2_OUR_RATE_REGIONS.some(
    (r) => probeC2OurRateRegion(store, target.workId, r, target.ourRatePln) !== "PRESENT_OK",
  );
}

export type ApplyC2OurRateSeedResult = {
  store: WorkCatalogStore;
  changed: boolean;
  perTarget: Record<string, { patched: boolean }>;
};

/**
 * Owner M5 OUR RATE — idempotent when rates already match.
 * Requires C2 CatalogWork present in both regions (M3).
 */
export function applyC2KnrWcProbOurRateOwnerSeed(
  store: WorkCatalogStore,
  nowIso: string,
): ApplyC2OurRateSeedResult {
  let working = store;
  let changed = false;
  const perTarget: ApplyC2OurRateSeedResult["perTarget"] = {};

  for (const target of C2_OUR_RATE_TARGETS) {
    for (const region of C2_OUR_RATE_REGIONS) {
      const work = getWorkByIdFromStore(working, target.workId, region);
      if (!work) {
        throw new Error(`C2_M5_WORK_NOT_FOUND ${target.workId} region=${region}`);
      }
      if (work.unit !== "prob") {
        throw new Error(`C2_M5_UNIT_MISMATCH ${target.workId} unit=${work.unit}`);
      }
    }

    const needsPatch = c2OurRateNeedsPatch(working, target);
    if (needsPatch) {
      const result = patchOurWorkRateInStore(working, {
        workId: target.workId,
        unit: "prob",
        ourRatePln: target.ourRatePln,
        sourceType: "OWNER",
        regionScope: "WROCLAW",
        observedAt: nowIso,
        updatedAt: nowIso,
      });
      if (!result.ok) {
        throw new Error(`C2_M5_PATCH_FAILED ${target.workId} reason=${result.reason}`);
      }
      working = result.store;
      changed = true;
    }
    perTarget[target.workId] = { patched: needsPatch };
  }

  return { store: working, changed, perTarget };
}

export function assertC2OurRateLookupCurrent(
  store: WorkCatalogStore,
  nowMs: number,
): void {
  for (const target of C2_OUR_RATE_TARGETS) {
    const hit = lookupWorkRate(store, target.workId, "prob", nowMs);
    if (hit.status !== "CURRENT" || hit.ourRatePln !== target.ourRatePln) {
      throw new Error(
        `C2_M5_LOOKUP_FAIL ${target.workId} status=${hit.status} pln=${hit.ourRatePln}`,
      );
    }
    const missSzt = lookupWorkRate(store, target.workId, "szt", nowMs);
    if (missSzt.status !== "MISSING") {
      throw new Error(`C2_M5_ALIAS_SZT ${target.workId} status=${missSzt.status}`);
    }
    const key = buildWorkRateIdentityKey(target.workId, "prob");
    if (hit.identityKey !== key) {
      throw new Error(`C2_M5_IDENTITY_KEY ${hit.identityKey} expected=${key}`);
    }
  }
}
