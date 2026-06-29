/**
 * P2.2 — smoke: walidacja ceny firmy + patch store (pure).
 * Run: npx vite-node scripts/smoke-test-work-catalog-price-p2.2.mjs
 */
import { defaultWorkCatalogStoreForPersist, normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { listWorksForRegion } from "../src/lib/work-catalog/catalog-work-utils.ts";
import {
  formatCompanyPriceDraft,
  normalizeCompanyPriceInput,
  patchWorkCompanyPriceInStore,
  validateCompanyPricePlnInput,
} from "../src/app/work-catalog/work-catalog-price.ts";

const UPDATED_AT = "2026-06-28T14:00:00.000Z";
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

console.log("=== WORK CATALOG PRICE P2.2 SMOKE ===\n");

assert("normalize comma", normalizeCompanyPriceInput("12,50") === "12.50");
assert("validate ok integer", validateCompanyPricePlnInput("39").ok === true);
assert(
  "validate ok decimals",
  validateCompanyPricePlnInput("12.34").ok && validateCompanyPricePlnInput("12.34").valuePln === 12.34,
);
assert("validate zero", validateCompanyPricePlnInput("0").ok && validateCompanyPricePlnInput("0").valuePln === 0);
assert("reject negative", validateCompanyPricePlnInput("-1").ok === false);
assert("reject 3 decimals", validateCompanyPricePlnInput("1.234").ok === false);
assert("reject empty", validateCompanyPricePlnInput("").ok === false);
assert("reject letters", validateCompanyPricePlnInput("abc").ok === false);
assert("format draft zero", formatCompanyPriceDraft(0) === "");
assert("format draft positive", formatCompanyPriceDraft(39.5) === "39.5");

const store = normalizeWorkCatalogStore({
  ...defaultWorkCatalogStoreForPersist(UPDATED_AT),
  catalogs: {
    wroclaw: {
      region: "wroclaw",
      updatedAt: UPDATED_AT,
      works: [
        {
          id: "w-smoke-1",
          tradeId: "MALOWANIE",
          namePl: "Malowanie test",
          unit: "m2",
          companyPricePln: 0,
          updatedAt: "2026-06-01T00:00:00.000Z",
          freshnessStatus: "missing",
          keywords: [],
          active: true,
          favorite: false,
          usageCount: 0,
          source: "custom",
        },
      ],
    },
    dolnyslask: {
      region: "dolnyslask",
      updatedAt: UPDATED_AT,
      works: [],
    },
  },
});
const works = listWorksForRegion(store);
const first = works[0];
assert("seed has work", Boolean(first));

if (first) {
  const patched = patchWorkCompanyPriceInStore(store, first.id, 88.5, UPDATED_AT, NOW_MS);
  assert("patch returns store", patched != null);
  const reloaded = listWorksForRegion(patched);
  const updated = reloaded.find((w) => w.id === first.id);
  assert("patch price", updated?.companyPricePln === 88.5);
  assert("patch updatedAt", updated?.updatedAt === UPDATED_AT);
  assert("patch freshness ok", updated?.freshnessStatus === "ok");
  assert("store updatedAt", patched.updatedAt === UPDATED_AT);
  assert("patch missing id", patchWorkCompanyPriceInStore(store, "__missing__", 1, UPDATED_AT) === null);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
