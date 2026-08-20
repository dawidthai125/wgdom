/**
 * IK-HISTORICAL-EXECUTED-ATH — types (READ-ONLY evidence · NEVER Catalog authority).
 *
 * Forbidden statuses: VERIFIED · APPROVED · REJECTED · PENDING_VERIFY.
 */

import type { KnrNormBundle } from "@/lib/intelligent-estimator/knr-knowledge/knr-catalog-entry-types";

export const HISTORICAL_EXECUTED_SCHEMA_VERSION = 1 as const;

/** Frozen result kinds — DF §F.2 */
export type HistoricalMatchKind =
  | "HISTORICAL_EXACT_RMS"
  | "HISTORICAL_EXACT"
  | "HISTORICAL_FAMILY"
  | "HISTORICAL_CONFLICT"
  | "HISTORICAL_MISS";

/** Frozen hierarchy — L0 strongest · L5 NO HISTORY (DF supersedes PLAN numbering). */
export type HistoricalMatchLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type HistoricalRmsClass = "FULL_RMS" | "PARTIAL_RMS" | "NO_RMS";

export type HistoricalConfidence = "LOW" | "MED" | "HIGH" | null;

export type HistoricalConflictKind =
  | "IDENTITY_SPLIT"
  | "RMS_HASH_SPLIT"
  | "CHAPTER_DOMAIN"
  | "MATERIAL_VARIANT"
  | "UNKNOWN_VARIANT";

export type HistoricalExecutedSourceRef = {
  jobId: string;
  address: string;
  filename: string;
  storagePath: string;
  contentSha256: string;
  jobStatus: "completed" | string;
};

export type HistoricalExecutedOccurrence = {
  occurrenceId: string;
  source: HistoricalExecutedSourceRef;
  displayCode: string;
  family: string;
  catalogId: string;
  tableCode: string;
  description: string;
  unit: string;
  quantity: number | null;
  identityKeyV2: string | null;
  chapter: string | null;
  publisher: string | null;
  edition: string | null;
  rmsClass: HistoricalRmsClass;
  norms: KnrNormBundle | null;
  contentHash: string | null;
  /** Observed ATH money — NEVER pricing authority. */
  observedCost: number | null;
};

export type HistoricalConflictVariant = {
  identityKeyV2: string | null;
  chapter: string | null;
  contentHash: string | null;
  description: string;
  materialSummary: string | null;
  sourceJobIds: string[];
};

export type HistoricalConflict = {
  kind: HistoricalConflictKind;
  displayCode: string;
  reasonCodes: string[];
  variants: HistoricalConflictVariant[];
};

export type HistoricalLookupResult = {
  schemaVersion: typeof HISTORICAL_EXECUTED_SCHEMA_VERSION;
  lineId: string;
  kind: HistoricalMatchKind;
  matchLevel: HistoricalMatchLevel;
  confidence: HistoricalConfidence;
  /** Literal frozen — never true. */
  authority: false;
  occurrenceCount: number;
  exactOccurrenceCount: number;
  familyOccurrenceCount: number;
  distinctJobCount: number;
  distinctSourceCount: number;
  fullRmsCount: number;
  rmsAgreement: "CONSISTENT" | "MIXED" | "CONFLICT" | "UNKNOWN" | "N_A";
  displayCode: string | null;
  identityKeyV2: string | null;
  contentHashSet: string[];
  sourceJobs: Array<{ jobId: string; address: string }>;
  sourceAth: Array<{ filename: string; storagePath: string; contentSha256: string }>;
  sampleDescriptions: string[];
  chapters: string[];
  conflict: HistoricalConflict | null;
  evidenceRef: string;
  /** Soft Labor/Material hint text only — never OUR RATE. */
  softLaborHintPl: string | null;
  softMaterialHintPl: string | null;
};

export type HistoricalIndexConflictEntry = {
  displayCode: string;
  conflict: HistoricalConflict;
};

export type HistoricalExecutedIndex = {
  schemaVersion: typeof HISTORICAL_EXECUTED_SCHEMA_VERSION;
  occurrences: HistoricalExecutedOccurrence[];
  byDisplayCode: Map<string, HistoricalExecutedOccurrence[]>;
  byIdentityKeyV2: Map<string, HistoricalExecutedOccurrence[]>;
  byFamilyCatalog: Map<string, HistoricalExecutedOccurrence[]>;
  conflictsByDisplayCode: Map<string, HistoricalConflict>;
  sourceCount: number;
  authority: false;
};
