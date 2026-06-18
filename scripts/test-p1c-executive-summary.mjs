/**
 * P1C — Executive Summary (główne roboty dla właściciela).
 * npx vite-node scripts/test-p1c-executive-summary.mjs
 */
import {
  buildExecutiveSummary,
  dedupeWorkCategories,
  extractMainWorkCategories,
  sanitizeWorkCategoryName,
  shouldShowExecutiveSummary,
  EXECUTIVE_SUMMARY_NO_WORKS,
  EXECUTIVE_SUMMARY_MAX_WORKS,
} from "../src/lib/tender-executive-summary.ts";
import { buildDocumentPreviewSummary } from "../src/lib/tender-document-summary-header.ts";
import { buildPreviewContextFromPipelineItem } from "../src/lib/tender-pdf-preview-ux.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

const RYNEK = "Rynek_IS_W_PR_20260410.pdf";

function pipelineItem(overrides = {}) {
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
        rowCount: 221,
        rows: [],
        przedmiar: [],
        categories: [],
        warnings: [],
        parsedAt: new Date().toISOString(),
        pdfPrzedmiarCase: 2,
        ...overrides.kosztorys,
      },
      scanSummary: {
        kosztorysFound: true,
        costDiscovery: { found: true, type: "zip_pdf_przedmiar", source: RYNEK, confidence: 0.9 },
        ...overrides.scanSummary,
      },
    },
  };
}

// --- sanitize ---
assert("sanitize rejects KNR code", sanitizeWorkCategoryName("KNR 2-01 0301-02") == null);
assert("sanitize accepts human name", sanitizeWorkCategoryName("Kanalizacja sanitarna") === "Kanalizacja sanitarna");
assert("sanitize strips leading code", sanitizeWorkCategoryName("03 Roboty ziemne") === "Roboty ziemne");
assert("sanitize rejects razem", sanitizeWorkCategoryName("Razem") == null);

// --- dedupe ---
const deduped = dedupeWorkCategories([
  "Kanalizacja sanitarna",
  "kanalizacja sanitarna",
  "Roboty ziemne",
  "KNR 2-01 0301-02",
  "Studnie rewizyjne",
  "Odtworzenie nawierzchni",
  "Rozbiórki",
  "Extra dział",
]);
assert("dedupe removes duplicates", deduped.length === 5);
assert("dedupe max 5", deduped.length <= EXECUTIVE_SUMMARY_MAX_WORKS);
assert("dedupe keeps first casing", deduped[0] === "Kanalizacja sanitarna");

// --- PDF przedmiar with snapshot categories ---
const przedmiarItem = pipelineItem({
  kosztorys: {
    categories: [
      { name: "Kanalizacja sanitarna", total: "—" },
      { name: "Roboty ziemne", total: "—" },
      { name: "Studnie rewizyjne", total: "—" },
      { name: "Odtworzenie nawierzchni", total: "—" },
      { name: "Rozbiórki", total: "—" },
      { name: "Instalacje sanitarne", total: "—" },
    ],
  },
});
const przedCtx = buildPreviewContextFromPipelineItem(przedmiarItem);
const przedDoc = buildDocumentPreviewSummary(przedCtx, { filename: RYNEK });
const przedExec = buildExecutiveSummary(przedCtx, przedDoc, { filename: RYNEK });
assert("PDF przedmiar headline", przedExec?.headline === "PRZEDMIAR ROBÓT");
assert("PDF przedmiar rows", przedExec?.rowCount === 221);
assert("PDF przedmiar departments", przedExec?.departmentCount === 6);
assert("PDF przedmiar top works", przedExec?.mainWorks.length === 5);
assert("PDF przedmiar first work", przedExec?.mainWorks[0] === "Kanalizacja sanitarna");
assert("PDF przedmiar no value", przedExec?.estimatedValue == null);

// --- PDF kosztorys with value ---
const kosztItem = pipelineItem({
  kosztorys: {
    sourceFilename: "Kosztorys.pdf",
    zipInnerPath: null,
    rowCount: 183,
    totalValue: "1234567",
    currency: "PLN",
    categories: [
      { name: "Roboty ziemne", total: "100 000 zł" },
      { name: "Nawierzchnie", total: "200 000 zł" },
    ],
  },
  scanSummary: {
    costDiscovery: { found: true, type: "pdf_kosztorys", source: "Kosztorys.pdf", confidence: 0.95 },
  },
});
const kosztCtx = buildPreviewContextFromPipelineItem({
  ...kosztItem,
  bzpDocuments: [{ index: 0, filename: "Kosztorys.pdf", isSwzHint: false, contentType: "application/pdf" }],
});
const kosztDoc = buildDocumentPreviewSummary(kosztCtx, { filename: "Kosztorys.pdf" });
const kosztExec = buildExecutiveSummary(kosztCtx, kosztDoc, { filename: "Kosztorys.pdf" });
assert("PDF kosztorys headline", kosztExec?.headline === "KOSZTORYS");
assert("PDF kosztorys rows", kosztExec?.rowCount === 183);
assert("PDF kosztorys works", kosztExec?.mainWorks.includes("Roboty ziemne"));
assert("PDF kosztorys estimated value", kosztExec?.estimatedValue != null);

// --- ATH ---
const athItem = pipelineItem({
  kosztorys: {
    sourceFilename: "projekt.ath",
    zipInnerPath: null,
    rowCount: 352,
    totalValue: "2110000",
    currency: "PLN",
    categories: [
      { name: "Drogi", total: "500 000 zł" },
      { name: "Kanalizacja deszczowa", total: "300 000 zł" },
      { name: "Oświetlenie", total: "100 000 zł" },
    ],
  },
  scanSummary: {
    costDiscovery: { found: true, type: "ath", source: "projekt.ath", confidence: 1 },
  },
});
const athCtx = buildPreviewContextFromPipelineItem(athItem);
const athDoc = buildDocumentPreviewSummary(athCtx, { filename: "projekt.ath" });
const athExec = buildExecutiveSummary(athCtx, athDoc, { filename: "projekt.ath" });
assert("ATH headline", athExec?.headline === "KOSZTORYS ATH");
assert("ATH rows", athExec?.rowCount === 352);
assert("ATH works from snapshot", athExec?.mainWorks.includes("Drogi"));
assert("ATH value", athExec?.estimatedValue != null);

// --- NOR ---
const norDoc = buildDocumentPreviewSummary(
  {
    costDocKind: "nor",
    costStatus: "FOUND_WITH_VALUE",
    rowCount: 40,
    categoryCount: 2,
    categoryNames: ["Instalacje wodociągowe", "Przyłącza"],
    totalValueDisplay: "500 000 zł",
    sourceLabel: "oferta.nor",
  },
  { filename: "oferta.nor" },
);
const norExec = buildExecutiveSummary(
  {
    costDocKind: "nor",
    costStatus: "FOUND_WITH_VALUE",
    categoryNames: ["Instalacje wodociągowe", "Przyłącza"],
    totalValueDisplay: "500 000 zł",
  },
  norDoc,
  { filename: "oferta.nor" },
);
assert("NOR headline", norExec?.headline === "KOSZTORYS NOR");
assert("NOR works", norExec?.mainWorks.includes("Instalacje wodociągowe"));

// --- brak kategorii (P1D — inferencja z catalogQuantities) ---
const noCatItem = pipelineItem({
  kosztorys: {
    catalogQuantities: Array.from({ length: 30 }, (_, i) => ({
      lp: String(i + 1),
      description: i % 3 === 0
        ? "Wykonanie wykopu pod kanał sanitarny"
        : i % 3 === 1
          ? "Odtworzenie nawierzchni z kostki"
          : "Roboty ziemne — zasypka",
      unit: "mb",
      quantity: "5",
    })),
  },
});
const noCatCtx = buildPreviewContextFromPipelineItem(noCatItem);
const noCatDoc = buildDocumentPreviewSummary(noCatCtx, { filename: RYNEK });
const noCatExec = buildExecutiveSummary(noCatCtx, noCatDoc, { filename: RYNEK });
assert("no snapshot categories inferred", (noCatExec?.mainWorks.length ?? 0) > 0);
assert("no snapshot categories not fallback", noCatExec?.noWorksMessage == null);

// --- brak wszystkich źródeł ---
const emptyCtx = buildPreviewContextFromPipelineItem(pipelineItem());
const emptyDoc = buildDocumentPreviewSummary(emptyCtx, { filename: RYNEK });
const emptyExec = buildExecutiveSummary(emptyCtx, emptyDoc, { filename: RYNEK });
assert("empty sources fallback", emptyExec?.mainWorks.length === 0);
assert("empty sources message", emptyExec?.noWorksMessage === EXECUTIVE_SUMMARY_NO_WORKS);

// --- brak pozycji ---
const noRowsExec = buildExecutiveSummary(
  { costDocKind: "ath", costStatus: "NOT_FOUND", rowCount: 0 },
  buildDocumentPreviewSummary({ costDocKind: "ath", costStatus: "NOT_FOUND", rowCount: 0 }, { filename: "x.ath" }),
  { filename: "x.ath", parseResult: { ok: false, format: "ath", rows: [], warnings: [] } },
);
assert("zero rows label", noRowsExec?.rowCount === 0);

// --- parseResult rows fallback ---
const fromRows = extractMainWorkCategories({
  parseResult: {
    ok: true,
    format: "ath",
    rows: [
      { lp: "1", code: "", description: "a", unit: "m", quantity: "1", unitPrice: "", total: "", category: "Elektryka" },
      { lp: "2", code: "", description: "b", unit: "m", quantity: "1", unitPrice: "", total: "", category: "Elektryka" },
      { lp: "3", code: "", description: "c", unit: "m", quantity: "1", unitPrice: "", total: "", category: "Wodociąg" },
    ],
    warnings: [],
  },
});
assert("rows fallback elektryka first", fromRows[0] === "Elektryka");
assert("rows fallback count", fromRows.length === 2);

// --- parse categories priority over rows ---
const fromParseCats = extractMainWorkCategories({
  parseResult: {
    ok: true,
    format: "ath",
    categories: [
      { lp: "1", name: "Termomodernizacja", total: "—", level: 1 },
      { lp: "2", name: "Izolacja", total: "—", level: 1 },
    ],
    rows: [{ lp: "1", code: "", description: "x", unit: "m", quantity: "1", unitPrice: "", total: "", category: "Inne" }],
    warnings: [],
  },
});
assert("parse categories priority", fromParseCats[0] === "Termomodernizacja");

// --- SWZ excluded ---
const swzExec = buildExecutiveSummary(
  { pdfRole: "swz", isSwzHint: true },
  buildDocumentPreviewSummary(undefined, { filename: "swz.pdf" }),
  { filename: "swz.pdf" },
);
assert("SWZ no executive summary", swzExec == null);

// --- shouldShow ---
assert("should show when built", shouldShowExecutiveSummary(przedExec));
assert("should not show null", !shouldShowExecutiveSummary(null));

console.log(`\nP1C executive summary: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
