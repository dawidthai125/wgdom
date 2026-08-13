/**
 * INGEST-01 — types (local workspace).
 * Document identity ≠ dwelling identity ≠ filename SSOT.
 */

import type { TenderKosztorysSnapshot } from "@/lib/tenders-bzp-brief";
import { TENDER_INGEST_SCHEMA_VERSION } from "@/lib/tender-ingest/constants";

export type TenderIngestMode = "owner_requested" | "fixture_pin";
export type TenderIngestRetention = "normal" | "pinned";

export type TenderDocumentSource =
  | "bzp"
  | "external"
  | "owner_upload"
  | "archive_inner";

export type TenderDocumentClassHint =
  | "COST"
  | "PROJECT"
  | "SUPPORT"
  | "LEGAL"
  | "UNKNOWN";

export type TenderDocumentIngestStatus =
  | "retained"
  | "rejected_unsafe"
  | "pending_bytes";

export type TenderIngestPhase =
  | "INGEST_PENDING"
  | "INGEST_PARTIAL"
  | "INGEST_COMPLETE"
  | "PARSE_PENDING"
  | "PARSE_PARTIAL"
  | "PARSE_COMPLETE"
  | "HOLD";

export interface ImportTenderRequest {
  ocdsId?: string;
  bzpNumber?: string;
  title: string;
  organizationName: string;
  organizationCity?: string;
  sourceUrls?: string[];
  ingestMode: TenderIngestMode;
  retention: TenderIngestRetention;
}

export interface TenderArchiveRecord {
  archiveId: string;
  tenderId: string;
  originalFilename: string;
  contentHash: string;
  size: number;
  children: string[];
  status: "ok" | "corrupt" | "rejected_unsafe";
  warnings: string[];
}

export interface TenderIngestDocument {
  documentId: string;
  tenderId: string;
  source: TenderDocumentSource;
  originalFilename: string;
  displayName: string;
  contentHash: string;
  mimeType: string;
  size: number;
  originReference?: string;
  parentArchiveId?: string;
  ingestStatus: TenderDocumentIngestStatus;
  classHint: TenderDocumentClassHint;
  parseStatus: "none" | "queued" | "parsed" | "failed" | "skipped";
  /** Bytes kept in-memory for owner path (not persisted to LS). */
  bytes?: Uint8Array;
  publicUrl?: string;
  warnings: string[];
}

export interface TenderIngestArtifactRef {
  documentId: string;
  filename: string;
  contentHash: string;
  snapshot: TenderKosztorysSnapshot;
}

export interface TenderIngestState {
  tenderId: string;
  ingestMode: TenderIngestMode;
  retention: TenderIngestRetention;
  ocdsId?: string;
  bzpNumber?: string;
  sourceUrls: string[];
  documents: TenderIngestDocument[];
  archives: TenderArchiveRecord[];
  artifacts: TenderIngestArtifactRef[];
  ingestPhase: TenderIngestPhase;
  parsePhase: TenderIngestPhase;
  skippedDocumentIds: string[];
  /** Owner-declared expected count (PARTIAL when retained < expected). */
  expectedDocumentCount: number | null;
  warnings: string[];
  updatedAt: string;
}

export interface TenderIngestStore {
  version: typeof TENDER_INGEST_SCHEMA_VERSION;
  byTenderId: Record<string, TenderIngestState>;
}

export interface OwnerHeavyParsePolicy {
  /** Owner-requested: never silent top-N. */
  mode: "FULL" | "QUEUE" | "EXPLICIT_CAP";
  cap?: number;
  skippedVisible: string[];
}
