/**
 * P3-AUDIT-001-FIX-C — regresja cache + lazy dossier helpers.
 * npx vite-node scripts/test-p3-fix-c-performance.mjs
 */
import {
  clearTenderDocumentBytesCache,
  getTenderDocumentBytesCached,
  setTenderDocumentBytesCached,
  tenderDocumentBytesCacheKey,
  tenderDocumentBytesCacheSize,
} from "../src/lib/tender-document-bytes-cache.ts";
import {
  getTenderPipelineMetrics,
  recordTenderDocumentFetch,
  recordTenderZipLoad,
  resetTenderPipelineMetrics,
} from "../src/lib/tender-pipeline-metrics.ts";
import {
  analyzeSwzFromNoticeHtmlOnly,
  tenderDossierHeavyParseDone,
} from "../src/lib/tender-dossier-pipeline.ts";

const assert = (name, cond) => {
  if (!cond) throw new Error(`FAIL: ${name}`);
  console.log(`  ✓ ${name}`);
};
const assertEq = (name, a, b) => assert(name, a === b);

console.log("P3-AUDIT-001-FIX-C — performance regression\n");

// —— bytes cache ——
clearTenderDocumentBytesCache();
const key = tenderDocumentBytesCacheKey("t-1", 2, "https://x/doc.pdf");
assertEq("cache empty", tenderDocumentBytesCacheSize(), 0);
setTenderDocumentBytesCached(key, { base64: "YWJj", filename: "a.pdf", contentType: "application/pdf" });
assert("bytes cache hit", getTenderDocumentBytesCached(key)?.filename === "a.pdf");
resetTenderPipelineMetrics();
recordTenderDocumentFetch();
assertEq("metrics fetch", getTenderPipelineMetrics().fetchBytes, 1);

resetTenderPipelineMetrics();
recordTenderZipLoad();
assertEq("metrics zip load", getTenderPipelineMetrics().zipLoad, 1);

// —— lazy dossier guard ——
assert("null dossier not heavy", !tenderDossierHeavyParseDone(null));
assert("brief-only not heavy", !tenderDossierHeavyParseDone({ brief: { fields: [] }, kosztorys: null, builtAt: "x" }));
assert(
  "kosztorys ok is heavy",
  tenderDossierHeavyParseDone({
    brief: { fields: [] },
    kosztorys: { ok: true, sourceFilename: "a.ath", rows: [], rowCount: 0, catalogQuantities: [] },
    builtAt: "x",
  }),
);

// —— light SWZ from HTML ——
const html = `<html><body>
Postępowanie na remont budynku. Wadium wynosi 50 000 PLN zgodnie z SWZ.
Kryterium oceny ofert: cena 60%, termin realizacji 40%.
Termin realizacji zamówienia: 90 dni od podpisania umowy.
Szacunkowa wartość zamówienia: 1 250 000 PLN brutto.
</body></html>`;
const light = analyzeSwzFromNoticeHtmlOnly(html, null);
assert("light HTML SWZ returns analysis", light != null);

console.log("\nP3-FIX-C performance: ALL PASS");
