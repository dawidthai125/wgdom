/**
 * TENDER-P0.1 — Active Catalog Classifier SSOT.
 * Aktywny katalog z keywordem poza seedem → klasyfikacja używa aktywnego katalogu.
 *
 * npx vite-node scripts/test-tender-p0.1-active-catalog-classifier.mjs
 */
import {
  classifyAthLineCategory,
  classifyAthLineCategoryWithoutDictionary,
} from "../src/lib/wgdom-ath-classifier.ts";
import {
  computeFromCatalogRow,
  aggregateCatalogDirectCost,
} from "../src/lib/wgdom-catalog-cost-engine.ts";
import {
  defaultWgdomCostCatalog,
  getCatalogClassificationRules,
} from "../src/lib/wgdom-cost-catalog.ts";
import { defaultCostModelFromPayroll } from "../src/lib/company-labor-cost.ts";
import {
  restoreDefaultUserClassificationDictionaryStore,
  setUserClassificationDictionaryCache,
} from "../src/lib/wgdom-user-classification-dictionary.ts";

let passed = 0;
let failed = 0;

function assertEq(actual, expected, label) {
  if (actual === expected) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${label}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  }
}

function assertTrue(cond, label) {
  if (cond) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failed += 1;
    console.error(`FAIL  ${label}`);
  }
}

setUserClassificationDictionaryCache(restoreDefaultUserClassificationDictionaryStore());

const UNIQUE_KW = "xyz-only-in-active-catalog-p01";
const DESC = `Montaż ${UNIQUE_KW} na ścianie`;

const seed = defaultWgdomCostCatalog("wroclaw");
const seedHasKw = getCatalogClassificationRules(seed).some((r) =>
  r.keywords.some((k) => k.includes(UNIQUE_KW)),
);
assertTrue(!seedHasKw, "T1 seed nie zawiera unique keyword");

assertEq(
  classifyAthLineCategory(DESC, "m2"),
  "UNKNOWN",
  "T2 bez catalog (default seed) → UNKNOWN",
);
assertEq(
  classifyAthLineCategory(DESC, "m2", seed),
  "UNKNOWN",
  "T3 jawny seed → UNKNOWN",
);

const active = defaultWgdomCostCatalog("wroclaw");
const malowanie = active.categories.find((c) => c.id === "MALOWANIE");
assertTrue(!!malowanie, "T4 kategoria MALOWANIE w seed template");
malowanie.keywords = [...malowanie.keywords, UNIQUE_KW];

assertEq(
  classifyAthLineCategory(DESC, "m2", active),
  "MALOWANIE",
  "T5 aktywny katalog z keyword → MALOWANIE",
);
assertEq(
  classifyAthLineCategoryWithoutDictionary(DESC, "m2", active),
  "MALOWANIE",
  "T6 WithoutDictionary + aktywny catalog → MALOWANIE",
);
assertEq(
  classifyAthLineCategory(DESC, "m2"),
  "UNKNOWN",
  "T7 default nadal seed → UNKNOWN (brak regresji API)",
);

const costModel = defaultCostModelFromPayroll();
const row = { description: DESC, unit: "m2", quantity: "10" };

const costSeed = computeFromCatalogRow(row, seed, costModel);
assertEq(costSeed.category, "UNKNOWN", "T8 computeFromCatalogRow(seed) → UNKNOWN");

const costActive = computeFromCatalogRow(row, active, costModel);
assertEq(costActive.category, "MALOWANIE", "T9 computeFromCatalogRow(active) → MALOWANIE");
assertTrue(costActive.directCost > 0, "T10 active row ma dodatni directCost");

const agg = aggregateCatalogDirectCost([row], active, costModel);
assertEq(agg.unknownCount, 0, "T11 aggregate: unknownCount=0");
assertEq(agg.classifiedCount, 1, "T12 aggregate: classifiedCount=1");

const costSeedAgain = computeFromCatalogRow(
  { description: "Malowanie ścian emulsyjne", unit: "m2", quantity: "5" },
  seed,
  costModel,
);
assertEq(costSeedAgain.category, "MALOWANIE", "T13 regresja seed malowanie");

console.log(`\n=== TENDER-P0.1: ${passed} PASS / ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
