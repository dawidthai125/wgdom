/**
 * WM-DRUK-OST-MAPPING-MIGRATION-01 — FILL TRACE (fixture AcroForm)
 * Po migracji: mapping != null · setTextExecuted > 0
 * npx vite-node scripts/trace-wm-druk-ost-mapping-migration-01.mjs
 *
 * AR-NOTE AC-03: fixture z polami JOB_STREET/BUILDING/APARTMENT.
 * Prod PDF bez tych nazw AcroForm → setText może być 0 mimo mapping != null (osobny epic PDF).
 */
import { PDFDocument, StandardFonts } from "pdf-lib";
import { WM_PRINT_OST_PDF_FIELD_MAPPING } from "../src/lib/wm-print/default-templates.ts";
import {
  hasNonEmptyWmPrintPdfFieldMapping,
  migrateOstPdfFieldMapping,
} from "../src/lib/wm-print/ost-pdf-field-mapping-migration.ts";
import { generateFromTemplateBytes } from "../src/lib/wm-print/generate-zip.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";

const before = {
  id: "43df486a-f9a7-46fd-bb69-83363ca345ea",
  name: "OST",
  kind: "generated",
  type: "pdf_form",
  enabled: true,
  sortOrder: 70,
  files: [{ id: "f1", fileName: "Druk-OST.pdf", url: "fixture", uploadedAt: "2026-08-04T00:00:00.000Z" }],
  createdAt: "2026-08-04T00:00:00.000Z",
  updatedAt: "2026-08-04T00:00:00.000Z",
  pdfFieldMapping: null,
};

const { templates, migratedCount } = migrateOstPdfFieldMapping([before]);
const ost = templates[0];

const doc = await PDFDocument.create();
const page = doc.addPage([400, 300]);
const font = await doc.embedFont(StandardFonts.Helvetica);
page.drawText("OST mapping migration TRACE fixture", { x: 20, y: 260, size: 10, font });
const form = doc.getForm();
for (const name of ["JOB_STREET", "BUILDING", "APARTMENT", "JOB_CITY"]) {
  form.createTextField(name).addToPage(page, { x: 40, y: 180, width: 140, height: 16 });
}
const bytes = await doc.save({ useObjectStreams: false });

const vars = buildWmPrintVariableMap(
  { address: "3 Maja 4a", flatNumber: "2" },
  DEFAULT_WM_PRINT_SETTINGS,
  { dateMode: "today" },
);

/** Count setText by comparing before/after via generate path */
const out = await generateFromTemplateBytes(ost, bytes, vars);
const filled = await PDFDocument.load(out);
const f = filled.getForm();

const fieldTrace = ["JOB_STREET", "BUILDING", "APARTMENT", "JOB_CITY"].map((name) => {
  const text = f.getTextField(name).getText() ?? "";
  const expected =
    name === "JOB_STREET"
      ? vars.JOB_STREET
      : name === "BUILDING"
        ? vars.JOB_BUILDING
        : name === "APARTMENT"
          ? vars.JOB_APARTMENT
          : vars.JOB_CITY;
  const setTextExecuted = text === expected && expected.length > 0;
  return { field: name, valueAfter: text, expected, setTextExecuted };
});

const setTextCount = fieldTrace.filter((r) => r.setTextExecuted).length;

const report = {
  epic: "WM-DRUK-OST-MAPPING-MIGRATION-01",
  verdict:
    hasNonEmptyWmPrintPdfFieldMapping(ost.pdfFieldMapping) && setTextCount > 0 ? "PASS" : "FAIL",
  before: { pdfFieldMapping: before.pdfFieldMapping },
  migration: {
    migratedCount,
    mappingNonNull: ost.pdfFieldMapping != null,
    mappingNonEmpty: hasNonEmptyWmPrintPdfFieldMapping(ost.pdfFieldMapping),
    mappingEqualsSsot:
      JSON.stringify(ost.pdfFieldMapping) === JSON.stringify({ ...WM_PRINT_OST_PDF_FIELD_MAPPING }),
  },
  vars: {
    JOB_STREET: vars.JOB_STREET,
    JOB_BUILDING: vars.JOB_BUILDING,
    JOB_APARTMENT: vars.JOB_APARTMENT,
    JOB_CITY: vars.JOB_CITY,
  },
  setTextCount,
  fieldTrace,
  note: "Fixture AcroForm — AR-NOTE AC-03. Generator/generate-zip NO TOUCH.",
};

console.log(JSON.stringify(report, null, 2));
console.log(`\nTRACE WERDYKT: ${report.verdict}`);
console.log(`mapping != null: ${report.migration.mappingNonNull}`);
console.log(`setText() > 0: ${setTextCount > 0} (count=${setTextCount})`);
process.exit(report.verdict === "PASS" ? 0 : 1);
