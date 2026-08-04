/**
 * P0.1D — weryfikacja wizualna /AP: prod ZI, Sępa 83/7, zapis artefaktów.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import zlib from "node:zlib";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { generatePdfFormFromTemplate } from "../src/lib/wm-print/generate-pdf.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";

const PROD_ZI_URL =
  "https://bdpygdvfgbggermvqtys.supabase.co/storage/v1/object/public/make-0afb8820-photos/jobs/wm-print/template-e911d6a5-3728-4089-bb9a-a4adec6e9c20-11e39e5c-7026-43d0-a3a2-3389203f46cb.pdf";

const OUT = join(process.cwd(), "scripts", "audit-p0-1d-out");
mkdirSync(OUT, { recursive: true });

const vars = buildWmPrintVariableMap(
  { address: "Sępa Szarzyńskiego 83", flatNumber: "7" },
  DEFAULT_WM_PRINT_SETTINGS,
  { dateMode: "custom", customDate: new Date("2026-06-14T12:00:00") },
);

let pass = 0;
let fail = 0;
function ok(c, m) {
  if (c) {
    pass++;
    console.log(`  ✓ ${m}`);
  } else {
    fail++;
    console.error(`  ✗ ${m}`);
  }
}

console.log("P0.1D — ZI visual /AP fix\n");

const template = new Uint8Array(await (await fetch(PROD_ZI_URL)).arrayBuffer());
const out = await generatePdfFormFromTemplate(template, vars, undefined, { legacyZiFieldFill: true });
writeFileSync(join(OUT, "06-p01d-ap-fix-sepa-83-7.pdf"), out);

const doc = await PDFDocument.load(out, { ignoreEncryption: true });
const form = doc.getForm();
const tfs = form.getFields().filter((f) => f instanceof PDFTextField);

for (const [key, idx] of [
  ["JOB_STREET", 10],
  ["JOB_BUILDING", 9],
  ["JOB_APARTMENT", 8],
]) {
  ok(tfs[idx]?.getText() === vars[key], `getText [${idx}] ${key}`);
  const rect = tfs[idx]?.acroField.getWidgets()[0]?.getRectangle();
  ok(!!rect, `widget rect [${idx}]`);
  console.log(`    rect[${idx}]:`, JSON.stringify(rect));
}

const raw = Buffer.from(out);

// Noto + nowe streamy AP po updateAppearances
ok(raw.includes(Buffer.from("NotoSans", "utf8")), "NotoSans osadzony (AP refresh)");

// brak {{JOB w całym pliku
for (const n of ["{{JOB_STREET}}", "{{JOB_BUILDING}}", "{{JOB_APARTMENT}}"]) {
  ok(!raw.includes(Buffer.from(n, "utf8")), `brak literal ${n}`);
}

// content stream — P0.1D nie polega na overlay P0.1C
const latin = Buffer.from(out).toString("latin1");
let hasOverlayWhite = false;
const re = /(\d+) 0 obj[\s\S]*?stream\r?\n/g;
let m;
while ((m = re.exec(latin)) !== null) {
  const start = m.index + m[0].length;
  const end = latin.indexOf("endstream", start);
  try {
    const inf = zlib.inflateSync(out.subarray(start, end));
    const s = inf.toString("latin1");
    if (s.includes("592.73407 cm") && s.includes("1 1 1 rg")) hasOverlayWhite = true;
  } catch {
    /* */
  }
}
ok(!hasOverlayWhite, "P0.1D: bez overlay P0.1C (1 1 1 rg @592) — fix przez /AP");

writeFileSync(
  join(OUT, "FORENSIC.md"),
  `# P0.1D ZI Forensic

## ROOT CAUSE (P0.1C FAIL)

- \`setText()\` zapisuje /V poprawnie (Sępa / 83 / 7)
- P0.1C rysował overlay na **content stream strony** (współrzędne: ulica y=592.73, budynek/lokal y=655.73)
- **Widgety AcroForm renderują się NAD content stream** — viewer pokazywał stare /AP z placeholderami XFA
- \`{{JOB_STREET}}\` nie występuje w bajtach PDF — tylko w warstwie wizualnej /AP widgetów

## FIX (P0.1D)

- \`updateAppearances(NotoSans)\` tylko na polach PDFTextField [8,9,10]
- Odświeża /AP widgetów wartościami z /V (polskie znaki OK)

## Artefakty

- \`06-p01d-ap-fix-sepa-83-7.pdf\` — wygenerowany prod pipeline P0.1D

## Test biznesowy

Adres: Sępa Szarzyńskiego 83/7
`,
);

console.log(`\n${pass} PASS · ${fail} FAIL`);
console.log(`Artefakty: ${OUT}`);
if (fail > 0) process.exit(1);
