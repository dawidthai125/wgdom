/**
 * P0 — usuń legacy ZI LiveCycle slot z KV (tombstone + verify).
 *
 * npx vite-node scripts/p0-wm-druk-zi-legacy-cleanup.mjs
 * npx vite-node scripts/p0-wm-druk-zi-legacy-cleanup.mjs --execute
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { loadEnv } from "vite";
import { getEnabledWmPrintTemplates, parseWmPrintTemplates } from "../src/lib/wm-print/templates.ts";

const LEGACY_ZI_ID = "26f02c78-871c-4d65-aeac-d0ca06bf060c";
const CANONICAL_ZI_ID = "2b22da48-46dc-42a0-8236-d42b5b5562dc";
const TEMPLATES_KEY = "kw-wm-print-templates";
const DELETED_IDS_KEY = "kw-wm-print-deleted-template-ids";
const execute = process.argv.includes("--execute");

const env = loadEnv("", process.cwd(), "");
const BASE = `https://${env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/make-server-0afb8820`;
const ANON = env.VITE_SUPABASE_ANON_KEY;

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

const auditDir = join(process.cwd(), "audit", "tauron-audit-2026-06-15");
mkdirSync(auditDir, { recursive: true });

console.log(`=== P0 WM Druk ZI legacy cleanup (${execute ? "EXECUTE" : "DRY RUN"}) ===\n`);

const data = await batchGet([TEMPLATES_KEY, DELETED_IDS_KEY]);
const templates = parseWmPrintTemplates(data.values?.[0] ?? []);
const deletedIds = Array.isArray(data.values?.[1]) ? [...data.values[1]] : [];

const legacy = templates.find((t) => t.id === LEGACY_ZI_ID);
const canonical = templates.find((t) => t.id === CANONICAL_ZI_ID);
const ziEnabled = getEnabledWmPrintTemplates(templates).filter((t) => t.name === "ZI");

console.log("Before:");
console.log(`  templates: ${templates.length}, ZI enabled: ${ziEnabled.length}`);
for (const z of ziEnabled) {
  console.log(`    - ${z.id}  ${z.files?.[0]?.originalFileName ?? "(no file)"}`);
}
console.log(`  legacy in KV: ${!!legacy}`);
console.log(`  canonical in KV: ${!!canonical}`);
console.log(`  legacy in tombstones: ${deletedIds.includes(LEGACY_ZI_ID)}`);

if (!legacy) {
  console.log("\nLegacy slot already absent from templates — nothing to remove.");
  if (!deletedIds.includes(LEGACY_ZI_ID)) {
    console.log("WARN: legacy id not in tombstones either.");
  }
  process.exit(0);
}

const keptTemplates = templates.filter((t) => t.id !== LEGACY_ZI_ID);
const newDeletedIds = deletedIds.includes(LEGACY_ZI_ID) ? deletedIds : [...deletedIds, LEGACY_ZI_ID];

const plan = {
  removeTemplateId: LEGACY_ZI_ID,
  removeFileName: legacy.files?.[0]?.originalFileName,
  templatesBefore: templates.length,
  templatesAfter: keptTemplates.length,
  tombstoneAdded: !deletedIds.includes(LEGACY_ZI_ID),
  canonicalZiPresent: keptTemplates.some((t) => t.id === CANONICAL_ZI_ID),
  ziAfter: getEnabledWmPrintTemplates(keptTemplates).filter((t) => t.name === "ZI").map((t) => ({
    id: t.id,
    file: t.files?.[0]?.originalFileName,
  })),
};

writeFileSync(join(auditDir, "p0-wm-druk-zi-legacy-cleanup-plan.json"), JSON.stringify(plan, null, 2));
console.log("\nPlan:", JSON.stringify(plan, null, 2));

if (!execute) {
  console.log("\nDRY RUN — uruchom z --execute aby zapisać do KV.");
  process.exit(0);
}

const backupPath = join(auditDir, "p0-wm-druk-zi-legacy-cleanup-backup.json");
writeFileSync(
  backupPath,
  JSON.stringify({ backedUpAt: new Date().toISOString(), templates, deletedIds }, null, 2),
);
console.log(`\nBackup: ${backupPath}`);

await batchSet([TEMPLATES_KEY, DELETED_IDS_KEY], [keptTemplates, newDeletedIds]);

const verify = await batchGet([TEMPLATES_KEY, DELETED_IDS_KEY]);
const afterTemplates = parseWmPrintTemplates(verify.values?.[0] ?? []);
const afterDeleted = verify.values?.[1] ?? [];
const afterZi = getEnabledWmPrintTemplates(afterTemplates).filter((t) => t.name === "ZI");

const checks = [
  !afterTemplates.some((t) => t.id === LEGACY_ZI_ID),
  afterDeleted.includes(LEGACY_ZI_ID),
  afterZi.length === 1,
  afterZi[0]?.id === CANONICAL_ZI_ID,
  afterZi[0]?.files?.[0]?.originalFileName === "ZI.pdf",
];

const report = {
  executedAt: new Date().toISOString(),
  checks: {
    legacyRemovedFromTemplates: checks[0],
    legacyInTombstones: checks[1],
    singleZiEnabled: checks[2],
    canonicalId: checks[3],
    canonicalFileName: checks[4],
  },
  afterZi: afterZi.map((t) => ({ id: t.id, file: t.files?.[0]?.originalFileName })),
  tombstoneCount: afterDeleted.length,
};

writeFileSync(join(auditDir, "p0-wm-druk-zi-legacy-cleanup-report.json"), JSON.stringify(report, null, 2));

console.log("\nVerify:", report.checks);
if (checks.every(Boolean)) {
  console.log("\n=== P0 ZI LEGACY CLEANUP PASS ===");
} else {
  console.error("\n=== P0 ZI LEGACY CLEANUP FAIL ===");
  process.exit(1);
}
