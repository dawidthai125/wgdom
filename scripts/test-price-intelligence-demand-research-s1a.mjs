/**
 * PRICE-INTELLIGENCE-DEMAND-RESEARCH-01 S1-A — PRICE MEMORY / reuse / history A2.
 * npx vite-node scripts/test-price-intelligence-demand-research-s1a.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  MARKET_QUOTE_HISTORY_CAP,
  acceptManualMarketPriceResearchPure,
  appendMarketQuoteHistoryEntry,
  buildManualResearchBrief,
  buildPriceCandidateFromManualInput,
  buildPriceDemandId,
  invoiceAcceptWritesMarketQuotes,
  listMarketQuoteHistoryForCell,
  lookupPriceMemory,
  normalizePriceDemandStore,
  priceMemoryFreshnessLabelPl,
  snapshotToHistoryEntry,
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
            keywords: ["eps", "grafit"],
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
    name: "EPS grafit",
    unit: "m2",
    priceNet: 849,
    priceDate: "2026-08-01",
    ...over,
  };
}

function worksMap(deps) {
  return new Map(deps.get().catalogs.wroclaw.works.map((w) => [w.id, w]));
}

function demandStoreFor(tenderId) {
  return upsertPriceDemandCandidates(normalizePriceDemandStore(null), [
    {
      materialKey: MAT,
      catalogWorkId: WORK_ID,
      namePl: "EPS",
      unit: "m2",
      region: "wroclaw",
      missingLayer: "MARKET_QUOTE_MISSING",
      tenderId,
      requestedAt: T1,
      reason: "PRICE DATA MISSING",
    },
  ]).store;
}

console.log("\n=== DEMAND-RESEARCH-01 S1-A PRICE MEMORY ===\n");
resetTf();

const deps = memoryDeps(baseCatalog());

// 1 ACCEPT → LAST Quotes
{
  const built = buildPriceCandidateFromManualInput(formBase(), {
    candidateId: "s1a_1",
    retrievedAt: T0,
  });
  const acc = await acceptManualMarketPriceResearchPure({
    candidate: built.candidate,
    demandStore: demandStoreFor("tender-A"),
    commitOptions: { deps, updatedAtIso: T0 },
  });
  ok("1 ACCEPT ok", acc.ok);
  const work = deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID);
  eq("1 LAST castorama", work?.marketQuotes?.castorama?.wroclaw?.price, 849);
  eq("1 companyPrice unchanged", work?.companyPricePln, 100);
}

// 2 second tender → memory HIT
{
  const lookup = lookupPriceMemory({
    catalogWorkId: WORK_ID,
    materialKey: MAT,
    region: "wroclaw",
    worksById: worksMap(deps),
    nowMs: Date.parse(T1),
  });
  eq("2 memory HIT", lookup.status, "HIT");
  ok("2 hit workId", lookup.status === "HIT" && lookup.hit.workId === WORK_ID);
}

// 3 HIT payload
{
  const lookup = lookupPriceMemory({
    catalogWorkId: WORK_ID,
    materialKey: MAT,
    region: "wroclaw",
    worksById: worksMap(deps),
    nowMs: Date.parse(T1),
  });
  ok("3 payload", lookup.status === "HIT");
  if (lookup.status === "HIT") {
    eq("3 price", lookup.hit.price, 849);
    eq("3 origin", lookup.hit.origin, "castorama");
    eq("3 region", lookup.hit.region, "wroclaw");
    ok("3 updatedAt", !!lookup.hit.updatedAt);
    ok("3 confidence", lookup.hit.confidence > 0);
    ok("3 coverage", !!lookup.hit.coverage);
    ok("3 workId identity", lookup.hit.workId === WORK_ID);
  }
}

// 4–8 UI markers (static)
{
  const ui = readFileSync(resolve("src/app/expert-workspace/CostDetailsPanel.tsx"), "utf8");
  ok("4 UI shows price", ui.includes("data-memory-price") && ui.includes("ZNALEZIONO ZAPISANĄ CENĘ"));
  ok("5 UI shows origin", ui.includes("data-memory-origin"));
  ok("6 UI shows date", ui.includes("data-memory-date"));
  ok("7 UI shows confidence", ui.includes("data-memory-confidence"));
  ok("8 UI shows freshness", ui.includes("data-memory-freshness"));
  ok("9 UŻYJ TEJ CENY CTA", ui.includes("data-use-existing-price-cta") && ui.includes("Użyj tej ceny"));
  ok("12 ZNAJDŹ NOWĄ → S0", ui.includes("data-find-new-price-cta") && ui.includes("Znajdź nową cenę"));
  ok("4b MISS Znajdź cenę", ui.includes("data-find-price-cta"));
}

// 9–11 use existing → zero rewrite + demand resolved
{
  const quotesBefore = JSON.stringify(
    deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID)?.marketQuotes,
  );
  const companyBefore = deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID)
    ?.companyPricePln;
  let demandStore = demandStoreFor("tender-B");
  const reuse = useExistingMarketPricePure({
    demandStore,
    materialKey: MAT,
    catalogWorkId: WORK_ID,
    region: "wroclaw",
    resolvedAt: T1,
  });
  eq("10 wroteQuotes false", reuse.wroteQuotes, false);
  ok("11 demand resolved", reuse.demandResolved);
  eq(
    "10 quotes unchanged",
    JSON.stringify(deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID)?.marketQuotes),
    quotesBefore,
  );
  eq(
    "22 companyPricePln unchanged after reuse",
    deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID)?.companyPricePln,
    companyBefore,
  );
}

// 13–14 new ACCEPT → LAST + old → HISTORY
{
  const built = buildPriceCandidateFromManualInput(
    formBase({ priceNet: 999, priceDate: "2026-08-09" }),
    { candidateId: "s1a_new", retrievedAt: T1 },
  );
  const acc = await acceptManualMarketPriceResearchPure({
    candidate: built.candidate,
    demandStore: demandStoreFor("tender-B-research"),
    commitOptions: { deps, updatedAtIso: T1 },
  });
  ok("13 ACCEPT new ok", acc.ok);
  const work = deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID);
  eq("13 LAST new price", work?.marketQuotes?.castorama?.wroclaw?.price, 999);
  ok("14 historyAppended > 0", acc.historyAppended > 0);
  const hist = listMarketQuoteHistoryForCell(
    work?.marketQuoteHistory,
    WORK_ID,
    "castorama",
    "wroclaw",
  );
  ok("14 old price in HISTORY", hist.some((e) => e.price === 849));
}

// 15 duplicate history → no-op
{
  const work = deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID);
  const snap = work.marketQuotes.castorama.wroclaw;
  const entry = snapshotToHistoryEntry(WORK_ID, snap);
  const before = appendMarketQuoteHistoryEntry(work.marketQuoteHistory, {
    ...entry,
    price: 849,
    updatedAt: T0,
  });
  const after = appendMarketQuoteHistoryEntry(before, {
    ...entry,
    price: 849,
    updatedAt: T0,
  });
  eq("15 duplicate history no-op", after.length, before.length);
}

// 16 history cap 24
{
  let hist = [];
  for (let i = 0; i < 30; i++) {
    hist = appendMarketQuoteHistoryEntry(hist, {
      workId: WORK_ID,
      price: 100 + i,
      origin: "castorama",
      regionCode: "wroclaw",
      updatedAt: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
      confidence: 0.8,
      coverage: "full",
    });
  }
  const ring = listMarketQuoteHistoryForCell(hist, WORK_ID, "castorama", "wroclaw");
  eq("16 history cap 24", ring.length, MARKET_QUOTE_HISTORY_CAP);
}

// 17 different origin → separate history
{
  let hist = appendMarketQuoteHistoryEntry([], {
    workId: WORK_ID,
    price: 10,
    origin: "castorama",
    regionCode: "wroclaw",
    updatedAt: T0,
    confidence: 0.8,
    coverage: "full",
  });
  hist = appendMarketQuoteHistoryEntry(hist, {
    workId: WORK_ID,
    price: 20,
    origin: "leroy",
    regionCode: "wroclaw",
    updatedAt: T0,
    confidence: 0.8,
    coverage: "full",
  });
  eq("17 castorama ring 1", listMarketQuoteHistoryForCell(hist, WORK_ID, "castorama", "wroclaw").length, 1);
  eq("17 leroy ring 1", listMarketQuoteHistoryForCell(hist, WORK_ID, "leroy", "wroclaw").length, 1);
}

// 18 different region → separate history
{
  let hist = appendMarketQuoteHistoryEntry([], {
    workId: WORK_ID,
    price: 10,
    origin: "wgdom",
    regionCode: "wroclaw",
    updatedAt: T0,
    confidence: 0.7,
    coverage: "indicative",
  });
  hist = appendMarketQuoteHistoryEntry(hist, {
    workId: WORK_ID,
    price: 11,
    origin: "wgdom",
    regionCode: "dolnyslask",
    updatedAt: T0,
    confidence: 0.7,
    coverage: "indicative",
  });
  eq("18 wroclaw ring", listMarketQuoteHistoryForCell(hist, WORK_ID, "wgdom", "wroclaw").length, 1);
  eq("18 dolnyslask ring", listMarketQuoteHistoryForCell(hist, WORK_ID, "wgdom", "dolnyslask").length, 1);
}

// 19 stale → HIT
{
  const staleCatalog = structuredClone(deps.get());
  const w = staleCatalog.catalogs.wroclaw.works.find((x) => x.id === WORK_ID);
  w.marketQuotes.castorama.wroclaw = {
    ...w.marketQuotes.castorama.wroclaw,
    updatedAt: T_STALE,
    price: 500,
  };
  const lookup = lookupPriceMemory({
    catalogWorkId: WORK_ID,
    materialKey: MAT,
    region: "wroclaw",
    worksById: new Map(staleCatalog.catalogs.wroclaw.works.map((x) => [x.id, x])),
    nowMs: Date.parse(T1),
  });
  eq("19 stale HIT", lookup.status, "HIT");
  ok(
    "19 freshness stale UX",
    lookup.status === "HIT" && lookup.hit.freshnessUx === "stale",
  );
  eq("19 freshness label", priceMemoryFreshnessLabelPl("stale"), "Stale");
}

// 20 no identity → MISS
{
  const lookup = lookupPriceMemory({
    catalogWorkId: null,
    materialKey: "mat.unknown_no_map_xyz",
    region: "wroclaw",
    worksById: worksMap(deps),
  });
  eq("20 no identity MISS", lookup.status, "MISS");
  ok("20 reason", lookup.status === "MISS" && lookup.reason === "no_identity");
}

// 21 no quote → MISS
{
  const empty = memoryDeps(baseCatalog());
  const lookup = lookupPriceMemory({
    catalogWorkId: WORK_ID,
    materialKey: MAT,
    region: "wroclaw",
    worksById: worksMap(empty),
  });
  eq("21 no quote MISS", lookup.status, "MISS");
  ok("21 reason no_quote", lookup.status === "MISS" && lookup.reason === "no_quote");
}

// 22–24 Purchase / company / marketQuotes semantics
ok("22 invoice ACCEPT ≠ Quotes", invoiceAcceptWritesMarketQuotes() === false);
{
  const work = deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID);
  ok("23 companyPricePln still number", typeof work.companyPricePln === "number");
  ok("24 marketQuotes LAST shape", !!work.marketQuotes?.castorama?.wroclaw?.price);
  ok("24 coverage on snapshot", !!work.marketQuotes.castorama.wroclaw.coverage);
}

// 25–27 static guarantees S1-A
{
  const src = [
    readFileSync(resolve("src/lib/price-intelligence/price-memory.ts"), "utf8"),
    readFileSync(resolve("src/lib/price-intelligence/manual-price-research.ts"), "utf8"),
    readFileSync(resolve("src/app/expert-workspace/CostDetailsPanel.tsx"), "utf8"),
    readFileSync(resolve("src/app/expert-workspace/DemandPriceResearchPanel.tsx"), "utf8"),
  ].join("\n");
  ok("25 0 external fetch", !/\bfetch\s*\(/.test(src));
  ok("26 0 SQL", !/\bCREATE TABLE\b|\bSELECT\s+\*|supabase\.from\(/i.test(src));
  ok("27 0 new KV key", !/kw-price-memory|kw-market-quote-history/i.test(src));
  ok("25b no fuzzy", !/fuzzyMatch|fuse\.js|string-similarity|levenshtein/i.test(src));
  ok("25c no LLM", !/\bopenai\b|\banthropic\b|\bchat\.completions\b/i.test(src));
}

// research brief
{
  const brief = buildManualResearchBrief(
    {
      demandId: "d1",
      materialKey: MAT,
      catalogWorkId: WORK_ID,
      normalizedName: "EPS",
      unit: "m2",
      region: "wroclaw",
      missingLayer: "MARKET_QUOTE_MISSING",
      status: "active",
      priority: "high",
      occurrenceCount: 1,
      tenderIds: ["t1"],
      firstRequestedAt: T1,
      lastRequestedAt: T1,
      reason: "PRICE DATA MISSING",
    },
    deps.get().catalogs.wroclaw.works[0],
  );
  ok("12b brief materialKey", brief.materialKey === MAT);
  ok("12b brief catalogWorkId", brief.catalogWorkId === WORK_ID);
  ok("12b brief hint legal", /legalnego|sklep/i.test(brief.hintPl));
}

// 28 S0 regression smoke
{
  const s0 = readFileSync(resolve("scripts/test-price-intelligence-demand-research-s0.mjs"), "utf8");
  ok("28 S0 test present", s0.includes("DEMAND-RESEARCH-01 S0"));
  const { mapManualProviderToQuoteOrigin } = await import("../src/lib/price-intelligence/index.ts");
  eq("28 S0 map castorama", mapManualProviderToQuoteOrigin("castorama"), "castorama");
}

// 29–33 regressions
{
  const { processInvoiceCompanyPurchaseBatch, lookupInvoiceApprovedMap, computeMissingLayer, ensurePi31EticsApprovedDataLocal } =
    await import("../src/lib/price-intelligence/index.ts");
  ok("29 P0 invoice export", typeof processInvoiceCompanyPurchaseBatch === "function");
  ok("30 P1 map export", typeof lookupInvoiceApprovedMap === "function");
  eq("32 P3.2 BOTH", computeMissingLayer({ purchaseOk: false, marketOk: false }), "BOTH_MISSING");
  ok("31 P3.1 ensure", typeof ensurePi31EticsApprovedDataLocal === "function");
  const msSrc = readFileSync(resolve("src/lib/market-sync/publish.ts"), "utf8");
  ok("33 Market Sync publish untouched", msSrc.includes("commitMarketQuotesImport"));
  ok(
    "33 no Market Sync priceHistory reuse",
    !readFileSync(resolve("src/lib/price-intelligence/price-memory.ts"), "utf8").includes(
      "priceHistory",
    ),
  );
}

console.log(`\n=== S1-A DONE: ${passed} PASS ===\n`);
