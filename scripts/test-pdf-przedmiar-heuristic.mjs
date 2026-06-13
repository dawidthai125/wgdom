/**
 * P2-H.5B — PDF przedmiar heuristic tests.
 * npx vite-node scripts/test-pdf-przedmiar-heuristic.mjs
 */
import {
  detectPdfPrzedmiarSignals,
  extractPdfPrzedmiarRows,
  parsePdfPrzedmiarHeuristic,
  parsePdfPrzedmiarLine,
  PDF_PRZEDMIAR_UX_LINES,
} from "../src/lib/pdf-przedmiar-heuristic.ts";

const SAMPLE_KNR = `
PRZEDMIAR ROBÓT BUDOWLANYCH
Lp. Podstawa Opis pozycji J.m. Ilość
1 KNR 401-01-01 Wykonanie tynków wewnętrznych gipsowych m2 125,40
2 KNR 202-08-03 Montaż drzwi wewnętrznych szt 12
3 KNNR 4-01-02 Demontaż stolarki drzwiowej mb 45,5
`;

const SAMPLE_KNNR = `
Lp. Opis J.m. Ilość
1 KNNR 2-01-05 Roboty rozbiórkowe ścian murowanych m3 8,20
2 KNNR 7-03-01 Montaż parapetów zewnętrznych mb 16
`;

const SAMPLE_NO_KNR = `
Lp. Opis J.m. Ilość
1 Roboty ziemne pod fundamenty m2 100
2 Uzgodnienia projektowe kpl 1
`;

const SAMPLE_SWZ = `
SPECYFIKACJA WARUNKÓW ZAMÓWIENIA
Przedmiot zamówienia: remont budynku użyteczności publicznej
Termin składania ofert: 30 dni od publikacji ogłoszenia
Wadium: 5% wartości zamówienia
Kryteria oceny ofert: cena 60%, termin 40%
`;

const SAMPLE_STWIOR = `
STANDARDY WYKONANIA I ODBIORU ROBÓT BUDOWLANYCH
Rozdział 4. Tynki i gładzie
Materiał powinien być zgodny z projektem technicznym.
Dopuszczalna wilgotność podłoża przed aplikacją tynku.
`;

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

// KNR detection signals
const knrSignals = detectPdfPrzedmiarSignals(SAMPLE_KNR);
assert("knr signals >= 3", knrSignals.length >= 3);
assert("knr has knr signal", knrSignals.includes("knr"));
assert("knr has lp signal", knrSignals.includes("lp"));
assert("knr has jm signal", knrSignals.includes("jm"));

// Row extraction KNR
const knrRows = extractPdfPrzedmiarRows(SAMPLE_KNR);
assert("knr rows count", knrRows.length === 3);
assert("knr row1 code", knrRows[0].code.includes("KNR"));
assert("knr row1 unit m2", knrRows[0].unit === "m2");
assert("knr row1 qty", knrRows[0].quantity === "125,40");
assert("knr row1 category UNKNOWN", knrRows[0].category === "UNKNOWN");
assert("knr row3 knnr", knrRows[2].code.includes("KNNR"));

// KNNR only file
const knnrParsed = parsePdfPrzedmiarHeuristic(SAMPLE_KNNR);
assert("knnr case 1", knnrParsed.uxCase === 1);
assert("knnr rows", knnrParsed.rows.length === 2);

// PDF bez KNR — sygnały bez wierszy
const noKnrParsed = parsePdfPrzedmiarHeuristic(SAMPLE_NO_KNR);
assert("no knr signals", noKnrParsed.signalCount >= 3);
assert("no knr case 2", noKnrParsed.uxCase === 2);
assert("no knr zero rows", noKnrParsed.rows.length === 0);

// SWZ — false positive guard
const swzParsed = parsePdfPrzedmiarHeuristic(SAMPLE_SWZ);
assert("swz low signals", swzParsed.signalCount < 3);
assert("swz case 2", swzParsed.uxCase === 2);
assert("swz no rows", swzParsed.rows.length === 0);

// STWIOR — brak tabeli przedmiaru
const stwiorParsed = parsePdfPrzedmiarHeuristic(SAMPLE_STWIOR);
assert("stwior case 2", stwiorParsed.uxCase === 2);
assert("stwior no rows", stwiorParsed.rows.length === 0);

// Scan — likelyScan
const scanParsed = parsePdfPrzedmiarHeuristic(SAMPLE_KNR, { likelyScan: true });
assert("scan case 3", scanParsed.uxCase === 3);
assert("scan no rows", scanParsed.rows.length === 0);
assert("scan warning", scanParsed.warnings[0] === PDF_PRZEDMIAR_UX_LINES[3]);

// P2-H.5C — brak warstwy tekstowej
const noTextParsed = parsePdfPrzedmiarHeuristic("", { noTextLayer: true });
assert("no text layer case 3", noTextParsed.uxCase === 3);
assert("no text layer zero rows", noTextParsed.rows.length === 0);
assert("no text layer warning", noTextParsed.warnings[0].includes("warstwy tekstowej"));

const noTextPage0 = parsePdfPrzedmiarHeuristic("", { noTextLayer: true, likelyScan: false });
assert("page0 chars0 case 3", noTextPage0.uxCase === 3);

// Single line parser
const line = parsePdfPrzedmiarLine("1 KNR 401-01-01 Tynk gipsowy na ścianach m2 12,5");
assert("line parse ok", line?.code.includes("KNR"));
assert("line qty", line?.quantity === "12,5");

// UMiG-style filename row (Kąty pattern)
const katyLine = parsePdfPrzedmiarLine("12 KNR 4-01-02 Remont posadzki w łazience m2 8,75");
assert("katy line", katyLine?.quantity === "8,75");

console.log(`\nPDF przedmiar heuristic: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
