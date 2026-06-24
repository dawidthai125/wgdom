/**
 * TP200C — sync merge fidelity: pickBetter SSOT, no stale override.
 * npx vite-node scripts/test-tp200c-sync-merge-fidelity.mjs
 */
import { CURRENT_PARSER_VERSION, stampDossierParserVersion } from "../src/lib/tender-dossier-parser-version.ts";
import { mergeTenderDossierByQuality } from "../src/lib/tender-dossier-merge.ts";
import { mergeTenderPipelineForCloud } from "../src/lib/tenders-sync.ts";

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.error(`  FAIL ${label}`);
  }
}

const BRIEF = {
  fields: [],
  scopeDescription: null,
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

function athKosztorys(rowCount, filename = "SĘPA.ATH") {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount,
    rows: Array(Math.min(rowCount, 40)).fill({ description: "x", quantity: "1" }),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-01T00:00:00.000Z",
  };
}

function pdfKosztorys(rowCount, filename = "Nowowiejska 86a_27 - przedmiar.pdf") {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount,
    rows: Array(Math.min(rowCount, 40)).fill({ description: "Roboty", quantity: "1" }),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-01T00:00:00.000Z",
    pdfPrzedmiarCase: 1,
  };
}

function formKosztorys(rowCount, filename = "TP_Zal. nr 1 - Formularz oferty.xlsx") {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount,
    rows: Array(rowCount).fill({ description: "x", quantity: "1" }),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-01T00:00:00.000Z",
  };
}

function scanSummary(marker) {
  return {
    totalDocuments: 1,
    scanned: 1,
    parsed: 1,
    byType: { pdf: 0, docx: 0, xlsx: 0, zip: 0, ath: 1, sevenZip: 0, other: 0 },
    sevenZipCount: 0,
    kosztorysFound: true,
    valueFound: false,
    criteriaFound: false,
    estimateFound: false,
    costDiscovery: null,
    parsedAt: "2026-06-01T00:00:00.000Z",
    _marker: marker,
  };
}

function dossier(kosztorys, opts = {}) {
  return {
    brief: BRIEF,
    kosztorys,
    scanSummary: opts.scanSummary ?? { parsedAt: "2026-06-01T00:00:00.000Z" },
    parserVersion: opts.parserVersion,
    builtAt: opts.builtAt ?? "2026-06-01T00:00:00.000Z",
  };
}

console.log("=== TP200C SYNC MERGE FIDELITY ===\n");

console.log("T200C-1 stale ATH 302 vs fresh form 8");
{
  const staleAth = dossier(athKosztorys(302), { parserVersion: 2 });
  const freshForm = stampDossierParserVersion(dossier(formKosztorys(8)));
  const merged = mergeTenderDossierByQuality(staleAth, freshForm);
  assert(merged?.kosztorys?.rowCount === 302, "kosztorys ATH 302");
  assert(/\.ATH$/i.test(merged?.kosztorys?.sourceFilename ?? ""), "source ATH");
}

console.log("\nT200C-2 stale PDF 150 vs fresh form 8");
{
  const stalePdf = dossier(pdfKosztorys(150), { parserVersion: 2 });
  const freshForm = stampDossierParserVersion(dossier(formKosztorys(8)));
  const merged = mergeTenderDossierByQuality(stalePdf, freshForm);
  assert(merged?.kosztorys?.rowCount === 150, "kosztorys PDF 150");
  assert(/przedmiar\.pdf/i.test(merged?.kosztorys?.sourceFilename ?? ""), "source PDF");
}

console.log("\nT200C-3 stale ATH 302 vs fresh PDF 123");
{
  const staleAth = dossier(athKosztorys(302), { parserVersion: 2 });
  const freshPdf = stampDossierParserVersion(dossier(pdfKosztorys(123)));
  const merged = mergeTenderDossierByQuality(staleAth, freshPdf);
  assert(merged?.kosztorys?.rowCount === 302, "kosztorys ATH 302 over PDF 123");
  assert(/\.ATH$/i.test(merged?.kosztorys?.sourceFilename ?? ""), "source ATH");
}

console.log("\nT200C-4 fresh ATH 302 vs fresh ATH 128");
{
  const ath302 = stampDossierParserVersion(dossier(athKosztorys(302)));
  const ath128 = stampDossierParserVersion(dossier(athKosztorys(128, "other.ATH")));
  const merged = mergeTenderDossierByQuality(ath302, ath128);
  assert(merged?.kosztorys?.rowCount === 302, "kosztorys ATH 302");
  assert(merged?.parserVersion === CURRENT_PARSER_VERSION, "parserVersion v3");
}

console.log("\nT200C-5 parserVersion provenance — ATH v2 wins");
{
  const staleAth = dossier(athKosztorys(302), { parserVersion: 2 });
  const freshForm = stampDossierParserVersion(dossier(formKosztorys(8)));
  const merged = mergeTenderDossierByQuality(staleAth, freshForm);
  assert(merged?.parserVersion === 2, "parserVersion stays 2 from winning stale ATH");
}

console.log("\nT200C-6 mergeTenderPipelineForCloud");
{
  const localItem = {
    id: "tp200c-6",
    tenderId: "t1",
    title: "Test",
    status: "seen",
    updatedAt: "2026-06-20T12:00:00.000Z",
    tenderDossier: dossier(athKosztorys(302), { parserVersion: 2 }),
  };
  const cloudItem = {
    ...localItem,
    updatedAt: "2026-06-15T08:00:00.000Z",
    tenderDossier: stampDossierParserVersion(dossier(formKosztorys(8))),
  };
  const [merged] = mergeTenderPipelineForCloud([localItem], [cloudItem]);
  assert(merged.tenderDossier?.kosztorys?.rowCount === 302, "pipeline merge ATH 302");
}

console.log("\nT200C-7 scanSummary alignment");
{
  const staleAth = dossier(athKosztorys(302), {
    parserVersion: 2,
    scanSummary: scanSummary("from-ath"),
  });
  const freshPdf = stampDossierParserVersion(dossier(pdfKosztorys(123), {
    scanSummary: scanSummary("from-pdf"),
  }));
  const merged = mergeTenderDossierByQuality(staleAth, freshPdf);
  assert(merged?.scanSummary?._marker === "from-ath", "scanSummary from winning ATH dossier");
}

console.log("\nT200C-8 regresja T-sup — stale form 45 vs fresh PDF 123");
{
  const staleForm = dossier(formKosztorys(45, "formularz.xlsx"), { parserVersion: 2 });
  const freshPdf = stampDossierParserVersion(dossier(pdfKosztorys(123, "przedmiar.pdf")));
  const merged = mergeTenderDossierByQuality(staleForm, freshPdf);
  assert(merged?.kosztorys?.rowCount === 123, "fresh PDF 123 still wins when better");
  assert(merged?.parserVersion === CURRENT_PARSER_VERSION, "parserVersion from winning PDF v3");
}

console.log("\nT200C-9 both stale v2 — ATH 302 vs form 40");
{
  const staleAth = dossier(athKosztorys(302), { parserVersion: 2 });
  const staleForm = dossier(formKosztorys(40, "Formularz oferty.xlsx"), { parserVersion: 2 });
  const merged = mergeTenderDossierByQuality(staleAth, staleForm);
  assert(merged?.kosztorys?.rowCount === 302, "ATH 302 over form 40");
}

console.log("\nT200C-10 reverse order symmetry");
{
  const staleAth = dossier(athKosztorys(302), { parserVersion: 2 });
  const freshForm = stampDossierParserVersion(dossier(formKosztorys(8)));
  const ab = mergeTenderDossierByQuality(staleAth, freshForm);
  const ba = mergeTenderDossierByQuality(freshForm, staleAth);
  assert(ab?.kosztorys?.rowCount === ba?.kosztorys?.rowCount, "rowCount symmetric");
  assert(ab?.kosztorys?.sourceFilename === ba?.kosztorys?.sourceFilename, "source symmetric");
  assert(ab?.parserVersion === ba?.parserVersion, "parserVersion symmetric");
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
