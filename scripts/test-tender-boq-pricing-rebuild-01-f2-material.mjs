/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 2 — materialKey → Price Memory → SELL harness.
 *
 * npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f2-material.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computePositionCost,
  computePositionCostWithMaterials,
  computePositionCostWithOurRateAndMaterials,
  resolveLaborInputFromOurWorkRate,
  resolveMaterialInputFromPriceMemory,
} from "../src/lib/tender-position-cost/index.ts";
import { computeSellPricePln as computeSellPricePlnPm } from "../src/lib/price-intelligence/our-price-catalog.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name, extra ?? "");
  }
}
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
}

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

const NOW = Date.parse("2026-08-12T06:00:00.000Z");
const T_FRESH = "2026-08-11T12:00:00.000Z";
const T_STALE = "2026-04-01T12:00:00.000Z";

const WORK_LABOR = "cw.paint.walls";
const UNIT_LABOR = "m2";
const MAT_KEY = "mat.wc_compact";
const MAT_WORK = "cw.product.wc_compact";
const MAT_KEY_2 = "mat.inv.tile_grout";
const MAT_WORK_2 = "cw.inv.tile_grout";

function quoteCell(price, updatedAt = T_FRESH, origin = "wgdom") {
  return {
    [origin]: {
      wroclaw: {
        price,
        regionCode: "wroclaw",
        coverage: "indicative",
        updatedAt,
        confidence: 0.85,
        origin,
      },
    },
  };
}

function makeMaterialWork(overrides = {}) {
  return {
    id: MAT_WORK,
    tradeId: "HYDRAULIKA",
    namePl: "WC kompakt",
    unit: "szt",
    companyPricePln: 999,
    marketQuotes: quoteCell(100, T_FRESH),
    marketQuoteHistory: [
      {
        workId: MAT_WORK,
        price: 100,
        origin: "wgdom",
        regionCode: "wroclaw",
        updatedAt: T_FRESH,
        confidence: 0.85,
        coverage: "indicative",
      },
    ],
    commercialPricing: {
      marginPct: 20,
      updatedAt: T_FRESH,
      source: "owner",
    },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["wc", MAT_KEY],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    ...overrides,
  };
}

function makeMaterialWork2(overrides = {}) {
  return {
    id: MAT_WORK_2,
    tradeId: "HYDRAULIKA",
    namePl: "Fuga",
    unit: "kg",
    companyPricePln: 50,
    marketQuotes: quoteCell(18, T_FRESH, "leroy"),
    marketQuoteHistory: [],
    commercialPricing: {
      marginPct: 10,
      updatedAt: T_FRESH,
      source: "owner",
    },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [MAT_KEY_2],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    ...overrides,
  };
}

function ourRate(pln, observedAt) {
  return {
    workId: WORK_LABOR,
    unit: UNIT_LABOR,
    ourRatePln: pln,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt,
    updatedAt: observedAt,
    history: [
      {
        workId: WORK_LABOR,
        unit: UNIT_LABOR,
        ratePln: pln,
        kind: "OUR",
        sourceType: "OWNER",
        regionScope: "WROCLAW",
        observedAt,
      },
    ],
  };
}

function makeLaborWork(overrides = {}) {
  return {
    id: WORK_LABOR,
    tradeId: "MALOWANIE",
    namePl: "Malowanie ścian",
    unit: UNIT_LABOR,
    companyPricePln: 35,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: {
      marginPct: 15,
      updatedAt: T_FRESH,
      source: "owner",
    },
    ourWorkRate: ourRate(22.9, T_FRESH),
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["malowanie"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ...overrides,
  };
}

function makeStore(works) {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T_FRESH,
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: T_FRESH },
    },
  });
}

// ——— 1–4 CURRENT → base → sell → qty×sell ———
{
  const store = makeStore([makeMaterialWork()]);
  const r = resolveMaterialInputFromPriceMemory(
    store,
    { materialKey: MAT_KEY, quantity: 1.2, quantityUnit: "szt" },
    NOW,
  );
  eq("T1 CURRENT", r.status, "CURRENT");
  eq("T1 materialKey", r.materialKey, MAT_KEY);
  eq("T2 base 100", r.basePricePln, 100);
  eq("T3 sell 120", r.sellPricePln, 120);
  eq("T3 margin 20", r.marginPct, 20);
  eq("T3b computeSellPricePln REUSE", r.sellPricePln, computeSellPricePlnPm(100, 20));

  const pos = computePositionCostWithMaterials({
    store,
    nowMs: NOW,
    quantity: 1,
    unit: "szt",
    labor: null,
    materials: [{ materialKey: MAT_KEY, quantity: 1.2, quantityUnit: "szt" }],
  });
  eq("T4 materialCost", pos.position.materialCostPln, 144);
  eq("T4 total", pos.position.totalPositionCostPln, 144);
  ok("T4 complete", pos.position.positionComplete);
}

// ——— 5 labor + one material ———
{
  const store = makeStore([makeLaborWork(), makeMaterialWork()]);
  const r = computePositionCostWithOurRateAndMaterials({
    store,
    workId: WORK_LABOR,
    unit: UNIT_LABOR,
    quantity: 10,
    nowMs: NOW,
    materials: [{ materialKey: MAT_KEY, quantity: 2, quantityUnit: "szt" }],
  });
  eq("T5 labor", r.position.laborCostPln, 229);
  eq("T5 material", r.position.materialCostPln, 240);
  eq("T5 total", r.position.totalPositionCostPln, 469);
}

// ——— 6 labor + multiple materials ———
{
  const store = makeStore([makeLaborWork(), makeMaterialWork(), makeMaterialWork2()]);
  const r = computePositionCostWithOurRateAndMaterials({
    store,
    workId: WORK_LABOR,
    unit: UNIT_LABOR,
    quantity: 10,
    nowMs: NOW,
    materials: [
      { materialKey: MAT_KEY, quantity: 1.2, quantityUnit: "szt" },
      { materialKey: MAT_KEY_2, quantity: 0.4, quantityUnit: "kg" },
    ],
  });
  // 1.2*120=144 · 0.4*19.8=7.92 · labor 229 · total 380.92
  eq("T6 material", r.position.materialCostPln, 151.92);
  eq("T6 labor", r.position.laborCostPln, 229);
  eq("T6 total", r.position.totalPositionCostPln, 380.92);
  eq("T6 resolved count", r.materialsResolved.length, 2);
}

// ——— 7 zero materials ———
{
  const store = makeStore([makeLaborWork()]);
  const r = computePositionCostWithOurRateAndMaterials({
    store,
    workId: WORK_LABOR,
    unit: UNIT_LABOR,
    quantity: 10,
    nowMs: NOW,
    materials: [],
  });
  eq("T7 material 0", r.position.materialCostPln, 0);
  eq("T7 labor", r.position.laborCostPln, 229);
  ok("T7 complete", r.position.positionComplete);
}

// ——— 8 MISSING ———
{
  const store = makeStore([
    makeMaterialWork({ marketQuotes: {}, marketQuoteHistory: [] }),
  ]);
  const r = resolveMaterialInputFromPriceMemory(
    store,
    { materialKey: MAT_KEY, quantity: 1, quantityUnit: "szt" },
    NOW,
  );
  eq("T8 MISSING", r.status, "MISSING");
  ok("T8 label", /BRAK CENY/i.test(r.statusLabelPl));
  eq("T8 sell null", r.sellPricePln, null);
  const pos = computePositionCostWithMaterials({
    store,
    nowMs: NOW,
    quantity: 1,
    unit: "szt",
    labor: null,
    materials: [{ materialKey: MAT_KEY, quantity: 1 }],
  });
  eq("T8b laborCost 0", pos.position.laborCostPln, 0);
  eq("T8b material null", pos.position.materialCostPln, null);
  ok("T8b not complete", !pos.position.positionComplete);
  ok("T8b not 999*1 company", pos.position.totalPositionCostPln !== 999);
}

// ——— 9 STALE ———
{
  const before = fetchCalls;
  const store = makeStore([
    makeMaterialWork({ marketQuotes: quoteCell(100, T_STALE) }),
  ]);
  const r = resolveMaterialInputFromPriceMemory(
    store,
    { materialKey: MAT_KEY, quantity: 1, quantityUnit: "szt" },
    NOW,
  );
  eq("T9 STALE", r.status, "STALE");
  eq("T9 base kept", r.basePricePln, 100);
  const pos = computePositionCostWithMaterials({
    store,
    nowMs: NOW,
    quantity: 1,
    unit: "szt",
    labor: null,
    materials: [{ materialKey: MAT_KEY, quantity: 1 }],
  });
  ok("T9 not complete", !pos.position.positionComplete);
  eq("T9 material null", pos.position.materialCostPln, null);
  eq("T9 no HTTP", fetchCalls, before);
}

// ——— 10 brak materialKey ———
{
  const store = makeStore([makeMaterialWork()]);
  const r = resolveMaterialInputFromPriceMemory(
    store,
    { materialKey: "  ", quantity: 1 },
    NOW,
  );
  eq("T10 NO_KEY", r.status, "NO_KEY");
  ok("T10 label", /MATERIAL KEY/i.test(r.statusLabelPl));
  const r2 = resolveMaterialInputFromPriceMemory(
    store,
    { materialKey: "mat.unknown_not_in_map_xyz", quantity: 1 },
    NOW,
  );
  eq("T10b unknown NO_KEY", r2.status, "NO_KEY");
}

// ——— 11–13 companyPrice ZERO as sell source ———
{
  const store = makeStore([
    makeMaterialWork({
      companyPricePln: 999,
      marketQuotes: {},
      marketQuoteHistory: [],
    }),
  ]);
  const r = resolveMaterialInputFromPriceMemory(
    store,
    { materialKey: MAT_KEY, quantity: 1 },
    NOW,
  );
  eq("T11 not 999", r.sellPricePln, null);
  eq("T11 MISSING", r.status, "MISSING");
  ok("T11b company still on work", store.catalogs.wroclaw.works[0].companyPricePln === 999);

  const adapter = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/material-sell-adapter.ts"),
    "utf8",
  );
  ok(
    "T12 no companyPricePln read",
    !/\.companyPricePln\b|companyPricePln\s*[:=?]|\?\?\s*companyPricePln/.test(adapter),
  );
  ok(
    "T13 no Biblioteka / legacy sell",
    !/splitCompanyPrice|companyPriceAsSell|seedFromCompanyPrice/.test(adapter),
  );
}

// ——— 14–16 REUSE ———
{
  const adapter = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/material-sell-adapter.ts"),
    "utf8",
  );
  ok("T14 computeSellPricePln import", /computeSellPricePln/.test(adapter));
  ok("T15 evaluateMaterialCache", /evaluateMaterialCache/.test(adapter));
  ok("T15b lookup via cache", /evaluateMaterialCache/.test(adapter));
  ok("T16 resolveMarginPct", /resolveMarginPct/.test(adapter));
  ok(
    "T16b resolveDemandProductIdentityExact",
    /resolveDemandProductIdentityExact/.test(adapter),
  );
  eq("T14b sell helper same", computeSellPricePlnPm(50, 10), 55);
}

// ——— 17–20 engine pure ———
{
  const engine = readFileSync(join(ROOT, "src/lib/tender-position-cost/engine.ts"), "utf8");
  ok("T17 no lookupPriceMemory in engine", !/lookupPriceMemory/.test(engine));
  ok("T17b no evaluateMaterialCache", !/evaluateMaterialCache/.test(engine));
  ok("T18 no fetch in engine", !/\bfetch\b/.test(engine));
  ok("T19 no localStorage", !/localStorage/.test(engine));
  ok(
    "T20 no research",
    !/requestWorkRateResearch|forceResearch|executeMaterialResearch/.test(engine),
  );
}

// ——— 21–22 F1 labor + material together (already T5) + F1 alone ———
{
  const store = makeStore([makeLaborWork()]);
  const labor = resolveLaborInputFromOurWorkRate(store, WORK_LABOR, UNIT_LABOR, NOW);
  eq("T21 F1 CURRENT", labor.status, "CURRENT");
  eq("T21 rate", labor.ourRatePln, 22.9);
  const pure = computePositionCost({
    quantity: 10,
    unit: UNIT_LABOR,
    labor: labor.labor,
    materials: [],
  });
  eq("T21 F0 path", pure.totalPositionCostPln, 229);

  const store2 = makeStore([makeLaborWork(), makeMaterialWork()]);
  const combo = computePositionCostWithOurRateAndMaterials({
    store: store2,
    workId: WORK_LABOR,
    unit: UNIT_LABOR,
    quantity: 5,
    nowMs: NOW,
    materials: [{ materialKey: MAT_KEY, quantity: 1 }],
  });
  eq("T22 labor", combo.position.laborCostPln, 114.5);
  eq("T22 mat", combo.position.materialCostPln, 120);
  eq("T22 total", combo.position.totalPositionCostPln, 234.5);
}

// ——— 23 deterministic ———
{
  const store = makeStore([makeMaterialWork()]);
  const a = computePositionCostWithMaterials({
    store,
    nowMs: NOW,
    quantity: 1,
    unit: "szt",
    labor: null,
    materials: [{ materialKey: MAT_KEY, quantity: 3 }],
  });
  const b = computePositionCostWithMaterials({
    store,
    nowMs: NOW,
    quantity: 1,
    unit: "szt",
    labor: null,
    materials: [{ materialKey: MAT_KEY, quantity: 3 }],
  });
  eq("T23 same", a.position.totalPositionCostPln, b.position.totalPositionCostPln);
  eq("T23 value", a.position.totalPositionCostPln, 360);
}

// ——— 24 rounding ———
{
  // 12.34 * 1.15 = 14.191 → roundMarketPricePln → 14.19; qty 3 → 42.57
  const store = makeStore([
    makeMaterialWork({
      marketQuotes: quoteCell(12.34, T_FRESH),
      commercialPricing: { marginPct: 15, updatedAt: T_FRESH, source: "owner" },
    }),
  ]);
  const sell = computeSellPricePlnPm(12.34, 15);
  eq("T24 sell round", sell, 14.19);
  const pos = computePositionCostWithMaterials({
    store,
    nowMs: NOW,
    quantity: 1,
    unit: "szt",
    labor: null,
    materials: [{ materialKey: MAT_KEY, quantity: 3 }],
  });
  eq("T24 materialCost", pos.position.materialCostPln, 42.57);
}

// ——— adapter: no HTTP / research ———
{
  const before = fetchCalls;
  const store = makeStore([makeMaterialWork()]);
  resolveMaterialInputFromPriceMemory(
    store,
    { materialKey: MAT_KEY, quantity: 1 },
    NOW,
  );
  eq("TX HTTP 0", fetchCalls, before);
  const adapter = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/material-sell-adapter.ts"),
    "utf8",
  );
  ok(
    "TX no research APIs",
    !/forceResearch|executeMaterialResearch|requestWorkRateResearch|\bfetch\(/.test(adapter),
  );
}

console.log("");
console.log(`WYNIK F2 MATERIAL: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
