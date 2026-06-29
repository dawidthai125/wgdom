/**
 * P2.4 — smoke: grupowa zmiana cen (pure).
 * Run: npx vite-node scripts/smoke-test-work-catalog-bulk-price-p2.4.mjs
 */
import { defaultWorkCatalogStoreForPersist, normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import {
  applyBulkPriceOperation,
  computeBulkPricePreview,
  patchBulkCompanyPricesInStore,
  previewToPriceMap,
  validateBulkOperationValue,
} from "../src/app/work-catalog/work-catalog-bulk-price.ts";

const UPDATED_AT = "2026-06-28T18:00:00.000Z";
const NOW_MS = Date.parse(UPDATED_AT);

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name);
  }
}

function makeWork(id, namePl, price) {
  return {
    id,
    tradeId: "MALOWANIE",
    namePl,
    unit: "m2",
    companyPricePln: price,
    updatedAt: "2026-06-01T00:00:00.000Z",
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

const works = [
  makeWork("w1", "Malowanie", 100),
  makeWork("w2", "Gładzie", 50),
  makeWork("w3", "Gruntowanie", 25),
];

console.log("=== WORK CATALOG BULK PRICE P2.4 SMOKE ===\n");

assert("+8%", applyBulkPriceOperation(100, { kind: "percent_add", value: 8 }) === 108);
assert("-10%", applyBulkPriceOperation(100, { kind: "percent_sub", value: 10 }) === 90);
assert("+5 zł", applyBulkPriceOperation(50, { kind: "amount_add", value: 5 }) === 55);
assert("-5 zł floor 0", applyBulkPriceOperation(3, { kind: "amount_sub", value: 5 }) === 0);
assert("set price", applyBulkPriceOperation(10, { kind: "set_price", value: 45 }) === 45);

const percentValid = validateBulkOperationValue("percent_add", "8");
assert("validate percent", percentValid.ok === true);

const setValid = validateBulkOperationValue("set_price", "12,50");
assert("validate set price", setValid.ok && setValid.operation.value === 12.5);

const selected = new Set(["w1", "w2"]);
const preview = computeBulkPricePreview(works, selected, { kind: "percent_add", value: 8 });
assert("preview count", preview.length === 2);
assert("preview w1 new", preview.find((r) => r.workId === "w1")?.newPricePln === 108);

const priceMap = previewToPriceMap(preview);
assert("price map keys", Object.keys(priceMap).length === 2);

const store = normalizeWorkCatalogStore({
  ...defaultWorkCatalogStoreForPersist(UPDATED_AT),
  catalogs: {
    wroclaw: { region: "wroclaw", updatedAt: UPDATED_AT, works },
    dolnyslask: { region: "dolnyslask", updatedAt: UPDATED_AT, works: [] },
  },
});

const patched = patchBulkCompanyPricesInStore(store, priceMap, UPDATED_AT, NOW_MS);
assert("bulk patch ok", patched != null);
assert("bulk updated ids", patched.updatedIds.length === 2);
assert(
  "bulk w2 price",
  patched.store.catalogs.wroclaw.works.find((w) => w.id === "w2")?.companyPricePln === 54,
);

assert("bulk missing id", patchBulkCompanyPricesInStore(store, { missing: 1 }, UPDATED_AT) === null);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
