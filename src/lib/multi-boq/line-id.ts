/**
 * MULTI-BOQ-01 — stable multi line identity (source-scoped).
 * Legacy buildOfferBoqLineId UNCHANGED. OfferBoq schema UNCHANGED.
 */

import { buildOfferBoqLineId } from "@/lib/tender-offer-boq";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";

function foldHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function foldContentHash(parts: string[]): string {
  return `ch_${foldHash(parts.join("|")).toString(16)}`;
}

/**
 * Multi-BOQ line identity: tender + dwelling + source document + source line.
 * Do NOT use global composed index.
 */
export function buildOfferBoqLineIdWithSource(opts: {
  tenderId: string;
  dwellingId: string;
  sourceDocumentId: string;
  sourceLineKey: string;
  lp: string;
  description: string;
  indexInSourceDoc: number;
}): string {
  const did = normalizeDwellingId(opts.dwellingId);
  const tid = String(opts.tenderId ?? "").trim() || "unknown";
  const doc = String(opts.sourceDocumentId ?? "").trim();
  if (!String(opts.dwellingId ?? "").trim() || !doc) {
    return buildOfferBoqLineId(
      tid,
      opts.lp,
      opts.description,
      opts.indexInSourceDoc,
    );
  }
  const base = [
    tid,
    did,
    doc,
    String(opts.sourceLineKey ?? "").trim(),
    String(opts.lp ?? ""),
    String(opts.description ?? "").trim().slice(0, 120),
    String(opts.indexInSourceDoc),
  ].join("|");
  return `obl_${foldHash(base).toString(16)}`;
}

export function buildSourceLineKey(
  lp: string,
  description: string,
  indexInSourceDoc: number,
): string {
  return `${String(lp ?? "").trim()}|${String(description ?? "").trim().slice(0, 120)}|${indexInSourceDoc}`;
}
