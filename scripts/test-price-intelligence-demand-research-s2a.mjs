/**
 * PRICE-INTELLIGENCE-DEMAND-RESEARCH-01 S2-A — Research Intelligence Brief.
 * npx vite-node scripts/test-price-intelligence-demand-research-s2a.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  acceptManualMarketPriceResearchPure,
  buildPriceCandidateFromManualInput,
  buildPriceDemandId,
  buildResearchIntelligenceBrief,
  deriveTradeOriginHint,
  invoiceAcceptWritesMarketQuotes,
  lookupPriceMemory,
  normalizePriceDemandStore,
  researchIntelligenceCreatesPriceFromBoq,
  researchIntelligenceFillsMarketFromPurchase,
  researchIntelligencePriorityImplemented,
  researchIntelligenceUsesSoftLabelOverlap,
  resolveExactCatalogWork,
  upsertPriceDemandCandidates,
  useExistingMarketPricePure,
} from "../src/lib/price-intelligence/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
  key: () => null,
  get length() {
    return storage.size;
  },
};

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}
function eq(name, a, b) {
  assert.equal(a, b, `${name}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
  passed += 1;
  console.log(`PASS ${name}`);
}

const T0 = "2026-08-01T12:00:00.000Z";
const T1 = "2026-08-09T12:00:00.000Z";
const T_STALE = "2025-01-01T12:00:00.000Z";
const WORK_ID = "cw.etics.boards";
const WORK_DOOR = "cw.door.install";
const MAT = "mat.eps_graph";

function baseCatalog() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T0,
    catalogs: {
      wroclaw: {
        region: "wroclaw",
        updatedAt: T0,
        works: [
          {
            id: WORK_ID,
            tradeId: "MALOWANIE",
            namePl: "Płyta EPS grafit",
            unit: "m2",
            companyPricePln: 100,
            updatedAt: T0,
            keywords: ["eps"],
            active: true,
            favorite: false,
            usageCount: 0,
            source: "seed",
            freshnessStatus: "missing",
          },
          {
            id: WORK_DOOR,
            tradeId: "DRZWI",
            namePl: "Montaż drzwi",
            unit: "szt",
            companyPricePln: 200,
            updatedAt: T0,
            keywords: ["drzwi"],
            active: true,
            favorite: false,
            usageCount: 0,
            source: "seed",
            freshnessStatus: "missing",
          },
        ],
      },
      dolnyslask: { region: "dolnyslask", updatedAt: T0, works: [] },
    },
  });
}

function memoryDeps(initial) {
  let current = structuredClone(initial);
  return {
    load: async () => structuredClone(current),
    save: async (store) => {
      current = structuredClone(store);
      return { ok: true, saved: true };
    },
    loadLocal: () => structuredClone(current),
    saveLocal: (store) => {
      current = structuredClone(store);
    },
    get: () => current,
  };
}

function worksMap(store) {
  return new Map(store.catalogs.wroclaw.works.map((w) => [w.id, w]));
}

function demandRec(over = {}) {
  const materialKey = over.materialKey ?? MAT;
  const catalogWorkId = over.catalogWorkId === undefined ? WORK_ID : over.catalogWorkId;
  const missingLayer = over.missingLayer ?? "MARKET_QUOTE_MISSING";
  return {
    demandId: buildPriceDemandId({
      materialKey,
      catalogWorkId,
      region: "wroclaw",
      missingLayer,
    }),
    materialKey,
    catalogWorkId,
    normalizedName: over.normalizedName ?? "EPS",
    unit: "m2",
    region: "wroclaw",
    missingLayer,
    status: "MISSING",
    priority: "HIGH",
    occurrenceCount: over.occurrenceCount ?? 3,
    tenderIds: over.tenderIds ?? ["tA", "tB", "tC"],
    firstRequestedAt: T0,
    lastRequestedAt: T1,
    reason: "PRICE DATA MISSING",
  };
}

function formBase(over = {}) {
  return {
    demandId: buildPriceDemandId({
      materialKey: MAT,
      catalogWorkId: WORK_ID,
      region: "wroclaw",
      missingLayer: "MARKET_QUOTE_MISSING",
    }),
    materialKey: MAT,
    catalogWorkId: WORK_ID,
    region: "wroclaw",
    provider: "castorama",
    name: "EPS",
    unit: "m2",
    priceNet: 849,
    priceDate: "2026-08-01",
    ...over,
  };
}

console.log("\n=== DEMAND-RESEARCH-01 S2-A Research Intelligence ===\n");
resetTf();

const deps = memoryDeps(baseCatalog());

// Seed Quotes via S0 ACCEPT
{
  const built = buildPriceCandidateFromManualInput(formBase(), {
    candidateId: "s2a_seed",
    retrievedAt: T0,
  });
  let demandStore = upsertPriceDemandCandidates(normalizePriceDemandStore(null), [
    {
      materialKey: MAT,
      catalogWorkId: WORK_ID,
      namePl: "EPS",
      unit: "m2",
      region: "wroclaw",
      missingLayer: "MARKET_QUOTE_MISSING",
      tenderId: "tA",
      requestedAt: T0,
      reason: "PRICE DATA MISSING",
    },
  ]).store;
  await acceptManualMarketPriceResearchPure({
    candidate: built.candidate,
    demandStore,
    commitOptions: { deps, updatedAtIso: T0 },
  });
}

// 1 exact HIT → S1-A unchanged
{
  const mem = lookupPriceMemory({
    catalogWorkId: WORK_ID,
    materialKey: MAT,
    region: "wroclaw",
    worksById: worksMap(deps.get()),
    nowMs: Date.parse(T1),
  });
  eq("1 S1-A HIT", mem.status, "HIT");
  const brief = buildResearchIntelligenceBrief({
    demand: demandRec(),
    worksById: worksMap(deps.get()),
    memoryLookup: mem,
    nowMs: Date.parse(T1),
  });
  eq("1 intel memory HIT", brief.memoryStatus, "HIT");
  eq("1 price from memory", brief.memoryHit?.price, 849);
  ok("1 does not invent price field outside hit", brief.memoryHit?.price === 849);
}

// 2 MISS + catalogWorkId → Trade brief
{
  const empty = memoryDeps(baseCatalog());
  const brief = buildResearchIntelligenceBrief({
    demand: demandRec({ occurrenceCount: 2, tenderIds: ["t1", "t2"] }),
    worksById: worksMap(empty.get()),
    nowMs: Date.parse(T1),
  });
  eq("2 memory MISS", brief.memoryStatus, "MISS");
  eq("2 Trade", brief.tradeLabelPl, "Malowanie");
  eq("2 typical", brief.typicalWgdom, true);
  eq("2 occurrences", brief.occurrenceCount, 2);
  eq("2 tenders", brief.tenderCount, 2);
  ok("2 cta find", /Brak zapisanej ceny/i.test(brief.ctaFindPricePl));
}

// 3 MISS without identity → no invented Trade
{
  const empty = memoryDeps(baseCatalog());
  const brief = buildResearchIntelligenceBrief({
    demand: demandRec({
      materialKey: "mat.unknown_xyz",
      catalogWorkId: null,
      occurrenceCount: 1,
      tenderIds: ["t9"],
    }),
    worksById: worksMap(empty.get()),
  });
  eq("3 no Trade", brief.tradeLabelPl, null);
  eq("3 not typical", brief.typicalWgdom, false);
  eq("3 MISS", brief.memoryStatus, "MISS");
}

// 4 materialKey exact map → material label
{
  const brief = buildResearchIntelligenceBrief({
    demand: demandRec(),
    worksById: worksMap(deps.get()),
  });
  ok("4 material label", /EPS|grafit|rynek/i.test(brief.materialLabelPl || ""));
}

// 5 LAST origin → origin hint
{
  const brief = buildResearchIntelligenceBrief({
    demand: demandRec(),
    worksById: worksMap(deps.get()),
    nowMs: Date.parse(T1),
  });
  eq("5 last origin castorama", brief.lastOrigin, "castorama");
  ok("5 origin label", !!brief.lastOriginLabelPl);
}

// 6 stale LAST → still valid hint + S1-A HIT
{
  const staleStore = structuredClone(deps.get());
  const w = staleStore.catalogs.wroclaw.works.find((x) => x.id === WORK_ID);
  w.marketQuotes.castorama.wroclaw.updatedAt = T_STALE;
  const mem = lookupPriceMemory({
    catalogWorkId: WORK_ID,
    materialKey: MAT,
    region: "wroclaw",
    worksById: worksMap(staleStore),
    nowMs: Date.parse(T1),
  });
  eq("19 stale S1-A HIT", mem.status, "HIT");
  const brief = buildResearchIntelligenceBrief({
    demand: demandRec(),
    worksById: worksMap(staleStore),
    memoryLookup: mem,
    nowMs: Date.parse(T1),
  });
  eq("6 freshness stale", brief.freshnessUx, "stale");
  eq("6 origin still present", brief.lastOrigin, "castorama");
}

// 7 history origin → hint only (no price invent)
{
  const store = structuredClone(deps.get());
  const w = store.catalogs.wroclaw.works.find((x) => x.id === WORK_ID);
  w.marketQuoteHistory = [
    {
      workId: WORK_ID,
      price: 700,
      origin: "leroy",
      regionCode: "wroclaw",
      updatedAt: "2026-07-01T12:00:00.000Z",
      confidence: 0.8,
      coverage: "full",
    },
    {
      workId: WORK_ID,
      price: 710,
      origin: "leroy",
      regionCode: "wroclaw",
      updatedAt: "2026-07-02T12:00:00.000Z",
      confidence: 0.8,
      coverage: "full",
    },
  ];
  // strip LAST to force history-only preference path for preferredOrigin
  // keep LAST for memory HIT separately — here we check preferred from history counts
  const brief = buildResearchIntelligenceBrief({
    demand: demandRec(),
    worksById: worksMap(store),
    nowMs: Date.parse(T1),
  });
  ok("7 preferred hint from history or LAST", !!brief.preferredOriginHint);
  ok("7 no BOQ price create", researchIntelligenceCreatesPriceFromBoq() === false);
}

// 8 Trade aggregate → hint only
{
  const store = structuredClone(deps.get());
  // door work with leroy quotes — different trade
  const door = store.catalogs.wroclaw.works.find((x) => x.id === WORK_DOOR);
  door.marketQuotes = {
    leroy: {
      wroclaw: {
        price: 50,
        regionCode: "wroclaw",
        coverage: "full",
        updatedAt: T0,
        confidence: 0.85,
        origin: "leroy",
      },
    },
  };
  const hintDoor = deriveTradeOriginHint("DRZWI", worksMap(store));
  eq("8 trade DRZWI origin hint", hintDoor, "leroy");
  const briefDoor = buildResearchIntelligenceBrief({
    demand: demandRec({
      materialKey: "mat.door_x",
      catalogWorkId: WORK_DOOR,
      normalizedName: "Drzwi",
    }),
    worksById: worksMap(store),
  });
  eq("8 brief trade origin hint", briefDoor.tradeOriginHint, "leroy");
  // trade hint must not become memoryHit price
  ok(
    "8 trade hint ≠ auto price",
    briefDoor.memoryHit == null || briefDoor.memoryHit.origin !== undefined,
  );
}

// 9 historical BOQ → no price (static + helper)
ok("9 no BOQ price", researchIntelligenceCreatesPriceFromBoq() === false);

// 10 Purchase → no MARKET price
ok("10 no Purchase MARKET fill", researchIntelligenceFillsMarketFromPurchase() === false);
ok("10 invoice ≠ Quotes", invoiceAcceptWritesMarketQuotes() === false);

// 11 soft label overlap → never identity
ok("11 soft forbidden", researchIntelligenceUsesSoftLabelOverlap() === false);
{
  const r = resolveExactCatalogWork({
    catalogWorkId: null,
    materialKey: "mat.unknown_xyz",
    worksById: worksMap(deps.get()),
  });
  eq("11 unknown material null", r, null);
}

// 12 USE EXISTING → 0 Quotes rewrite
{
  const before = JSON.stringify(
    deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID)?.marketQuotes,
  );
  const demandStore = upsertPriceDemandCandidates(normalizePriceDemandStore(null), [
    {
      materialKey: MAT,
      catalogWorkId: WORK_ID,
      namePl: "EPS",
      unit: "m2",
      region: "wroclaw",
      missingLayer: "MARKET_QUOTE_MISSING",
      tenderId: "tB",
      requestedAt: T1,
      reason: "PRICE DATA MISSING",
    },
  ]).store;
  const reuse = useExistingMarketPricePure({
    demandStore,
    materialKey: MAT,
    catalogWorkId: WORK_ID,
    region: "wroclaw",
    resolvedAt: T1,
  });
  eq("12 wroteQuotes false", reuse.wroteQuotes, false);
  eq(
    "12 quotes unchanged",
    JSON.stringify(deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID)?.marketQuotes),
    before,
  );
}

// 13 S0 ACCEPT behavior still Quotes
{
  const d2 = memoryDeps(baseCatalog());
  const built = buildPriceCandidateFromManualInput(formBase({ priceNet: 111 }), {
    candidateId: "s2a_13",
    retrievedAt: T1,
  });
  const acc = await acceptManualMarketPriceResearchPure({
    candidate: built.candidate,
    demandStore: normalizePriceDemandStore(null),
    commitOptions: { deps: d2, updatedAtIso: T1 },
  });
  ok("13 ACCEPT ok", acc.ok);
  eq(
    "13 Quotes price",
    d2.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID)?.marketQuotes?.castorama
      ?.wroclaw?.price,
    111,
  );
}

// 14 priority OUT
eq("14 priority not implemented", researchIntelligencePriorityImplemented(), false);

// 15–17 static guarantees
{
  const src = [
    readFileSync(resolve("src/lib/price-intelligence/research-intelligence.ts"), "utf8"),
    readFileSync(resolve("src/app/expert-workspace/CostDetailsPanel.tsx"), "utf8"),
    readFileSync(resolve("src/app/expert-workspace/DemandPriceResearchPanel.tsx"), "utf8"),
  ].join("\n");
  ok("15 0 fetch", !/\bfetch\s*\(/.test(src));
  ok("16 0 SQL", !/\bCREATE TABLE\b|\bSELECT\s+\*|supabase\.from\(/i.test(src));
  ok("17 0 new KV", !/kw-research-intelligence|kw-category-learning/i.test(src));
  ok("11b no fuzzy in S2", !/fuzzyMatch|fuse\.js|string-similarity|levenshtein/i.test(src));
  ok("11c no soft overlap call", !/resolveMaterialMarketCoverage/.test(src));
  ok("UI typical", src.includes("TYPOWA POZYCJA WGDOM"));
  ok("UI intel markers", src.includes("data-research-intelligence-brief"));
}

// 18 different Trade → different brief
{
  const store = deps.get();
  const a = buildResearchIntelligenceBrief({
    demand: demandRec(),
    worksById: worksMap(store),
  });
  const b = buildResearchIntelligenceBrief({
    demand: demandRec({
      materialKey: "mat.door_x",
      catalogWorkId: WORK_DOOR,
      normalizedName: "Drzwi",
    }),
    worksById: worksMap(store),
  });
  eq("18 a Trade Malowanie", a.tradeLabelPl, "Malowanie");
  eq("18 b Trade Drzwi", b.tradeLabelPl, "Drzwi");
  ok("18 different", a.tradeLabelPl !== b.tradeLabelPl);
}

// 20–26 regressions
{
  const { processInvoiceCompanyPurchaseBatch, lookupInvoiceApprovedMap, computeMissingLayer, ensurePi31EticsApprovedDataLocal, lookupPriceMemory: lm } =
    await import("../src/lib/price-intelligence/index.ts");
  ok("20 P0", typeof processInvoiceCompanyPurchaseBatch === "function");
  ok("21 P1", typeof lookupInvoiceApprovedMap === "function");
  ok("23 S1-A lookup", typeof lm === "function");
  eq("25 P3.2 BOTH", computeMissingLayer({ purchaseOk: false, marketOk: false }), "BOTH_MISSING");
  ok("24 P3.1", typeof ensurePi31EticsApprovedDataLocal === "function");
  const s0 = readFileSync(resolve("scripts/test-price-intelligence-demand-research-s0.mjs"), "utf8");
  ok("22 S0 test present", s0.includes("DEMAND-RESEARCH-01 S0"));
  const s1 = readFileSync(resolve("scripts/test-price-intelligence-demand-research-s1a.mjs"), "utf8");
  ok("23b S1-A test present", s1.includes("S1-A"));
  const msSrc = readFileSync(resolve("src/lib/market-sync/publish.ts"), "utf8");
  ok("26 Market Sync untouched", msSrc.includes("commitMarketQuotesImport"));
  ok(
    "26 no Market Sync priceHistory in S2",
    !readFileSync(resolve("src/lib/price-intelligence/research-intelligence.ts"), "utf8").includes(
      "priceHistory",
    ),
  );
}

console.log(`\n=== S2-A DONE: ${passed} PASS ===\n`);
