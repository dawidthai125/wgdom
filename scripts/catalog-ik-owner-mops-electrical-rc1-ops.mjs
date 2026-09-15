/**
 * MOPS Electrical RC-1 OPS — seed CREATE CatalogWork into kw-wgdom-work-catalog.
 *
 * Dry-run: npx vite-node scripts/catalog-ik-owner-mops-electrical-rc1-ops.mjs
 * Execute:  npx vite-node scripts/catalog-ik-owner-mops-electrical-rc1-ops.mjs --execute
 *
 * ZERO OUR RATE · ZERO BOM · ZERO CONNECT leaf mutation · ZERO payroll.
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import {
  MOPS_ELEC_RC1_CREATE_WORK_IDS,
  applyMopsElecRc1CatalogSeed,
} from "../src/lib/work-catalog/ik-owner-create-mops-electrical-rc1-ops.ts";
import {
  MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID,
  MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID,
} from "../src/lib/work-catalog/ik-owner-create-mops-electrical-rc1-catalog.ts";

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
  for (let i = 0; i < keys.length; i += 1) out[keys[i]] = unwrap(arr[i]);
  return out;
}

console.log("=== IK-OWNER-MOPS-ELECTRICAL-RC1 OPS ===");
console.log(
  `mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} · creates=${MOPS_ELEC_RC1_CREATE_WORK_IDS.length}`,
);

if (!anon) {
  console.log("SKIP: brak VITE_SUPABASE_ANON_KEY");
  process.exit(0);
}

const kv = await batchGet([CATALOG_KEY, META_KEY]);
const picked = pickByKeyOrder(kv, [CATALOG_KEY, META_KEY]);
const catalog = picked[CATALOG_KEY];
if (!catalog) throw new Error("brak kw-wgdom-work-catalog");

const {
  normalizeWorkCatalogMeta,
  writeWorkCatalogMetaToLs,
} = await import("../src/lib/work-catalog/work-catalog-meta.ts");
const metaBefore = normalizeWorkCatalogMeta(picked[META_KEY]);

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-mops-electrical-rc1-backup.json"),
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
const connectProbe = {
  oprawy: !!getWorkByIdFromStore(store, MOPS_ELEC_RC1_CONNECT_0504_03_WORK_ID),
  wylaczniki: !!getWorkByIdFromStore(store, MOPS_ELEC_RC1_CONNECT_0407_01_WORK_ID),
};

let mergeResult;
try {
  mergeResult = applyMopsElecRc1CatalogSeed(store, TS);
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
  changed: mergeResult.changed,
  createdWorkIds: mergeResult.createdWorkIds,
  beforeCount: mergeResult.beforeCount,
  afterCount: mergeResult.afterCount,
  perWork: mergeResult.perWork,
  connectTargetsUntouched: connectProbe,
  ourRate: "NONE_ON_CREATE",
  bom: "NONE",
};

fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-mops-electrical-rc1-ops-report.json"),
  JSON.stringify(report, null, 2),
);
console.log(JSON.stringify(report, null, 2));

if (!EXECUTE) {
  console.log("DRY-RUN complete — no KV write. Re-run with --execute to persist.");
  process.exit(0);
}

if (!mergeResult.changed) {
  console.log("IDEMPOTENT NO-OP — cloud unchanged.");
  process.exit(0);
}

const pushed = await pushWorkCatalogStoreToCloudSafe(store, {
  reason: "mops-electrical-rc1-create-candidates",
});
console.log("cloud push", pushed);
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-mops-electrical-rc1-ops-report.json"),
  JSON.stringify({ ...report, cloudWrite: pushed }, null, 2),
);
