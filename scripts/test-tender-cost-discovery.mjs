/**
 * P2-H.5D — multi-ATH tie-break + discovery tests.
 * npx vite-node scripts/test-tender-cost-discovery.mjs
 */
import {
  classifyCostDocumentType,
  discoverBestCostDocument,
  isFinancialScheduleNotCostFilename,
  isFormalOfferCostFilename,
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

// P0 — formal offer XLSX excluded from cost discovery
const TP113_FORM =
  "TP113_Zal. nr 1 do SWZ - Formularz oferty - Remont i przebudowa Sępa Szarzyńskiego 65A.xlsx";
const TP113_ZIP_ATH =
  "DOKUMENTACJA PROJEKTOWA.zip → SEPA 65A - SANITARNY - zest.ATH";

assert("isFormalOfferCostFilename tp113", isFormalOfferCostFilename(TP113_FORM));
assert("classify formal offer none", classifyCostDocumentType(TP113_FORM).type === "none");
assert("classify offer form en", isFormalOfferCostFilename("Annex - Offer Form.xlsx"));

const tp113Cands = [
  { filename: TP113_FORM, score: 54 },
  {
    filename: TP113_ZIP_ATH,
    score: 48,
    zipInnerPath: "przedmiar/SEPA 65A - SANITARNY - zest.ATH",
  },
];
const tp113Disc = discoverBestCostDocument(tp113Cands, {
  tenderTitle:
    "REMONT I PRZEBUDOWA BUDYNKU WIELORODZINNEGO PRZY UL. SĘPA SZARZYŃSKIEGO 65A WE WROCŁAWIU",
});
assert("TP113 formularz not winner", !tp113Disc.source.includes("Formularz oferty"));
assert("TP113 zip ath type", tp113Disc.type === "zip_ath");
assert("TP113 zip ath source", tp113Disc.source.includes("DOKUMENTACJA PROJEKTOWA.zip"));
assert("TP113 zip ath inner", tp113Disc.source.includes(".ATH") || tp113Disc.source.includes(".ath"));

assert("inner xlsx without przedmiar excluded", classifyCostDocumentType(
  "Załączniki do umowy.zip → zał. nr 3 wzor harmonogramu rzeczowo - finansowego.xlsx",
).type === "none");
assert("inner przedmiar xlsx kept", classifyCostDocumentType("arch.zip → przedmiar.xlsx").type === "zip_xlsx");

// —— WM COST DISCOVERY FIX — A/B/D/E (pure) ——
const WM_HARMONOGRAM =
  "TP167_Zał. nr 11 do SWZ - Harmonogram rzeczowo-finansowy.xlsx";
const WM_STWIORB =
  "TP167_Zal. nr 3 do SWZ - Opis przedmiotu zamówienia.zip → STWiORb Wyszynskiego105a.pdf";
const WM_OPZ_PDF =
  "TP167_Zal. nr 3 do SWZ - Opis przedmiotu zamówienia.zip → W105A_PAB.pdf";
const XI_PDF =
  "Opis przedmiotu zamówienia.zip → Boczna przedmiar.pdf";

assert("A schedule helper harmonogram", isFinancialScheduleNotCostFilename(WM_HARMONOGRAM));
assert("A schedule helper rzeczowo-finansowy", isFinancialScheduleNotCostFilename("rzeczowo-finansowy.xlsx"));
assert("A schedule helper financial schedule", isFinancialScheduleNotCostFilename("financial schedule.xlsx"));
assert("A bare schedule NOT blocked", !isFinancialScheduleNotCostFilename("work-schedule-notes.txt"));

assert("A Harmonogram outer = none", classifyCostDocumentType(WM_HARMONOGRAM).type === "none");
assert(
  "A Harmonogram inner = none",
  classifyCostDocumentType(`umowa.zip → ${WM_HARMONOGRAM}`).type === "none",
);
assert(
  "A rzeczowo-finansowy.xlsx = none",
  classifyCostDocumentType("Zał. 3 rzeczowo-finansowy.xlsx").type === "none",
);
assert(
  "A financial schedule.xlsx = none",
  classifyCostDocumentType("financial schedule.xlsx").type === "none",
);
assert("A Formularz = none", classifyCostDocumentType("Formularz oferty.xlsx").type === "none");
assert("A przedmiar.pdf = pdf_przedmiar", classifyCostDocumentType("przedmiar.pdf").type === "pdf_przedmiar");
assert("A kosztorys_slepy.xlsx = xlsx", classifyCostDocumentType("kosztorys_slepy.xlsx").type === "xlsx");
assert("A STWiORB = none", classifyCostDocumentType(WM_STWIORB).type === "none");
assert("A ZIP→PDF przedmiar", classifyCostDocumentType(XI_PDF).type === "zip_pdf_przedmiar");
assert(
  "A outer XLSX without hint = none",
  classifyCostDocumentType("random-rates.xlsx").type === "none",
);
assert(
  "A outer XLSX with hint kept",
  classifyCostDocumentType("kosztorys ofertowy.xlsx").type === "xlsx"
    || classifyCostDocumentType("przedmiar_robot.xlsx").type === "xlsx",
);

const wmDisc = discoverBestCostDocument(
  [
    { filename: WM_HARMONOGRAM, score: 54 },
    { filename: WM_STWIORB, score: 38 },
    { filename: WM_OPZ_PDF, score: 38 },
    {
      filename: "TP167_Zal. nr 1 do SWZ - Formularz oferty.xlsx",
      score: 54,
    },
  ],
  {
    tenderTitle:
      "Remont i termomodernizacja budynku mieszkalnego przy ulicy Wyszyńskiego 105A we Wrocławiu",
  },
);
assert("B WM discovery found=false", wmDisc.found === false);
assert("B WM discovery type none", wmDisc.type === "none");
assert("B WM Harmonogram not winner", !/harmonogram/i.test(wmDisc.source || ""));

const xiDisc = discoverBestCostDocument(
  [
    { filename: WM_HARMONOGRAM, score: 54 },
    { filename: XI_PDF, score: 48, zipInnerPath: "Boczna przedmiar.pdf" },
    { filename: "Opis przedmiotu zamówienia.zip", score: 40 },
  ],
  { tenderTitle: "Remont wolnych lokali mieszkalnych paczka XI" },
);
assert("D Paczka XI PDF wins", xiDisc.found === true);
assert("D Paczka XI type zip_pdf_przedmiar", xiDisc.type === "zip_pdf_przedmiar");
assert("D Paczka XI source is PDF", /przedmiar\.pdf/i.test(xiDisc.source));
assert("D Paczka XI not Harmonogram", !/harmonogram/i.test(xiDisc.source));

assert("E WM classifier Harmonogram none", classifyCostDocumentType(WM_HARMONOGRAM).type === "none");
assert("E WM discover no fake winner", wmDisc.found === false);

console.log(`\nTender cost discovery: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
