/**
 * IK-OWNER-A01-S3 — OUR RATE ops + golden path labor (local, no KV).
 *
 * npx vite-node scripts/test-catalog-ik-owner-a01-our-rate-ops.mjs
 */
import { classifyEstimatorPricingPlane } from "../src/lib/intelligent-estimator/classification-gate.ts";
import { getOwnerClassificationPlane } from "../src/lib/intelligent-estimator/owner-classification-map.ts";
import { applyA01Lp4CatalogSeed } from "../src/lib/work-catalog/ik-owner-create-a01-lp4-ops.ts";
import { applyA01Lp5CatalogSeed } from "../src/lib/work-catalog/ik-owner-create-a01-lp5-ops.ts";
import { applyA01Lp5QuotesSeed } from "../src/lib/work-catalog/ik-owner-create-a01-lp5-quotes-ops.ts";
import {
  IK_OWNER_A01_OUR_RATE_OPS_REGIONS,
  IK_OWNER_A01_OUR_RATE_TARGETS,
  applyA01OurRateSeed,
  assertA01OurRateTargetsPresentOrStop,
  probeA01OurRatePerTarget,
  stableMarketQuotesJson,
  workHasExpectedA01OurRate,
} from "../src/lib/work-catalog/ik-owner-create-a01-our-rate-ops.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { lookupWorkRate } from "../src/lib/work-catalog/work-rate-lookup.ts";
import { resolveLaborInputFromOurWorkRate } from "../src/lib/tender-position-cost/our-rate-labor-adapter.ts";

const NOW = "2026-08-24T20:00:00.000Z";
let passed = 0;
let failed = 0;

function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

function emptyStore() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    updatedAt: NOW,
    catalogs: {
      wroclaw: { works: [], updatedAt: NOW },
      dolnyslask: { works: [], updatedAt: NOW },
    },
  });
}

function freshStoreLp9Lp10Quoted() {
  let store = applyA01Lp5CatalogSeed(emptyStore(), NOW).store;
  store = applyA01Lp4CatalogSeed(store, NOW).store;
  store = applyA01Lp5QuotesSeed(store, NOW).store;
  return store;
}

// T1 — targets exist
{
  const store = freshStoreLp9Lp10Quoted();
  let threw = false;
  try {
    assertA01OurRateTargetsPresentOrStop(store);
  } catch {
    threw = true;
  }
  ok("T1 targets present both regions", !threw);
}

// T2 — apply OUR RATE seed
let seededStore = freshStoreLp9Lp10Quoted();
const quotesBefore = Object.fromEntries(
  IK_OWNER_A01_OUR_RATE_TARGETS.map((t) => [
    t.workId,
    stableMarketQuotesJson(getWorkByIdFromStore(seededStore, t.workId, "wroclaw")),
  ]),
);
const merge1 = applyA01OurRateSeed(seededStore, NOW);
ok("T2 apply changed", merge1.changed === true);
seededStore = merge1.store;
for (const target of IK_OWNER_A01_OUR_RATE_TARGETS) {
  const afterQuotes = stableMarketQuotesJson(
    getWorkByIdFromStore(seededStore, target.workId, "wroclaw"),
  );
  ok(`T2 quotes frozen ${target.workId}`, quotesBefore[target.workId] === afterQuotes);
  for (const region of IK_OWNER_A01_OUR_RATE_OPS_REGIONS) {
    const work = getWorkByIdFromStore(seededStore, target.workId, region);
    ok(
      `T2 our rate ${target.workId} ${region}`,
      workHasExpectedA01OurRate(work, target.ourRatePln),
      work?.ourWorkRate,
    );
  }
}

// T3 — idempotent re-apply
{
  const merge2 = applyA01OurRateSeed(seededStore, NOW);
  ok("T3 idempotent no change", merge2.changed === false);
}

// T4 — lookupWorkRate PRESENT
for (const target of IK_OWNER_A01_OUR_RATE_TARGETS) {
  const lookup = lookupWorkRate(seededStore, target.workId, "m2", Date.parse(NOW));
  ok(
    `T4 lookupWorkRate ${target.workId}`,
    lookup.status !== "MISSING" && lookup.ourRatePln === target.ourRatePln,
    lookup,
  );
}

// T5 — classification LP9/LP10 LABOR
for (const target of IK_OWNER_A01_OUR_RATE_TARGETS) {
  ok(
    `T5 owner map LABOR ${target.workId}`,
    getOwnerClassificationPlane(target.workId) === "LABOR",
  );
  const gate = classifyEstimatorPricingPlane({ workId: target.workId });
  ok(
    `T5 gate LABOR ${target.workId}`,
    gate.plane === "LABOR" && gate.hold === false,
    gate,
  );
}

// T6 — F5 labor adapter BASE without commercialPricing margin
for (const target of IK_OWNER_A01_OUR_RATE_TARGETS) {
  const resolved = resolveLaborInputFromOurWorkRate(
    seededStore,
    target.workId,
    "m2",
    Date.parse(NOW),
  );
  ok(
    `T6 labor BASE ${target.workId}`,
    resolved?.ourRatePln === target.ourRatePln,
    resolved,
  );
  ok(
    `T6 labor SELL blocked without margin ${target.workId}`,
    resolved?.sellPricePln == null,
    resolved,
  );
}

// T7 — normalize preserves OUR RATE (regionScope POLSKA)
{
  const merged = applyA01OurRateSeed(freshStoreLp9Lp10Quoted(), NOW);
  const normalized = normalizeWorkCatalogStore(merged.store);
  for (const target of IK_OWNER_A01_OUR_RATE_TARGETS) {
    const work = getWorkByIdFromStore(normalized, target.workId, "wroclaw");
    ok(
      `T7 normalize keeps our rate ${target.workId}`,
      workHasExpectedA01OurRate(work, target.ourRatePln),
      work?.ourWorkRate,
    );
  }
}

console.log(`\n=== WYNIK: ${passed} PASS · ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
