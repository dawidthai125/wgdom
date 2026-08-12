/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 4 — OfferBoq shadow Position Cost harness.
 *
 * npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f4-boq-shadow.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computePositionCost,
  computeShadowPositionCostForOfferBoqLine,
  computeShadowPositionCostsForOfferBoq,
  resolveWorkIdentityFromOfferBoqLine,
} from "../src/lib/tender-position-cost/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  PAINTING_ECONOMY_FACTOR_2_COATS,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";
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

const PAINT_WORK = "legacy-malowanie-m2";
const PAINT_UNIT = "m2";
const PAINT_MAT = "mat.farba_lateksowa_wewnetrzna";
const PAINT_HOST = "cw.product.farba_lateksowa_wewnetrzna";

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
}

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

function makePaintMaterialWork(overrides = {}) {
  return {
    id: PAINT_HOST,
    tradeId: "MALOWANIE",
    namePl: "Farba lateksowa",
    unit: "l",
    companyPricePln: 999,
    marketQuotes: quoteCell(40, T_FRESH),
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 25, updatedAt: T_FRESH, source: "owner" },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [PAINT_MAT],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    ...overrides,
  };
}

function makeLaborHost(overrides = {}) {
  return {
    id: PAINT_WORK,
    tradeId: "MALOWANIE",
    namePl: "Malowanie",
    unit: PAINT_UNIT,
    companyPricePln: 35,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 15, updatedAt: T_FRESH, source: "owner" },
    ourWorkRate: {
      workId: PAINT_WORK,
      unit: PAINT_UNIT,
      ourRatePln: 20,
      sourceType: "OWNER",
      regionScope: "WROCLAW",
      observedAt: T_FRESH,
      updatedAt: T_FRESH,
      history: [
        {
          workId: PAINT_WORK,
          unit: PAINT_UNIT,
          ratePln: 20,
          kind: "OUR",
          sourceType: "OWNER",
          regionScope: "WROCLAW",
          observedAt: T_FRESH,
        },
      ],
    },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [],
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

function lineTrusted(overrides = {}) {
  return {
    lineId: "L1",
    lp: "1",
    description: "Malowanie ścian",
    quantity: 100,
    quantityRaw: "100",
    unit: PAINT_UNIT,
    catalogWorkId: PAINT_WORK,
    workCategory: "MALOWANIE",
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: "Malowanie ścian",
    aliasRuleId: null,
    knrHint: null,
    matchMethod: "catalog_map",
    matchedBy: "catalog_map",
    matchConfidence: "high",
    candidateMatches: [
      {
        catalogWorkId: PAINT_WORK,
        workNamePl: "Malowanie",
        workCategory: "MALOWANIE",
        tradeId: "MALOWANIE",
        score: 90,
        role: "primary",
        matchedBy: "catalog_map",
        matchConfidence: "high",
        rationale: "test",
      },
    ],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "?" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "?" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "?" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: 12345,
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "test",
    aiConfidence: "high",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    ...overrides,
  };
}

resetTf();

// ——— 1 BOQ → workId ———
{
  const id = resolveWorkIdentityFromOfferBoqLine(lineTrusted());
  eq("T1 OK", id.status, "OK");
  eq("T1 workId", id.workId, PAINT_WORK);
}

// ——— 2–5 qty × BOM + materials + labor ———
{
  const store = makeStore([makeLaborHost(), makePaintMaterialWork()]);
  const row = computeShadowPositionCostForOfferBoqLine({
    line: lineTrusted({ quantity: 100 }),
    store,
    nowMs: NOW,
    paintCoats: 2,
  });
  eq("T2 bom OK", row.bom.status, "OK");
  const expectedQty = Number((100 * PAINTING_ECONOMY_FACTOR_2_COATS).toFixed(6));
  eq("T2 totalQty", row.bom.components[0].totalQuantity, expectedQty);
  eq("T3 one material", row.materialsResolved.length, 1);
  eq("T5 labor", row.position.laborCostPln, 2000);
  eq("T5 material", row.position.materialCostPln, Number((expectedQty * 50).toFixed(2)));
  ok("T5 complete", row.positionComplete);
  eq("T5 mode not mutate legacy", row.legacyLineTotalPln, 12345);
}

// ——— 6 CURRENT OUR RATE (above) · 7 MISSING · 8 STALE ———
{
  const storeMiss = makeStore([
    makeLaborHost({ ourWorkRate: undefined }),
    makePaintMaterialWork(),
  ]);
  const miss = computeShadowPositionCostForOfferBoqLine({
    line: lineTrusted(),
    store: storeMiss,
    nowMs: NOW,
    paintCoats: 2,
  });
  ok("T7 BRAK STAWKI", miss.gaps.includes("BRAK_STAWKI_ROBOT"));
  ok("T7 not complete", !miss.positionComplete);

  const storeStale = makeStore([
    makeLaborHost({
      ourWorkRate: {
        workId: PAINT_WORK,
        unit: PAINT_UNIT,
        ourRatePln: 20,
        sourceType: "OWNER",
        regionScope: "WROCLAW",
        observedAt: T_STALE,
        updatedAt: T_STALE,
        history: [],
      },
    }),
    makePaintMaterialWork(),
  ]);
  const stale = computeShadowPositionCostForOfferBoqLine({
    line: lineTrusted(),
    store: storeStale,
    nowMs: NOW,
    paintCoats: 2,
  });
  ok("T8 STALE gap", stale.gaps.includes("PRZETERMINOWANA_STAWKA_ROBOT"));
}

// ——— 9–11 material CURRENT / MISSING / STALE ———
{
  const store = makeStore([
    makeLaborHost(),
    makePaintMaterialWork({ marketQuotes: {} }),
  ]);
  const miss = computeShadowPositionCostForOfferBoqLine({
    line: lineTrusted(),
    store,
    nowMs: NOW,
    paintCoats: 2,
  });
  ok("T10 BRAK CENY", miss.gaps.includes("BRAK_CENY_MATERIALU"));

  const storeStale = makeStore([
    makeLaborHost(),
    makePaintMaterialWork({ marketQuotes: quoteCell(40, T_STALE) }),
  ]);
  const stale = computeShadowPositionCostForOfferBoqLine({
    line: lineTrusted(),
    store: storeStale,
    nowMs: NOW,
    paintCoats: 2,
  });
  ok("T11 STALE material", stale.gaps.includes("PRZETERMINOWANA_CENA_MATERIALU"));
}

// ——— 12 missing BOM ———
{
  const store = makeStore([makeLaborHost({ id: "cw.no.tech.pack" })]);
  const row = computeShadowPositionCostForOfferBoqLine({
    line: lineTrusted({ catalogWorkId: "cw.no.tech.pack" }),
    store,
    nowMs: NOW,
  });
  // identity may fail if work not trusted with different id in candidates - fix candidates
  const row2 = computeShadowPositionCostForOfferBoqLine({
    line: lineTrusted({
      catalogWorkId: "cw.no.tech.pack",
      candidateMatches: [
        {
          catalogWorkId: "cw.no.tech.pack",
          workNamePl: "X",
          workCategory: "Y",
          tradeId: null,
          score: 90,
          role: "primary",
          matchedBy: "catalog_map",
          matchConfidence: "high",
          rationale: "t",
        },
      ],
    }),
    store: makeStore([
      makeLaborHost({ id: "cw.no.tech.pack", ourWorkRate: { ...makeLaborHost().ourWorkRate, workId: "cw.no.tech.pack" } }),
    ]),
    nowMs: NOW,
  });
  ok("T12 BRAK BOM", row2.gaps.includes("BRAK_TECHNOLOGII_BOM"));
}

// ——— 13 missing materialKey via empty bom recipe coats ———
{
  const store = makeStore([makeLaborHost(), makePaintMaterialWork()]);
  const row = computeShadowPositionCostForOfferBoqLine({
    line: lineTrusted(),
    store,
    nowMs: NOW,
    // no paintCoats → EMPTY_RECIPE
  });
  ok("T13 BRAK NORMY", row.gaps.includes("BRAK_NORMY_MATERIALOWEJ"));
}

// ——— 14 ambiguous ———
{
  const id = resolveWorkIdentityFromOfferBoqLine(
    lineTrusted({
      matchMethod: "catalog_map",
      matchConfidence: "medium",
      candidateMatches: [
        {
          catalogWorkId: "cw.a",
          workNamePl: "A",
          workCategory: "X",
          tradeId: null,
          score: 50,
          role: "primary",
          matchedBy: "catalog_map",
          matchConfidence: "medium",
          rationale: "a",
        },
        {
          catalogWorkId: "cw.b",
          workNamePl: "B",
          workCategory: "X",
          tradeId: null,
          score: 48,
          role: "candidate",
          matchedBy: "catalog_map",
          matchConfidence: "medium",
          rationale: "b",
        },
      ],
    }),
  );
  eq("T14 AMBIGUOUS", id.status, "AMBIGUOUS");
}

// ——— 15 invalid unit ———
{
  const id = resolveWorkIdentityFromOfferBoqLine(lineTrusted({ unit: "xyz" }));
  eq("T15 INVALID_UNIT", id.status, "INVALID_UNIT");
}

// ——— 16 missing conversion ———
{
  const store = makeStore([makeLaborHost(), makePaintMaterialWork()]);
  const row = computeShadowPositionCostForOfferBoqLine({
    line: lineTrusted(),
    store,
    nowMs: NOW,
    paintCoats: 2,
    targetMaterialUnit: "kg",
  });
  ok("T16 KONWERSJA", row.gaps.includes("BRAK_KONWERSJI_JEDNOSTEK"));
}

// ——— 17 no material outside BOM ———
{
  const store = makeStore([makeLaborHost(), makePaintMaterialWork()]);
  const row = computeShadowPositionCostForOfferBoqLine({
    line: lineTrusted(),
    store,
    nowMs: NOW,
    paintCoats: 2,
  });
  eq("T17 only farba", row.bom.components.length, 1);
  eq("T17 key", row.bom.components[0].materialKey, PAINT_MAT);
}

// ——— 18–20 companyPrice / HTTP / research ———
{
  const adapter = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/boq-shadow-adapter.ts"),
    "utf8",
  );
  ok("T18 no companyPricePln", !/\.companyPricePln\b/.test(adapter));
  const before = fetchCalls;
  const store = makeStore([makeLaborHost(), makePaintMaterialWork()]);
  computeShadowPositionCostsForOfferBoq({
    doc: { lines: [lineTrusted()] },
    store,
    nowMs: NOW,
    paintCoats: 2,
  });
  eq("T19 HTTP 0", fetchCalls, before);
  ok(
    "T20 no research",
    !/forceResearch|executeMaterialResearch|requestWorkRateResearch|\bfetch\(/.test(adapter),
  );
}

// ——— 21 deterministic · 22 pure engine ———
{
  const store = makeStore([makeLaborHost(), makePaintMaterialWork()]);
  const a = computeShadowPositionCostForOfferBoqLine({
    line: lineTrusted(),
    store,
    nowMs: NOW,
    paintCoats: 2,
  });
  const b = computeShadowPositionCostForOfferBoqLine({
    line: lineTrusted(),
    store,
    nowMs: NOW,
    paintCoats: 2,
  });
  eq("T21 total", a.position.totalPositionCostPln, b.position.totalPositionCostPln);
  const engine = readFileSync(join(ROOT, "src/lib/tender-position-cost/engine.ts"), "utf8");
  ok("T22 engine pure", !/OfferBoq|lookupWorkRate|projectBom/.test(engine));
}

// ——— 23–24 Bid/Offer unchanged (static) ———
{
  const adapter = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/boq-shadow-adapter.ts"),
    "utf8",
  );
  ok(
    "T23 no Bid",
    !/from\s+[\"']@\/lib\/tender-bid|computeTenderBidProposal\s*\(/.test(adapter) &&
      !/\bminMarginPct\b|\bprofitPct\b|\brecommendedBidPln\b/.test(
        adapter.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, ""),
      ),
  );
  ok("T24 shadow mode", /mode: \"shadow\"/.test(adapter));
  ok("T24b no mutate linePricing", !/linePricing\s*=/.test(adapter));
}

// ——— 25–26 PM / WR no write in adapter ———
{
  const adapter = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/boq-shadow-adapter.ts"),
    "utf8",
  );
  ok("T25 no commitMarketQuotes", !/commitMarketQuotesImport|patchOurWorkRate/.test(adapter));
  ok("T26 resolve only", /resolveLaborInputFromOurWorkRate/.test(adapter));
}

// ——— 27–30 F0 marker + shadow doc ———
{
  const r = computePositionCost({
    quantity: 1,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: 10 },
    materials: [],
  });
  eq("T27 F0", r.totalPositionCostPln, 10);

  const store = makeStore([makeLaborHost(), makePaintMaterialWork()]);
  const doc = computeShadowPositionCostsForOfferBoq({
    doc: {
      lines: [
        lineTrusted(),
        lineTrusted({
          lineId: "L2",
          isNoise: true,
          noiseKind: "transport",
          catalogWorkId: null,
          matchMethod: "unmatched",
        }),
      ],
    },
    store,
    nowMs: NOW,
    paintCoats: 2,
  });
  eq("T28 mode", doc.mode, "shadow");
  eq("T29 lineCount", doc.lineCount, 2);
  ok("T30 complete>=1", doc.aggregates.completeLineCount >= 1);
}

// ——— unmatched identity ———
{
  const id = resolveWorkIdentityFromOfferBoqLine(
    lineTrusted({
      catalogWorkId: null,
      matchMethod: "unmatched",
      matchConfidence: "low",
      candidateMatches: [],
    }),
  );
  eq("TX NO_IDENTITY", id.status, "NO_IDENTITY");
}

console.log("");
console.log(`WYNIK F4 BOQ SHADOW: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
