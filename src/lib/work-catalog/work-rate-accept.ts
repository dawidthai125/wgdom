/**
 * WORK-RATE-SELECTIVE-RESEARCH-02 — Owner Accept kandydata research → OUR RATE.
 * NIGDY auto-write bez Accept · nie mutuje companyPricePln / marketQuotes.
 */

import type { CatalogWork, WorkCatalogStore } from "@/lib/work-catalog/types";
import { appendOurWorkRateHistory } from "@/lib/work-catalog/work-rate-normalize";
import type { WorkRateResearchCandidate } from "@/lib/work-catalog/work-rate-research";
import type { OurWorkRate } from "@/lib/work-catalog/work-rate-types";

export type AcceptWorkRateResearchResult =
  | { ok: true; store: WorkCatalogStore }
  | {
      ok: false;
      reason:
        | "WORK_NOT_FOUND"
        | "UNIT_MISMATCH"
        | "INVALID_RATE"
        | "INVALID_TIMESTAMP"
        | "INVALID_CANDIDATE";
    };

function roundRatePln(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Accept: SOURCE history (obserwacje) + OUR (ACCEPT).
 * P5.16-B C1: OUR RATE storage = market BASE (marketBaseRatePln), never proposed SELL.
 * proposedOurRatePln / suggestedRatePln remain display-only on the candidate.
 */
export function acceptWorkRateResearchCandidate(input: {
  store: WorkCatalogStore;
  candidate: WorkRateResearchCandidate;
  observedAt?: string;
  updatedAt?: string;
}): AcceptWorkRateResearchResult {
  const marketBase = Number(input.candidate.marketBaseRatePln);
  if (!Number.isFinite(marketBase) || !(marketBase > 0)) {
    return { ok: false, reason: "INVALID_CANDIDATE" };
  }
  const observedAt = input.observedAt?.trim() || new Date().toISOString();
  const updatedAt = input.updatedAt?.trim() || observedAt;
  if (!observedAt || !updatedAt) {
    return { ok: false, reason: "INVALID_TIMESTAMP" };
  }

  const workId = input.candidate.workId.trim();
  const unit = input.candidate.unit;
  let foundAny = false;
  let unitMismatch = false;
  let previous: OurWorkRate | undefined;

  for (const region of ["wroclaw", "dolnyslask"] as const) {
    const work = input.store.catalogs[region].works.find((w) => w.id === workId);
    if (!work) continue;
    foundAny = true;
    if (work.unit !== unit) {
      unitMismatch = true;
      break;
    }
    if (!previous && work.ourWorkRate) previous = work.ourWorkRate;
  }
  if (!foundAny) return { ok: false, reason: "WORK_NOT_FOUND" };
  if (unitMismatch) return { ok: false, reason: "UNIT_MISMATCH" };

  let history = previous?.history ? [...previous.history] : [];
  for (const obs of input.candidate.observations) {
    history = appendOurWorkRateHistory(history, {
      workId,
      unit,
      ratePln: roundRatePln(obs.ratePln),
      kind: "SOURCE",
      sourceType: "RESEARCH",
      regionScope: obs.regionScope,
      observedAt: obs.observedAt || observedAt,
    });
  }

  const prevPln =
    previous && Number.isFinite(previous.ourRatePln) && previous.ourRatePln > 0
      ? previous.ourRatePln
      : undefined;
  const ourRatePln = roundRatePln(marketBase);
  const changePln =
    prevPln != null ? roundRatePln(ourRatePln - prevPln) : undefined;

  history = appendOurWorkRateHistory(history, {
    workId,
    unit,
    ratePln: ourRatePln,
    kind: "OUR",
    sourceType: "ACCEPT",
    regionScope: input.candidate.regionScope,
    observedAt,
    ...(changePln != null ? { changePln } : {}),
  });

  const nextRate: OurWorkRate = {
    workId,
    unit,
    ourRatePln,
    sourceType: "ACCEPT",
    regionScope: input.candidate.regionScope,
    observedAt,
    updatedAt,
    sourceRatePln: ourRatePln,
    history,
  };

  const catalogs = { ...input.store.catalogs };
  for (const region of ["wroclaw", "dolnyslask"] as const) {
    const slice = catalogs[region];
    const idx = slice.works.findIndex((w) => w.id === workId);
    if (idx < 0) continue;
    const works = [...slice.works];
    const work = works[idx]!;
    const patched: CatalogWork = {
      ...work,
      ourWorkRate: nextRate,
    };
    works[idx] = patched;
    catalogs[region] = { ...slice, works, updatedAt };
  }

  return {
    ok: true,
    store: {
      ...input.store,
      catalogs,
      updatedAt,
    },
  };
}
