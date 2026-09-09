/**
 * GO46 / KB-02 — main-path labor Research → durable Evidence seam.
 *
 * Research → Evidence (kw-wgdom-labor-source-evidence)
 * Evidence ≠ OUR RATE ≠ Accept ≠ Candidate authority.
 *
 * Pre-research HTTP suppress remains POLICY OPEN (OD-45-04) —
 * this module exposes lookup only; it does not invent skip thresholds.
 */

import {
  buildLaborSourceEvidenceObservation,
  filterLaborSourceEvidenceForAggregation,
  loadLaborSourceEvidenceStoreLocal,
  upsertLaborSourceEvidenceObservations,
  type LaborSourceEvidenceCasResult,
  type LaborSourceEvidenceIdentityMethod,
  type LaborSourceEvidenceObservation,
} from "@/lib/labor-source-evidence";
import type { WorkRateQualifiedObservation } from "@/lib/work-catalog/work-rate-qualify";
import type { WgdomCostUnit } from "@/lib/wgdom-cost-catalog";

export const KB02_LABOR_EVIDENCE_SEAM_ID = "KB-02-LABOR-EVIDENCE-RUNTIME-GO46" as const;

/** Consumer may find Evidence; HTTP suppress = OD-52 STATE_ONLY (GO53 evaluator). */
export const KB02_EVIDENCE_HTTP_SUPPRESS_POLICY = "STATE_ONLY" as const;

export type PersistMeaningfulLaborResearchEvidenceInput = {
  workId: string;
  workNamePl: string;
  unit: WgdomCostUnit;
  observations: readonly WorkRateQualifiedObservation[];
  /** Hint from research identity mapping / synonym telemetry. */
  identityMethod?: LaborSourceEvidenceIdentityMethod;
  synonymUsed?: string | null;
  retrievedAt?: string;
  /** When false — dry map only (tests). Default true. */
  persist?: boolean;
};

export type PersistMeaningfulLaborResearchEvidenceResult = {
  seamId: typeof KB02_LABOR_EVIDENCE_SEAM_ID;
  meaningful: boolean;
  attempted: number;
  persisted: number;
  cas: LaborSourceEvidenceCasResult | null;
  observations: LaborSourceEvidenceObservation[];
  ourRateWritten: false;
  workCatalogMutated: false;
  acceptPerformed: false;
};

export type LookupReusableLaborResearchEvidenceInput = {
  workId: string;
  workNamePl: string;
  unit: WgdomCostUnit;
};

export type LookupReusableLaborResearchEvidenceResult = {
  seamId: typeof KB02_LABOR_EVIDENCE_SEAM_ID;
  hit: boolean;
  count: number;
  observations: LaborSourceEvidenceObservation[];
  /** Never an OUR RATE — Evidence plane only. */
  isOurRate: false;
  httpSuppressPolicy: typeof KB02_EVIDENCE_HTTP_SUPPRESS_POLICY;
  /** True when OD-52 STATE_ONLY evaluator may authorize suppress (GO53). Lookup alone ≠ sufficient. */
  maySuppressExternalResearch: boolean;
};

/**
 * Map one already-qualified research observation → Evidence row.
 * Caller MUST pass only post-qualify observations (OD-45-01).
 */
export function buildEvidenceFromQualifiedObservation(input: {
  workId: string;
  workNamePl: string;
  observation: WorkRateQualifiedObservation;
  identityMethod?: LaborSourceEvidenceIdentityMethod;
  synonymUsed?: string | null;
  retrievedAt?: string;
}): LaborSourceEvidenceObservation {
  const o = input.observation;
  const hasRange =
    o.sourceMinPln != null &&
    o.sourceMaxPln != null &&
    Number.isFinite(o.sourceMinPln) &&
    Number.isFinite(o.sourceMaxPln) &&
    o.sourceMinPln !== o.sourceMaxPln;
  return buildLaborSourceEvidenceObservation({
    workId: input.workId,
    workNamePl: input.workNamePl,
    sourceId: o.sourceId,
    sourceUrl: o.sourceUrl,
    observedName: o.workNamePl,
    unit: o.unit,
    priceMin: hasRange ? o.sourceMinPln! : null,
    priceMax: hasRange ? o.sourceMaxPln! : null,
    pricePoint: hasRange ? null : o.ratePln,
    priceKind: hasRange ? "range" : "point",
    region: o.regionScope,
    identityMatched: true,
    identityMethod: input.identityMethod ?? "exact_name",
    synonymUsed: input.synonymUsed ?? null,
    laborOnly: true,
    includesMaterial: false,
    observedAt: o.observedAt,
    retrievedAt: input.retrievedAt || o.observedAt,
  });
}

function resolveIdentityMethod(input: {
  identityMethod?: LaborSourceEvidenceIdentityMethod;
  synonymUsed?: string | null;
}): LaborSourceEvidenceIdentityMethod {
  if (input.identityMethod) return input.identityMethod;
  if (input.synonymUsed) return "owner_synonym";
  return "exact_name";
}

/**
 * OD-45-01 meaningful = already-qualified observations with rate + identity for Evidence model.
 * Rejected/empty/failed paths never reach here with observations.
 */
export function persistMeaningfulLaborResearchEvidence(
  input: PersistMeaningfulLaborResearchEvidenceInput,
): PersistMeaningfulLaborResearchEvidenceResult {
  const identityMethod = resolveIdentityMethod(input);
  const built: LaborSourceEvidenceObservation[] = [];
  for (const observation of input.observations) {
    if (!Number.isFinite(observation.ratePln) || !(observation.ratePln > 0)) continue;
    if (!observation.sourceId || !observation.sourceUrl) continue;
    if (!observation.unit || observation.unit !== input.unit) continue;
    if (!observation.laborOnly) continue;
    built.push(
      buildEvidenceFromQualifiedObservation({
        workId: input.workId,
        workNamePl: input.workNamePl,
        observation,
        identityMethod,
        synonymUsed: input.synonymUsed ?? null,
        retrievedAt: input.retrievedAt,
      }),
    );
  }

  if (built.length === 0) {
    return {
      seamId: KB02_LABOR_EVIDENCE_SEAM_ID,
      meaningful: false,
      attempted: 0,
      persisted: 0,
      cas: null,
      observations: [],
      ourRateWritten: false,
      workCatalogMutated: false,
      acceptPerformed: false,
    };
  }

  if (input.persist === false) {
    return {
      seamId: KB02_LABOR_EVIDENCE_SEAM_ID,
      meaningful: true,
      attempted: built.length,
      persisted: 0,
      cas: null,
      observations: built,
      ourRateWritten: false,
      workCatalogMutated: false,
      acceptPerformed: false,
    };
  }

  const cas = upsertLaborSourceEvidenceObservations({
    observations: built,
    nowIso: input.retrievedAt || new Date().toISOString(),
  });
  const persisted = cas.ok
    ? built.filter((b) =>
        cas.store.observations.some((o) => o.dedupeKey === b.dedupeKey),
      ).length
    : 0;

  return {
    seamId: KB02_LABOR_EVIDENCE_SEAM_ID,
    meaningful: true,
    attempted: built.length,
    persisted,
    cas,
    observations: built,
    ourRateWritten: false,
    workCatalogMutated: false,
    acceptPerformed: false,
  };
}

/**
 * Read-only Evidence consumer — finds VALID reusable labor Evidence for work+unit.
 * Does NOT return OUR RATE. HTTP suppress requires GO53 sufficiency evaluator (STATE_ONLY).
 */
export function lookupReusableLaborResearchEvidence(
  input: LookupReusableLaborResearchEvidenceInput,
): LookupReusableLaborResearchEvidenceResult {
  const store = loadLaborSourceEvidenceStoreLocal();
  const aggregated = filterLaborSourceEvidenceForAggregation(store.observations, {
    workId: input.workId,
    namePl: input.workNamePl,
  });
  const unitNorm = String(input.unit || "")
    .trim()
    .toLowerCase();
  const observations = aggregated.filter(
    (o) => String(o.unit || "").trim().toLowerCase() === unitNorm,
  );
  return {
    seamId: KB02_LABOR_EVIDENCE_SEAM_ID,
    hit: observations.length > 0,
    count: observations.length,
    observations,
    isOurRate: false,
    httpSuppressPolicy: KB02_EVIDENCE_HTTP_SUPPRESS_POLICY,
    // Lookup hit alone is not suppress — evaluator must run (may be true as policy mode).
    maySuppressExternalResearch: observations.length > 0,
  };
}
