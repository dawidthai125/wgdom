/**
 * P2-D.4 — audyt pokrycia analizy przetargów.
 * npx vite-node scripts/test-tender-analysis-coverage.mjs
 */
import {
  FILE_TYPE_SUPPORT,
  TBS_00266295_DOCUMENTS,
  ANALYSIS_COVERAGE_GAPS,
  buildDocumentCoverageRows,
  buildCoverageTraceReport,
  selectParseCandidates,
  pickSingleSwzAnalysisTarget,
  fileCapabilities,
  classifyDocumentType,
} from "../src/lib/tender-analysis-coverage.ts";
import { parseSwzPlainText, parseWadiumFromSwzText } from "../src/lib/tenders-bzp-swz.ts";
import { extractAwardCriteria } from "../src/lib/tenders-bzp-fit.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name); }
}

// B — wsparcie typów
assert("pdf swz supported", FILE_TYPE_SUPPORT.find((r) => r.ext === "pdf")?.swzAnalysis === true);
assert("ath kosztorys supported", FILE_TYPE_SUPPORT.find((r) => r.ext === "ath")?.kosztorys === true);
assert("7z not supported", FILE_TYPE_SUPPORT.find((r) => r.ext === "7z")?.supported === false);
assert("zip supported", FILE_TYPE_SUPPORT.find((r) => r.ext === "zip")?.supported === true);

// A — TBS 00266295 coverage simulation
const swzTarget = pickSingleSwzAnalysisTarget(TBS_00266295_DOCUMENTS);
assert("tbs picks modyfik swz", /modyfik.*swz/i.test(swzTarget ?? ""));

const candidates = selectParseCandidates(TBS_00266295_DOCUMENTS);
const selected = candidates.filter((c) => c.selected);
assert("tbs parse candidates <= 6", selected.length <= 6);
assert("tbs ath in candidates", selected.some((c) => /\.ath$/i.test(c.filename)));
assert("tbs xlsx in candidates", selected.some((c) => /\.xlsx$/i.test(c.filename)));
assert("tbs 7z not in capabilities", fileCapabilities("dokumentacja.7z").supported === false);

const coverageRows = buildDocumentCoverageRows(TBS_00266295_DOCUMENTS, {
  swzAnalysisTarget: swzTarget,
  parseCandidates: selected.map((c) => c.filename),
  parsedKosztorys: null,
  extractedValue: false,
  extractedCriteria: false,
  extractedEstimate: false,
});
const trace = buildCoverageTraceReport(coverageRows);
assert("tbs trace 15 docs", trace.length === 15);
assert("tbs only 1 swz analyzed", coverageRows.filter((r) => r.swzAnalyzed).length === 1);
assert("tbs 7z not downloaded", coverageRows.find((r) => r.ext === "7z")?.downloaded === false);

console.log("\n--- TBS 00266295 Analysis Coverage (symulacja) ---");
for (const r of coverageRows) {
  console.log(
    `${r.docType.padEnd(16)} | ${r.filename.slice(0, 42).padEnd(42)} | SWZ:${r.swzAnalyzed ? "Y" : "n"} | K:${r.kosztorysParsed ? "Y" : "n"} | ${r.notes[0] ?? ""}`,
  );
}

// C — wartość zamówienia
const valueText = `
Wartość zamówienia: 2 450 000,00 zł brutto
Wysokość wadium: 6% wartości zamówienia
`;
const valueParsed = parseSwzPlainText(valueText, { source: "pdf" });
assert("value parser finds pln", valueParsed.estimatedValuePln === 2_450_000);

const noValueSwz = parseSwzPlainText(`
Wniesienie wadium: Tak
Wysokość wadium: 6% wartości zamówienia
Termin realizacji: 120 dni
`, { source: "pdf" });
assert("modyfik swz without value field", noValueSwz.estimatedValuePln == null);
assert("modyfik swz has days", noValueSwz.implementationDays === 120);

// D — kryteria oceny
const criteriaText = `
Kryteria oceny ofert:
Cena oferty - 60 %
Termin realizacji - 20 %
Okres gwarancji - 20 %
`;
const criteria = extractAwardCriteria(criteriaText);
assert("criteria 3 found", criteria.length >= 3);
assert("criteria price 60", criteria.some((c) => /cen/i.test(c.name) && c.weightPct === 60));

const swzWithCrit = parseSwzPlainText(criteriaText, { source: "pdf" });
// parseSwzPlainText alone does not set awardCriteria — enrichSwzFromText does in pipeline
assert("plain parse no awardCriteria field", swzWithCrit.awardCriteria == null);

// E — kosztorys typy (bez pdf.js w Node)
assert("pdf not kosztorys ext", fileCapabilities("obmiar.pdf").kosztorys === false);
assert("ath kosztorys ext", fileCapabilities("Kosztorys.ath").kosztorys === true);
assert("xlsx kosztorys ext", fileCapabilities("Przedmiar.xlsx").kosztorys === true);

// P2-E.0 — pozostałe ograniczenia
assert("gap 7z unsupported note", typeof ANALYSIS_COVERAGE_GAPS.sevenZipUnsupported === "string");
assert("gap pdf no kosztorys", typeof ANALYSIS_COVERAGE_GAPS.pdfNoKosztorys === "string");

// klasyfikacja typów
assert("classify stwior", classifyDocumentType("STWIOR_TBS.pdf") === "stwior");
assert("classify obmiar", classifyDocumentType("Obmiar_robot.pdf") === "obmiar");

// regresja wadium (krótko)
const w = parseWadiumFromSwzText("Wadium 6% wartości", "6%", null);
assert("wadium pct label", w.wadiumPercent === 6);

console.log("\n--- Coverage Gaps (SSOT) ---");
for (const [k, v] of Object.entries(ANALYSIS_COVERAGE_GAPS)) {
  console.log(`• ${k}: ${v}`);
}

console.log("\n--- Trace sample (modyfik SWZ) ---");
const modRow = trace.find((t) => /modyfik.*swz/i.test(t.document));
if (modRow) {
  console.log(JSON.stringify(modRow, null, 2));
}

console.log("\nSUMMARY:", { pass, fail });
process.exit(fail > 0 ? 1 : 0);
