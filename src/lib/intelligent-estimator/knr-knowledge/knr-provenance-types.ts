/**
 * IK-KNR KL-0 — Provenance / evidence contract (pattern: labor-source-evidence).
 *
 * rawEvidenceRef = contract pointer only · NO physical storage in KL-0.
 */

/** How norm data was acquired — not Work Catalog research. */
export type KnrAcquisitionMethod =
  | "NOT_ACQUIRED"
  | "LOCAL_CATALOG_HIT"
  | "LICENSED_EXPORT"
  | "LICENSED_BUNDLE"
  | "AUTHORIZED_API"
  | "AUTHORIZED_FETCH"
  | "SCRAPER"
  | "MANUAL_OWNER"
  | "LLM_ASSIST_NON_AUTHORITATIVE";

export type KnrEvidenceSourceType =
  | "UNSPECIFIED"
  | "OUR_KNR_CATALOG"
  | "LICENSED_PROGRAM_EXPORT"
  | "LICENSED_OEM_BUNDLE"
  | "AUTHORIZED_API"
  | "AUTHORIZED_FETCH"
  | "OWNER_MANUAL";

export type KnrRawEvidenceRef = {
  /** Opaque pointer — storage impl KL-5+ (GAP G2). */
  refId: string;
  kind: "export_file" | "import_batch" | "inline_stub";
  sourceFilename?: string | null;
  sourceRow?: number | null;
};

export type KnrProvenance = {
  sourceType: KnrEvidenceSourceType;
  sourceIdentifier: string;
  sourceProgram?: string | null;
  sourceProgramVersion?: string | null;
  acquisitionMethod: KnrAcquisitionMethod;
  capturedAt: string;
  retrievedAt?: string | null;
  parserVersion: string;
  contentHash: string;
  rawEvidenceRef: KnrRawEvidenceRef | null;
  importBatchId?: string | null;
  licenceId?: string | null;
  originId?: string | null;
  revision: number;
  evidenceMetadata?: Record<string, string | number | boolean | null>;
};

/** Raw evidence payload contract — acquire fills this · normalize reads (KL-5+). */
export type KnrRawEvidence = {
  format: "ATH" | "XML" | "XLS" | "XLSX" | "FWD" | "ZUZ" | "PUZ" | "UNKNOWN";
  parserVersion: string;
  sourceFilename: string;
  capturedAt: string;
  /** Inline bytes or ref — KL-0 stub may use minimal placeholder. */
  payloadRef: KnrRawEvidenceRef;
  originId: string;
  licenceId: string;
};
