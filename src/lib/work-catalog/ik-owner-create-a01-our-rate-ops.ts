/**
 * IK-OWNER-A01-S3 — Owner-approved OUR RATE seed (LP9 + LP10 golden path labor).
 * REUSE patchOurWorkRateInStore — NIE mutuje marketQuotes / companyPricePln / commercialPricing.
 */

import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import { IK_OWNER_CREATE_A01_LP4_WORK_ID } from "@/lib/work-catalog/ik-owner-create-a01-lp4-catalog";
import { IK_OWNER_CREATE_A01_LP5_WORK_ID } from "@/lib/work-catalog/ik-owner-create-a01-lp5-catalog";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { patchOurWorkRateInStore } from "@/lib/work-catalog/work-rate-patch";

export const IK_OWNER_A01_OUR_RATE_OPS_REGIONS = ["wroclaw", "dolnyslask"] as const;

export type A01OurRateTargetSpec = {
  workId: string;
  unit: "m2";
  ourRatePln: number;
  expectedCompanyPricePln: number;
};

export const IK_OWNER_A01_OUR_RATE_TARGETS: readonly A01OurRateTargetSpec[] = [
  {
    workId: IK_OWNER_CREATE_A01_LP4_WORK_ID,
    unit: "m2",
    ourRatePln: 18,
    expectedCompanyPricePln: 18,
  },
  {
    workId: IK_OWNER_CREATE_A01_LP5_WORK_ID,
    unit: "m2",
    ourRatePln: 22,
    expectedCompanyPricePln: 22,
  },
] as const;

export const IK_OWNER_A01_OUR_RATE_OPS_EXPECTED = Object.freeze({
  worksTouched: IK_OWNER_A01_OUR_RATE_TARGETS.length,
  sourceType: "OWNER" as const,
  regionScope: "POLSKA" as const,
});

export type A01OurRateRegionStatus =
  | "ABSENT_WORK"
  | "MISSING_RATE"
  | "WRONG_RATE"
  | "PRESENT_OK";

export function stableMarketQuotesJson(work: CatalogWork | null | undefined): string {
  return JSON.stringify(work?.marketQuotes ?? null);
}

export function workHasExpectedA01OurRate(
  work: CatalogWork | null | undefined,
  expectedPln: number,
): boolean {
  if (!work) return false;
  const rate = work.ourWorkRate?.ourRatePln;
  return (
    work.ourWorkRate?.sourceType === "OWNER" &&
    Number.isFinite(rate) &&
    rate === expectedPln &&
    work.unit === "m2"
  );
}

export function probeA01OurRateRegion(
  store: WorkCatalogStore,
  workId: string,
  region: (typeof IK_OWNER_A01_OUR_RATE_OPS_REGIONS)[number],
  expectedPln: number,
): A01OurRateRegionStatus {
  const work = getWorkByIdFromStore(store, workId, region);
  if (!work) return "ABSENT_WORK";
  if (!work.ourWorkRate) return "MISSING_RATE";
  if (!workHasExpectedA01OurRate(work, expectedPln)) return "WRONG_RATE";
  return "PRESENT_OK";
}

export function probeA01OurRatePerTarget(
  store: WorkCatalogStore,
): Record<string, Record<(typeof IK_OWNER_A01_OUR_RATE_OPS_REGIONS)[number], A01OurRateRegionStatus>> {
  const out: Record<
    string,
    Record<(typeof IK_OWNER_A01_OUR_RATE_OPS_REGIONS)[number], A01OurRateRegionStatus>
  > = {};
  for (const target of IK_OWNER_A01_OUR_RATE_TARGETS) {
    out[target.workId] = Object.fromEntries(
      IK_OWNER_A01_OUR_RATE_OPS_REGIONS.map((r) => [
        r,
        probeA01OurRateRegion(store, target.workId, r, target.ourRatePln),
      ]),
    ) as Record<(typeof IK_OWNER_A01_OUR_RATE_OPS_REGIONS)[number], A01OurRateRegionStatus>;
  }
  return out;
}

function assertTargetPreconditions(
  store: WorkCatalogStore,
  target: A01OurRateTargetSpec,
): void {
  for (const region of IK_OWNER_A01_OUR_RATE_OPS_REGIONS) {
    const work = getWorkByIdFromStore(store, target.workId, region);
    if (!work) {
      throw new Error(`WORK_NOT_FOUND ${target.workId} region=${region}`);
    }
    if (work.unit !== target.unit) {
      throw new Error(`UNIT_MISMATCH ${target.workId} unit=${work.unit} expected=${target.unit}`);
    }
    if (Number(work.companyPricePln) !== target.expectedCompanyPricePln) {
      throw new Error(
        `WRONG_COMPANY_PRICE ${target.workId} companyPricePln=${work.companyPricePln} expected=${target.expectedCompanyPricePln}`,
      );
    }
  }
}

function ourRateNeedsPatch(
  store: WorkCatalogStore,
  target: A01OurRateTargetSpec,
): boolean {
  return IK_OWNER_A01_OUR_RATE_OPS_REGIONS.some(
    (r) => probeA01OurRateRegion(store, target.workId, r, target.ourRatePln) !== "PRESENT_OK",
  );
}

export type ApplyA01OurRateSeedResult = {
  store: WorkCatalogStore;
  changed: boolean;
  perTarget: Record<string, { patched: boolean; before: A01OurRateRegionStatus; after: A01OurRateRegionStatus }>;
  quotesFingerprintsBefore: Record<string, Record<string, string>>;
  quotesFingerprintsAfter: Record<string, Record<string, string>>;
};

/**
 * Owner-approved OUR RATE for LP9 + LP10. Idempotent when rates already match.
 * Verifies marketQuotes byte-stable per target/region before and after.
 */
export function applyA01OurRateSeed(
  store: WorkCatalogStore,
  nowIso: string,
): ApplyA01OurRateSeedResult {
  const quotesFingerprintsBefore: Record<string, Record<string, string>> = {};
  for (const target of IK_OWNER_A01_OUR_RATE_TARGETS) {
    assertTargetPreconditions(store, target);
    quotesFingerprintsBefore[target.workId] = Object.fromEntries(
      IK_OWNER_A01_OUR_RATE_OPS_REGIONS.map((r) => [
        r,
        stableMarketQuotesJson(getWorkByIdFromStore(store, target.workId, r)),
      ]),
    );
  }

  let working = store;
  let changed = false;
  const perTarget: ApplyA01OurRateSeedResult["perTarget"] = {};

  for (const target of IK_OWNER_A01_OUR_RATE_TARGETS) {
    const before = probeA01OurRateRegion(working, target.workId, "wroclaw", target.ourRatePln);
    const needsPatch = ourRateNeedsPatch(working, target);
    if (needsPatch) {
      const result = patchOurWorkRateInStore(working, {
        workId: target.workId,
        unit: target.unit,
        ourRatePln: target.ourRatePln,
        sourceType: "OWNER",
        regionScope: "POLSKA",
        observedAt: nowIso,
        updatedAt: nowIso,
      });
      if (!result.ok) {
        throw new Error(`PATCH_FAILED ${target.workId} reason=${result.reason}`);
      }
      working = result.store;
      changed = true;
    }
    const after = probeA01OurRateRegion(working, target.workId, "wroclaw", target.ourRatePln);
    perTarget[target.workId] = { patched: needsPatch, before, after };
  }

  const quotesFingerprintsAfter: Record<string, Record<string, string>> = {};
  for (const target of IK_OWNER_A01_OUR_RATE_TARGETS) {
    quotesFingerprintsAfter[target.workId] = Object.fromEntries(
      IK_OWNER_A01_OUR_RATE_OPS_REGIONS.map((r) => [
        r,
        stableMarketQuotesJson(getWorkByIdFromStore(working, target.workId, r)),
      ]),
    );
    for (const region of IK_OWNER_A01_OUR_RATE_OPS_REGIONS) {
      if (
        quotesFingerprintsBefore[target.workId]![region] !==
        quotesFingerprintsAfter[target.workId]![region]
      ) {
        throw new Error(
          `MARKETQUOTES_MUTATED ${target.workId} region=${region} — STOP`,
        );
      }
    }
  }

  return {
    store: working,
    changed,
    perTarget,
    quotesFingerprintsBefore,
    quotesFingerprintsAfter,
  };
}

export function assertA01OurRateTargetsPresentOrStop(store: WorkCatalogStore): void {
  for (const target of IK_OWNER_A01_OUR_RATE_TARGETS) {
    assertTargetPreconditions(store, target);
  }
}
