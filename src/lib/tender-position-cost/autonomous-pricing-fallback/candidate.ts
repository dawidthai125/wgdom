/**
 * Evidence → PricingCandidate (Slice 2).
 *
 * HARD RULE: KNR_DOC_FACT alone NEVER yields labor PLN.
 * Only MARKET_LABOR_OBS (after qualification / median) may produce a candidate.
 */

import type { PricingConfidence } from "@/lib/tender-position-cost/position-cost-basis";
import {
  calculateRepresentativeWorkRate,
  type WorkRateQualifiedObservation,
} from "@/lib/work-catalog/work-rate-qualify";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";
import { mapApfLaborUnitToEngineUnit } from "./labor-units";
import { apfDistinctIdentityKey } from "./query";
import type {
  ApfLaborMarketObservation,
  ApfPricingCandidate,
  ApfResearchEvidence,
  ApfResearchQuery,
} from "./types";

const BUILDER_VERSION = "apf-slice2-v1";

export function marketObservationsToResearchEvidence(
  observations: readonly ApfLaborMarketObservation[],
): ApfResearchEvidence[] {
  return observations.map((o) => ({
    evidenceId: o.evidenceId,
    kind: "MARKET_LABOR_OBS" as const,
    summaryPl: o.summaryPl,
    sourceId: o.sourceId,
    retrievedAt: o.observedAt,
    marketUnitRatePln: o.unitRatePln,
    marketUnit: o.unit,
    sourceUrl: o.sourceUrl ?? null,
    distinctKey: o.distinctKey ?? null,
  }));
}

function toQualifiedObservation(
  o: ApfLaborMarketObservation,
  engineUnit: string,
): WorkRateQualifiedObservation | null {
  const rate = Number(o.unitRatePln);
  if (!Number.isFinite(rate) || rate <= 0) return null;
  return {
    sourceId: o.sourceId as WorkRateQualifiedObservation["sourceId"],
    workNamePl: o.summaryPl,
    ratePln: Math.round(rate * 100) / 100,
    unit: engineUnit as WgdomCostUnit,
    regionScope: "POLSKA" as WorkRateRegionScope,
    laborOnly: true,
    sourceUrl: String(o.sourceUrl ?? o.sourceId),
    observedAt: o.observedAt,
    netGross: "unknown",
    sourceMinPln: null,
    sourceMaxPln: null,
    marketBaseKind: "point",
  };
}

function confidenceFromSample(
  sampleSize: number,
  lowSample: boolean,
): PricingConfidence {
  if (sampleSize >= 3 && !lowSample) return "HIGH";
  if (sampleSize >= 2) return "MEDIUM";
  return "LOW";
}

/**
 * Build PricingCandidate from market labor observations + full evidence list.
 * Returns null when no usable market labor PLN (including KNR-only evidence).
 */
export function buildApfPricingCandidateFromEvidence(args: {
  query: ApfResearchQuery;
  evidence: readonly ApfResearchEvidence[];
  marketObservations: readonly ApfLaborMarketObservation[];
  nowIso?: string;
}): ApfPricingCandidate | null {
  const { query, evidence, marketObservations } = args;
  const distinctKey = apfDistinctIdentityKey(query);
  const engineUnit = mapApfLaborUnitToEngineUnit(query.unit);

  const scoped = marketObservations.filter((o) => {
    if (!o.distinctKey) return true;
    return (
      o.distinctKey === distinctKey ||
      o.distinctKey === query.catalogBasis?.tableCode
    );
  });

  /** PRIMARY only for candidate median — SECONDARY retained as evidence, never averaged. */
  const primaryScoped = scoped.filter(
    (o) => o.sourceRole !== "SECONDARY" && o.sourceRole !== "BENCHMARK_ONLY",
  );
  const candidateObservations =
    primaryScoped.length > 0 ? primaryScoped : scoped;

  const marketEvidenceIds = evidence
    .filter((e) => e.kind === "MARKET_LABOR_OBS")
    .map((e) => e.evidenceId);
  if (marketEvidenceIds.length === 0 && candidateObservations.length === 0) {
    return null;
  }

  const qualified = candidateObservations
    .map((o) => toQualifiedObservation(o, engineUnit))
    .filter((x): x is WorkRateQualifiedObservation => x != null);

  if (!qualified.length) return null;

  const representative = calculateRepresentativeWorkRate(qualified);
  if (representative.status !== "ok" || representative.medianPln == null) {
    return null;
  }

  const evidenceIds = [
    ...new Set([
      ...scoped.map((o) => o.evidenceId),
      ...marketEvidenceIds,
    ]),
  ];
  const confidence = confidenceFromSample(
    representative.sampleSize,
    representative.lowSample === true,
  );
  const builtAt = args.nowIso ?? new Date().toISOString();
  const candidateId = `apf-cand:${distinctKey}:${query.lineId}`;

  return {
    candidateId,
    lineRef: {
      tenderId: query.tenderId,
      dwellingId: query.dwellingId ?? null,
      lineId: query.lineId,
      lp: query.lp ?? null,
    },
    basisKind: "EPHEMERAL_RESEARCH",
    components: {
      labor: {
        unitRatePln: representative.medianPln,
        unit: engineUnit,
        method: "APF_LABOR_MARKET_MEDIAN",
        evidenceIds,
        confidence,
      },
    },
    classificationHint: "LABOR",
    confidence,
    provenance: {
      evidenceIds,
      builtAt,
      builderVersion: BUILDER_VERSION,
      queryKeys: {
        normalizedKey: query.catalogBasis?.normalizedKey ?? null,
        tableCode: query.catalogBasis?.tableCode ?? null,
        description: query.description,
        unit: query.unit,
      },
    },
    limitations: [
      "EPHEMERAL_NOT_OUR_RATE",
      "NOT_AUTO_ACCEPT",
      "NO_CATALOG_WORK_CREATE",
      `DISTINCT_KEY=${distinctKey}`,
      ...(representative.lowSample ? ["LOW_SAMPLE"] : []),
    ],
  };
}

/** True when evidence set is exclusively KNR knowledge (no market labor). */
export function isApfKnowledgeOnlyEvidence(
  evidence: readonly ApfResearchEvidence[],
): boolean {
  if (!evidence.length) return false;
  return evidence.every((e) => e.kind === "KNR_DOC_FACT");
}
