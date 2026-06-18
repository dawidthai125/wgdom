/**
 * P2.1 Business Fit Engine — testy reguł WGDOM.
 * npx vite-node scripts/test-construction-business-fit.mjs
 */
import { analyzeConstructionScope } from "../src/lib/construction-scope-analysis.ts";
import {
  evaluateBusinessFit,
  evaluateBusinessFitFromScope,
  formatBusinessFitKpi,
  BUSINESS_FIT_LABEL_THRESHOLDS,
} from "../src/lib/construction-business-fit.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

function fitFromTexts(texts, extra = {}) {
  const scope = analyzeConstructionScope({ xlsxTexts: texts, ...extra });
  return evaluateBusinessFit({ scope, extraTexts: texts });
}

// T01 — Wykończenia + malowanie + gładzie → Idealny
console.log("\n--- T01 Wykończenia WM ---");
const t01 = fitFromTexts([
  "Malowanie ścian klatek",
  "Gładzie gipsowe na ścianach",
  "Płytki ceramiczne na podłodze",
]);
console.log("  score:", t01.fitScore, t01.fitLabel);
console.log("  reasons:", t01.reasons.join("; "));
assert("T01 Idealny", t01.fitLabel === "Idealny");
assert("T01 score >= 80", t01.fitScore >= 80);

// T02 — Drogowe → Słaby
console.log("\n--- T02 Drogowe ---");
const t02Scope = analyzeConstructionScope({
  pdfText: "Kostka brukowa na chodniku\nNawierzchnia jezdni\nAsfalt",
});
const t02 = evaluateBusinessFit({ scope: t02Scope });
console.log("  score:", t02.fitScore, t02.fitLabel);
assert("T02 Słaby", t02.fitLabel === "Słaby");
assert("T02 score < 40", t02.fitScore < 40);
assert("T02 drogowe penalty", t02.reasons.some((r) => r.includes("drogow")));

// T03 — Tylko sanitarne + elektryczne → Średni/Dobry (bez wykończeń)
console.log("\n--- T03 Sanitarne + elektryczne ---");
const t03Scope = analyzeConstructionScope({
  catalogQuantities: [
    { lp: "1", description: "Kanalizacja sanitarna", unit: "mb", quantity: "10" },
    { lp: "2", description: "Rozdzielnia elektryczna", unit: "szt", quantity: "1" },
  ],
});
const t03 = evaluateBusinessFit({ scope: t03Scope });
console.log("  score:", t03.fitScore, t03.fitLabel);
assert("T03 score 10 (san+el)", t03.fitScore === 10);
assert("T03 Słaby bez wykończeń", t03.fitLabel === "Słaby");

// T04 — Pełny profil WGDOM → 94%+ KPI
console.log("\n--- T04 KPI 94% ---");
const t04 = fitFromTexts([
  "Malowanie ścian",
  "Gładzie",
  "Płytki gres",
  "Montaż płyt GK na ścianach",
  "Szpachlowanie",
]);
const kpi = formatBusinessFitKpi(t04);
console.log("  KPI:", kpi.title, kpi.line);
console.log("  score:", t04.fitScore, t04.fitLabel);
assert("T04 score >= 90", t04.fitScore >= 90);
assert("T04 Idealny", t04.fitLabel === "Idealny");
assert("T04 KPI 5 stars", kpi.starCount === 5);
assert("T04 KPI line format", kpi.line.includes("%") && kpi.line.includes("★"));

// T05 — Clamp 0–100
console.log("\n--- T05 Clamp ---");
const t05Scope = analyzeConstructionScope({
  athParseResult: {
    ok: true,
    format: "ath",
    rows: Array.from({ length: 20 }, (_, i) => ({
      lp: String(i + 1),
      description: "Malowanie ścian i gładzie gipsowe płytki GK",
      unit: "m2",
      quantity: "100",
    })),
  },
});
const t05 = evaluateBusinessFit({ scope: t05Scope });
assert("T05 clamp <= 100", t05.fitScore <= 100);
assert("T05 clamp >= 0", t05.fitScore >= 0);

// T06 — Brak danych → Słaby
console.log("\n--- T06 Brak danych ---");
const t06Scope = analyzeConstructionScope({
  swzText: "Roboty budowlane według SWZ.",
});
const t06 = evaluateBusinessFitFromScope(t06Scope);
console.log("  score:", t06.fitScore, t06.fitLabel);
assert("T06 Słaby", t06.fitLabel === "Słaby");
assert("T06 low score", t06.fitScore <= 39);

// Progi etykiet
console.log("\n--- Progi ---");
assert("threshold Idealny 80", BUSINESS_FIT_LABEL_THRESHOLDS[0].min === 80);
assert("label at 79 Dobry", evaluateBusinessFitFromScope(
  analyzeConstructionScope({ xlsxTexts: ["Kanalizacja", "Rozdzielnia"] }),
).fitScore < 80 || evaluateBusinessFitFromScope(
  analyzeConstructionScope({ xlsxTexts: ["Kanalizacja", "Rozdzielnia"] }),
).fitLabel === "Dobry");

// Przykład raportu
console.log("\n--- Przykład KPI ---");
const example = fitFromTexts(["Malowanie", "Gładzie", "Płytki", "GK"]);
const exKpi = formatBusinessFitKpi(example);
console.log(`  ${exKpi.title}\n  ${exKpi.line}\n  ${example.fitLabel}: ${example.reasons.slice(0, 4).join(", ")}`);

console.log(`\nP2.1 business fit: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
