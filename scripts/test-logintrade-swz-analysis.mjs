/**
 * Logintrade SWZ analysis pipeline — testy regresji bugfix.
 * npx vite-node scripts/test-logintrade-swz-analysis.mjs
 */
import {
  resolveTenderDocumentDownload,
  loadTenderBzpDocumentBytes,
} from "../src/lib/tenders-bzp.ts";
import {
  pickBestSwzDocumentForAnalysis,
  scoreTenderFilename,
} from "../src/lib/tenders-bzp-filename.ts";
import {
  parseWadiumFromSwzText,
  parseSwzPlainText,
  isWeakWadiumRaw,
  pickBetterWadiumPln,
} from "../src/lib/tenders-bzp-swz.ts";
import { mergeSwzAnalysis } from "../src/lib/tender-document-resolver.ts";
import {
  traceSwzPipeline,
  getSwzTraceLog,
  clearSwzTraceLog,
} from "../src/lib/tender-swz-trace.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

// document download — resolve Logintrade URL
const ltDocs = [
  {
    index: 1,
    documentId: "logintrade_1",
    filename: "SWZ.pdf",
    contentType: "application/pdf",
    downloadUrl: "https://example.logintrade.net/DocumentService,getAttachmentUnlogged,abc",
    isSwzHint: true,
    platform: "logintrade",
  },
  {
    index: 2,
    documentId: "logintrade_2",
    filename: "2026_06_01_modyfik_SWZ.pdf",
    contentType: "application/pdf",
    downloadUrl: "https://example.logintrade.net/DocumentService,getAttachmentUnlogged,def",
    isSwzHint: true,
    platform: "logintrade",
  },
];

const resolved = resolveTenderDocumentDownload(ltDocs, 2);
assert("document download url resolved", resolved?.downloadUrl?.includes("logintrade"));
assert("document download platform", resolved?.platform === "logintrade");

// pick best SWZ — modyfikacja > SWZ
const best = pickBestSwzDocumentForAnalysis(ltDocs);
assert("pick modyfikacja swz", best?.filename.includes("modyfik"));
assert("modyfikacja scores higher", scoreTenderFilename("2026_modyfik_SWZ.pdf") > scoreTenderFilename("SWZ.pdf"));

// wadium extraction — nie „Tak 6”
const w1 = parseWadiumFromSwzText(
  "Wadium wymagane: Tak, w wysokości 6% wartości zamówienia",
  "Tak, w wysokości 6% wartości zamówienia",
  1_000_000,
);
assert("wadium percent not 6 pln", w1.wadiumPln === 60_000);
assert("wadium not raw tak 6", !/^tak\s*6$/i.test(w1.wadiumRaw ?? ""));

const w2 = parseWadiumFromSwzText(
  "Wysokość wadium: 6 000,00 zł",
  "6 000,00 zł",
  null,
);
assert("wadium absolute 6000", w2.wadiumPln === 6000);

const w3 = parseWadiumFromSwzText("Wadium: Tak", "Tak", null);
assert("wadium tak only rejected", w3.wadiumPln == null && w3.wadiumRaw == null);

// full parse — wartość + wadium
const swzText = `
Wartość zamówienia: 1 250 000,00 zł
Wysokość wadium: 6% wartości zamówienia
Termin realizacji: 120 dni
`;
const parsed = parseSwzPlainText(swzText, { source: "pdf" });
assert("pdf analysis value", parsed.estimatedValuePln === 1_250_000);
assert("pdf analysis wadium from pct", parsed.wadiumPln === 75_000);

// metadata persistence — merge prefers PDF over weak HTML
const htmlSwz = parseSwzPlainText("Wadium: Tak, 6", { source: "html" });
const pdfSwz = parseSwzPlainText(swzText, { source: "pdf" });
const merged = mergeSwzAnalysis(htmlSwz, pdfSwz);
assert("metadata persistence value", merged?.estimatedValuePln === 1_250_000);
assert("metadata persistence wadium", merged?.wadiumPln === 75_000);
assert("weak wadium raw replaced", !isWeakWadiumRaw(merged?.wadiumRaw));

assert("pickBetterWadiumPln", pickBetterWadiumPln(6, 75_000) === 75_000);

// trace pipeline steps
clearSwzTraceLog();
traceSwzPipeline("document_download", { bytes: 1024 });
traceSwzPipeline("pdf_parsed", { textLength: 5000 });
traceSwzPipeline("metadata_extracted", { wadiumPln: 6000 });
traceSwzPipeline("tender_updated", { ok: true });
const log = getSwzTraceLog();
assert("trace has 4 steps", log.length === 4);
assert("trace download step", log.some((e) => e.step === "document_download"));

// loadTenderBzpDocumentBytes accepts downloadUrl param (signature)
assert("loadTenderBzpDocumentBytes arity", loadTenderBzpDocumentBytes.length >= 2);

console.log("\nSUMMARY:", { pass, fail });
process.exit(fail > 0 ? 1 : 0);
