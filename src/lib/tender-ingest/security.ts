/**
 * INGEST-01 — ZIP / path safety (guards only).
 */

import {
  INGEST_SINGLE_FILE_MAX_BYTES,
  INGEST_ZIP_MAX_ENTRIES,
  INGEST_ZIP_MAX_SINGLE_ENTRY_BYTES,
  INGEST_ZIP_MAX_UNCOMPRESSED_BYTES,
} from "@/lib/tender-ingest/constants";

export function isPathTraversalName(name: string): boolean {
  const n = String(name ?? "").replace(/\\/g, "/");
  if (!n || n.startsWith("/") || /^[a-zA-Z]:/.test(n)) return true;
  const parts = n.split("/");
  return parts.some((p) => p === ".." || p === ".");
}

export function assertSingleFileSize(size: number): string | null {
  if (!Number.isFinite(size) || size < 0) return "INVALID_SIZE";
  if (size > INGEST_SINGLE_FILE_MAX_BYTES) return "FILE_TOO_LARGE";
  return null;
}

export function assertZipEntrySafe(opts: {
  name: string;
  uncompressedSize: number;
  entryCount: number;
  totalUncompressed: number;
}): string | null {
  if (isPathTraversalName(opts.name)) return "PATH_TRAVERSAL";
  if (opts.entryCount > INGEST_ZIP_MAX_ENTRIES) return "TOO_MANY_ENTRIES";
  if (opts.uncompressedSize > INGEST_ZIP_MAX_SINGLE_ENTRY_BYTES) return "ENTRY_TOO_LARGE";
  if (opts.totalUncompressed > INGEST_ZIP_MAX_UNCOMPRESSED_BYTES) return "ZIP_BOMB_UNCOMPRESSED";
  return null;
}
