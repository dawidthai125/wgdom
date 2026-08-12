/**
 * WORK-RATE-SELECTIVE-RESEARCH-02 — orchestracja selective research.
 * CACHE-FIRST · ONE WORK · 4 źródła · qualify · mediana · candidate (bez auto OUR RATE).
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { lookupWorkRate } from "@/lib/work-catalog/work-rate-lookup";
import {
  WORK_RATE_LEGAL_GATE,
  WORK_RATE_AUTHORIZED_SOURCES,
  isWorkRateFullCatalogueForbidden,
  isWorkRateResearchAllowed,
  type WorkRateAuthorizedSourceId,
} from "@/lib/work-catalog/work-rate-legal";
import {
  calculateRepresentativeWorkRate,
  qualifyWorkRateObservation,
  type WorkRateQualifiedObservation,
} from "@/lib/work-catalog/work-rate-qualify";
import {
  isWorkRateResearchInCooldown,
  markWorkRateResearchCooldown,
  runWorkRateResearchSingleFlight,
} from "@/lib/work-catalog/work-rate-research-cooldown";
import {
  createEdgeWorkRateSelectiveLookup,
  createNullWorkRateSelectiveLookup,
} from "@/lib/work-catalog/work-rate-selective-lookup-client";
import type { WorkRateSelectiveLookupPort } from "@/lib/work-catalog/work-rate-selective-lookup-types";
import { parseWorkRateOffersFromHtml } from "@/lib/work-catalog/work-rate-source-html-parse";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";

export const WORK_RATE_RESEARCH_SOURCE_ORDER: readonly WorkRateAuthorizedSourceId[] = [
  "kb_pl",
  "cennikremontow_pl",
  "sccot",
  "extradom",
] as const;

export type WorkRateResearchRejectRow = {
  sourceId: WorkRateAuthorizedSourceId;
  reason: string;
  messagePl: string;
};

export type WorkRateResearchCandidate = {
  workId: string;
  unit: WgdomCostUnit;
  namePl: string;
  suggestedRatePln: number;
  regionScope: WorkRateRegionScope;
  sampleSize: number;
  lowSample: boolean;
  observations: WorkRateQualifiedObservation[];
  previousOurRatePln: number | null;
  previousFreshness: "CURRENT" | "STALE" | "MISSING";
};

export type RunSelectiveWorkRateResearchInput = {
  store: WorkCatalogStore;
  workId: string;
  unit: WgdomCostUnit;
  namePl: string;
  /** Manual refresh — nawet CURRENT → research (nadal candidate). */
  forceRefresh?: boolean;
  /** Owner force omija cooldown (single-flight nadal obowiązuje). */
  bypassCooldown?: boolean;
  nowMs?: number;
  lookupPort?: WorkRateSelectiveLookupPort;
};

export type RunSelectiveWorkRateResearchResult =
  | {
      status: "BLOCKED";
      reason: "WORK_RATE_LEGAL_GATE";
      gate: typeof WORK_RATE_LEGAL_GATE;
      httpFetchCount: 0;
    }
  | {
      status: "REUSE";
      freshness: "CURRENT";
      ourRatePln: number;
      regionScope: WorkRateRegionScope;
      httpFetchCount: 0;
      messagePl: string;
    }
  | {
      status: "COOLDOWN";
      httpFetchCount: 0;
      messagePl: string;
    }
  | {
      status: "CANDIDATE";
      candidate: WorkRateResearchCandidate;
      rejects: WorkRateResearchRejectRow[];
      httpFetchCount: number;
      fullCatalogueForbidden: true;
    }
  | {
      status: "GAP";
      rejects: WorkRateResearchRejectRow[];
      httpFetchCount: number;
      previousOurRatePln: number | null;
      previousFreshness: "CURRENT" | "STALE" | "MISSING";
      messagePl: string;
      fullCatalogueForbidden: true;
    };

async function researchOneWorkInner(
  input: RunSelectiveWorkRateResearchInput,
): Promise<RunSelectiveWorkRateResearchResult> {
  if (!isWorkRateResearchAllowed()) {
    return {
      status: "BLOCKED",
      reason: "WORK_RATE_LEGAL_GATE",
      gate: WORK_RATE_LEGAL_GATE,
      httpFetchCount: 0,
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  const looked = lookupWorkRate(input.store, input.workId, input.unit, nowMs);
  const previousOurRatePln = looked.status !== "MISSING" ? looked.ourRatePln : null;
  const previousFreshness = looked.status;
  const previousRegion: WorkRateRegionScope =
    looked.status !== "MISSING" ? looked.regionScope : "WROCLAW";

  if (looked.status === "CURRENT" && !input.forceRefresh) {
    return {
      status: "REUSE",
      freshness: "CURRENT",
      ourRatePln: looked.ourRatePln,
      regionScope: previousRegion,
      httpFetchCount: 0,
      messagePl: "Stawka AKTUALNA — REUSE, bez HTTP.",
    };
  }

  if (
    !input.bypassCooldown &&
    isWorkRateResearchInCooldown(input.workId, input.unit, nowMs)
  ) {
    return {
      status: "COOLDOWN",
      httpFetchCount: 0,
      messagePl: "Odczekaj chwilę przed kolejnym researchem tej roboty.",
    };
  }

  const port = input.lookupPort ?? createEdgeWorkRateSelectiveLookup();
  const rejects: WorkRateResearchRejectRow[] = [];
  const qualified: WorkRateQualifiedObservation[] = [];
  let httpFetchCount = 0;

  // Serial — 4 źródła · ONE work · nigdy catalogue
  for (const sourceId of WORK_RATE_RESEARCH_SOURCE_ORDER) {
    const meta = WORK_RATE_AUTHORIZED_SOURCES.find((s) => s.id === sourceId);
    if (!meta || meta.status !== "VERIFIED") {
      rejects.push({
        sourceId,
        reason: "source_not_verified",
        messagePl: "Źródło nie VERIFIED.",
      });
      continue;
    }

    const lookupRes = await port.lookup({
      sourceId,
      query: input.namePl,
      workId: input.workId,
      unit: input.unit,
      maxUrls: 1,
    });
    httpFetchCount += lookupRes.httpFetchCount;

    if (!lookupRes.ok) {
      rejects.push({
        sourceId,
        reason: lookupRes.error,
        messagePl: `Brak obserwacji (${lookupRes.error}).`,
      });
      continue;
    }

    const offers = parseWorkRateOffersFromHtml({
      sourceId,
      html: lookupRes.page.bodyText,
      sourceUrl: lookupRes.page.finalUrl || lookupRes.page.requestUrl,
      expectedNamePl: input.namePl,
      expectedUnit: input.unit,
      observedAt: lookupRes.page.fetchedAtIso,
    });

    if (offers.length === 0) {
      rejects.push({
        sourceId,
        reason: "parse_empty",
        messagePl: "Brak porównywalnej pozycji w odpowiedzi źródła.",
      });
      continue;
    }

    let acceptedFromSource = false;
    for (const offer of offers) {
      const q = qualifyWorkRateObservation({
        offer,
        expectedWorkId: input.workId,
        expectedUnit: input.unit,
      });
      if (!q.ok) {
        rejects.push({
          sourceId,
          reason: q.reason,
          messagePl: q.messagePl,
        });
        continue;
      }
      qualified.push(q.observation);
      acceptedFromSource = true;
    }
    if (!acceptedFromSource && offers.length > 0) {
      // rejects already filled per offer
    }
  }

  markWorkRateResearchCooldown(input.workId, input.unit, nowMs);

  const rep = calculateRepresentativeWorkRate(qualified);
  if (rep.status !== "ok" || rep.medianPln == null) {
    return {
      status: "GAP",
      rejects,
      httpFetchCount,
      previousOurRatePln,
      previousFreshness,
      messagePl: "Brak kwalifikowanych obserwacji labor-only — RATE_GAP.",
      fullCatalogueForbidden: true,
    };
  }

  return {
    status: "CANDIDATE",
    candidate: {
      workId: input.workId,
      unit: input.unit,
      namePl: input.namePl,
      suggestedRatePln: rep.medianPln,
      regionScope: rep.regionScope,
      sampleSize: rep.sampleSize,
      lowSample: rep.lowSample,
      observations: rep.observations,
      previousOurRatePln,
      previousFreshness,
    },
    rejects,
    httpFetchCount,
    fullCatalogueForbidden: isWorkRateFullCatalogueForbidden() as true,
  };
}

/**
 * Publiczny async research — ONE work · cache-first · Owner Accept osobno.
 */
export async function runSelectiveWorkRateResearch(
  input: RunSelectiveWorkRateResearchInput,
): Promise<RunSelectiveWorkRateResearchResult> {
  return runWorkRateResearchSingleFlight(input.workId, input.unit, () =>
    researchOneWorkInner(input),
  );
}

/** Domyślny port produkcyjny (Edge) — testy wstrzykują fixture/null. */
export function getDefaultWorkRateLookupPort(): WorkRateSelectiveLookupPort {
  return createEdgeWorkRateSelectiveLookup();
}

export function getNullWorkRateLookupPort(): WorkRateSelectiveLookupPort {
  return createNullWorkRateSelectiveLookup();
}
