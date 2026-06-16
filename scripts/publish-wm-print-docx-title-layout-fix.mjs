/**
 * Fix WM Druk DOCX — line break after {{DATE}} before document title.
 *
 * npx vite-node scripts/publish-wm-print-docx-title-layout-fix.mjs           # dry-run + smoke
 * npx vite-node scripts/publish-wm-print-docx-title-layout-fix.mjs --execute # upload + KV
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import JSZip from "jszip";
import { loadEnv } from "vite";
import {
  generateDocxFromTemplate,
  listDocxXmlPartPaths,
  validateWmPrintDocxBytes,
} from "../src/lib/wm-print/generate-docx.ts";
import { buildWmPrintVariableMap } from "../src/lib/wm-print/variables.ts";
import { DEFAULT_WM_PRINT_SETTINGS } from "../src/lib/wm-print/settings.ts";
import { normalizeWmPrintTemplates } from "../src/lib/wm-print/templates.ts";

const TEMPLATES_KEY = "kw-wm-print-templates";
const execute = process.argv.includes("--execute");
const OUT_DIR = join(process.cwd(), "audit", "wm-print-docx-fixed");
const AUDIT = join(process.cwd(), "audit");

const env = loadEnv("", process.cwd(), "");
const BASE = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-0afb8820`;
const ANON = env.VITE_SUPABASE_ANON_KEY;

mkdirSync(OUT_DIR, { recursive: true });

/** {{DATE}} run bezpośrednio przed tytułem — podziel akapit: data | tytuł (osobne w:p). */
export function fixDocxDateTitleLayoutXml(xml) {
  return xml.replace(/<w:p\b[\s\S]*?<\/w:p>/g, (para) => {
    const texts = [...para.matchAll(/<w:t(?:[^>]*)>([^<]*)<\/w:t>/g)].map((m) => m[1]);
    const combined = texts.join("");
    if (!combined.includes("{{DATE}}")) return para;
    if (!/\{\{DATE\}\}[A-ZĄĆĘŁŃÓŚŹŻ]/i.test(combined)) return para;

    const dateEnd = combined.indexOf("{{DATE}}") + "{{DATE}}".length;
    const runRe = /<w:r\b[\s\S]*?<\/w:r>/g;
    let charPos = 0;
    let splitAfterRunEnd = -1;
    let m;
    while ((m = runRe.exec(para)) !== null) {
      const runText = [...m[0].matchAll(/<w:t(?:[^>]*)>([^<]*)<\/w:t>/g)]
        .map((x) => x[1])
        .join("");
      const runStart = charPos;
      charPos += runText.length;
      if (runStart < dateEnd && charPos >= dateEnd) {
        splitAfterRunEnd = m.index + m[0].length;
        break;
      }
    }
    if (splitAfterRunEnd < 0) return para;

    const openMatch = para.match(/^<w:p\b[^>]*>/);
    if (!openMatch) return para;
    const pOpen = openMatch[0];
    const pPrMatch = para.match(/<w:pPr\b[\s\S]*?<\/w:pPr>/);
    const pPr = pPrMatch?.[0] ?? "";

    const datePart = para.slice(0, splitAfterRunEnd) + "</w:p>";
    const titleInner = para.slice(splitAfterRunEnd, -"</w:p>".length);
    const titlePart = `${pOpen}${pPr}${titleInner}</w:p>`;

    return datePart + titlePart;
  });
}

export async function fixDocxDateTitleLayoutBytes(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  for (const path of listDocxXmlPartPaths(zip)) {
    const entry = zip.file(path);
    if (!entry) continue;
    const xml = await entry.async("string");
    zip.file(path, fixDocxDateTitleLayoutXml(xml));
  }
  return zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
}

function extractText(xml) {
  return [...xml.matchAll(/<w:t(?:[^>]*)>([^<]*)<\/w:t>/g)].map((m) => m[1]).join("");
}

async function batchGet(keys) {
  const res = await fetch(`${BASE}/batch-get`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}: ${await res.text()}`);
  return res.json();
}

async function batchSet(keys, values) {
  const res = await fetch(`${BASE}/batch-set`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ keys, values }),
  });
  if (!res.ok) throw new Error(`batch-set ${res.status}: ${await res.text()}`);
  return res.text();
}

async function uploadDocx(templateId, fileId, bytes, filename) {
  const form = new FormData();
  form.append(
    "file",
    new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    filename,
  );
  form.append("jobId", "wm-print");
  form.append("filename", `template-${templateId}-${fileId}.docx`);

  const res = await fetch(`${BASE}/storage-upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `upload ${res.status}`);
  return { path: data.path, publicUrl: data.publicUrl };
}

const vars = buildWmPrintVariableMap(
  { address: "Sępa Szarzyńskiego 83", flatNumber: "7" },
  DEFAULT_WM_PRINT_SETTINGS,
  { dateMode: "custom", customDate: new Date("2026-06-15T12:00:00") },
);

async function main() {
  console.log(`=== WM Druk DOCX title layout fix (${execute ? "EXECUTE" : "DRY RUN"}) ===\n`);

  const data = await batchGet([TEMPLATES_KEY]);
const templates = normalizeWmPrintTemplates(data.values?.[0]);
const report = { generatedAt: new Date().toISOString(), execute, files: [] };

let updated = templates;
const docxFiles = [];

for (const t of templates) {
  if (t.type !== "docx" || !t.files?.length) continue;
  for (const f of t.files) {
    if (!f.storageUrl?.endsWith(".docx")) continue;
    docxFiles.push({ template: t, file: f });
  }
}

if (!docxFiles.length) throw new Error("Brak plików DOCX w KV");

let pass = 0;
let fail = 0;
const assert = (c, m) => {
  if (c) {
    pass++;
    console.log(`  PASS: ${m}`);
  } else {
    fail++;
    console.error(`  FAIL: ${m}`);
  }
};

for (const { template: t, file: f } of docxFiles) {
  console.log(`\n→ ${t.name} / ${f.originalFileName}`);
  const raw = new Uint8Array(await (await fetch(f.storageUrl)).arrayBuffer());
  const origZip = await JSZip.loadAsync(raw);
  const origXml = await origZip.file("word/document.xml")?.async("string");
  const origCombined = extractText(origXml ?? "");
  const needsFix = /\{\{DATE\}\}[A-ZĄĆĘŁŃÓŚŹŻ]/i.test(origCombined);

  const fixed = await fixDocxDateTitleLayoutBytes(raw);
  const outName = f.originalFileName.replace(/[^\w.\-ąćęłńóśźżĄĆĘŁŃÓŚŹŻ ]/gi, "_");
  writeFileSync(join(OUT_DIR, outName), fixed);

  const fixedZip = await JSZip.loadAsync(fixed);
  const fixedXml = await fixedZip.file("word/document.xml")?.async("string");
  assert(fixedXml?.includes("{{DATE}}"), "fixed template still has DATE placeholder");

  const gen = await generateDocxFromTemplate(fixed, vars);
  const genVal = await validateWmPrintDocxBytes(gen);
  assert(genVal.ok, `generated DOCX valid (${genVal.issues.join("; ") || "OK"})`);

  const genZip = await JSZip.loadAsync(gen);
  const genXml = await genZip.file("word/document.xml")?.async("string");
  const paras = [...(genXml ?? "").matchAll(/<w:p\b[\s\S]*?<\/w:p>/g)].map((x) => x[0]);
  const datePara = paras.find((p) => /\d{2}\.\d{2}\.\d{4} r\./.test(extractText(p)));
  const titlePara = paras.find((p) => /OŚWIADCZENIE|Oświadczenie/i.test(extractText(p)));
  assert(!!datePara && !!titlePara, "date paragraph and title paragraph found");
  if (datePara && titlePara) {
    assert(datePara !== titlePara, "date and title in separate paragraphs");
    assert(!/OŚWIADCZENIE|Oświadczenie/i.test(extractText(datePara)), "date para has no title text");
    assert(!/r\.OŚWIADCZENIE/i.test(extractText(titlePara)), "title para has no r.OŚWIADCZENIE glue");
  }

  const fileId = crypto.randomUUID();
  const up = execute
    ? await uploadDocx(t.id, fileId, fixed, f.originalFileName)
    : { path: `(dry) template-${t.id}-${fileId}.docx`, publicUrl: "(dry-run)" };

  const now = new Date().toISOString();
  updated = updated.map((tpl) => {
    if (tpl.id !== t.id) return tpl;
    return {
      ...tpl,
      updatedAt: now,
      files: tpl.files.map((old) => {
        if (old.id !== f.id) return old;
        return {
          id: fileId,
          sortOrder: old.sortOrder,
          storageUrl: up.publicUrl,
          storagePath: up.path,
          uploadedAt: now,
          originalFileName: old.originalFileName,
        };
      }),
    };
  });

  report.files.push({
    templateId: t.id,
    templateName: t.name,
    previousFileId: f.id,
    newFileId: fileId,
    originalFileName: f.originalFileName,
    needsFix,
    bytes: fixed.length,
    storageUrl: up.publicUrl,
    localPath: join(OUT_DIR, outName),
  });
}

writeFileSync(join(AUDIT, "wm-print-docx-title-layout-fix-report.json"), JSON.stringify(report, null, 2));

if (execute) {
  await batchSet([TEMPLATES_KEY], [updated]);
  console.log("\nKV updated:", TEMPLATES_KEY);
} else {
  console.log("\nDRY RUN — pominięto upload i batch-set. Użyj --execute.");
}

console.log(`\nSmoke: ${pass} PASS · ${fail} FAIL`);
console.log("Raport:", join(AUDIT, "wm-print-docx-title-layout-fix-report.json"));
if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
