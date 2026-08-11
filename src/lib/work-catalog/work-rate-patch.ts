/**
 * WORK-CATALOG-REBUILD-01 P0 — Owner edit / Accept path OUR RATE.
 * NIE używa patchWorkCompanyPriceInStore.
 * NIGDY nie mutuje companyPricePln / marketQuotes / commercialPricing.
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { appendOurWorkRateHistory } from "@/lib/work-catalog/work-rate-normalize";
import type {
  OurWorkRate,
  WorkRateRegionScope,
  WorkRateSourceType,
} from "@/lib/work-catalog/work-rate-types";

export type PatchOurWorkRateInput = {
  workId: string;
  unit: WgdomCostUnit;
  ourRatePln: number;
  sourceType: WorkRateSourceType;
  regionScope: WorkRateRegionScope;
  observedAt: string;
  updatedAt: string;
  sourceRatePln?: number;
};

export type PatchOurWorkRateResult =
  | { ok: true; store: WorkCatalogStore }
  | {
      ok: false;
      reason:
        | "WORK_NOT_FOUND"
        | "UNIT_MISMATCH"
        | "INVALID_RATE"
        | "INVALID_TIMESTAMP";
    };

function roundRatePln(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildNextOurWorkRate(
  previous: OurWorkRate | undefined,
  input: PatchOurWorkRateInput,
): OurWorkRate {
  const ourRatePln = roundRatePln(input.ourRatePln);
  const prevPln =
    previous && Number.isFinite(previous.ourRatePln) && previous.ourRatePln > 0
      ? previous.ourRatePln
      : undefined;
  const changePln =
    prevPln != null ? roundRatePln(ourRatePln - prevPln) : undefined;

  const historyEntry = {
    workId: input.workId.trim(),
    unit: input.unit,
    ratePln: ourRatePln,
    kind: "OUR" as const,
    sourceType: input.sourceType,
    regionScope: input.regionScope,
    observedAt: input.observedAt,
    ...(changePln != null ? { changePln } : {}),
  };

  return {
    workId: input.workId.trim(),
    unit: input.unit,
    ourRatePln,
    sourceType: input.sourceType,
    regionScope: input.regionScope,
    observedAt: input.observedAt,
    updatedAt: input.updatedAt,
    ...(input.sourceRatePln != null &&
    Number.isFinite(input.sourceRatePln) &&
    input.sourceRatePln > 0
      ? { sourceRatePln: roundRatePln(input.sourceRatePln) }
      : {}),
    history: appendOurWorkRateHistory(previous?.history, historyEntry),
  };
}

function patchWorkInSlice(
  work: CatalogWork,
  nextRate: OurWorkRate,
): CatalogWork {
  return {
    ...work,
    ourWorkRate: nextRate,
    // NIE zmieniaj companyPricePln / marketQuotes / commercialPricing / updatedAt work
  };
}

/**
 * Immutable Owner Edit / Accept OUR RATE we wszystkich slice'ach mających workId.
 * Identity: workId + unit — unit mismatch ⇒ UNIT_MISMATCH (bez zapisu).
 */
export function patchOurWorkRateInStore(
  store: WorkCatalogStore,
  input: PatchOurWorkRateInput,
): PatchOurWorkRateResult {
  if (!Number.isFinite(input.ourRatePln) || !(input.ourRatePln > 0)) {
    return { ok: false, reason: "INVALID_RATE" };
  }
  if (!input.observedAt?.trim() || !input.updatedAt?.trim()) {
    return { ok: false, reason: "INVALID_TIMESTAMP" };
  }

  const workId = input.workId.trim();
  let foundAny = false;
  let unitMismatch = false;
  let previousRate: OurWorkRate | undefined;

  for (const region of ["wroclaw", "dolnyslask"] as const) {
    const work = store.catalogs[region].works.find((w) => w.id === workId);
    if (!work) continue;
    foundAny = true;
    if (work.unit !== input.unit) {
      unitMismatch = true;
      break;
    }
    if (!previousRate && work.ourWorkRate) previousRate = work.ourWorkRate;
  }

  if (!foundAny) return { ok: false, reason: "WORK_NOT_FOUND" };
  if (unitMismatch) return { ok: false, reason: "UNIT_MISMATCH" };

  const nextRate = buildNextOurWorkRate(previousRate, {
    ...input,
    workId,
  });

  const catalogs = { ...store.catalogs };
  for (const region of ["wroclaw", "dolnyslask"] as const) {
    const slice = catalogs[region];
    const idx = slice.works.findIndex((w) => w.id === workId);
    if (idx < 0) continue;
    const works = [...slice.works];
    works[idx] = patchWorkInSlice(works[idx]!, nextRate);
    catalogs[region] = {
      ...slice,
      works,
      updatedAt: input.updatedAt,
    };
  }

  return {
    ok: true,
    store: {
      ...store,
      catalogs,
      updatedAt: input.updatedAt,
    },
  };
}
