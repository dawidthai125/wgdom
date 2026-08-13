/**
 * MULTI-DWELLING-01 — multi-mode line identity (dwelling-scoped hash).
 * Legacy buildOfferBoqLineId stays UNCHANGED in tender-offer-boq.ts.
 */

import {
  buildOfferBoqLineId,
  type OfferBoqDocument,
} from "@/lib/tender-offer-boq";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";

/** Same FNV-style fold as tender-offer-boq (local copy — no OfferBoq schema edit). */
function foldHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Multi-mode line identity MUST include dwellingId.
 * Do not use for legacy_single (use buildOfferBoqLineId).
 */
export function buildOfferBoqLineIdWithDwelling(
  tenderId: string,
  dwellingId: string,
  lp: string,
  description: string,
  index: number,
): string {
  const did = normalizeDwellingId(dwellingId);
  if (!String(dwellingId ?? "").trim()) {
    return buildOfferBoqLineId(tenderId, lp, description, index);
  }
  const base = `${tenderId}|${did}|${lp}|${description.trim().slice(0, 120)}|${index}`;
  return `obl_${foldHash(base).toString(16)}`;
}

/** Stamp dwelling-scoped lineIds onto an OfferBoq (no schema bump). */
export function stampDwellingLineIdsOnOfferBoq(
  doc: OfferBoqDocument,
  dwellingId: string,
): OfferBoqDocument {
  const did = String(dwellingId ?? "").trim();
  if (!did) return doc;
  const tenderId = String(doc.tenderId ?? "").trim() || "unknown";
  return {
    ...doc,
    lines: (doc.lines ?? []).map((l, index) => ({
      ...l,
      lineId: buildOfferBoqLineIdWithDwelling(
        tenderId,
        did,
        l.lp ?? "",
        l.description ?? "",
        index,
      ),
    })),
  };
}
