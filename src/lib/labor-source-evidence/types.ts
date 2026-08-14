/**
 * WR-SOURCE-EVIDENCE-DB-01 — types (schema v1).
 * Evidence ≠ OUR RATE ≠ Candidate ≠ Accept ≠ companyPrice ≠ margin.
 */

import type { WorkRateEvidenceScopeTag } from "@/lib/work-catalog/work-rate-evidence-scope";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";

export const LABOR_SOURCE_EVIDENCE_STORAGE_KEY = "kw-wgdom-labor-source-evidence";
export const LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION = 1 as const;

export const LABOR_SOURCE_EVIDENCE_CAP_GLOBAL = 8000;
export const LABOR_SOURCE_EVIDENCE_CAP_PER_WORK = 80;
export const LABOR_SOURCE_EVIDENCE_CAP_PER_SOURCE = 2000;
export const LABOR_SOURCE_EVIDENCE_CAP_PER_BATCH = 200;

export type LaborSourceEvidenceQualityStatus =
  | "VALID"
  | "REJECTED_SCOPE"
  | "REJECTED_IDENTITY"
  | "REJECTED_UNIT"
  | "REJECTED_PACKAGE"
  | "REJECTED_OUTLIER"
  | "STALE"
  | "UNMATCHED";

export type LaborSourceEvidencePriceKind = "point" | "range" | "from_floor" | "unknown";

export type LaborSourceEvidenceIdentityMethod =
  | "exact_name"
  | "owner_synonym"
  | "names_loosely"
  | "unmatched";

export type LaborSourceEvidenceSourceRole = "PRIMARY" | "SECONDARY" | "REFERENCE";

export type LaborSourceEvidenceProvenance = {
  sourceId: string;
  sourceUrl: string;
  observedName: string;
  region: WorkRateRegionScope;
  unit: string;
  priceKind: LaborSourceEvidencePriceKind;
  priceMin: number | null;
  priceMax: number | null;
  pricePoint: number | null;
  retrievedAt: string;
  identityMethod: LaborSourceEvidenceIdentityMethod;
  synonymUsed: string | null;
  scopeTag: WorkRateEvidenceScopeTag;
  pageTitle?: string | null;
  sectionHint?: string | null;
  fetchTraceId?: string | null;
};

export type LaborSourceEvidenceObservation = {
  evidenceId: string;
  workId: string | null;
  sourceId: string;
  sourceUrl: string;
  categoryKey: string | null;
  observedName: string;
  unit: string;
  priceMin: number | null;
  priceMax: number | null;
  pricePoint: number | null;
  priceKind: LaborSourceEvidencePriceKind;
  currency: "PLN";
  region: WorkRateRegionScope;
  country: "POLSKA";
  scopeTag: WorkRateEvidenceScopeTag;
  identityMethod: LaborSourceEvidenceIdentityMethod;
  synonymUsed: string | null;
  identityMatched: boolean;
  laborOnly: boolean;
  includesMaterial: boolean;
  observedAt: string;
  retrievedAt: string;
  provenance: LaborSourceEvidenceProvenance;
  qualityStatus: LaborSourceEvidenceQualityStatus;
  dedupeKey: string;
  sourceRole?: LaborSourceEvidenceSourceRole | null;
  parserVersion?: string | null;
  staleAt?: string | null;
  schemaVersion: typeof LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION;
};

export type LaborSourceEvidenceStore = {
  schemaVersion: typeof LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION;
  /** Monotonic revision for CAS / optimistic concurrency. */
  revision: number;
  /** Opaque etag derived from revision + content fingerprint. */
  etag: string;
  updatedAt: string;
  observations: LaborSourceEvidenceObservation[];
  tombstones?: string[];
};

export type LaborSourceEvidenceCapReport = {
  global: number;
  perWork: Record<string, number>;
  perSource: Record<string, number>;
  batchIncoming: number;
  overGlobal: boolean;
  overPerWork: string[];
  overPerSource: string[];
  overBatch: boolean;
  messagePl: string | null;
};

export type LaborSourceEvidenceCasResult =
  | { ok: true; store: LaborSourceEvidenceStore }
  | {
      ok: false;
      reason: "etag_mismatch" | "cap_exceeded" | "host_rejected" | "empty_destructive";
      store: LaborSourceEvidenceStore;
      messagePl: string;
      capReport?: LaborSourceEvidenceCapReport;
    };

/** Derived midpoint — NEVER stored as replacement for source range. */
export function deriveLaborSourceEvidenceMidpoint(
  o: Pick<LaborSourceEvidenceObservation, "priceKind" | "priceMin" | "priceMax" | "pricePoint">,
): number | null {
  if (o.priceKind === "range") {
    const a = Number(o.priceMin);
    const b = Number(o.priceMax);
    if (!Number.isFinite(a) || !Number.isFinite(b) || !(a > 0) || !(b > 0)) return null;
    return Math.round(((Math.min(a, b) + Math.max(a, b)) / 2) * 100) / 100;
  }
  const p = Number(o.pricePoint);
  if (!Number.isFinite(p) || !(p > 0)) return null;
  return Math.round(p * 100) / 100;
}
