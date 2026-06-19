/**
 * TP192A benchmark — discoverTenderDocuments before/after host-detection shortcut.
 * BEFORE: prod edge bez TP192A (z pomiaru TP192).
 * AFTER:  lokalna symulacja (skip probe) + opcjonalnie live edge po deploy.
 *
 * node scripts/tp192a-bench-live.mjs
 */
import { shouldSkipReadmodelsProbe } from "../src/lib/tender-platform-adapters.ts";

const PROJECT = "bdpygdvfgbggermvqtys";
const SLUG = "make-server-0afb8820";
const BASE = `https://${PROJECT}.supabase.co/functions/v1/${SLUG}`;
const ANON =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcHlnZHZmZ2JnZ2VybXZxdHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjI5MjIsImV4cCI6MjA5NTgzODkyMn0.JAOCaduuxu10OH9W3wkshSXugkBYHUMjENJh0e91v2k";
const H = { apikey: ANON, Authorization: `Bearer ${ANON}` };
const TENDER_ID = "ocds-148610-17174c71-c6f1-45d6-b6b2-dab044dfb419";
const NOTICE = "2026/BZP 00268513/01";

const BEFORE_DOCUMENTS_MS = 8667;
const BEFORE_PROBE_50_MS = 3930;

async function fetchNoticeHtml() {
  const enc = encodeURIComponent(NOTICE);
  const res = await fetch(
    `https://ezamowienia.gov.pl/mo-board/api/v1/Board/GetNoticeHtmlBody?noticeNumber=${enc}`,
    { headers: { Accept: "application/json", "User-Agent": "WGDOM/2.63.0 TP192A" } },
  );
  if (!res.ok) return "";
  const raw = await res.text();
  return raw.startsWith('"') ? JSON.parse(raw) : raw;
}

async function timeProbe50(tenderId) {
  const t0 = performance.now();
  const base = "https://ezamowienia.gov.pl/mp-readmodels/api/Tender/DownloadDocument";
  let hits = 0;
  for (let i = 1; i <= 50; i++) {
    const documentId = `${tenderId}_${i}`;
    const url = `${base}/${encodeURIComponent(tenderId)}/${encodeURIComponent(documentId)}`;
    const res = await fetch(url, { method: "GET", headers: { "User-Agent": "WGDOM-TP192A" } });
    if (res.ok) {
      hits += 1;
      try {
        await res.body?.cancel();
      } catch {
        /* ignore */
      }
    }
  }
  return { ms: Math.round(performance.now() - t0), hits };
}

const html = await fetchNoticeHtml();
const skip = shouldSkipReadmodelsProbe(html);

const probe = await timeProbe50(TENDER_ID);

const docsT0 = performance.now();
const docsRes = await fetch(
  `${BASE}/tenders-bzp-documents?${new URLSearchParams({ tenderId: TENDER_ID, noticeNumber: NOTICE })}`,
  { headers: H },
);
const docsJson = await docsRes.json();
const liveDocumentsMs = Math.round(performance.now() - docsT0);

const projectedAfterMs = BEFORE_DOCUMENTS_MS - (skip ? probe.ms : 0);
const liveNote =
  liveDocumentsMs < BEFORE_DOCUMENTS_MS - 2000
    ? "live edge likely has TP192A"
    : "live edge may still be pre-TP192A (deploy pending)";

console.log(
  JSON.stringify(
    {
      tenderId: TENDER_ID,
      noticeNumber: NOTICE,
      transakcja: "1319989",
      html_chars: html.length,
      shouldSkipReadmodelsProbe: skip,
      probe_50_ms: probe.ms,
      probe_50_hits: probe.hits,
      BEFORE_documents_ms: BEFORE_DOCUMENTS_MS,
      BEFORE_probe_component_ms: BEFORE_PROBE_50_MS,
      live_documents_ms: liveDocumentsMs,
      live_doc_count: docsJson.count,
      live_doc_source: docsJson.source,
      projected_AFTER_documents_ms: projectedAfterMs,
      projected_DELTA_ms: BEFORE_DOCUMENTS_MS - projectedAfterMs,
      liveNote,
    },
    null,
    2,
  ),
);
