/**
 * GO29 — Autonomous Rate Research Evaluation Layer (A+B READ-ONLY).
 *
 * REUSE: runSelectiveWorkRateResearch · qualify · allowlist · Evidence semantics.
 * NEVER writes OUR RATE · NEVER acceptWorkRateResearchCandidate · NEVER PASS4.
 *
 * Output: Evidence + RateCandidate + Confidence + AutoRateEligibility
 *   isOurRate=false · mayPersistOurRate=false
 */

import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { WorkCatalogStore } from "@/lib/work-catalog/types";
import { lookupWorkRate } from "@/lib/work-catalog/work-rate-lookup";
import {
  runSelectiveWorkRateResearch,
  type RunSelectiveWorkRateResearchResult,
  type WorkRateResearchCandidate,
} from "@/lib/work-catalog/work-rate-research";
import type { WorkRateSelectiveLookupPort } from "@/lib/work-catalog/work-rate-selective-lookup-types";
import {
  calculateRepresentativeWorkRate,
  normalizeWorkRateUnitToken,
  workRateUnitsCompatible,
} from "@/lib/work-catalog/work-rate-qualify";
import { resolveWorkRateWorkFamily } from "@/lib/work-catalog/work-rate-discovery-allowlist";
import { listWorkRateMatchNamesPl } from "@/lib/work-catalog/work-rate-synonyms";
import {
  assertLaborResearchAllowed,
  classifyEstimatorPricingPlane,
} from "@/lib/intelligent-estimator/classification-gate";
import { getOwnerClassificationPlane } from "@/lib/intelligent-estimator/owner-classification-map";
import { hasCompleteTrustedIdentityTuple } from "@/lib/intelligent-estimator/ik-identity-trusted-preserve";
import type { OfferBoqMatchMethod } from "@/lib/tender-offer-boq";

// ─── Types (GO28 contract · GO29 runtime) ───────────────────────────────────

export type RateScopeClass =
  | "LABOR_ONLY"
  | "LABOR_PLUS_MATERIAL"
  | "MATERIAL_ONLY"
  | "TURNKEY"
  | "UNKNOWN_SCOPE";

export type ResearchQueryIntent =
  | "EXACT_WORK"
  | "TRADE_SYNONYM"
  | "LABOR_ONLY"
  | "UNIT_SPECIFIC"
  | "REGIONAL"
  | "DATE_SPECIFIC"
  | "TECHNOLOGY"
  | "PRICING_CONTEXT";

export type ResearchQueryStatus =
  | "PLANNED"
  | "EXECUTED_VIA_PASS12"
  | "PROVIDER_UNSUPPORTED"
  | "SKIPPED";

export type AutoRateEligibilityStatus =
  | "ELIGIBLE_PENDING_POLICY"
  | "NOT_ELIGIBLE"
  | "INSUFFICIENT_EVIDENCE"
  | "CONFLICT"
  | "WRONG_SCOPE"
  | "WRONG_UNIT"
  | "PROVIDER_BLOCK"
  | "CLASSIFICATION_BLOCK"
  | "IDENTITY_BLOCK"
  | "IDENTITY_SEMANTIC_HOLD"
  | "PROVIDER_COVERAGE_INSUFFICIENT";

export type ResearchWorkProfile = {
  workId: string;
  description: string;
  unit: WgdomCostUnit;
  classification: string | null;
  family: string;
  technology: string | null;
  scopeTarget: "LABOR_ONLY";
  region: string;
  tenderContext: string | null;
  synonyms: string[];
  exclusions: string[];
  identityProvenance: {
    trusted: boolean;
    matchMethod: OfferBoqMatchMethod | string | null;
    matchConfidence: string | null;
    source: "trusted_g1_or_catalog";
  };
  lookupStatus: "CURRENT" | "STALE" | "MISSING";
  companyPricePln: number | null;
  companyPriceEligibleAsEvidence: false;
};

export type ResearchQuery = {
  queryId: string;
  workId: string;
  intent: ResearchQueryIntent;
  queryText: string;
  targetScope: "LABOR_ONLY";
  targetUnit: WgdomCostUnit;
  region: string;
  sourceClass: "PASS12_ALLOWLIST";
  createdAt: string;
  status: ResearchQueryStatus;
  statusReason?: string;
};

export type ResearchSource = {
  sourceId: string;
  url: string | null;
  domain: string | null;
  title: string | null;
  retrievedAt: string;
  publishedAt: string | null;
  sourceClass: string;
  scope: RateScopeClass | null;
  region: string | null;
  independenceKey: string;
  extractionStatus: "OK" | "EMPTY" | "ERROR" | "UNSUPPORTED";
};

export type ResearchObservation = {
  observationId: string;
  sourceId: string;
  workId: string;
  rawValue: number | null;
  currency: string;
  rawUnit: string | null;
  scope: RateScopeClass;
  region: string | null;
  vatMode: "netto" | "brutto" | "unknown";
  publishedAt: string | null;
  retrievedAt: string;
  rawContext: string;
  matchStatus: "MATCHED" | "UNMATCHED" | "REJECTED";
  rejectionReason: string | null;
  independenceKey: string;
  /** Explicit: never from companyPricePln */
  fromCompanyPrice: false;
};

export type NormalizedObservation = {
  observationId: string;
  sourceId: string;
  normalizedValue: number | null;
  normalizedUnit: WgdomCostUnit | null;
  normalizedScope: RateScopeClass;
  normalizedVatMode: "netto" | "brutto" | "unknown";
  normalizationStatus: "OK" | "REJECTED";
  normalizationReason: string | null;
  independenceKey: string;
  eligibleForLaborCandidate: boolean;
};

export type EvidenceCluster = {
  clusterId: string;
  observations: NormalizedObservation[];
  independentSourceCount: number;
  valueMin: number | null;
  valueMax: number | null;
  median: number | null;
  scope: RateScopeClass;
  unit: WgdomCostUnit | null;
  region: string | null;
  agreementStatus: "AGREE" | "DIVERGENT" | "INSUFFICIENT";
};

export type RateCandidate = {
  status: "FORMED" | "INSUFFICIENT_EVIDENCE" | "CONFLICTING_EVIDENCE" | "BLOCKED";
  candidateRate: number | null;
  candidateRange: { min: number; max: number } | null;
  unit: WgdomCostUnit;
  scope: "LABOR_ONLY";
  evidenceCount: number;
  independentSourceCount: number;
  clusterCount: number;
  agreementStatus: "AGREE" | "DIVERGENT" | "INSUFFICIENT" | "NONE";
  limitations: string[];
  reasoning: string[];
  isOurRate: false;
  mayPersistOurRate: false;
};

export type ConfidenceAssessment = {
  components: {
    relevance: string;
    specificity: string;
    recency: string;
    scopeMatch: string;
    unitMatch: string;
    regionalRelevance: string;
    sourceTransparency: string;
    independence: string;
    extractionReliability: string;
  };
  confidenceStatus: "POLICY_OPEN" | "NONE" | "LOW" | "MEDIUM";
  note: string;
};

export type AutoRateEligibility = {
  status: AutoRateEligibilityStatus;
  reasons: string[];
  blockingFactors: string[];
  policyDependencies: string[];
  mayPersistOurRate: false;
};

export type AutonomousRateEvalResult = {
  profile: ResearchWorkProfile;
  queries: ResearchQuery[];
  sources: ResearchSource[];
  observations: ResearchObservation[];
  normalizedObservations: NormalizedObservation[];
  clusters: EvidenceCluster[];
  candidate: RateCandidate;
  confidence: ConfidenceAssessment;
  eligibility: AutoRateEligibility;
  blocks: string[];
  limitations: string[];
  productionResearch: {
    status: string | null;
    httpFetchCount: number;
    matchEmpty: boolean;
    messagePl: string | null;
  } | null;
  mutationGuard: {
    ourRateWritten: false;
    acceptCalled: false;
    workCatalogMutated: false;
    pass4Used: false;
  };
};

export type InjectedRawObservation = {
  sourceId: string;
  url?: string | null;
  rawValue: number;
  currency?: string;
  rawUnit: string;
  rawContext: string;
  vatMode?: "netto" | "brutto" | "unknown";
  region?: string | null;
  publishedAt?: string | null;
  retrievedAt?: string;
  /** When true, forces scope classification override after heuristic */
  forceScope?: RateScopeClass;
};

export type RunAutonomousRateEvalInput = {
  workId: string;
  unit: WgdomCostUnit;
  description?: string | null;
  namePl?: string | null;
  matchMethod?: OfferBoqMatchMethod | string | null;
  matchConfidence?: string | null;
  identityTrusted?: boolean;
  region?: string | null;
  tenderContext?: string | null;
  technology?: string | null;
  store?: WorkCatalogStore | null;
  nowMs?: number;
  /** Fixture path — skip HTTP; evaluate injected observations only */
  injectedObservations?: InjectedRawObservation[] | null;
  /** When true and store present, call runSelectiveWorkRateResearch (read-only candidate) */
  runProvider?: boolean;
  lookupPort?: WorkRateSelectiveLookupPort | null;
};

const VAGUE_LEGACY_WORK_IDS = new Set([
  "legacy-roboty_ogolnobudowlane-m2",
  "legacy-roboty_ogolnobudowlane-mb",
  "legacy-roboty_ogolnobudowlane-szt",
]);

function iso(nowMs: number): string {
  return new Date(nowMs).toISOString();
}

function soft(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ł/g, "l");
}

/** Scope semantics — fail-closed UNKNOWN when ambiguous. */
export function classifyRateScopeFromContext(rawContext: string): RateScopeClass {
  const t = soft(rawContext);
  if (!t.trim()) return "UNKNOWN_SCOPE";

  const laborCue =
    /robocizn|labor\s*only|tylko\s*robocizn|bez\s*material|cena\s*robocizn|stawka\s*robocizn/.test(
      t,
    );
  const materialCue =
    /z\s*material|material\s*\+|plyt\s*gk|płyty|ruszt|komplet\s*material|wraz\s*z\s*material/.test(
      t,
    );
  const turnkeyCue =
    /pod\s*klucz|kompleksow|pakiet\s*kompletn|turnkey|cala\s*usluga|pełn[ay]\s*pakiet/.test(t);
  const materialOnlyCue =
    /tylko\s*material|cena\s*materialu|sprzedaz\s*material/.test(t) && !laborCue;

  if (materialOnlyCue) return "MATERIAL_ONLY";
  if (turnkeyCue || (materialCue && laborCue)) return "LABOR_PLUS_MATERIAL";
  if (materialCue && !laborCue) return "LABOR_PLUS_MATERIAL";
  if (laborCue && !materialCue) return "LABOR_ONLY";

  // Ambiguous package/wall price without labor cue → UNKNOWN_SCOPE (GO29 §16)
  if (/sciank|gk|gipsowo.?karton|zabudow/.test(t) && !laborCue) {
    return "UNKNOWN_SCOPE";
  }
  if (/ogolnobudowlan|roboty\s+ogolne/.test(t) && !laborCue) {
    return "UNKNOWN_SCOPE";
  }
  return "UNKNOWN_SCOPE";
}

export function buildIndependenceKey(input: {
  sourceId: string;
  url?: string | null;
  rawValue?: number | null;
  rawUnit?: string | null;
  rawContext?: string | null;
}): string {
  const host = (() => {
    try {
      return input.url ? new URL(input.url).hostname.replace(/^www\./, "") : input.sourceId;
    } catch {
      return input.sourceId;
    }
  })();
  const ctx = soft(String(input.rawContext || ""))
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .slice(0, 80);
  const val =
    input.rawValue != null && Number.isFinite(input.rawValue)
      ? String(Math.round(Number(input.rawValue) * 100) / 100)
      : "";
  const unit = normalizeWorkRateUnitToken(String(input.rawUnit || ""));
  // Same host + same value + same unit + similar context → one independent source
  return `${host}|${val}|${unit}|${ctx}`;
}

export function buildResearchWorkProfile(
  input: RunAutonomousRateEvalInput,
): ResearchWorkProfile {
  const nowMs = input.nowMs ?? Date.now();
  const workId = String(input.workId || "").trim();
  const unit = input.unit;
  const namePl = String(input.namePl || input.description || workId).trim();
  const description = String(input.description || namePl).trim();
  const store = input.store ?? null;

  let companyPricePln: number | null = null;
  if (store) {
    const regions = [store.activeRegion, "wroclaw", "dolnyslask"] as const;
    for (const r of regions) {
      const w = store.catalogs?.[r]?.works?.find((x) => x.id === workId);
      if (w) {
        companyPricePln =
          w.companyPricePln != null && Number.isFinite(Number(w.companyPricePln))
            ? Number(w.companyPricePln)
            : null;
        break;
      }
    }
  }

  const ownerPlane = getOwnerClassificationPlane(workId);
  const classify = classifyEstimatorPricingPlane({
    workId,
    namePl,
    unit,
  });
  const family = resolveWorkRateWorkFamily({ workId, namePl });
  const synonyms = listWorkRateMatchNamesPl(namePl);
  const lookup = store
    ? lookupWorkRate(store, workId, unit, nowMs)
    : { status: "MISSING" as const };

  const trustedExplicit = input.identityTrusted;
  const trustedTuple =
    trustedExplicit === true
      ? true
      : trustedExplicit === false
        ? false
        : hasCompleteTrustedIdentityTuple({
            catalogWorkId: workId,
            matchMethod: (input.matchMethod || "auto_contract") as OfferBoqMatchMethod,
            matchConfidence: (input.matchConfidence || "high") as "high" | "medium" | "low",
            isNoise: false,
          });

  const technology =
    input.technology ??
    (workId.includes("scianki") || soft(description).includes("gk")
      ? "GK partition wall (ścianka działowa GK)"
      : null);

  const exclusions = [
    "companyPricePln",
    "LABOR_PLUS_MATERIAL",
    "TURNKEY",
    "MATERIAL_ONLY",
    "UNKNOWN_SCOPE package totals",
    "invented rates",
  ];

  return {
    workId,
    description,
    unit,
    classification: ownerPlane ?? classify.plane ?? null,
    family,
    technology,
    scopeTarget: "LABOR_ONLY",
    region: String(input.region || "WROCLAW"),
    tenderContext: input.tenderContext ?? null,
    synonyms,
    exclusions,
    identityProvenance: {
      trusted: trustedTuple,
      matchMethod: input.matchMethod ?? null,
      matchConfidence: input.matchConfidence ?? null,
      source: "trusted_g1_or_catalog",
    },
    lookupStatus: lookup.status,
    companyPricePln,
    companyPriceEligibleAsEvidence: false,
  };
}

export function buildResearchQueries(
  profile: ResearchWorkProfile,
  nowMs: number,
): ResearchQuery[] {
  const createdAt = iso(nowMs);
  const d = profile.description;
  const syn = profile.synonyms[1] || profile.synonyms[0] || d;
  const tech = profile.technology || d;
  const intents: Array<{ intent: ResearchQueryIntent; queryText: string }> = [
    { intent: "EXACT_WORK", queryText: `${d} cena` },
    { intent: "TRADE_SYNONYM", queryText: `${syn} cena` },
    { intent: "LABOR_ONLY", queryText: `${d} robocizna` },
    { intent: "UNIT_SPECIFIC", queryText: `${d} ${profile.unit} robocizna` },
    { intent: "REGIONAL", queryText: `${d} robocizna ${profile.region}` },
    { intent: "DATE_SPECIFIC", queryText: `${d} cennik 2026` },
    { intent: "TECHNOLOGY", queryText: `${tech} montaż robocizna ${profile.unit}` },
    { intent: "PRICING_CONTEXT", queryText: `${d} cennik usług budowlanych` },
  ];

  return intents.map((row, i) => ({
    queryId: `q${i + 1}_${row.intent}`,
    workId: profile.workId,
    intent: row.intent,
    queryText: row.queryText,
    targetScope: "LABOR_ONLY" as const,
    targetUnit: profile.unit,
    region: profile.region,
    sourceClass: "PASS12_ALLOWLIST" as const,
    createdAt,
    // GO29: no PASS4 — multi-intent open search unsupported; PASS1/2 uses name match not free query
    status: "PROVIDER_UNSUPPORTED" as const,
    statusReason:
      "PASS4 open-web not authorized in GO29. PASS1/PASS2 selective research uses allowlisted URLs + name match (not free-text query execution).",
  }));
}

export function normalizeResearchObservation(
  obs: ResearchObservation,
  targetUnit: WgdomCostUnit,
  workId: string,
): NormalizedObservation {
  const base = {
    observationId: obs.observationId,
    sourceId: obs.sourceId,
    normalizedVatMode: obs.vatMode,
    independenceKey: obs.independenceKey,
    normalizedScope: obs.scope,
  };

  if (obs.fromCompanyPrice) {
    return {
      ...base,
      normalizedValue: null,
      normalizedUnit: null,
      normalizationStatus: "REJECTED",
      normalizationReason: "COMPANY_PRICE_FORBIDDEN_AS_EVIDENCE",
      eligibleForLaborCandidate: false,
    };
  }

  if (obs.scope !== "LABOR_ONLY") {
    return {
      ...base,
      normalizedValue: null,
      normalizedUnit: null,
      normalizationStatus: "REJECTED",
      normalizationReason: `SCOPE_${obs.scope}`,
      eligibleForLaborCandidate: false,
    };
  }

  if (obs.rawValue == null || !Number.isFinite(obs.rawValue) || obs.rawValue <= 0) {
    return {
      ...base,
      normalizedValue: null,
      normalizedUnit: null,
      normalizationStatus: "REJECTED",
      normalizationReason: "INVALID_VALUE",
      eligibleForLaborCandidate: false,
    };
  }

  if (String(obs.currency || "").toUpperCase() !== "PLN") {
    return {
      ...base,
      normalizedValue: null,
      normalizedUnit: null,
      normalizationStatus: "REJECTED",
      normalizationReason: "CURRENCY_NOT_PLN",
      eligibleForLaborCandidate: false,
    };
  }

  if (obs.vatMode === "unknown") {
    // Retain ambiguity — do not silent convert; still allow as observation with note,
    // but mark reason; eligibility may proceed with limitation (GO29 §8 / tests: VAT ambiguity retained)
  }

  if (
    !workRateUnitsCompatible(targetUnit, String(obs.rawUnit || ""), { workId })
  ) {
    return {
      ...base,
      normalizedValue: null,
      normalizedUnit: null,
      normalizationStatus: "REJECTED",
      normalizationReason: "WRONG_UNIT_NO_INVENT_CONVERSION",
      eligibleForLaborCandidate: false,
    };
  }

  return {
    ...base,
    normalizedValue: Math.round(obs.rawValue * 100) / 100,
    normalizedUnit: targetUnit,
    normalizationStatus: "OK",
    normalizationReason:
      obs.vatMode === "unknown" ? "VAT_AMBIGUITY_RETAINED_NO_SILENT_CONVERT" : "TOKEN_NORMALIZE_ONLY",
    eligibleForLaborCandidate: true,
  };
}

function medianOf(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : Math.round(((s[mid - 1] + s[mid]) / 2) * 100) / 100;
}

export function clusterNormalizedObservations(
  norms: NormalizedObservation[],
  unit: WgdomCostUnit,
): EvidenceCluster[] {
  const eligible = norms.filter((n) => n.eligibleForLaborCandidate && n.normalizedValue != null);
  if (!eligible.length) {
    return [
      {
        clusterId: "empty",
        observations: [],
        independentSourceCount: 0,
        valueMin: null,
        valueMax: null,
        median: null,
        scope: "LABOR_ONLY",
        unit,
        region: null,
        agreementStatus: "INSUFFICIENT",
      },
    ];
  }

  // Collapse by independenceKey — one obs per independent key (keep first)
  const byKey = new Map<string, NormalizedObservation>();
  for (const n of eligible) {
    if (!byKey.has(n.independenceKey)) byKey.set(n.independenceKey, n);
  }
  const independent = [...byKey.values()];
  const values = independent.map((n) => n.normalizedValue as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const med = medianOf(values);
  const spreadRatio = med && med > 0 ? (max - min) / med : 0;
  // POLICY_OPEN threshold — documented heuristic only (0.5); not AUTO persist gate
  let agreementStatus: EvidenceCluster["agreementStatus"] = "AGREE";
  if (independent.length < 2) agreementStatus = "INSUFFICIENT";
  else if (spreadRatio > 0.5) agreementStatus = "DIVERGENT";

  return [
    {
      clusterId: "labor_only_independent",
      observations: independent,
      independentSourceCount: independent.length,
      valueMin: min,
      valueMax: max,
      median: med,
      scope: "LABOR_ONLY",
      unit,
      region: null,
      agreementStatus,
    },
  ];
}

export function buildRateCandidateFromClusters(
  clusters: EvidenceCluster[],
  unit: WgdomCostUnit,
): RateCandidate {
  const hardFalse = { isOurRate: false as const, mayPersistOurRate: false as const };
  const primary = clusters[0];
  if (!primary || primary.independentSourceCount === 0 || primary.median == null) {
    return {
      status: "INSUFFICIENT_EVIDENCE",
      candidateRate: null,
      candidateRange: null,
      unit,
      scope: "LABOR_ONLY",
      evidenceCount: 0,
      independentSourceCount: 0,
      clusterCount: clusters.length,
      agreementStatus: "INSUFFICIENT",
      limitations: ["No LABOR_ONLY qualified independent observations"],
      reasoning: ["Fail-closed: insufficient evidence for RateCandidate"],
      ...hardFalse,
    };
  }
  if (primary.agreementStatus === "DIVERGENT") {
    return {
      status: "CONFLICTING_EVIDENCE",
      candidateRate: null,
      candidateRange:
        primary.valueMin != null && primary.valueMax != null
          ? { min: primary.valueMin, max: primary.valueMax }
          : null,
      unit,
      scope: "LABOR_ONLY",
      evidenceCount: primary.observations.length,
      independentSourceCount: primary.independentSourceCount,
      clusterCount: clusters.length,
      agreementStatus: "DIVERGENT",
      limitations: [
        "Material divergence across independent sources (spread/median heuristic > 0.5 — POLICY_OPEN)",
      ],
      reasoning: [
        "Do not force a point candidate when evidence conflicts materially",
        `range ${primary.valueMin}–${primary.valueMax} median ${primary.median}`,
      ],
      ...hardFalse,
    };
  }

  const rep = calculateRepresentativeWorkRate(
    primary.observations.map((o) => ({
      sourceId: o.sourceId as "kb_pl",
      workNamePl: o.sourceId,
      ratePln: o.normalizedValue as number,
      unit,
      regionScope: "WROCLAW",
      laborOnly: true as const,
      sourceUrl: "",
      observedAt: new Date().toISOString(),
      netGross: o.normalizedVatMode,
    })),
  );

  return {
    status: "FORMED",
    candidateRate: rep.status === "ok" ? rep.medianPln : primary.median,
    candidateRange:
      primary.valueMin != null && primary.valueMax != null
        ? { min: primary.valueMin, max: primary.valueMax }
        : null,
    unit,
    scope: "LABOR_ONLY",
    evidenceCount: primary.observations.length,
    independentSourceCount: primary.independentSourceCount,
    clusterCount: clusters.length,
    agreementStatus: primary.agreementStatus,
    limitations: [
      ...(primary.independentSourceCount < 3 ? ["lowSample (<3 independent sources)"] : []),
      "isOurRate=false — research candidate only",
      "mayPersistOurRate=false — GO29 / R1",
    ],
    reasoning: [
      "Median of LABOR_ONLY independent observations (REUSE calculateRepresentativeWorkRate)",
      `independentSourceCount=${primary.independentSourceCount}`,
    ],
    ...hardFalse,
  };
}

export function assessConfidence(input: {
  profile: ResearchWorkProfile;
  candidate: RateCandidate;
  norms: NormalizedObservation[];
}): ConfidenceAssessment {
  const eligible = input.norms.filter((n) => n.eligibleForLaborCandidate);
  const none = eligible.length === 0;
  return {
    components: {
      relevance: input.profile.identityProvenance.trusted ? "trusted_identity" : "untrusted",
      specificity: input.profile.technology ? "technology_noted" : "generic",
      recency: "POLICY_OPEN",
      scopeMatch: eligible.every((n) => n.normalizedScope === "LABOR_ONLY")
        ? "labor_only"
        : "mixed_or_empty",
      unitMatch: "exact_or_owner_equiv_only",
      regionalRelevance: input.profile.region || "unknown",
      sourceTransparency: "allowlisted_hosts_only",
      independence: String(input.candidate.independentSourceCount),
      extractionReliability: none ? "none" : "parser_or_fixture",
    },
    confidenceStatus: none
      ? "NONE"
      : input.candidate.status === "FORMED"
        ? "POLICY_OPEN"
        : "LOW",
    note: "No invented numeric AUTO threshold — confidenceStatus POLICY_OPEN when candidate formed (P7 OPEN)",
  };
}

export function evaluateAutoRateEligibility(input: {
  profile: ResearchWorkProfile;
  candidate: RateCandidate;
  laborGateOk: boolean;
  providerMatchEmpty: boolean;
  providerBlocked: boolean;
  blocks: string[];
}): AutoRateEligibility {
  const mayPersistOurRate = false as const;
  const policyDependencies = [
    "P5_UNKNOWN_SCOPE",
    "P6_CLASSIFICATION",
    "P7_CONFIDENCE_THRESHOLDS",
    "P8_AUTO_OUR_RATE_AUTHORITY_R1",
    "GO24_R1_NO_RESEARCH_PERSIST",
  ];

  if (VAGUE_LEGACY_WORK_IDS.has(input.profile.workId)) {
    return {
      status: "IDENTITY_SEMANTIC_HOLD",
      reasons: ["VAGUE_LEGACY_BUCKET_IDENTITY"],
      blockingFactors: ["Cannot safely triangulate a single labor rate for vague work id"],
      policyDependencies,
      mayPersistOurRate,
    };
  }

  if (!input.profile.identityProvenance.trusted) {
    return {
      status: "IDENTITY_BLOCK",
      reasons: ["IDENTITY_NOT_TRUSTED"],
      blockingFactors: ["Research must not alter identity; trusted G1 required"],
      policyDependencies,
      mayPersistOurRate,
    };
  }

  if (!input.laborGateOk || input.blocks.includes("CLASSIFICATION_BLOCK")) {
    return {
      status: "CLASSIFICATION_BLOCK",
      reasons: ["CLASSIFICATION_NOT_LABOR"],
      blockingFactors: [`classification=${input.profile.classification}`],
      policyDependencies,
      mayPersistOurRate,
    };
  }

  if (input.providerBlocked) {
    return {
      status: "PROVIDER_BLOCK",
      reasons: ["PROVIDER_BLOCK"],
      blockingFactors: ["Authorized provider returned block"],
      policyDependencies,
      mayPersistOurRate,
    };
  }

  if (input.candidate.status === "CONFLICTING_EVIDENCE") {
    return {
      status: "CONFLICT",
      reasons: ["CONFLICTING_EVIDENCE"],
      blockingFactors: input.candidate.limitations,
      policyDependencies,
      mayPersistOurRate,
    };
  }

  if (input.candidate.status === "INSUFFICIENT_EVIDENCE") {
    if (input.providerMatchEmpty) {
      return {
        status: "PROVIDER_COVERAGE_INSUFFICIENT",
        reasons: ["MATCH_EMPTY", "PROVIDER_COVERAGE_INSUFFICIENT"],
        blockingFactors: [
          "PASS1/PASS2 returned no identity-matched labor-only offers; PASS4 not authorized",
        ],
        policyDependencies,
        mayPersistOurRate,
      };
    }
    return {
      status: "INSUFFICIENT_EVIDENCE",
      reasons: ["NO_QUALIFIED_LABOR_ONLY_OBSERVATIONS"],
      blockingFactors: input.candidate.limitations,
      policyDependencies,
      mayPersistOurRate,
    };
  }

  if (input.candidate.status === "FORMED") {
    return {
      status: "ELIGIBLE_PENDING_POLICY",
      reasons: ["CANDIDATE_FORMED_BUT_P8_R1_FORBID_PERSIST"],
      blockingFactors: ["mayPersistOurRate=false", "GO24 R1=NO", "P8 OPEN"],
      policyDependencies,
      mayPersistOurRate,
    };
  }

  return {
    status: "NOT_ELIGIBLE",
    reasons: ["DEFAULT_NOT_ELIGIBLE"],
    blockingFactors: input.blocks,
    policyDependencies,
    mayPersistOurRate,
  };
}

function observationFromInjected(
  workId: string,
  raw: InjectedRawObservation,
  idx: number,
  nowMs: number,
): ResearchObservation {
  const scope = raw.forceScope ?? classifyRateScopeFromContext(raw.rawContext);
  const independenceKey = buildIndependenceKey({
    sourceId: raw.sourceId,
    url: raw.url,
    rawValue: raw.rawValue,
    rawUnit: raw.rawUnit,
    rawContext: raw.rawContext,
  });
  const rejected =
    scope !== "LABOR_ONLY"
      ? `SCOPE_${scope}`
      : null;
  return {
    observationId: `inj_${idx}_${raw.sourceId}`,
    sourceId: raw.sourceId,
    workId,
    rawValue: raw.rawValue,
    currency: raw.currency || "PLN",
    rawUnit: raw.rawUnit,
    scope,
    region: raw.region ?? null,
    vatMode: raw.vatMode ?? "unknown",
    publishedAt: raw.publishedAt ?? null,
    retrievedAt: raw.retrievedAt || iso(nowMs),
    rawContext: raw.rawContext,
    matchStatus: rejected ? "REJECTED" : "MATCHED",
    rejectionReason: rejected,
    independenceKey,
    fromCompanyPrice: false,
  };
}

/**
 * Main GO29 entry — READ-ONLY evaluation.
 * Never calls acceptWorkRateResearchCandidate · never writes catalog.
 */
export async function runAutonomousRateResearchEval(
  input: RunAutonomousRateEvalInput,
): Promise<AutonomousRateEvalResult> {
  const nowMs = input.nowMs ?? Date.now();
  const profile = buildResearchWorkProfile(input);
  const queries = buildResearchQueries(profile, nowMs);
  const blocks: string[] = [];
  const limitations: string[] = [];
  const sources: ResearchSource[] = [];
  let observations: ResearchObservation[] = [];
  let productionResearch: AutonomousRateEvalResult["productionResearch"] = null;
  let providerMatchEmpty = false;
  let providerBlocked = false;

  // Vague legacy → semantic hold early (still emit profile/queries)
  const vagueLegacy = VAGUE_LEGACY_WORK_IDS.has(profile.workId);
  if (vagueLegacy) {
    blocks.push("IDENTITY_SEMANTIC_HOLD");
    limitations.push("Vague legacy bucket — no generic construction labor invent");
  }

  if (!profile.identityProvenance.trusted) {
    blocks.push("IDENTITY_BLOCK");
  }

  const laborGate = assertLaborResearchAllowed({
    workId: profile.workId,
    namePl: profile.synonyms[0] || profile.description,
    unit: profile.unit,
  });
  if (!laborGate.ok) {
    blocks.push("CLASSIFICATION_BLOCK");
    limitations.push(`Classification plane=${profile.classification} — research gate blocked`);
  }

  // Explicitly refuse companyPrice as evidence
  if (profile.companyPricePln != null && profile.companyPricePln > 0) {
    limitations.push(
      `companyPricePln=${profile.companyPricePln} present but FORBIDDEN as research evidence (C-NO-SEED)`,
    );
  }

  // Injected fixtures (unit tests / offline)
  if (input.injectedObservations?.length) {
    observations = input.injectedObservations.map((raw, i) =>
      observationFromInjected(profile.workId, raw, i, nowMs),
    );
    for (const o of observations) {
      sources.push({
        sourceId: o.sourceId,
        url: null,
        domain: o.sourceId,
        title: null,
        retrievedAt: o.retrievedAt,
        publishedAt: o.publishedAt,
        sourceClass: "fixture",
        scope: o.scope,
        region: o.region,
        independenceKey: o.independenceKey,
        extractionStatus: o.matchStatus === "MATCHED" ? "OK" : "EMPTY",
      });
    }
    // Mark one query as executed via fixture path for audit
    if (queries[0]) {
      queries[0] = {
        ...queries[0],
        status: "EXECUTED_VIA_PASS12",
        statusReason: "Fixture injectedObservations (deterministic test path)",
      };
    }
  } else if (
    input.runProvider &&
    input.store &&
    laborGate.ok &&
    profile.identityProvenance.trusted &&
    !vagueLegacy
  ) {
    // REUSE production selective research — candidate only, no Accept
    const res: RunSelectiveWorkRateResearchResult = await runSelectiveWorkRateResearch({
      store: input.store,
      workId: profile.workId,
      unit: profile.unit,
      namePl: profile.synonyms[0] || profile.description,
      matchNamesPl: profile.synonyms,
      forceRefresh: true,
      bypassCooldown: true,
      nowMs,
      lookupPort: input.lookupPort ?? undefined,
    });
    productionResearch = {
      status: res.status,
      httpFetchCount: res.httpFetchCount ?? 0,
      matchEmpty: (res.telemetry || []).some((t) => t.code === "MATCH_EMPTY"),
      messagePl: res.messagePl ?? null,
    };
    providerMatchEmpty = productionResearch.matchEmpty || res.status === "GAP";
    if (res.status === "BLOCKED") {
      providerBlocked = true;
      blocks.push("PROVIDER_OR_GATE_BLOCK");
    }
    if (res.status === "CANDIDATE" && res.candidate) {
      const c: WorkRateResearchCandidate = res.candidate;
      // Map qualified observations from candidate (already labor-only qualified by engine)
      observations = (c.observations || []).map((o, i) => {
        const independenceKey = buildIndependenceKey({
          sourceId: o.sourceId,
          url: o.sourceUrl,
          rawValue: o.ratePln,
          rawUnit: o.unit,
          rawContext: `robocizna ${o.workNamePl}`,
        });
        return {
          observationId: `prov_${i}_${o.sourceId}`,
          sourceId: o.sourceId,
          workId: profile.workId,
          rawValue: o.ratePln,
          currency: "PLN",
          rawUnit: o.unit,
          scope: "LABOR_ONLY" as const,
          region: o.regionScope,
          vatMode: o.netGross,
          publishedAt: o.observedAt,
          retrievedAt: iso(nowMs),
          rawContext: `robocizna ${o.workNamePl}`,
          matchStatus: "MATCHED" as const,
          rejectionReason: null,
          independenceKey,
          fromCompanyPrice: false as const,
        };
      });
      for (const o of observations) {
        sources.push({
          sourceId: o.sourceId,
          url: null,
          domain: o.sourceId,
          title: null,
          retrievedAt: o.retrievedAt,
          publishedAt: o.publishedAt,
          sourceClass: "authorized_pass12",
          scope: "LABOR_ONLY",
          region: o.region,
          independenceKey: o.independenceKey,
          extractionStatus: "OK",
        });
      }
      if (queries[2]) {
        queries[2] = {
          ...queries[2],
          status: "EXECUTED_VIA_PASS12",
          statusReason: "runSelectiveWorkRateResearch PASS1/PASS2 (REUSE)",
        };
      }
    } else if (providerMatchEmpty) {
      limitations.push("MATCH_EMPTY on authorized PASS1/PASS2 — no fabricated external observations");
      blocks.push("PROVIDER_COVERAGE_INSUFFICIENT");
    }
  } else if (input.runProvider && !laborGate.ok) {
    productionResearch = {
      status: "BLOCKED",
      httpFetchCount: 0,
      matchEmpty: false,
      messagePl: "Classification gate blocked — provider not called",
    };
  }

  const normalizedObservations = observations.map((o) =>
    normalizeResearchObservation(o, profile.unit, profile.workId),
  );
  const clusters = clusterNormalizedObservations(normalizedObservations, profile.unit);

  let candidate: RateCandidate;
  if (vagueLegacy || blocks.includes("IDENTITY_BLOCK") || blocks.includes("CLASSIFICATION_BLOCK")) {
    candidate = {
      status: "BLOCKED",
      candidateRate: null,
      candidateRange: null,
      unit: profile.unit,
      scope: "LABOR_ONLY",
      evidenceCount: 0,
      independentSourceCount: 0,
      clusterCount: clusters.length,
      agreementStatus: "NONE",
      limitations: [...limitations, ...blocks],
      reasoning: ["Blocked before candidate formation"],
      isOurRate: false,
      mayPersistOurRate: false,
    };
  } else {
    candidate = buildRateCandidateFromClusters(clusters, profile.unit);
  }

  const confidence = assessConfidence({
    profile,
    candidate,
    norms: normalizedObservations,
  });

  const eligibility = evaluateAutoRateEligibility({
    profile,
    candidate,
    laborGateOk: laborGate.ok,
    providerMatchEmpty,
    providerBlocked,
    blocks,
  });

  // Hard invariant
  if (candidate.isOurRate !== false || candidate.mayPersistOurRate !== false) {
    throw new Error("GO29_INVARIANT: candidate must have isOurRate=false and mayPersistOurRate=false");
  }
  if (eligibility.mayPersistOurRate !== false) {
    throw new Error("GO29_INVARIANT: eligibility.mayPersistOurRate must be false");
  }

  return {
    profile,
    queries,
    sources,
    observations,
    normalizedObservations,
    clusters,
    candidate,
    confidence,
    eligibility,
    blocks: [...new Set(blocks)],
    limitations: [...new Set(limitations)],
    productionResearch,
    mutationGuard: {
      ourRateWritten: false,
      acceptCalled: false,
      workCatalogMutated: false,
      pass4Used: false,
    },
  };
}

/** Pure sync helper for unit tests — injected observations only. */
export function evaluateAutonomousRateFromFixtures(
  input: Omit<RunAutonomousRateEvalInput, "runProvider" | "lookupPort"> & {
    injectedObservations: InjectedRawObservation[];
  },
): Promise<AutonomousRateEvalResult> {
  return runAutonomousRateResearchEval({
    ...input,
    runProvider: false,
    injectedObservations: input.injectedObservations,
  });
}
