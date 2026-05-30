import { API_BASE, API_HEADERS } from "@/lib/cloud-sync";
import { stripHtmlToText } from "@/lib/tenders-bzp-swz";

export interface TenderAwardResult {
  winnerName: string | null;
  awardValuePln: number | null;
  awardValueRaw: string | null;
  contractDate: string | null;
  resultNoticeNumber: string | null;
  fetchedAt: string;
  isUs: boolean;
  source: "html" | "bzp_search";
}

function parsePln(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/([\d\s]+(?:[.,]\d{1,2})?)\s*(?:zł|PLN)?/i);
  if (!m) return null;
  const n = parseFloat(m[1].replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
}

const US_RE = /w\s*&\s*g|wgdom|wg\s*dom|schabowska|wałek|walek/i;

/** Parsuje ogłoszenie o wyniku postępowania (HTML / tekst BZP). */
export function parseAwardResultFromText(
  text: string,
  opts?: { resultNoticeNumber?: string; source?: TenderAwardResult["source"] },
): TenderAwardResult | null {
  const folded = text.replace(/\s+/g, " ");
  const winnerMatch = folded.match(
    /wykonawcy,?\s*któremu udzielono(?:\s+zamówienia)?[:\s]+([^(\n]{4,140}?)(?:\(|,|\d{2}-\d{2}-\d{4}|$)/i,
  ) || folded.match(
    /nazwa\s*\(?\s*firmy\s*\)?\s*wykonawcy[^:]{0,40}[:\s]+([^(\n]{4,140}?)(?:\(|,|\d{2}-\d{2}-\d{4}|$)/i,
  ) || folded.match(
    /wybrano ofertę[^:]{0,20}[:\s]+([^(\n]{4,120})/i,
  );
  const winnerName = winnerMatch?.[1]?.replace(/\s+/g, " ").trim() ?? null;
  if (!winnerName || winnerName.length < 4) return null;

  const valueMatch = folded.match(
    /(?:cena|wartość)\s+oferty[^:]{0,30}[:\s]+([\d\s.,]+)\s*(?:zł|PLN)/i,
  ) || folded.match(
    /(?:kwota|wartość)\s+(?:umowy|zamówienia)[^:]{0,30}[:\s]+([\d\s.,]+)\s*(?:zł|PLN)/i,
  );
  const awardValueRaw = valueMatch?.[1]?.trim() ?? null;
  const awardValuePln = parsePln(awardValueRaw);

  const dateMatch = folded.match(/data zawarcia umowy[:\s]+(\d{2}-\d{2}-\d{4})/i)
    || folded.match(/(\d{2}-\d{2}-\d{4})/);
  const contractDate = dateMatch?.[1] ?? null;

  return {
    winnerName,
    awardValuePln,
    awardValueRaw: awardValueRaw ? `${awardValueRaw} zł` : null,
    contractDate,
    resultNoticeNumber: opts?.resultNoticeNumber ?? null,
    fetchedAt: new Date().toISOString(),
    isUs: US_RE.test(winnerName),
    source: opts?.source ?? "html",
  };
}

export function parseAwardResultFromHtml(
  html: string,
  opts?: { resultNoticeNumber?: string; source?: TenderAwardResult["source"] },
): TenderAwardResult | null {
  return parseAwardResultFromText(stripHtmlToText(html), opts);
}

export async function fetchTenderAwardResult(opts: {
  bzpNumber?: string;
  moIdentifier?: string;
  noticeHtml?: string | null;
}): Promise<TenderAwardResult | null> {
  if (opts.noticeHtml) {
    const fromHtml = parseAwardResultFromHtml(opts.noticeHtml, { source: "html" });
    if (fromHtml) return fromHtml;
  }
  if (!API_BASE) return null;
  const q = new URLSearchParams();
  if (opts.bzpNumber) q.set("bzpNumber", opts.bzpNumber);
  if (opts.moIdentifier) q.set("moIdentifier", opts.moIdentifier);
  const res = await fetch(`${API_BASE}/tenders-bzp-award-result?${q}`, { headers: API_HEADERS });
  const data = await res.json().catch(() => ({})) as { ok?: boolean; result?: TenderAwardResult | null };
  if (!res.ok || !data.ok) return null;
  return data.result ?? null;
}
