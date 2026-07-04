/**
 * P2A — Scope From PDF Text (Case 2 przedmiar bez categories/catalog).
 * npx vite-node scripts/test-p2a-scope-from-pdf-text.mjs
 */
import {
  inferWorkScope,
  pdfTextToInferenceChunks,
  WORK_SCOPE_CONFIDENCE_LABELS,
} from "../src/lib/tender-work-scope-inference.ts";
import {
  buildExecutiveSummary,
  EXECUTIVE_SUMMARY_NO_WORKS,
} from "../src/lib/tender-executive-summary.ts";
import {
  buildDocumentPreviewSummary,
  formatDocumentRowCount,
} from "../src/lib/tender-document-summary-header.ts";
import { buildPreviewContextFromPipelineItem } from "../src/lib/tender-pdf-preview-ux.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

const RYNEK = "Rynek_IS_W_PR_20260410.pdf";

const CASE2_PDF_TEXT = `
PRZEDMIAR ROBÓT
REMONT I PRZEBUDOWA TOALET PUBLICZNYCH
Roboty wykończeniowe w pomieszczeniach sanitarnych
Wymiana instalacji sanitarnej wod-kan
Malowanie ścian i posadzek w łazienkach
`.trim();

function case2PipelineItem() {
  return {
    tenderId: "t1",
    bzpDocuments: [{ index: 0, filename: "UMiG.7z", isSwzHint: false, contentType: "application/x-7z-compressed" }],
    tenderDossier: {
      kosztorys: {
        ok: true,
        sourceFilename: RYNEK,
        sourceDocumentIndex: 0,
        zipInnerPath: "II. PRZEDMIARY/Rynek_IS_W_PR_20260410.pdf",
        totalValue: "0",
        currency: "PLN",
        rowCount: 0,
        rows: [],
        przedmiar: [],
        categories: [],
        catalogQuantities: [],
        warnings: [],
        parsedAt: new Date().toISOString(),
        pdfPrzedmiarCase: 2,
      },
      scanSummary: {
        kosztorysFound: true,
        costDiscovery: { found: true, type: "zip_pdf_przedmiar", source: RYNEK, confidence: 0.9 },
      },
    },
  };
}

// --- pdf text chunks ---
const chunks = pdfTextToInferenceChunks(CASE2_PDF_TEXT);
assert("pdf chunks non-empty", chunks.length >= 3);

// --- infer from pdf text only ---
const fromPdf = inferWorkScope({ pdfTextPreview: CASE2_PDF_TEXT });
assert("pdf text source", fromPdf.source === "pdf_text");
assert("pdf text confidence medium", fromPdf.confidence === "medium");
assert("pdf text has works", fromPdf.mainWorks.length >= 2);
assert("pdf text remont sanitarny", fromPdf.mainWorks.some((w) => /remont|sanitarn/i.test(w)));
assert("pdf text wykonczeniowe", fromPdf.mainWorks.some((w) => /wykończeniowe|wykonczeniowe/i.test(w)));

// --- catalog blocks pdf text ---
const blocked = inferWorkScope({
  pdfTextPreview: CASE2_PDF_TEXT,
  catalogDescriptions: ["Wykop pod kanał"],
});
assert("catalog blocks pdf text", blocked.source === "catalog");

// --- categories block pdf text ---
const catBlock = inferWorkScope({
  pdfTextPreview: CASE2_PDF_TEXT,
  snapshotCategoryNames: ["Dział A"],
});
assert("categories block pdf text", catBlock.source === "categories");

// --- Case 2 executive summary without pdf text (fallback) ---
const emptyCtx = buildPreviewContextFromPipelineItem(case2PipelineItem());
const emptyDoc = buildDocumentPreviewSummary(emptyCtx, { filename: RYNEK });
const emptyExec = buildExecutiveSummary(emptyCtx, emptyDoc, { filename: RYNEK });
assert("case2 no pdf fallback message", emptyExec?.noWorksMessage === EXECUTIVE_SUMMARY_NO_WORKS);
assert("case2 no pdf row count label", emptyExec?.rowCountLabel === "Nie ustalono liczby pozycji");

// --- Case 2 with pdf text in modal ---
const withPdfExec = buildExecutiveSummary(emptyCtx, emptyDoc, {
  filename: RYNEK,
  pdfTextPreview: CASE2_PDF_TEXT,
});
assert("case2 pdf exec works", (withPdfExec?.mainWorks.length ?? 0) >= 2);
assert("case2 pdf no fallback", withPdfExec?.noWorksMessage == null);
assert("case2 pdf confidence Średnia", withPdfExec?.confidenceLabel === WORK_SCOPE_CONFIDENCE_LABELS.medium);
assert("case2 pdf source", withPdfExec?.workScopeSource === "pdf_text");

// --- row count display ---
assert("format zero", formatDocumentRowCount(0) === "Nie ustalono liczby pozycji");
assert("format positive", formatDocumentRowCount(221) === "221");
assert("format pending", formatDocumentRowCount(null, { pending: true }) === "W trakcie analizy");
assert("doc summary row display", emptyDoc?.rowCountDisplay === "Nie ustalono liczby pozycji");

console.log(`\nP2A scope from PDF text: ${pass} PASS, ${fail} FAIL`);
if (fail === 0) {
  console.log("\nCase 2 Executive Summary (pdf text):");
  console.log("  Główne roboty:", withPdfExec?.mainWorks.join(" · "));
  console.log("  Pewność:", withPdfExec?.confidenceLabel);
}
process.exit(fail > 0 ? 1 : 0);
