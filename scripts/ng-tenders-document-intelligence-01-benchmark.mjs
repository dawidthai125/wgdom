/**
 * NG-TENDERS-DOCUMENT-INTELLIGENCE-01 Phase A — synthetic corpus benchmark.
 * npx vite-node scripts/ng-tenders-document-intelligence-01-benchmark.mjs
 *
 * Corpus = prepared text fixtures (no live PDF download; no OCR).
 */
import {
  DI_T_BOQ,
  analyzeDocumentIntelligence,
  shouldForcePdfPrzedmiarParse,
} from "../src/lib/document-intelligence/index.ts";
import { isPdfPrzedmiarCostFilename } from "../src/lib/tender-cost-discovery.ts";

/** @typedef {{ id: string; filename: string; text: string; expect: 'boq'|'reject'|'formal' }} Case */

/** @type {Case[]} */
const CORPUS = [
  {
    id: "UX_A_2E",
    filename: "Załącznik nr 2E do SWZ WYKAZ zakresu rzeczowo-finansowego.pdf",
    text: `Załącznik nr 2E
WYKAZ zakresu rzeczowo-finansowego
Lp.  Podstawa     Opis              J.m.  Ilość
1.   KNR 2-1301   Roboty ziemne     m3    12,50
2.   KNR 4-0201   Instalacje        mb    40,00
Nakład R-M-S`,
    expect: "boq",
  },
  {
    id: "CLASSIC_PRZEDMIAR",
    filename: "Przedmiar_robót_budowlanych.pdf",
    text: `Przedmiar robót
Lp. J.m. Ilość KNR 1-0101 Fundamenty m3 5`,
    expect: "boq",
  },
  {
    id: "UMOWA",
    filename: "Umowa_o_roboty_budowlane.pdf",
    text: "Umowa. Pełnomocnictwo. Wadium. Gwarancja bankowa. Formularz ofertowy.",
    expect: "reject",
  },
  {
    id: "SWZ_ONLY",
    filename: "SWZ_czesc_I.pdf",
    text: "Specyfikacja istotnych warunków zamówienia. Ogłoszenie o zamówieniu.",
    expect: "formal",
  },
  {
    id: "MIXED_SWZ_WYKAZ",
    filename: "SWZ_zalacznik_WYKAZ_zakresu_rzeczowo-finansowego.pdf",
    text: `SWZ — załącznik
WYKAZ zakresu rzeczowo-finansowego
Lp. J.m. Ilość KNR 3-0101 Posadzki m2 100
Podstawa nakład`,
    expect: "boq",
  },
  {
    id: "EMPTY_SCAN",
    filename: "skan_bez_tekstu.pdf",
    text: "",
    expect: "reject",
  },
];

let pass = 0;
let fail = 0;
const rows = [];

for (const c of CORPUS) {
  const di = analyzeDocumentIntelligence({
    filename: c.filename,
    fullText: c.text,
    isPdf: true,
    hasTextLayer: c.text.length > 0,
    byteLength: Math.max(100, c.text.length * 2),
  });
  const force = shouldForcePdfPrzedmiarParse(di);
  const docD1 = isPdfPrzedmiarCostFilename(c.filename);
  let ok = false;
  if (c.expect === "boq") {
    ok = force && di.boq.overallConfidence >= DI_T_BOQ;
  } else if (c.expect === "reject") {
    ok = !force && di.parser.recommendedParser === "none";
  } else if (c.expect === "formal") {
    ok = !force && di.boq.overallConfidence < DI_T_BOQ;
  }
  if (ok) pass += 1;
  else fail += 1;
  rows.push({
    id: c.id,
    expect: c.expect,
    ok,
    docD1,
    overall: Number(di.boq.overallConfidence.toFixed(3)),
    parser: di.parser.recommendedParser,
    rank: di.rankLabel,
    priority: di.filenamePriority,
    ref: di.attachmentRef.attachmentRef,
  });
}

console.log("=== DI Corpus Benchmark Phase A ===\n");
console.table(rows);
console.log(`\nT_BOQ=${DI_T_BOQ}  PASS=${pass}/${CORPUS.length}  FAIL=${fail}`);

const uxA = rows.find((r) => r.id === "UX_A_2E");
if (!uxA?.ok || uxA.docD1) {
  console.error("CRITICAL: UX_A_2E must PASS via DI while Doc.D1=false");
  process.exit(1);
}

if (fail > 0) {
  console.error("BENCHMARK FAIL");
  process.exit(1);
}
console.log("\nBENCHMARK PASS");
