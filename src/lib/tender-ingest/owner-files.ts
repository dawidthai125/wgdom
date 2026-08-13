/**
 * INGEST-01 — Owner multi-file / ZIP ingest (local registry; Cloud optional).
 */

import { retainOwnerFile, getIngestState } from "@/lib/tender-ingest/registry";
import type { TenderIngestState } from "@/lib/tender-ingest/types";

export async function ingestOwnerFileList(opts: {
  tenderId: string;
  files: Array<{ name: string; bytes: Uint8Array; originReference?: string }>;
}): Promise<{ state: TenderIngestState; documentIds: string[] }> {
  const tenderId = String(opts.tenderId ?? "").trim();
  if (!tenderId) throw new Error("INGEST_REQUIRES_TENDER_ID");
  const allIds: string[] = [];
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
  }
  if (!state) throw new Error("INGEST_STATE_MISSING");
  return { state, documentIds: allIds };
}

/** Browser FileList → registry (no silent truncation). */
export async function ingestOwnerBrowserFiles(
  tenderId: string,
  fileList: FileList | File[],
): Promise<{ state: TenderIngestState; documentIds: string[] }> {
  const files = Array.from(fileList);
  const payloads: Array<{ name: string; bytes: Uint8Array }> = [];
  for (const file of files) {
    const ab = await file.arrayBuffer();
    payloads.push({ name: file.name, bytes: new Uint8Array(ab) });
  }
  return ingestOwnerFileList({ tenderId, files: payloads });
}
