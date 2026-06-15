/**
 * P0 — WM Print template pollution CLEANUP
 *
 * Domyślnie DRY RUN (backup + raport KEEP/DELETE).
 * --execute — zapis do KV po akceptacji.
 *
 * npx vite-node scripts/cleanup-wm-print-template-pollution.mjs
 * npx vite-node scripts/cleanup-wm-print-template-pollution.mjs --execute
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "vite";
import { planWmPrintTemplateCleanup } from "../src/lib/wm-print/template-cleanup.ts";
import { countWmPrintTemplateFiles, parseWmPrintTemplates } from "../src/lib/wm-print/templates.ts";

const CANONICAL_ZI_ID = "e911d6a5-3728-4089-bb9a-a4adec6e9c20";

const env = loadEnv("", process.cwd(), "");
const BASE = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-0afb8820`;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const TEMPLATES_KEY = "kw-wm-print-templates";
const DELETED_IDS_KEY = "kw-wm-print-deleted-template-ids";
const execute = process.argv.includes("--execute");

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

const auditDir = join(process.cwd(), "audit");
mkdirSync(auditDir, { recursive: true });

console.log(`=== P0 WM Print Template Cleanup (${execute ? "EXECUTE" : "DRY RUN"}) ===\n`);

const data = await batchGet([TEMPLATES_KEY, DELETED_IDS_KEY]);
const rawTemplates = data.values?.[0];
const rawDeleted = data.values?.[1];
const templates = Array.isArray(rawTemplates) ? rawTemplates : [];
const deletedIds = new Set(Array.isArray(rawDeleted) ? rawDeleted : []);

const countBefore = templates.length;
const backupPath = join(auditDir, "template-cleanup-backup.json");
writeFileSync(
  backupPath,
  JSON.stringify(
    {
      backedUpAt: new Date().toISOString(),
      key: TEMPLATES_KEY,
      count: countBefore,
      deletedTemplateIds: [...deletedIds],
      templates,
    },
    null,
    2,
  ),
);
console.log(`1. Backup: ${backupPath} (${countBefore} rekordów)\n`);

const plan = planWmPrintTemplateCleanup(parseWmPrintTemplates(templates));
const reportPath = join(auditDir, "template-cleanup-report.json");
writeFileSync(
  reportPath,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      mode: execute ? "execute" : "dry-run",
      countBefore,
      countAfter: plan.keptTemplates.length,
      deleteCount: plan.delete.length,
      keepCount: plan.keep.length,
      keep: plan.keep,
      delete: plan.delete,
      deleteIds: plan.delete.map((d) => d.id),
    },
    null,
    2,
  ),
);

console.log(`2. Raport: ${reportPath}\n`);
console.log(`   KEEP:   ${plan.keep.length}`);
for (const k of plan.keep) {
  console.log(`     + ${k.name}  id=${k.id}  files=${k.filesCount}  created=${k.createdAt}  (${k.reason})`);
}

console.log(`\n   DELETE: ${plan.delete.length}`);
for (const d of plan.delete) {
  console.log(`     - ${d.name}  id=${d.id}  files=${d.filesCount}  created=${d.createdAt}`);
}

console.log(`\n3. DRY RUN podsumowanie`);
console.log(`   Przed:  ${countBefore}`);
console.log(`   Po:     ${plan.keptTemplates.length}`);
console.log(`   Usunąć: ${plan.delete.length} UUID`);
console.log(`   UUID:   ${plan.delete.map((d) => d.id).join(", ") || "(brak)"}`);

if (!execute) {
  console.log("\n4. DRY RUN — brak zapisu do KV. Uruchom z --execute po akceptacji.");
  process.exit(0);
}

const newDeletedIds = [...deletedIds];
for (const d of plan.delete) {
  if (!newDeletedIds.includes(d.id)) newDeletedIds.push(d.id);
}

await batchSet(
  [TEMPLATES_KEY, DELETED_IDS_KEY],
  [plan.keptTemplates, newDeletedIds],
);

const verify = await batchGet([TEMPLATES_KEY, DELETED_IDS_KEY]);
const afterRaw = verify.values?.[0];
const afterDeletedRaw = verify.values?.[1];
const afterTemplates = parseWmPrintTemplates(Array.isArray(afterRaw) ? afterRaw : []);
const countAfter = afterTemplates.length;

const backup = JSON.parse(readFileSync(backupPath, "utf8"));
const backupTemplates = parseWmPrintTemplates(backup.templates);
const backupWithFiles = backupTemplates.filter((t) => countWmPrintTemplateFiles(t) > 0);

const checks = [];
function check(cond, msg) {
  checks.push({ pass: !!cond, msg });
  return cond;
}

const zi = afterTemplates.find((t) => t.id === CANONICAL_ZI_ID);
check(!!zi, `canonical ZI ${CANONICAL_ZI_ID} present`);
check(countAfter === 15, `count after = 15 (got ${countAfter})`);
check(countBefore === 99, `count before = 99 (got ${countBefore})`);

for (const bt of backupWithFiles) {
  const at = afterTemplates.find((t) => t.id === bt.id);
  const filesBefore = countWmPrintTemplateFiles(bt);
  const filesAfter = at ? countWmPrintTemplateFiles(at) : 0;
  check(!!at, `KEEP with files: ${bt.name} (${bt.id})`);
  check(filesAfter === filesBefore, `files preserved: ${bt.name} ${filesBefore}→${filesAfter}`);
  if (at) {
    check(at.sortOrder === bt.sortOrder, `sortOrder preserved: ${bt.name}`);
    check(at.enabled === bt.enabled, `enabled preserved: ${bt.name}`);
  }
}

const failed = checks.filter((c) => !c.pass);
const executeReportPath = join(auditDir, "template-cleanup-execute-report.json");
writeFileSync(
  executeReportPath,
  JSON.stringify(
    {
      executedAt: new Date().toISOString(),
      before: countBefore,
      after: countAfter,
      deleted: plan.delete.length,
      failed: failed.length,
      canonicalZi: zi ? "Present" : "Missing",
      checks,
      deleteIds: plan.delete.map((d) => d.id),
      tombstoneCount: Array.isArray(afterDeletedRaw) ? afterDeletedRaw.length : 0,
    },
    null,
    2,
  ),
);

console.log("\n4. EXECUTE — zapis OK");
console.log(`   Audit końcowy: przed=${countBefore}  po=${countAfter}  usunięto=${countBefore - countAfter}`);
console.log(`   Raport: ${executeReportPath}`);
console.log(`   Canonical ZI: ${zi ? "Present" : "Missing"}`);
for (const c of checks) console.log(`   ${c.pass ? "✓" : "✗"} ${c.msg}`);

if (countAfter !== plan.keptTemplates.length || failed.length > 0) {
  console.error(`\nVERIFY FAIL: ${failed.length} check(s)`);
  process.exit(1);
}
