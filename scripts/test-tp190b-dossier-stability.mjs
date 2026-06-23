/**
 * TP190B — anti-downgrade PDF vs ATH + parserVersion 3
 * npx vite-node scripts/test-tp190b-dossier-stability.mjs
 */
import {
  pickBetterKosztorys,
  isStrongPdfPrzedmiarRecovery,
} from "../src/lib/tender-dossier-merge.ts";
import {
  CURRENT_PARSER_VERSION,
  isDossierParserStale,
  existingKosztorysUnlessStale,
  stampDossierParserVersion,
} from "../src/lib/tender-dossier-parser-version.ts";
import { tenderDossierHeavyParseDone } from "../src/lib/tender-dossier-pipeline.ts";

let pass = 0;
let fail = 0;

function assert(cond, label) {
  if (cond) { pass++; console.log("PASS", label); }
  else { fail++; console.log("FAIL", label); }
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

function athKosztorys(rowCount, filename = "kosztorys.ATH") {
  return {
    ok: true,
    sourceFilename: filename,
    rowCount,
    rows: Array(Math.min(rowCount, 40)).fill({ description: "x", quantity: "1" }),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-02T00:00:00.000Z",
  };
}

function formKosztorys(rowCount) {
  return {
    ok: true,
    sourceFilename: "TP_Zal. nr 1 do SWZ - Formularz oferty.xlsx",
    rowCount,
    rows: Array(rowCount).fill({ description: "x", quantity: "1" }),
    catalogQuantities: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: "2026-06-01T00:00:00.000Z",
  };
}

function dossier(kosztorys, parserVersion) {
  return {
    brief: { fields: [], scopeDescription: null, location: null, procedureType: null, offerDeadline: null, offerOpening: null, contractPeriod: null, paymentTerms: null, contactInfo: null, additionalNotes: [], builtAt: "2026-06-01T00:00:00.000Z" },
    kosztorys,
    scanSummary: { parsedAt: "2026-06-01T00:00:00.000Z" },
    parserVersion,
    builtAt: "2026-06-01T00:00:00.000Z",
  };
}

console.log("=== TP190B Dossier Stability ===\n");

// TP190B-1 — PDF 132 vs ATH 40 → PDF
console.log("TP190B-1 PDF 132 vs ATH 40");
{
  const pdf = pdfKosztorys(132);
  const ath = athKosztorys(40);
  assert(isStrongPdfPrzedmiarRecovery(pdf), "PDF is strong recovery");
  const picked = pickBetterKosztorys(pdf, ath);
  assert(picked?.rowCount === 132, "PDF 132 wins over ATH 40");
  assert(/przedmiar\.pdf/i.test(picked?.sourceFilename ?? ""), "source stays PDF");
}

// TP190B-2 — PDF 132 vs ATH 128 → ATH may win (tier)
console.log("\nTP190B-2 PDF 132 vs ATH 128");
{
  const pdf = pdfKosztorys(132);
  const ath = athKosztorys(128);
  const picked = pickBetterKosztorys(pdf, ath);
  assert(picked?.rowCount === 128, "ATH 128 wins (within 5% margin — TP190B-2)");
  assert(/\.ATH$/i.test(picked?.sourceFilename ?? ""), "source becomes ATH");
}

// R1-FIX — silny PDF wygrywa gdy rowCount > ATH × 1.05
console.log("\nR1-FIX PDF 150 vs ATH 128 → PDF");
{
  const pdf = pdfKosztorys(150);
  const ath = athKosztorys(128);
  const picked = pickBetterKosztorys(pdf, ath);
  assert(picked?.rowCount === 150, "PDF 150 wins over ATH 128");
  assert(/przedmiar\.pdf/i.test(picked?.sourceFilename ?? ""), "source stays PDF");
}

console.log("\nR1-FIX PDF 150 vs ATH 105 → PDF");
{
  const pdf = pdfKosztorys(150);
  const ath = athKosztorys(105);
  const picked = pickBetterKosztorys(pdf, ath);
  assert(picked?.rowCount === 150, "PDF 150 wins over ATH 105");
  assert(/przedmiar\.pdf/i.test(picked?.sourceFilename ?? ""), "source stays PDF");
}

console.log("\nR1-FIX PDF 145 vs ATH 128 → PDF");
{
  const pdf = pdfKosztorys(145);
  const ath = athKosztorys(128);
  const picked = pickBetterKosztorys(pdf, ath);
  assert(picked?.rowCount === 145, "PDF 145 wins over ATH 128");
  assert(/przedmiar\.pdf/i.test(picked?.sourceFilename ?? ""), "source stays PDF");
}

// TP190B-3 — PDF 132 vs formularz 20 → PDF
console.log("\nTP190B-3 PDF 132 vs formularz 20");
{
  const pdf = pdfKosztorys(132);
  const form = formKosztorys(20);
  const picked = pickBetterKosztorys(pdf, form);
  assert(picked?.rowCount === 132, "PDF wins over formularz");
}

// TP190B-4 — parserVersion 2 → stale
console.log("\nTP190B-4 parserVersion 2 stale");
{
  const d = dossier(pdfKosztorys(128), 2);
  assert(isDossierParserStale(d), "v2 dossier is stale when CURRENT=3");
  assert(!tenderDossierHeavyParseDone(d), "heavy parse required for v2");
  assert(existingKosztorysUnlessStale(d, d.kosztorys) === null, "existingK cleared on stale");
}

// TP190B-5 — parserVersion 3 → fresh
console.log("\nTP190B-5 parserVersion 3 fresh");
{
  const d = stampDossierParserVersion(dossier(pdfKosztorys(132), undefined));
  assert(d.parserVersion === 3, "stamped v3");
  assert(d.parserVersion === CURRENT_PARSER_VERSION, "matches CURRENT");
  assert(!isDossierParserStale(d), "v3 not stale");
  assert(tenderDossierHeavyParseDone(d), "heavy parse done for v3");
}

// TP190B-6 — existing v3 132 vs worse PDF v3 80 → existing wins
console.log("\nTP190B-6 existing v3 strong PDF vs worse PDF");
{
  const existing = pdfKosztorys(132);
  const worse = pdfKosztorys(80, "partial-przedmiar.pdf");
  const d = dossier(existing, 3);
  const existingK = existingKosztorysUnlessStale(d, existing);
  const resolved = pickBetterKosztorys(existingK, worse);
  assert(resolved?.rowCount === 132, "existing 132 survives worse PDF 80");
}

console.log(`\nTP190B dossier stability: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
