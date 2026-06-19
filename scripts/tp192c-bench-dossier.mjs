/**
 * TP192C benchmark — buildTenderDossierHeavy (live network).
 * npx vite-node scripts/tp192c-bench-dossier.mjs
 */
import { buildTenderDossierHeavy } from "../src/lib/tender-dossier-pipeline.ts";
import { getTenderPipelineMetrics, resetTenderPipelineMetrics } from "../src/lib/tender-pipeline-metrics.ts";
import { clearTenderDocumentBytesCache } from "../src/lib/tender-document-bytes-cache.ts";

const ANON =
  process.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkcHlnZHZmZ2JnZ2VybXZxdHlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNjI5MjIsImV4cCI6MjA5NTgzODkyMn0.JAOCaduuxu10OH9W3wkshSXugkBYHUMjENJh0e91v2k";
const BASE = "https://bdpygdvfgbggermvqtys.supabase.co/functions/v1/make-server-0afb8820";
const H = { apikey: ANON, Authorization: `Bearer ${ANON}` };
const T = "ocds-148610-17174c71-c6f1-45d6-b6b2-dab044dfb419";
const N = "2026/BZP 00268513/01";

const BEFORE_TP192_AUDIT_MS = 11247;

const docsRes = await fetch(
  `${BASE}/tenders-bzp-documents?${new URLSearchParams({ tenderId: T, noticeNumber: N })}`,
  { headers: H },
);
const docsJson = await docsRes.json();
const docs = docsJson.documents || [];

clearTenderDocumentBytesCache();
resetTenderPipelineMetrics();
const t0 = performance.now();
const built = await buildTenderDossierHeavy({
  item: { tenderId: T, title: "bench", ourEstimatePln: null, uploadedFile: undefined },
  docs,
  noticeHtml: null,
  existingSwz: null,
  existingDossier: null,
  athPreviewEnabled: false,
});
const ms = Math.round(performance.now() - t0);
const metrics = getTenderPipelineMetrics();

console.log(
  JSON.stringify(
    {
      doc_count: docs.length,
      BEFORE_tp192_bytes_sequential_ms: BEFORE_TP192_AUDIT_MS,
      dossier_heavy_ms: ms,
      fetch_bytes_calls: metrics.fetchBytes,
      zip_load_calls: metrics.zipLoad,
      scanned: built.tenderDossier.scanSummary?.scanned,
      parsed: built.tenderDossier.scanSummary?.parsed,
      kosztorysFound: built.tenderDossier.scanSummary?.kosztorysFound,
      criteriaFound: built.tenderDossier.scanSummary?.criteriaFound,
    },
    null,
    2,
  ),
);
