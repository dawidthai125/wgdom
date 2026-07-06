/**
 * #5C-5A — Legacy KV sync quiesce (kw-wgdom-cost-catalog).
 * Run: npx vite-node scripts/test-legacy-kv-sync-quiesce-5c5a.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-legacy-kv-quiesce-5c5a";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-legacy-kv-quiesce";

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  BOOTSTRAP_DEFERRED_KEYS,
  DATA_KEYS,
  fetchAndMergeDeferredBootstrap,
} from "../src/lib/cloud-sync.ts";
import {
  TENDER_DATA_KEYS,
  WGDOM_COST_CATALOG_HISTORY_KEY,
} from "../src/lib/tenders-sync.ts";
import { WGDOM_COST_CATALOG_KEY } from "../src/lib/wgdom-cost-catalog-store.ts";

const LEGACY_KEY = "kw-wgdom-cost-catalog";
const root = resolve(import.meta.dirname, "..");
const cloudSyncSrc = readFileSync(resolve(root, "src/lib/cloud-sync.ts"), "utf8");
const bootstrapSrc = readFileSync(resolve(root, "src/lib/work-catalog-bootstrap.ts"), "utf8");
const bootstrapHash = createHash("sha256").update(bootstrapSrc).digest("hex");

const storage = new Map();
globalThis.localStorage = {
  getItem: (key) => (storage.has(key) ? storage.get(key) : null),
  setItem: (key, value) => {
    storage.set(key, String(value));
  },
  removeItem: (key) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
};

const batchGetKeys = [];
const batchSetKeys = [];

globalThis.fetch = async (url, init) => {
  const urlStr = String(url);
  if (urlStr.includes("batch-get")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const keys = Array.isArray(body.keys) ? body.keys : [];
    batchGetKeys.push(...keys);
    return new Response(JSON.stringify({ values: keys.map(() => null) }), { status: 200 });
  }
  if (urlStr.includes("batch-set")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const keys = Array.isArray(body.keys) ? body.keys : [];
    batchSetKeys.push(...keys);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (!cond) {
    fail += 1;
    console.error(`FAIL ${msg}`);
    return;
  }
  pass += 1;
  console.log(`PASS ${msg}`);
}

console.log("=== T1 — DATA_KEYS bez legacy catalog ===");
assert(!DATA_KEYS.includes(LEGACY_KEY), "T1 DATA_KEYS excludes kw-wgdom-cost-catalog");

console.log("\n=== T2 — BOOTSTRAP_DEFERRED_KEYS bez legacy catalog ===");
assert(
  !BOOTSTRAP_DEFERRED_KEYS.includes(LEGACY_KEY),
  "T2 BOOTSTRAP_DEFERRED_KEYS excludes kw-wgdom-cost-catalog",
);

console.log("\n=== T3 — mergeDataKey bez case legacy catalog ===");
const mergeSwitch = cloudSyncSrc.match(/function mergeDataKey[\s\S]*?^}/m)?.[0] ?? "";
assert(
  !mergeSwitch.includes(`case "${LEGACY_KEY}"`),
  "T3 mergeDataKey has no kw-wgdom-cost-catalog case",
);

console.log("\n=== T4 — TENDER_DATA_KEYS bez WGDOM_COST_CATALOG_KEY ===");
assert(!TENDER_DATA_KEYS.includes(WGDOM_COST_CATALOG_KEY), "T4 TENDER_DATA_KEYS excludes WGDOM_COST_CATALOG_KEY");

console.log("\n=== T5 — history KV nadal w TENDER_DATA_KEYS ===");
assert(
  TENDER_DATA_KEYS.includes(WGDOM_COST_CATALOG_HISTORY_KEY),
  "T5 TENDER_DATA_KEYS still includes WGDOM_COST_CATALOG_HISTORY_KEY",
);
assert(
  DATA_KEYS.includes(WGDOM_COST_CATALOG_HISTORY_KEY),
  "T5 DATA_KEYS still includes kw-wgdom-cost-catalog-history",
);
assert(
  BOOTSTRAP_DEFERRED_KEYS.includes(WGDOM_COST_CATALOG_HISTORY_KEY),
  "T5 BOOTSTRAP_DEFERRED_KEYS still includes kw-wgdom-cost-catalog-history",
);

console.log("\n=== T6/T7 — deferred bootstrap mock batch-get/set ===");
batchGetKeys.length = 0;
batchSetKeys.length = 0;
storage.clear();
await fetchAndMergeDeferredBootstrap();
assert(!batchGetKeys.includes(LEGACY_KEY), "T6 batch-get excludes kw-wgdom-cost-catalog");
assert(!batchSetKeys.includes(LEGACY_KEY), "T7 batch-set excludes kw-wgdom-cost-catalog");
assert(batchGetKeys.length > 0, "T6 batch-get executed for deferred keys");

console.log("\n=== T8 — bootstrap hook #5C-5B finalize in cloud-sync ===");
assert(
  cloudSyncSrc.includes("finalizeWorkCatalogAfterDeferredMerge"),
  "T8 fetchAndMergeDeferredBootstrap calls finalizeWorkCatalogAfterDeferredMerge",
);
assert(
  !cloudSyncSrc.includes("maybeExecuteWorkCatalogReconcile"),
  "T8 fetchAndMergeDeferredBootstrap does not call reconcile",
);

console.log("\n=== T9 — payroll keys unchanged in DATA_KEYS ===");
assert(DATA_KEYS.includes("kw-week-employees"), "T9 kw-week-employees in DATA_KEYS");
assert(DATA_KEYS.includes("kw-archive"), "T9 kw-archive in DATA_KEYS");

console.log("\n=== T10 — work-catalog-bootstrap.ts frozen (hash) ===");
const expectedBootstrapHash = process.env.WGDOM_5C5A_BOOTSTRAP_SHA256;
if (expectedBootstrapHash) {
  assert(bootstrapHash === expectedBootstrapHash, "T10 work-catalog-bootstrap.ts hash matches baseline");
} else {
  assert(bootstrapSrc.includes("decideWorkCatalogBootstrap"), "T10 work-catalog-bootstrap.ts intact");
  console.log(`INFO T10 bootstrap sha256=${bootstrapHash} (set WGDOM_5C5A_BOOTSTRAP_SHA256 to pin)`);
}

console.log(`\n#5C-5A legacy-kv-sync-quiesce: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
