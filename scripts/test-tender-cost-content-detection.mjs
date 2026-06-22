/**
 * P1 Smart Cost Document Detection — T01–T05.
 * npx vite-node scripts/test-tender-cost-content-detection.mjs
 */
import * as XLSX from "xlsx";
import {
  scoreCostDocumentContent,
  scoreCostDocumentFromXlsxBytes,
  isOfferFormXlsxBytes,
} from "../src/lib/tender-cost-content-detection.ts";
import {
  classifyCostDocumentType,
  discoverBestCostDocument,
} from "../src/lib/tender-cost-discovery.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

function xlsxBytes(rowsBySheet) {
  const wb = XLSX.utils.book_new();
  for (const [name, rows] of Object.entries(rowsBySheet)) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  }
  return new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
}

// T01 — Formularz oferty
console.log("\n--- T01 Formularz oferty ---");
const formText = `
Wykonawca
KRS 0000123456
REGON 123456789
CEIDG
NIP 1234567890
Formularz oferty
Podpis
Adres wykonawcy
Telefon
E-mail test@firma.pl
`;
const t01 = scoreCostDocumentContent(formText);
console.log("  score:", t01.score, "class:", t01.classification, "conf:", t01.confidence.toFixed(2));
console.log("  negatives:", t01.negativeMatches.join(", "));
assert("T01 classification offer_form", t01.classification === "offer_form");
assert("T01 confidence high", t01.confidence >= 0.6);

const t01Bytes = xlsxBytes({
  Oferta: [
    ["Wykonawca", ""],
    ["KRS", "0000123456"],
    ["REGON", "123456789"],
    ["CEIDG", ""],
    ["Podpis", ""],
  ],
});
const t01Parse = isOfferFormXlsxBytes(t01Bytes);
assert("T01 parseXlsx rejects offer form", t01Parse === true);

// T02 — Przedmiar budowlany
console.log("\n--- T02 Przedmiar budowlany ---");
const przedText = `
Malowanie ścian m2 1250
Tynki gładzie m2 450
Rozbiórka roboty budowlane m3 12
Kanalizacja mb 85
`;
const t02 = scoreCostDocumentContent(przedText);
console.log("  score:", t02.score, "class:", t02.classification, "conf:", t02.confidence.toFixed(2));
console.log("  positives:", t02.positiveMatches.slice(0, 8).join(", "));
assert("T02 classification bill_of_quantities", t02.classification === "bill_of_quantities");
assert("T02 confidence high", t02.confidence >= 0.6);
assert("T02 has m2", t02.positiveMatches.includes("m2"));
assert("T02 has malowanie", t02.positiveMatches.includes("malowanie"));

// T03 — KNR + m2 + m3
console.log("\n--- T03 Kosztorys KNR ---");
const knrText = `
Pozycja KNR 2-02-01 roboty ziemne m3 120
Kanalizacja KNNR 4-01 mb 45
Tynkowanie m2 890
Cena jednostkowa wartość
`;
const t03 = scoreCostDocumentContent(knrText);
console.log("  score:", t03.score, "class:", t03.classification, "conf:", t03.confidence.toFixed(2));
assert("T03 classification cost_estimate", t03.classification === "cost_estimate");
assert("T03 confidence high", t03.confidence >= 0.6);
assert("T03 has KNR", t03.positiveMatches.some((m) => /KNR/i.test(m)));

// T04 — TP113 formularz nie może wygrać
console.log("\n--- T04 TP113 ---");
const TP113_FORM =
  "TP113_Zal. nr 1 do SWZ - Formularz oferty - Remont i przebudowa Sępa Szarzyńskiego 65A.xlsx";
const TP113_ZIP_ATH =
  "DOKUMENTACJA PROJEKTOWA.zip → SEPA 65A - SANITARNY - zest.ATH";

const tp113FormContent = scoreCostDocumentContent(formText);
const tp113Cands = [
  {
    filename: TP113_FORM,
    score: 54,
    contentScore: tp113FormContent,
  },
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
console.log("  winner:", tp113Disc.source, "type:", tp113Disc.type);
assert("T04 formularz classified offer_form", tp113FormContent.classification === "offer_form");
assert("T04 formularz not winner", !tp113Disc.source.includes("Formularz oferty"));
assert("T04 ATH wins", tp113Disc.type === "zip_ath");

// ambiguous filename — content saves discovery
const ambiguousXlsx = "zalacznik_3.xlsx";
assert(
  "T04 ambiguous xlsx classified by name",
  classifyCostDocumentType(ambiguousXlsx).type === "xlsx",
);
const ambiguousDisc = discoverBestCostDocument([
  { filename: ambiguousXlsx, score: 60, contentScore: tp113FormContent },
  { filename: TP113_ZIP_ATH, score: 45, zipInnerPath: "x.ATH" },
]);
assert("T04 ambiguous xlsx skipped by content", !ambiguousDisc.source.includes("zalacznik_3"));

// T05 — ATH nadal wygrywa nad XLSX z wysokim content score
console.log("\n--- T05 ATH > XLSX ---");
const strongPrzedmiar = scoreCostDocumentContent(przedText);
const t05Disc = discoverBestCostDocument([
  {
    filename: "przedmiar_robot.xlsx",
    score: 80,
    contentScore: strongPrzedmiar,
  },
  {
    filename: "arch.7z → koszt.ath",
    score: 28,
    zipInnerPath: "koszt.ath",
  },
]);
console.log("  winner:", t05Disc.source, "type:", t05Disc.type);
assert("T05 ATH type", t05Disc.type === "zip_ath");
assert("T05 ATH source", t05Disc.source.includes(".ath"));

// xlsx vs pdf — content boost doesn't beat ATH priority
const t05b = discoverBestCostDocument([
  { filename: "przedmiar.xlsx", score: 90, contentScore: strongPrzedmiar },
  { filename: "pakiet.zip → zestaw.ATH", score: 30, zipInnerPath: "zestaw.ATH" },
]);
assert("T05b ATH over boosted xlsx", t05b.type === "zip_ath");

// bytes helper
const przedBytes = xlsxBytes({
  Przedmiar: [
    ["Lp", "Opis", "J.m.", "Ilość"],
    ["1", "Malowanie ścian", "m2", "1250"],
    ["2", "Tynki", "m2", "450"],
    ["3", "Rozbiórka", "m3", "12"],
  ],
});
const fromBytes = scoreCostDocumentFromXlsxBytes(przedBytes);
assert("bytes helper bill_of_quantities", fromBytes.classification === "bill_of_quantities");

console.log(`\nP1 cost content detection: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
