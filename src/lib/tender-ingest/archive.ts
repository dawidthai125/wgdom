/**
 * INGEST-01 — ZIP → archive + N child documents (never ZIP→single snapshot).
 */

import JSZip from "jszip";
import { classifyDocumentHint, isCostParseEligible } from "@/lib/tender-ingest/classify";
import { newArchiveId, newDocumentId, safeDisplayName, sha256Hex } from "@/lib/tender-ingest/hash";
import { assertZipEntrySafe } from "@/lib/tender-ingest/security";
import type {
  TenderArchiveRecord,
  TenderIngestDocument,
} from "@/lib/tender-ingest/types";

export interface ExpandZipResult {
  archive: TenderArchiveRecord;
  documents: TenderIngestDocument[];
  ok: boolean;
}

function guessMime(name: string): string {
  const n = name.toLowerCase();
  if (n.endsWith(".pdf")) return "application/pdf";
  if (n.endsWith(".ath") || n.endsWith(".nor") || n.endsWith(".xml")) return "application/xml";
  if (n.endsWith(".xlsx") || n.endsWith(".xls")) return "application/vnd.ms-excel";
  if (n.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  return "application/octet-stream";
}

export async function expandZipArchive(opts: {
  tenderId: string;
  originalFilename: string;
  bytes: Uint8Array;
  originReference?: string;
}): Promise<ExpandZipResult> {
  const tenderId = String(opts.tenderId ?? "").trim();
  const originalFilename = String(opts.originalFilename ?? "archive.zip");
  const archiveHash = await sha256Hex(opts.bytes);
  const archiveId = newArchiveId();
  const warnings: string[] = [];
  const documents: TenderIngestDocument[] = [];

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(opts.bytes);
  } catch {
    return {
      ok: false,
      archive: {
        archiveId,
        tenderId,
        originalFilename,
        contentHash: archiveHash,
        size: opts.bytes.byteLength,
        children: [],
        status: "corrupt",
        warnings: ["CORRUPT_ARCHIVE"],
      },
      documents: [],
    };
  }

  const entries = Object.values(zip.files).filter((f) => !f.dir);
  let totalUncompressed = 0;
  let entryCount = 0;

  for (const entry of entries) {
    entryCount += 1;
    const name = entry.name;
    // JSZip may not expose uncompressedSize until async; use _data when present
    const unc =
      typeof (entry as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize === "number"
        ? (entry as { _data: { uncompressedSize: number } })._data.uncompressedSize
        : 0;
    totalUncompressed += unc || 0;
    const bad = assertZipEntrySafe({
      name,
      uncompressedSize: unc || 0,
      entryCount,
      totalUncompressed: totalUncompressed || entryCount, // progressive; re-check after bytes
    });
    if (bad === "PATH_TRAVERSAL" || bad === "TOO_MANY_ENTRIES") {
      return {
        ok: false,
        archive: {
          archiveId,
          tenderId,
          originalFilename,
          contentHash: archiveHash,
          size: opts.bytes.byteLength,
          children: [],
          status: "rejected_unsafe",
          warnings: [bad],
        },
        documents: [],
      };
    }
  }

  totalUncompressed = 0;
  for (const entry of entries) {
    let bytes: Uint8Array;
    try {
      const ab = await entry.async("uint8array");
      bytes = ab;
    } catch {
      warnings.push(`ENTRY_READ_FAIL:${entry.name}`);
      continue;
    }
    totalUncompressed += bytes.byteLength;
    const bad = assertZipEntrySafe({
      name: entry.name,
      uncompressedSize: bytes.byteLength,
      entryCount: entries.length,
      totalUncompressed,
    });
    if (bad) {
      warnings.push(`${bad}:${entry.name}`);
      continue;
    }
    const base = safeDisplayName(entry.name);
    const contentHash = await sha256Hex(bytes);
    const documentId = newDocumentId();
    const classHint = classifyDocumentHint(base);
    documents.push({
      documentId,
      tenderId,
      source: "archive_inner",
      originalFilename: entry.name,
      displayName: base,
      contentHash,
      mimeType: guessMime(base),
      size: bytes.byteLength,
      originReference: opts.originReference,
      parentArchiveId: archiveId,
      ingestStatus: "retained",
      classHint,
      parseStatus: isCostParseEligible(base, classHint) ? "queued" : "skipped",
      bytes,
      warnings: [],
    });
  }

  const archive: TenderArchiveRecord = {
    archiveId,
    tenderId,
    originalFilename,
    contentHash: archiveHash,
    size: opts.bytes.byteLength,
    children: documents.map((d) => d.documentId),
    status: documents.length > 0 ? "ok" : "corrupt",
    warnings,
  };

  return { ok: documents.length > 0, archive, documents };
}
