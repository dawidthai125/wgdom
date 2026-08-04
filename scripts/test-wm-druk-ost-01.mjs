/**
 * WM-DRUK-OST-01 — smoke: seed OST · thin guard · mapping aliases · generateFromTemplateBytes.
 * Fixture AcroForm (synthetic) — Gate na prawdziwym WM-Druk-OST.pdf = Owner upload / OV.
 */
import { PDFDocument, PDFTextField, StandardFonts } from "pdf-lib";
import { createWmPrintSeedTemplates, WM_PRINT_OST_PDF_FIELD_MAPPING } from "../src/lib/wm-print/default-templates.ts";
import {
  detectWmPrintPdfFormType,
  generatePdfFormFromTemplate,
} from "../src/lib/wm-print/generate-pdf.ts";
import { generateFromTemplateBytes } from "../src/lib/wm-print/generate-zip.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";
import { WM_PRINT_VARIABLE_KEYS } from "../src/lib/wm-print/types.ts";

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

async function makeOstAcroFormPdf(fieldNames, { padTo = 0 } = {}) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 400]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("WM-Druk-OST fixture", { x: 40, y: 360, size: 12, font });
  const form = doc.getForm();
  let y = 300;
  for (const name of fieldNames) {
    form.createTextField(name).addToPage(page, { x: 120, y, width: 200, height: 18 });
    y -= 28;
  }
  while (padTo > 0 && form.getFields().filter((f) => f instanceof PDFTextField).length < padTo) {
    const i = form.getFields().length;
    form.createTextField(`Pad${i}`).addToPage(page, { x: 10, y: 10, width: 20, height: 10 });
  }
  return doc.save({ useObjectStreams: false });
}

console.log("WM-DRUK-OST-01 smoke\n");

// --- Seed ---
const seeded = createWmPrintSeedTemplates();
const ost = seeded.find((t) => t.name === "OST");
assert(!!ost, "seed zawiera slot OST");
assert(ost?.type === "pdf_form", "OST type = pdf_form");
assert(ost?.kind === "generated", "OST kind = generated");
assert(ost?.pdfFieldMapping?.BUILDING === "JOB_BUILDING", "mapping BUILDING → JOB_BUILDING");
assert(ost?.pdfFieldMapping?.APARTMENT === "JOB_APARTMENT", "mapping APARTMENT → JOB_APARTMENT");
assert(ost?.pdfFieldMapping?.JOB_STREET === "JOB_STREET", "mapping JOB_STREET");
assert(ost?.pdfFieldMapping?.JOB_CITY === "JOB_CITY", "mapping JOB_CITY");
assert(
  WM_PRINT_OST_PDF_FIELD_MAPPING["{{BUILDING}}"] === "JOB_BUILDING",
  "alias {{BUILDING}} w SSOT mapping const",
);

assert(!WM_PRINT_VARIABLE_KEYS.includes("BUILDING"), "brak klucza SSOT BUILDING");
assert(!WM_PRINT_VARIABLE_KEYS.includes("APARTMENT"), "brak klucza SSOT APARTMENT");

const zi = seeded.find((t) => t.name === "ZI");
assert(zi?.type === "pdf_form", "ZI seed nietknięty (pdf_form)");

// --- Vars / city ---
const vars = buildWmPrintVariableMap(
  { address: "Gorlicka 26", flatNumber: "6" },
  { ...DEFAULT_WM_PRINT_SETTINGS, defaultCity: "" },
  { dateMode: "custom", customDate: new Date("2026-08-04T12:00:00") },
);
assert(vars.JOB_STREET === "Gorlicka", "JOB_STREET z adresu");
assert(vars.JOB_BUILDING === "26", "JOB_BUILDING z adresu");
assert(vars.JOB_APARTMENT === "6", "JOB_APARTMENT");
assert(vars.JOB_CITY === "Wrocław", "JOB_CITY fallback Wrocław (puste defaultCity)");

// --- Gate-like: mały AcroForm ---
const fieldNames = ["JOB_STREET", "BUILDING", "APARTMENT", "JOB_CITY"];
const smallBytes = await makeOstAcroFormPdf(fieldNames);
assert(detectWmPrintPdfFormType(smallBytes) === "acroform", "fixture formType = acroform (Gate-like)");

// --- Thin guard: mapping-only + pad fields (index 22/23/24 istniałyby przy legacy) ---
const templateBytes = await makeOstAcroFormPdf(fieldNames, { padTo: 25 });
const textCount = (await PDFDocument.load(templateBytes))
  .getForm()
  .getFields()
  .filter((f) => f instanceof PDFTextField).length;
assert(textCount >= 25, `fixture ma ≥25 pól tekstowych (jest: ${textCount})`);

const out = await generatePdfFormFromTemplate(templateBytes, vars, WM_PRINT_OST_PDF_FIELD_MAPPING);
const loaded = await PDFDocument.load(out);
const form = loaded.getForm();
assert(form.getTextField("JOB_STREET").getText() === "Gorlicka", "fill JOB_STREET");
assert(form.getTextField("BUILDING").getText() === "26", "fill BUILDING alias → building");
assert(form.getTextField("APARTMENT").getText() === "6", "fill APARTMENT alias → apartment");
assert(form.getTextField("JOB_CITY").getText() === "Wrocław", "fill JOB_CITY");

const pads = form
  .getFields()
  .filter((f) => f instanceof PDFTextField && f.getName().startsWith("Pad"));
const dirtyPads = pads.filter((f) => (f.getText() ?? "").length > 0);
assert(dirtyPads.length === 0, "thin guard: brak wypełnienia Pad* (index fallback OFF)");

// --- Empty mapping: no ZI LiveCycle auto-fill ---
const outEmpty = await generatePdfFormFromTemplate(templateBytes, vars, {});
const formEmpty = (await PDFDocument.load(outEmpty)).getForm();
assert((formEmpty.getTextField("BUILDING").getText() ?? "") === "", "bez mappingu: BUILDING puste");
assert((formEmpty.getTextField("JOB_STREET").getText() ?? "") === "", "bez mappingu: JOB_STREET puste");

// --- generateFromTemplateBytes dispatch (non-ZI pdf_form) ---
const ostTpl = {
  ...ost,
  id: "ost-smoke",
  name: "OST",
  type: "pdf_form",
  kind: "generated",
  pdfFieldMapping: { ...WM_PRINT_OST_PDF_FIELD_MAPPING },
};
const viaZip = await generateFromTemplateBytes(ostTpl, templateBytes, vars);
assert(!!viaZip && viaZip.length > 0, "generateFromTemplateBytes(OST) zwraca PDF");
const viaForm = (await PDFDocument.load(viaZip)).getForm();
assert(viaForm.getTextField("BUILDING").getText() === "26", "dispatch OST → mapping fill");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
