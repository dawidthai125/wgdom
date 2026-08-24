/**
 * IK-OWNER-A01 F5 MARGIN OPS — local in-memory tests (ZERO KV · ZERO batch-set).
 *
 * npx vite-node scripts/test-catalog-ik-owner-a01-commercial-margin-ops.mjs
 */
import { applyA01Lp4CatalogSeed } from "../src/lib/work-catalog/ik-owner-create-a01-lp4-ops.ts";
import { applyA01Lp5CatalogSeed } from "../src/lib/work-catalog/ik-owner-create-a01-lp5-ops.ts";
import { applyA01Lp5QuotesSeed } from "../src/lib/work-catalog/ik-owner-create-a01-lp5-quotes-ops.ts";
import {
  IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS,
  IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS,
  applyA01CommercialMarginSeed,
  marginNeedsPatch,
  parseA01CommercialMarginCliArgs,
  probeA01CommercialMarginPerTarget,
  validateCommercialMarginPct,
} from "../src/lib/work-catalog/ik-owner-create-a01-commercial-margin-ops.ts";
import {
  IK_OWNER_A01_OUR_RATE_TARGETS,
  applyA01OurRateSeed,
  probeA01OurRatePerTarget,
  stableMarketQuotesJson,
  workHasExpectedA01OurRate,
} from "../src/lib/work-catalog/ik-owner-create-a01-our-rate-ops.ts";
import { getWorkByIdFromStore } from "../src/lib/work-catalog/catalog-work-utils.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/work-catalog-store.ts";
import { computeSellPricePln } from "../src/lib/price-intelligence/our-price-catalog.ts";
import { resolveLaborInputFromOurWorkRate } from "../src/lib/tender-position-cost/our-rate-labor-adapter.ts";

const NOW = "2026-08-24T20:00:00.000Z";
/** Fixture-only margin — NOT a production value. */
const TEST_MARGIN = 15;

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

function emptyStore(activeRegion = "wroclaw") {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion,
    updatedAt: NOW,
    catalogs: {
      wroclaw: { works: [], updatedAt: NOW },
      dolnyslask: { works: [], updatedAt: NOW },
    },
  });
}

function freshStoreLp9Lp10QuotedWithOurRate(activeRegion = "wroclaw") {
  let store = applyA01Lp5CatalogSeed(emptyStore(activeRegion), NOW).store;
  store = applyA01Lp4CatalogSeed(store, NOW).store;
  store = applyA01Lp5QuotesSeed(store, NOW).store;
  store = applyA01OurRateSeed(store, NOW).store;
  return store;
}

function workSansCommercialPricing(work) {
  if (!work) return work;
  const { commercialPricing: _cp, ...rest } = work;
  return rest;
}

// T1 — OUR RATE preconditions
{
  const store = freshStoreLp9Lp10QuotedWithOurRate();
  const rates = probeA01OurRatePerTarget(store);
  for (const target of IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS) {
    for (const region of IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS) {
      ok(
        `T1 OUR RATE precondition ${target.workId} ${region}`,
        rates[target.workId]?.[region] === "PRESENT_OK",
        rates[target.workId],
      );
    }
  }
}

// T2 — apply margin → changed=true
let marginStore = freshStoreLp9Lp10QuotedWithOurRate();
const margins = { lp9: TEST_MARGIN, lp10: TEST_MARGIN };
const merge1 = applyA01CommercialMarginSeed(marginStore, margins, NOW);
ok("T2 apply changed", merge1.changed === true);
marginStore = merge1.store;

// T3 — reapply same margin → changed=false
{
  const merge2 = applyA01CommercialMarginSeed(marginStore, margins, NOW);
  ok("T3 idempotent no change", merge2.changed === false);
}

// T4 — dual-region commercialPricing present
for (const target of IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS) {
  const targetMargin = margins[target.marginKey];
  for (const region of IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS) {
    const work = getWorkByIdFromStore(marginStore, target.workId, region);
    ok(
      `T4 dual-region margin ${target.workId} ${region}`,
      work?.commercialPricing?.marginPct === targetMargin &&
        work?.commercialPricing?.source === "owner",
      work?.commercialPricing,
    );
  }
}

// T5 — MarketQuotes frozen
{
  const baseline = freshStoreLp9Lp10QuotedWithOurRate();
  const quotesBefore = Object.fromEntries(
    IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS.map((t) => [
      t.workId,
      stableMarketQuotesJson(getWorkByIdFromStore(baseline, t.workId, "wroclaw")),
    ]),
  );
  const merged = applyA01CommercialMarginSeed(baseline, margins, NOW);
  for (const target of IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS) {
    const afterQuotes = stableMarketQuotesJson(
      getWorkByIdFromStore(merged.store, target.workId, "wroclaw"),
    );
    ok(`T5 quotes frozen ${target.workId}`, quotesBefore[target.workId] === afterQuotes);
  }
}

// T6 — OUR RATE frozen
for (const target of IK_OWNER_A01_OUR_RATE_TARGETS) {
  for (const region of IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS) {
    const work = getWorkByIdFromStore(marginStore, target.workId, region);
    ok(
      `T6 OUR RATE frozen ${target.workId} ${region}`,
      workHasExpectedA01OurRate(work, target.ourRatePln),
      work?.ourWorkRate,
    );
  }
}

// T7 — F5 SELL
for (const target of IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS) {
  const targetMargin = margins[target.marginKey];
  const expectedSell = computeSellPricePln(target.expectedBasePln, targetMargin);
  const resolved = resolveLaborInputFromOurWorkRate(
    marginStore,
    target.workId,
    "m2",
    Date.parse(NOW),
  );
  ok(
    `T7 F5 BASE ${target.workId}`,
    resolved.ourRatePln === target.expectedBasePln,
    resolved,
  );
  ok(
    `T7 F5 SELL ${target.workId}`,
    resolved.sellPricePln === expectedSell,
    { resolved, expectedSell },
  );
}

// T8 — missing margin rejected
{
  let code = "";
  try {
    parseA01CommercialMarginCliArgs(["node", "script.mjs"]);
  } catch (err) {
    code = err.message;
  }
  ok("T8 missing margin rejected", code === "OWNER_MARGIN_VALUE_REQUIRED", code);
}

// T9 — conflicting flags rejected
{
  let code = "";
  try {
    parseA01CommercialMarginCliArgs([
      "node",
      "script.mjs",
      "--margin-pct",
      "10",
      "--lp9-margin-pct",
      "10",
    ]);
  } catch (err) {
    code = err.message;
  }
  ok("T9 conflicting flags rejected", code === "CONFLICTING_MARGIN_FLAGS", code);
}

// T10 — negative / NaN / Infinity rejected
for (const [label, value] of [
  ["NaN", Number.NaN],
  ["Infinity", Number.POSITIVE_INFINITY],
  ["-Infinity", Number.NEGATIVE_INFINITY],
  ["negative", -1],
]) {
  let code = "";
  try {
    validateCommercialMarginPct(value, label);
  } catch (err) {
    code = err.message;
  }
  ok(`T10 invalid ${label}`, code.startsWith("INVALID_MARGIN_PCT"), code);
}

// T11 — activeRegion restored after dual-region apply
{
  const store = freshStoreLp9Lp10QuotedWithOurRate("dolnyslask");
  ok("T11 pre activeRegion", store.activeRegion === "dolnyslask");
  const merged = applyA01CommercialMarginSeed(store, margins, NOW);
  ok("T11 post activeRegion restored", merged.store.activeRegion === "dolnyslask");
}

// T12 — other CatalogWork fields unchanged (excluding commercialPricing)
{
  const store = freshStoreLp9Lp10QuotedWithOurRate();
  const snapshotsBefore = Object.fromEntries(
    IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS.flatMap((target) =>
      IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS.map((region) => {
        const work = getWorkByIdFromStore(store, target.workId, region);
        return [`${target.workId}:${region}`, workSansCommercialPricing(work)];
      }),
    ),
  );
  const merged = applyA01CommercialMarginSeed(store, margins, NOW);
  for (const target of IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS) {
    for (const region of IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS) {
      const key = `${target.workId}:${region}`;
      const after = workSansCommercialPricing(
        getWorkByIdFromStore(merged.store, target.workId, region),
      );
      ok(
        `T12 unchanged fields ${key}`,
        JSON.stringify(snapshotsBefore[key]) === JSON.stringify(after),
        { before: snapshotsBefore[key], after },
      );
    }
  }
}

// marginNeedsPatch contract
{
  const work = {
    commercialPricing: { marginPct: TEST_MARGIN, updatedAt: NOW, source: "owner" },
  };
  ok(
    "marginNeedsPatch idempotent same margin",
    marginNeedsPatch(work, TEST_MARGIN, "owner") === false,
  );
  ok(
    "marginNeedsPatch absent",
    marginNeedsPatch({ id: "x" }, TEST_MARGIN, "owner") === true,
  );
  ok(
    "marginNeedsPatch wrong source",
    marginNeedsPatch(
      { commercialPricing: { marginPct: TEST_MARGIN, updatedAt: NOW, source: "default" } },
      TEST_MARGIN,
      "owner",
    ) === true,
  );
}

// probe dry-run shape
{
  const probe = probeA01CommercialMarginPerTarget(marginStore, margins);
  ok(
    "probe per target regions",
    IK_OWNER_A01_COMMERCIAL_MARGIN_TARGETS.every(
      (t) => probe[t.workId]?.length === IK_OWNER_A01_COMMERCIAL_MARGIN_OPS_REGIONS.length,
    ),
    probe,
  );
}

console.log(`\n=== WYNIK: ${passed} PASS · ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
