/**
 * P2-H.5B — PDF przedmiar heuristic tests.
 * npx vite-node scripts/test-pdf-przedmiar-heuristic.mjs
 */
import {
  detectPdfPrzedmiarSignals,
  extractPdfPrzedmiarRows,
  normalizePdfBoqUnits,
  parsePdfPrzedmiarHeuristic,
  parsePdfPrzedmiarLine,
  PDF_PRZEDMIAR_UX_LINES,
  pdfPrzedmiarRowDedupKey,
  splitPdfBoqText,
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

/** WM PDF — jedna strona, j.m. ze spacją, wiele pozycji (TP182 pattern). */
const SAMPLE_WM_PAGE = `Nowowiejska OBMIAR Lp. Podstawa 1 d.1.1 KNR 4-04 0105-04 Rozebranie ścianek pełnych z cegły m 2 26.80 RAZEM 26.80 2 d.1.1 KNR 4-04 0404-05 Rozebranie ścianek działowych m 2 9.00 RAZEM 9.00 3 d.1.2 ZKNR C-1 0309-01 Izolacja gruntowanie podłoża m 2 9.90 RAZEM 9.90 4 KNR-W 4-01 0701-03 Odbicie tynków wewnętrznych m 2 25.00 RAZEM 25.00 5 NNRNKB 202 1134-02 Gruntowanie podłoży preparatami m 2 12.50 RAZEM 12.50`;

const SAMPLE_KNR_W = "17 d.1.3 KNR-W 4-01 0713-01 Przecieranie tynków wewnętrznych m 2 109.98";
const SAMPLE_KNR_AT = "24 d.1.4 KNR AT-22 0204-07 Okładziny ścienne z płytek m 2 19.02";

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

// P0 WM PDF Recovery — M1 unit normalization
assert("m1 m 2 -> m2", normalizePdfBoqUnits("powierzchnia m 2 26.80").includes("m2"));
assert("m1 m 3 -> m3", normalizePdfBoqUnits("objętość m 3 7.46").includes("m3"));
assert("m1 szt.", normalizePdfBoqUnits("szt. 12").includes("szt"));
assert("m1 kpl.", normalizePdfBoqUnits("kpl. 1").includes("kpl"));
const spacedLine = parsePdfPrzedmiarLine("1 KNR 401-01-01 Tynk gipsowy na ścianach m 2 12,5");
assert("spaced m 2 line", spacedLine?.unit === "m2" && spacedLine?.quantity === "12,5");

// Extended norms
const knrW = parsePdfPrzedmiarLine(SAMPLE_KNR_W);
assert("knr-w parse", knrW?.code.includes("KNR-W"));
const knrAt = parsePdfPrzedmiarLine(SAMPLE_KNR_AT);
assert("knr at parse", knrAt?.code.includes("KNR AT"));
const zknr = parsePdfPrzedmiarLine("11 d.1.2 ZKNR C-1 0309-01 Izolacja gruntowanie m 2 9.90");
assert("zknr parse", zknr?.code.includes("ZKNR"));
const nnrnkb = parsePdfPrzedmiarLine("19 d.1.3 NNRNKB 202 1134-02 Gruntowanie podłoży m 2 12.50");
assert("nnrnkb parse", nnrnkb?.code.includes("NNRNKB"));

// M2 split — WM page line
const wmSegments = splitPdfBoqText(SAMPLE_WM_PAGE);
assert("wm split segments >= 5", wmSegments.length >= 5);
const wmRows = extractPdfPrzedmiarRows(SAMPLE_WM_PAGE);
assert("wm page rows >= 5", wmRows.length >= 5);
assert("wm row knr-w", wmRows.some((r) => r.code.includes("KNR-W")));
assert("wm row zknr", wmRows.some((r) => r.code.includes("ZKNR")));

// TP196 — M4: WM „m” jako metry bieżące (mb)
console.log("\n=== TP196 M4 m → mb ===");
assert("TP196-1 m -> mb", normalizePdfBoqUnits("rurociąg m 5 m 5.00").includes("mb 5"));
assert("TP196-2 m2 unchanged", normalizePdfBoqUnits("powierzchnia m 2 26.80") === "powierzchnia m2 26.80");
assert("TP196-3 m3 unchanged", normalizePdfBoqUnits("objętość m 3 7.46") === "objętość m3 7.46");
const wmM5 = parsePdfPrzedmiarLine(
  "KNR 4-02 0230 Demontaż rurociągu z PCW o śr. do 50 mm m 5 m 5.00",
);
assert("TP196-4 WM m 5 line", wmM5?.unit === "mb" && wmM5?.quantity === "5");
const wmM6 = parsePdfPrzedmiarLine(
  "KNR-W 4-02 0120-01 Demontaż rurociągu o śr. 15-20 mm m 6 m 6.00",
);
assert("TP196-4b WM m 6 line", wmM6?.unit === "mb" && wmM6?.quantity === "6");

// TP197 — M5: kalk. własna bez KNR
console.log("\n=== TP197 M5 kalk. własna ===");
const kalkMb = parsePdfPrzedmiarLine(
  "41 d.2.1 kalk. własna Roboty pomocnicze przy montażu instalacji mb 24.50",
);
assert("TP197-1 kalk. własna + mb", kalkMb?.code.toLowerCase().includes("kalk") && kalkMb?.unit === "mb" && kalkMb?.quantity === "24.50");
const kalkM2 = parsePdfPrzedmiarLine(
  "42 d.2.2 kalkulacja własna Tynki uzupełniające na ścianach m 2 18.75",
);
assert("TP197-2 kalkulacja własna + m2", kalkM2?.unit === "m2" && kalkM2?.quantity === "18.75");
const kalkSzt = parsePdfPrzedmiarLine(
  "43 d.2.3 wycena własna Dostawa i montaż elementów szt 6",
);
assert("TP197-3 wycena własna + szt", kalkSzt?.unit === "szt" && kalkSzt?.quantity === "6");
const kalkSwz = parsePdfPrzedmiarLine(
  "SPECYFIKACJA WARUNKÓW ZAMÓWIENIA Wadium 5% kalkulacja własna szt 1",
);
assert("TP197-4 SWZ false positive blocked", kalkSwz == null);

// TP198A — dedup key (lp + unit + dłuższy opis)
console.log("\n=== TP198A dedup key ===");
function dedupCount(rowList) {
  const seen = new Set();
  let n = 0;
  for (const row of rowList) {
    const key = pdfPrzedmiarRowDedupKey(row);
    if (seen.has(key)) continue;
    seen.add(key);
    n += 1;
  }
  return n;
}
const baseDesc = "Wspólny prefix opisu pozycji przedmiaru robót budowlanych";
const rowLp10 = { lp: "10", code: "KNR 401-01-01", unit: "m2", quantity: "10", description: `${baseDesc} wariant A` };
const rowLp11 = { lp: "11", code: "KNR 401-01-01", unit: "m2", quantity: "10", description: `${baseDesc} wariant B` };
assert("TP198A-1 different lp not deduped", dedupCount([rowLp10, rowLp11]) === 2);
const rowMb = { lp: "12", code: "KNR 401-01-01", unit: "mb", quantity: "10", description: `${baseDesc} mb` };
const rowM2 = { lp: "12", code: "KNR 401-01-01", unit: "m2", quantity: "10", description: `${baseDesc} m2` };
assert("TP198A-2 different unit not deduped", dedupCount([rowMb, rowM2]) === 2);
const rowDescA = { lp: "13", code: "KNR 401-01-01", unit: "m2", quantity: "10", description: "Opis A — montaż parapetów zewnętrznych z aluminium" };
const rowDescB = { lp: "13", code: "KNR 401-01-01", unit: "m2", quantity: "10", description: "Opis B — montaż parapetów wewnętrznych z PCV" };
assert("TP198A-3 different description not deduped", dedupCount([rowDescA, rowDescB]) === 2);
const twin = { lp: "14", code: "KNR 202-08-03", unit: "szt", quantity: "12", description: "Montaż drzwi wewnętrznych" };
assert("TP198A-4 identical record deduped", dedupCount([twin, { ...twin }]) === 1);
const dupKnrDoc = `${SAMPLE_KNR.trim()}\n${SAMPLE_KNR.trim()}`;
assert("TP198A-4b extractPdfPrzedmiarRows dedup duplicate doc", extractPdfPrzedmiarRows(dupKnrDoc).length === 3);

// TP198B — kalk. własna po kotwicy KNR (bez Lp./d.X.Y)
console.log("\n=== TP198B kalk po KNR ===");
const kalkAfterKnr = parsePdfPrzedmiarLine(
  "KNR 4-01 0108-09 0108-10 kalk. własna Wywiezienie gruzu spryzmowanego samochodami skrzyniowymi na odległość 18 km m 3 1 m 3 1.00",
);
assert(
  "TP198B-1 KNR + kalk. własna",
  kalkAfterKnr?.code.toLowerCase().includes("kalk") &&
    kalkAfterKnr?.unit === "m3" &&
    kalkAfterKnr?.quantity === "1",
);

// TP198C — WM aliasy j.m. → szt
console.log("\n=== TP198C WM unit aliases ===");
const wypRow = parsePdfPrzedmiarLine(
  "KSNR 5 0404-01 Wypusty wykonywane przewodami wtynkowymi dzwonek wyp. 1 wyp. 1.00",
);
assert("TP198C-1 wyp.", wypRow?.unit === "szt" && wypRow?.quantity === "1.00");
const otwRow = parsePdfPrzedmiarLine(
  "KNR 4-03 1003-06 Mechaniczne przebijanie otworów śr.rury do 25 mm otw. 5 otw. 5.00",
);
assert("TP198C-2 otw.", otwRow?.unit === "szt" && otwRow?.quantity === "5.00");
const podejRow = parsePdfPrzedmiarLine(
  "KNR-W 2-15 0211-03 Dodatki za wykonanie podejść odpływowych PVC podej. 2 podej. 2.00",
);
assert("TP198C-3 podej.", podejRow?.unit === "szt" && podejRow?.quantity === "2.00");
const aparatRow = parsePdfPrzedmiarLine(
  "KNR 5-08 0401-08 Przygotowanie podłoża do zabudowania aparatów aparat 1 aparat 1.00",
);
assert("TP198C-4 aparat", aparatRow?.unit === "szt" && aparatRow?.quantity === "1.00");
const lokalRow = parsePdfPrzedmiarLine(
  "KNR INSTAL 0205-01 Próba szczelności instalacji gazowej lokal. 1 lokal. 1.00",
);
assert("TP198C-5 lokal.", lokalRow?.unit === "szt" && lokalRow?.quantity === "1.00");

// TP201D M5 — metr → mb + kalk marker-only fix
console.log("\n=== TP201D M5 metr + kalk marker ===");
assert("TP201D-1 metr bieżący norm", normalizePdfBoqUnits("rurociąg metr bieżący 12.5") === "rurociąg mb 12.5");
assert("TP201D-2 metr biezacy norm", normalizePdfBoqUnits("przewód metr biezacy 8") === "przewód mb 8");
assert("TP201D-3 metr biezący norm", normalizePdfBoqUnits("listwa metr biezący 3.5") === "listwa mb 3.5");
assert("TP201D-4 metr solo norm", normalizePdfBoqUnits("izolacja metr 15.00") === "izolacja mb 15.00");
const metrBiezacyRow = parsePdfPrzedmiarLine(
  "KNR 4-02 0230 Demontaż rurociągu z PCW metr bieżący 5.00",
);
assert("TP201D-5 metr bieżący line", metrBiezacyRow?.unit === "mb" && metrBiezacyRow?.quantity === "5.00");
const metrSoloRow = parsePdfPrzedmiarLine("KNR 4-02 0120 Demontaż rurociągu metr 6.00");
assert("TP201D-6 metr solo line", metrSoloRow?.unit === "mb" && metrSoloRow?.quantity === "6.00");
const kalkKpl = parsePdfPrzedmiarLine("9 d.1.1 kalk. własna 1 kpl. 1.00");
assert("TP201D-7 kalk kpl marker fix", kalkKpl?.code.toLowerCase().includes("kalk") && kalkKpl?.unit === "kpl" && kalkKpl?.quantity === "1.00");
assert("TP201D-7b kalk kpl desc", kalkKpl?.description === "Kalkulacja własna");
const kalkSztMarker = parsePdfPrzedmiarLine("34 d.1.5 kalk. własna 4 szt 4.00");
assert("TP201D-8 kalk szt marker fix", kalkSztMarker?.unit === "szt" && kalkSztMarker?.quantity === "4.00");
const kalkM3 = parsePdfPrzedmiarLine("153 d.3.7 kalk. własna 2.5 m 3 2.50");
assert("TP201D-9 kalk m3 marker fix", kalkM3?.unit === "m3" && kalkM3?.quantity === "2.50");
const metrSignals = detectPdfPrzedmiarSignals("Lp. KNR 401 metr bieżący 12 szt 3 kpl 1");
assert("TP201D-10 metr signal", metrSignals.includes("unit"));

console.log(`\nPDF przedmiar heuristic: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
