/**
 * P3.4A — wpływ zmian materiałów vs historia firmy.
 * npx vite-node scripts/test-material-impact.mjs
 */
import { defaultWgdomCostCatalog } from "../src/lib/wgdom-cost-catalog.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import { buildMaterialRateHistoryView } from "../src/lib/material-history.ts";
import {
  buildMaterialHistoryImpactSummary,
  computeMaterialHistoryImpact,
  formatMaterialDeviationShort,
  formatMaterialImpactPln,
} from "../src/lib/material-impact.ts";
import { buildCatalogLinePricingView } from "../src/lib/tender-catalog-line-pricing.ts";
import { normalizeWgdomCostCatalogHistoryStore } from "../src/lib/wgdom-cost-catalog-history.ts";

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
    console.error(`FAIL ${msg}: expected ${expected}, got ${actual}`);
    return;
  }
  pass += 1;
}

const history = normalizeWgdomCostCatalogHistoryStore({
  schemaVersion: 1,
  updatedAt: "2026-06-13T12:00:00.000Z",
  snapshots: [{
    at: "2026-03-20T10:00:00.000Z",
    region: "wroclaw",
    rates: [{
      categoryId: "MALOWANIE",
      unit: "m2",
      laborRbhPerUnit: 0.16,
      laborPlnPerUnit: 20,
      materialPlnPerUnit: 8,
    }],
  }],
});

const view = buildMaterialRateHistoryView(9, "MALOWANIE", "m2", history, "wroclaw");
const impact = computeMaterialHistoryImpact(9, view, 4200, "Malowanie");
assertEq(impact.deviationPerUnit, 1, "deviation +1");
assertEq(impact.impactPln, 4200, "impact 4200");

const flat = computeMaterialHistoryImpact(8, view, 100, "Malowanie");
assertEq(flat.impactPln, 0, "no impact when equal");

const noHist = computeMaterialHistoryImpact(9, buildMaterialRateHistoryView(9, "MALOWANIE", "m2", { schemaVersion: 1, snapshots: [], updatedAt: "" }, "wroclaw"), 100);
assert(noHist.unavailable, "no history unavailable");

const summary = buildMaterialHistoryImpactSummary([{
  categoryId: "MALOWANIE",
  categoryLabel: "Malowanie",
  avgMaterialPlnPerUnit: 9,
  dominantUnit: "m2",
  historyView: view,
  quantity: 4200,
}]);
assertEq(summary.changedCount, 1, "one changed");
assertEq(summary.totalImpactPln, 4200, "total 4200");

const catalog = defaultWgdomCostCatalog();
const costModel = defaultCostModelFromPayroll();
const lines = [{ lp: "1", description: "Malowanie ścian", unit: "m2", quantity: "4200" }];
const pricing = buildCatalogLinePricingView(lines, catalog, costModel, null, history);
assert(pricing != null && pricing.categorySummary.length === 1, "pricing view");
if (pricing) {
  assert(pricing.categorySummary[0].materialImpact != null, "material impact on summary");
  assert(pricing.categorySummary[0].materialHistory.hasHistory, "material history on summary");
}

assert(formatMaterialDeviationShort(1) === "+1", "format deviation");
assert(formatMaterialImpactPln(4200).includes("4"), "format impact");

console.log(`\nPASS: ${pass}  FAIL: ${fail}  TOTAL: ${pass + fail}`);
if (fail > 0) process.exit(1);
