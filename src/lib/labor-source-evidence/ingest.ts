/**
 * WR-SOURCE-EVIDENCE-DB-01 — build observation from parse/identity/scope outcomes.
 * REUSE D1 classify + Owner synonyms outcomes — does NOT reimplement matching.
 * Does NOT write Catalog / OUR RATE / Accept.
 */

import { buildLaborSourceEvidenceDedupeKey } from "@/lib/labor-source-evidence/dedupe";
import { resolveLaborSourceEvidenceSourceRole } from "@/lib/labor-source-evidence/source-roles";
import type {
  LaborSourceEvidenceIdentityMethod,
  LaborSourceEvidenceObservation,
  LaborSourceEvidencePriceKind,
  LaborSourceEvidenceQualityStatus,
} from "@/lib/labor-source-evidence/types";
import { LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION } from "@/lib/labor-source-evidence/types";
import type { WorkRateEvidenceScopeTag } from "@/lib/work-catalog/work-rate-evidence-scope";
import {
  classifyWorkRateEvidenceScopeTag,
  isWorkRateEvidenceScopeAllowed,
  listAllowedWorkRateEvidenceScopeTags,
} from "@/lib/work-catalog/work-rate-evidence-scope";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export type BuildLaborSourceEvidenceInput = {
  workId: string | null;
  workNamePl?: string | null;
  sourceId: string;
  sourceUrl: string;
  categoryKey?: string | null;
  observedName: string;
  unit: string;
  priceMin?: number | null;
  priceMax?: number | null;
  pricePoint?: number | null;
  priceKind?: LaborSourceEvidencePriceKind;
  region: WorkRateRegionScope;
  identityMatched: boolean;
  identityMethod: LaborSourceEvidenceIdentityMethod;
  synonymUsed?: string | null;
  laborOnly: boolean;
  includesMaterial: boolean;
  packageOrPromo?: boolean;
  observedAt?: string;
  retrievedAt?: string;
  /** When true, force UNMATCHED (inbox). */
  forceUnmatched?: boolean;
};

/**
 * Construct one evidence row. Scope/identity results are stored; aggregation filter is separate.
 */
export function buildLaborSourceEvidenceObservation(
  input: BuildLaborSourceEvidenceInput,
): LaborSourceEvidenceObservation {
  const retrievedAt = input.retrievedAt || new Date().toISOString();
  const observedAt = input.observedAt || retrievedAt;
  const scopeTag: WorkRateEvidenceScopeTag = classifyWorkRateEvidenceScopeTag(input.observedName);

  let priceKind: LaborSourceEvidencePriceKind = input.priceKind || "unknown";
  const priceMin = input.priceMin ?? null;
  const priceMax = input.priceMax ?? null;
  const pricePoint = input.pricePoint ?? null;
  if (!input.priceKind) {
    if (
      priceMin != null &&
      priceMax != null &&
      Number.isFinite(priceMin) &&
      Number.isFinite(priceMax) &&
      priceMin !== priceMax
    ) {
      priceKind = "range";
    } else if (pricePoint != null && Number.isFinite(pricePoint)) {
      priceKind = "point";
    }
  }

  let qualityStatus: LaborSourceEvidenceQualityStatus = "VALID";
  if (input.forceUnmatched || !input.workId) {
    qualityStatus = "UNMATCHED";
  } else if (!input.identityMatched || input.identityMethod === "unmatched") {
    qualityStatus = "REJECTED_IDENTITY";
  } else if (input.packageOrPromo) {
    qualityStatus = "REJECTED_PACKAGE";
  } else if (input.includesMaterial || !input.laborOnly) {
    qualityStatus = "REJECTED_OUTLIER";
  } else {
    const allowed = listAllowedWorkRateEvidenceScopeTags({
      workId: input.workId,
      namePl: input.workNamePl || "",
    });
    if (!isWorkRateEvidenceScopeAllowed(scopeTag, allowed)) {
      qualityStatus = "REJECTED_SCOPE";
    }
  }

  const workId = qualityStatus === "UNMATCHED" ? null : input.workId;
  const dedupeKey = buildLaborSourceEvidenceDedupeKey({
    workId,
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    observedName: input.observedName,
    unit: input.unit,
    region: input.region,
    priceKind,
    priceMin,
    priceMax,
    pricePoint,
  });

  const synonymUsed = input.synonymUsed ?? null;

  return {
    evidenceId: newId(),
    workId,
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    categoryKey: input.categoryKey ?? null,
    observedName: input.observedName,
    unit: input.unit,
    priceMin,
    priceMax,
    pricePoint,
    priceKind,
    currency: "PLN",
    region: input.region,
    country: "POLSKA",
    scopeTag,
    identityMethod: input.identityMethod,
    synonymUsed,
    identityMatched: input.identityMatched,
    laborOnly: input.laborOnly,
    includesMaterial: input.includesMaterial,
    observedAt,
    retrievedAt,
    provenance: {
      sourceId: input.sourceId,
      sourceUrl: input.sourceUrl,
      observedName: input.observedName,
      region: input.region,
      unit: input.unit,
      priceKind,
      priceMin,
      priceMax,
      pricePoint,
      retrievedAt,
      identityMethod: input.identityMethod,
      synonymUsed,
      scopeTag,
    },
    qualityStatus,
    dedupeKey,
    sourceRole: resolveLaborSourceEvidenceSourceRole(input.sourceId),
    parserVersion: null,
    staleAt: null,
    schemaVersion: LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION,
  };
}

/** Pool filter for aggregation: VALID + scope allowed for work. */
export function filterLaborSourceEvidenceForAggregation(
  observations: LaborSourceEvidenceObservation[],
  work: { workId: string; namePl: string },
): LaborSourceEvidenceObservation[] {
  const allowed = listAllowedWorkRateEvidenceScopeTags({
    workId: work.workId,
    namePl: work.namePl,
  });
  return observations.filter((o) => {
    if (o.qualityStatus !== "VALID") return false;
    if (o.workId !== work.workId) return false;
    return isWorkRateEvidenceScopeAllowed(o.scopeTag, allowed);
  });
}
