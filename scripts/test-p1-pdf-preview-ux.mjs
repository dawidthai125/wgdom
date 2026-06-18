/**
 * P1A — PDF preview UX labels, titles, CAD banner, default tab, download name.
 * npx vite-node scripts/test-p1-pdf-preview-ux.mjs
 */
import {
  buildPdfPreviewModalCopy,
  buildPreviewContextFromBzpDoc,
  buildPreviewContextFromPipelineItem,
  pdfPreviewDefaultViewMode,
  resolvePdfDownloadFilename,
  resolvePdfPreviewRole,
  shouldShowPrzedmiarCadBanner,
} from "../src/lib/tender-pdf-preview-ux.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

const RYNEK = "Rynek_IS_W_PR_20260410.pdf";

// --- role resolution ---
assert("SWZ by hint", resolvePdfPreviewRole("swz.pdf", { isSwzHint: true }) === "swz");
assert("SWZ by filename", resolvePdfPreviewRole("Modyfikacja_SWZ.pdf", null) === "swz");
assert("przedmiar _PR", resolvePdfPreviewRole(RYNEK, null) === "przedmiar_pdf");
assert("przedmiar explicit ctx", resolvePdfPreviewRole(RYNEK, { pdfRole: "przedmiar_pdf" }) === "przedmiar_pdf");
assert("kosztorys pdf", resolvePdfPreviewRole("kosztorys.pdf", { priced: true }) === "kosztorys_pdf");
assert("technical pdf", resolvePdfPreviewRole("plan instalacji.pdf", null) === "technical_pdf");

// --- labels SWZ ---
const swzCopy = buildPdfPreviewModalCopy("swz.pdf", { pdfRole: "swz" });
assert("SWZ text button", swzCopy.labels.textTabButton === "Tekst SWZ");
assert("SWZ heading", swzCopy.labels.textViewHeading === "Treść specyfikacji");
assert("SWZ title", swzCopy.title === "Podgląd — Specyfikacja zamówienia");

// --- labels PDF_PRZEDMIAR ---
const prCopy = buildPdfPreviewModalCopy(RYNEK, { pdfRole: "przedmiar_pdf", rowCount: 12 });
assert("przedmiar text button", prCopy.labels.textTabButton === "Treść przedmiaru");
assert("przedmiar heading", prCopy.labels.textViewHeading === "Przedmiar robót");
assert("przedmiar title", prCopy.title === "Podgląd — Przedmiar robót");
assert("przedmiar subtitle", prCopy.subtitle === RYNEK);
assert("przedmiar download label", prCopy.labels.downloadButton === "Pobierz PDF");

// --- labels kosztorys ---
const kosztCopy = buildPdfPreviewModalCopy("kosztorys.pdf", { pdfRole: "kosztorys_pdf" });
assert("kosztorys text button", kosztCopy.labels.textTabButton === "Treść kosztorysu");
assert("kosztorys title", kosztCopy.title === "Podgląd — Kosztorys PDF");

// --- technical title uses filename ---
const techCopy = buildPdfPreviewModalCopy("plan.pdf", null);
assert("technical title", techCopy.title === "Podgląd — plan.pdf");

// --- CAD banner ---
assert("CAD banner przedmiar role", shouldShowPrzedmiarCadBanner({ role: "przedmiar_pdf" }));
assert("CAD banner case 3", shouldShowPrzedmiarCadBanner({ role: "technical_pdf", pdfPrzedmiarCase: 3 }));
assert("CAD banner text+scan", shouldShowPrzedmiarCadBanner({
  role: "technical_pdf",
  pdfTextPreview: "x".repeat(100),
  pdfScanWarning: "scan",
}));
assert("no CAD banner SWZ", !shouldShowPrzedmiarCadBanner({ role: "swz" }));

// --- default tab ---
assert("default tab przedmiar", pdfPreviewDefaultViewMode("przedmiar_pdf") === "text");
assert("default tab SWZ", pdfPreviewDefaultViewMode("swz") === "table");

// --- download filename ---
assert("download name effective", resolvePdfDownloadFilename("outer.pdf", RYNEK) === RYNEK);
assert("download name fallback", resolvePdfDownloadFilename(RYNEK, "") === RYNEK);

// --- pipeline context (Owner View) ---
const pipelineItem = {
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
      rowCount: 12,
      rows: [],
      przedmiar: [],
      categories: [],
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
const ctx = buildPreviewContextFromPipelineItem(pipelineItem);
assert("pipeline ctx role", ctx?.pdfRole === "przedmiar_pdf");
assert("pipeline ctx rows", ctx?.rowCount === 12);
assert("pipeline ctx case", ctx?.pdfPrzedmiarCase === 2);

const bzpCtx = buildPreviewContextFromBzpDoc({ filename: "swz.pdf", isSwzHint: true }, "swz.pdf");
assert("bzp doc SWZ ctx", bzpCtx?.pdfRole === "swz");

console.log(`\nP1 PDF preview UX: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
