/**
 * IK-KNR Phase 2D — PDF text extraction for L3 discovery (no OCR).
 * REUSE tenders pdf.js path · fail-closed when no text layer / scan.
 */

import { extractPdfText } from "@/lib/tenders-bzp-doc-parse";

export type KnrDiscoveryPdfTextMeta = {
  sourceId: string | null;
  contentType: string;
  byteLength: number;
  pageCount: number | null;
  textLength: number;
};

export type KnrDiscoveryPdfTextOk = {
  ok: true;
  text: string;
  meta: KnrDiscoveryPdfTextMeta;
};

export type KnrDiscoveryPdfTextFail = {
  ok: false;
  reason: "PDF_TEXT_UNAVAILABLE" | "PDF_EXTRACT_ERROR" | "EMPTY_BYTES";
  meta: KnrDiscoveryPdfTextMeta;
};

export type KnrDiscoveryPdfTextResult = KnrDiscoveryPdfTextOk | KnrDiscoveryPdfTextFail;

export type KnrDiscoveryPdfTextExtractFn = (
  bytes: Uint8Array,
) => Promise<{ text: string; pageCount: number; noTextLayer: boolean; extractError: boolean }>;

const MIN_EXTRACTABLE_CHARS = 40;

/**
 * Extract plain text from PDF bytes. No OCR. Scans → PDF_TEXT_UNAVAILABLE.
 */
export async function extractKnrDiscoveryPdfTextFromBytes(
  bytes: Uint8Array,
  options: {
    sourceId?: string | null;
    contentType?: string;
    extractFn?: KnrDiscoveryPdfTextExtractFn;
  } = {},
): Promise<KnrDiscoveryPdfTextResult> {
  const contentType = options.contentType ?? "application/pdf";
  const sourceId = options.sourceId ?? null;
  const byteLength = bytes?.byteLength ?? 0;
  const baseMeta: KnrDiscoveryPdfTextMeta = {
    sourceId,
    contentType,
    byteLength,
    pageCount: null,
    textLength: 0,
  };

  if (!bytes || byteLength === 0) {
    return { ok: false, reason: "EMPTY_BYTES", meta: baseMeta };
  }

  try {
    const extractFn = options.extractFn
      ?? (async (b: Uint8Array) => {
        const r = await extractPdfText(b);
        return {
          text: r.text ?? "",
          pageCount: r.pageCount,
          noTextLayer: r.noTextLayer || r.likelyScan,
          extractError: r.extractError,
        };
      });

    const raw = await extractFn(bytes);
    const text = String(raw.text ?? "").replace(/\u0000/g, "").trim();
    const textLength = text.replace(/\s+/g, "").length;
    const meta: KnrDiscoveryPdfTextMeta = {
      ...baseMeta,
      pageCount: typeof raw.pageCount === "number" ? raw.pageCount : null,
      textLength,
    };

    if (raw.extractError) {
      return { ok: false, reason: "PDF_EXTRACT_ERROR", meta };
    }
    if (raw.noTextLayer || textLength < MIN_EXTRACTABLE_CHARS) {
      return { ok: false, reason: "PDF_TEXT_UNAVAILABLE", meta };
    }

    return { ok: true, text, meta };
  } catch {
    return {
      ok: false,
      reason: "PDF_EXTRACT_ERROR",
      meta: baseMeta,
    };
  }
}

export const KNR_DISCOVERY_PDF_TEXT_P2D_IMPLEMENTED = true as const;
