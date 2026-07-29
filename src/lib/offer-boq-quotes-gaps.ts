/**
 * CENY-MATERIAŁÓW-01 · CM-2 — braki marketQuotes dla prac zmapowanych w OfferBoq (pure).
 * REUSE Work Catalog · bez I/O · bez zmiany providerów.
 */

import type { OfferBoqDocument } from "@/lib/tender-offer-boq";
import type { CatalogWork } from "@/lib/work-catalog/types";

export interface OfferBoqQuotesGapRow {
  workId: string;
  namePl: string;
  matchedLineCount: number;
}

export interface OfferBoqQuotesGapsSummary {
  matchedWorkCount: number;
  missingQuotesCount: number;
  rows: OfferBoqQuotesGapRow[];
}

function workHasMarketQuotePrice(work: CatalogWork): boolean {
  const quotes = work.marketQuotes;
  if (!quotes) return false;
  for (const byRegion of Object.values(quotes)) {
    if (!byRegion || typeof byRegion !== "object") continue;
    for (const snap of Object.values(byRegion)) {
      if (!snap || typeof snap !== "object") continue;
      const price = (snap as { price?: number }).price;
      if (typeof price === "number" && Number.isFinite(price) && price > 0) return true;
    }
  }
  return false;
}

/**
 * Lista prac z `catalogWorkId` w OfferBoq, które nie mają żadnej ceny w marketQuotes.
 * Ops path: uzupełnij Quotes (P3.3 CSV) → controlled_market może trafić.
 */
export function computeOfferBoqQuotesGaps(
  doc: OfferBoqDocument | null | undefined,
  works: readonly CatalogWork[],
): OfferBoqQuotesGapsSummary {
  const byId = new Map(works.map((w) => [w.id, w]));
  const counts = new Map<string, number>();
  for (const line of doc?.lines ?? []) {
    const id = line.catalogWorkId;
    if (!id) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  const rows: OfferBoqQuotesGapRow[] = [];
  for (const [workId, matchedLineCount] of counts) {
    const work = byId.get(workId);
    if (!work) {
      rows.push({
        workId,
        namePl: workId,
        matchedLineCount,
      });
      continue;
    }
    if (workHasMarketQuotePrice(work)) continue;
    rows.push({
      workId,
      namePl: work.namePl,
      matchedLineCount,
    });
  }

  rows.sort((a, b) => b.matchedLineCount - a.matchedLineCount || a.workId.localeCompare(b.workId, "pl"));

  return {
    matchedWorkCount: counts.size,
    missingQuotesCount: rows.length,
    rows,
  };
}
