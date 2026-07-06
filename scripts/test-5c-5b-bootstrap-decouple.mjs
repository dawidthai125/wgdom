/**
 * #5C-5B — Bootstrap / Reconcile decouple from legacy cost catalog.
 * npx vite-node scripts/test-5c-5b-bootstrap-decouple.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-5c5b-decouple";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-5c5b";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import {
  WGDOM_COST_CATALOG_KEY,
} from "../src/lib/wgdom-cost-catalog-store.ts";
import {
  BOOTSTRAP_DEFERRED_KEYS,
  fetchAndMergeDeferredBootstrap,
} from "../src/lib/cloud-sync.ts";
import { WGDOM_DEFERRED_BOOTSTRAP_EVENT } from "../src/lib/deferred-bootstrap-types.ts";
import {
  finalizeWorkCatalogAfterDeferredMerge,
} from "../src/lib/work-catalog-bootstrap.ts";
import {
  migrateLegacyCostCatalogStoreToWorkCatalog,
} from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import { defaultWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-migrate.ts";

const MIGRATED_AT = "2026-06-29T14:00:00.000Z";
const LEGACY_KEY = "kw-wgdom-cost-catalog";
const root = resolve(import.meta.dirname, "..");
const bootstrapSrc = readFileSync(resolve(root, "src/lib/work-catalog-bootstrap.ts"), "utf8");
const cloudSyncSrc = readFileSync(resolve(root, "src/lib/cloud-sync.ts"), "utf8");

const storage = new Map();
const getItemCalls = [];

globalThis.localStorage = {
  getItem: (key) => {
    getItemCalls.push(key);
    return storage.has(key) ? storage.get(key) : null;
  },
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

globalThis.fetch = async (url, init) => {
  const urlStr = String(url);
  if (urlStr.includes("batch-get")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const keys = Array.isArray(body.keys) ? body.keys : [];
    return new Response(JSON.stringify({ values: keys.map(() => null) }), { status: 200 });
  }
  if (urlStr.includes("batch-set")) {
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

function reset() {
  storage.clear();
  getItemCalls.length = 0;
}

function seedLegacy(store = defaultWgdomCostCatalogStore()) {
  localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(store));
  return store;
}

// T1 — scenariusz A: migrated → zero legacy getItem
reset();
seedLegacy();
const { store: migratedStore } = migrateLegacyCostCatalogStoreToWorkCatalog(
  defaultWgdomCostCatalogStore(),
  { migratedAtIso: MIGRATED_AT, nowMs: Date.parse(MIGRATED_AT) },
);
saveWorkCatalogStoreLocal(migratedStore);
getItemCalls.length = 0;
await finalizeWorkCatalogAfterDeferredMerge();
assert(
  !getItemCalls.includes(WGDOM_COST_CATALOG_KEY),
  "T1 migrated user — no legacy LS read",
);

// T2 — bootstrap nie importuje reconcile
assert(
  !bootstrapSrc.includes("work-catalog-reconcile-bootstrap"),
  "T2 bootstrap source has no reconcile-bootstrap import",
);
assert(
  !bootstrapSrc.includes("maybeExecuteWorkCatalogReconcile"),
  "T2 bootstrap source does not call maybeExecuteWorkCatalogReconcile",
);

// T3 — scenariusz B: ONE-SHOT migrate
reset();
seedLegacy();
saveWorkCatalogStoreLocal(defaultWorkCatalogStore(MIGRATED_AT));
const bRun = await finalizeWorkCatalogAfterDeferredMerge();
assert(bRun.migrated === true, "T3 ONE-SHOT migrate executed");
assert(loadWorkCatalogStoreLocal().migratedFromLegacyAt != null, "T3 migratedFromLegacyAt set");

// T4 — po ONE-SHOT brak drugiego migrate / legacy read
getItemCalls.length = 0;
const bRun2 = await finalizeWorkCatalogAfterDeferredMerge();
assert(bRun2.migrated === false, "T4 second run not migrated");
assert(
  !getItemCalls.includes(WGDOM_COST_CATALOG_KEY),
  "T4 after ONE-SHOT — no legacy LS read",
);

// T5 — scenariusz C/D: pusty work bez legacy rates → skip bez reconcile
reset();
const emptyLegacy = defaultWgdomCostCatalogStore();
for (const region of ["wroclaw", "dolnyslask"]) {
  emptyLegacy.catalogs[region] = {
    ...emptyLegacy.catalogs[region],
    categories: [],
    updatedAt: MIGRATED_AT,
  };
}
seedLegacy(emptyLegacy);
saveWorkCatalogStoreLocal(defaultWorkCatalogStore(MIGRATED_AT));
const cRun = await finalizeWorkCatalogAfterDeferredMerge();
assert(cRun.migrated === false, "T5 empty legacy skip — not migrated");
assert(cRun.decision.reason === "legacy_empty", "T5 reason legacy_empty");

// T6 — deferred bootstrap dispatch event
let eventFired = false;
if (typeof window === "undefined") {
  globalThis.window = { dispatchEvent: () => {} };
}
const prevListener = globalThis.window?.addEventListener;
globalThis.window = {
  ...globalThis.window,
  addEventListener: () => {},
  dispatchEvent: (ev) => {
    if (ev?.type === WGDOM_DEFERRED_BOOTSTRAP_EVENT || ev?.type === "wgdom-deferred-bootstrap") {
      eventFired = true;
    }
    return true;
  },
};
reset();
await fetchAndMergeDeferredBootstrap();
assert(eventFired, "T6 fetchAndMergeDeferredBootstrap dispatches deferred bootstrap event");
if (prevListener) globalThis.window.addEventListener = prevListener;

// T7 — legacy poza deferred batch-get
const batchKeys = [];
globalThis.fetch = async (url, init) => {
  const urlStr = String(url);
  if (urlStr.includes("batch-get")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const keys = Array.isArray(body.keys) ? body.keys : [];
    batchKeys.push(...keys);
    return new Response(JSON.stringify({ values: keys.map(() => null) }), { status: 200 });
  }
  return new Response(JSON.stringify({ ok: true }), { status: 200 });
};
reset();
batchKeys.length = 0;
await fetchAndMergeDeferredBootstrap();
assert(!batchKeys.includes(LEGACY_KEY), "T7 batch-get excludes kw-wgdom-cost-catalog");
assert(
  !BOOTSTRAP_DEFERRED_KEYS.includes(LEGACY_KEY),
  "T7 BOOTSTRAP_DEFERRED_KEYS excludes legacy catalog",
);

// T8 — #CORE-013 boundary static (bootstrap + cloud-sync hook only)
assert(
  !bootstrapSrc.includes("payroll-week-roster-bundle"),
  "T8 bootstrap has no payroll-week-roster-bundle",
);
assert(
  !bootstrapSrc.includes("finalizePayrollBundleMerge"),
  "T8 bootstrap has no finalizePayrollBundleMerge",
);
assert(
  cloudSyncSrc.includes("finalizeWorkCatalogAfterDeferredMerge"),
  "T8 cloud-sync calls finalizeWorkCatalogAfterDeferredMerge",
);
assert(
  !cloudSyncSrc.includes("maybeExecuteWorkCatalogReconcile"),
  "T8 cloud-sync has no reconcile call",
);

// work catalog key touched on migrate path only
assert(storage.has(WORK_CATALOG_STORAGE_KEY) || bRun.migrated, "T3 work catalog LS present after migrate");

console.log(`\n#5C-5B bootstrap-decouple: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
