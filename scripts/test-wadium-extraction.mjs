/**
 * Wadium extraction from SWZ — regresja bugfix Logintrade.
 * npx vite-node scripts/test-wadium-extraction.mjs
 */
import {
  parseWadiumFromSwzText,
  parseSwzPlainText,
  isWeakWadiumRaw,
  formatSwzWadiumDisplay,
} from "../src/lib/tenders-bzp-swz.ts";
import { summarizeSwzFindings as summarizeFromBidPrep } from "../src/lib/tenders-bid-prep.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

function noTak6(raw) {
  return raw == null || !/^tak\s*6$/i.test(String(raw).trim());
}

// procenty
for (const pct of [6, 3, 1.5]) {
  const label = pct === 1.5 ? "1,5" : String(pct);
  const text = `Wysokość wadium: ${label}% wartości zamówienia`;
  const r = parseWadiumFromSwzText(text, `${label}% wartości zamówienia`, 1_000_000);
  assert(`percent ${pct} pln`, r.wadiumPercent === pct && r.wadiumPln === Math.round(1_000_000 * pct / 100));
  assert(`percent ${pct} label`, r.wadiumRaw?.includes("%") && noTak6(r.wadiumRaw));
}

// kwoty PLN
assert("6000 zł", parseWadiumFromSwzText("Wysokość wadium: 6 000,00 zł", "6 000,00 zł", null).wadiumPln === 6000);
assert("60000 zł", parseWadiumFromSwzText("Wysokość wadium: 60 000,00 zł", "60 000,00 zł", null).wadiumPln === 60_000);
assert("600000 zł", parseWadiumFromSwzText("Wysokość wadium: 600 000,00 zł", "600 000,00 zł", null).wadiumPln === 600_000);

// wadium + wartość zamówienia — nie myli z wartością
const mixedValue = `
Wartość zamówienia: 1 250 000,00 zł
Wysokość wadium: 6% wartości zamówienia
`;
const mixed = parseSwzPlainText(mixedValue, { source: "pdf" });
assert("mixed value 1.25M", mixed.estimatedValuePln === 1_250_000);
assert("mixed wadium 75k", mixed.wadiumPln === 75_000);
assert("mixed not order value as wadium", mixed.wadiumPln !== mixed.estimatedValuePln);

// wadium + termin realizacji
const withDays = `
Wadium wymagane: Tak, w wysokości 6% wartości zamówienia
Termin realizacji: 120 dni
`;
const daysParsed = parseSwzPlainText(withDays, { source: "pdf" });
assert("with days wadium pct", daysParsed.wadiumPercent === 6);
assert("with days 120", daysParsed.implementationDays === 120);
assert("with days no tak6", noTak6(daysParsed.wadiumRaw));

// modyfikacja SWZ — „Tak 6” + % w oknie
const modSwz = `
Wniesienie wadium: Tak
Wysokość wadium wynosi 6% wartości netto zamówienia
Termin realizacji: 120 dni
`;
const modParsed = parseSwzPlainText(modSwz, { source: "pdf", sourceFilename: "2026_06_01_modyfik_SWZ_modernizacja_klatek_23_2026.pdf" });
assert("mod swz percent", modParsed.wadiumPercent === 6);
assert("mod swz raw normalized", modParsed.wadiumRaw === "6% wartości zamówienia");
assert("mod swz days", modParsed.implementationDays === 120);

// bug case: Tak 6 bez wartości zamówienia
const bug = parseWadiumFromSwzText("Wadium: Tak 6 % wartości zamówienia", "Tak 6", null);
assert("bug tak6 percent without value", bug.wadiumPercent === 6 && bug.wadiumRaw === "6% wartości zamówienia");
assert("bug tak6 not weak display", !isWeakWadiumRaw(bug.wadiumRaw));

// implicit Tak 6 → 6% gdy brak % w tekście (heurystyka)
const implicit = parseWadiumFromSwzText("Wadium: Tak 6", "Tak 6", null);
assert("implicit tak6", implicit.wadiumPercent === 6 && implicit.wadiumRaw?.includes("6%"));

// UI / toast
const toastSwz = parseSwzPlainText("Wadium: Tak 6 % wartości. Termin realizacji: 120 dni", { source: "pdf" });
const toast = summarizeFromBidPrep(toastSwz);
assert("toast no Tak 6", !toast.includes("Tak 6"));
assert("toast has percent", toast.includes("6%"));

const display = formatSwzWadiumDisplay({ wadiumPercent: 6, wadiumPln: null, wadiumRaw: "Tak 6" });
assert("display format", display === "6% wartości zamówienia");

// nie obcina zer z 60000
assert("no truncate 60000", parseWadiumFromSwzText("wadium 60 000 zł", "60 000 zł", null).wadiumPln === 60_000);

console.log("\nSUMMARY:", { pass, fail });
process.exit(fail > 0 ? 1 : 0);
