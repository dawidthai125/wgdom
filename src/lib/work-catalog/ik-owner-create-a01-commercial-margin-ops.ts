/**
 * IK-OWNER-A01 — Owner-approved commercialPricing margin seed (LP9 + LP10 F5 SELL).
 * REUSE patchWorkCommercialPricing — NIE mutuje marketQuotes / ourWorkRate / companyPricePln.
 */

import { getWorkByIdFromStore } from "@/lib/work-catalog/catalog-work-utils";
import { IK_OWNER_CREATE_A01_LP4_WORK_ID } from "@/lib/work-catalog/ik-owner-create-a01-lp4-catalog";
import {
  IK_OWNER_A01_OUR_RATE_OPS_REGIONS,
  probeA01OurRatePerTarget,
  stableMarketQuotesJson,
  workHasExpectedA01OurRate,
} from "@/lib/work-catalog/ik-owner-create-a01-our-rate-ops";
import { IK_OWNER_CREATE_A01_LP5_WORK_ID } from "@/lib/work-catalog/ik-owner-create-a01-lp5-catalog";
import type { CatalogWork, CommercialPricing, WorkCatalogStore } from "@/lib/work-catalog/types";
import {
  patchWorkCommercialPricing,
  resolveMarginPct,
} from "@/lib/price-intelligence/our-price-catalog";

export const IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS = IK_OWNER_A01_OUR_RATE_OPS_REGIONS;

export const IK_OWNER_A01_COMMERCIAL_MARGIN_FROZEN_COLLATERAL =
  "cc-w2-scianki-dzialowe-gr-pakiet-m2" as const;

export type A01CommercialMarginKey = "lp9" | "lp10";

export type A01CommercialMarginTargetSpec = {
  workId: string;
  expectedBasePln: number;
  marginKey: A01CommercialMarginKey;
};

export const IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS: readonly A01CommercialMarginTargetSpec[] = [
  {
    workId: IK_OWNER_CREATE_A01_LP4_WORK_ID,
    expectedBasePln: 18,
    marginKey: "lp9",
  },
  {
    workId: IK_OWNER_CREATE_A01_LP5_WORK_ID,
    expectedBasePln: 22,
    marginKey: "lp10",
  },
] as const;

export type A01CommercialMarginInput = {
  lp9: number;
  lp10: number;
};

export type A01CommercialMarginRegionProbe = {
  workId: string;
  region: (typeof IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS)[number];
  oldMarginPct: number | null;
  newMarginPct: number;
  source: CommercialPricing["source"] | null;
  changed: boolean;
  ourRate: number | null;
  quotesFingerprint: string;
  collateralStatus: "UNCHANGED";
};

export type ApplyA01CommercialMarginSeedResult = {
  store: WorkCatalogStore;
  changed: boolean;
  perTarget: Record<string, A01CommercialMarginRegionProbe[]>;
  quotesFingerprintsBefore: Record<string, Record<string, string>>;
  quotesFingerprintsAfter: Record<string, Record<string, string>>;
};

export function validateCommercialMarginPct(value: number, label = "marginPct"): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`INVALID_MARGIN_PCT ${label}`);
  }
  return value;
}

export function parseA01CommercialMarginCliArgs(argv: readonly string[]): A01CommercialMarginInput {
  const hasUnified = argv.includes("--margin-pct");
  const hasLp9 = argv.includes("--lp9-margin-pct");
  const hasLp10 = argv.includes("--lp10-margin-pct");

  if (hasUnified && (hasLp9 || hasLp10)) {
    throw new Error("CONFLICTING_MARGIN_FLAGS");
  }

  function readFlag(name: string): number | undefined {
    const index = argv.indexOf(name);
    if (index < 0) return undefined;
    const raw = argv[index + 1];
    if (raw == null || raw.startsWith("--")) return undefined;
    return validateCommercialMarginPct(Number(raw), name);
  }

  const unified = readFlag("--margin-pct");
  const lp9 = readFlag("--lp9-margin-pct");
  const lp10 = readFlag("--lp10-margin-pct");

  if (unified != null) {
    return { lp9: unified, lp10: unified };
  }
  if (lp9 != null && lp10 != null) {
    return { lp9, lp10 };
  }
  throw new Error("OWNER_MARGIN_VALUE_REQUIRED");
}

export function marginNeedsPatch(
  work: CatalogWork | null | undefined,
  targetMarginPct: number,
  targetSource: CommercialPricing["source"] = "owner",
): boolean {
  if (!work?.commercialPricing) return true;
  const existingMargin = resolveMarginPct(work);
  if (existingMargin == null) return true;
  if (Math.abs(existingMargin - targetMarginPct) >= 1e-9) return true;
  if (work.commercialPricing.source !== targetSource) return true;
  return false;
}

function marginPctForTarget(
  target: A01CommercialMarginTargetSpec,
  margins: A01CommercialMarginInput,
): number {
  return margins[target.marginKey];
}

function assertOurRatePreconditions(store: WorkCatalogStore): void {
  const rates = probeA01OurRatePerTarget(store);
  for (const target of IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS) {
    for (const region of IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS) {
      const status = rates[target.workId]?.[region];
      if (status !== "PRESENT_OK") {
        throw new Error(
          `OUR_RATE_PRECONDITION_FAILED ${target.workId} region=${region} status=${status}`,
        );
      }
    }
  }
}

function assertOurRateUnchanged(
  before: WorkCatalogStore,
  after: WorkCatalogStore,
): void {
  for (const target of IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS) {
    for (const region of IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS) {
      const beforeWork = getWorkByIdFromStore(before, target.workId, region);
      const afterWork = getWorkByIdFromStore(after, target.workId, region);
      if (
        !workHasExpectedA01OurRate(beforeWork, target.expectedBasePln) ||
        !workHasExpectedA01OurRate(afterWork, target.expectedBasePln)
      ) {
        throw new Error(`OUR_RATE_MUTATED ${target.workId} region=${region}`);
      }
      if (stableMarketQuotesJson(beforeWork) !== stableMarketQuotesJson(afterWork)) {
        throw new Error(`MARKETQUOTES_MUTATED ${target.workId} region=${region}`);
      }
    }
  }
}

function assertCollateralUnchanged(before: WorkCatalogStore, after: WorkCatalogStore): void {
  const beforeWork = getWorkByIdFromStore(
    before,
    IK_OWNER_A01_COMMERCIAL_MARGIN_FROZEN_COLLATERAL,
    "wroclaw",
  );
  const afterWork = getWorkByIdFromStore(
    after,
    IK_OWNER_A01_COMMERCIAL_MARGIN_FROZEN_COLLATERAL,
    "wroclaw",
  );
  if (stableMarketQuotesJson(beforeWork) !== stableMarketQuotesJson(afterWork)) {
    throw new Error(`COLLATERAL_MUTATED ${IK_OWNER_A01_COMMERCIAL_MARGIN_FROZEN_COLLATERAL}`);
  }
}

function captureQuotesFingerprints(
  store: WorkCatalogStore,
): Record<string, Record<string, string>> {
  const out: Record<string, Record<string, string>> = {};
  for (const target of IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS) {
    out[target.workId] = Object.fromEntries(
      IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS.map((region) => [
        region,
        stableMarketQuotesJson(getWorkByIdFromStore(store, target.workId, region)),
      ]),
    );
  }
  return out;
}

function targetNeedsMarginPatch(
  store: WorkCatalogStore,
  target: A01CommercialMarginTargetSpec,
  targetMarginPct: number,
): boolean {
  return IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS.some((region) => {
    const work = getWorkByIdFromStore(store, target.workId, region);
    return marginNeedsPatch(work, targetMarginPct, "owner");
  });
}

function patchCommercialMarginBothRegions(
  store: WorkCatalogStore,
  workId: string,
  targetMarginPct: number,
  nowIso: string,
): WorkCatalogStore {
  let working = store;
  const originalActiveRegion = store.activeRegion;

  for (const region of IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS) {
    const work = getWorkByIdFromStore(working, workId, region);
    if (!marginNeedsPatch(work, targetMarginPct, "owner")) {
      continue;
    }
    const patched = patchWorkCommercialPricing(
      { ...working, activeRegion: region },
      workId,
      targetMarginPct,
      nowIso,
      "owner",
    );
    if (!patched) {
      throw new Error(`WORK_NOT_FOUND ${workId} region=${region}`);
    }
    working = patched;
  }

  return { ...working, activeRegion: originalActiveRegion };
}

function buildRegionProbe(
  store: WorkCatalogStore,
  target: A01CommercialMarginTargetSpec,
  region: (typeof IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS)[number],
  targetMarginPct: number,
  regionChanged: boolean,
): A01CommercialMarginRegionProbe {
  const work = getWorkByIdFromStore(store, target.workId, region);
  const oldMarginPct = work?.commercialPricing ? resolveMarginPct(work) : null;
  return {
    workId: target.workId,
    region,
    oldMarginPct,
    newMarginPct: targetMarginPct,
    source: regionChanged ? "owner" : (work?.commercialPricing?.source ?? null),
    changed: regionChanged,
    ourRate: work?.ourWorkRate?.ourRatePln ?? null,
    quotesFingerprint: stableMarketQuotesJson(work),
    collateralStatus: "UNCHANGED",
  };
}

export function probeA01CommercialMarginPerTarget(
  store: WorkCatalogStore,
  margins: A01CommercialMarginInput,
): Record<string, A01CommercialMarginRegionProbe[]> {
  const out: Record<string, A01CommercialMarginRegionProbe[]> = {};
  for (const target of IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS) {
    const targetMarginPct = marginPctForTarget(target, margins);
    out[target.workId] = IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS.map((region) => {
      const work = getWorkByIdFromStore(store, target.workId, region);
      const needsPatch = marginNeedsPatch(work, targetMarginPct, "owner");
      return buildRegionProbe(store, target, region, targetMarginPct, needsPatch);
    });
  }
  return out;
}

/**
 * Owner-approved commercial margin for LP9 + LP10. Idempotent when margin already matches.
 * Verifies marketQuotes / OUR RATE / collateral byte-stable before and after.
 */
export function applyA01CommercialMarginSeed(
  store: WorkCatalogStore,
  margins: A01CommercialMarginInput,
  nowIso: string,
): ApplyA01CommercialMarginSeedResult {
  validateCommercialMarginPct(margins.lp9, "lp9");
  validateCommercialMarginPct(margins.lp10, "lp10");

  assertOurRatePreconditions(store);

  const quotesFingerprintsBefore = captureQuotesFingerprints(store);
  const collateralBefore = stableMarketQuotesJson(
    getWorkByIdFromStore(store, IK_OWNER_A01_COMMERCIAL_MARGIN_FROZEN_COLLATERAL, "wroclaw"),
  );

  let working = store;
  let changed = false;
  const perTarget: ApplyA01CommercialMarginSeedResult["perTarget"] = {};

  for (const target of IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS) {
    const targetMarginPct = marginPctForTarget(target, margins);
    const regionProbesBefore = IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS.map((region) => {
      const work = getWorkByIdFromStore(working, target.workId, region);
      return {
        region,
        oldMarginPct: work?.commercialPricing ? resolveMarginPct(work) : null,
        needsPatch: marginNeedsPatch(work, targetMarginPct, "owner"),
      };
    });

    const needsPatch = targetNeedsMarginPatch(working, target, targetMarginPct);
    if (needsPatch) {
      working = patchCommercialMarginBothRegions(
        working,
        target.workId,
        targetMarginPct,
        nowIso,
      );
      changed = true;
    }

    perTarget[target.workId] = IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS.map((region) => {
      const before = regionProbesBefore.find((entry) => entry.region === region);
      const regionChanged = before?.needsPatch === true && needsPatch;
      return buildRegionProbe(working, target, region, targetMarginPct, regionChanged);
    });
  }

  assertOurRateUnchanged(store, working);

  const quotesFingerprintsAfter = captureQuotesFingerprints(working);
  for (const target of IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS) {
    for (const region of IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS) {
      if (
        quotesFingerprintsBefore[target.workId]![region] !==
        quotesFingerprintsAfter[target.workId]![region]
      ) {
        throw new Error(`MARKETQUOTES_MUTATED ${target.workId} region=${region}`);
      }
    }
  }

  const collateralAfter = stableMarketQuotesJson(
    getWorkByIdFromStore(
      working,
      IK_OWNER_A01_COMMERCIAL_MARGIN_FROZEN_COLLATERAL,
      "wroclaw",
    ),
  );
  if (collateralBefore !== collateralAfter) {
    throw new Error(`COLLATERAL_MUTATED ${IK_OWNER_A01_COMMERCIAL_MARGIN_FROZEN_COLLATERAL}`);
  }

  return {
    store: working,
    changed,
    perTarget,
    quotesFingerprintsBefore,
    quotesFingerprintsAfter,
  };
}
