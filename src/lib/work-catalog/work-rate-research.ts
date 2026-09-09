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
  KB02_LABOR_EVIDENCE_SEAM_ID,
  lookupReusableLaborResearchEvidence,
  type PersistMeaningfulLaborResearchEvidenceResult,
} from "@/lib/work-catalog/work-rate-research-evidence-persist";
import {
  persistKnowledge,
  resolveKnowledgeReuse,
} from "@/lib/knowledge-destination-router";
import {
  evaluateLaborEvidenceReuseSufficiency,
  OD52_EVIDENCE_FRESHNESS_MODE,
  type EvaluateLaborEvidenceReuseSufficiencyResult,
} from "@/lib/work-catalog/labor-evidence-reuse-sufficiency";
import type { LaborSourceEvidenceObservation } from "@/lib/labor-source-evidence";
import {
  createEdgeWorkRateSelectiveLookup,
  createNullWorkRateSelectiveLookup,
} from "@/lib/work-catalog/work-rate-selective-lookup-client";

/** GO53 / OD-52 — STATE_ONLY freshness; HTTP suppress when Evidence SUFFICIENT. */
export const EVIDENCE_REUSE_POLICY = OD52_EVIDENCE_FRESHNESS_MODE;
import type { WorkRateSelectiveLookupPort } from "@/lib/work-catalog/work-rate-selective-lookup-types";
import {
  countWorkRatePricedTableRows,
  parseWorkRateOffersFromHtml,
} from "@/lib/work-catalog/work-rate-source-html-parse";
import {
  detectWorkRateSynonymUsed,
  listWorkRateMatchNamesPl,
} from "@/lib/work-catalog/work-rate-synonyms";
import {
  listExactIdentityAliasesForWork,
  matchLaborIdentityMappingForWork,
} from "@/lib/work-catalog/work-rate-identity-mapping";
import {
  classifyWorkRateEvidenceScopeTag,
  isWorkRateEvidenceScopeAllowed,
  listAllowedWorkRateEvidenceScopeTags,
} from "@/lib/work-catalog/work-rate-evidence-scope";
import {
  computeProposedWorkRatePln,
  type WorkRateWidthClaim,
} from "@/lib/work-catalog/work-rate-market-base";
import { resolveMarginPct } from "@/lib/price-intelligence/our-price-catalog";
import { loadAppSettingsLocal } from "@/lib/app-settings";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";
import {
  assertLaborResearchAllowed,
  assertLeafLaborResearchAllowed,
  IK_LEAF_RESEARCH_CALL_SITE,
  type EstimatorClassifyResult,
  type EstimatorPricingPlane,
} from "@/lib/intelligent-estimator/classification-gate";
import type { TechnologyPack } from "@/lib/technology-foundation";

export const WORK_RATE_RESEARCH_SOURCE_ORDER: readonly WorkRateAuthorizedSourceId[] = [
  "kb_pl",
  "cennikremontow_pl",
  "sccot",
  "extradom",
  "remonty_apm",
] as const;

export type WorkRateResearchTelemetryCode =
  | "REUSE"
  | "NO_SOURCE"
  | "NO_PAGE_HIT"
  | "PARSE_EMPTY"
  /** HTML has priced rows but none matched expected/alias names (not invent). */
  | "MATCH_EMPTY"
  | "IDENTITY_REJECT"
  | "UNIT_REJECT"
  | "LABOR_ONLY_REJECT"
  | "REGION_REJECT"
  | "PACKAGE_REJECT"
  | "QUALIFY_REJECT"
  | "QUALIFIED"
  | "SCOPE_REJECT"
  | "COOLDOWN"
  | "CANDIDATE"
  | "GAP"
  | "DEDUPED"
  /** GO46 — durable Evidence available (lookup only; HTTP suppress policy OPEN). */
  | "EVIDENCE_AVAILABLE"
  | "EVIDENCE_SUFFICIENT"
  | "EVIDENCE_INSUFFICIENT"
  | "EVIDENCE_PERSISTED"
  | "EVIDENCE_PERSIST_SKIP";

export type WorkRateResearchTelemetryRow = {
  code: WorkRateResearchTelemetryCode;
  sourceId?: WorkRateAuthorizedSourceId;
  categoryKey?: string | null;
  url?: string | null;
  discoveryMethod?: "PASS1_CANONICAL" | "PASS2_CATEGORY";
  messagePl?: string;
  /** Primary query strategy (catalog_namePl / cleaned_boq / raw_boq). */
  queryStrategy?: string;
  /** Which expected name matched a row (when QUALIFIED). */
  matchedName?: string;
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
   * Display-only proposed SELL (= proposedOurRatePln).
   * P5.16-B: Accept MUST store marketBaseRatePln — never this field as OUR RATE.
   */
  suggestedRatePln: number;
  /** Median of qualified market-base observations — Accept SSOT (BASE). */
  marketBaseRatePln: number;
  /** Owner commercial margin used for proposal (REUSE commercialPricing). */
  wgdomMarginPct: number;
  /** marketBase × (1+margin/100) — display SELL only; equals suggestedRatePln. */
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
  /**
   * Ordered match names for HTML parse (catalog / cleaned BOQ / raw).
   * When omitted, only namePl + Owner synonyms apply.
   */
  matchNamesPl?: readonly string[] | null;
  /** Telemetry — how namePl was chosen. */
  queryStrategy?: string | null;
  /** Manual refresh — nawet CURRENT → research (nadal candidate). */
  forceRefresh?: boolean;
  /** Owner force omija cooldown (single-flight nadal obowiązuje). */
  bypassCooldown?: boolean;
  nowMs?: number;
  lookupPort?: WorkRateSelectiveLookupPort;
  /**
   * LABOR commercial margin policy (read-time). When omitted, loads
   * `defaultLaborCommercialMarginPct` from AppSettings. Tests may inject.
   * Does NOT write commercialPricing onto the work.
   */
  laborMarginPolicy?: {
    defaultLaborCommercialMarginPct: number | null;
  } | null;
  /**
   * Phase A — Leaf Research under COMPOUND (self-bind / pack leaf).
   * Direct COMPOUND research without this remains CLASSIFICATION_GATE BLOCKED.
   * Must be minted only after assertLeafLaborResearchAllowed (orchestrator).
   */
  leafResearchAuth?: {
    parentWorkId: string;
    pack: TechnologyPack;
    callSite: typeof IK_LEAF_RESEARCH_CALL_SITE;
  } | null;
  /**
   * GO46 / KB-02 — persist meaningful QUALIFIED observations to
   * kw-wgdom-labor-source-evidence. Default true. Tests may set false.
   * NEVER writes OUR RATE / Accept / Work Catalog pricing.
   */
  persistEvidence?: boolean;
};

export type RunSelectiveWorkRateResearchResult =
  | {
      status: "BLOCKED";
      reason: "WORK_RATE_LEGAL_GATE" | "CLASSIFICATION_GATE";
      gate?: typeof WORK_RATE_LEGAL_GATE;
      plane?: EstimatorPricingPlane;
      classify?: EstimatorClassifyResult;
      httpFetchCount: 0;
      messagePl?: string;
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
      /**
       * GO53 — durable Evidence SUFFICIENT (STATE_ONLY) · HTTP suppressed.
       * ≠ OUR RATE · ≠ Accept · ≠ Candidate authority.
       */
      status: "EVIDENCE_REUSE";
      httpFetchCount: 0;
      previousOurRatePln: number | null;
      previousFreshness: "CURRENT" | "STALE" | "MISSING";
      sufficiency: EvaluateLaborEvidenceReuseSufficiencyResult;
      observations: LaborSourceEvidenceObservation[];
      isOurRate: false;
      fullCatalogueForbidden: true;
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
      /** GO46 — Evidence persist result (never OUR RATE). */
      evidencePersist?: PersistMeaningfulLaborResearchEvidenceResult | null;
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
      /**
       * When observations qualify but commercialPricing.marginPct is UNSET —
       * market evidence only. NOT a Candidate (no proposed OUR RATE).
       */
      evidenceOnly?: {
        gapClass: "MARGIN_UNSET";
        marketBaseRatePln: number;
        sampleSize: number;
        lowSample: boolean;
        regionScope: WorkRateRegionScope;
        sourceMinPln: number | null;
        sourceMaxPln: number | null;
        observations: WorkRateQualifiedObservation[];
      };
      /** GO46 — Evidence persist result (never OUR RATE). */
      evidencePersist?: PersistMeaningfulLaborResearchEvidenceResult | null;
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

  // A2 — Classification Gate BEFORE legal gate / lookup / HTTP (covers useWorkCatalog bypass).
  // Phase A: optional Leaf Research auth re-validated here (fail-closed; never trust caller alone).
  if (input.leafResearchAuth) {
    const leafGate = assertLeafLaborResearchAllowed({
      leafWorkId: input.workId,
      parentWorkId: input.leafResearchAuth.parentWorkId,
      pack: input.leafResearchAuth.pack,
      callSite: input.leafResearchAuth.callSite,
      namePl: input.namePl,
      unit: input.unit,
    });
    if (!leafGate.ok) {
      telemetry.push({
        code: "NO_SOURCE",
        messagePl: `Leaf Research auth rejected (${leafGate.blockReason}).`,
      });
      return {
        status: "BLOCKED",
        reason: "CLASSIFICATION_GATE",
        plane: leafGate.classify.plane,
        classify: leafGate.classify,
        httpFetchCount: 0,
        messagePl: `Leaf Labor research zablokowany — ${leafGate.blockReason}.`,
        telemetry,
      };
    }
  } else {
    const laborGate = assertLaborResearchAllowed({
      workId: input.workId,
      namePl: input.namePl,
      unit: input.unit,
    });
    if (!laborGate.ok) {
      telemetry.push({
        code: "NO_SOURCE",
        messagePl: `Classification Gate blocks labor research (plane=${laborGate.classify.plane}).`,
      });
      return {
        status: "BLOCKED",
        reason: "CLASSIFICATION_GATE",
        plane: laborGate.classify.plane,
        classify: laborGate.classify,
        httpFetchCount: 0,
        messagePl: `Labor research zablokowany — plane=${laborGate.classify.plane} (wymagane LABOR).`,
        telemetry,
      };
    }
  }

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

  // GO46/GO49/GO53 — Catalog First: OUR RATE CURRENT already returned above.
  // Durable Evidence via KDR → OD-52 STATE_ONLY sufficiency → may suppress HTTP.
  // STALE OUR RATE: never suppress. forceRefresh: never suppress (Owner force).
  const priorEvidence = resolveKnowledgeReuse({
    knowledgeType: "EVIDENCE",
    workId: input.workId,
    workNamePl: input.namePl,
    unit: input.unit,
  });
  if (priorEvidence.hit) {
    telemetry.push({
      code: "EVIDENCE_AVAILABLE",
      messagePl: `Durable Evidence hit count=${priorEvidence.count} via KDR (policy ${EVIDENCE_REUSE_POLICY}).`,
    });
  }

  if (!input.forceRefresh && previousFreshness === "MISSING" && priorEvidence.hit) {
    const lookedUp = lookupReusableLaborResearchEvidence({
      workId: input.workId,
      workNamePl: input.namePl,
      unit: input.unit,
    });
    const sufficiency = evaluateLaborEvidenceReuseSufficiency({
      workId: input.workId,
      unit: input.unit,
      namePl: input.namePl,
      ourRateFreshness: previousFreshness,
      observations: lookedUp.observations,
    });
    if (sufficiency.sufficient) {
      telemetry.push({
        code: "EVIDENCE_SUFFICIENT",
        messagePl: sufficiency.reasonPl,
      });
      return {
        status: "EVIDENCE_REUSE",
        httpFetchCount: 0,
        previousOurRatePln,
        previousFreshness,
        sufficiency,
        observations: sufficiency.eligible,
        isOurRate: false,
        fullCatalogueForbidden: true,
        messagePl:
          "Evidence SUFFICIENT (STATE_ONLY) — HTTP Research suppressed (≠ OUR RATE).",
        telemetry,
      };
    }
    telemetry.push({
      code: "EVIDENCE_INSUFFICIENT",
      messagePl: `${sufficiency.status}: ${sufficiency.reasonPl}`,
    });
  } else if (previousFreshness === "STALE" && priorEvidence.hit) {
    telemetry.push({
      code: "EVIDENCE_INSUFFICIENT",
      messagePl: "BLOCKED_STALE_OUR_RATE — Evidence must not suppress STALE OUR RATE refresh.",
    });
  }

  const port = input.lookupPort ?? createEdgeWorkRateSelectiveLookup();
  const rejects: WorkRateResearchRejectRow[] = [];
  const qualified: WorkRateQualifiedObservation[] = [];
  const seenObs = new Set<string>();
  const fetchedUrls = new Set<string>();
  let httpFetchCount = 0;
  const queryStrategy = String(input.queryStrategy || "").trim() || undefined;
  // Prefer explicit match chain from labor expert; else namePl + Owner synonyms.
  const explicitMatchNames = (input.matchNamesPl || [])
    .map((n) => String(n || "").trim())
    .filter(Boolean);
  const synonymNames = listWorkRateMatchNamesPl(input.namePl);
  const matchNames =
    explicitMatchNames.length > 0
      ? [
          ...explicitMatchNames,
          ...synonymNames.filter(
            (s) =>
              !explicitMatchNames.some(
                (e) => e.toLowerCase() === s.toLowerCase(),
              ),
          ),
        ]
      : synonymNames;
  const alternateNames = matchNames.slice(1);
  let synonymUsed: string | null = null;
  let identityMappingUsed: string | null = null;
  const discoveryMethods = new Set<"PASS1_CANONICAL" | "PASS2_CATEGORY">();
  const allowedScopes = listAllowedWorkRateEvidenceScopeTags({
    workId: input.workId,
    namePl: input.namePl,
  });
  // WR-LABOR-IDENTITY-MAPPING-01 — exact aliases for this work (identity gate · A path separate)
  const exactIdentityAliases = listExactIdentityAliasesForWork({
    workId: input.workId,
    catalogUnit: input.unit,
  });

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
        queryStrategy,
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
        queryStrategy,
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
      exactIdentityAliasesPl: exactIdentityAliases,
      observedAt: lookupRes.page.fetchedAtIso,
    });

    if (offers.length === 0) {
      const pricedRows = countWorkRatePricedTableRows(lookupRes.page.bodyText);
      const emptyCode: WorkRateResearchTelemetryCode =
        pricedRows > 0 ? "MATCH_EMPTY" : "PARSE_EMPTY";
      telemetry.push({
        code: emptyCode,
        sourceId: opts.sourceId,
        categoryKey: opts.categoryKey,
        url: pageUrl,
        discoveryMethod: opts.discoveryMethod,
        queryStrategy,
        messagePl:
          emptyCode === "MATCH_EMPTY"
            ? `Strona ma ${pricedRows} wierszy cenowych, ale żaden nie pasuje do namePl/aliasów.`
            : "Brak wierszy cenowych w HTML.",
      });
      rejects.push({
        sourceId: opts.sourceId,
        reason: emptyCode === "MATCH_EMPTY" ? "match_empty" : "parse_empty",
        messagePl:
          emptyCode === "MATCH_EMPTY"
            ? "Źródło zwróciło cennik, lecz brak dopasowania nazwy (MATCH_EMPTY) — bez invent."
            : "Brak porównywalnej pozycji w odpowiedzi źródła.",
        categoryKey: opts.categoryKey,
        telemetryCode: emptyCode,
      });
      return;
    }

    for (const offer of offers) {
      // Preserve labor/material flags — mapping must not mutate (A4).
      const laborOnlyFlag = Boolean(offer.laborOnly);
      const includesMaterialFlag = Boolean(offer.includesMaterial);
      const regionEcho = offer.regionScope;

      // Identity mapping gate (A9) — material policy / unit / ambiguity; then D1 scope.
      const mapHit = matchLaborIdentityMappingForWork({
        workId: input.workId,
        catalogUnit: input.unit,
        observedName: offer.workNamePl,
        observedUnit: String(offer.unit || ""),
        sourceId: opts.sourceId,
        laborOnly: laborOnlyFlag,
        includesMaterial: includesMaterialFlag,
        regionScope: regionEcho,
      });
      if (mapHit.status === "BLOCKED") {
        telemetry.push({
          code: "IDENTITY_REJECT",
          sourceId: opts.sourceId,
          categoryKey: opts.categoryKey,
          url: pageUrl,
          discoveryMethod: opts.discoveryMethod,
          messagePl: mapHit.messagePl,
          queryStrategy,
        });
        rejects.push({
          sourceId: opts.sourceId,
          reason: `identity_mapping:${mapHit.reason}`,
          messagePl: mapHit.messagePl,
          categoryKey: opts.categoryKey,
          telemetryCode: "IDENTITY_REJECT",
        });
        continue;
      }
      if (mapHit.status === "AMBIGUOUS") {
        telemetry.push({
          code: "IDENTITY_REJECT",
          sourceId: opts.sourceId,
          categoryKey: opts.categoryKey,
          url: pageUrl,
          discoveryMethod: opts.discoveryMethod,
          messagePl: "Ambiguous identity mapping — no auto match.",
          queryStrategy,
        });
        rejects.push({
          sourceId: opts.sourceId,
          reason: "identity_mapping:ambiguous",
          messagePl: "Ambiguous identity mapping — UNMATCHED.",
          categoryKey: opts.categoryKey,
          telemetryCode: "IDENTITY_REJECT",
        });
        continue;
      }
      if (mapHit.status === "HIT" && !identityMappingUsed) {
        identityMappingUsed = mapHit.matchedAlias;
      }

      // D1: scopeTag AFTER identity · BEFORE qualify / median · must not bypass (A5)
      const scopeTag = classifyWorkRateEvidenceScopeTag(offer.workNamePl);
      if (!isWorkRateEvidenceScopeAllowed(scopeTag, allowedScopes)) {
        telemetry.push({
          code: "SCOPE_REJECT",
          sourceId: opts.sourceId,
          categoryKey: opts.categoryKey,
          url: pageUrl,
          discoveryMethod: opts.discoveryMethod,
          messagePl: `Evidence scope „${scopeTag}” poza primary pool.`,
          queryStrategy,
          matchedName: offer.workNamePl,
        });
        rejects.push({
          sourceId: opts.sourceId,
          reason: `scope_reject:${scopeTag}`,
          messagePl: `Zakres evidence „${scopeTag}” nie wchodzi do primary pool.`,
          categoryKey: opts.categoryKey,
          telemetryCode: "SCOPE_REJECT",
        });
        continue;
      }

      const q = qualifyWorkRateObservation({
        offer: {
          ...offer,
          laborOnly: laborOnlyFlag,
          includesMaterial: includesMaterialFlag,
          regionScope: regionEcho,
        },
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
          queryStrategy,
          matchedName: offer.workNamePl,
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
          queryStrategy,
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
        queryStrategy,
        matchedName: q.observation.workNamePl,
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

  const persistEvidence = input.persistEvidence !== false;
  const identityMethodHint =
    identityMappingUsed != null
      ? ("owner_identity_mapping" as const)
      : synonymUsed
        ? ("owner_synonym" as const)
        : ("exact_name" as const);

  function persistQualifiedEvidence(
    observations: readonly WorkRateQualifiedObservation[],
  ): PersistMeaningfulLaborResearchEvidenceResult | null {
    if (!persistEvidence) return null;
    if (observations.length === 0) {
      telemetry.push({
        code: "EVIDENCE_PERSIST_SKIP",
        messagePl: "No meaningful QUALIFIED observations — Evidence not written.",
      });
      return null;
    }
    // GO49 — producer → Knowledge Destination Router → existing Evidence store (no duplicate writer).
    const routed = persistKnowledge({
      knowledgeType: "EVIDENCE",
      laborEvidence: {
        workId: input.workId,
        workNamePl: input.namePl,
        unit: input.unit,
        observations,
        synonymUsed: synonymUsed || identityMappingUsed,
        identityMethod: identityMethodHint,
        persist: true,
      },
    });
    const labor =
      (routed.detail as { laborEvidenceResult?: PersistMeaningfulLaborResearchEvidenceResult } | undefined)
        ?.laborEvidenceResult ?? null;
    const result: PersistMeaningfulLaborResearchEvidenceResult =
      labor ??
      ({
        seamId: KB02_LABOR_EVIDENCE_SEAM_ID,
        meaningful: routed.wrote,
        attempted: Number((routed.detail as { attempted?: number } | undefined)?.attempted ?? 0),
        persisted: Number((routed.detail as { persisted?: number } | undefined)?.persisted ?? 0),
        cas: null,
        observations: [],
        ourRateWritten: false,
        workCatalogMutated: false,
        acceptPerformed: false,
      } satisfies PersistMeaningfulLaborResearchEvidenceResult);

    telemetry.push({
      code: result.persisted > 0 ? "EVIDENCE_PERSISTED" : "EVIDENCE_PERSIST_SKIP",
      messagePl: result.meaningful
        ? `KDR→Evidence persist attempted=${result.attempted} persisted=${result.persisted} router=${routed.status}`
        : `KDR Evidence skip status=${routed.status}`,
    });
    return result;
  }

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
      evidencePersist: persistQualifiedEvidence([]),
    };
  }

  // Resolve work for commercial margin (REUSE material commercialPricing + LABOR global policy).
  const catalogWork = lookupWorkInStore(input.store, input.workId);
  const laborPolicy =
    input.laborMarginPolicy !== undefined
      ? input.laborMarginPolicy
      : {
          defaultLaborCommercialMarginPct:
            loadAppSettingsLocal().defaultLaborCommercialMarginPct,
        };
  const marginPct = resolveMarginPct(catalogWork, { laborPolicy });
  const marketBaseRatePln = rep.medianPln;
  const proposedOurRatePln = computeProposedWorkRatePln(marketBaseRatePln, marginPct);
  if (proposedOurRatePln == null || marginPct == null) {
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
      code: "GAP",
      messagePl: "WGDOM commercialPricing.marginPct UNSET — cannot propose OUR RATE.",
    });
    const evidencePersist = persistQualifiedEvidence(rep.observations);
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
      evidenceOnly: {
        gapClass: "MARGIN_UNSET",
        marketBaseRatePln,
        sampleSize: rep.sampleSize,
        lowSample: rep.lowSample,
        regionScope: rep.regionScope,
        sourceMinPln,
        sourceMaxPln,
        observations: rep.observations,
      },
      evidencePersist,
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

  const evidencePersist = persistQualifiedEvidence(rep.observations);

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
      synonymUsed: synonymUsed || identityMappingUsed,
      discoveryMethods: [...discoveryMethods],
    },
    rejects,
    httpFetchCount,
    fullCatalogueForbidden: isWorkRateFullCatalogueForbidden() as true,
    telemetry,
    evidencePersist,
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
