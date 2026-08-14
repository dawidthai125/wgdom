/**
 * WORK-RATE-SELECTIVE-RESEARCH-02 + DISCOVERY-01 INFRA PASS2.
 * CACHE-FIRST · ONE WORK · PASS1 canonical + PASS2 category allowlist · qualify · mediana.
 * Discovery selects pages only — does NOT invent Candidate / OUR RATE.
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
  listWorkRatePass2CategoryKeysForWork,
  normalizeWorkRateDiscoveryUrl,
  resolveWorkRatePass1CanonicalUrl,
  resolveWorkRatePass2Url,
} from "@/lib/work-catalog/work-rate-discovery-allowlist";
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
import {
  detectWorkRateSynonymUsed,
  listWorkRateMatchNamesPl,
} from "@/lib/work-catalog/work-rate-synonyms";
import {
  computeProposedWorkRatePln,
  type WorkRateWidthClaim,
} from "@/lib/work-catalog/work-rate-market-base";
import { resolveMarginPct } from "@/lib/price-intelligence/our-price-catalog";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";

export const WORK_RATE_RESEARCH_SOURCE_ORDER: readonly WorkRateAuthorizedSourceId[] = [
  "kb_pl",
  "cennikremontow_pl",
  "sccot",
  "extradom",
] as const;

export type WorkRateResearchTelemetryCode =
  | "REUSE"
  | "NO_SOURCE"
  | "NO_PAGE_HIT"
  | "PARSE_EMPTY"
  | "IDENTITY_REJECT"
  | "UNIT_REJECT"
  | "LABOR_ONLY_REJECT"
  | "REGION_REJECT"
  | "PACKAGE_REJECT"
  | "QUALIFY_REJECT"
  | "QUALIFIED"
  | "COOLDOWN"
  | "CANDIDATE"
  | "GAP"
  | "DEDUPED";

export type WorkRateResearchTelemetryRow = {
  code: WorkRateResearchTelemetryCode;
  sourceId?: WorkRateAuthorizedSourceId;
  categoryKey?: string | null;
  url?: string | null;
  discoveryMethod?: "PASS1_CANONICAL" | "PASS2_CATEGORY";
  messagePl?: string;
};

export type WorkRateResearchRejectRow = {
  sourceId: WorkRateAuthorizedSourceId;
  reason: string;
  messagePl: string;
  categoryKey?: string | null;
  telemetryCode?: WorkRateResearchTelemetryCode;
};

export type WorkRateResearchCandidate = {
  workId: string;
  unit: WgdomCostUnit;
  namePl: string;
  /**
   * BC Accept field = proposed OUR RATE (after WGDOM margin).
   * NOT the raw source midpoint alone.
   */
  suggestedRatePln: number;
  /** Median of qualified market-base observations (research-derived). */
  marketBaseRatePln: number;
  /** Owner commercial margin used for proposal (REUSE commercialPricing). */
  wgdomMarginPct: number;
  /** marketBase × (1+margin/100) — equals suggestedRatePln. */
  proposedOurRatePln: number;
  /** Aggregated SOURCE range across observations (when present). */
  sourceMinPln: number | null;
  sourceMaxPln: number | null;
  /** NATIONAL evidence uses POLSKA; never silent WROCLAW relabel. */
  regionScope: WorkRateRegionScope;
  countryScope: "POLSKA";
  widthClaim: WorkRateWidthClaim;
  sampleSize: number;
  lowSample: boolean;
  observations: WorkRateQualifiedObservation[];
  previousOurRatePln: number | null;
  previousFreshness: "CURRENT" | "STALE" | "MISSING";
  /** Provenance helpers for Evidence Pack (optional). */
  synonymUsed?: string | null;
  discoveryMethods?: Array<"PASS1_CANONICAL" | "PASS2_CATEGORY">;
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
      telemetry: WorkRateResearchTelemetryRow[];
    }
  | {
      status: "REUSE";
      freshness: "CURRENT";
      ourRatePln: number;
      regionScope: WorkRateRegionScope;
      httpFetchCount: 0;
      messagePl: string;
      telemetry: WorkRateResearchTelemetryRow[];
    }
  | {
      status: "COOLDOWN";
      httpFetchCount: 0;
      messagePl: string;
      telemetry: WorkRateResearchTelemetryRow[];
    }
  | {
      status: "CANDIDATE";
      candidate: WorkRateResearchCandidate;
      rejects: WorkRateResearchRejectRow[];
      httpFetchCount: number;
      fullCatalogueForbidden: true;
      telemetry: WorkRateResearchTelemetryRow[];
    }
  | {
      status: "GAP";
      rejects: WorkRateResearchRejectRow[];
      httpFetchCount: number;
      previousOurRatePln: number | null;
      previousFreshness: "CURRENT" | "STALE" | "MISSING";
      messagePl: string;
      fullCatalogueForbidden: true;
      telemetry: WorkRateResearchTelemetryRow[];
    };

function mapQualifyReasonToTelemetry(
  reason: string,
): WorkRateResearchTelemetryCode {
  if (reason === "identity_mismatch") return "IDENTITY_REJECT";
  if (reason === "unit_mismatch") return "UNIT_REJECT";
  if (reason === "not_labor_only" || reason === "includes_material")
    return "LABOR_ONLY_REJECT";
  if (reason === "region_missing") return "REGION_REJECT";
  if (
    reason === "package_excluded" ||
    reason === "minimum_excluded" ||
    reason === "promo_excluded"
  )
    return "PACKAGE_REJECT";
  return "QUALIFY_REJECT";
}

function observationDedupeKey(o: WorkRateQualifiedObservation): string {
  const url = normalizeWorkRateDiscoveryUrl(o.sourceUrl);
  const name = o.workNamePl
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return `${o.sourceId}|${url}|${o.unit}|${o.ratePln}|${name}`;
}

async function researchOneWorkInner(
  input: RunSelectiveWorkRateResearchInput,
): Promise<RunSelectiveWorkRateResearchResult> {
  const telemetry: WorkRateResearchTelemetryRow[] = [];

  if (!isWorkRateResearchAllowed()) {
    telemetry.push({ code: "NO_SOURCE", messagePl: "Legal gate blocks research." });
    return {
      status: "BLOCKED",
      reason: "WORK_RATE_LEGAL_GATE",
      gate: WORK_RATE_LEGAL_GATE,
      httpFetchCount: 0,
      telemetry,
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  const looked = lookupWorkRate(input.store, input.workId, input.unit, nowMs);
  const previousOurRatePln = looked.status !== "MISSING" ? looked.ourRatePln : null;
  const previousFreshness = looked.status;
  const previousRegion: WorkRateRegionScope =
    looked.status !== "MISSING" ? looked.regionScope : "WROCLAW";

  if (looked.status === "CURRENT" && !input.forceRefresh) {
    telemetry.push({ code: "REUSE", messagePl: "OUR RATE CURRENT." });
    return {
      status: "REUSE",
      freshness: "CURRENT",
      ourRatePln: looked.ourRatePln,
      regionScope: previousRegion,
      httpFetchCount: 0,
      messagePl: "Stawka AKTUALNA — REUSE, bez HTTP.",
      telemetry,
    };
  }

  if (
    !input.bypassCooldown &&
    isWorkRateResearchInCooldown(input.workId, input.unit, nowMs)
  ) {
    telemetry.push({ code: "COOLDOWN" });
    return {
      status: "COOLDOWN",
      httpFetchCount: 0,
      messagePl: "Odczekaj chwilę przed kolejnym researchem tej roboty.",
      telemetry,
    };
  }

  const port = input.lookupPort ?? createEdgeWorkRateSelectiveLookup();
  const rejects: WorkRateResearchRejectRow[] = [];
  const qualified: WorkRateQualifiedObservation[] = [];
  const seenObs = new Set<string>();
  const fetchedUrls = new Set<string>();
  let httpFetchCount = 0;
  const matchNames = listWorkRateMatchNamesPl(input.namePl);
  const alternateNames = matchNames.slice(1);
  let synonymUsed: string | null = null;
  const discoveryMethods = new Set<"PASS1_CANONICAL" | "PASS2_CATEGORY">();

  async function ingestPage(opts: {
    sourceId: WorkRateAuthorizedSourceId;
    categoryKey: string | null;
    discoveryMethod: "PASS1_CANONICAL" | "PASS2_CATEGORY";
  }): Promise<void> {
    const lookupRes = await port.lookup({
      sourceId: opts.sourceId,
      query: input.namePl,
      workId: input.workId,
      unit: input.unit,
      maxUrls: 1,
      categoryKey: opts.categoryKey,
    });
    httpFetchCount += lookupRes.httpFetchCount;

    if (!lookupRes.ok) {
      const code: WorkRateResearchTelemetryCode =
        lookupRes.error === "unknown_category_key" ||
        lookupRes.error === "URL_NOT_ALLOWED"
          ? "NO_SOURCE"
          : "NO_PAGE_HIT";
      telemetry.push({
        code,
        sourceId: opts.sourceId,
        categoryKey: opts.categoryKey,
        discoveryMethod: opts.discoveryMethod,
        messagePl: lookupRes.error,
      });
      rejects.push({
        sourceId: opts.sourceId,
        reason: lookupRes.error,
        messagePl: `Brak obserwacji (${lookupRes.error}).`,
        categoryKey: opts.categoryKey,
        telemetryCode: code,
      });
      return;
    }

    const pageUrl = lookupRes.page.finalUrl || lookupRes.page.requestUrl;
    const normUrl = normalizeWorkRateDiscoveryUrl(pageUrl);
    if (fetchedUrls.has(normUrl)) {
      telemetry.push({
        code: "DEDUPED",
        sourceId: opts.sourceId,
        categoryKey: opts.categoryKey,
        url: pageUrl,
        discoveryMethod: opts.discoveryMethod,
        messagePl: "Duplicate URL skipped.",
      });
      return;
    }
    fetchedUrls.add(normUrl);
    discoveryMethods.add(opts.discoveryMethod);

    const offers = parseWorkRateOffersFromHtml({
      sourceId: opts.sourceId,
      html: lookupRes.page.bodyText,
      sourceUrl: pageUrl,
      expectedNamePl: input.namePl,
      expectedUnit: input.unit,
      alternateNamesPl: alternateNames,
      observedAt: lookupRes.page.fetchedAtIso,
    });

    if (offers.length === 0) {
      telemetry.push({
        code: "PARSE_EMPTY",
        sourceId: opts.sourceId,
        categoryKey: opts.categoryKey,
        url: pageUrl,
        discoveryMethod: opts.discoveryMethod,
      });
      rejects.push({
        sourceId: opts.sourceId,
        reason: "parse_empty",
        messagePl: "Brak porównywalnej pozycji w odpowiedzi źródła.",
        categoryKey: opts.categoryKey,
        telemetryCode: "PARSE_EMPTY",
      });
      return;
    }

    for (const offer of offers) {
      const q = qualifyWorkRateObservation({
        offer,
        expectedWorkId: input.workId,
        expectedUnit: input.unit,
      });
      if (!q.ok) {
        const code = mapQualifyReasonToTelemetry(q.reason);
        telemetry.push({
          code,
          sourceId: opts.sourceId,
          categoryKey: opts.categoryKey,
          url: pageUrl,
          discoveryMethod: opts.discoveryMethod,
          messagePl: q.messagePl,
        });
        rejects.push({
          sourceId: opts.sourceId,
          reason: q.reason,
          messagePl: q.messagePl,
          categoryKey: opts.categoryKey,
          telemetryCode: code,
        });
        continue;
      }

      const key = observationDedupeKey(q.observation);
      if (seenObs.has(key)) {
        telemetry.push({
          code: "DEDUPED",
          sourceId: opts.sourceId,
          categoryKey: opts.categoryKey,
          url: pageUrl,
          discoveryMethod: opts.discoveryMethod,
          messagePl: "Duplicate observation skipped.",
        });
        continue;
      }
      seenObs.add(key);
      qualified.push(q.observation);
      telemetry.push({
        code: "QUALIFIED",
        sourceId: opts.sourceId,
        categoryKey: opts.categoryKey,
        url: pageUrl,
        discoveryMethod: opts.discoveryMethod,
      });

      if (!synonymUsed) {
        synonymUsed = detectWorkRateSynonymUsed({
          expectedNamePl: input.namePl,
          foundNamePl: q.observation.workNamePl,
        });
      }
    }
  }

  // Serial — 4 źródła · PASS1 then PASS2 category keys · nigdy catalogue
  for (const sourceId of WORK_RATE_RESEARCH_SOURCE_ORDER) {
    const meta = WORK_RATE_AUTHORIZED_SOURCES.find((s) => s.id === sourceId);
    if (!meta || meta.status !== "VERIFIED") {
      telemetry.push({ code: "NO_SOURCE", sourceId, messagePl: "Źródło nie VERIFIED." });
      rejects.push({
        sourceId,
        reason: "source_not_verified",
        messagePl: "Źródło nie VERIFIED.",
        telemetryCode: "NO_SOURCE",
      });
      continue;
    }

    // PASS1 — always attempt canonical (same as SELECTIVE-02)
    const pass1Url = resolveWorkRatePass1CanonicalUrl(sourceId);
    if (pass1Url) {
      await ingestPage({
        sourceId,
        categoryKey: null,
        discoveryMethod: "PASS1_CANONICAL",
      });
    }

    // PASS2 — Owner allowlist only; empty ⇒ skip (PASS1 only)
    const categoryKeys = listWorkRatePass2CategoryKeysForWork({
      workId: input.workId,
      namePl: input.namePl,
      sourceId,
    });
    for (const categoryKey of categoryKeys) {
      const pass2Url = resolveWorkRatePass2Url(sourceId, categoryKey);
      if (!pass2Url) {
        telemetry.push({
          code: "NO_SOURCE",
          sourceId,
          categoryKey,
          messagePl: "unknown_category_key",
        });
        continue;
      }
      // Skip if same URL as PASS1 canonical
      if (
        normalizeWorkRateDiscoveryUrl(pass2Url) ===
        normalizeWorkRateDiscoveryUrl(pass1Url || "")
      ) {
        telemetry.push({
          code: "DEDUPED",
          sourceId,
          categoryKey,
          url: pass2Url,
          discoveryMethod: "PASS2_CATEGORY",
          messagePl: "PASS2 URL equals PASS1 canonical.",
        });
        continue;
      }
      await ingestPage({
        sourceId,
        categoryKey,
        discoveryMethod: "PASS2_CATEGORY",
      });
    }
  }

  markWorkRateResearchCooldown(input.workId, input.unit, nowMs);

  const rep = calculateRepresentativeWorkRate(qualified);
  if (rep.status !== "ok" || rep.medianPln == null) {
    telemetry.push({ code: "GAP", messagePl: "No qualifying observations." });
    return {
      status: "GAP",
      rejects,
      httpFetchCount,
      previousOurRatePln,
      previousFreshness,
      messagePl: "Brak kwalifikowanych obserwacji labor-only — RATE_GAP.",
      fullCatalogueForbidden: true,
      telemetry,
    };
  }

  // Resolve work for commercial margin (REUSE material commercialPricing).
  const catalogWork = lookupWorkInStore(input.store, input.workId);
  const marginPct = resolveMarginPct(catalogWork);
  const marketBaseRatePln = rep.medianPln;
  const proposedOurRatePln = computeProposedWorkRatePln(marketBaseRatePln, marginPct);
  if (proposedOurRatePln == null || marginPct == null) {
    telemetry.push({
      code: "GAP",
      messagePl: "WGDOM commercialPricing.marginPct UNSET — cannot propose OUR RATE.",
    });
    return {
      status: "GAP",
      rejects,
      httpFetchCount,
      previousOurRatePln,
      previousFreshness,
      messagePl:
        "Brak marży WGDOM (commercialPricing.marginPct) — ustaw marżę przed Candidate.",
      fullCatalogueForbidden: true,
      telemetry,
    };
  }

  let sourceMinPln: number | null = null;
  let sourceMaxPln: number | null = null;
  for (const o of rep.observations) {
    if (o.sourceMinPln != null && Number.isFinite(o.sourceMinPln)) {
      sourceMinPln =
        sourceMinPln == null
          ? o.sourceMinPln
          : Math.min(sourceMinPln, o.sourceMinPln);
    }
    if (o.sourceMaxPln != null && Number.isFinite(o.sourceMaxPln)) {
      sourceMaxPln =
        sourceMaxPln == null
          ? o.sourceMaxPln
          : Math.max(sourceMaxPln, o.sourceMaxPln);
    }
  }

  telemetry.push({
    code: "CANDIDATE",
    messagePl: `sample=${rep.sampleSize}; base=${marketBaseRatePln}; margin=${marginPct}; proposed=${proposedOurRatePln}`,
  });

  return {
    status: "CANDIDATE",
    candidate: {
      workId: input.workId,
      unit: input.unit,
      namePl: input.namePl,
      suggestedRatePln: proposedOurRatePln,
      marketBaseRatePln,
      wgdomMarginPct: marginPct,
      proposedOurRatePln,
      sourceMinPln,
      sourceMaxPln,
      regionScope: rep.regionScope,
      countryScope: "POLSKA",
      widthClaim: "NOT_SPECIFIED",
      sampleSize: rep.sampleSize,
      lowSample: rep.lowSample,
      observations: rep.observations,
      previousOurRatePln,
      previousFreshness,
      synonymUsed,
      discoveryMethods: [...discoveryMethods],
    },
    rejects,
    httpFetchCount,
    fullCatalogueForbidden: isWorkRateFullCatalogueForbidden() as true,
    telemetry,
  };
}

function lookupWorkInStore(store: WorkCatalogStore, workId: string) {
  const id = workId.trim();
  for (const region of ["wroclaw", "dolnyslask"] as const) {
    const work = store.catalogs[region].works.find((w) => w.id === id);
    if (work) return work;
  }
  return null;
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
