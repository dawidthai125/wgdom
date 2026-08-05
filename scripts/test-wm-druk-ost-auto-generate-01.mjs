/**
 * WM-DRUK-OST-AUTO-GENERATE-01 S2 — Hard Ensure:
 * ACTIVE OST w ZIP mimo deselect; fill JOB_STREET/BUILDING/APARTMENT; brak regresji innych.
 * npx vite-node scripts/test-wm-druk-ost-auto-generate-01.mjs
 */
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { WM_PRINT_OST_PDF_FIELD_MAPPING } from "../src/lib/wm-print/default-templates.ts";
import {
  buildWmPrintDeliveryZipBytes,
  buildWmPrintFilesForJob,
  WM_PRINT_ZIP_FOLDER_ODBIORY,
} from "../src/lib/wm-print/generate-zip.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";
import {
  isActiveWmPrintOstTemplate,
  mergeActiveOstIntoWmPrintTemplatePool,
} from "../src/lib/wm-print/templates.ts";
import {
  deselectAllWmPrintTemplates,
  ensureActiveOstInWmPrintTemplateSelection,
  toggleWmPrintTemplateSelection,
} from "../src/lib/wm-print/template-selection.ts";

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

async function makeOstAcroFormPdf(fieldNames) {
  const doc = await PDFDocument.create();
  const page = doc.addPage([500, 400]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("OST S2 fixture", { x: 40, y: 360, size: 12, font });
  const form = doc.getForm();
  let y = 300;
  for (const name of fieldNames) {
    form.createTextField(name).addToPage(page, { x: 120, y, width: 200, height: 18 });
    y -= 28;
  }
  return doc.save({ useObjectStreams: false });
}

async function makeStaticPdf() {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  return doc.save({ useObjectStreams: false });
}

console.log("WM-DRUK-OST-AUTO-GENERATE-01 S2 smoke\n");

const now = new Date().toISOString();
const ostBytes = await makeOstAcroFormPdf(["JOB_STREET", "BUILDING", "APARTMENT", "JOB_CITY"]);
const staticBytes = await makeStaticPdf();

const ost = {
  id: "ost-s2",
  name: "OST",
  kind: "generated",
  type: "pdf_form",
  enabled: true,
  sortOrder: 70,
  files: [
    {
      id: "ost-file-1",
      storagePath: "ost",
      storageUrl: "mem://ost",
      originalFileName: "Druk-OST.pdf",
      sortOrder: 10,
      uploadedAt: now,
    },
  ],
  pdfFieldMapping: { ...WM_PRINT_OST_PDF_FIELD_MAPPING },
  createdAt: now,
  updatedAt: now,
};

const izba = {
  id: "izba-s2",
  name: "Izba",
  kind: "generated",
  type: "pdf",
  enabled: true,
  sortOrder: 80,
  files: [
    {
      id: "izba-file-1",
      storagePath: "izba",
      storageUrl: "mem://izba",
      originalFileName: "Izba.pdf",
      sortOrder: 10,
      uploadedAt: now,
    },
  ],
  createdAt: now,
  updatedAt: now,
};

assert(isActiveWmPrintOstTemplate(ost), "isActiveWmPrintOstTemplate(OST+files)");
assert(
  !isActiveWmPrintOstTemplate({ ...ost, files: [] }),
  "bez plików ≠ ACTIVE",
);

const poolWithout = [izba];
const merged = mergeActiveOstIntoWmPrintTemplatePool([ost, izba], poolWithout);
assert(
  merged.some((t) => t.id === ost.id) && merged.some((t) => t.id === izba.id),
  "mergeActiveOst: OST dołączony do pool bez OST",
);
assert(
  mergeActiveOstIntoWmPrintTemplatePool([ost, izba], [ost, izba]).length === 2,
  "mergeActiveOst: brak duplikatu gdy OST już w pool",
);

let sel = new Set([ost.id, izba.id]);
sel = toggleWmPrintTemplateSelection(sel, ost.id, [ost, izba]);
assert(sel.has(ost.id) && sel.has(izba.id), "nie można odznaczyć ACTIVE OST (toggle no-op)");

const deselected = deselectAllWmPrintTemplates([ost, izba]);
assert(deselected.has(ost.id) && !deselected.has(izba.id), "Odznacz wszystko: OST zostaje");

const ensured = ensureActiveOstInWmPrintTemplateSelection([ost, izba], new Set());
assert(ensured.has(ost.id), "ensureActiveOstInSelection");

const job = { id: "job-s2", address: "Gorlicka 26", flatNumber: "6" };
const fetchBytes = async (url) => {
  if (url === "mem://ost") return new Uint8Array(ostBytes);
  if (url === "mem://izba") return new Uint8Array(staticBytes);
  throw new Error(`unexpected url ${url}`);
};

// Deselect OST in selected ids — S2 must still generate OST
const files = await buildWmPrintFilesForJob(
  job,
  [ost, izba],
  [],
  DEFAULT_WM_PRINT_SETTINGS,
  { dateMode: "custom", customDate: new Date("2026-08-05T12:00:00") },
  [izba.id],
  fetchBytes,
);

const ostFile = files.find((f) => f.templateId === ost.id);
const izbaFile = files.find((f) => f.templateId === izba.id);
assert(!!ostFile, "1. ACTIVE OST w plikach mimo selected=[Izba]");
assert(!!izbaFile, "3. Izba nadal w paczce (brak regresji)");

const filled = await PDFDocument.load(ostFile.bytes);
const form = filled.getForm();
assert(form.getTextField("JOB_STREET").getText() === "Gorlicka", "2. JOB_STREET");
assert(form.getTextField("BUILDING").getText() === "26", "2. BUILDING");
assert(form.getTextField("APARTMENT").getText() === "6", "2. APARTMENT");

const { bytes, odbiorCount } = await buildWmPrintDeliveryZipBytes(
  job,
  [ost, izba],
  [],
  DEFAULT_WM_PRINT_SETTINGS,
  { dateMode: "custom", customDate: new Date("2026-08-05T12:00:00") },
  [izba.id],
  fetchBytes,
);
assert(odbiorCount >= 2, `ZIP odbiorCount >= 2 (jest ${odbiorCount})`);

const zip = await JSZip.loadAsync(bytes);
const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
const ostEntry = names.find((n) => n.startsWith(`${WM_PRINT_ZIP_FOLDER_ODBIORY}/`) && /ost|druk-ost/i.test(n));
const izbaEntry = names.find((n) => n.startsWith(`${WM_PRINT_ZIP_FOLDER_ODBIORY}/`) && /izba/i.test(n));
assert(!!ostEntry, `1. ZIP zawiera OST (${ostEntry || "brak"})`);
assert(!!izbaEntry, `3. ZIP zawiera Izba (${izbaEntry || "brak"})`);

const ostZipBytes = new Uint8Array(await zip.file(ostEntry).async("uint8array"));
const ostZipForm = (await PDFDocument.load(ostZipBytes)).getForm();
assert(ostZipForm.getTextField("JOB_STREET").getText() === "Gorlicka", "ZIP fill JOB_STREET");
assert(ostZipForm.getTextField("BUILDING").getText() === "26", "ZIP fill BUILDING");
assert(ostZipForm.getTextField("APARTMENT").getText() === "6", "ZIP fill APARTMENT");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
