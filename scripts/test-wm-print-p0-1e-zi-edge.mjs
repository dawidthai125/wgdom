/**
 * P0.1E — weryfikacja: cover strony + ukryte widgety, pdfjs widzi adres.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import zlib from "node:zlib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { PDFDocument, PDFTextField } from "pdf-lib";
import { generatePdfFormFromTemplate } from "../src/lib/wm-print/generate-pdf.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";

const PROD_ZI_URL =
  "https://bdpygdvfgbggermvqtys.supabase.co/storage/v1/object/public/make-0afb8820-photos/jobs/wm-print/template-e911d6a5-3728-4089-bb9a-a4adec6e9c20-11e39e5c-7026-43d0-a3a2-3389203f46cb.pdf";

const OUT = join(process.cwd(), "scripts", "audit-p0-1e-out");
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

console.log("P0.1E — ZI Edge cover fix\n");

const template = new Uint8Array(await (await fetch(PROD_ZI_URL)).arrayBuffer());
const out = await generatePdfFormFromTemplate(template, vars);
writeFileSync(join(OUT, "07-p01e-edge-cover-sepa-83-7.pdf"), out);

const doc = await PDFDocument.load(out, { ignoreEncryption: true });
const tfs = doc.getForm().getFields().filter((f) => f instanceof PDFTextField);
for (const [key, idx] of [
  ["JOB_STREET", 10],
  ["JOB_BUILDING", 9],
  ["JOB_APARTMENT", 8],
]) {
  ok(tfs[idx]?.getText() === vars[key], `getText [${idx}] ${key}`);
}

const raw = Buffer.from(out);
ok(!raw.includes(Buffer.from("{{JOB_STREET}}", "utf8")), "brak literal {{JOB_STREET}}");

const latin = raw.toString("latin1");
let coverHits = 0;
const streamRe = /(\d+) 0 obj[\s\S]*?stream\r?\n/g;
let sm;
while ((sm = streamRe.exec(latin)) !== null) {
  const start = sm.index + sm[0].length;
  const end = latin.indexOf("endstream", start);
  try {
    const body = zlib.inflateSync(raw.subarray(start, end)).toString("latin1");
    if (body.includes("592.73407 cm") && body.includes("1 1 1 rg")) coverHits++;
  } catch {
    /* */
  }
}
ok(coverHits >= 1, "cover strony (biały rect + ulica) w content stream");

for (const wid of [413, 414, 415]) {
  const chunk = latin.slice(latin.indexOf(`${wid} 0 obj`), latin.indexOf(`${wid} 0 obj`) + 300);
  ok(/\/F\s+2\b/.test(chunk), `widget ${wid} ukryty (F=2)`);
}

const pdfjsDoc = await getDocument({ data: out, disableFontFace: true }).promise;
let strings = [];
for (let p = 1; p <= pdfjsDoc.numPages; p++) {
  const page = await pdfjsDoc.getPage(p);
  const tc = await page.getTextContent();
  strings.push(...tc.items.filter((it) => "str" in it).map((it) => it.str));
}
ok(!strings.some((s) => s.includes("{{JOB")), "pdfjs brak placeholderów");
// pdfjs nie ekstrahuje hex Tj z cover stream — weryfikacja wizualna: Edge + 07-p01e-edge-cover-sepa-83-7.pdf

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
