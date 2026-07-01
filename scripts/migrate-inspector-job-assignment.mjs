/**
 * INSPECTOR-JOB-ASSIGN-001 Faza 2 — migracja legacy kw-jobs → assignedInspectorId = "szymon"
 *
 * Run (dry-run):  npx vite-node scripts/migrate-inspector-job-assignment.mjs --dry-run
 * Run (apply):     npx vite-node scripts/migrate-inspector-job-assignment.mjs
 *
 * Wymaga VITE_SUPABASE_* w .env dla push do chmury.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  applyLegacyInspectorMigration,
  MIGRATION_LEGACY_INSPECTOR_ID,
} from "../src/lib/inspector-job-assignment.ts";
import { normalizeJob } from "../src/app/app-domain.ts";

const dryRun = process.argv.includes("--dry-run");
const localOnly = process.argv.includes("--local-only");
const backupPath = resolve("audit/migrate-inspector-job-assignment-backup.json");

const projectId = process.env.VITE_SUPABASE_PROJECT_ID;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
const base = projectId && anonKey
  ? `https://${projectId}.supabase.co/functions/v1/make-server-0afb8820`
  : null;

async function fetchCloudJobs() {
  if (!base) return null;
  const res = await fetch(`${base}/batch-get`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ keys: ["kw-jobs"] }),
  });
  if (!res.ok) throw new Error(`batch-get failed: ${res.status}`);
  const { values } = await res.json();
  return Array.isArray(values?.[0]) ? values[0] : [];
}

async function pushCloudJobs(jobs) {
  if (!base) throw new Error("Brak VITE_SUPABASE_* — nie można push do chmury");
  const res = await fetch(`${base}/batch-set`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify({ keys: ["kw-jobs"], values: [jobs] }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `batch-set failed: ${res.status}`);
}

function loadLocalJobs() {
  const p = resolve("restore-lista-plac-2026-05-25.json");
  if (process.argv.includes("--from-localstorage-export") && existsSync(p)) {
    const raw = JSON.parse(readFileSync(p, "utf8"));
    return raw["kw-jobs"] ?? raw.jobs ?? [];
  }
  return null;
}

async function main() {
  let source = "cloud";
  let rawJobs = await fetchCloudJobs();
  if (!rawJobs?.length) {
    rawJobs = loadLocalJobs();
    source = rawJobs ? "local-export" : "empty";
  }
  if (!rawJobs) rawJobs = [];

  const jobs = rawJobs.map((j) => normalizeJob(j));
  const { jobs: migratedJobs, migrated } = applyLegacyInspectorMigration(jobs);

  const report = {
    dryRun,
    source,
    total: jobs.length,
    migrated,
    legacyInspectorId: MIGRATION_LEGACY_INSPECTOR_ID,
    alreadyAssigned: jobs.length - migrated,
    timestamp: new Date().toISOString(),
  };

  console.log(JSON.stringify(report, null, 2));

  if (migrated === 0) {
    console.log("PASS — brak robot do migracji");
    return;
  }

  if (dryRun) {
    console.log(`DRY-RUN — ${migrated} robot(y) do migracji (bez zapisu)`);
    return;
  }

  writeFileSync(backupPath, JSON.stringify({ "kw-jobs": jobs }, null, 2));
  console.log(`Backup: ${backupPath}`);

  if (!localOnly) {
    await pushCloudJobs(migratedJobs);
    console.log(`PUSH cloud OK — ${migratedJobs.length} jobs`);
  }
}

main().catch((err) => {
  console.error("FAIL:", err.message || err);
  process.exit(1);
});
