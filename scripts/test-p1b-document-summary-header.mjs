/**
 * P1B — DocumentSummaryHeader logic (snapshot + parse fallback).
 * npx vite-node scripts/test-p1b-document-summary-header.mjs
 */
import {
  buildDocumentPreviewSummary,
  mapCostStatusLabel,
  mapPricingLabel,
  shouldShowDocumentSummary,
} from "../src/lib/tender-document-summary-header.ts";
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

// --- status / pricing maps ---
assert("FOUND_NO_VALUE status przedmiar", mapCostStatusLabel("FOUND_NO_VALUE", "przedmiar_pdf") === "Przedmiar bez cen");
assert("FOUND_WITH_VALUE status PDF", mapCostStatusLabel("FOUND_WITH_VALUE", "kosztorys_pdf") === "Zawiera ceny");
assert("FOUND_WITH_VALUE status ATH", mapCostStatusLabel("FOUND_WITH_VALUE", "ath") === "Kosztorys wyceniony");
assert("NOT_FOUND status", mapCostStatusLabel("NOT_FOUND", "ath") === "Nie wykryto danych kosztorysowych");
assert("FOUND_NO_VALUE pricing", mapPricingLabel("FOUND_NO_VALUE") === "Wymaga kalkulacji");
assert("FOUND_WITH_VALUE pricing", mapPricingLabel("FOUND_WITH_VALUE") === "Gotowa");
assert("NOT_FOUND pricing", mapPricingLabel("NOT_FOUND") === "Brak danych");

// --- PDF przedmiar (Owner snapshot) ---
const przedmiarCtx = buildPreviewContextFromPipelineItem(pipelineItem());
const przedmiarSummary = buildDocumentPreviewSummary(przedmiarCtx, { filename: RYNEK });
assert("przedmiar headline", przedmiarSummary?.headline === "PRZEDMIAR ROBÓT");
assert("przedmiar type", przedmiarSummary?.typeLabel === "Przedmiar PDF");
assert("przedmiar rows", przedmiarSummary?.rowCount === 221);
assert("przedmiar status", przedmiarSummary?.statusLabel === "Przedmiar bez cen");
assert("przedmiar pricing", przedmiarSummary?.pricingLabel === "Wymaga kalkulacji");
assert("przedmiar source archive", przedmiarSummary?.sourceLabel === "UMiG.7z");
assert("przedmiar no value row", przedmiarSummary?.valueLabel == null);

// --- PDF kosztorys ---
const kosztorysItem = pipelineItem({
  kosztorys: {
    sourceFilename: "Kosztorys.pdf",
    zipInnerPath: null,
    rowCount: 183,
    totalValue: "1234567",
    currency: "PLN",
  },
  scanSummary: {
    costDiscovery: { found: true, type: "pdf_kosztorys", source: "Kosztorys.pdf", confidence: 0.95 },
  },
});
const kosztCtx = buildPreviewContextFromPipelineItem({
  ...kosztorysItem,
  bzpDocuments: [{ index: 0, filename: "Kosztorys.pdf", isSwzHint: false, contentType: "application/pdf" }],
});
const kosztSummary = buildDocumentPreviewSummary(kosztCtx, { filename: "Kosztorys.pdf" });
assert("kosztorys headline", kosztSummary?.headline === "KOSZTORYS");
assert("kosztorys type", kosztSummary?.typeLabel === "Kosztorys PDF");
assert("kosztorys rows", kosztSummary?.rowCount === 183);
assert("kosztorys status", kosztSummary?.statusLabel === "Zawiera ceny");
assert("kosztorys pricing", kosztSummary?.pricingLabel === "Gotowa");
assert("kosztorys value pln", kosztSummary?.valueLabel?.includes("234") || kosztSummary?.valueLabel?.includes("567"));
assert("kosztorys source file", kosztSummary?.sourceLabel === "Kosztorys.pdf");

// --- ATH ---
const athItem = pipelineItem({
  kosztorys: {
    sourceFilename: "projekt.ath",
    zipInnerPath: null,
    rowCount: 352,
    totalValue: "2110000",
    currency: "PLN",
    categories: [{ name: "D1" }, { name: "D2" }, { name: "D3" }],
  },
  scanSummary: {
    costDiscovery: { found: true, type: "ath", source: "projekt.ath", confidence: 1 },
  },
});
const athCtx = buildPreviewContextFromPipelineItem(athItem);
const athSummary = buildDocumentPreviewSummary(athCtx, { filename: "projekt.ath" });
assert("ATH headline", athSummary?.headline === "KOSZTORYS ATH");
assert("ATH type", athSummary?.typeLabel === "ATH");
assert("ATH rows", athSummary?.rowCount === 352);
assert("ATH status priced", athSummary?.statusLabel === "Kosztorys wyceniony");
assert("ATH pricing ready", athSummary?.pricingLabel === "Gotowa");
assert("ATH categories", athSummary?.categoryCount === 3);

// --- NOR ---
const norSummary = buildDocumentPreviewSummary(
  { costDocKind: "nor", costStatus: "FOUND_WITH_VALUE", rowCount: 40, totalValueDisplay: "500 000 zł", sourceLabel: "oferta.nor" },
  { filename: "oferta.nor" },
);
assert("NOR headline", norSummary?.headline === "KOSZTORYS NOR");
assert("NOR type", norSummary?.typeLabel === "NOR");
assert("NOR pricing", norSummary?.pricingLabel === "Gotowa");

// --- NOT_FOUND (parse fallback) ---
const notFoundSummary = buildDocumentPreviewSummary(undefined, {
  filename: "pusty.ath",
  parseResult: { ok: false, format: "ath", rows: [], warnings: [] },
});
assert("NOT_FOUND from empty parse", notFoundSummary?.costStatus === "NOT_FOUND");
assert("NOT_FOUND status label", notFoundSummary?.statusLabel === "Nie wykryto danych kosztorysowych");
assert("NOT_FOUND pricing", notFoundSummary?.pricingLabel === "Brak danych");

// --- FOUND_NO_VALUE from parse rows ---
const noValueParse = buildDocumentPreviewSummary(undefined, {
  filename: "przedmiar.ath",
  parseResult: {
    ok: true,
    format: "ath",
    rows: [{ lp: 1 }, { lp: 2 }],
    warnings: [],
  },
});
assert("parse FOUND_NO_VALUE", noValueParse?.costStatus === "FOUND_NO_VALUE");
assert("parse row count", noValueParse?.rowCount === 2);

// --- shouldShowDocumentSummary ---
const sample = buildDocumentPreviewSummary(przedmiarCtx, { filename: RYNEK });
assert("show on text view", shouldShowDocumentSummary(sample, { showTextView: true, showPdf: false, showKosztorysTable: false }));
assert("show on kosztorys table", shouldShowDocumentSummary(sample, { showTextView: false, showPdf: false, showKosztorysTable: true }));
assert("hide when no view", !shouldShowDocumentSummary(sample, { showTextView: false, showPdf: false, showKosztorysTable: false }));
assert("hide null summary", !shouldShowDocumentSummary(null, { showTextView: true, showPdf: false, showKosztorysTable: false }));

// --- SWZ / technical PDF excluded ---
assert("no summary for SWZ filename only", buildDocumentPreviewSummary(undefined, { filename: "swz.pdf" }) == null);

console.log(`\nP1B document summary header: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
