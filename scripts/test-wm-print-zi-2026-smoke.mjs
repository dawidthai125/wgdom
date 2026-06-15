/**
 * ZI Tauron 2026 — smoke test (Sępa Szarzyńskiego 83/7).
 * Weryfikuje fill pól 99/111/112 + dopasowanie pozycji do etykiet §4.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseJobAddressParts } from "../src/lib/wm-print/address-vars.ts";
import {
  generatePdfZiTauron2026,
  inspectZiTauron2026Fill,
  WM_PRINT_ZI_TAURON2026_FIELD_MAP,
} from "../src/lib/wm-print/generate-pdf-zi-tauron2026.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";

const assert = (cond, msg) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
};

const EXPECTED = {
  street: "Sępa Szarzyńskiego",
  building: "83",
  apartment: "7",
};

const SPATIAL = {
  "Pole tekstowe 99": { label: "Ulica", x: 24.52, y: 584.69 },
  "Pole tekstowe 111": { label: "Numer budynku", x: 388.68, y: 584.92 },
  "Pole tekstowe 112": { label: "Numer lokalu", x: 486.72, y: 584.92 },
};

const templatePath = join(process.cwd(), "public", "wm-print", "zi-tauron-2026-template.pdf");
const templateBytes = new Uint8Array(readFileSync(templatePath));

const parts = parseJobAddressParts("Sępa Szarzyńskiego 83", "7");
assert(parts.street === EXPECTED.street, "parse street");
assert(parts.building === EXPECTED.building, "parse building");
assert(parts.apartment === EXPECTED.apartment, "parse apartment");

const vars = buildWmPrintVariableMap(
  { address: "Sępa Szarzyńskiego 83", flatNumber: "7" },
  { defaultCity: "Wrocław", zipNameSuffix: "ODBIOR_WM" },
  { dateMode: "today" },
);

const filled = await inspectZiTauron2026Fill(templateBytes, vars);
assert(filled["Pole tekstowe 99"] === EXPECTED.street, "field 99 = street");
assert(filled["Pole tekstowe 111"] === EXPECTED.building, "field 111 = building");
assert(filled["Pole tekstowe 112"] === EXPECTED.apartment, "field 112 = apartment");

const outBytes = await generatePdfZiTauron2026(templateBytes, vars);
const outDir = join(process.cwd(), "audit", "tauron-audit-2026-06-15");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, "zi-2026-smoke-sepa-83-7.pdf");
writeFileSync(outPath, outBytes);

const doc = await getDocument({ data: outBytes, verbosity: 0 }).promise;
const fields = await doc.getFieldObjects();

for (const [fieldName, varKey] of Object.entries(WM_PRINT_ZI_TAURON2026_FIELD_MAP)) {
  const val = fields?.[fieldName]?.[0]?.value ?? "";
  const expected = vars[varKey];
  assert(val === expected, `pdf.js ${fieldName} = ${expected} (got ${val})`);
}

const spatialReport = [];
for (const [fieldName, spec] of Object.entries(SPATIAL)) {
  const f = fields?.[fieldName]?.[0];
  assert(f, `pdf.js has field ${fieldName}`);
  const dx = Math.abs((f.rect?.[0] ?? 0) - spec.x);
  const dy = Math.abs((f.rect?.[1] ?? 0) - spec.y);
  assert(dx < 1 && dy < 1, `${fieldName} rect matches §4 ${spec.label} slot (x=${f.rect[0].toFixed(2)} y=${f.rect[1].toFixed(2)})`);
  spatialReport.push({
    field: fieldName,
    label: spec.label,
    value: f.value,
    rect: f.rect,
  });
}

const kod102 = fields?.["Pole tekstowe 102"]?.[0]?.value ?? "";
assert(kod102 === "", "field 102 (Kod pocztowy) remains empty");

const report = {
  generatedAt: new Date().toISOString(),
  fixture: EXPECTED,
  mapping: WM_PRINT_ZI_TAURON2026_FIELD_MAP,
  spatialReport,
  output: outPath,
  verdict: "SMOKE PASS",
};

const reportPath = join(outDir, "zi-2026-smoke-sepa-83-7-report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log("\n=== ZI-2026 SMOKE PASS ===");
console.log("Output:", outPath);
console.log("Report:", reportPath);
console.log("Spatial:", spatialReport);
console.log("Manual gate: otwórz PDF w Edge — §4 dolny wiersz: Ulica | 83 | 7");
