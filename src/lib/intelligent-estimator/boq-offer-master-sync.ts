/**
 * IK P0-2 P7-SYNC — synchronize OfferBoq.lines with Document Expert master lines
 * after S2/S3 enrichment (same line objects by lineId; no second S2/S3 run).
 */

import type { OfferBoqDocument, OfferBoqLine } from "@/lib/tender-offer-boq";
import type { TenderPackage } from "@/lib/multi-dwelling/types";
import { normalizeDwellingId } from "@/lib/multi-dwelling/constants";

/** Structural master-line ref — avoids circular import with ik-document-expert. */
export type MasterBoqLineRefLike = {
  dwellingId: string;
  line: OfferBoqLine;
};

/**
 * Replace offerBoq.lines with enriched master line objects matched by lineId.
 * Unmatched offer lines keep prior references (backward compatible).
 * Does not mutate line.quantity; does not re-run S2/S3.
 */
export function synchronizeOfferBoqFromMasterLines(
  offerBoq: OfferBoqDocument | null | undefined,
  masterBoqLines: readonly MasterBoqLineRefLike[],
  opts?: { dwellingId?: string | null },
): OfferBoqDocument | null {
  if (!offerBoq) return null;
  const lines = offerBoq.lines ?? [];
  if (!lines.length || !masterBoqLines.length) return offerBoq;

  const dwellingFilter = opts?.dwellingId != null && String(opts.dwellingId).trim()
    ? normalizeDwellingId(opts.dwellingId)
    : null;

  const byLineId = new Map<string, OfferBoqLine>();
  for (const ref of masterBoqLines) {
    if (dwellingFilter) {
      const refDw = normalizeDwellingId(ref.dwellingId);
      if (refDw !== dwellingFilter) continue;
    }
    const id = String(ref.line?.lineId ?? "").trim();
    if (!id) continue;
    byLineId.set(id, ref.line);
  }

  if (byLineId.size === 0) return offerBoq;

  let changed = false;
  const nextLines = lines.map((line) => {
    const id = String(line.lineId ?? "").trim();
    const enriched = id ? byLineId.get(id) : undefined;
    if (enriched && enriched !== line) {
      changed = true;
      return enriched;
    }
    return line;
  });

  if (!changed) return offerBoq;
  return { ...offerBoq, lines: nextLines };
}

/**
 * Per-dwelling OfferBoq sync for multi_package evaluation (P7).
 * Returns a shallow-cloned package with synced dwelling.offerBoq documents.
 */
export function synchronizePackageOfferBoqsFromMasterLines(
  pkg: TenderPackage,
  masterBoqLines: readonly MasterBoqLineRefLike[],
): TenderPackage {
  if (!masterBoqLines.length) return pkg;
  const dwellings = pkg.dwellings.map((d) => {
    if (!d.offerBoq?.lines?.length) return d;
    const synced = synchronizeOfferBoqFromMasterLines(d.offerBoq, masterBoqLines, {
      dwellingId: d.dwellingId,
    });
    if (!synced || synced === d.offerBoq) return d;
    return { ...d, offerBoq: synced };
  });
  return { ...pkg, dwellings };
}
