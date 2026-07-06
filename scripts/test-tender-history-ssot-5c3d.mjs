/**
 * #5C-3D — History SSOT from Work Catalog gate.
 * Run: npx vite-node scripts/test-tender-history-ssot-5c3d.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-history-ssot-5c3d";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-history-ssot";

import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { appendWorkCatalogRateHistoryIfChanged, loadCatalogRateHistoryLocal } from "../src/lib/catalog-rate-history.ts";
import {
  buildRateSnapshotFromWorkCatalog,
  hasWorkCatalogRateChange,
} from "../src/lib/catalog-rate-history-snapshot.ts";
import { saveWorkCatalogRouted } from "../src/lib/catalog-write-router.ts";
import { WGDOM_COST_CATALOG_HISTORY_KEY } from "../src/lib/wgdom-cost-catalog-history.ts";
import { APP_SETTINGS_KEY, defaultAppSettings } from "../src/lib/app-settings.ts";
import { defaultWgdomCostCatalogStore } from "../src/lib/wgdom-cost-catalog.ts";
import { patchWorkCompanyPriceInStore } from "../src/app/work-catalog/work-catalog-price.ts";
import { patchWorkFavoriteInStore } from "../src/app/work-catalog/work-catalog-favorite.ts";
import { listWorksForRegion } from "../src/lib/work-catalog/catalog-work-utils.ts";
import { migrateLegacyCostCatalogStoreToWorkCatalog } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { defaultCompanyProfile } from "../src/lib/tenders-bzp-company.ts";

import { WORK_CATALOG_STORAGE_KEY } from "../src/lib/work-catalog/work-catalog-store.ts";

const MIGRATED_AT = "2026-07-06T10:00:00.000Z";
const { store: baseStore } = migrateLegacyCostCatalogStoreToWorkCatalog(
  defaultWgdomCostCatalogStore(),
  { migratedAtIso: MIGRATED_AT },
);

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const appRoot = join(root, "src", "app");

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

localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify({ ...defaultAppSettings(), catalogWriteMode: "work_only" }));

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

function walkTsFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walkTsFiles(full, out);
    else if (/\.(tsx?)$/.test(name)) out.push(full);
  }
  return out;
}

console.log("=== TENDER HISTORY SSOT 5C-3D ===\n");

const snapshotModule = readFileSync(join(root, "src/lib/catalog-rate-history-snapshot.ts"), "utf8");
const historyFacade = readFileSync(join(root, "src/lib/catalog-rate-history.ts"), "utf8");
const writeRouter = readFileSync(join(root, "src/lib/catalog-write-router.ts"), "utf8");
const priceBasePanel = readFileSync(join(appRoot, "TenderPriceBasePanel.tsx"), "utf8");
const laborUi = readFileSync(join(appRoot, "LaborBenchmarkUi.tsx"), "utf8");
const materialUi = readFileSync(join(appRoot, "MaterialHistoryUi.tsx"), "utf8");
const previewHelper = readFileSync(join(root, "src/lib/tender-price-base-preview.ts"), "utf8");
const adapter = readFileSync(join(root, "src/lib/work-catalog/work-catalog-engine-adapter.ts"), "utf8");
const benchmarkData = readFileSync(join(root, "src/lib/labor-benchmark-data.ts"), "utf8");

// T1 — snapshot module pure
assert("T1 snapshot exists", snapshotModule.includes("buildRateSnapshotFromWorkCatalog"));
assert("T1 snapshot no localStorage", !snapshotModule.includes("localStorage"));
assert("T1 snapshot no cloud-sync", !snapshotModule.includes("cloud-sync"));

// T2 — valid snapshot shape
const costModel = defaultCompanyProfile().costModel;
const snapshot = buildRateSnapshotFromWorkCatalog(baseStore, costModel);
assert("T2 snapshot region", snapshot.region === baseStore.activeRegion);
assert("T2 snapshot rates non-empty", Array.isArray(snapshot.rates) && snapshot.rates.length > 0);
assert(
  "T2 snapshot entry shape",
  snapshot.rates.every(
    (r) =>
      typeof r.categoryId === "string"
      && typeof r.unit === "string"
      && Number.isFinite(r.laborRbhPerUnit)
      && Number.isFinite(r.laborPlnPerUnit)
      && Number.isFinite(r.materialPlnPerUnit),
  ),
);

// T3–T6, T15 — behavioral (seeded migrated store)
const works = listWorksForRegion(baseStore);
const firstWork = works.find((w) => w.active) ?? works[0];
assert("T3 seed has works", firstWork != null);

if (firstWork) {
  const priced = patchWorkCompanyPriceInStore(
    baseStore,
    firstWork.id,
    (firstWork.companyPricePln ?? 100) + 50,
    "2026-07-06T10:01:00.000Z",
  );
  assert(
    "T3 hasWorkCatalogRateChange after price",
    priced && hasWorkCatalogRateChange(baseStore, priced, undefined, costModel.avgGrossHourlyPln),
  );

  const favorited = patchWorkFavoriteInStore(
    baseStore,
    firstWork.id,
    !firstWork.favorite,
    "2026-07-06T10:02:00.000Z",
  );
  assert(
    "T4 favorite only no rate change",
    favorited && !hasWorkCatalogRateChange(baseStore, favorited, undefined, costModel.avgGrossHourlyPln),
  );

  storage.clear();
  if (priced) {
    const after = await appendWorkCatalogRateHistoryIfChanged(baseStore, priced, costModel);
    assert("T5 snapshot count 1", after.snapshots.length === 1);

    const again = await appendWorkCatalogRateHistoryIfChanged(priced, priced, costModel);
    assert("T6 no duplicate snapshot", again.snapshots.length === 1);
  }

  storage.clear();
  localStorage.setItem(WORK_CATALOG_STORAGE_KEY, JSON.stringify(baseStore));
  const nextPriced = patchWorkCompanyPriceInStore(
    baseStore,
    firstWork.id,
    (firstWork.companyPricePln ?? 100) + 99,
    "2026-07-06T10:03:00.000Z",
  );
  if (nextPriced) {
    const saveResult = await saveWorkCatalogRouted(nextPriced, {
      updatedAtIso: nextPriced.updatedAt,
      previousStore: baseStore,
    });
    const history = loadCatalogRateHistoryLocal();
    assert("T15 routed save ok", saveResult.ok && saveResult.saved === true);
    assert("T15 history key written", storage.has(WGDOM_COST_CATALOG_HISTORY_KEY));
    assert("T15 history has snapshot", history.snapshots.length >= 1);
  }
}

// T7 — facade exports loader
assert("T7 loadCatalogRateHistoryLocal in facade", historyFacade.includes("loadCatalogRateHistoryLocal"));
assert("T7 loadCatalogRateHistory in facade", historyFacade.includes("loadCatalogRateHistory"));

// T8 — app no direct history import
const appFiles = walkTsFiles(appRoot);
const directHistoryImports = appFiles.filter((file) => {
  if (file.endsWith("changelog-data.ts")) return false;
  const text = readFileSync(file, "utf8");
  return /from\s+["'][^"']*wgdom-cost-catalog-history[^"']*["']/.test(text);
});
assert("T8 no app import wgdom-cost-catalog-history", directHistoryImports.length === 0);
if (directHistoryImports.length > 0) {
  for (const file of directHistoryImports) {
    console.log("  ", relative(root, file));
  }
}

// T9 — router previousStore
assert("T9 saveWorkCatalogRouted previousStore option", writeRouter.includes("previousStore"));
assert("T9 appendWorkCatalogRateHistoryIfChanged wired", writeRouter.includes("appendWorkCatalogRateHistoryIfChanged"));

// T10 — panel reload on revision
assert("T10 pricingCatalogRevision in panel", priceBasePanel.includes("pricingCatalogRevision"));
assert("T10 loadCatalogRateHistory in panel", priceBasePanel.includes("loadCatalogRateHistory"));

// T11 — empty state copy
assert("T11 LaborBenchmarkUi empty copy", laborUi.includes("Brak danych historycznych"));
assert("T11 MaterialHistoryUi empty copy", materialUi.includes("Brak danych historycznych"));

// T12 — benchmark data untouched (hash presence only — file read ok)
assert("T12 labor-benchmark-data present", benchmarkData.includes("getActiveLaborBenchmarkEdition"));

// T13 — adapter untouched (no catalog-rate-history import)
assert("T13 adapter no history snapshot import", !adapter.includes("catalog-rate-history"));

// T14 — preview SSOT intact
assert("T14 panel resolveActiveCatalogForTender", priceBasePanel.includes("resolveActiveCatalogForTender"));
assert("T14 panel buildPriceBasePreviewRows", priceBasePanel.includes("buildPriceBasePreviewRows"));
assert("T14 no loadWgdomCostCatalogStore in panel", !priceBasePanel.includes("loadWgdomCostCatalogStore"));
assert("T14 helper no localStorage", !previewHelper.includes("localStorage"));

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
