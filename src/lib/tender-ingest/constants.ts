/** INGEST-01 — local-only SSOT (no DATA_KEYS / Cloud). */

export const TENDER_INGEST_LS_KEY = "kw-tender-ingest-v1";
export const TENDER_INGEST_SCHEMA_VERSION = 1 as const;

/** Owner parse batch size (DF-I / D9). */
export const INGEST_PARSE_BATCH_SIZE = 8;

/** ZIP safety (DF-I-16). */
export const INGEST_ZIP_MAX_ENTRIES = 500;
export const INGEST_ZIP_MAX_UNCOMPRESSED_BYTES = 80 * 1024 * 1024;
export const INGEST_ZIP_MAX_SINGLE_ENTRY_BYTES = 25 * 1024 * 1024;
export const INGEST_SINGLE_FILE_MAX_BYTES = 25 * 1024 * 1024;
