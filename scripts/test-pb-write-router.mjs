/**
 * PB-WRITE-A — Catalog Write Router (#5C-5C F2: work path only).
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
  canWriteWorkCatalog,
  resolveCatalogWriteMode,
  saveWorkCatalogRouted,
} from "../src/lib/catalog-write-router.ts";
import { WGDOM_COST_CATALOG_KEY } from "../src/lib/wgdom-cost-catalog-store.ts";
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

assert(normalizeCatalogWriteMode(undefined) === "split", "R-07a normalize undefined → split");
assert(normalizeCatalogWriteMode("bogus") === "split", "R-07b normalize bogus → split");
assert(normalizeCatalogWriteMode("work_only") === "work_only", "R-07c normalize work_only");

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

seedSettings("split");
persistKeys.length = 0;
void defaultWgdomCostCatalogStore();
const workStore = defaultWorkCatalogStore("2026-06-29T12:00:00.000Z");
const workResult = await saveWorkCatalogRouted(workStore, {}, settings("split"));
assert(workResult.ok === true && workResult.saved === true, "F2 split work save OK");
assert(persistKeys.includes(WORK_CATALOG_STORAGE_KEY), "F2 work persistKey called");
assert(!persistKeys.includes(WGDOM_COST_CATALOG_KEY), "F2 no legacy catalog persist");

persistKeys.length = 0;
const workOnlySave = await saveWorkCatalogRouted(workStore, {}, settings("work_only"));
assert(workOnlySave.ok === true && workOnlySave.saved === true, "F2 work_only work save OK");

persistKeys.length = 0;
const blockedWork = await saveWorkCatalogRouted(workStore, {}, settings("legacy_only"));
assert(
  blockedWork.ok === true && blockedWork.saved === false && blockedWork.blocked === "legacy_only_blocks_work",
  "F2 legacy_only blocks work",
);

assert(canWriteWorkCatalog(settings("split")) === true, "canWriteWork split");
assert(canWriteWorkCatalog(settings("work_only")) === true, "canWriteWork work_only");
assert(canWriteWorkCatalog(settings("legacy_only")) === false, "canWriteWork legacy_only false");

seedSettings("work_only");
assert(resolveCatalogWriteMode() === "work_only", "resolveCatalogWriteMode reads localStorage");

seedSettings("work_only");
const merged = mergeAppSettings({ catalogWriteMode: "work_only" }, defaultAppSettings());
assert(merged.catalogWriteMode === "work_only", "mergeAppSettings catalogWriteMode");
assert(loadAppSettingsLocal().catalogWriteMode === "work_only", "loadAppSettingsLocal after seed");

void loadWorkCatalogStoreLocal;

console.log(`\ntest-pb-write-router.mjs: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
