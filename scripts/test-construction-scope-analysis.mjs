/**
 * P2 Construction Knowledge Engine — T01–T06.
 * npx vite-node scripts/test-construction-scope-analysis.mjs
 */
import {
  CONSTRUCTION_KEYWORDS,
  CONSTRUCTION_CATEGORY_LABELS,
  CONSTRUCTION_CATEGORY_ORDER,
  countConstructionKeywords,
} from "../src/lib/construction-keywords.ts";
import {
  analyzeConstructionScope,
  formatConstructionScopeForUi,
  buildConstructionScopeFromTenderDossier,
} from "../src/lib/construction-scope-analysis.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

function pct(analysis, categoryId) {
  return analysis.categoryBreakdown.find((r) => r.categoryId === categoryId)?.percentage ?? 0;
}

// T01 — Malowanie + gładzie → Wykończeniowe
console.log("\n--- T01 Wykończeniowe ---");
const t01 = analyzeConstructionScope({
  xlsxTexts: [
    "Malowanie ścian w pomieszczeniach",
    "Gładzie gipsowe na ścianach",
    "Szpachlowanie powierzchni",
  ],
});
console.log("  primary:", t01.primaryCategory, t01.primaryCategoryId, `${pct(t01, "wykończeniowe")}%`);
assert("T01 primary wykończeniowe", t01.primaryCategoryId === "wykończeniowe");
assert("T01 dominant pct high", pct(t01, "wykończeniowe") >= 70);

// T02 — Kanalizacja + wodociąg → Sanitarne
console.log("\n--- T02 Sanitarne ---");
const t02 = analyzeConstructionScope({
  catalogQuantities: [
    { lp: "1", description: "Kanalizacja deszczowa PVC", unit: "mb", quantity: "120" },
    { lp: "2", description: "Przyłącze wodociągowe", unit: "mb", quantity: "45" },
    { lp: "3", description: "Studnia rewizyjna", unit: "szt", quantity: "8" },
    { lp: "4", description: "Rury PE kanalizacyjne", unit: "mb", quantity: "200" },
  ],
});
console.log("  primary:", t02.primaryCategory, `${pct(t02, "sanitarne")}%`);
assert("T02 primary sanitarne", t02.primaryCategoryId === "sanitarne");
assert("T02 dominant pct high", pct(t02, "sanitarne") >= 70);

// T03 — Rozdzielnia + oświetlenie → Elektryczne
console.log("\n--- T03 Elektryczne ---");
const t03 = analyzeConstructionScope({
  xlsxTexts: [
    "Rozdzielnia główna RG",
    "Oświetlenie korytarzy — oprawy LED",
    "Okablowanie instalacji elektrycznej",
  ],
});
console.log("  primary:", t03.primaryCategory, `${pct(t03, "elektryczne")}%`);
assert("T03 primary elektryczne", t03.primaryCategoryId === "elektryczne");
assert("T03 confidence ok", t03.confidence >= 0.5);

// T04 — Kostka + chodnik → Drogowe
console.log("\n--- T04 Drogowe ---");
const t04 = analyzeConstructionScope({
  pdfText: `
Układanie kostki brukowej na chodniku
Warstwa podbudowy pod nawierzchnię
Odtworzenie nawierzchni jezdni
`,
});
console.log("  primary:", t04.primaryCategory, `${pct(t04, "drogowe")}%`);
assert("T04 primary drogowe", t04.primaryCategoryId === "drogowe");

// T05 — ATH mieszany → breakdown %
console.log("\n--- T05 ATH mieszany ---");
const t05 = analyzeConstructionScope({
  athParseResult: {
    ok: true,
    format: "ath",
    rows: [
      { lp: "1", description: "Malowanie ścian klatki", unit: "m2", quantity: "850" },
      { lp: "2", description: "Gładzie na ścianach", unit: "m2", quantity: "420" },
      { lp: "3", description: "Kanalizacja sanitarna w piwnicy", unit: "mb", quantity: "65" },
      { lp: "4", description: "Przyłącze wodociągowe", unit: "mb", quantity: "12" },
      { lp: "5", description: "Rozdzielnia elektryczna", unit: "szt", quantity: "1" },
      { lp: "6", description: "Oświetlenie klatki schodowej", unit: "szt", quantity: "24" },
      { lp: "7", description: "Płytki na podłodze korytarza", unit: "m2", quantity: "95" },
    ],
    categories: [
      { name: "Roboty wykończeniowe", level: 1 },
      { name: "Instalacje sanitarne", level: 1 },
      { name: "Instalacje elektryczne", level: 1 },
    ],
  },
});
console.log("  breakdown:", t05.categoryBreakdown.map((r) => `${r.category} ${r.percentage}%`).join(" · "));
assert("T05 multi category", t05.categoryBreakdown.length >= 3);
assert("T05 wykończeniowe present", pct(t05, "wykończeniowe") > 0);
assert("T05 sanitarne present", pct(t05, "sanitarne") > 0);
assert("T05 elektryczne present", pct(t05, "elektryczne") > 0);
assert("T05 sum 100", t05.categoryBreakdown.reduce((s, r) => s + r.percentage, 0) === 100);
assert("T05 primary wykończeniowe", t05.primaryCategoryId === "wykończeniowe");

// T06 — Brak słów kluczowych
console.log("\n--- T06 Brak słów kluczowych ---");
const t06 = analyzeConstructionScope({
  swzText: "Przedmiot zamówienia obejmuje roboty budowlane zgodnie z dokumentacją.",
  scopeDescription: "Zamówienie realizowane na podstawie SWZ.",
});
console.log("  confidence:", t06.confidence.toFixed(2), "keywords:", t06.matchedKeywords.length);
assert("T06 low confidence", t06.confidence < 0.45);
assert("T06 few keywords", t06.matchedKeywords.length <= 2);

// UI helper + dossier bridge
const ui = formatConstructionScopeForUi(t05);
assert("UI breakdown lines", ui.breakdownLines.length >= 3);
assert("UI dominant label", ui.dominantLabel.includes("Dominujący zakres"));

const fromDossier = buildConstructionScopeFromTenderDossier({
  kosztorys: {
    ok: true,
    sourceFilename: "przedmiar.ath",
    rowCount: 2,
    rows: [],
    przedmiar: [],
    categories: [],
    warnings: [],
    parsedAt: new Date().toISOString(),
    catalogQuantities: [
      { lp: "1", description: "Pokrycie dachowe blachą", unit: "m2", quantity: "320" },
      { lp: "2", description: "Montaż rynien", unit: "mb", quantity: "48" },
    ],
  },
});
assert("dossier bridge dachowe", fromDossier.primaryCategoryId === "dachowe");

// Metadata
const kwCount = countConstructionKeywords();
console.log("\n--- Metadata ---");
console.log("  categories:", CONSTRUCTION_CATEGORY_ORDER.join(", "));
console.log("  keyword count:", kwCount);
for (const id of CONSTRUCTION_CATEGORY_ORDER) {
  console.log(`  ${CONSTRUCTION_CATEGORY_LABELS[id]}: ${CONSTRUCTION_KEYWORDS[id].length} fraz`);
}
assert("keyword count > 50", kwCount > 50);
assert("5 categories", CONSTRUCTION_CATEGORY_ORDER.length === 5);

// Example analyses for report
console.log("\n--- Przykłady 3 przetargów ---");
const examples = [
  {
    name: "Remont lokalu — wykończenia",
    input: { xlsxTexts: ["Malowanie", "Gładzie", "Płytki gres", "Tapetowanie"] },
  },
  {
    name: "Przyłącza WM",
    input: {
      catalogQuantities: [
        { lp: "1", description: "Kanalizacja", unit: "mb", quantity: "10" },
        { lp: "2", description: "Wodociąg", unit: "mb", quantity: "10" },
      ],
    },
  },
  {
    name: "Chodnik gminny",
    input: { pdfText: "Kostka brukowa\nChodnik\nNawierzchnia bitumiczna" },
  },
];
for (const ex of examples) {
  const a = analyzeConstructionScope(ex.input);
  console.log(`  ${ex.name}: ${a.primaryCategory} (${Math.round(a.confidence * 100)}% pewności)`);
  console.log(`    ${a.categoryBreakdown.map((r) => `${r.category} ${r.percentage}%`).join(" | ")}`);
}

console.log(`\nP2 construction scope: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
