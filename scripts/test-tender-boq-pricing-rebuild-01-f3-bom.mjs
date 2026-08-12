/**
 * TENDER-BOQ-PRICING-REBUILD-01 FAZA 3 — BOM / Technology harness.
 *
 * npx vite-node scripts/test-tender-boq-pricing-rebuild-01-f3-bom.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  computePositionCost,
  computePositionCostWithBomTechnology,
  findActiveTechnologyPacksForWorkId,
  resolveTechnologyBomForWork,
} from "../src/lib/tender-position-cost/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  FIXTURE_PAINTING_ECONOMY_PACK_ID,
  PAINTING_ECONOMY_FACTOR_2_COATS,
  seedB0Fixtures,
  seedPaintingEconomyWhiteV1,
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

const PAINT_WORK = "legacy-malowanie-m2";
const PAINT_UNIT = "m2";
const PAINT_MAT = "mat.farba_lateksowa_wewnetrzna";
const PAINT_HOST = "cw.product.farba_lateksowa_wewnetrzna";

const ETICS_BOARD = "cw.etics.boards";

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
    commercialPricing: {
      marginPct: 25,
      updatedAt: T_FRESH,
      source: "owner",
    },
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
    commercialPricing: {
      marginPct: 15,
      updatedAt: T_FRESH,
      source: "owner",
    },
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

function makeEpsWork() {
  return {
    id: "cw.product.eps_graph",
    tradeId: "ETICS",
    namePl: "EPS grafit",
    unit: "m2",
    companyPricePln: 50,
    marketQuotes: quoteCell(30, T_FRESH),
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 10, updatedAt: T_FRESH, source: "owner" },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["mat.eps_graph"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
  };
}

resetTf();

// ——— 1–5 valid BOM painting ———
{
  const bom = resolveTechnologyBomForWork({
    workId: PAINT_WORK,
    unit: PAINT_UNIT,
    positionQuantity: 500,
    paintCoats: 2,
  });
  eq("T1 OK", bom.status, "OK");
  eq("T1 pack", bom.packId, FIXTURE_PAINTING_ECONOMY_PACK_ID);
  eq("T2 one material", bom.components.length, 1);
  eq("T2 key", bom.components[0].materialKey, PAINT_MAT);
  eq("T4 qtyPerUnit", bom.components[0].quantityPerUnit, PAINTING_ECONOMY_FACTOR_2_COATS);
  eq("T4 total", bom.components[0].totalQuantity, Number((500 * PAINTING_ECONOMY_FACTOR_2_COATS).toFixed(6)));
  eq("T5 unit l", bom.components[0].unit, "l");
  ok("T1b provenance", !!bom.provenanceRef);
}

// ——— 3 multi material ETICS boards step ———
{
  const bom = resolveTechnologyBomForWork({
    workId: ETICS_BOARD,
    unit: "m2",
    positionQuantity: 10,
  });
  // ETICS pack has materials for whole pack when any step matches — full pack materials
  ok("T3 multi or at least 1", bom.status === "OK" && bom.components.length >= 1);
  if (bom.status === "OK") {
    ok(
      "T3 only pack materials",
      bom.components.every((c) => typeof c.materialKey === "string" && c.materialKey.startsWith("mat.")),
    );
    ok("T3 no invent grunt", !bom.components.some((c) => c.materialKey === "mat.grunt"));
  }
}

// ——— 6 missing BOM ———
{
  const bom = resolveTechnologyBomForWork({
    workId: "cw.unknown.work.xyz",
    unit: "m2",
    positionQuantity: 10,
  });
  eq("T6 MISSING_BOM", bom.status, "MISSING_BOM");
  ok("T6 label", /BRAK BOM|TECHNOLOGICZNYCH/i.test(bom.statusLabelPl));
}

// ——— 7–10 invalid components via synthetic pack ———
{
  const { registerCapability, registerDefinition, registerPack } = await import(
    "../src/lib/technology-foundation/index.ts"
  );
  // use already seeded caps
  const badPack = {
    packId: "pack.test.f3_invalid",
    packVersion: "1.0",
    definitionId: "def.painting.economy_interior_white",
    packCapabilities: ["cap.interior_painting"],
    lifecycle: "ACTIVE",
    namePl: "Test invalid BOM",
    stages: [{ stageId: "s1", order: 1, namePl: "S" }],
    steps: [
      {
        stepId: "st1",
        stageId: "s1",
        order: 1,
        namePl: "W",
        catalogWorkId: "cw.test.f3_invalid",
        quantityFromBoq: true,
      },
    ],
    dependencies: [],
    materials: [
      {
        materialKey: "",
        namePl: "X",
        unit: "kg",
        qtyFactor: 1,
        factorSourceKind: "fixture_legacy",
      },
    ],
    equipment: [],
    labour: [],
    regulatory: [],
  };
  try {
    registerPack(badPack);
  } catch {
    /* may fail schema — build inline via resolve with packs array */
  }
  const bom7 = resolveTechnologyBomForWork({
    workId: "cw.test.f3_invalid",
    unit: "m2",
    positionQuantity: 1,
    packs: [badPack],
  });
  eq("T7/8 INVALID no materialKey", bom7.status, "INVALID_COMPONENT");

  const bom9 = resolveTechnologyBomForWork({
    workId: "cw.test.f3_noqty",
    unit: "m2",
    positionQuantity: 1,
    packs: [
      {
        ...badPack,
        packId: "pack.test.f3_noqty",
        steps: [
          {
            stepId: "st1",
            stageId: "s1",
            order: 1,
            namePl: "W",
            catalogWorkId: "cw.test.f3_noqty",
            quantityFromBoq: true,
          },
        ],
        materials: [
          {
            materialKey: "mat.wc_compact",
            namePl: "X",
            unit: "szt",
            qtyFactor: Number.NaN,
            factorSourceKind: "fixture_legacy",
          },
        ],
      },
    ],
  });
  eq("T9 no qtyFactor", bom9.status, "INVALID_COMPONENT");

  const bom10 = resolveTechnologyBomForWork({
    workId: "cw.test.f3_neg",
    unit: "m2",
    positionQuantity: 1,
    packs: [
      {
        ...badPack,
        packId: "pack.test.f3_neg",
        steps: [
          {
            stepId: "st1",
            stageId: "s1",
            order: 1,
            namePl: "W",
            catalogWorkId: "cw.test.f3_neg",
            quantityFromBoq: true,
          },
        ],
        materials: [
          {
            materialKey: "mat.wc_compact",
            namePl: "X",
            unit: "szt",
            qtyFactor: -1,
            factorSourceKind: "fixture_legacy",
          },
        ],
      },
    ],
  });
  eq("T10 qtyFactor < 0", bom10.status, "INVALID_COMPONENT");
}

// ——— 11 position quantity < 0 ———
{
  const bom = resolveTechnologyBomForWork({
    workId: PAINT_WORK,
    unit: PAINT_UNIT,
    positionQuantity: -5,
    paintCoats: 2,
  });
  eq("T11 invalid qty", bom.status, "INVALID_POSITION_QUANTITY");
}

// ——— 12 unit conversion GAP ———
{
  const bom = resolveTechnologyBomForWork({
    workId: PAINT_WORK,
    unit: PAINT_UNIT,
    positionQuantity: 10,
    paintCoats: 2,
    targetMaterialUnit: "kg",
  });
  eq("T12 UNIT_CONVERSION_GAP", bom.status, "UNIT_CONVERSION_GAP");
}

// ——— 13 no materials outside Technology ———
{
  const bom = resolveTechnologyBomForWork({
    workId: PAINT_WORK,
    unit: PAINT_UNIT,
    positionQuantity: 10,
    paintCoats: 1,
  });
  eq("T13 only farba", bom.components.length, 1);
  eq("T13 key", bom.components[0].materialKey, PAINT_MAT);
  ok("T13 no tape", !bom.components.some((c) => /tasma|folia|szpachla/i.test(c.materialKey)));
}

// ——— 14–18 BOM → PM → sell + labor ———
{
  const store = makeStore([makeLaborHost(), makePaintMaterialWork()]);
  const r = computePositionCostWithBomTechnology({
    store,
    workId: PAINT_WORK,
    unit: PAINT_UNIT,
    quantity: 100,
    nowMs: NOW,
    paintCoats: 2,
  });
  eq("T14 bom OK", r.bom.status, "OK");
  eq("T14 materialKey", r.bom.components[0].materialKey, PAINT_MAT);
  eq("T15/16 sell resolved", r.materialsResolved[0].status, "CURRENT");
  eq("T16 sellPrice", r.materialsResolved[0].sellPricePln, 50); // 40*1.25
  eq("T17 OUR RATE", r.ourRate.status, "CURRENT");
  eq("T17 labor", r.position.laborCostPln, 2000);
  const matQty = Number((100 * PAINTING_ECONOMY_FACTOR_2_COATS).toFixed(6));
  eq("T18 materialCost", r.position.materialCostPln, Number((matQty * 50).toFixed(2)));
  ok("T18 complete", r.position.positionComplete);
}

// ——— 19 companyPrice ZERO ———
{
  const store = makeStore([
    makeLaborHost(),
    makePaintMaterialWork({
      companyPricePln: 999,
      marketQuotes: {},
    }),
  ]);
  const r = computePositionCostWithBomTechnology({
    store,
    workId: PAINT_WORK,
    unit: PAINT_UNIT,
    quantity: 10,
    nowMs: NOW,
    paintCoats: 2,
  });
  ok("T19 not 999 sell", r.materialsResolved[0]?.sellPricePln !== 999);
  eq("T19 MISSING price", r.materialsResolved[0]?.status, "MISSING");
}

// ——— 20–21 HTTP / research ———
{
  const before = fetchCalls;
  resolveTechnologyBomForWork({
    workId: PAINT_WORK,
    unit: PAINT_UNIT,
    positionQuantity: 1,
    paintCoats: 2,
  });
  eq("T20 HTTP 0", fetchCalls, before);
  const adapter = readFileSync(
    join(ROOT, "src/lib/tender-position-cost/bom-technology-adapter.ts"),
    "utf8",
  );
  ok(
    "T21 no research",
    !/forceResearch|executeMaterialResearch|requestWorkRateResearch|\bfetch\(/.test(adapter),
  );
  ok("T19b no companyPrice read", !/\.companyPricePln\b/.test(adapter));
}

// ——— 22 engine pure ———
{
  const engine = readFileSync(join(ROOT, "src/lib/tender-position-cost/engine.ts"), "utf8");
  ok("T22 no projectBom", !/projectBom|TechnologyPack|lookupWorkRate|lookupPriceMemory/.test(engine));
}

// ——— 23 deterministic ———
{
  const a = resolveTechnologyBomForWork({
    workId: PAINT_WORK,
    unit: PAINT_UNIT,
    positionQuantity: 12,
    paintCoats: 2,
  });
  const b = resolveTechnologyBomForWork({
    workId: PAINT_WORK,
    unit: PAINT_UNIT,
    positionQuantity: 12,
    paintCoats: 2,
  });
  eq("T23 total", a.components[0].totalQuantity, b.components[0].totalQuantity);
}

// ——— 24 rounding via projectBom 6dp ———
{
  const bom = resolveTechnologyBomForWork({
    workId: PAINT_WORK,
    unit: PAINT_UNIT,
    positionQuantity: 3,
    paintCoats: 2,
  });
  eq(
    "T24 rounded",
    bom.components[0].totalQuantity,
    Number((3 * PAINTING_ECONOMY_FACTOR_2_COATS).toFixed(6)),
  );
}

// ——— 25–27 regression markers (child suites run separately) ———
{
  const r = computePositionCost({
    quantity: 2,
    unit: "m2",
    labor: { status: "CURRENT", ourRatePln: 10 },
    materials: [],
  });
  eq("T25 F0 still", r.totalPositionCostPln, 20);
  ok("T26 findActive", findActiveTechnologyPacksForWorkId(PAINT_WORK).length === 1);
  ok("T27 seedPainting still", !!seedPaintingEconomyWhiteV1());
}

// ——— coats required (no invent) ———
{
  const bom = resolveTechnologyBomForWork({
    workId: PAINT_WORK,
    unit: PAINT_UNIT,
    positionQuantity: 10,
    // no paintCoats
  });
  eq("TX coats missing → EMPTY_RECIPE", bom.status, "EMPTY_RECIPE");
}

console.log("");
console.log(`WYNIK F3 BOM: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
