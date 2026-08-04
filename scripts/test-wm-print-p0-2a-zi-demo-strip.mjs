/**
 * P0.2A/P0.3A — §3 WM fill; strip demo no-op od P0.3A.
 * npx vite-node scripts/test-wm-print-p0-2a-zi-demo-strip.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "vite";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument, PDFTextField } from "pdf-lib";
import {
  cleanZiTemplateDemoFields,
  generatePdfFormFromTemplate,
  stripZiDemoDesignerFields,
  WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX,
} from "../src/lib/wm-print/generate-pdf.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";

const AUDIT = join(process.cwd(), "audit");
mkdirSync(AUDIT, { recursive: true });

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

async function pdfjsDemoFields(bytes) {
  const doc = await getDocument({ data: bytes, disableFontFace: true }).promise;
  const page = await doc.getPage(1);
  const annots = await page.getAnnotations();
  return annots.filter(
    (a) =>
      a.rect?.[1] != null &&
      a.rect[1] > 130 &&
      a.rect[1] < 165 &&
      /TextField2\[(8|9|10)\]/.test(a.fieldName ?? ""),
  );
}

async function pdfjsWmFields(bytes) {
  const doc = await getDocument({ data: bytes, disableFontFace: true }).promise;
  const page = await doc.getPage(1);
  const annots = await page.getAnnotations();
  const names = ["form1[0].Page1[0].nazwisko[1]", "form1[0].Page1[0].imie[0]", "form1[0].Page1[0].TextField5[0]"];
  return names.map((n) => annots.find((a) => a.fieldName === n));
}

function copyPdfBytes(bytes) {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy;
}

console.log("=== P0.2A ZI demo strip ===\n");

// Template z prod lub lokalny fallback
const env = loadEnv("", process.cwd(), "");
const BASE = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-0afb8820`;
const ANON = env.VITE_SUPABASE_ANON_KEY;
let templateBytes;

const localTpl = join(AUDIT, "zi-new-template-prod.pdf");
try {
  templateBytes = copyPdfBytes(new Uint8Array(readFileSync(localTpl)));
  console.log("Szablon: lokalny", localTpl);
} catch {
  const env = loadEnv("", process.cwd(), "");
  const BASE = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-0afb8820`;
  const ANON = env.VITE_SUPABASE_ANON_KEY;
  const { normalizeWmPrintTemplates } = await import("../src/lib/wm-print/templates.ts");
  const kvRes = await fetch(`${BASE}/batch-get`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ keys: ["kw-wm-print-templates"] }),
  });
  const kv = await kvRes.json();
  const templates = normalizeWmPrintTemplates(kv.values?.[0]);
  const zi = templates.find((t) => t.name === "ZI" && (t.files?.length ?? 0) > 0);
  templateBytes = copyPdfBytes(new Uint8Array(await (await fetch(zi.files[0].storageUrl)).arrayBuffer()));
  console.log("Szablon: prod KV", zi.id);
}

const demoBefore = await pdfjsDemoFields(copyPdfBytes(templateBytes));
assert(demoBefore.length === 3, `szablon: 3 demo TextField2 @ y≈142 (jest ${demoBefore.length})`);
assert(
  demoBefore.some((f) => f.fieldValue === "ULICA" || f.fieldValue === "BUD" || f.fieldValue === "LOK"),
  "szablon: demo ma ULICA/BUD/LOK przed clean",
);

const cleanedTpl = await cleanZiTemplateDemoFields(copyPdfBytes(templateBytes));
writeFileSync(join(AUDIT, "zi-template-p0-2a-cleaned.pdf"), cleanedTpl);
assert(cleanedTpl.length === templateBytes.length, "clean template: no-op (P0.3A)");

const vars = buildWmPrintVariableMap(JOB, DEFAULT_WM_PRINT_SETTINGS, {
  dateMode: "custom",
  customDate: new Date("2026-06-15T12:00:00"),
});

const out = await generatePdfFormFromTemplate(templateBytes, vars, undefined, { legacyZiFieldFill: true });
writeFileSync(join(AUDIT, "zi-p0-2a-smoke-sepa-83-7.pdf"), out);

const latin = Buffer.from(out).toString("latin1");
assert(!latin.includes("{{JOB_STREET}}"), "output: brak {{JOB_STREET}}");
assert(!latin.includes("{{JOB_BUILDIN"), "output: brak {{JOB_BUILDIN");
assert(!latin.includes("{{JOB_APARTM"), "output: brak {{JOB_APARTM");

const demoAfter = await pdfjsDemoFields(copyPdfBytes(out));
for (const f of demoAfter) {
  assert(
    !f.fieldValue || !/^(ULICA|BUD|LOK)$/.test(String(f.fieldValue)),
    `demo ${f.fieldName} nie pokazuje ULICA/BUD/LOK (jest ${JSON.stringify(f.fieldValue)})`,
  );
}

const doc = await PDFDocument.load(out, { ignoreEncryption: true });
const tfs = doc.getForm().getFields().filter((f) => f instanceof PDFTextField);
const idxApt = WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_APARTMENT ?? 22;
const idxBud = WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_BUILDING ?? 23;
const idxStreet = WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX.JOB_STREET ?? 24;
assert(tfs[idxApt]?.getText() === EXPECT.apartment, "WM LOK /V index 22");
assert(tfs[idxBud]?.getText() === EXPECT.building, "WM BUD /V index 23");
assert(tfs[idxStreet]?.getText() === EXPECT.street, "WM ULICA /V index 24");

const stripped = stripZiDemoDesignerFields(
  (await PDFDocument.load(copyPdfBytes(templateBytes), { ignoreEncryption: true })).getForm(),
);
assert(stripped === 0, `stripZiDemoDesignerFields no-op P0.3A (jest ${stripped})`);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
