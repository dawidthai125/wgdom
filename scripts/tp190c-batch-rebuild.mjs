/**
 * TP190C-3B — batch rebuild parserVersion=3 dla stale dossier.
 *
 * Domyślnie DRY RUN (bez zapisu KV):
 *   npx vite-node scripts/tp190c-batch-rebuild.mjs
 *
 * Zapis KV (tylko na świadome polecenie):
 *   npx vite-node scripts/tp190c-batch-rebuild.mjs --write
 */
if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor() { this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0; }
  };
}

import { writeFileSync } from "node:fs";
import { loadEnv } from "vite";
import {
  isStaleDossierCandidate,
  runTp190cBatchRebuild,
  rebuildTenderPipelineItem,
} from "../src/lib/tp190c-batch-rebuild.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";

const env = loadEnv("", process.cwd(), "");
const PROJECT = env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys";
const ANON = env.VITE_SUPABASE_ANON_KEY;
const BASE = `https://${PROJECT}.supabase.co/functions/v1/make-server-0afb8820`;

const args = process.argv.slice(2);
const dryRun = !args.includes("--write") && process.env.TP190C_BATCH_WRITE !== "1";

function parsePipelineValues(j) {
  const v = j.values;
  if (Array.isArray(v?.[0])) return v[0];
  if (typeof v?.["kw-tenders-pipeline"] === "string") {
    return JSON.parse(v["kw-tenders-pipeline"]);
  }
  return [];
}

async function fetchPipelineKv() {
  const res = await fetch(`${BASE}/batch-get`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ keys: ["kw-tenders-pipeline"] }),
  });
  const j = await res.json();
  if (!res.ok) throw new Error(`batch-get failed: ${JSON.stringify(j)}`);
  return parsePipelineValues(j);
}

async function savePipelineKv(items) {
  const res = await fetch(`${BASE}/batch-set`, {
    method: "POST",
    headers: { Authorization: `Bearer ${ANON}`, apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({
      keys: ["kw-tenders-pipeline"],
      values: [items],
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`batch-set failed: ${res.status} ${text}`);
  return text;
}

async function main() {
  console.log("=== TP190C-3B BATCH REBUILD ===\n");
  console.log(`CURRENT_PARSER_VERSION = ${CURRENT_PARSER_VERSION}`);
  console.log(`Mode: ${dryRun ? "DRY RUN (no KV write)" : "WRITE (batch-set KV)"}\n`);

  const pipeline = await fetchPipelineKv();
  const stale = pipeline.filter(isStaleDossierCandidate);
  console.log(`Pipeline items: ${pipeline.length}`);
  console.log(`Stale candidates: ${stale.length}\n`);

  if (!stale.length) {
    console.log("Nothing to rebuild.");
    return;
  }

  const result = await runTp190cBatchRebuild({
    pipeline,
    dryRun,
    rebuildOne: async (item) => (await rebuildTenderPipelineItem(item)).item,
    savePipeline: savePipelineKv,
  });

  console.log("--- STATS ---");
  console.log(JSON.stringify(result.stats, null, 2));
  console.log("\n--- ROWS ---");
  for (const row of result.rows) {
    const delta = row.after.rowCount - row.before.rowCount;
    console.log(
      `${row.bzpNumber} | ${row.outcome}`
      + ` | pv ${row.before.parserVersion ?? "null"}→${row.after.parserVersion}`
      + ` | rows ${row.before.rowCount}→${row.after.rowCount} (${delta >= 0 ? "+" : ""}${delta})`
      + (row.error ? ` | ERR: ${row.error}` : ""),
    );
  }

  const reportPath = "audit/tp190c3b-batch-rebuild-report.json";
  writeFileSync(reportPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    dryRun: result.dryRun,
    wrote: result.wrote,
    stats: result.stats,
    rows: result.rows,
  }, null, 2), "utf8");
  console.log(`\nReport: ${reportPath}`);
  console.log(`Wrote KV: ${result.wrote}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
