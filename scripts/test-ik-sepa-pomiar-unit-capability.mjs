#!/usr/bin/env node
/**
 * Sępa IMPLEMENT GO #1 — `pomiar` as first-class WgdomCostUnit.
 * npx vite-node scripts/test-ik-sepa-pomiar-unit-capability.mjs
 *
 * Guards:
 * - pomiar is legal canonical unit
 * - existing units still normalize
 * - prob remains prob
 * - pomiar is NOT an alias of prob
 * - odc / szt.żył remain non-canonical
 */
import { normalizeWgdomCostUnit } from "../src/lib/wgdom-cost-catalog.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { normalizeWorkRateUnitToken } from "../src/lib/work-catalog/work-rate-qualify.ts";
import { workRateUnitLabelPl } from "../src/lib/work-catalog/our-work-rate-catalog.ts";
import { mapApfLaborUnitToEngineUnit } from "../src/lib/tender-position-cost/autonomous-pricing-fallback/labor-units.ts";

let pass = 0;
let fail = 0;
function assert(name, cond, extra = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra);
  }
}

// --- canonical normalize ---
assert(
  "T-POMIAR-01 normalize pomiar → pomiar",
  normalizeWgdomCostUnit("pomiar") === "pomiar",
  normalizeWgdomCostUnit("pomiar"),
);

assert(
  "T-POMIAR-02 normalize pomiar. → pomiar (trailing dot)",
  normalizeWgdomCostUnit("pomiar.") === "pomiar",
  normalizeWgdomCostUnit("pomiar."),
);

assert(
  "T-POMIAR-03 normalize Pomiar case-insensitive",
  normalizeWgdomCostUnit("Pomiar") === "pomiar",
);

assert(
  "T-POMIAR-04 pomiar != prob",
  normalizeWgdomCostUnit("pomiar") !== normalizeWgdomCostUnit("prob"),
);

assert(
  "T-POMIAR-05 prob still prob",
  normalizeWgdomCostUnit("prob") === "prob" &&
    normalizeWgdomCostUnit("prób.") === "prob",
);

assert(
  "T-POMIAR-06 existing units unchanged",
  normalizeWgdomCostUnit("m2") === "m2" &&
    normalizeWgdomCostUnit("mb") === "mb" &&
    normalizeWgdomCostUnit("szt") === "szt" &&
    normalizeWgdomCostUnit("rbh") === "rbh" &&
    normalizeWgdomCostUnit("m3") === "m3" &&
    normalizeWgdomCostUnit("kpl") === "szt" &&
    normalizeWgdomCostUnit("kg") === "kg" &&
    normalizeWgdomCostUnit("l") === "l",
);

assert(
  "T-POMIAR-07 odc still non-canonical",
  normalizeWgdomCostUnit("odc") === null &&
    normalizeWgdomCostUnit("odc.") === null,
);

assert(
  "T-POMIAR-08 szt.żył still non-canonical",
  normalizeWgdomCostUnit("szt.żył") === null &&
    normalizeWgdomCostUnit("szt.zyl") === null &&
    normalizeWgdomCostUnit("msc") === null &&
    normalizeWgdomCostUnit("wyp") === null,
);

// --- CatalogWork store accepts unit pomiar (no real A1/A2 create) ---
{
  const now = new Date().toISOString();
  const store = normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: now,
    catalogs: {
      wroclaw: {
        region: "wroclaw",
        updatedAt: now,
        works: [
          {
            id: "test-pomiar-draft-capability-only",
            tradeId: "ELEKTRYKA",
            namePl: "Test pomiar capability",
            unit: "pomiar",
            companyPricePln: 0,
            updatedAt: now,
          },
        ],
      },
      dolnyslask: { region: "dolnyslask", updatedAt: now, works: [] },
    },
  });
  const work = store.catalogs.wroclaw.works.find(
    (w) => w.id === "test-pomiar-draft-capability-only",
  );
  assert(
    "T-POMIAR-09 store accepts CatalogWork unit=pomiar",
    work != null && work.unit === "pomiar",
    work?.unit,
  );
  assert(
    "T-POMIAR-10 no A1/A2 production workIds in draft",
    !store.catalogs.wroclaw.works.some((w) =>
      String(w.id).startsWith("knnr-wc-knnr-5-1301"),
    ),
  );
}

assert(
  "T-POMIAR-11 work-rate token pomiar stays pomiar",
  normalizeWorkRateUnitToken("pomiar") === "pomiar" &&
    normalizeWorkRateUnitToken("prob") === "prob",
);

assert(
  "T-POMIAR-12 UI label pomiar",
  workRateUnitLabelPl("pomiar") === "pomiar" &&
    workRateUnitLabelPl("prob") === "próba",
);

// APF pricing bridge may still map pomiar→prob for engine — document separation from F5 identity.
assert(
  "T-POMIAR-13 APF engine bridge unchanged (pricing-only; not F5 identity)",
  mapApfLaborUnitToEngineUnit("pomiar") === "prob" &&
    mapApfLaborUnitToEngineUnit("prob") === "prob",
);

assert(
  "T-POMIAR-14 canonical identity: normalize never maps pomiar→prob",
  normalizeWgdomCostUnit("pomiar") === "pomiar",
);

console.log("");
console.log(`RESULT ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
