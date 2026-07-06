/**
 * PB-WRITE-A — Catalog Write Router + catalogWriteMode.
 * npx vite-node scripts/test-pb-write-router.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-pb-write-router";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-pb-write";

import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import {
  APP_SETTINGS_KEY,
  defaultAppSettings,
  loadAppSettingsLocal,
  mergeAppSettings,
  mergeCatalogWriteMode,
  normalizeCatalogWriteMode,
} from "../src/lib/app-settings.ts";
import {
  appendCostCatalogHistoryRouted,
  canWriteLegacyCatalog,
  canWriteWorkCatalog,
  resolveCatalogWriteMode,
  saveLegacyCostCatalogRouted,
  saveWorkCatalogRouted,
} from "../src/lib/catalog-write-router.ts";
import { WGDOM_COST_CATALOG_HISTORY_KEY, hasCatalogRateChange } from "../src/lib/wgdom-cost-catalog-history.ts";
import { WGDOM_COST_CATALOG_KEY } from "../src/lib/wgdom-cost-catalog-store.ts";
import { defaultCompanyProfile } from "../src/lib/tenders-bzp-company.ts";
import { defaultWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import {
  loadWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/work-catalog-store.ts";

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

function settings(mode) {
  return { ...defaultAppSettings(), catalogWriteMode: mode };
}

function seedSettings(mode = "split") {
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings(mode)));
}

// R-07 invalid/missing mode → split
assert(normalizeCatalogWriteMode(undefined) === "split", "R-07a normalize undefined → split");
assert(normalizeCatalogWriteMode("bogus") === "split", "R-07b normalize bogus → split");
assert(normalizeCatalogWriteMode("work_only") === "work_only", "R-07c normalize work_only");

// #5C-2 — default work_only
assert(defaultAppSettings().catalogWriteMode === "work_only", "R-00 defaultAppSettings work_only");
storage.clear();
assert(loadAppSettingsLocal().catalogWriteMode === "work_only", "R-00b empty LS work_only");
localStorage.setItem(
  APP_SETTINGS_KEY,
  JSON.stringify({ athPreviewEnabled: true, tendersTabForStaffEnabled: false }),
);
assert(
  loadAppSettingsLocal().catalogWriteMode === "work_only",
  "R-00c LS missing catalogWriteMode field → work_only",
);

const local = defaultAppSettings();
assert(
  mergeCatalogWriteMode({ catalogWriteMode: "legacy_only" }, local) === "legacy_only",
  "R-08 remote overrides local catalogWriteMode",
);
assert(
  mergeCatalogWriteMode({}, { ...local, catalogWriteMode: "work_only" }) === "work_only",
  "R-08b local work_only when remote absent",
);

// R-01 split → legacy OK
seedSettings("split");
persistKeys.length = 0;
const legacyStore = defaultWgdomCostCatalogStore();
const legacyResult = await saveLegacyCostCatalogRouted(legacyStore, settings("split"));
assert(legacyResult.ok === true && legacyResult.saved === true, "R-01 split legacy save OK");
assert(!persistKeys.includes(WGDOM_COST_CATALOG_KEY), "R-01 legacy cloud quiesced (#5C-5A)");

// R-02 split → work OK
persistKeys.length = 0;
const workStore = defaultWorkCatalogStore("2026-06-29T12:00:00.000Z");
const workResult = await saveWorkCatalogRouted(workStore, {}, settings("split"));
assert(workResult.ok === true && workResult.saved === true, "R-02 split work save OK");
assert(persistKeys.includes(WORK_CATALOG_STORAGE_KEY), "R-02 work persistKey called");

// R-03 work_only → legacy blocked
persistKeys.length = 0;
const blockedLegacy = await saveLegacyCostCatalogRouted(legacyStore, settings("work_only"));
assert(
  blockedLegacy.ok === true && blockedLegacy.saved === false && blockedLegacy.blocked === "work_only_blocks_legacy",
  "R-03 work_only blocks legacy",
);
assert(!persistKeys.includes(WGDOM_COST_CATALOG_KEY), "R-03 no legacy persist when blocked");

// R-04 work_only → work OK
persistKeys.length = 0;
const workOnlySave = await saveWorkCatalogRouted(workStore, {}, settings("work_only"));
assert(workOnlySave.ok === true && workOnlySave.saved === true, "R-04 work_only work save OK");

// R-05 legacy_only → work blocked
persistKeys.length = 0;
const blockedWork = await saveWorkCatalogRouted(workStore, {}, settings("legacy_only"));
assert(
  blockedWork.ok === true && blockedWork.saved === false && blockedWork.blocked === "legacy_only_blocks_work",
  "R-05 legacy_only blocks work",
);

// R-06 legacy_only → legacy OK
persistKeys.length = 0;
const legacyOnlySave = await saveLegacyCostCatalogRouted(legacyStore, settings("legacy_only"));
assert(legacyOnlySave.ok === true && legacyOnlySave.saved === true, "R-06 legacy_only legacy save OK");

// canWrite helpers
assert(canWriteLegacyCatalog(settings("split")) === true, "canWriteLegacy split");
assert(canWriteWorkCatalog(settings("split")) === true, "canWriteWork split");
assert(canWriteLegacyCatalog(settings("work_only")) === false, "canWriteLegacy work_only false");
assert(canWriteWorkCatalog(settings("legacy_only")) === false, "canWriteWork legacy_only false");

// resolveCatalogWriteMode from LS
seedSettings("work_only");
assert(resolveCatalogWriteMode() === "work_only", "resolveCatalogWriteMode reads localStorage");

// R-09 history append blocked when work_only
localStorage.setItem(
  WGDOM_COST_CATALOG_HISTORY_KEY,
  JSON.stringify({ schemaVersion: 1, snapshots: [], updatedAt: "2026-01-01T00:00:00.000Z" }),
);
const region = legacyStore.activeRegion;
const previousCatalog = JSON.parse(JSON.stringify(legacyStore));
const changedStore = JSON.parse(JSON.stringify(legacyStore));
const firstCat = changedStore.catalogs[region].categories.find((c) => c.id === "ROZBIORKI");
firstCat.rates[0] = { ...firstCat.rates[0], laborRbhPerUnit: firstCat.rates[0].laborRbhPerUnit + 0.01 };
assert(hasCatalogRateChange(previousCatalog, changedStore, region), "fixture has catalog rate change");
const historyBlocked = await appendCostCatalogHistoryRouted(
  previousCatalog,
  changedStore,
  defaultCompanyProfile().costModel,
  settings("work_only"),
);
assert(
  historyBlocked.ok === true && historyBlocked.saved === false && historyBlocked.blocked === "work_only_blocks_legacy",
  "R-09 history append blocked work_only",
);
assert(historyBlocked.history.snapshots.length === 0, "R-09 history unchanged when blocked");

// mergeAppSettings includes catalogWriteMode
seedSettings("work_only");
const merged = mergeAppSettings({ catalogWriteMode: "work_only" }, defaultAppSettings());
assert(merged.catalogWriteMode === "work_only", "mergeAppSettings catalogWriteMode");
assert(loadAppSettingsLocal().catalogWriteMode === "work_only", "loadAppSettingsLocal after seed");

// split history append saves when rates change
seedSettings("split");
persistKeys.length = 0;
const historySaved = await appendCostCatalogHistoryRouted(
  previousCatalog,
  changedStore,
  defaultCompanyProfile().costModel,
  settings("split"),
);
assert(historySaved.ok === true && historySaved.saved === true, "split history append saves");
assert(persistKeys.includes(WGDOM_COST_CATALOG_HISTORY_KEY), "split history persistKey");

void loadWorkCatalogStoreLocal;

console.log(`\ntest-pb-write-router.mjs: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
