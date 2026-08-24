/**
 * IK-OWNER-A01-S3 OUR RATE OPS — Owner-approved ourWorkRate seed (LP9 + LP10).
 *
 * Dry-run: npx vite-node scripts/catalog-ik-owner-a01-our-rate-ops.mjs
 * Execute:  npx vite-node scripts/catalog-ik-owner-a01-our-rate-ops.mjs --execute
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import {
  IK_OWNER_A01_OUR_RATE_OPS_EXPECTED,
  IK_OWNER_A01_OUR_RATE_OPS_REGIONS,
  IK_OWNER_A01_OUR_RATE_TARGETS,
  applyA01OurRateSeed,
  probeA01OurRatePerTarget,
  stableMarketQuotesJson,
} from "../src/lib/work-catalog/ik-owner-create-a01-our-rate-ops.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";

const EXECUTE = process.argv.includes("--execute");
const OUT = path.join(process.cwd(), ".tmp");
const TS = new Date().toISOString();
const FROZEN_COLLATERAL = "cc-w2-scianki-dzialowe-gr-pakiet-m2";

const ls = new Map();
globalThis.localStorage = {
  getItem: (k) => (ls.has(k) ? ls.get(k) : null),
  setItem: (k, v) => ls.set(k, String(v)),
  removeItem: (k) => ls.delete(k),
  clear: () => ls.clear(),
  key: (i) => [...ls.keys()][i] ?? null,
  get length() {
    return ls.size;
  },
};

const env = loadEnv("", process.cwd(), "");
const anon = env.VITE_SUPABASE_ANON_KEY;
const edge = `https://${env.VITE_SUPABASE_PROJECT_ID || "bdpygdvfgbggermvqtys"}.supabase.co/functions/v1/make-server-0afb8820`;

function unwrap(raw) {
  if (raw == null) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }
  return raw;
}

async function batchGet(keys) {
  const res = await fetch(`${edge}/batch-get`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`batch-get ${res.status}`);
  return res.json();
}

async function batchSet(keys, values) {
  const res = await fetch(`${edge}/batch-set`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${anon}`,
      apikey: anon,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ keys, values }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) throw new Error(`batch-set ${res.status}: ${await res.text()}`);
}

console.log("=== IK-OWNER-A01-S3 OUR RATE OPS ===");
console.log(`mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} · targets=${IK_OWNER_A01_OUR_RATE_TARGETS.length}`);

const kv = await batchGet(["kw-wgdom-work-catalog"]);
const catalog = unwrap(
  kv.values?.["kw-wgdom-work-catalog"] ??
    kv.values?.[0] ??
    Object.values(kv.values ?? {})[0],
);
if (!catalog) throw new Error("brak kw-wgdom-work-catalog");
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-a01-our-rate-backup.json"),
  JSON.stringify({ backedUpAt: TS, catalog }, null, 2),
);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(catalog));

const {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
} = await import("../src/lib/work-catalog/work-catalog-store.ts");

let store = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());

const beforeRates = probeA01OurRatePerTarget(store);
console.log("BEFORE_RATES:", JSON.stringify(beforeRates, null, 2));

const quotesBefore = Object.fromEntries(
  IK_OWNER_A01_OUR_RATE_TARGETS.map((t) => [
    t.workId,
    Object.fromEntries(
      IK_OWNER_A01_OUR_RATE_OPS_REGIONS.map((r) => [
        r,
        stableMarketQuotesJson(getWorkByIdFromStore(store, t.workId, r)),
      ]),
    ),
  ]),
);
console.log("QUOTES_BEFORE:", JSON.stringify(quotesBefore, null, 2));

const collateralBefore = getWorkByIdFromStore(store, FROZEN_COLLATERAL, "wroclaw");
const collateralQuotesBefore = stableMarketQuotesJson(collateralBefore);
console.log(`COLLATERAL_QUOTES_BEFORE=${collateralQuotesBefore}`);

let mergeResult;
try {
  mergeResult = applyA01OurRateSeed(store, TS);
} catch (err) {
  console.error("STOP:", err.message);
  process.exit(2);
}

store = normalizeWorkCatalogStore(mergeResult.store);
console.log("PER_TARGET:", JSON.stringify(mergeResult.perTarget, null, 2));
console.log(`CHANGED=${mergeResult.changed}`);

if (mergeResult.changed) {
  saveWorkCatalogStoreLocal(store, { updatedAtIso: TS });
}

const afterRates = probeA01OurRatePerTarget(store);
console.log("AFTER_RATES:", JSON.stringify(afterRates, null, 2));

const quotesAfter = Object.fromEntries(
  IK_OWNER_A01_OUR_RATE_TARGETS.map((t) => [
    t.workId,
    Object.fromEntries(
      IK_OWNER_A01_OUR_RATE_OPS_REGIONS.map((r) => [
        r,
        stableMarketQuotesJson(getWorkByIdFromStore(store, t.workId, r)),
      ]),
    ),
  ]),
);
const quotesFrozen = IK_OWNER_A01_OUR_RATE_TARGETS.every(
  (t) =>
    IK_OWNER_A01_OUR_RATE_OPS_REGIONS.every(
      (r) => quotesBefore[t.workId][r] === quotesAfter[t.workId][r],
    ),
);
console.log(`QUOTES_FROZEN=${quotesFrozen}`);
if (!quotesFrozen) {
  console.error("STOP: LP9/LP10 marketQuotes mutated");
  process.exit(7);
}

const collateralAfter = getWorkByIdFromStore(store, FROZEN_COLLATERAL, "wroclaw");
const collateralQuotesAfter = stableMarketQuotesJson(collateralAfter);
const collateralUntouched = collateralQuotesBefore === collateralQuotesAfter;
console.log(`COLLATERAL_UNTOUCHED=${collateralUntouched}`);
if (!collateralUntouched) {
  console.error("STOP: collateral scianki quotes changed");
  process.exit(8);
}

const allOk = IK_OWNER_A01_OUR_RATE_TARGETS.every((t) =>
  IK_OWNER_A01_OUR_RATE_OPS_REGIONS.every(
    (r) => afterRates[t.workId]?.[r] === "PRESENT_OK",
  ),
);
if (!allOk) {
  console.error("STOP: post-merge OUR RATE verification failed");
  process.exit(3);
}

const report = {
  at: TS,
  mode: EXECUTE ? "EXECUTE" : "DRY-RUN",
  expected: IK_OWNER_A01_OUR_RATE_OPS_EXPECTED,
  beforeRates,
  perTarget: mergeResult.perTarget,
  changed: mergeResult.changed,
  afterRates,
  quotesFrozen,
  collateralUntouched,
};

if (!EXECUTE) {
  fs.writeFileSync(
    path.join(OUT, "catalog-ik-owner-a01-our-rate-ops-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("\nDRY-RUN OK — run with --execute to commit OUR RATE + cloud KV");
  process.exit(0);
}

if (!mergeResult.changed) {
  console.log("IDEMPOTENT NO-OP — cloud KV unchanged");
  fs.writeFileSync(
    path.join(OUT, "catalog-ik-owner-a01-our-rate-ops-report.json"),
    JSON.stringify({ ...report, cloudWrite: "SKIPPED_NO_CHANGE" }, null, 2),
  );
  process.exit(0);
}

const payload = JSON.parse(JSON.stringify(store));
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-a01-our-rate-committed.json"),
  JSON.stringify(payload, null, 2),
);
await batchSet(["kw-wgdom-work-catalog"], [payload]);

const kv2 = await batchGet(["kw-wgdom-work-catalog"]);
const cloud = unwrap(
  kv2.values?.["kw-wgdom-work-catalog"] ?? Object.values(kv2.values ?? {})[0],
);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(cloud));
const cloudStore = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
const cloudVerify = probeA01OurRatePerTarget(cloudStore);
console.log("CLOUD_VERIFY:", JSON.stringify(cloudVerify));
const cloudOk = IK_OWNER_A01_OUR_RATE_TARGETS.every((t) =>
  IK_OWNER_A01_OUR_RATE_OPS_REGIONS.every(
    (r) => cloudVerify[t.workId]?.[r] === "PRESENT_OK",
  ),
);
if (!cloudOk) {
  console.error("STOP: cloud verification failed");
  process.exit(4);
}

fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-a01-our-rate-ops-report.json"),
  JSON.stringify({ ...report, cloudWrite: "OK", cloudVerify }, null, 2),
);
console.log("\n=== IK-OWNER-A01-S3 OUR RATE OPS COMPLETE ===");
