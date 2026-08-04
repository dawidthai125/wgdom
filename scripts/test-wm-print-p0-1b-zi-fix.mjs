/**
 * P0.1B — ZI XFA field map + indeks fallback, prod PDF, Sępa Szarzyńskiego 83/7.
 */
import { PDFDocument, PDFTextField } from "pdf-lib";
import {
  generatePdfFormFromTemplate,
  inspectWmPrintPdfForm,
  WM_PRINT_ZI_PDF_FIELD_MAP,
  WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX,
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

console.log("WM Print P0.1B — ZI field map fix\n");
console.log("  vars:", {
  JOB_STREET: vars.JOB_STREET,
  JOB_BUILDING: vars.JOB_BUILDING,
  JOB_APARTMENT: vars.JOB_APARTMENT,
});

assert(vars.JOB_STREET === "Sępa Szarzyńskiego", "JOB_STREET = Sępa Szarzyńskiego");
assert(vars.JOB_BUILDING === "83", "JOB_BUILDING = 83");
assert(vars.JOB_APARTMENT === "7", "JOB_APARTMENT = 7");

assert(
  WM_PRINT_ZI_PDF_FIELD_MAP["form1[0].Page1[0].TextField2[10]"] === "JOB_STREET",
  "map: TextField2[10] → JOB_STREET",
);
assert(
  WM_PRINT_ZI_PDF_FIELD_MAP["form1[0].Page1[0].TextField2[9]"] === "JOB_BUILDING",
  "map: TextField2[9] → JOB_BUILDING",
);
assert(
  WM_PRINT_ZI_PDF_FIELD_MAP["form1[0].Page1[0].TextField2[8]"] === "JOB_APARTMENT",
  "map: TextField2[8] → JOB_APARTMENT",
);

const templateBytes = new Uint8Array(await (await fetch(PROD_ZI_URL)).arrayBuffer());
const inspection = await inspectWmPrintPdfForm(templateBytes);
assert(
  inspection.formType === "hybrid" || inspection.formType === "xfa",
  `typ formularza: hybrid/xfa (jest: ${inspection.formType})`,
);
assert(inspection.addressFieldNames.length >= 3, "inspekcja: ≥3 pola adresowe w mapowaniu");

// Legacy KV mapping (stare nazwy) — SSOT ZI i tak wygrywa
const legacyKvMapping = {
  Ulica: "JOB_STREET",
  "Numer budynku": "JOB_BUILDING",
  "Numer lokalu": "JOB_APARTMENT",
};

const out = await generatePdfFormFromTemplate(templateBytes, vars, legacyKvMapping, {
  legacyZiFieldFill: true,
});

let loaded;
try {
  loaded = await PDFDocument.load(out, { ignoreEncryption: true });
  assert(true, "ZI po wygenerowaniu: PDFDocument.load PASS");
} catch (e) {
  assert(false, `ZI uszkodzony: ${e}`);
}

if (loaded) {
  const textFields = loaded.getForm().getFields().filter((f) => f instanceof PDFTextField);
  const street = textFields[WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_STREET]?.getText();
  const building = textFields[WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_BUILDING]?.getText();
  const apartment = textFields[WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_APARTMENT]?.getText();

  assert(street === "Sępa Szarzyńskiego", `Pole ulica [10]: ${JSON.stringify(street)}`);
  assert(building === "83", `Pole budynek [9]: ${JSON.stringify(building)}`);
  assert(apartment === "7", `Pole lokal [8]: ${JSON.stringify(apartment)}`);

  const latin = new TextDecoder("latin1").decode(out.slice(0, 500_000));
  assert(!latin.includes("{{JOB_STREET}}"), "brak literal {{JOB_STREET}} w bajtach");
}

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
