/**
 * IK-LABOR-EXPERT-REC-01 — RO Evidence Pack over WorkRateResearchCandidate.
 *
 * ZERO invent PLN · ZERO companyPrice · ZERO Accept/write.
 * candidateRatePln MUST equal candidate.suggestedRatePln.
 */

import type {
  WorkRateResearchCandidate,
  WorkRateResearchRejectRow,
} from "@/lib/work-catalog/work-rate-research";
import type { WorkRateQualifiedObservation } from "@/lib/work-catalog/work-rate-qualify";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";

export const LABOR_RATE_REPRESENTATIVE_METHOD =
  "median_qualified_by_region_fallback" as const;

export type LaborRateEvidenceObservation = {
  sourceId: string;
  sourceType: "RESEARCH_CANONICAL";
  sourceUrl: string;
  ratePln: number;
  unit: WgdomCostUnit;
  regionScope: WorkRateRegionScope;
  observedAt: string;
  laborOnly: true;
  netGross: "netto" | "brutto" | "unknown";
  workNamePlObserved: string;
};

export type LaborRateEvidenceContext = {
  tenderId?: string | null;
  lineId?: string | null;
  lp?: string | null;
  boqDescription?: string | null;
  identityNotePl?: string | null;
  httpFetchCount?: number | null;
  builtAt?: string;
};

export type LaborRateEvidencePack = {
  workId: string;
  namePl: string;
  unit: WgdomCostUnit;
  currency: "PLN";
  requestedRegionScope: WorkRateRegionScope;
  /** MUST === candidate.suggestedRatePln — never invent. */
  candidateRatePln: number;
  representativeMethod: typeof LABOR_RATE_REPRESENTATIVE_METHOD;
  sampleSize: number;
  regionalSampleCount: number;
  lowSample: boolean;
  observations: LaborRateEvidenceObservation[];
  rejectRows: WorkRateResearchRejectRow[];
  lmRejected: boolean;
  unitIncompatibleCount: number;
  previousOurRatePln: number | null;
  previousFreshness: "CURRENT" | "STALE" | "MISSING";
  deltaPln: number | null;
  deltaPct: number | null;
  provenance: {
    rateSource: "candidate.suggestedRatePln";
    observationsSource: "candidate.observations";
    companyPricePlnExcluded: true;
    /** Discovery metadata only — never invents rate. */
    discovery?: {
      synonymUsed: string | null;
      discoveryMethods: Array<"PASS1_CANONICAL" | "PASS2_CATEGORY">;
      observationProvenance: Array<{
        sourceId: string;
        discoveredUrl: string;
        discoveryMethod: "PASS1_CANONICAL" | "PASS2_CATEGORY" | "UNKNOWN";
      }>;
    };
  };
  builtAt: string;
  httpFetchCount: number | null;
  companyPricePlnExcluded: true;
  /** Optional BOQ passthrough — NOT F5 re-resolve. */
  tenderId: string | null;
  lineId: string | null;
  lp: string | null;
  boqDescription: string | null;
  identityNotePl: string | null;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function mapObs(o: WorkRateQualifiedObservation): LaborRateEvidenceObservation {
  return {
    sourceId: o.sourceId,
    sourceType: "RESEARCH_CANONICAL",
    sourceUrl: o.sourceUrl,
    ratePln: o.ratePln,
    unit: o.unit,
    regionScope: o.regionScope,
    observedAt: o.observedAt,
    laborOnly: true,
    netGross: o.netGross,
    workNamePlObserved: o.workNamePl,
  };
}

/**
 * Pure RO pack. Returns null when candidate is missing / invalid / empty evidence.
 * Does NOT invent a rate.
 */
export function buildLaborRateEvidencePack(
  candidate: WorkRateResearchCandidate | null | undefined,
  rejects?: readonly WorkRateResearchRejectRow[] | null,
  ctx?: LaborRateEvidenceContext | null,
): LaborRateEvidencePack | null {
  if (!candidate) return null;

  const suggested = Number(candidate.suggestedRatePln);
  if (!Number.isFinite(suggested) || !(suggested > 0)) return null;

  const observations = Array.isArray(candidate.observations)
    ? candidate.observations
    : [];
  if (observations.length === 0) return null;

  // Fail closed: any non-labor-only in qualified list is contract breach
  if (observations.some((o) => o.laborOnly !== true)) return null;

  const rejectRows = [...(rejects ?? [])];
  const lmRejected = rejectRows.some(
    (r) =>
      r.reason === "includes_material" ||
      r.reason === "not_labor_only" ||
      /material|l\+m|labor.?only/i.test(`${r.reason} ${r.messagePl}`),
  );
  const unitIncompatibleCount = rejectRows.filter(
    (r) => r.reason === "unit_mismatch",
  ).length;

  const region = candidate.regionScope;
  const regionalSampleCount = observations.filter(
    (o) => o.regionScope === region,
  ).length;

  const prev = candidate.previousOurRatePln;
  const hasPrev =
    prev != null && Number.isFinite(prev) && prev > 0;
  const deltaPln = hasPrev ? round2(suggested - (prev as number)) : null;
  const deltaPct =
    hasPrev && (prev as number) > 0
      ? round2((deltaPln! / (prev as number)) * 100)
      : null;

  const builtAt = ctx?.builtAt?.trim() || new Date().toISOString();

  const methods = Array.isArray(candidate.discoveryMethods)
    ? candidate.discoveryMethods
    : [];
  const primaryMethod: "PASS1_CANONICAL" | "PASS2_CATEGORY" | "UNKNOWN" =
    methods.includes("PASS2_CATEGORY") && methods.includes("PASS1_CANONICAL")
      ? "PASS1_CANONICAL"
      : methods[0] ?? "UNKNOWN";

  return {
    workId: candidate.workId,
    namePl: candidate.namePl,
    unit: candidate.unit,
    currency: "PLN",
    requestedRegionScope: region,
    candidateRatePln: suggested,
    representativeMethod: LABOR_RATE_REPRESENTATIVE_METHOD,
    sampleSize: candidate.sampleSize,
    regionalSampleCount,
    lowSample: Boolean(candidate.lowSample),
    observations: observations.map(mapObs),
    rejectRows,
    lmRejected,
    unitIncompatibleCount,
    previousOurRatePln: hasPrev ? (prev as number) : null,
    previousFreshness: candidate.previousFreshness,
    deltaPln,
    deltaPct,
    provenance: {
      rateSource: "candidate.suggestedRatePln",
      observationsSource: "candidate.observations",
      companyPricePlnExcluded: true,
      discovery: {
        synonymUsed: candidate.synonymUsed ?? null,
        discoveryMethods: [...methods],
        observationProvenance: observations.map((o) => ({
          sourceId: o.sourceId,
          discoveredUrl: o.sourceUrl,
          discoveryMethod: primaryMethod,
        })),
      },
    },
    builtAt,
    httpFetchCount:
      ctx?.httpFetchCount == null ? null : Number(ctx.httpFetchCount),
    companyPricePlnExcluded: true,
    tenderId: ctx?.tenderId?.trim() || null,
    lineId: ctx?.lineId?.trim() || null,
    lp: ctx?.lp != null ? String(ctx.lp) : null,
    boqDescription: ctx?.boqDescription?.trim() || null,
    identityNotePl: ctx?.identityNotePl?.trim() || null,
  };
}
