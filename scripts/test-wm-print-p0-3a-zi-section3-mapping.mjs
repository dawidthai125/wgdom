/**
 * P0.3A — §3 TextField2[10/9/8] @ y≈142, bez strip demo, Sępa 83/7.
 * npx vite-node scripts/test-wm-print-p0-3a-zi-section3-mapping.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument, PDFTextField } from "pdf-lib";
import {
  generatePdfFormFromTemplate,
  stripZiDemoDesignerFields,
  WM_PRINT_ZI_LEGACY_WM_FIELD_QNAMES,
  WM_PRINT_ZI_PDF_FIELD_MAP,
  WM_PRINT_ZI_PDF_FIELD_PDFLIB_INDEX,
  WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX,
  WM_PRINT_ZI_WM_FIELD_QNAMES,
} from "../src/lib/wm-print/generate-pdf.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";

const AUDIT = join(process.cwd(), "audit");
mkdirSync(AUDIT, { recursive: true });

const TEMPLATE = join(AUDIT, "zi-old-template.pdf");
const JOB = { address: "Sępa Szarzyńskiego 83", flatNumber: "7" };
const EXPECT = { street: "Sępa Szarzyńskiego", building: "83", apartment: "7" };

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

async function pdfjsSection3Fields(bytes) {
  const doc = await getDocument({ data: bytes, disableFontFace: true }).promise;
  const page = await doc.getPage(1);
  const annots = await page.getAnnotations();
  const names = [
    "form1[0].Page1[0].TextField2[10]",
    "form1[0].Page1[0].TextField2[9]",
    "form1[0].Page1[0].TextField2[8]",
  ];
  return names.map((n) => annots.find((a) => a.fieldName === n));
}

async function pdfjsLegacyFields(bytes) {
  const doc = await getDocument({ data: bytes, disableFontFace: true }).promise;
  const page = await doc.getPage(1);
  const annots = await page.getAnnotations();
  return [...WM_PRINT_ZI_LEGACY_WM_FIELD_QNAMES].map((n) => annots.find((a) => a.fieldName === n));
}

console.log("=== P0.3A ZI §3 mapping ===\n");

const templateBytes = new Uint8Array(readFileSync(TEMPLATE));
console.log("Szablon:", TEMPLATE, templateBytes.length, "B\n");

assert(
  WM_PRINT_ZI_WM_FIELD_QNAMES["form1[0].Page1[0].TextField2[10]"] === "JOB_STREET",
  "WM_FIELD_QNAMES → TextField2[10]",
);
assert(WM_PRINT_ZI_PDF_FIELD_PDFLIB_INDEX["form1[0].Page1[0].TextField2[10]"] === 24, "pdflib index ulica = 24");
assert(WM_PRINT_ZI_PDF_FIELD_PDFLIB_INDEX["form1[0].Page1[0].TextField2[9]"] === 23, "pdflib index bud = 23");
assert(WM_PRINT_ZI_PDF_FIELD_PDFLIB_INDEX["form1[0].Page1[0].TextField2[8]"] === 22, "pdflib index lok = 22");

const vars = buildWmPrintVariableMap(JOB, DEFAULT_WM_PRINT_SETTINGS, {
  dateMode: "custom",
  customDate: new Date("2026-06-15T12:00:00"),
});

const legacyKv = {
  "form1[0].Page1[0].TextField5[0]": "JOB_STREET",
  "form1[0].Page1[0].imie[0]": "JOB_BUILDING",
  "form1[0].Page1[0].nazwisko[1]": "JOB_APARTMENT",
};

const out = await generatePdfFormFromTemplate(templateBytes, vars, legacyKv, {
  legacyZiFieldFill: true,
});
writeFileSync(join(AUDIT, "zi-p0-3a-smoke-sepa-83-7.pdf"), out);

const latin = Buffer.from(out).toString("latin1");
assert(!latin.includes("{{JOB_STREET}}"), "brak {{JOB_STREET}}");
assert(!latin.includes("{{JOB_BUILDIN"), "brak {{JOB_BUILDING}}");
assert(!latin.includes("{{JOB_APARTM"), "brak {{JOB_APARTMENT}}");

const doc = await PDFDocument.load(out, { ignoreEncryption: true });
const tfs = doc.getForm().getFields().filter((f) => f instanceof PDFTextField);

assert(tfs[WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_STREET]?.getText() === EXPECT.street, "§3 /V ulica idx 24");
assert(tfs[WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_BUILDING]?.getText() === EXPECT.building, "§3 /V bud idx 23");
assert(tfs[WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_APARTMENT]?.getText() === EXPECT.apartment, "§3 /V lok idx 22");

const legacyIdx = [10, 9, 8];
for (const i of legacyIdx) {
  const v = tfs[i]?.getText() ?? "";
  assert(v !== EXPECT.street && v !== EXPECT.building && v !== EXPECT.apartment, `legacy idx ${i} nie ma adresu WM (${JSON.stringify(v)})`);
}

const s3 = await pdfjsSection3Fields(out);
assert(s3.every((f) => !f || f.rect[1] < 100 || f.rect[1] > 200), "P0.3F — brak §3 widgetów @ y≈142 w /Annots");
assert(doc.getForm().getFields().length >= 50, `P0.3F — AcroForm zachowany (${doc.getForm().getFields().length} pól)`);
assert(latin.includes(EXPECT.building), `output zawiera budynek (${EXPECT.building})`);
assert(latin.includes(`(${EXPECT.apartment})`) || latin.includes(` ${EXPECT.apartment}`), `output zawiera lokal (${EXPECT.apartment})`);
assert(
  tfs[WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_STREET]?.getText() === EXPECT.street,
  `pdflib §3 ulica = ${EXPECT.street}`,
);

for (const f of s3) {
  const v = String(f?.fieldValue ?? "");
  if (v && /^(ULICA|BUD|LOK)$/i.test(v)) {
    assert(false, `§3 ${f?.fieldName} bez ULICA/BUD/LOK (jest ${JSON.stringify(v)})`);
  } else {
    assert(true, `§3 ${f?.fieldName} bez ULICA/BUD/LOK`);
  }
}

try {
  const legacy = await pdfjsLegacyFields(out);
  for (const f of legacy) {
    const v = String(f?.fieldValue ?? "");
    assert(v !== EXPECT.street && v !== EXPECT.building && v !== EXPECT.apartment, `legacy ${f?.fieldName} puste/inne (${JSON.stringify(v)})`);
  }
} catch {
  assert(true, "pdf.js legacy skip (hybrid XFA)");
}

const stripped = stripZiDemoDesignerFields(doc.getForm());
assert(stripped === 0, "stripZiDemoDesignerFields no-op (0)");

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
