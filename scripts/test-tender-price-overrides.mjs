/**
 * P3.5B — override cen per przetarg.
 * npx vite-node scripts/test-tender-price-overrides.mjs
 */
import { defaultWgdomCostCatalog } from "../src/lib/wgdom-cost-catalog.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { computeFromCatalogRow, aggregateCatalogDirectCost } from "../src/lib/wgdom-catalog-cost-engine.ts";
import { buildCatalogLinePricingView } from "../src/lib/tender-catalog-line-pricing.ts";
import { computeTenderBidProposal } from "../src/lib/tenders-bid-calculator.ts";
import {
  buildTenderPriceOverrideLookup,
  upsertTenderPriceOverride,
  removeTenderPriceOverride,
  defaultTenderPriceOverridesStore,
  normalizeTenderPriceOverridesStore,
} from "../src/lib/tender-price-overrides.ts";
import { CATALOG_LINE_PRICE_SOURCE_OVERRIDE } from "../src/lib/tender-catalog-line-pricing.ts";

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

function assertLt(actual, bound, msg) {
  assert(actual < bound, `${msg}: expected < ${bound}, got ${actual}`);
}

const catalog = defaultWgdomCostCatalog();
const costModel = defaultCostModelFromPayroll();

const line = {
  lp: "1",
  description: "Malowanie ścian emulsyjne dwukrotnie",
  unit: "m2",
  quantity: "100",
};

const baseCost = computeFromCatalogRow(line, catalog, costModel);
assert(baseCost.materialSource === "base" || baseCost.materialSource === "catalog", "base material source");
assert(baseCost.laborSource === "base" || baseCost.laborSource === "catalog", "base labor source");

const laborOverride = [{
  categoryId: "MALOWANIE",
  priceType: "labor",
  unit: "m2",
  overridePlnPerUnit: 3,
  updatedAt: new Date().toISOString(),
}];
const laborLookup = buildTenderPriceOverrideLookup(laborOverride);
const withLabor = computeFromCatalogRow(line, catalog, costModel, laborLookup);
assert(withLabor.laborSource === "override", "labor override source");
assert(Math.abs(withLabor.laborCost - 300) < 0.01, "labor override cost 100*3");

const materialOverride = [{
  categoryId: "MALOWANIE",
  priceType: "material",
  unit: "m2",
  overridePlnPerUnit: 4,
  updatedAt: new Date().toISOString(),
}];
const matLookup = buildTenderPriceOverrideLookup(materialOverride);
const withMat = computeFromCatalogRow(line, catalog, costModel, matLookup);
assert(withMat.materialSource === "override", "material override source");
assert(Math.abs(withMat.materialCost - 400) < 0.01, "material override cost 100*4");

const bothLookup = buildTenderPriceOverrideLookup([...laborOverride, ...materialOverride]);
const aggBase = aggregateCatalogDirectCost([line], catalog, costModel);
const aggOverride = aggregateCatalogDirectCost([line], catalog, costModel, bothLookup);
assertLt(aggOverride.totals.direct, aggBase.totals.direct, "override lowers direct cost");

let store = defaultTenderPriceOverridesStore();
store = upsertTenderPriceOverride(store, "tender-1", {
  categoryId: "MALOWANIE",
  priceType: "labor",
  unit: "m2",
  overridePlnPerUnit: 18,
});
assert(store.byTenderId["tender-1"].overrides.length === 1, "store upsert");
store = removeTenderPriceOverride(store, "tender-1", "MALOWANIE", "labor", "m2");
assert(store.byTenderId["tender-1"].overrides.length === 0, "store remove");

const normalized = normalizeTenderPriceOverridesStore({
  schemaVersion: 1,
  byTenderId: {
    "t-1": {
      tenderId: "t-1",
      overrides: [{ categoryId: "MALOWANIE", priceType: "labor", unit: "m2", overridePlnPerUnit: 20, updatedAt: "2026-01-01" }],
      updatedAt: "2026-01-01",
    },
  },
  updatedAt: "2026-01-01",
});
assert(normalized.byTenderId["t-1"].overrides[0].overridePlnPerUnit === 20, "normalize ok");

const view = buildCatalogLinePricingView([line], catalog, costModel, laborOverride);
assert(view != null, "view not null");
if (view) {
  assert(view.rows[0].laborSource === CATALOG_LINE_PRICE_SOURCE_OVERRIDE, "view labor override label");
  assert(view.categorySummary[0].hasLaborOverride === true, "summary has labor override");
}

const kosztorys = {
  ok: true,
  source: "ath",
  rowCount: 1,
  rows: [],
  catalogQuantities: [line],
  totalValue: null,
  currency: "PLN",
};
const proposalBase = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog,
});
const proposalOverride = computeTenderBidProposal({
  kosztorys,
  swz: null,
  fit: null,
  costModel,
  minProjectDays: 30,
  maxConcurrentProjects: 3,
  catalog,
  priceOverrides: laborOverride,
});
assert(proposalBase.ok && proposalOverride.ok, "proposals ok");
if (proposalBase.ok && proposalOverride.ok && proposalBase.costPricePln != null && proposalOverride.costPricePln != null) {
  assertLt(proposalOverride.costPricePln, proposalBase.costPricePln, "hero cost changes with override");
}

console.log(`\nPASS: ${pass}  FAIL: ${fail}  TOTAL: ${pass + fail}`);
if (fail > 0) process.exit(1);
