/**
 * OD-OCR-18 — Owner ingest parse seam with C2 Intra-PDF CONNECT.
 * REUSE processIngestParseBatch + parseDocumentToKosztorys({ intraPdfDerived }).
 * parentDocumentId = retained physical P.documentId (never filename / index).
 */

import { isCostParseEligible } from "@/lib/tender-ingest/classify";
import { processIngestParseBatch } from "@/lib/tender-ingest/queue";
import { getIngestState } from "@/lib/tender-ingest/registry";
import type { TenderIngestState } from "@/lib/tender-ingest/types";
import { athPreviewToSnapshot } from "@/lib/tenders-bzp-brief";
import type { AthPreviewResult } from "@/lib/ath-parser";

const MAX_DOCS = 64;

export type OwnerIngestC2ParseFn = (
  bytes: Uint8Array,
  filename: string,
  opts?: {
    forcePdfPrzedmiar?: boolean;
    intraPdfDerived?: {
      tenderId: string;
      parentDocumentId: string;
      parentDisplayName?: string;
    };
  },
) => Promise<AthPreviewResult | null>;

/**
 * After retainOwnerFile / ingestOwnerBrowserFiles: parse each queued physical COST doc
 * with C2 opts bound to that doc's documentId (closure; IngestParseFn signature unchanged).
 */
export async function runOwnerIngestParseWithIntraPdfC2(opts: {
  tenderId: string;
  /** Required for real parse — LS persist strips document bytes after retain. */
  bytesByDocumentId?: Record<string, Uint8Array>;
  /** Test inject only — production uses real parseDocumentToKosztorys. */
  parseDocumentToKosztorys?: OwnerIngestC2ParseFn;
}): Promise<TenderIngestState> {
  const tenderId = String(opts.tenderId ?? "").trim();
  if (!tenderId) throw new Error("MISSING_TENDER_ID");

  let state = getIngestState(tenderId);
  if (!state) throw new Error("INGEST_STATE_MISSING");

  for (let i = 0; i < MAX_DOCS; i++) {
    state = getIngestState(tenderId);
    if (!state) throw new Error("INGEST_STATE_MISSING");

    const next = state.documents.find(
      (d) =>
        d.ingestStatus === "retained"
        && d.parseStatus === "queued"
        && d.source !== "derived_cost_segment"
        && isCostParseEligible(d.displayName || d.originalFilename, d.classHint)
        && !state!.skippedDocumentIds.includes(d.documentId),
    );
    if (!next) break;

    const parentDocumentId = next.documentId;

    state = await processIngestParseBatch({
      tenderId,
      batchSize: 1,
      bytesByDocumentId: opts.bytesByDocumentId,
      parseFn: async (bytes, filename) => {
        const parseImpl =
          opts.parseDocumentToKosztorys
          ?? (await import("@/lib/tenders-bzp-doc-parse")).parseDocumentToKosztorys;
        const preview = await parseImpl(bytes, filename, {
          forcePdfPrzedmiar: true,
          intraPdfDerived: {
            tenderId,
            parentDocumentId,
            parentDisplayName: filename,
          },
        });
        if (!preview) return null;
        return athPreviewToSnapshot(preview, filename);
      },
    });
  }

  const final = getIngestState(tenderId);
  if (!final) throw new Error("INGEST_STATE_MISSING");
  return final;
}
