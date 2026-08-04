/**
 * WM-DRUK-OST-MAPPING-MIGRATION-01 — smoke AC-01…05
 * npx vite-node scripts/test-wm-druk-ost-mapping-migration-01.mjs
 */
import { PDFDocument, PDFTextField, StandardFonts } from "pdf-lib";
import { WM_PRINT_OST_PDF_FIELD_MAPPING } from "../src/lib/wm-print/default-templates.ts";
import {
  hasNonEmptyWmPrintPdfFieldMapping,
  migrateOstPdfFieldMapping,
} from "../src/lib/wm-print/ost-pdf-field-mapping-migration.ts";
import { generateFromTemplateBytes } from "../src/lib/wm-print/generate-zip.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";

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

function ostSlot(overrides = {}) {
  return {
    id: "ost-hist-1",
    name: "OST",
    kind: "generated",
    type: "pdf_form",
    enabled: true,
    sortOrder: 70,
    files: [],
    createdAt: "2026-08-04T00:00:00.000Z",
    updatedAt: "2026-08-04T00:00:00.000Z",
    ...overrides,
  };
}

console.log("WM-DRUK-OST-MAPPING-MIGRATION-01 smoke\n");

// AC-01 — historical OST without mapping
{
  const { templates, migratedCount } = migrateOstPdfFieldMapping([ostSlot()]);
  assert(migratedCount === 1, "AC-01 migratedCount === 1 for OST without mapping");
  assert(hasNonEmptyWmPrintPdfFieldMapping(templates[0].pdfFieldMapping), "AC-01 mapping non-empty");
  assert(
    JSON.stringify(templates[0].pdfFieldMapping) === JSON.stringify({ ...WM_PRINT_OST_PDF_FIELD_MAPPING }),
    "AC-01 mapping equals WM_PRINT_OST_PDF_FIELD_MAPPING",
  );
}

// AC-04 — do not overwrite existing
{
  const custom = { JOB_STREET: "JOB_STREET" };
  const before = ostSlot({ pdfFieldMapping: { ...custom }, updatedAt: "2026-01-01T00:00:00.000Z" });
  const { templates, migratedCount } = migrateOstPdfFieldMapping([before]);
  assert(migratedCount === 0, "AC-04 migratedCount === 0 when mapping exists");
  assert(JSON.stringify(templates[0].pdfFieldMapping) === JSON.stringify(custom), "AC-04 mapping unchanged");
  assert(templates[0].updatedAt === before.updatedAt, "AC-04 updatedAt unchanged");
}

// empty {} migrates
{
  const { migratedCount, templates } = migrateOstPdfFieldMapping([ostSlot({ pdfFieldMapping: {} })]);
  assert(migratedCount === 1, "empty {} is migrated");
  assert(hasNonEmptyWmPrintPdfFieldMapping(templates[0].pdfFieldMapping), "{} → SSOT mapping");
}

// filters: wrong name / type
{
  const izba = {
    id: "i1",
    name: "Izba",
    kind: "generated",
    type: "pdf",
    enabled: true,
    sortOrder: 1,
    files: [],
    createdAt: "x",
    updatedAt: "x",
  };
  const sep = { ...izba, id: "s1", name: "SEP" };
  const zi = {
    ...izba,
    id: "z1",
    name: "ZI",
    type: "pdf_form",
    pdfFieldMapping: { "Pole tekstowe 95": "JOB_STREET" },
  };
  const otherForm = { ...ostSlot({ id: "x1", name: "OTHER", type: "pdf_form" }) };
  const { migratedCount, templates } = migrateOstPdfFieldMapping([izba, sep, zi, otherForm, ostSlot()]);
  assert(migratedCount === 1, "AC-05 only OST pdf_form without mapping migrates");
  assert(templates[0].pdfFieldMapping === undefined, "Izba untouched");
  assert(templates[1].pdfFieldMapping === undefined, "SEP untouched");
  assert(hasNonEmptyWmPrintPdfFieldMapping(templates[2].pdfFieldMapping), "ZI mapping preserved");
  assert(templates[3].pdfFieldMapping === undefined, "OTHER pdf_form not migrated");
}

// Idempotency second pass
{
  const once = migrateOstPdfFieldMapping([ostSlot()]);
  const twice = migrateOstPdfFieldMapping(once.templates);
  assert(twice.migratedCount === 0, "idempotent second pass migratedCount === 0");
}

// AC-02 + AC-03 — mapping != null → setText on fixture AcroForm
{
  const doc = await PDFDocument.create();
  const page = doc.addPage([400, 300]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  page.drawText("fixture", { x: 20, y: 260, size: 12, font });
  const form = doc.getForm();
  for (const name of ["JOB_STREET", "BUILDING", "APARTMENT"]) {
    form.createTextField(name).addToPage(page, { x: 40, y: 200, width: 120, height: 16 });
  }
  const bytes = await doc.save({ useObjectStreams: false });

  const { templates } = migrateOstPdfFieldMapping([ostSlot()]);
  const ost = templates[0];
  assert(ost.pdfFieldMapping != null, "AC-02 mapping != null after migration");

  const vars = buildWmPrintVariableMap(
    { address: "3 Maja 4a", flatNumber: "2" },
    DEFAULT_WM_PRINT_SETTINGS,
    { dateMode: "today" },
  );
  const out = await generateFromTemplateBytes(ost, bytes, vars);
  assert(out != null && out.byteLength > 0, "generateFromTemplateBytes returns PDF");

  const filled = await PDFDocument.load(out);
  const f = filled.getForm();
  assert(f.getTextField("JOB_STREET").getText() === "3 Maja", "AC-03 JOB_STREET setText");
  assert(f.getTextField("BUILDING").getText() === "4a", "AC-03 BUILDING setText");
  assert(f.getTextField("APARTMENT").getText() === "2", "AC-03 APARTMENT setText");
}

console.log(`\nResult: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
