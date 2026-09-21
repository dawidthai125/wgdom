/**
 * WR-SOURCE-EVIDENCE-DB-01 / OFN-01 Schema v2
 * Evidence ≠ OUR RATE ≠ Candidate ≠ Accept ≠ companyPrice ≠ margin.
 * Schema v1 observations (point|range|from_floor|unknown) remain readable.
 */

import type { WorkRateEvidenceScopeTag } from "@/lib/work-catalog/work-rate-evidence-scope";
import type { WorkRateRegionScope } from "@/lib/work-catalog/work-rate-types";

export const LABOR_SOURCE_EVIDENCE_STORAGE_KEY = "kw-wgdom-labor-source-evidence";
/** Store schema — v2 adds priceKind=derived + derivation block. */
export const LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION = 2 as const;
/** Historical observation schema stamp (direct-only rows). */
export const LABOR_SOURCE_EVIDENCE_SCHEMA_VERSION_V1 = 1 as const;

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
  | "REJECTED_DERIVATION"
  | "STALE"
  | "UNMATCHED";

/** Direct: point|range|from_floor|unknown · Derived: derived (requires derivation). */
export type LaborSourceEvidencePriceKind =
  | "point"
  | "range"
  | "from_floor"
  | "derived"
  | "unknown";

export type LaborSourceEvidenceIdentityMethod =
  | "exact_name"
  | "owner_synonym"
  | "owner_identity_mapping"
  | "names_loosely"
  | "unmatched";

export type LaborSourceEvidenceSourceRole = "PRIMARY" | "SECONDARY" | "REFERENCE";

export type DerivedLaborInputRole = "labor_norm" | "labor_cost_rate";

/**
 * One provenance-bearing input to a deterministic derivation.
 * REUSE pattern of top-level source fields — not a second provenance system.
 */
export type DerivedLaborEvidenceInput = {
  inputId: string;
  role: DerivedLaborInputRole;
  /** Numeric input value (e.g. 0.5093 or 52.30). */
  inputValue: number;
  /** Dimensional unit token (e.g. r-g/m2, PLN/r-g). */
  inputUnit: string;
  sourceId: string;
  sourceUrl: string;
  /** Hostname extracted for audit (no free-form invent). */
  host: string;
  observedAt: string;
  retrievedAt: string;
  /** Optional identity binding (workId or KNR tableCode). */
  identityRef?: string | null;
  /** Optional period label (e.g. Q2 2026) for freshness policy. */
  periodLabel?: string | null;
  /** Optional publisher (e.g. INTERCENBUD via BZG). */
  publisher?: string | null;
  /** Optional link to knr-discovery record — REUSE adjacent store. */
  provenanceRef?: string | null;
};

export type LaborSourceEvidenceDerivation = {
  formulaId: string;
  /** Human/audit mirror only — NEVER executable. */
  formulaExpression?: string | null;
  /** Registry calculatorVersion that produced the result. */
  formulaVersion: string;
  inputs: DerivedLaborEvidenceInput[];
  calculatedAt: string;
  calculatorVersion: string;
};

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
  /** Present when priceKind=derived — audit snapshot of derivation. */
  derivationSummary?: {
    formulaId: string;
    formulaVersion: string;
    calculatedAt: string;
    inputCount: number;
  } | null;
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
  /**
   * Per-observation stamp. Direct v1 rows may be 1; derived rows are 2.
   * Store-level schemaVersion is always current (2).
   */
  schemaVersion: 1 | 2;
  /** Required when priceKind=derived. Absent for direct observations. */
  derivation?: LaborSourceEvidenceDerivation | null;
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
      reason:
        | "etag_mismatch"
        | "cap_exceeded"
        | "host_rejected"
        | "empty_destructive"
        | "derivation_rejected";
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
  // point | derived | from_floor | unknown → use pricePoint when finite
  const p = Number(o.pricePoint);
  if (!Number.isFinite(p) || !(p > 0)) return null;
  return Math.round(p * 100) / 100;
}
