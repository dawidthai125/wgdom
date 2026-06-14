/**
 * P0-B — ZI pdf_form: bez flatten, pola adresowe, plik otwieralny.
 */
import { PDFDocument, StandardFonts } from "pdf-lib";
import {
  generatePdfFormFromTemplate,
  inspectWmPrintPdfForm,
  WM_PRINT_ZI_PDF_FIELD_MAP,
} from "../src/lib/wm-print/generate-pdf.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";

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

async function makeZiLikeFormPdf() {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 400]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("ZI - zgloszenie gotowosci instalacji", { x: 40, y: 360, size: 12, font });

  const form = doc.getForm();
  form.createTextField("Ulica").addToPage(page, { x: 120, y: 280, width: 200, height: 20 });
  form.createTextField("Numer budynku").addToPage(page, { x: 120, y: 250, width: 80, height: 20 });
  form.createTextField("Numer lokalu").addToPage(page, { x: 120, y: 220, width: 80, height: 20 });
  form.createTextField("Inne pole").addToPage(page, { x: 120, y: 190, width: 200, height: 20 });

  return doc.save();
}

console.log("WM Print P0-B — ZI pdf_form\n");

const templateBytes = await makeZiLikeFormPdf();
const inspection = await inspectWmPrintPdfForm(templateBytes);

assert(inspection.formType === "acroform", `typ formularza: AcroForm (jest: ${inspection.formType})`);
assert(inspection.fieldCount === 4, `liczba pól: 4 (jest: ${inspection.fieldCount})`);
assert(inspection.fieldNames.includes("Ulica"), "pole: Ulica");
assert(inspection.fieldNames.includes("Numer budynku"), "pole: Numer budynku");
assert(inspection.fieldNames.includes("Numer lokalu"), "pole: Numer lokalu");
assert(inspection.addressFieldNames.length === 3, "3 pola adresowe w mapowaniu ZI");

console.log("\n  Raport inspekcji ZI (fixture):");
console.log(`    typ: ${inspection.formType}`);
console.log(`    pola (${inspection.fieldCount}): ${inspection.fieldNames.join(", ")}`);
console.log(`    adresowe: ${inspection.addressFieldNames.join(", ")}`);
console.log(`    mapowanie: ${Object.keys(WM_PRINT_ZI_PDF_FIELD_MAP).join(", ")}\n`);

const vars = buildWmPrintVariableMap(
  { address: "Gorlicka 26", flatNumber: "6" },
  DEFAULT_WM_PRINT_SETTINGS,
  { dateMode: "custom", customDate: new Date("2026-06-14T12:00:00") },
);

const out = await generatePdfFormFromTemplate(templateBytes, vars, {
  Ulica: "JOB_STREET",
  "Numer budynku": "JOB_BUILDING",
  "Numer lokalu": "JOB_APARTMENT",
});

let loaded;
try {
  loaded = await PDFDocument.load(out);
  assert(true, "ZI po wygenerowaniu: PDFDocument.load PASS (otwieralny)");
} catch (e) {
  assert(false, `ZI po wygenerowaniu: uszkodzony — ${e}`);
}

if (loaded) {
  const form = loaded.getForm();
  assert(form.getTextField("Ulica").getText() === "Gorlicka", "ZI: Ulica = Gorlicka");
  assert(form.getTextField("Numer budynku").getText() === "26", "ZI: Numer budynku = 26");
  assert(form.getTextField("Numer lokalu").getText() === "6", "ZI: Numer lokalu = 6");
  assert((form.getTextField("Inne pole").getText() ?? "") === "", "ZI: inne pole nietknięte");
  assert(
    !vars.JOB_ADDRESS || form.getTextField("Inne pole").getText() !== vars.JOB_ADDRESS,
    "ZI: nie wypełnia JOB_ADDRESS w niezmapowanych polach",
  );
}

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
