/**
 * Sępa A1/A2 OPS — seed KNNR 1301-01/02 pomiar CatalogWork into kw-wgdom-work-catalog.
 *
 * Dry-run: npx vite-node scripts/catalog-ik-owner-sepa-1301-pomiar-ops.mjs
 * Execute:  npx vite-node scripts/catalog-ik-owner-sepa-1301-pomiar-ops.mjs --execute
 *
 * ZERO G1 · ZERO F5 · ZERO OUR RATE · ZERO LP269 bind · 1305 untouched.
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import {
  SEPA_KNNR_1301_WORK_IDS,
  SEPA_KNNR_1301_OPS_REGIONS,
  applySepaKnr1301PomiarCatalogSeed,
  workMatchesSepaKnr1301Spec,
  getSepaKnr1301WorkSpec,
} from "../src/lib/work-catalog/ik-owner-create-sepa-1301-pomiar-ops.ts";
import {
  C2_KNR_WC_1305_01_WORK_ID,
  C2_KNR_WC_1305_02_WORK_ID,
} from "../src/lib/intelligent-estimator/c2-knr-wc-prob-owner-create.ts";

const EXECUTE = process.argv.includes("--execute");
const OUT = path.join(process.cwd(), ".tmp");
const TS = new Date().toISOString();
const CATALOG_KEY = "kw-wgdom-work-catalog";
const META_KEY = "kw-wgdom-work-catalog-meta";

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
Object.assign(process.env, env);
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

function pickByKeyOrder(kv, keys) {
  const arr = Array.isArray(kv.values) ? kv.values : [];
  const out = {};
  for (let i = 0; i < keys.length; i += 1) {
    out[keys[i]] = unwrap(arr[i]);
  }
  return out;
}

console.log("=== IK-OWNER-SEPA-1301-POMIAR OPS ===");
console.log(
  `mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} · works=${SEPA_KNNR_1301_WORK_IDS.length} · write=pushWorkCatalogStoreToCloudSafe`,
);

if (!anon) {
  console.log("SKIP: brak VITE_SUPABASE_ANON_KEY — użyj test-ik-sepa-1301-pomiar-catalog.mjs");
  process.exit(0);
}

const fetchKeys = [CATALOG_KEY, META_KEY];
const kv = await batchGet(fetchKeys);
const picked = pickByKeyOrder(kv, fetchKeys);
const catalog = picked[CATALOG_KEY];
const metaRaw = picked[META_KEY];
if (!catalog) throw new Error("brak kw-wgdom-work-catalog");

const {
  normalizeWorkCatalogMeta,
  writeWorkCatalogMetaToLs,
  readWorkCatalogMetaFromLs,
} = await import("../src/lib/work-catalog/work-catalog-meta.ts");
const metaBefore = normalizeWorkCatalogMeta(metaRaw);
const revisionBefore = metaBefore.catalogRevision;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-sepa-1301-pomiar-backup.json"),
  JSON.stringify({ backedUpAt: TS, catalog, meta: metaBefore }, null, 2),
);

localStorage.setItem(CATALOG_KEY, JSON.stringify(catalog));
writeWorkCatalogMetaToLs(metaBefore);

const {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
} = await import("../src/lib/work-catalog/work-catalog-store.ts");
const { getWorkByIdFromStore } = await import(
  "../src/lib/work-catalog/catalog-work-utils.ts"
);
const { pushWorkCatalogStoreToCloudSafe } = await import(
  "../src/lib/work-catalog/work-catalog-cloud-push.ts"
);

let store = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
const beforeProbe = {
  a1: !!getWorkByIdFromStore(store, SEPA_KNNR_1301_WORK_IDS[0], "wroclaw"),
  a2: !!getWorkByIdFromStore(store, SEPA_KNNR_1301_WORK_IDS[1], "wroclaw"),
  p1305_01: getWorkByIdFromStore(store, C2_KNR_WC_1305_01_WORK_ID, "wroclaw"),
  p1305_02: getWorkByIdFromStore(store, C2_KNR_WC_1305_02_WORK_ID, "wroclaw"),
  wroclawCount: store.catalogs.wroclaw?.works.length ?? 0,
  dolnyslaskCount: store.catalogs.dolnyslask?.works.length ?? 0,
};

let mergeResult;
try {
  mergeResult = applySepaKnr1301PomiarCatalogSeed(store, TS);
} catch (err) {
  console.error("STOP:", err.message);
  process.exit(2);
}

store = normalizeWorkCatalogStore(mergeResult.store);
if (mergeResult.changed) {
  saveWorkCatalogStoreLocal(store, { updatedAtIso: TS });
}

const report = {
  at: TS,
  mode: EXECUTE ? "EXECUTE" : "DRY-RUN",
  writePath: "pushWorkCatalogStoreToCloudSafe",
  changed: mergeResult.changed,
  createdWorkIds: mergeResult.createdWorkIds,
  beforeCount: mergeResult.beforeCount,
  afterCount: mergeResult.afterCount,
  beforeProbe: {
    a1Present: beforeProbe.a1,
    a2Present: beforeProbe.a2,
    wroclawCount: beforeProbe.wroclawCount,
    dolnyslaskCount: beforeProbe.dolnyslaskCount,
    "1305-01-unit": beforeProbe.p1305_01?.unit ?? null,
    "1305-02-unit": beforeProbe.p1305_02?.unit ?? null,
  },
  workIds: [...SEPA_KNNR_1301_WORK_IDS],
  perWork: mergeResult.perWork,
  catalogRevisionBefore: revisionBefore,
  g1: "NONE",
  f5: "NONE",
  labor: "NONE",
  ourRate: "NONE",
  p7: "NONE",
};

fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-sepa-1301-pomiar-ops-report.json"),
  JSON.stringify(report, null, 2),
);

console.log(JSON.stringify(report, null, 2));

if (!EXECUTE) {
  console.log("DRY-RUN complete — no KV write. Re-run with --execute to persist.");
  process.exit(0);
}

if (!mergeResult.changed) {
  console.log("IDEMPOTENT NO-OP — cloud KV unchanged (already PRESENT_OK).");
  fs.writeFileSync(
    path.join(OUT, "catalog-ik-owner-sepa-1301-pomiar-ops-report.json"),
    JSON.stringify({ ...report, cloudWrite: "SKIPPED_NO_CHANGE" }, null, 2),
  );
  process.exit(0);
}

let pushed;
try {
  pushed = await pushWorkCatalogStoreToCloudSafe(store, { mode: "union" });
} catch (err) {
  console.error("STOP: safe cloud push failed:", err?.message || err);
  if (err?.code) console.error("code=", err.code, "serverRevision=", err.serverRevision);
  process.exit(5);
}

const metaAfter = readWorkCatalogMetaFromLs() ?? normalizeWorkCatalogMeta(null);
const revisionAfter = metaAfter.catalogRevision;

const kv2 = await batchGet(fetchKeys);
const picked2 = pickByKeyOrder(kv2, fetchKeys);
const cloudCatalog = picked2[CATALOG_KEY];
const cloudMeta = normalizeWorkCatalogMeta(picked2[META_KEY]);
if (!cloudCatalog) {
  console.error("STOP: cloud catalog missing after push");
  process.exit(6);
}

localStorage.setItem(CATALOG_KEY, JSON.stringify(cloudCatalog));
writeWorkCatalogMetaToLs(cloudMeta);
const cloudStore = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());

const cloudVerify = {};
let allPresent = true;
for (const id of SEPA_KNNR_1301_WORK_IDS) {
  const spec = getSepaKnr1301WorkSpec(id);
  cloudVerify[id] = {};
  for (const region of SEPA_KNNR_1301_OPS_REGIONS) {
    const w = getWorkByIdFromStore(cloudStore, id, region);
    const ok = !!spec && workMatchesSepaKnr1301Spec(w, spec);
    cloudVerify[id][region] = ok ? "PRESENT_OK" : "FAIL";
    if (!ok) allPresent = false;
  }
}

const p01 = getWorkByIdFromStore(cloudStore, C2_KNR_WC_1305_01_WORK_ID, "wroclaw");
const p02 = getWorkByIdFromStore(cloudStore, C2_KNR_WC_1305_02_WORK_ID, "wroclaw");
const regression1305 =
  p01?.unit === "prob" &&
  p02?.unit === "prob" &&
  String(p01?.namePl ?? "").includes("samoczynnego");

const finalReport = {
  ...report,
  cloudWrite: pushed,
  catalogRevisionAfter: revisionAfter,
  cloudVerify,
  regression1305: regression1305 ? "PASS" : "FAIL",
  allPresent,
};

fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-sepa-1301-pomiar-ops-report.json"),
  JSON.stringify(finalReport, null, 2),
);
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-sepa-1301-pomiar-committed.json"),
  JSON.stringify(
    {
      workIds: [...SEPA_KNNR_1301_WORK_IDS],
      cloudVerify,
      revisionBefore,
      revisionAfter,
    },
    null,
    2,
  ),
);

console.log(JSON.stringify(finalReport, null, 2));
if (!allPresent || !regression1305) process.exit(7);
console.log("EXECUTE PASS — A1+A2 PRESENT_OK · 1305 unchanged");
