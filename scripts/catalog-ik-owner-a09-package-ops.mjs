/**
 * IK-OWNER-A09-PACKAGE OPS — single Owner-approved PACKAGE CatalogWork KV seed (idempotent).
 *
 * Dry-run: npx vite-node scripts/catalog-ik-owner-a09-package-ops.mjs
 * Execute:  npx vite-node scripts/catalog-ik-owner-a09-package-ops.mjs --execute
 */
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "vite";
import {
  IK_OWNER_A09_PACKAGE_OPS_EXPECTED,
  IK_OWNER_A09_PACKAGE_OPS_REGIONS,
  IK_OWNER_A09_REJECTED_LABOR_HOST_ID,
  IK_OWNER_CREATE_A09_PACKAGE_WORK_ID,
  applyA09PackageCatalogSeed,
  assertA09LaborHostUntouched,
  workMatchesOwnerApprovedA09PackageSpec,
} from "../src/lib/work-catalog/ik-owner-create-a09-package-ops.ts";

const EXECUTE = process.argv.includes("--execute");
const OUT = path.join(process.cwd(), ".tmp");
const TS = new Date().toISOString();
const WORK_ID = IK_OWNER_CREATE_A09_PACKAGE_WORK_ID;
const FORBIDDEN_INTERNAL_BASE = 118;

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

console.log("=== IK-OWNER-A09-PACKAGE OPS ===");
console.log(`mode=${EXECUTE ? "EXECUTE" : "DRY-RUN"} · workId=${WORK_ID}`);

const kv = await batchGet(["kw-wgdom-work-catalog"]);
const catalog = unwrap(
  kv.values?.["kw-wgdom-work-catalog"] ??
    kv.values?.[0] ??
    Object.values(kv.values ?? {})[0],
);
if (!catalog) throw new Error("brak kw-wgdom-work-catalog");

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-a09-package-backup.json"),
  JSON.stringify({ backedUpAt: TS, catalog }, null, 2),
);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(catalog));

const {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
} = await import("../src/lib/work-catalog/work-catalog-store.ts");
const { getWorkByIdFromStore } = await import(
  "../src/lib/work-catalog/catalog-work-utils.ts"
);

let store = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());

const laborHostBefore = Object.fromEntries(
  IK_OWNER_A09_PACKAGE_OPS_REGIONS.map((r) => [
    r,
    getWorkByIdFromStore(store, IK_OWNER_A09_REJECTED_LABOR_HOST_ID, r) ?? null,
  ]),
);

for (const region of IK_OWNER_A09_PACKAGE_OPS_REGIONS) {
  const existing = getWorkByIdFromStore(store, WORK_ID, region);
  if (existing && existing.id === IK_OWNER_A09_REJECTED_LABOR_HOST_ID) {
    console.error(`STOP: workId collides with rejected LABOR host in ${region}`);
    process.exit(2);
  }
  if (existing?.companyPricePln === FORBIDDEN_INTERNAL_BASE) {
    console.error(`STOP: forbidden internalBase ${FORBIDDEN_INTERNAL_BASE} on ${WORK_ID}`);
    process.exit(2);
  }
}

const beforePackage = Object.fromEntries(
  IK_OWNER_A09_PACKAGE_OPS_REGIONS.map((r) => [
    r,
    getWorkByIdFromStore(store, WORK_ID, r) ?? null,
  ]),
);
console.log("BEFORE:", JSON.stringify(beforePackage, null, 2));

let mergeResult;
try {
  mergeResult = applyA09PackageCatalogSeed(store, TS);
} catch (err) {
  console.error("STOP:", err.message);
  process.exit(2);
}

store = normalizeWorkCatalogStore(mergeResult.store);
console.log("PER_REGION:", JSON.stringify(mergeResult.perRegion));
console.log(`CHANGED=${mergeResult.changed}`);

if (mergeResult.changed) {
  saveWorkCatalogStoreLocal(store, { updatedAtIso: TS });
}

const afterPackage = Object.fromEntries(
  IK_OWNER_A09_PACKAGE_OPS_REGIONS.map((r) => {
    const w = getWorkByIdFromStore(store, WORK_ID, r);
    return [
      r,
      w
        ? {
            id: w.id,
            namePl: w.namePl,
            unit: w.unit,
            tradeId: w.tradeId,
            companyPricePln: w.companyPricePln,
            freshnessStatus: w.freshnessStatus,
            hasOurRate: w.ourWorkRate != null,
            ok: workMatchesOwnerApprovedA09PackageSpec(w),
          }
        : null,
    ];
  }),
);
console.log("AFTER:", JSON.stringify(afterPackage, null, 2));

const laborHostAfter = Object.fromEntries(
  IK_OWNER_A09_PACKAGE_OPS_REGIONS.map((r) => [
    r,
    getWorkByIdFromStore(store, IK_OWNER_A09_REJECTED_LABOR_HOST_ID, r) ?? null,
  ]),
);

for (const region of IK_OWNER_A09_PACKAGE_OPS_REGIONS) {
  if (
    !assertA09LaborHostUntouched(laborHostBefore[region], laborHostAfter[region])
  ) {
    console.error(`STOP: rejected LABOR host mutated in ${region}`);
    process.exit(3);
  }
}

const allOk = IK_OWNER_A09_PACKAGE_OPS_REGIONS.every(
  (r) => afterPackage[r]?.ok === true,
);
if (!allOk) {
  console.error("STOP: post-merge verification failed");
  process.exit(3);
}

const report = {
  at: TS,
  mode: EXECUTE ? "EXECUTE" : "DRY-RUN",
  workId: WORK_ID,
  expected: IK_OWNER_A09_PACKAGE_OPS_EXPECTED,
  perRegion: mergeResult.perRegion,
  changed: mergeResult.changed,
  after: afterPackage,
  laborHostUntouched: true,
  rateStatus: "PENDING_OWNER_INPUT",
};

if (!EXECUTE) {
  fs.writeFileSync(
    path.join(OUT, "catalog-ik-owner-a09-package-ops-report.json"),
    JSON.stringify(report, null, 2),
  );
  console.log("\nDRY-RUN OK — run with --execute to commit cloud KV");
  process.exit(0);
}

if (!mergeResult.changed) {
  console.log("IDEMPOTENT NO-OP — cloud KV unchanged");
  fs.writeFileSync(
    path.join(OUT, "catalog-ik-owner-a09-package-ops-report.json"),
    JSON.stringify({ ...report, cloudWrite: "SKIPPED_NO_CHANGE" }, null, 2),
  );
  process.exit(0);
}

const payload = JSON.parse(JSON.stringify(store));
fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-a09-package-catalog-committed.json"),
  JSON.stringify(payload, null, 2),
);
await batchSet(["kw-wgdom-work-catalog"], [payload]);

const kv2 = await batchGet(["kw-wgdom-work-catalog"]);
const cloud = unwrap(
  kv2.values?.["kw-wgdom-work-catalog"] ?? Object.values(kv2.values ?? {})[0],
);
localStorage.setItem("kw-wgdom-work-catalog", JSON.stringify(cloud));
const cloudStore = normalizeWorkCatalogStore(loadWorkCatalogStoreLocal());
const cloudVerify = Object.fromEntries(
  IK_OWNER_A09_PACKAGE_OPS_REGIONS.map((r) => {
    const w = getWorkByIdFromStore(cloudStore, WORK_ID, r);
    return [r, workMatchesOwnerApprovedA09PackageSpec(w) ? "PRESENT_OK" : "FAIL"];
  }),
);
console.log("CLOUD_VERIFY:", JSON.stringify(cloudVerify));
if (Object.values(cloudVerify).some((v) => v !== "PRESENT_OK")) {
  console.error("STOP: cloud verification failed");
  process.exit(4);
}

fs.writeFileSync(
  path.join(OUT, "catalog-ik-owner-a09-package-ops-report.json"),
  JSON.stringify({ ...report, cloudWrite: "OK", cloudVerify }, null, 2),
);
console.log("\n=== IK-OWNER-A09-PACKAGE OPS COMPLETE ===");
