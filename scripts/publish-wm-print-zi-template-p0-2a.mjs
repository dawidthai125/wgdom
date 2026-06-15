/**
 * P0.2A — wgraj oczyszczony szablon ZI (bez demo ULICA/BUD/LOK) do storage + KV.
 *
 * npx vite-node scripts/publish-wm-print-zi-template-p0-2a.mjs           # dry-run
 * npx vite-node scripts/publish-wm-print-zi-template-p0-2a.mjs --execute
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "vite";
import { cleanZiTemplateDemoFields, WM_PRINT_ZI_WM_FIELD_QNAMES } from "../src/lib/wm-print/generate-pdf.ts";
import { normalizeWmPrintTemplates } from "../src/lib/wm-print/templates.ts";

const TEMPLATES_KEY = "kw-wm-print-templates";
const execute = process.argv.includes("--execute");

const env = loadEnv("", process.cwd(), "");
const BASE = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-0afb8820`;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const AUDIT = join(process.cwd(), "audit");
mkdirSync(AUDIT, { recursive: true });

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

async function uploadPdf(templateId, fileId, bytes, filename) {
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "application/pdf" }), filename);
  form.append("jobId", "wm-print");
  form.append("filename", `template-${templateId}-${fileId}.pdf`);

  const res = await fetch(`${BASE}/storage-upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.ok) throw new Error(data.error || `upload ${res.status}`);
  return { path: data.path, publicUrl: data.publicUrl };
}

console.log(`=== P0.2A publish ZI template (${execute ? "EXECUTE" : "DRY RUN"}) ===\n`);

const data = await batchGet([TEMPLATES_KEY]);
const templates = normalizeWmPrintTemplates(data.values?.[0]);
const zi = templates.find((t) => t.name === "ZI" && (t.files?.length ?? 0) > 0);
if (!zi) throw new Error("Brak szablonu ZI z plikiem w KV");

const srcUrl = zi.files?.[0]?.storageUrl;
if (!srcUrl) throw new Error("Brak storageUrl w pliku ZI");
console.log("ZI id:", zi.id);
console.log("Src:", srcUrl.slice(-70));

const raw = new Uint8Array(await (await fetch(srcUrl)).arrayBuffer());
const cleaned = await cleanZiTemplateDemoFields(raw);
const outPath = join(AUDIT, "zi-template-p0-2a-cleaned.pdf");
writeFileSync(outPath, cleaned);
console.log("Cleaned:", outPath, cleaned.length, "B (było", raw.length, "B)");

const fileId = crypto.randomUUID();
const up = execute
  ? await uploadPdf(zi.id, fileId, cleaned, "ZI-zgloszenie-gotowosci-instalacji-do-przylaczenia-gd.pdf")
  : { path: `(dry) jobs/wm-print/template-${zi.id}-${fileId}.pdf`, publicUrl: "(dry-run)" };

const now = new Date().toISOString();
const updated = templates.map((t) => {
  if (t.id !== zi.id) return t;
  return {
    ...t,
    updatedAt: now,
    pdfFieldMapping: { ...WM_PRINT_ZI_WM_FIELD_QNAMES },
    files: [
      {
        id: fileId,
        sortOrder: 10,
        storageUrl: up.publicUrl,
        storagePath: up.path,
        uploadedAt: now,
        originalFileName: "ZI-zgloszenie-gotowosci-instalacji-do-przylaczenia-gd.pdf",
      },
    ],
  };
});

const report = {
  generatedAt: now,
  execute,
  templateId: zi.id,
  previousFileId: zi.files?.[0]?.id ?? null,
  newFileId: fileId,
  storageUrl: up.publicUrl,
  bytes: cleaned.length,
  pdfFieldMapping: WM_PRINT_ZI_WM_FIELD_QNAMES,
};
writeFileSync(join(AUDIT, "zi-p0-2a-publish-report.json"), JSON.stringify(report, null, 2));

if (execute) {
  await batchSet([TEMPLATES_KEY], [updated]);
  console.log("\nKV updated:", TEMPLATES_KEY);
} else {
  console.log("\nDRY RUN — pominięto upload i batch-set. Użyj --execute.");
}

console.log("Raport:", join(AUDIT, "zi-p0-2a-publish-report.json"));
