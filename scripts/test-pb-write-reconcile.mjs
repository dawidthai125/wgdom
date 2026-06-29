/**
 * PB-WRITE-C — reconcile legacy → work catalog.
 * npx vite-node scripts/test-pb-write-reconcile.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-pb-write-reconcile";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-pb-write-reconcile";

import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import {
  APP_SETTINGS_KEY,
  defaultAppSettings,
} from "../src/lib/app-settings.ts";
import { WGDOM_COST_CATALOG_KEY } from "../src/lib/wgdom-cost-catalog-store.ts";
import {
  decideWorkCatalogReconcile,
  reconcileLegacyRatesIntoWorkStore,
} from "../src/lib/work-catalog-reconcile.ts";
import {
  reconcileLegacyToWorkCatalog,
} from "../src/lib/work-catalog-reconcile-bootstrap.ts";
import {
  migrateLegacyCostCatalogStoreToWorkCatalog,
} from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  loadWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/work-catalog-store.ts";

const RECONCILE_AT = "2026-06-29T16:00:00.000Z";
const NOW_MS = Date.parse(RECONCILE_AT);
const LEGACY_OLD = "2026-06-28T10:00:00.000Z";
const LEGACY_NEW = "2026-06-29T14:00:00.000Z";
const WORK_OLD = "2026-06-28T11:00:00.000Z";
const WORK_NEW = "2026-06-29T15:00:00.000Z";

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

const persistKeys = [];
globalThis.fetch = async (url, init) => {
  const urlStr = String(url);
  if (urlStr.includes("batch-get")) {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const keys = Array.isArray(body.keys) ? body.keys : [];
    return new Response(JSON.stringify({ values: keys.map(() => null) }), { status: 200 });
  }
  if (urlStr.includes("batch-set") && init?.body) {
    try {
      const parsed = JSON.parse(String(init.body));
      const keys = Array.isArray(parsed.keys) ? parsed.keys : [];
      for (const key of keys) {
        if (key) persistKeys.push(key);
      }
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
    console.error("FAIL:", msg);
    fail += 1;
    return;
  }
  pass += 1;
}

function seedSettings(mode = "split") {
  localStorage.setItem(
    APP_SETTINGS_KEY,
    JSON.stringify({ ...defaultAppSettings(), catalogWriteMode: mode }),
  );
}

function migrateFixtureWork(legacy, migratedAtIso = WORK_OLD) {
  const { store } = migrateLegacyCostCatalogStoreToWorkCatalog(legacy, {
    migratedAtIso,
    nowMs: NOW_MS,
  });
  store.migratedFromLegacyAt = migratedAtIso;
  store.updatedAt = migratedAtIso;
  return store;
}

function bumpLegacyLabor(legacy, delta = 0.5, updatedAt = LEGACY_NEW) {
  const next = JSON.parse(JSON.stringify(legacy));
  next.updatedAt = updatedAt;
  const region = next.activeRegion;
  next.catalogs[region].updatedAt = updatedAt;
  const cat = next.catalogs[region].categories.find((c) => c.id === "ROZBIORKI");
  cat.rates[0] = { ...cat.rates[0], laborRbhPerUnit: cat.rates[0].laborRbhPerUnit + delta };
  return next;
}

seedSettings("split");

// C-01 — work store newer → skip
{
  const legacy = defaultWgdomCostCatalogStore();
  legacy.updatedAt = LEGACY_OLD;
  legacy.catalogs.wroclaw.updatedAt = LEGACY_OLD;
  const work = migrateFixtureWork(legacy, WORK_NEW);
  work.updatedAt = WORK_NEW;
  const decision = decideWorkCatalogReconcile(legacy, work);
  assert(
    decision.action === "skip" && decision.reason === "work_store_newer",
    "C-01 work store newer → skip",
  );
  const pure = reconcileLegacyRatesIntoWorkStore(legacy, work, {
    reconciledAtIso: RECONCILE_AT,
    nowMs: NOW_MS,
  });
  assert(pure.migrated === 0, "C-01 pure migrated 0");
}

// C-01b — per-work newer → skip item
{
  const legacy = defaultWgdomCostCatalogStore();
  legacy.updatedAt = LEGACY_NEW;
  legacy.catalogs.wroclaw.updatedAt = LEGACY_NEW;
  const work = migrateFixtureWork(legacy, WORK_OLD);
  const target = work.catalogs.wroclaw.works.find((w) => w.id === "legacy-rozbiorki-m2");
  if (target) target.updatedAt = WORK_NEW;
  const pure = reconcileLegacyRatesIntoWorkStore(legacy, work, {
    reconciledAtIso: RECONCILE_AT,
    nowMs: NOW_MS,
  });
  assert(pure.skipped >= 1, "C-01b per-work newer skipped");
  assert(pure.migrated === 0, "C-01b no overwrite when only newer item differs");
}

// C-02 — legacy newer → apply patched prices
{
  const legacyBase = defaultWgdomCostCatalogStore();
  legacyBase.updatedAt = LEGACY_OLD;
  legacyBase.catalogs.wroclaw.updatedAt = LEGACY_OLD;
  const work = migrateFixtureWork(legacyBase, WORK_OLD);
  const legacyNew = bumpLegacyLabor(legacyBase, 1.0, LEGACY_NEW);
  const beforePrice = work.catalogs.wroclaw.works.find((w) => w.id === "legacy-rozbiorki-m2")?.companyPricePln;
  const pure = reconcileLegacyRatesIntoWorkStore(legacyNew, work, {
    reconciledAtIso: RECONCILE_AT,
    nowMs: NOW_MS,
  });
  const afterPrice = pure.store.catalogs.wroclaw.works.find((w) => w.id === "legacy-rozbiorki-m2")?.companyPricePln;
  assert(pure.migrated >= 1, "C-02 migrated >= 1");
  assert(afterPrice !== beforePrice, "C-02 price patched");
}

// C-03 — idempotent 2× reconcile
{
  const legacyBase = defaultWgdomCostCatalogStore();
  legacyBase.updatedAt = LEGACY_OLD;
  legacyBase.catalogs.wroclaw.updatedAt = LEGACY_OLD;
  const work = migrateFixtureWork(legacyBase, WORK_OLD);
  const legacyNew = bumpLegacyLabor(legacyBase, 0.25, LEGACY_NEW);
  const first = reconcileLegacyRatesIntoWorkStore(legacyNew, work, {
    reconciledAtIso: RECONCILE_AT,
    nowMs: NOW_MS,
  });
  const second = reconcileLegacyRatesIntoWorkStore(legacyNew, first.store, {
    reconciledAtIso: "2026-06-29T16:01:00.000Z",
    nowMs: NOW_MS + 60_000,
  });
  assert(first.migrated >= 1, "C-03 first migrated");
  assert(second.migrated === 0, "C-03 second migrated 0");
  assert(
    JSON.stringify(first.store.catalogs.wroclaw.works) === JSON.stringify(second.store.catalogs.wroclaw.works),
    "C-03 same works after 2nd run",
  );
}

// C-04 — legacy empty → skip
{
  const legacy = defaultWgdomCostCatalogStore();
  for (const region of ["wroclaw", "dolnyslask"]) {
    legacy.catalogs[region].categories = [];
    legacy.catalogs[region].unknownFallback = undefined;
  }
  const work = migrateFixtureWork(defaultWgdomCostCatalogStore(), WORK_OLD);
  const decision = decideWorkCatalogReconcile(legacy, work);
  assert(
    decision.action === "skip" && decision.reason === "legacy_empty",
    "C-04 legacy empty skip",
  );
}

// C-05 — orchestration saves via router
{
  storage.clear();
  persistKeys.length = 0;
  seedSettings("split");
  const legacyBase = defaultWgdomCostCatalogStore();
  legacyBase.updatedAt = LEGACY_OLD;
  legacyBase.catalogs.wroclaw.updatedAt = LEGACY_OLD;
  const work = migrateFixtureWork(legacyBase, WORK_OLD);
  localStorage.setItem(WORK_CATALOG_STORAGE_KEY, JSON.stringify(work));
  const legacyNew = bumpLegacyLabor(legacyBase, 0.75, LEGACY_NEW);
  localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(legacyNew));

  const result = await reconcileLegacyToWorkCatalog();
  assert(result.ok === true, "C-05 ok");
  assert(result.saved === true, "C-05 saved");
  assert(result.migrated >= 1, "C-05 migrated");
  assert(typeof result.durationMs === "number" && result.durationMs >= 0, "C-05 durationMs");
  assert(result.legacyCount > 0, "C-05 legacyCount");
  assert(result.workCount > 0, "C-05 workCount");
  assert(persistKeys.includes(WORK_CATALOG_STORAGE_KEY), "C-05 work persist via router");
  assert(!persistKeys.includes(WGDOM_COST_CATALOG_KEY), "C-05 no legacy write");
}

// C-06 — preserve migratedFromLegacyAt + work count
{
  const legacyBase = defaultWgdomCostCatalogStore();
  legacyBase.updatedAt = LEGACY_OLD;
  legacyBase.catalogs.wroclaw.updatedAt = LEGACY_OLD;
  const work = migrateFixtureWork(legacyBase, WORK_OLD);
  const migratedAt = work.migratedFromLegacyAt;
  const workCountBefore = work.catalogs.wroclaw.works.length + work.catalogs.dolnyslask.works.length;
  const legacyNew = bumpLegacyLabor(legacyBase, 0.1, LEGACY_NEW);
  const pure = reconcileLegacyRatesIntoWorkStore(legacyNew, work, {
    reconciledAtIso: RECONCILE_AT,
    nowMs: NOW_MS,
  });
  const workCountAfter = pure.store.catalogs.wroclaw.works.length + pure.store.catalogs.dolnyslask.works.length;
  assert(pure.store.migratedFromLegacyAt === migratedAt, "C-06 migratedFromLegacyAt preserved");
  assert(workCountAfter >= workCountBefore, "C-06 works not removed");
}

// legacy_only mode blocks save
{
  storage.clear();
  persistKeys.length = 0;
  seedSettings("legacy_only");
  localStorage.setItem(WORK_CATALOG_STORAGE_KEY, JSON.stringify(migrateFixtureWork(defaultWgdomCostCatalogStore())));
  localStorage.setItem(WGDOM_COST_CATALOG_KEY, JSON.stringify(bumpLegacyLabor(defaultWgdomCostCatalogStore())));
  const blocked = await reconcileLegacyToWorkCatalog();
  assert(blocked.decision.reason === "legacy_only_mode", "legacy_only skip");
  assert(blocked.saved === false, "legacy_only no save");
  assert(!persistKeys.includes(WORK_CATALOG_STORAGE_KEY), "legacy_only no persist");
}

void loadWorkCatalogStoreLocal;

console.log(`\ntest-pb-write-reconcile.mjs: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
