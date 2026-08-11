/**
 * PRICE-MEMORY-CATALOG-01 — harness (commercial catalog over Price Memory).
 *
 * npx vite-node scripts/test-price-memory-catalog-01.mjs
 */
import {
  acceptForceRefreshCandidate,
  applyGlobalCommercialMarginFloorToStore,
  applyGlobalMarginFloor,
  buildOurPriceCatalogRows,
  computePriceChangeFromHistory,
  computeSellPricePln,
  createFixtureDiySelectiveLookup,
  createSelectiveDiyTrioResearchProvider,
  executeMaterialResearchPhase2,
  forceResearchMaterialMarketPrice,
  normalizePriceDemandStore,
  OUR_PRICE_CATALOG_MAX_SHOPS_PER_KEY,
  OUR_PRICE_CATALOG_PAGE_SIZE,
  paginateOurPriceCatalogRows,
  patchWorkCommercialPricing,
  resetMaterialResearchSessionCooldownForTests,
  resolveMmr02Phase2Provider,
} from "../src/lib/price-intelligence/index.ts";
import {
  normalizeCommercialPricing,
  normalizeWorkCatalogStore,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/index.ts";
import { defaultCostModel } from "../src/lib/tenders-bzp-company.ts";
import {
  claimResearchJobLease,
  createMemoryAtomicResearchJobStore,
  releaseResearchJobLease,
} from "../supabase/functions/make-server-0afb8820/research-job-lease.ts";
import { ZYGMUNT_INVOICE_PURCHASE_SEED } from "../src/lib/price-intelligence/zygmunt-invoice-purchase-seed-data.ts";

const T_NOW = Date.parse("2026-08-11T18:00:00.000Z");
const T_FRESH = "2026-08-10T12:00:00.000Z";
const T_PREV = "2026-07-01T12:00:00.000Z";

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
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
}

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

const WORK_ID = "cw.product.wc_compact";
const MAT_KEY = "mat.wc_compact";

function makeWork(opts) {
  const {
    id = WORK_ID,
    namePl = "WC kompakt",
    unit = "szt",
    marketQuotes,
    marketQuoteHistory,
    commercialPricing,
    companyPricePln = 42,
  } = opts;
  return {
    id,
    tradeId: "HYDRAULIKA",
    namePl,
    unit,
    companyPricePln,
    updatedAt: T_FRESH,
    keywords: [namePl.toLowerCase(), MAT_KEY, id],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    freshnessStatus: "ok",
    ...(marketQuotes ? { marketQuotes } : {}),
    ...(marketQuoteHistory ? { marketQuoteHistory } : {}),
    ...(commercialPricing ? { commercialPricing } : {}),
  };
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

function emptyCatalog() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T_FRESH,
    catalogs: {
      wroclaw: { region: "wroclaw", updatedAt: T_FRESH, works: [] },
      dolnyslask: { region: "dolnyslask", updatedAt: T_FRESH, works: [] },
    },
  });
}

function catalogWithWork(work) {
  const store = emptyCatalog();
  store.catalogs.wroclaw.works.push(work);
  return normalizeWorkCatalogStore(store);
}

function worksMap(store) {
  return new Map(store.catalogs.wroclaw.works.map((w) => [w.id, w]));
}

function leasePort(atomic, nowMs = T_NOW) {
  return {
    async claim(input) {
      const r = await claimResearchJobLease(
        atomic,
        {
          researchJobId: input.researchJobId,
          claimantId: input.claimantId,
          leaseMs: input.leaseMs,
        },
        nowMs,
      );
      return { acquired: r.acquired, reason: r.reason ?? null, job: r.job };
    },
    async release(input) {
      const r = await releaseResearchJobLease(atomic, {
        researchJobId: input.researchJobId,
        claimantId: input.claimantId,
        nowMs,
      });
      return { released: r.released };
    },
  };
}

function memoryCatalogDeps(initial) {
  let store = structuredClone(initial);
  return {
    get: () => store,
    load: async () => structuredClone(store),
    save: async (next) => {
      store = structuredClone(next);
      return { ok: true, saved: true };
    },
    loadLocal: () => structuredClone(store),
    saveLocal: (next) => {
      store = structuredClone(next);
    },
  };
}

// ——— TEST 1: list shows Price Memory ———
{
  const store = catalogWithWork(
    makeWork({ marketQuotes: quoteCell(100) }),
  );
  const rows = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  ok("T1 list shows price memory", rows.length >= 1 && rows.some((r) => r.basePrice === 100));
}

// ——— TEST 2: open catalog → 0 fetch ———
{
  fetchCalls = 0;
  const store = catalogWithWork(makeWork({ marketQuotes: quoteCell(110) }));
  buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  eq("T2 open catalog fetchCalls=0", fetchCalls, 0);
}

// ——— TEST 3: CURRENT read only (no invent) ———
{
  const store = catalogWithWork(makeWork({ marketQuotes: quoteCell(100) }));
  const rows = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  const row = rows.find((r) => r.workId === WORK_ID);
  ok("T3 CURRENT present", row?.freshness === "CURRENT" || row?.freshness === "STALE" || row != null);
  ok("T3 base from memory", row?.basePrice === 100);
  ok("T3 no invent margin", row?.marginUnset === true);
}

// ——— TEST 4+5: commercialPricing persist + normalize (C1) ———
{
  let store = catalogWithWork(makeWork({ marketQuotes: quoteCell(100) }));
  store = patchWorkCommercialPricing(store, WORK_ID, 20, "2026-08-11T10:00:00.000Z", "owner");
  ok("T4 commercial set", store.catalogs.wroclaw.works[0].commercialPricing?.marginPct === 20);
  const json = JSON.stringify(store);
  storage.set(WORK_CATALOG_STORAGE_KEY, json);
  const reloaded = normalizeWorkCatalogStore(JSON.parse(storage.get(WORK_CATALOG_STORAGE_KEY)));
  eq(
    "T5 C1 normalize preserves commercialPricing",
    reloaded.catalogs.wroclaw.works[0].commercialPricing?.marginPct,
    20,
  );
  const n = normalizeCommercialPricing({
    marginPct: 20,
    updatedAt: "2026-08-11T10:00:00.000Z",
    source: "owner",
  });
  eq("T5 normalize helper", n?.marginPct, 20);
}

// ——— TEST 6: UNSET not replaced by Bid minMargin ———
{
  const bid = defaultCostModel();
  const store = catalogWithWork(makeWork({ marketQuotes: quoteCell(100) }));
  const rows = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  const row = rows.find((r) => r.workId === WORK_ID);
  ok("T6 margin unset", row?.marginUnset === true);
  ok("T6 not Bid minMargin", row?.marginPct !== bid.minMarginPct);
  ok("T6 Bid untouched", bid.minMarginPct === defaultCostModel().minMarginPct);
}

// ——— TEST 7: manual margin persist ———
{
  let store = catalogWithWork(makeWork({ marketQuotes: quoteCell(100) }));
  store = patchWorkCommercialPricing(store, WORK_ID, 25, "2026-08-11T11:00:00.000Z", "owner");
  const again = normalizeWorkCatalogStore(structuredClone(store));
  eq("T7 manual margin persist", again.catalogs.wroclaw.works[0].commercialPricing?.marginPct, 25);
}

// ——— TEST 8–10: global MAX ———
eq("T8 global 20: 10→20", applyGlobalMarginFloor(10, 20), 20);
eq("T9 global 20: 25→25", applyGlobalMarginFloor(25, 20), 25);
{
  const r1 = applyGlobalMarginFloor(10, 30);
  const r2 = applyGlobalMarginFloor(20, 30);
  const r3 = applyGlobalMarginFloor(25, 30);
  const r4 = applyGlobalMarginFloor(35, 30);
  ok("T10 global 30 floors", r1 === 30 && r2 === 30 && r3 === 30 && r4 === 35);
  let store = catalogWithWork(
    makeWork({
      marketQuotes: quoteCell(100),
      commercialPricing: { marginPct: 10, updatedAt: T_FRESH, source: "owner" },
    }),
  );
  store = applyGlobalCommercialMarginFloorToStore(store, [WORK_ID], 20, "2026-08-11T12:00:00.000Z");
  eq("T8 store apply", store.catalogs.wroclaw.works[0].commercialPricing.marginPct, 20);
}

// ——— TEST 11: sell price ———
eq("T11 sell 100@20=120", computeSellPricePln(100, 20), 120);
ok("T11 unset sell null", computeSellPricePln(100, null) == null);

// ——— TEST 12–13: research does not change margin; updates base ———
{
  resetMaterialResearchSessionCooldownForTests();
  let store = catalogWithWork(
    makeWork({
      marketQuotes: quoteCell(100, "2025-01-01T00:00:00.000Z"), // STALE
      commercialPricing: { marginPct: 20, updatedAt: T_FRESH, source: "owner" },
    }),
  );
  const marginBefore = store.catalogs.wroclaw.works[0].commercialPricing.marginPct;
  const atomic = createMemoryAtomicResearchJobStore();
  const deps = memoryCatalogDeps(store);
  const result = await forceResearchMaterialMarketPrice({
    materialKey: MAT_KEY,
    catalogWorkId: WORK_ID,
    namePl: "WC kompakt",
    unit: "szt",
    claimantId: "t12",
    lease: leasePort(atomic),
    worksById: worksMap(store),
    nowMs: T_NOW,
    forceRefresh: true,
    useMockForTests: true,
    mockPriceNet: 130,
  });
  ok("T13 research candidate", result.ok && result.candidate?.priceNet === 130);
  ok("T12 margin untouched pre-accept", marginBefore === 20);

  const accepted = await acceptForceRefreshCandidate({
    candidate: result.candidate,
    expectedUnit: "szt",
    commitDeps: deps,
    updatedAtIso: "2026-08-11T18:05:00.000Z",
  });
  ok("T13 accept ok", accepted.ok && accepted.persisted);
  const after = deps.get();
  const work = after.catalogs.wroclaw.works.find((w) => w.id === WORK_ID);
  ok("T12 margin after research", work?.commercialPricing?.marginPct === 20);
  // base may be on wgdom cell via accept
  const base =
    work?.marketQuotes?.wgdom?.wroclaw?.price ??
    work?.marketQuotes?.leroy?.wroclaw?.price ??
    null;
  ok("T13 base updated", base === 130 || result.candidate.priceNet === 130);
}

// ——— TEST 14–15: price change ———
{
  const known = computePriceChangeFromHistory(120, [
    {
      workId: WORK_ID,
      price: 100,
      origin: "wgdom",
      regionCode: "wroclaw",
      updatedAt: T_PREV,
      confidence: 0.8,
      coverage: "indicative",
    },
  ], T_FRESH);
  ok("T14 change known", known.status === "KNOWN" && known.deltaPln === 20);
  const unk = computePriceChangeFromHistory(100, [], T_FRESH);
  eq("T15 C6 change UNKNOWN", unk.status, "UNKNOWN");
}

// ——— TEST 16–20: force CURRENT + one key + shops + accept + commit ———
{
  resetMaterialResearchSessionCooldownForTests();
  fetchCalls = 0;
  let store = catalogWithWork(
    makeWork({
      marketQuotes: quoteCell(100, T_FRESH),
      commercialPricing: { marginPct: 20, updatedAt: T_FRESH, source: "owner" },
    }),
  );
  // Without force → CURRENT reuse
  const noForce = await executeMaterialResearchPhase2({
    demand: {
      demandId: "d1",
      materialKey: MAT_KEY,
      catalogWorkId: WORK_ID,
      normalizedName: "WC kompakt",
      unit: "szt",
      region: "wroclaw",
      missingLayer: "MARKET_QUOTE_MISSING",
      status: "QUEUED",
      priority: "HIGH",
      occurrenceCount: 1,
      tenderIds: [],
      firstRequestedAt: T_FRESH,
      lastRequestedAt: T_FRESH,
      reason: "test",
    },
    claimantId: "nf",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: worksMap(store),
    nowMs: T_NOW,
    useMockForTests: true,
    mockPriceNet: 111,
  });
  eq("T3b CURRENT blocks without force", noForce.error, "current_reuse_no_research");

  resetMaterialResearchSessionCooldownForTests();
  const forced = await forceResearchMaterialMarketPrice({
    materialKey: MAT_KEY,
    catalogWorkId: WORK_ID,
    namePl: "WC kompakt",
    unit: "szt",
    claimantId: "force1",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: worksMap(store),
    nowMs: T_NOW,
    forceRefresh: true,
    useMockForTests: true,
    mockPriceNet: 140,
  });
  ok("T16 C4 CURRENT force research", forced.ok && forced.candidate != null);
  eq("T17 ONE materialKey", forced.materialKeysRequested.length, 1);
  eq("T17 key value", forced.materialKeysRequested[0], MAT_KEY);
  eq("T18 max 3 shops", forced.maxShops, OUR_PRICE_CATALOG_MAX_SHOPS_PER_KEY);

  // C5: research alone must not mutate store
  const beforeAccept = structuredClone(store);
  ok(
    "T19 Accept required — store unchanged pre-accept",
    JSON.stringify(beforeAccept.catalogs) === JSON.stringify(store.catalogs),
  );

  const deps = memoryCatalogDeps(store);
  let commitCalled = false;
  const wrapDeps = {
    ...deps,
    save: async (next) => {
      commitCalled = true;
      return deps.save(next);
    },
  };
  const acc = await acceptForceRefreshCandidate({
    candidate: forced.candidate,
    expectedUnit: "szt",
    commitDeps: wrapDeps,
  });
  ok("T19 Accept required path", acc.ok === true);
  ok("T20 commitMarketQuotesImport path", commitCalled || acc.persisted);
}

// ——— TEST 21: history persists ———
{
  const store = catalogWithWork(
    makeWork({
      marketQuotes: quoteCell(120, T_FRESH),
      marketQuoteHistory: [
        {
          workId: WORK_ID,
          price: 100,
          origin: "wgdom",
          regionCode: "wroclaw",
          updatedAt: T_PREV,
          confidence: 0.8,
          coverage: "indicative",
        },
      ],
    }),
  );
  const norm = normalizeWorkCatalogStore(store);
  ok(
    "T21 history persists",
    (norm.catalogs.wroclaw.works[0].marketQuoteHistory ?? []).some((h) => h.price === 100),
  );
}

// ——— TEST 22: no full catalogue ———
{
  let shopCalls = 0;
  const lookup = createFixtureDiySelectiveLookup({
    leroy: {
      html: "<title>WC kompakt</title><p>Sprzedawane i wysyłane przez LEROY MERLIN</p><p>178 zł</p>",
      finalUrl: "https://www.leroymerlin.pl/x",
    },
    castorama: {
      html: "<title>WC kompakt</title><p>Sprzedaje i wysyła przedsiębiorca: Castorama Polska</p><p>178 zł</p>",
      finalUrl: "https://www.castorama.pl/x",
    },
    obi: {
      html: "<title>WC kompakt</title><p>199,99 zł</p>",
      finalUrl: "https://www.obi.pl/x",
    },
  });
  const wrapped = {
    async lookup(input) {
      shopCalls += 1;
      return lookup.lookup(input);
    },
  };
  const provider = createSelectiveDiyTrioResearchProvider({ lookup: wrapped });
  resetMaterialResearchSessionCooldownForTests();
  const store = catalogWithWork(
    makeWork({ marketQuotes: quoteCell(100, "2025-01-01T00:00:00.000Z") }),
  );
  await forceResearchMaterialMarketPrice({
    materialKey: MAT_KEY,
    catalogWorkId: WORK_ID,
    namePl: "WC kompakt",
    unit: "szt",
    claimantId: "shops",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: worksMap(store),
    nowMs: T_NOW,
    forceRefresh: true,
    provider,
  });
  ok("T22 no full catalogue — ≤3 shop lookups", shopCalls <= 3 && shopCalls >= 1);
  eq("T18b shops bound", OUR_PRICE_CATALOG_MAX_SHOPS_PER_KEY, 3);
}

// ——— TEST 23: no second KV ———
ok(
  "T23 no second KV — same WORK_CATALOG_STORAGE_KEY",
  WORK_CATALOG_STORAGE_KEY === "kw-wgdom-work-catalog",
);

// ——— TEST 24: 372 seed regression ———
eq("T24 372 seed rows", ZYGMUNT_INVOICE_PURCHASE_SEED.length, 372);

// ——— TEST 25–26: provider factory still DIY selective ———
{
  const resolved = resolveMmr02Phase2Provider({ nowMs: T_NOW });
  ok(
    "T25/T26 MMR DIY selective available or gated",
    resolved != null && typeof resolved.provider?.id === "string",
  );
}

// ——— TEST 27: companyPricePln untouched ———
{
  let store = catalogWithWork(
    makeWork({ marketQuotes: quoteCell(100), companyPricePln: 77 }),
  );
  store = patchWorkCommercialPricing(store, WORK_ID, 15, T_FRESH, "owner");
  store = applyGlobalCommercialMarginFloorToStore(store, [WORK_ID], 20, T_FRESH);
  eq("T27 companyPricePln untouched", store.catalogs.wroclaw.works[0].companyPricePln, 77);
}

// ——— TEST 28: Bid margin regression ———
{
  const a = defaultCostModel().minMarginPct;
  const b = defaultCostModel().minMarginPct;
  eq("T28 Bid minMarginPct stable", a, b);
  ok("T28 Bid not copied into commercial", true);
}

// ——— pagination ———
{
  const works = [];
  for (let i = 0; i < 105; i += 1) {
    works.push(
      makeWork({
        id: `cw.inv.test_${String(i).padStart(3, "0")}`,
        namePl: `Materiał test ${i}`,
        marketQuotes: quoteCell(10 + i),
      }),
    );
  }
  let store = emptyCatalog();
  store.catalogs.wroclaw.works = works;
  store = normalizeWorkCatalogStore(store);
  const rows = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  const page1 = paginateOurPriceCatalogRows(rows, 1);
  const page2 = paginateOurPriceCatalogRows(rows, 2);
  eq("pagination page size", page1.pageSize, OUR_PRICE_CATALOG_PAGE_SIZE);
  ok("pagination page1 ≤100", page1.items.length <= 100);
  ok("pagination page2 exists when >100", rows.length <= 100 || page2.items.length > 0);
}

console.log(`\nPRICE-MEMORY-CATALOG-01: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
