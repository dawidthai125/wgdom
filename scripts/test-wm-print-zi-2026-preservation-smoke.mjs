/**
 * ZI Tauron 2026 — preservation gate (encrypted WM ZI.pdf + adres §4).
 * Źródło: wypełniony ZI.pdf użytkownika (Dawid / Thai Thanh / Stróża …).
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { parseJobAddressParts } from "../src/lib/wm-print/address-vars.ts";
import {
  countZiTauron2026PdfLibFields,
  generatePdfZiTauron2026,
  WM_PRINT_ZI_TAURON2026_FIELD_MAP,
} from "../src/lib/wm-print/generate-pdf-zi-tauron2026.ts";
import {
  extractZiTauron2026FormFieldsPdfJs,
  pickNonEmptyZiFormFields,
} from "../src/lib/wm-print/zi-tauron2026-form-extract.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";

const assert = (cond, msg) => {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
};

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

const DESKTOP_ZI = "C:/Users/dawid/Desktop/Dokumenty/ZI.pdf";
const FIXTURE_DIR = join(process.cwd(), "audit", "tauron-audit-2026-06-15");
const FIXTURE_ZI = join(FIXTURE_DIR, "zi-user-reference.pdf");

mkdirSync(FIXTURE_DIR, { recursive: true });
if (!existsSync(FIXTURE_ZI) && existsSync(DESKTOP_ZI)) {
  copyFileSync(DESKTOP_ZI, FIXTURE_ZI);
  console.log("Copied fixture:", FIXTURE_ZI);
}

assert(existsSync(FIXTURE_ZI), `fixture ZI.pdf — ${FIXTURE_ZI} (or ${DESKTOP_ZI})`);

const sourceBytes = new Uint8Array(readFileSync(FIXTURE_ZI));

const pdfLibBefore = await countZiTauron2026PdfLibFields(sourceBytes);
assert(pdfLibBefore < 50, `source is encrypted for pdf-lib (${pdfLibBefore} fields) — graft path required`);

const beforeFields = pickNonEmptyZiFormFields(await extractZiTauron2026FormFieldsPdfJs(sourceBytes));
assert(Object.keys(beforeFields).length >= 10, "source has user-filled fields (pdf.js)");

const PRESERVE = [
  { field: "Pole tekstowe 39", label: "DAWID", match: (v) => norm(v) === "dawid" },
  { field: "Pole tekstowe 40", label: "THAI THANH", match: (v) => norm(v) === "thai thanh" },
  { field: "Pole tekstowe 101", label: "STRÓŻA", match: (v) => norm(v).includes("stroz") || norm(v).includes("stróża") },
  { field: "Pole wyboru 39", label: "checkbox Tak", match: (v) => norm(v) === "tak" },
];

for (const p of PRESERVE) {
  const v = beforeFields[p.field];
  assert(v !== undefined && p.match(v), `before: ${p.label} (${p.field})`);
}

const EXPECTED_ADDR = { street: "Sępa Szarzyńskiego", building: "83", apartment: "7" };
const parts = parseJobAddressParts("Sępa Szarzyńskiego 83", "7");
assert(parts.street === EXPECTED_ADDR.street, "parse street");

const vars = buildWmPrintVariableMap(
  { address: "Sępa Szarzyńskiego 83", flatNumber: "7" },
  { defaultCity: "Wrocław", zipNameSuffix: "ODBIOR_WM" },
  { dateMode: "today" },
);

const outBytes = await generatePdfZiTauron2026(sourceBytes, vars);
const outPath = join(FIXTURE_DIR, "zi-2026-preservation-sepa-83-7.pdf");
writeFileSync(outPath, outBytes);

const doc = await getDocument({ data: outBytes, verbosity: 0 }).promise;
const afterFields = await doc.getFieldObjects();

for (const p of PRESERVE) {
  const v = afterFields?.[p.field]?.[0]?.value ?? "";
  assert(p.match(v), `after preserve: ${p.label} (${p.field}=${JSON.stringify(String(v))})`);
}

for (const [fieldName, varKey] of Object.entries(WM_PRINT_ZI_TAURON2026_FIELD_MAP)) {
  const val = afterFields?.[fieldName]?.[0]?.value ?? "";
  const expected = vars[varKey];
  assert(val === expected, `after §4: ${fieldName} = ${expected}`);
}

const report = {
  generatedAt: new Date().toISOString(),
  fixture: FIXTURE_ZI,
  sourcePdfLibFields: pdfLibBefore,
  beforeNonEmptyCount: Object.keys(beforeFields).length,
  beforeSample: beforeFields,
  preserveChecks: PRESERVE.map((p) => ({
    field: p.field,
    before: beforeFields[p.field],
    after: afterFields?.[p.field]?.[0]?.value ?? "",
  })),
  address: {
    "Pole tekstowe 99": afterFields?.["Pole tekstowe 99"]?.[0]?.value,
    "Pole tekstowe 111": afterFields?.["Pole tekstowe 111"]?.[0]?.value,
    "Pole tekstowe 112": afterFields?.["Pole tekstowe 112"]?.[0]?.value,
  },
  output: outPath,
  verdict: "PRESERVATION SMOKE PASS",
};

const reportPath = join(FIXTURE_DIR, "zi-2026-preservation-sepa-83-7-report.json");
writeFileSync(reportPath, JSON.stringify(report, null, 2));

console.log("\n=== ZI-2026 PRESERVATION SMOKE PASS ===");
console.log("Output:", outPath);
console.log("Report:", reportPath);
