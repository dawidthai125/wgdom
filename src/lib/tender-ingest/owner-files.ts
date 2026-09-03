/**
 * INGEST-01 — Owner multi-file / ZIP ingest (local registry; Cloud optional).
 */

import { retainOwnerFile, getIngestState } from "@/lib/tender-ingest/registry";
import type { TenderIngestState } from "@/lib/tender-ingest/types";

export async function ingestOwnerFileList(opts: {
  tenderId: string;
  files: Array<{ name: string; bytes: Uint8Array; originReference?: string }>;
}): Promise<{
  state: TenderIngestState;
  documentIds: string[];
  /** Session bytes for parse (LS strips bytes after retain). */
  bytesByDocumentId: Record<string, Uint8Array>;
}> {
  const tenderId = String(opts.tenderId ?? "").trim();
  if (!tenderId) throw new Error("INGEST_REQUIRES_TENDER_ID");
  const allIds: string[] = [];
  const bytesByDocumentId: Record<string, Uint8Array> = {};
  let state = getIngestState(tenderId);
  for (const f of opts.files) {
    const r = await retainOwnerFile({
      tenderId,
      originalFilename: f.name,
      bytes: f.bytes,
      originReference: f.originReference,
    });
    state = r.state;
    allIds.push(...r.documentIds);
    // Non-ZIP: one retained physical doc → same session bytes (LS persist strips bytes).
    if (!/\.zip$/i.test(f.name) && r.documentIds.length === 1) {
      bytesByDocumentId[r.documentIds[0]!] = f.bytes;
    }
  }
  if (!state) throw new Error("INGEST_STATE_MISSING");
  return { state, documentIds: allIds, bytesByDocumentId };
}

/** Browser FileList → registry (no silent truncation). */
export async function ingestOwnerBrowserFiles(
  tenderId: string,
  fileList: FileList | File[],
): Promise<{
  state: TenderIngestState;
  documentIds: string[];
  bytesByDocumentId: Record<string, Uint8Array>;
}> {
  const files = Array.from(fileList);
  const payloads: Array<{ name: string; bytes: Uint8Array }> = [];
  for (const file of files) {
    const ab = await file.arrayBuffer();
    payloads.push({ name: file.name, bytes: new Uint8Array(ab) });
  }
  return ingestOwnerFileList({ tenderId, files: payloads });
}
