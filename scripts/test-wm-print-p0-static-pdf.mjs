/**
 * P0-A — statyczne PDF kopiowane 1:1 (bez latin1 replace).
 */
import { PDFDocument, StandardFonts } from "pdf-lib";
import { copyStaticPdfTemplate, generatePdfPlainFromTemplate } from "../src/lib/wm-print/generate-pdf.ts";
import { generateFromTemplateBytes, buildWmPrintFilesForJob } from "../src/lib/wm-print/generate-zip.ts";
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

function bytesEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

async function makeSamplePdf(label) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 200]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText(label, { x: 40, y: 150, size: 14, font });
  return doc.save();
}

console.log("WM Print P0-A — statyczne PDF copy-as-is\n");

const original = await makeSamplePdf("SEP certyfikat WM");
const vars = buildWmPrintVariableMap(
  { address: "Gorlicka 26", flatNumber: "6" },
  DEFAULT_WM_PRINT_SETTINGS,
  { dateMode: "today" },
);

const copied = copyStaticPdfTemplate(original);
assert(bytesEqual(copied, original), "copyStaticPdfTemplate: bajt w bajt");

const viaHelper = await generatePdfPlainFromTemplate(original, vars);
assert(bytesEqual(viaHelper, original), "generatePdfPlainFromTemplate: ignoruje vars, identyczny plik");

const pdfTemplate = {
  id: "tpl-sep",
  name: "SEP",
  kind: "generated",
  type: "pdf",
  enabled: true,
  sortOrder: 80,
  files: [
    {
      id: "f-sep",
      storagePath: "templates/sep.pdf",
      storageUrl: "https://example.com/sep.pdf",
      originalFileName: "SEP.pdf",
      sortOrder: 10,
      uploadedAt: "2026-06-14T00:00:00Z",
    },
  ],
  createdAt: "2026-06-01T00:00:00Z",
  updatedAt: "2026-06-01T00:00:00Z",
};

const fromBytes = await generateFromTemplateBytes(pdfTemplate, original, vars);
assert(fromBytes && bytesEqual(fromBytes, original), "generateFromTemplateBytes type=pdf: copy-as-is");

const job = { id: "j1", address: "Gorlicka 26", flatNumber: "6", status: "active" };
const fetchBytes = async () => original;
const zipItems = await buildWmPrintFilesForJob(
  job,
  [pdfTemplate],
  [],
  DEFAULT_WM_PRINT_SETTINGS,
  { dateMode: "today" },
  [pdfTemplate.id],
  fetchBytes,
);
assert(zipItems.length === 1, "ZIP pipeline: 1 plik PDF");
assert(bytesEqual(zipItems[0].bytes, original), "ZIP pipeline: identyczne bajty PDF");

const reloaded = await PDFDocument.load(zipItems[0].bytes);
assert(reloaded.getPageCount() === 1, "wygenerowany PDF otwiera się w pdf-lib");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
