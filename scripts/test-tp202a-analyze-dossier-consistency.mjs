/**
 * TP202A — analyze/dossier consistency (bidProposal preserve, user estimatePln guard)
 * npx vite-node scripts/test-tp202a-analyze-dossier-consistency.mjs
 */
import {
  analyzeTenderWithDossier,
  dossierFromAnalysisResult,
} from "../src/lib/tender-dossier-pipeline.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import { parseSwzPlainText } from "../src/lib/tenders-bzp-swz.ts";
import { CATALOG_UX_SOURCE_LABEL } from "../src/lib/tender-catalog-ux-labels.ts";

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) {
    pass += 1;
    console.log("PASS", label);
  } else {
    fail += 1;
    console.error("FAIL", label);
  }
}

function briefStub() {
  return {
    fields: [],
    scopeDescription: "Test scope",
    location: null,
    procedureType: null,
    offerDeadline: null,
    offerOpening: null,
    contractPeriod: null,
    paymentTerms: null,
    contactInfo: null,
    additionalNotes: [],
    builtAt: "2026-06-01T00:00:00.000Z",
  };
}

function kosztorysStub(rowCount = 48) {
  return {
    ok: true,
    sourceFilename: "przedmiar.pdf",
    rowCount,
    rows: [],
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-22T12:00:00.000Z",
    pdfPrzedmiarCase: 1,
  };
}

function scanSummaryStub() {
  return {
    totalDocuments: 3,
    scanned: 3,
    parsed: 2,
    byType: { pdf: 2, docx: 1, xlsx: 0, zip: 0, ath: 0, sevenZip: 0, other: 0 },
    sevenZipCount: 0,
    kosztorysFound: true,
    valueFound: true,
    criteriaFound: false,
    estimateFound: true,
    costDiscovery: null,
    parsedAt: "2026-06-22T12:00:00.000Z",
  };
}

const bidProposal = {
  ok: true,
  recommendedBidPln: 1_250_000,
  costPricePln: 980_000,
  pricingMode: "catalog",
  sourceLabelPl: CATALOG_UX_SOURCE_LABEL,
  warnings: [],
};

console.log("=== TP202A ANALYZE/DOSSIER CONSISTENCY ===\n");

// TP202A-1 — re-analyze nie traci bidProposal
console.log("TP202A-1 re-analyze preserves bidProposal");
{
  const existing = {
    brief: briefStub(),
    kosztorys: kosztorysStub(120),
    bidProposal,
    estimatePln: 900_000,
    parserVersion: CURRENT_PARSER_VERSION,
    builtAt: "2026-06-01T00:00:00.000Z",
  };
  const result = {
    kosztorys: kosztorysStub(150),
    scanSummary: scanSummaryStub(),
    estimatePln: 1_100_000,
  };
  const rebuilt = dossierFromAnalysisResult(briefStub(), result, existing);
  assert(rebuilt.bidProposal?.recommendedBidPln === 1_250_000, "bidProposal preserved");
  assert(rebuilt.kosztorys?.rowCount === 150, "kosztorys updated from analysis");
  assert(rebuilt.scanSummary?.parsedAt === result.scanSummary.parsedAt, "scanSummary updated");
  assert(rebuilt.parserVersion === CURRENT_PARSER_VERSION, "parserVersion stamped");
}

// TP202A-1b — bez existing dossier działa jak wcześniej
console.log("\nTP202A-1b dossierFromAnalysisResult without existing");
{
  const result = {
    kosztorys: kosztorysStub(40),
    scanSummary: scanSummaryStub(),
    estimatePln: 500_000,
  };
  const rebuilt = dossierFromAnalysisResult(briefStub(), result);
  assert(rebuilt.bidProposal == null, "no bidProposal when none existed");
  assert(rebuilt.estimatePln === 500_000, "estimatePln from result");
}

// TP202A-2 — user ourEstimatePln nie nadpisywany (ścieżka bez parse)
console.log("\nTP202A-2 user ourEstimatePln preserved (no dossier parse)");
{
  const noticeHtml = `<p>${"Wartość zamówienia 2 000 000 zł. Wadium 5%. ".repeat(8)}</p>`;
  const swz = parseSwzPlainText(noticeHtml.replace(/<[^>]+>/g, ""), { source: "html" });
  const userEstimate = 777_000;
  const result = await analyzeTenderWithDossier({
    noticeHtml,
    ourEstimatePln: userEstimate,
    existing: swz,
    bzpDocuments: [],
  });
  assert(result.estimatePln === userEstimate, "result.estimatePln keeps user value");
}

// TP202A-2b — symulacja runAnalysis: dossier estimate z user value po re-analyze
console.log("\nTP202A-2b re-analyze dossier estimatePln from user-protected result");
{
  const userEstimate = 555_000;
  const existing = {
    brief: briefStub(),
    kosztorys: kosztorysStub(100),
    bidProposal,
    estimatePln: userEstimate,
    parserVersion: 2,
    builtAt: "2026-06-01T00:00:00.000Z",
  };
  const result = {
    kosztorys: kosztorysStub(100),
    scanSummary: scanSummaryStub(),
    estimatePln: userEstimate,
  };
  const rebuilt = dossierFromAnalysisResult(briefStub(), result, existing);
  assert(rebuilt.estimatePln === userEstimate, "dossier estimatePln matches user");
  assert(rebuilt.bidProposal?.recommendedBidPln === 1_250_000, "bidProposal still preserved");
}

// TP202A-3 — parse path guard: user estimate gdy tenderId+docs (parse może zwrócić inny estimate)
console.log("\nTP202A-3 user ourEstimatePln preserved when parse returns different estimate");
{
  const userEstimate = 888_000;
  const noticeHtml = `<p>${"Wartość zamówienia 3 000 000 zł. Wadium 5%. ".repeat(8)}</p>`;
  const result = await analyzeTenderWithDossier({
    tenderId: "tp202a-fake-tender",
    bzpDocuments: [{
      index: 0,
      documentId: "doc-0",
      filename: "SWZ.pdf",
      contentType: "application/pdf",
      downloadUrl: "",
      isSwzHint: true,
    }],
    noticeHtml,
    ourEstimatePln: userEstimate,
    existingDossier: {
      brief: briefStub(),
      kosztorys: kosztorysStub(80),
      bidProposal,
      estimatePln: userEstimate,
      builtAt: "2026-06-01T00:00:00.000Z",
    },
    existingKosztorys: kosztorysStub(80),
  });
  assert(result.estimatePln === userEstimate, "parse path keeps user ourEstimatePln");
  const dossier = dossierFromAnalysisResult(briefStub(), result, {
    brief: briefStub(),
    kosztorys: kosztorysStub(80),
    bidProposal,
    estimatePln: userEstimate,
    builtAt: "2026-06-01T00:00:00.000Z",
  });
  assert(dossier.bidProposal?.recommendedBidPln === 1_250_000, "bidProposal preserved after full path");
  assert(dossier.estimatePln === userEstimate, "dossier estimatePln from protected result");
}

console.log(`\nSUMMARY: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
