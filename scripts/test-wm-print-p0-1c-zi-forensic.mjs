/**
 * P0.1C — ZI forensic: setText / getText / save / placeholdery + overlay widoczny tekst.
 */
import { PDFDocument } from "pdf-lib";
import {
  diagnoseZiPdfFieldFill,
  generatePdfFormFromTemplate,
} from "../src/lib/wm-print/generate-pdf.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";

const PROD_ZI_URL =
  "https://bdpygdvfgbggermvqtys.supabase.co/storage/v1/object/public/make-0afb8820-photos/jobs/wm-print/template-e911d6a5-3728-4089-bb9a-a4adec6e9c20-11e39e5c-7026-43d0-a3a2-3389203f46cb.pdf";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    console.error(`  ✗ ${msg}`);
  }
}

const vars = buildWmPrintVariableMap(
  { address: "Sępa Szarzyńskiego 83", flatNumber: "7" },
  DEFAULT_WM_PRINT_SETTINGS,
  { dateMode: "custom", customDate: new Date("2026-06-14T12:00:00") },
);

const WM_VAR = {
  "form1[0].Page1[0].TextField2[10]": "JOB_STREET",
  "form1[0].Page1[0].TextField2[9]": "JOB_BUILDING",
  "form1[0].Page1[0].TextField2[8]": "JOB_APARTMENT",
};

console.log("WM Print P0.1C — ZI forensic + visible overlay\n");

const templateBytes = new Uint8Array(await (await fetch(PROD_ZI_URL)).arrayBuffer());
const diag = await diagnoseZiPdfFieldFill(templateBytes, vars);

console.log("=== LOG: pole | wartość przed | wartość po setText ===\n");
console.log("| pole | idx | przed | po setText | setText? |");
console.log("|---|-----|-------|------------|----------|");
for (const row of diag.log) {
  const przed =
    row.valueBefore === undefined ? "(undefined)" : JSON.stringify(row.valueBefore);
  const po =
    row.valueAfterSetText === undefined ? "(undefined)" : JSON.stringify(row.valueAfterSetText);
  console.log(`| ${row.field} | ${row.index} | ${przed} | ${po} | ${row.setTextExecuted ? "TAK" : "NIE"} |`);
}

console.log("\n=== PO save() — getText() reload ===\n");
for (const row of diag.afterSave) {
  console.log(`  ${row.field} [${row.index}]: ${JSON.stringify(row.getText)}`);
}

console.log("\n=== placeholdery w bajtach output ===");
console.log(diag.placeholdersInOutput);

console.log("\n=== widoczny tekst w bajtach output (content stream) ===");
console.log(diag.visibleTextInOutput);

assert(vars.JOB_STREET === "Sępa Szarzyńskiego", "vars JOB_STREET");
assert(diag.log.every((r) => r.setTextExecuted), "setText wykonane dla 3 pól ZI");

for (const row of diag.log) {
  const key = WM_VAR[row.field];
  assert(row.valueAfterSetText === vars[key], `po setText ${key}`);
}

for (const row of diag.afterSave) {
  const key = WM_VAR[row.field];
  assert(row.getText === vars[key], `po save reload ${key}`);
}

assert(diag.placeholdersInOutput["{{JOB_STREET}}"] === 0, "brak {{JOB_STREET}} w bajtach");

const out = await generatePdfFormFromTemplate(templateBytes, vars);
await PDFDocument.load(out, { ignoreEncryption: true });
assert(out.length > templateBytes.length + 10_000, "output większy (embed font + overlay)");
assert(true, "generatePdfFormFromTemplate: PDF ładuje się po P0.1C");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
