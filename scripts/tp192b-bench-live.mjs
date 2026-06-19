/**
 * TP192B benchmark — discoverTenderDocuments (PZ parallel probe).
 * npx vite-node scripts/tp192b-bench-live.mjs
 */
const PROJECT = "bdpygdvfgbggermvqtys";
const SLUG = "make-server-0afb8820";
const BASE = `https://${PROJECT}.supabase.co/functions/v1/${SLUG}`;
const ANON =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcHlnZHZmZ2JnZ2VybXZxdHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjI5MjIsImV4cCI6MjA5NTgzODkyMn0.JAOCaduuxu10OH9W3wkshSXugkBYHUMjENJh0e91v2k";
const H = { apikey: ANON, Authorization: `Bearer ${ANON}` };
const TENDER_ID = "ocds-148610-17174c71-c6f1-45d6-b6b2-dab044dfb419";
const NOTICE = "2026/BZP 00268513/01";

const BEFORE_TP192A_MS = 8667;
const AFTER_TP192A_MS = 4436;

const t0 = performance.now();
const res = await fetch(
  `${BASE}/tenders-bzp-documents?${new URLSearchParams({ tenderId: TENDER_ID, noticeNumber: NOTICE })}`,
  { headers: H },
);
const json = await res.json();
const liveMs = Math.round(performance.now() - t0);

console.log(
  JSON.stringify(
    {
      tenderId: TENDER_ID,
      noticeNumber: NOTICE,
      transakcja: "1319989",
      BEFORE_tp192_full_ms: BEFORE_TP192A_MS,
      AFTER_tp192a_ms: AFTER_TP192A_MS,
      live_documents_ms: liveMs,
      delta_vs_tp192a_ms: liveMs - AFTER_TP192A_MS,
      delta_vs_tp192_full_ms: liveMs - BEFORE_TP192A_MS,
      doc_count: json.count,
      source: json.source,
      ok: json.ok,
    },
    null,
    2,
  ),
);
