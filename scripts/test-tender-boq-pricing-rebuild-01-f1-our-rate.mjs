/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 1 — OUR RATE → Position Cost harness.
 *
 * npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f1-our-rate.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computePositionCost,
  computePositionCostWithOurRate,
  resolveLaborInputFromOurWorkRate,
} from "../src/lib/tender-position-cost/index.ts";
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
const WORK_ID = "cw.paint.walls";
const UNIT = "m2";

function makeWork(overrides = {}) {
  return {
    id: WORK_ID,
    tradeId: "MALOWANIE",
    namePl: "Malowanie ścian",
    unit: UNIT,
    companyPricePln: 35,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: {
      marginPct: 15,
      updatedAt: T_FRESH,
      source: "owner",
    },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["malowanie", "sciany"],
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

function ourRate(pln, observedAt, extra = {}) {
  return {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: pln,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt,
    updatedAt: observedAt,
    history: [
      {
        workId: WORK_ID,
        unit: UNIT,
        ratePln: pln,
        kind: "OUR",
        sourceType: "OWNER",
        regionScope: "WROCLAW",
        observedAt,
      },
    ],
    ...extra,
  };
}

// ——— 1–2 CURRENT → rate + position cost ———
{
  const store = makeStore([makeWork({ ourWorkRate: ourRate(22.9, T_FRESH) })]);
  const resolved = resolveLaborInputFromOurWorkRate(store, WORK_ID, UNIT, NOW);
  eq("T1 CURRENT status", resolved.status, "CURRENT");
  eq("T1 OUR RATE 22.9", resolved.ourRatePln, 22.9);
  eq("T1 source OWNER", resolved.sourceType, "OWNER");

  const r = computePositionCostWithOurRate({
    store,
    workId: WORK_ID,
    unit: UNIT,
    quantity: 100,
    nowMs: NOW,
    materials: [],
  });
  eq("T2 laborCost", r.position.laborCostPln, 2290);
  eq("T2 total", r.position.totalPositionCostPln, 2290);
  ok("T2 complete", r.position.positionComplete);
  eq("T2 fetch still 0", fetchCalls, 0);
}

// ——— 3–5 MISSING / C-EMPTY / no companyPrice fallback ———
{
  const store = makeStore([makeWork({ companyPricePln: 35 })]); // no ourWorkRate
  const r = computePositionCostWithOurRate({
    store,
    workId: WORK_ID,
    unit: UNIT,
    quantity: 100,
    nowMs: NOW,
  });
  eq("T3 MISSING", r.ourRate.status, "MISSING");
  ok("T3 BRAK label", /BRAK/i.test(r.ourRate.statusLabelPl));
  eq("T3 labor null", r.position.laborCostPln, null);
  ok("T3 not complete", !r.position.positionComplete);
  ok(
    "T4 no fallback to 35*100",
    r.position.totalPositionCostPln !== 3500 && r.position.laborCostPln !== 35,
  );
  eq("T5 companyPrice still on work", store.catalogs.wroclaw.works[0].companyPricePln, 35);
  ok("T5b not used as rate", r.ourRate.ourRatePln !== 35);
}

// ——— 6–7 STALE ———
{
  const before = fetchCalls;
  const store = makeStore([makeWork({ ourWorkRate: ourRate(40, T_STALE) })]);
  const r = computePositionCostWithOurRate({
    store,
    workId: WORK_ID,
    unit: UNIT,
    quantity: 10,
    nowMs: NOW,
  });
  eq("T6 STALE", r.ourRate.status, "STALE");
  eq("T6 rate preserved on resolve", r.ourRate.ourRatePln, 40);
  ok("T6 not complete", !r.position.positionComplete);
  eq("T6 laborCost null", r.position.laborCostPln, null);
  eq("T7 no HTTP", fetchCalls, before);
}

// ——— 8 identity workId+unit ———
{
  const store = makeStore([makeWork({ ourWorkRate: ourRate(22.9, T_FRESH) })]);
  const r = resolveLaborInputFromOurWorkRate(store, WORK_ID, UNIT, NOW);
  eq("T8 identityKey", r.identityKey, `${WORK_ID}|${UNIT}`);
}

// ——— 9 różne unit ———
{
  const store = makeStore([makeWork({ ourWorkRate: ourRate(22.9, T_FRESH) })]);
  const r = resolveLaborInputFromOurWorkRate(store, WORK_ID, "szt", NOW);
  eq("T9 wrong unit MISSING", r.status, "MISSING");
  eq("T9 no rate", r.ourRatePln, null);
}

// ——— 10 różne workId ———
{
  const store = makeStore([makeWork({ ourWorkRate: ourRate(22.9, T_FRESH) })]);
  const r = resolveLaborInputFromOurWorkRate(store, "cw.other", UNIT, NOW);
  eq("T10 other work MISSING", r.status, "MISSING");
}

// ——— 11 history nie zmienia lookup ———
{
  const store = makeStore([
    makeWork({
      ourWorkRate: ourRate(55, T_FRESH, {
        history: [
          {
            workId: WORK_ID,
            unit: UNIT,
            ratePln: 40,
            kind: "OUR",
            sourceType: "OWNER",
            regionScope: "WROCLAW",
            observedAt: T_STALE,
          },
          {
            workId: WORK_ID,
            unit: UNIT,
            ratePln: 55,
            kind: "OUR",
            sourceType: "OWNER",
            regionScope: "WROCLAW",
            observedAt: T_FRESH,
          },
        ],
      }),
    }),
  ]);
  const r = resolveLaborInputFromOurWorkRate(store, WORK_ID, UNIT, NOW);
  eq("T11 current rate not history[0]", r.ourRatePln, 55);
}

// ——— 12 source preserved ———
{
  const store = makeStore([
    makeWork({
      ourWorkRate: ourRate(22.9, T_FRESH, { sourceType: "ACCEPT" }),
    }),
  ]);
  const r = resolveLaborInputFromOurWorkRate(store, WORK_ID, UNIT, NOW);
  eq("T12 source ACCEPT", r.sourceType, "ACCEPT");
}

// ——— 13–14 static: no companyPrice / no PM in adapter ———
{
  const adapter = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/our-rate-labor-adapter.ts"),
    "utf8",
  );
  ok(
    "T13 no companyPricePln read",
    !/\.companyPricePln\b|companyPricePln\s*[:=?]|\?\?\s*companyPricePln/.test(adapter),
  );
  ok(
    "T14 no Price Memory in adapter",
    !/lookupPriceMemory|evaluateMaterialCache|marketQuotes|marketQuoteHistory/.test(adapter),
  );
  ok("T13b no splitCompanyPrice", !/splitCompanyPrice|seedFromCompanyPrice|fallbackCompanyPrice/.test(adapter));
}

// ——— 15–16 engine remains pure ———
{
  const engine = readFileSync(join(ROOT, "src/lib/tender-position-cost/engine.ts"), "utf8");
  ok("T15 engine no lookupWorkRate", !/lookupWorkRate/.test(engine));
  ok("T16 engine no localStorage", !/localStorage/.test(engine));
}

// ——— 17–18 HTTP / research ———
{
  const before = fetchCalls;
  const store = makeStore([makeWork({ ourWorkRate: ourRate(10, T_FRESH) })]);
  computePositionCostWithOurRate({
    store,
    workId: WORK_ID,
    unit: UNIT,
    quantity: 1,
    nowMs: NOW,
  });
  eq("T17 HTTP 0", fetchCalls, before);
  const adapter = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/our-rate-labor-adapter.ts"),
    "utf8",
  );
  ok(
    "T18 no research APIs",
    !/requestWorkRateResearch|work-rate-research|kb\.pl|sccot|extradom|cennikremontow/.test(
      adapter,
    ),
  );
}

// ——— 19 deterministic ———
{
  const store = makeStore([makeWork({ ourWorkRate: ourRate(12.34, T_FRESH) })]);
  const a = computePositionCostWithOurRate({
    store,
    workId: WORK_ID,
    unit: UNIT,
    quantity: 3,
    nowMs: NOW,
  });
  const b = computePositionCostWithOurRate({
    store,
    workId: WORK_ID,
    unit: UNIT,
    quantity: 3,
    nowMs: NOW,
  });
  eq("T19 same total", a.position.totalPositionCostPln, b.position.totalPositionCostPln);
  eq("T19 total value", a.position.totalPositionCostPln, 37.02);
}

// ——— 20 Faza 0 regression: pure engine still works ———
{
  const r = computePositionCost({
    quantity: 10,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: 20 },
    materials: [],
  });
  eq("T20 F0 engine", r.totalPositionCostPln, 200);
}

// ——— NO_IDENTITY ———
{
  const store = makeStore([makeWork({ ourWorkRate: ourRate(10, T_FRESH) })]);
  const r = resolveLaborInputFromOurWorkRate(store, "  ", UNIT, NOW);
  eq("TX empty workId NO_IDENTITY", r.status, "NO_IDENTITY");
}

console.log("");
console.log(`WYNIK F1 OUR RATE: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
