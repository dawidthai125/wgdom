/**
 * READ ONLY — audyt WM Works 120d: score/excluded/powód
 * npx vite-node scripts/audit-wm-exclude-120d.mjs
 */
import { loadEnv } from "vite";
import { scoreTenderNotice } from "../src/lib/tenders-bzp.ts";
import {
  isExcludedTenderTitle,
  matchesTenderExcludeKeyword,
  TENDER_EXCLUDE_KEYWORDS,
} from "../src/lib/tenders-bzp-keywords.ts";
import { matchesStrategicClientFilter } from "../src/lib/tenders-strategic-client-filters.ts";

const BZP = "https://ezamowienia.gov.pl/mo-board/api/v1/Board/Search";
const pubFrom = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10);

function explainExclude(title) {
  const t = title.toLowerCase();
  for (const kw of TENDER_EXCLUDE_KEYWORDS) {
    if (matchesTenderExcludeKeyword(t, kw)) return `TENDER_EXCLUDE_KEYWORDS: "${kw}"`;
  }
  if (isExcludedTenderTitle(t)) return "isNewConstructionTitle (budowa bez sygnału remontu)";
  return null;
}

function isOpen(iso) {
  if (!iso) return false;
  return new Date(iso).getTime() > Date.now();
}

const rows = [];
for (let page = 1; page <= 5; page++) {
  const q = new URLSearchParams({
    noticeType: "ContractNotice",
    orderType: "Works",
    organizationName: "Wrocławskie Mieszkania",
    SortingColumnName: "PublicationDate",
    SortingDirection: "DESC",
    PageNumber: String(page),
    PageSize: "50",
    publicationDateFrom: pubFrom,
  });
  const res = await fetch(`${BZP}?${q}`, { headers: { Accept: "application/json" } });
  const batch = await res.json();
  const list = Array.isArray(batch) ? batch : (batch?.items ?? []);
  rows.push(...list);
  if (list.length < 50) break;
}

console.log(`=== WM Works audit (120d) — ${rows.length} ogłoszeń BZP ===\n`);

let recovered = 0;
for (const r of rows) {
  const item = {
    organizationName: r.organizationName,
    title: r.orderObject,
    organizationCity: r.organizationCity,
    priorityBuyerId: null,
    priorityBuyerLabel: null,
  };
  if (!matchesStrategicClientFilter(item, "wm")) continue;
  const scored = scoreTenderNotice(r, { priorityOrg: true });
  const reason = scored.excluded ? explainExclude(r.orderObject || "") : null;
  const open = isOpen(r.submittingOffersDate);
  if (open && !scored.excluded) recovered += 1;
  console.log({
    open,
    bzp: r.bzpNumber,
    deadline: r.submittingOffersDate?.slice(0, 10),
    score: scored.score,
    excluded: scored.excluded,
    reason: reason ?? (scored.score <= 0 ? "brak sygnału remontu" : "OK"),
    title: (r.orderObject || "").slice(0, 70),
  });
}

console.log(`\nAktywne WM Works odzyskane (open + !excluded): ${recovered}`);
