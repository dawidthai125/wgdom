#!/usr/bin/env node
/**
 * Sępa IMPLEMENT GO #2 — A1/A2 CatalogWork (1301-01/02 · pomiar).
 * npx vite-node scripts/test-ik-sepa-1301-pomiar-catalog.mjs
 *
 * In-memory only · ZERO G1 · ZERO F5 · ZERO OUR RATE · ZERO cloud write.
 */
import { C2_KNR_WC_1305_01_WORK_ID, C2_KNR_WC_1305_02_WORK_ID, buildC2KnrWcProbCatalogWork } from "../src/lib/intelligent-estimator/c2-knr-wc-prob-owner-create.ts";
import { normalizeWgdomCostUnit } from "../src/lib/wgdom-cost-catalog.ts";
import {
  SEPA_KNNR_1301_01_SOURCE_CODE,
  SEPA_KNNR_1301_01_WORK_ID,
  SEPA_KNNR_1301_02_SOURCE_CODE,
  SEPA_KNNR_1301_02_WORK_ID,
  SEPA_KNNR_1301_HOLD_LP,
  SEPA_KNNR_1301_WORKS,
  buildSepaKnr1301PomiarCatalogWork,
  getSepaKnr1301WorkSpec,
  isSepaKnr1301PomiarWorkId,
  workMatchesSepaKnr1301Spec,
} from "../src/lib/work-catalog/ik-owner-create-sepa-1301-pomiar-catalog.ts";
import { applySepaKnr1301PomiarCatalogSeed } from "../src/lib/work-catalog/ik-owner-create-sepa-1301-pomiar-ops.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";

const NOW = "2026-09-06T06:00:00.000Z";

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

function freshStoreWith1305() {
  const base = normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: NOW,
    catalogs: {
      wroclaw: { region: "wroclaw", updatedAt: NOW, works: [] },
      dolnyslask: { region: "dolnyslask", updatedAt: NOW, works: [] },
    },
  });
  const w01 = buildC2KnrWcProbCatalogWork("1305-01", NOW);
  const w02 = buildC2KnrWcProbCatalogWork("1305-02", NOW);
  return normalizeWorkCatalogStore({
    ...base,
    catalogs: {
      wroclaw: {
        ...base.catalogs.wroclaw,
        works: [w01, w02],
      },
      dolnyslask: {
        ...base.catalogs.dolnyslask,
        works: [{ ...w01 }, { ...w02 }],
      },
    },
  });
}

// --- specs ---
assert("specs count = 2", SEPA_KNNR_1301_WORKS.length === 2);
assert("A1 workId", SEPA_KNNR_1301_01_WORK_ID === "knnr-wc-knnr-5-1301-01-pomiar");
assert("A2 workId", SEPA_KNNR_1301_02_WORK_ID === "knnr-wc-knnr-5-1301-02-pomiar");
assert("A1 sourceCode", SEPA_KNNR_1301_01_SOURCE_CODE === "KNNR|5|1301-01");
assert("A2 sourceCode", SEPA_KNNR_1301_02_SOURCE_CODE === "KNNR|5|1301-02");
assert("LP269 hold constant", SEPA_KNNR_1301_HOLD_LP === "269");
assert("isSepa helper", isSepaKnr1301PomiarWorkId(SEPA_KNNR_1301_01_WORK_ID));
assert("not 1305", !isSepaKnr1301PomiarWorkId(C2_KNR_WC_1305_01_WORK_ID));

// --- draft fields ---
{
  const a1 = buildSepaKnr1301PomiarCatalogWork(SEPA_KNNR_1301_WORKS[0], NOW);
  const a2 = buildSepaKnr1301PomiarCatalogWork(SEPA_KNNR_1301_WORKS[1], NOW);
  assert("A1 unit pomiar", a1.unit === "pomiar");
  assert("A2 unit pomiar", a2.unit === "pomiar");
  assert("A1 labor/material", a1.costSplit?.laborRatio === 1 && a1.costSplit?.materialRatio === 0);
  assert("A2 labor/material", a2.costSplit?.laborRatio === 1 && a2.costSplit?.materialRatio === 0);
  assert("A1 price 0", a1.companyPricePln === 0);
  assert("A2 price 0", a2.companyPricePln === 0);
  assert("A1 no OUR RATE", a1.ourWorkRate == null);
  assert("A2 no OUR RATE", a2.ourWorkRate == null);
  assert("A1 source in description", String(a1.descriptionPl).includes("KNNR|5|1301-01"));
  assert("A2 source in description", String(a2.descriptionPl).includes("KNNR|5|1301-02"));
  assert("A1 name exact", a1.namePl === SEPA_KNNR_1301_WORKS[0].namePl);
  assert("A2 name exact", a2.namePl === SEPA_KNNR_1301_WORKS[1].namePl);
  assert("match helper A1", workMatchesSepaKnr1301Spec(a1, SEPA_KNNR_1301_WORKS[0]));
  assert("match helper A2", workMatchesSepaKnr1301Spec(a2, SEPA_KNNR_1301_WORKS[1]));
}

assert("normalize pomiar still", normalizeWgdomCostUnit("pomiar") === "pomiar");
assert("pomiar != prob", normalizeWgdomCostUnit("pomiar") !== "prob");

// --- seed once ---
{
  const before = freshStoreWith1305();
  const r1 = applySepaKnr1301PomiarCatalogSeed(before, NOW);
  assert("seed changed", r1.changed === true);
  assert("created 2 ids", r1.createdWorkIds.length === 2);
  assert(
    "created ids exact",
    r1.createdWorkIds.includes(SEPA_KNNR_1301_01_WORK_ID) &&
      r1.createdWorkIds.includes(SEPA_KNNR_1301_02_WORK_ID),
  );
  assert(
    "count +2 wroclaw",
    r1.afterCount.wroclaw === r1.beforeCount.wroclaw + 2,
    JSON.stringify(r1.beforeCount) + " → " + JSON.stringify(r1.afterCount),
  );
  assert(
    "count +2 dolnyslask",
    r1.afterCount.dolnyslask === r1.beforeCount.dolnyslask + 2,
  );

  const a1w = getWorkByIdFromStore(r1.store, SEPA_KNNR_1301_01_WORK_ID, "wroclaw");
  const a2w = getWorkByIdFromStore(r1.store, SEPA_KNNR_1301_02_WORK_ID, "wroclaw");
  const a1d = getWorkByIdFromStore(r1.store, SEPA_KNNR_1301_01_WORK_ID, "dolnyslask");
  const a2d = getWorkByIdFromStore(r1.store, SEPA_KNNR_1301_02_WORK_ID, "dolnyslask");
  assert("A1 once wroclaw", a1w != null && a1w.unit === "pomiar");
  assert("A2 once wroclaw", a2w != null && a2w.unit === "pomiar");
  assert("A1 once dolnyslask", a1d != null);
  assert("A2 once dolnyslask", a2d != null);

  const a1Count = r1.store.catalogs.wroclaw.works.filter((w) => w.id === SEPA_KNNR_1301_01_WORK_ID).length;
  const a2Count = r1.store.catalogs.wroclaw.works.filter((w) => w.id === SEPA_KNNR_1301_02_WORK_ID).length;
  assert("A1 exactly once", a1Count === 1);
  assert("A2 exactly once", a2Count === 1);

  // 1305 unchanged
  const p01 = getWorkByIdFromStore(r1.store, C2_KNR_WC_1305_01_WORK_ID, "wroclaw");
  const p02 = getWorkByIdFromStore(r1.store, C2_KNR_WC_1305_02_WORK_ID, "wroclaw");
  assert("1305-01 unchanged unit prob", p01?.unit === "prob");
  assert("1305-02 unchanged unit prob", p02?.unit === "prob");
  assert("1305-01 name intact", p01?.namePl?.includes("samoczynnego wyłączania"));

  // idempotent
  const r2 = applySepaKnr1301PomiarCatalogSeed(r1.store, NOW);
  assert("idempotent no change", r2.changed === false);
  assert("idempotent created empty", r2.createdWorkIds.length === 0);
  assert(
    "idempotent counts stable",
    r2.afterCount.wroclaw === r1.afterCount.wroclaw &&
      r2.afterCount.dolnyslask === r1.afterCount.dolnyslask,
  );
}

// --- no LP269 assignment in specs ---
{
  for (const spec of SEPA_KNNR_1301_WORKS) {
    assert(
      `LP269 not in ${spec.id} targets`,
      !spec.targetLps.includes("269"),
    );
  }
  assert("getSpec A1", getSepaKnr1301WorkSpec(SEPA_KNNR_1301_01_WORK_ID)?.sourceCode === "KNNR|5|1301-01");
}

console.log("");
console.log(`RESULT ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
