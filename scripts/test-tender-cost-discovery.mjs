/**
 * P2-H.5D — multi-ATH tie-break + discovery tests.
 * npx vite-node scripts/test-tender-cost-discovery.mjs
 */
import {
  classifyCostDocumentType,
  discoverBestCostDocument,
  scoreCostTitleMatch,
  costTypeKosztorysFoundLine,
} from "../src/lib/tender-cost-discovery.ts";
import { PDF_PRZEDMIAR_NO_TEXT_LAYER_LINE } from "../src/lib/pdf-przedmiar-heuristic.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

const ZZK_CANDS = [
  {
    filename: "ZADANIE 1 - przedmiary (2).zip → Przewody wentylacyjne 2026.ath",
    score: 28,
    zipInnerPath: "Przedmiar robót branży budowlanej (dotyczy prawa opcji)/Przewody wentylacyjne 2026.ath",
  },
  {
    filename: "ZADANIE 1 - przedmiary (2).zip → PIASKOWA  7  m 3  - SANITARNY - aktual - zest.ATH",
    score: 28,
    zipInnerPath: "Zadanie 1 - przedmiary/Piaskowa 7-3/PIASKOWA  7  m 3  - SANITARNY - aktual - zest.ATH",
  },
];

assert("wentyl deprioritized", scoreCostTitleMatch(ZZK_CANDS[0]) < scoreCostTitleMatch(ZZK_CANDS[1]));

const zzkDisc = discoverBestCostDocument(ZZK_CANDS);
assert("zzk discovery piaskowa", zzkDisc.source.includes("PIASKOWA"));
assert("zzk discovery not wentyl", !zzkDisc.source.includes("wentylacyjne"));

const rdestCands = [
  {
    filename: "6. dokumentacja techniczna.zip → Przewody wentylacyjne 2026.ath",
    score: 28,
    zipInnerPath: "6. dokumentacja techniczna/dokumentacja techniczna/Przewody wentylacyjne 2026.ath",
  },
  {
    filename: "6. dokumentacja techniczna.zip → RDESTOWA  7  m 9 - SANITARNY - zest.ATH",
    score: 28,
    zipInnerPath: "6. dokumentacja techniczna/dokumentacja techniczna/ZADANIE 1/Rdestowa 7-9/RDESTOWA  7  m 9 - SANITARNY - zest.ATH",
  },
];

const rdestDisc = discoverBestCostDocument(rdestCands, {
  tenderTitle: "Remont lokalu mieszkalnego zamiennego — Wrocław, ul. Rdestowa 7 lok. 9",
});
assert("rdest discovery match", rdestDisc.source.includes("RDESTOWA"));

const falzmanna = discoverBestCostDocument([
  { filename: "Falzmanna 17-25.zip → Falzmanna 17-25.ATH", score: 28, zipInnerPath: "Falzmanna 17-25.ATH" },
  { filename: "Falzmanna 17-25.zip → notatka.pdf", score: 8 },
]);
assert("falzmanna single ath", falzmanna.source.includes("Falzmanna"));

const athOverPdf = discoverBestCostDocument([
  { filename: "arch.7z → przedmiar.pdf", score: 35 },
  { filename: "arch.7z → koszt.ath", score: 28 },
]);
assert("ath over pdf", athOverPdf.type === "zip_ath");

assert("pdf no text ux line", costTypeKosztorysFoundLine("zip_pdf_przedmiar", "x.pdf", {
  pdfCase: 3,
  pdfNoTextLayer: true,
}) === PDF_PRZEDMIAR_NO_TEXT_LAYER_LINE);

assert("classify zip ath", classifyCostDocumentType("a.zip → b.ath").type === "zip_ath");

console.log(`\nTender cost discovery: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
