/**
 * P0.1E FORENSIC — dokładna ścieżka UI: prod KV → ZIP → 50-ZI-*.pdf
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import zlib from "node:zlib";
import { loadEnv } from "vite";
import JSZip from "jszip";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, PDFTextField } from "pdf-lib";
import {
  buildWmPrintFilesForJob,
  buildWmPrintZipEntryName,
  slugWmPrintFileName,
} from "../src/lib/wm-print/generate-zip.ts";
import { normalizeWmPrintSettings } from "../src/lib/wm-print/settings.ts";
import { normalizeWmPrintTemplates } from "../src/lib/wm-print/templates.ts";
import { WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX } from "../src/lib/wm-print/generate-pdf.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";
import { wmPrintZipBaseName } from "../src/lib/wm-print/address-vars.ts";

const env = loadEnv("", process.cwd(), "");
const BASE = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-0afb8820`;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const OUT = join(process.cwd(), "scripts", "audit-p0-1e-out");
mkdirSync(OUT, { recursive: true });

const TARGET_ZI = "50-ZI-zgloszenie-gotowosci-instalacji-do-przylaczenia-gd.pdf";

// 1. Wersja prod
const verRes = await fetch("https://www.wgdom.fun/version.json");
const ver = await verRes.json();
console.log("=== 1. PROD VERSION ===");
console.log(JSON.stringify(ver, null, 2));
writeFileSync(join(OUT, "version.json"), JSON.stringify(ver, null, 2));

// 2. KV templates + settings
const kvRes = await fetch(`${BASE}/batch-get`, {
  method: "POST",
  headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ keys: ["kw-wm-print-templates", "kw-wm-print-settings"] }),
});
const kv = await kvRes.json();
const templates = normalizeWmPrintTemplates(kv.values?.[0]);
const settings = normalizeWmPrintSettings(kv.values?.[1]);
writeFileSync(join(OUT, "kv-templates.json"), JSON.stringify(templates, null, 2));

const ziTpl = templates.find((t) => t.name === "ZI");
console.log("\n=== 2. KV ZI TEMPLATE ===");
console.log(JSON.stringify(ziTpl, null, 2));

// 3. UI pipeline — Sępa 83/7
const job = { id: "forensic-job", address: "Sępa Szarzyńskiego 83", flatNumber: "7" };
const opts = { dateMode: "custom", customDate: new Date("2026-06-14T12:00:00") };
const vars = buildWmPrintVariableMap(job, settings, opts);
console.log("\n=== 3. VARS ===", vars);

const fetchBytes = async (url) => new Uint8Array(await (await fetch(url)).arrayBuffer());
const files = await buildWmPrintFilesForJob(job, templates, [], settings, opts, undefined, fetchBytes);

console.log("\n=== 4. ZIP FILES ===");
for (const f of files) {
  console.log(`  ${f.fileName} (${f.bytes.length} B) template=${f.templateId?.slice(0, 8)}`);
}

const ziFile = files.find((f) => f.fileName === TARGET_ZI) ?? files.find((f) => f.fileName.includes("ZI"));
if (!ziFile) {
  console.error("BRAK PLIKU ZI W ZIP — dostępne:", files.map((f) => f.fileName));
  process.exit(1);
}
console.log(`\n=== 5. TARGET: ${ziFile.fileName} ===`);

writeFileSync(join(OUT, ziFile.fileName), ziFile.bytes);
writeFileSync(join(OUT, "zi-extracted.pdf"), ziFile.bytes);

const zip = new JSZip();
for (const f of files) zip.file(f.fileName, f.bytes);
const zipBytes = await zip.generateAsync({ type: "nodebuffer" });
const zipName = `${wmPrintZipBaseName(job.address, job.flatNumber)}_${settings.zipNameSuffix || "ODBIOR_WM"}.zip`;
writeFileSync(join(OUT, zipName), zipBytes);
console.log(`ZIP zapisany: ${zipName} (${zipBytes.length} B)`);

// 6. Analiza pól 8/9/10
const doc = await PDFDocument.load(ziFile.bytes, { ignoreEncryption: true });
const form = doc.getForm();
const tfs = form.getFields().filter((f) => f instanceof PDFTextField);

console.log("\n=== 6. POLA 8/9/10 — /V (getText) ===");
for (const [key, idx] of Object.entries(WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX)) {
  const f = tfs[idx];
  const rect = f?.acroField.getWidgets()[0]?.getRectangle();
  console.log(`  [${idx}] ${key}: getText=${JSON.stringify(f?.getText())} rect=${JSON.stringify(rect)}`);
}

// 7. AP streams — wyciągnij i przeszukaj
const raw = Buffer.from(ziFile.bytes);
const latin = raw.toString("latin1");

function inflateObj(objNum) {
  const re = new RegExp(`\\n${objNum} 0 obj[\\s\\S]*?stream\\r?\\n`);
  const m = latin.match(re);
  if (!m) return null;
  const start = latin.indexOf(m[0]) + m[0].length;
  const end = latin.indexOf("endstream", start);
  try {
    return zlib.inflateSync(raw.subarray(start, end)).toString("latin1");
  } catch {
    return null;
  }
}

console.log("\n=== 7. AP WIDGETÓW [8,9,10] ===");
for (const idx of [8, 9, 10]) {
  const widgets = tfs[idx]?.acroField.getWidgets() ?? [];
  for (const w of widgets) {
    const on = w.ref?.objectNumber;
    if (!on) continue;
    const annotChunk = latin.slice(latin.indexOf(`${on} 0 obj`), latin.indexOf(`${on} 0 obj`) + 1200);
    const apMatch = annotChunk.match(/\/AP\s*<<[^>]*\/N\s+(\d+) 0 R/);
    const apRef = apMatch?.[1];
    console.log(`\n  field[${idx}] annot obj ${on}, AP/N ref=${apRef ?? "?"}`);
    if (apRef) {
      const apBody = inflateObj(Number(apRef));
      if (apBody) {
        const hasJob = apBody.includes("JOB") || apBody.includes("{{");
        const hasSepa = apBody.includes("Sepa") || apBody.includes("Sępa") || apBody.includes("0036");
        const has83 = apBody.includes("83") || apBody.includes("001B0016");
        console.log(`    AP stream len=${apBody.length} JOB={{=${hasJob} Sępa=${hasSepa} 83=${has83}`);
        console.log(`    AP snippet: ${JSON.stringify(apBody.slice(0, 400))}`);
      } else {
        console.log("    AP stream: nie inflate");
      }
    }
  }
}

// 8. Placeholdery w całym PDF
console.log("\n=== 8. PLACEHOLDERY W BAJTACH ===");
for (const n of ["{{JOB_STREET}}", "{{JOB_BUILDING}}", "{{JOB_APARTMENT}}", "JOB_STREET"]) {
  const buf = Buffer.from(n, "utf8");
  let c = 0;
  for (let i = 0; i <= raw.length - buf.length; i++) {
    let ok = true;
    for (let j = 0; j < buf.length; j++) if (raw[i + j] !== buf[j]) ok = false;
    if (ok) c++;
  }
  console.log(`  "${n}": ${c}`);
}

// 9. Statyczna warstwa strony — szukaj JOB w content streams
console.log("\n=== 9. CONTENT STREAMS (strona) — JOB/placeholder ===");
const streamRe = /(\d+) 0 obj[\s\S]*?stream\r?\n/g;
let sm;
let pageHits = 0;
while ((sm = streamRe.exec(latin)) !== null && pageHits < 20) {
  const body = inflateObj(Number(sm[1]));
  if (!body) continue;
  if (body.includes("JOB_STREET") || body.includes("{{JOB") || body.includes("{{")) {
    pageHits++;
    console.log(`  obj ${sm[1]}: ${JSON.stringify(body.slice(body.indexOf("{{") >= 0 ? body.indexOf("{{") : body.indexOf("JOB"), body.indexOf("{{") >= 0 ? body.indexOf("{{") + 80 : body.indexOf("JOB") + 80))}`);
  }
}

// 10. Porównanie: czy to ten sam szablon co zawsze testowaliśmy
const ziUrl = ziTpl?.files?.[0]?.storageUrl ?? ziTpl?.storageUrl;
console.log("\n=== 10. SZABLON STORAGE URL ===");
console.log(ziUrl);
console.log("type KV:", ziTpl?.type, "enabled:", ziTpl?.enabled);

// 11. Symulacja browser: fetch font z prod URL
console.log("\n=== 11. FONT PROD (jak browser) ===");
const fontRes = await fetch("https://www.wgdom.fun/fonts/NotoSans-Regular.ttf");
console.log(`  /fonts/NotoSans-Regular.ttf: ${fontRes.status} ${fontRes.headers.get("content-length")} B`);

// 12. Werdykt renderowania
console.log("\n=== 12. WERDYKT FORENSIC ===");
const v10 = tfs[10]?.getText();
const hasLiterals = raw.includes(Buffer.from("{{JOB_STREET}}", "utf8"));
console.log(`  /V pole [10]: ${JSON.stringify(v10)}`);
console.log(`  literal {{JOB_STREET}} w pliku: ${hasLiterals}`);
console.log(`  Jeśli Edge pokazuje {{JOB_*}} przy /V OK i brak literal → mechanizm: statyczna grafika szablonu LUB stary /AP widgetów LUB XFA runtime Edge`);

writeFileSync(
  join(OUT, "REPORT.json"),
  JSON.stringify(
    {
      prodVersion: ver.version,
      ziFileName: ziFile.fileName,
      ziBytes: ziFile.bytes.length,
      fields: Object.fromEntries(
        Object.entries(WM_PRINT_ZI_PDF_FIELD_TEXT_INDEX).map(([k, idx]) => [k, tfs[idx]?.getText()]),
      ),
      literalsInFile: {
        JOB_STREET: hasLiterals,
      },
      kvZiType: ziTpl?.type,
      templateUrl: ziUrl,
    },
    null,
    2,
  ),
);

console.log(`\nArtefakty: ${OUT}`);
