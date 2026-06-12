import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { parseSwzPlainText, extractTableHints } from "@/lib/tenders-bzp-swz";
import { extractAwardCriteria } from "@/lib/tenders-bzp-fit";
import { extractWadiumPercent } from "@/lib/tenders-wadium";

export function enrichSwzFromText(
  text: string,
  base: TenderSwzAnalysis,
): TenderSwzAnalysis {
  const awardCriteria = extractAwardCriteria(text);
  const wadiumPercent = extractWadiumPercent(text);
  let wadiumPln = base.wadiumPln;
  if (wadiumPln == null && wadiumPercent != null && base.estimatedValuePln != null) {
    wadiumPln = Math.round(base.estimatedValuePln * wadiumPercent / 100);
  }
  return {
    ...base,
    awardCriteria: awardCriteria.length > 0 ? awardCriteria : base.awardCriteria,
    wadiumPercent: wadiumPercent ?? base.wadiumPercent,
    wadiumPln,
    tableExtracts: base.tableExtracts.length > 0 ? base.tableExtracts : extractTableHints(text),
  };
}

export function enrichSwzFromPlainText(
  text: string,
  opts?: { source?: TenderSwzAnalysis["source"]; sourceFilename?: string; ourEstimatePln?: number | null },
): TenderSwzAnalysis | null {
  if (!text || text.replace(/\s/g, "").length < 80) return null;
  const base = parseSwzPlainText(text, opts);
  return enrichSwzFromText(text, base);
}
