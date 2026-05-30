import type { TenderSwzAnalysis } from "@/lib/tenders-bzp-swz";
import { fmtPln } from "@/lib/tenders-bzp-swz";
import type { TenderPipelineItem } from "@/lib/tenders-bzp";
import { estimatedValuePlnFromItem } from "@/lib/tenders-bzp-fit";

export interface WadiumInfo {
  amountPln: number | null;
  raw: string | null;
  percentOfValue: number | null;
  referenceValuePln: number | null;
  exceedsProfileLimit: boolean;
  profileLimitPln: number;
  blocked: boolean;
  summary: string;
}

/** Wadium jako % wartości zamówienia (SWZ). */
export function extractWadiumPercent(text: string): number | null {
  const folded = text.replace(/\s+/g, " ");
  const patterns = [
    /wadium[^.]{0,120}?(\d+[,.]?\d*)\s*%\s*(?:warto|szacunk|zamówienia)/i,
    /(\d+[,.]?\d*)\s*%\s*[^.]{0,40}warto[^.]{0,40}zamówienia/i,
    /wysokość wadium[^.]{0,80}(\d+[,.]?\d*)\s*%/i,
  ];
  for (const p of patterns) {
    const m = folded.match(p);
    if (m?.[1]) {
      const n = parseFloat(m[1].replace(",", "."));
      if (Number.isFinite(n) && n > 0 && n <= 20) return n;
    }
  }
  return null;
}

export function resolveWadiumAmountPln(
  swz: TenderSwzAnalysis | null | undefined,
  referenceValuePln: number | null,
): number | null {
  if (swz?.wadiumPln != null) return swz.wadiumPln;
  const pct = swz?.wadiumPercent ?? extractWadiumPercent(`${swz?.wadiumRaw ?? ""} ${swz?.estimatedValueRaw ?? ""}`);
  if (pct != null && referenceValuePln != null) {
    return Math.round(referenceValuePln * pct / 100);
  }
  return null;
}

export function computeWadiumInfo(
  item: TenderPipelineItem,
  swz: TenderSwzAnalysis | null | undefined,
  profileMaxWadiumPln: number,
): WadiumInfo {
  const referenceValuePln = estimatedValuePlnFromItem(item, swz ?? null);
  const percentOfValue = swz?.wadiumPercent
    ?? extractWadiumPercent(`${swz?.wadiumRaw ?? ""} ${item.noticeHtml ? "" : ""}`);
  const amountPln = resolveWadiumAmountPln(swz, referenceValuePln);
  const raw = swz?.wadiumRaw ?? null;
  const exceedsProfileLimit = amountPln != null && amountPln > profileMaxWadiumPln;
  const blocked = exceedsProfileLimit;

  let summary = raw || (amountPln != null ? fmtPln(amountPln) : "Brak danych");
  if (percentOfValue != null && referenceValuePln != null) {
    summary += ` (${percentOfValue}% z ${fmtPln(referenceValuePln)})`;
  }
  if (blocked) {
    summary += ` — przekracza limit ${fmtPln(profileMaxWadiumPln)}`;
  }

  return {
    amountPln,
    raw,
    percentOfValue,
    referenceValuePln,
    exceedsProfileLimit,
    profileLimitPln: profileMaxWadiumPln,
    blocked,
    summary,
  };
}
