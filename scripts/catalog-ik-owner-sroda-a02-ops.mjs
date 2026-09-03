/**
 * EPIC A / A0.2 OPS — seed 8 Środa CatalogWork into kw-wgdom-work-catalog (idempotent).
 *
 * Cloud write: pushWorkCatalogStoreToCloudSafe (CAS + kw-wgdom-work-catalog-meta).
 * Legacy batch-set of catalog is NOT used.
 *
 * Dry-run: npx vite-node scripts/catalog-ik-owner-sroda-a02-ops.mjs
 * Execute:  npx vite-node scripts/catalog-ik-owner-sroda-a02-ops.mjs --execute
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import {
  IK_OWNER_SRODA_A02_WORK_IDS,
  IK_OWNER_SRODA_A02_OPS_REGIONS,
  applySrodaA02CatalogSeed,
  workMatchesSrodaA02Spec,
  getSrodaA02WorkSpec,
} from "../src/lib/work-catalog/ik-owner-create-sroda-a02-ops.ts";

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

/** Edge batch-get returns `{ values: unknown[] }` aligned with requested keys order. */
function pickByKeyOrder(kv, keys) {
  const arr = Array.isArray(kv.values) ? kv.values : [];
  const out = {};
  for (let i = 0; i < keys.length; i += 1) {
    out[keys[i]] = unwrap(arr[i]);
  }
  return out;
}

console.log("=== IK-OWNER-SRODA-A02 OPS ===");
console.log(
  `mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} · works=${IK_OWNER_SRODA_A02_WORK_IDS.length} · write=pushWorkCatalogStoreToCloudSafe`,
);

if (!anon) {
  console.log(
    "SKIP: brak VITE_SUPABASE_ANON_KEY — lokalny seed-only (użyj test-ik-owner-sroda-a02-catalog.mjs)",
  );
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
  path.join(OUT, "catalog-ik-owner-sroda-a02-backup.json"),
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
let mergeResult;
try {
  mergeResult = applySrodaA02CatalogSeed(store, TS);
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
  workIds: [...IK_OWNER_SRODA_A02_WORK_IDS],
  perWork: mergeResult.perWork,
  catalogRevisionBefore: revisionBefore,
};

fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-sroda-a02-ops-report.json"),
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
    path.join(OUT, "catalog-ik-owner-sroda-a02-ops-report.json"),
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

// Re-fetch cloud for authoritative verify
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
for (const id of IK_OWNER_SRODA_A02_WORK_IDS) {
  const spec = getSrodaA02WorkSpec(id);
  cloudVerify[id] = {};
  for (const region of IK_OWNER_SRODA_A02_OPS_REGIONS) {
    const w = getWorkByIdFromStore(cloudStore, id, region);
    const ok = workMatchesSrodaA02Spec(w, spec);
    cloudVerify[id][region] = ok ? "PRESENT_OK" : "FAIL";
    if (!ok) allPresent = false;
  }
}

// duplicate check
const dupReport = {};
for (const region of IK_OWNER_SRODA_A02_OPS_REGIONS) {
  const works = cloudStore.catalogs[region]?.works ?? [];
  const counts = {};
  for (const w of works) {
    counts[w.id] = (counts[w.id] || 0) + 1;
  }
  const dups = IK_OWNER_SRODA_A02_WORK_IDS.filter((id) => (counts[id] || 0) !== 1);
  dupReport[region] = dups.length === 0 ? "OK" : dups;
  if (dups.length) allPresent = false;
}

const finalReport = {
  ...report,
  cloudWrite: "OK",
  catalogRevisionAfter: cloudMeta.catalogRevision ?? revisionAfter,
  cloudVerify,
  duplicates: dupReport,
  pushedWorkCountHint: pushed?.catalogs?.wroclaw?.works?.length ?? null,
};

fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-sroda-a02-ops-report.json"),
  JSON.stringify(finalReport, null, 2),
);
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-sroda-a02-catalog-committed.json"),
  JSON.stringify(
    {
      committedAt: TS,
      catalogRevisionBefore: revisionBefore,
      catalogRevisionAfter: cloudMeta.catalogRevision,
      catalog: cloudCatalog,
      meta: cloudMeta,
    },
    null,
    2,
  ),
);

console.log("CLOUD_VERIFY:", JSON.stringify(cloudVerify, null, 2));
console.log(
  `revision ${revisionBefore} → ${cloudMeta.catalogRevision} · duplicates=${JSON.stringify(dupReport)}`,
);

if (!allPresent) {
  console.error("STOP: cloud verification 8/8 failed");
  process.exit(7);
}

console.log("EXECUTE complete — kw-wgdom-work-catalog updated via CAS safe push.");
