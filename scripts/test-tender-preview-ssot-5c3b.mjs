/**
 * Bundle #5C-3B — preview data SSOT: Ustawienia wyceny ↔ resolveActiveCatalogForTender.
 * npx vite-node scripts/test-tender-preview-ssot-5c3b.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getCategoryRate, WGDOM_COST_CATEGORY_IDS } from "../src/lib/wgdom-cost-catalog.ts";
import { resolveActiveCatalogForTender } from "../src/lib/tender-active-catalog.ts";
import { buildPriceBasePreviewRows } from "../src/lib/tender-price-base-preview.ts";
import { defaultWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-migrate.ts";
import { saveWorkCatalogStoreLocal } from "../src/lib/work-catalog/work-catalog-store.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const priceBasePanelPath = join(root, "src", "app", "TenderPriceBasePanel.tsx");
const previewHelperPath = join(root, "src", "lib", "tender-price-base-preview.ts");

const MIGRATED_AT = "2026-07-06T08:00:00.000Z";

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

function assertEq(actual, expected, name) {
  if (actual === expected) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name, `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log("=== TENDER PREVIEW SSOT 5C-3B ===\n");

const priceBasePanel = readFileSync(priceBasePanelPath, "utf8");
const previewHelper = readFileSync(previewHelperPath, "utf8");

// T1 — no legacy catalog loader in panel
assert("T1 no loadWgdomCostCatalogStore", !priceBasePanel.includes("loadWgdomCostCatalogStore"));
assert("T1 no loadWgdomCostCatalogStoreLocal", !priceBasePanel.includes("loadWgdomCostCatalogStoreLocal"));
assert("T1 no listEditableCategories", !priceBasePanel.includes("listEditableCategories"));

// T2 — resolver wired
assert("T2 resolveActiveCatalogForTender", priceBasePanel.includes("resolveActiveCatalogForTender"));
assert("T2 buildPriceBasePreviewRows", priceBasePanel.includes("buildPriceBasePreviewRows"));

// T3 — pricingCatalogRevision invalidation
assert("T3 pricingCatalogRevision", priceBasePanel.includes("pricingCatalogRevision"));

// T4 — history loader unchanged (#5C-3D scope)
assert("T4 loadWgdomCostCatalogHistory kept", priceBasePanel.includes("loadWgdomCostCatalogHistory()"));

// T5 — helper pure (no I/O)
assert("T5 helper no localStorage", !previewHelper.includes("localStorage"));
assert("T5 helper no cloud-sync", !previewHelper.includes("cloud-sync"));
assert("T5 helper no loadWgdomCostCatalogStore", !previewHelper.includes("loadWgdomCostCatalogStore"));
assert("T5 helper no buildLegacyCostCatalogFromWorkStore", !previewHelper.includes("buildLegacyCostCatalogFromWorkStore"));

// T6 — parity preview rows ↔ resolver catalog
storage.clear();
const workStore = defaultWorkCatalogStore(MIGRATED_AT);
const malowanie = workStore.catalogs.wroclaw.works.find((w) => w.legacyCategoryId === "MALOWANIE" && w.active);
if (malowanie) {
  malowanie.companyPricePln = 177;
  malowanie.updatedAt = MIGRATED_AT;
}
saveWorkCatalogStoreLocal(workStore);

const resolution = resolveActiveCatalogForTender({ referenceHourlyPln: 85 });
const previewRows = buildPriceBasePreviewRows(resolution.catalog);
const malowanieRow = previewRows.find((r) => r.id === "MALOWANIE");
assert("T6 MALOWANIE row exists", Boolean(malowanieRow));

if (malowanieRow) {
  const engineRate = getCategoryRate(resolution.catalog, "MALOWANIE", malowanieRow.unit);
  assertEq(malowanieRow.materialPlnPerUnit, engineRate?.materialPlnPerUnit ?? -1, "T6 material parity");
  assertEq(malowanieRow.laborRbhPerUnit, engineRate?.laborRbhPerUnit ?? -1, "T6 labor rbh parity");
}

assertEq(previewRows.length, WGDOM_COST_CATEGORY_IDS.length, "T6 category row count");

// T7 — preview rows match full catalog map
for (const row of previewRows) {
  const rate = getCategoryRate(resolution.catalog, row.id, row.unit);
  if (!rate) continue;
  assert(
    `T7 parity ${row.id}`,
    row.materialPlnPerUnit === rate.materialPlnPerUnit && row.laborRbhPerUnit === rate.laborRbhPerUnit,
  );
}

console.log(`\n=== ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
