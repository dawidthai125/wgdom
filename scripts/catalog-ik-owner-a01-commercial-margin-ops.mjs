/**
 * IK-OWNER-A01 F5 MARGIN OPS — Owner-approved commercialPricing seed (LP9 + LP10).
 *
 * Dry-run:
 *   npx vite-node scripts/catalog-ik-owner-a01-commercial-margin-ops.mjs --margin-pct <VALUE>
 *   npx vite-node scripts/catalog-ik-owner-a01-commercial-margin-ops.mjs --lp9-margin-pct <V> --lp10-margin-pct <V>
 *
 * Execute (NOT for this session):
 *   ... --execute
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import {
  IK_OWNER_A01_COMMERCIAL_MARGIN_FROZEN_COLLATERAL,
  IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS,
  IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS,
  applyA01CommercialMarginSeed,
  parseA01CommercialMarginCliArgs,
  probeA01CommercialMarginPerTarget,
} from "../src/lib/work-catalog/ik-owner-create-a01-commercial-margin-ops.ts";
import {
  probeA01OurRatePerTarget,
  stableMarketQuotesJson,
} from "../src/lib/work-catalog/ik-owner-create-a01-our-rate-ops.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";

const EXECUTE = process.argv.includes("--execute");
const OUT = path.join(process.cwd(), ".tmp");
const TS = new Date().toISOString();

let margins;
try {
  margins = parseA01CommercialMarginCliArgs(process.argv);
} catch (err) {
  console.error(err.message);
  process.exit(err.message === "OWNER_MARGIN_VALUE_REQUIRED" ? 1 : 2);
}

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

console.log("=== IK-OWNER-A01 F5 COMMERCIAL MARGIN OPS ===");
console.log(
  `mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} · targets=${IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS.length} · lp9=${margins.lp9} · lp10=${margins.lp10}`,
);

const kv = await batchGet(["kw-wgdom-work-catalog"]);
const catalog = unwrap(
  kv.values?.["kw-wgdom-work-catalog"] ??
    kv.values?.[0] ??
    Object.values(kv.values ?? {})[0],
);
if (!catalog) throw new Error("brak kw-wgdom-work-catalog");
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-a01-commercial-margin-backup.json"),
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

const beforeMargin = probeA01CommercialMarginPerTarget(store, margins);
console.log("BEFORE_MARGIN:", JSON.stringify(beforeMargin, null, 2));

const quotesBefore = Object.fromEntries(
  IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS.map((t) => [
    t.workId,
    Object.fromEntries(
      IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS.map((r) => [
        r,
        stableMarketQuotesJson(getWorkByIdFromStore(store, t.workId, r)),
      ]),
    ),
  ]),
);
console.log("QUOTES_BEFORE:", JSON.stringify(quotesBefore, null, 2));

const collateralBefore = getWorkByIdFromStore(
  store,
  IK_OWNER_A01_COMMERCIAL_MARGIN_FROZEN_COLLATERAL,
  "wroclaw",
);
const collateralQuotesBefore = stableMarketQuotesJson(collateralBefore);
console.log(`COLLATERAL_QUOTES_BEFORE=${collateralQuotesBefore}`);

let mergeResult;
try {
  mergeResult = applyA01CommercialMarginSeed(store, margins, TS);
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

const afterMargin = probeA01CommercialMarginPerTarget(store, margins);
console.log("AFTER_MARGIN:", JSON.stringify(afterMargin, null, 2));

const quotesAfter = Object.fromEntries(
  IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS.map((t) => [
    t.workId,
    Object.fromEntries(
      IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS.map((r) => [
        r,
        stableMarketQuotesJson(getWorkByIdFromStore(store, t.workId, r)),
      ]),
    ),
  ]),
);
const quotesFrozen = IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS.every((t) =>
  IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS.every(
    (r) => quotesBefore[t.workId][r] === quotesAfter[t.workId][r],
  ),
);
console.log(`QUOTES_FROZEN=${quotesFrozen}`);
if (!quotesFrozen) {
  console.error("STOP: LP9/LP10 marketQuotes mutated");
  process.exit(7);
}

const collateralAfter = getWorkByIdFromStore(
  store,
  IK_OWNER_A01_COMMERCIAL_MARGIN_FROZEN_COLLATERAL,
  "wroclaw",
);
const collateralQuotesAfter = stableMarketQuotesJson(collateralAfter);
const collateralUntouched = collateralQuotesBefore === collateralQuotesAfter;
console.log(`COLLATERAL_UNTOUCHED=${collateralUntouched}`);
if (!collateralUntouched) {
  console.error("STOP: collateral scianki quotes changed");
  process.exit(8);
}

const allRatesOk = IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS.every((t) =>
  IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS.every(
    (r) => afterRates[t.workId]?.[r] === "PRESENT_OK",
  ),
);
if (!allRatesOk) {
  console.error("STOP: post-merge OUR RATE verification failed");
  process.exit(3);
}

const report = {
  at: TS,
  mode: EXECUTE ? "EXECUTE" : "DRY-RUN",
  margins,
  beforeRates,
  beforeMargin,
  perTarget: mergeResult.perTarget,
  changed: mergeResult.changed,
  afterRates,
  afterMargin,
  quotesFrozen,
  collateralUntouched,
  quotesFingerprintsBefore: mergeResult.quotesFingerprintsBefore,
  quotesFingerprintsAfter: mergeResult.quotesFingerprintsAfter,
};

if (!EXECUTE) {
  fs.writeFileSync(
    path.join(OUT, "catalog-ik-owner-a01-commercial-margin-ops-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("\nDRY-RUN OK — run with --execute to commit commercial margin + cloud KV");
  process.exit(0);
}

if (!mergeResult.changed) {
  console.log("IDEMPOTENT NO-OP — cloud KV unchanged");
  fs.writeFileSync(
    path.join(OUT, "catalog-ik-owner-a01-commercial-margin-ops-report.json"),
    JSON.stringify({ ...report, cloudWrite: "SKIPPED_NO_CHANGE" }, null, 2),
  );
  process.exit(0);
}

const payload = JSON.parse(JSON.stringify(store));
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-a01-commercial-margin-committed.json"),
  JSON.stringify(payload, null, 2),
);
await batchSet(["kw-wgdom-work-catalog"], [payload]);

const kv2 = await batchGet(["kw-wgdom-work-catalog"]);
const cloud = unwrap(
  kv2.values?.["kw-wgdom-work-catalog"] ?? Object.values(kv2.values ?? {})[0],
);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(cloud));
const cloudStore = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
const cloudVerify = probeA01CommercialMarginPerTarget(cloudStore, margins);
console.log("CLOUD_VERIFY:", JSON.stringify(cloudVerify, null, 2));

fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-a01-commercial-margin-ops-report.json"),
  JSON.stringify({ ...report, cloudWrite: "OK", cloudVerify }, null, 2),
);
console.log("\n=== IK-OWNER-A01 F5 COMMERCIAL MARGIN OPS COMPLETE ===");
