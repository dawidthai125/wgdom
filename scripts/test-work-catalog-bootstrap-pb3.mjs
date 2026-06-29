/**
 * PB-3 — Work Catalog bootstrap (guards + orchestrator).
 * npx vite-node scripts/test-work-catalog-bootstrap-pb3.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-pb3-bootstrap";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-pb3";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import {
  getActiveCatalog,
  WGDOM_COST_CATALOG_KEY,
} from "../src/lib/wgdom-cost-catalog-store.ts";
import { resolveActiveCatalogForTender } from "../src/lib/tender-active-catalog.ts";
import {
  decideWorkCatalogBootstrap,
  maybeExecuteWorkCatalogBootstrap,
} from "../src/lib/work-catalog-bootstrap.ts";
import {
  SEED_MANIFEST_RELATIVE_PATH,
  parseSeedManifestYaml,
} from "../src/lib/work-catalog/seed-manifest.ts";
import {
  countLegacyCatalogRates,
  createEmptyWorkCatalogStore,
  migrateLegacyCostCatalogStoreToWorkCatalog,
} from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  loadWorkCatalogStoreLocal,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/work-catalog-store.ts";
import { defaultWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-migrate.ts";

const MIGRATED_AT = "2026-06-29T14:00:00.000Z";
const NOW_MS = Date.parse(MIGRATED_AT);
const root = resolve(import.meta.dirname, "..");
const seedManifest = parseSeedManifestYaml(
  readFileSync(resolve(root, SEED_MANIFEST_RELATIVE_PATH), "utf8"),
);

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

const persistCalls = [];
globalThis.fetch = async (url, init) => {
  const urlStr = String(url);
  if (urlStr.includes("batch-get")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const keys = Array.isArray(body.keys) ? body.keys : [];
    return new Response(JSON.stringify({ values: keys.map(() => null) }), { status: 200 });
  }
  if (urlStr.includes("batch-set") && init?.body) {
    try {
      persistCalls.push(JSON.parse(String(init.body)));
    } catch {
      /* ignore */
    }
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
}

function assertEq(actual, expected, msg) {
  if (actual !== expected) {
    fail += 1;
    console.error(`FAIL ${msg}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    return;
  }
  pass += 1;
}

function seedLegacy(store = defaultWgdomCostCatalogStore()) {
  localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(store));
  return store;
}

function reset() {
  storage.clear();
  persistCalls.length = 0;
}

// B1 — legacy full + empty work → migrate
reset();
const legacyStore = seedLegacy();
saveWorkCatalogStoreLocal(defaultWorkCatalogStore(MIGRATED_AT));
const b1 = decideWorkCatalogBootstrap(legacyStore, loadWorkCatalogStoreLocal());
assertEq(b1.action, "migrate", "B1 action migrate");
assertEq(b1.reason, "legacy_present", "B1 reason legacy_present");

// B3 — already migrated → skip
reset();
seedLegacy();
const { store: migratedOnce } = migrateLegacyCostCatalogStoreToWorkCatalog(legacyStore, {
  migratedAtIso: MIGRATED_AT,
  nowMs: NOW_MS,
  seedManifest,
});
saveWorkCatalogStoreLocal(migratedOnce);
const b3 = decideWorkCatalogBootstrap(legacyStore, loadWorkCatalogStoreLocal());
assertEq(b3.action, "skip", "B3 action skip");
assertEq(b3.reason, "already_migrated", "B3 reason already_migrated");

// B4 — legacy empty → skip
reset();
const emptyLegacy = defaultWgdomCostCatalogStore();
for (const region of ["wroclaw", "dolnyslask"]) {
  emptyLegacy.catalogs[region] = {
    ...getActiveCatalog(emptyLegacy),
    categories: [],
    updatedAt: MIGRATED_AT,
  };
}
seedLegacy(emptyLegacy);
saveWorkCatalogStoreLocal(defaultWorkCatalogStore(MIGRATED_AT));
const b4 = decideWorkCatalogBootstrap(emptyLegacy, loadWorkCatalogStoreLocal());
assertEq(b4.action, "skip", "B4 action skip");
assertEq(b4.reason, "legacy_empty", "B4 reason legacy_empty");

// B5 — work with priced entry, no marker → skip
reset();
seedLegacy();
const workWithPrice = createEmptyWorkCatalogStore(MIGRATED_AT);
workWithPrice.catalogs.wroclaw.works = [
  {
    id: "custom-w1",
    tradeId: "MALOWANIE",
    namePl: "Custom",
    unit: "m2",
    companyPricePln: 12,
    updatedAt: MIGRATED_AT,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  },
];
saveWorkCatalogStoreLocal(workWithPrice);
const b5 = decideWorkCatalogBootstrap(legacyStore, loadWorkCatalogStoreLocal());
assertEq(b5.action, "skip", "B5 action skip");
assertEq(b5.reason, "priced_work_exists", "B5 reason priced_work_exists");

// B2 — orchestrator idempotent
reset();
seedLegacy();
saveWorkCatalogStoreLocal(defaultWorkCatalogStore(MIGRATED_AT));
const run1 = await maybeExecuteWorkCatalogBootstrap();
assert(run1.migrated === true, "B2 first run migrated");
assertEq(run1.decision.reason, "legacy_present", "B2 first reason");
const afterFirst = loadWorkCatalogStoreLocal();
assert(afterFirst.migratedFromLegacyAt != null, "B2 migratedFromLegacyAt set");
const run2 = await maybeExecuteWorkCatalogBootstrap();
assert(run2.migrated === false, "B2 second run not migrated");
assertEq(run2.decision.reason, "already_migrated", "B2 second reason already_migrated");

// B7 — post-bootstrap PRICE-BRIDGE work-first
reset();
seedLegacy();
await maybeExecuteWorkCatalogBootstrap();
const bridge = resolveActiveCatalogForTender();
assertEq(bridge.source, "work", "B7 source work");
assert(bridge.isFallback === false, "B7 isFallback false");
assert(bridge.pricedActiveWorkCount > 0, "B7 pricedActiveWorkCount > 0");

// B8 — persist via saveWorkCatalogStore on migrate
reset();
seedLegacy();
saveWorkCatalogStoreLocal(defaultWorkCatalogStore(MIGRATED_AT));
const callsBefore = persistCalls.length;
await maybeExecuteWorkCatalogBootstrap();
assert(persistCalls.length > callsBefore, "B8 persistKey batch-set after migrate");

// Guard SSOT — legacy rates required
reset();
seedLegacy();
assert(countLegacyCatalogRates(legacyStore) > 0, "fixture legacy has rates");

console.log(`\nPB-3 BOOTSTRAP: ${pass} pass, ${fail} fail`);
if (fail > 0) process.exit(1);
