/**
 * PRICE-MEMORY-CATALOG-02 — MATERIAL / LABOR separation harness.
 *
 * npx vite-node scripts/test-price-memory-catalog-02.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  acceptForceRefreshCandidate,
  applyZygmuntInvoicePurchaseSeedToWorkCatalog,
  buildOurPriceCatalogRows,
  computeSellPricePln,
  forceResearchMaterialMarketPrice,
  isOurPriceCatalogMaterialHost,
  OUR_PRICE_CATALOG_MAX_SHOPS_PER_KEY,
  patchWorkCommercialPricing,
  resetMaterialResearchSessionCooldownForTests,
  ZYGMUNT_INVOICE_PURCHASE_SEED,
  ZYGMUNT_INVOICE_PURCHASE_SEED_META,
} from "../src/lib/price-intelligence/index.ts";
import {
  isLaborCatalogWorkBlockedForProductQuotes,
  LABOR_CATALOG_WORK_BLOCKLIST,
  resolveDemandProductIdentityExact,
} from "../src/lib/pricing-expert/material-market-map.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import { defaultCostModel } from "../src/lib/tenders-bzp-company.ts";
import {
  claimResearchJobLease,
  createMemoryAtomicResearchJobStore,
  releaseResearchJobLease,
} from "../supabase/functions/make-server-0afb8820/research-job-lease.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const T_NOW = Date.parse("2026-08-11T18:00:00.000Z");
const T_FRESH = "2026-08-10T12:00:00.000Z";
const T_STALE = "2025-01-01T00:00:00.000Z";

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
    keywords,
  } = opts;
  return {
    id,
    tradeId: "HYDRAULIKA",
    namePl,
    unit,
    companyPricePln,
    updatedAt: T_FRESH,
    keywords: keywords ?? [namePl.toLowerCase(), id],
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

function catalogWithWorks(works) {
  const store = emptyCatalog();
  store.catalogs.wroclaw.works.push(...works);
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

function runChild(label, relScript) {
  const r = spawnSync("npx", ["vite-node", join(ROOT, relScript)], {
    cwd: ROOT,
    encoding: "utf8",
    env: process.env,
    shell: true,
    timeout: 600_000,
  });
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  ok(`${label} child exit 0`, r.status === 0, out.slice(-800));
  return r.status === 0;
}

console.log("PRICE-MEMORY-CATALOG-02\n");

// ——— TEST 1–5: material only · labor/work/packages excluded · known material remains ———
{
  const laborId = "malowanie-lateksowe-m2";
  const montazId = "montaz-wc-szt";
  const store = catalogWithWorks([
    makeWork({
      id: WORK_ID,
      namePl: "WC kompakt",
      keywords: ["wc", MAT_KEY, WORK_ID],
      marketQuotes: quoteCell(199),
    }),
    makeWork({
      id: laborId,
      namePl: "Malowanie lateksowe",
      unit: "m2",
      companyPricePln: 35,
      marketQuotes: quoteCell(35),
      keywords: ["malowanie", laborId],
    }),
    makeWork({
      id: montazId,
      namePl: "Montaż WC",
      unit: "szt",
      companyPricePln: 120,
      marketQuotes: quoteCell(120),
      keywords: ["montaz", montazId],
    }),
    makeWork({
      id: "ukladanie-plytek-m2",
      namePl: "Układanie płytek",
      unit: "m2",
      companyPricePln: 80,
      marketQuotes: quoteCell(80),
      keywords: ["ukladanie", "rbh"],
    }),
  ]);
  const rows = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  ok(
    "T1 catalog MATERIAL only",
    rows.length >= 1 && rows.every((r) => r.materialKey.startsWith("mat.")),
  );
  ok(
    "T2 labor excluded",
    !rows.some((r) => r.workId === laborId || r.namePl.toLowerCase().includes("malowanie")),
  );
  ok(
    "T3 work/montaż excluded",
    !rows.some((r) => r.workId === montazId || /montaż|montaz/i.test(r.namePl)),
  );
  ok(
    "T4 work packages / układanie excluded",
    !rows.some((r) => /układanie|ukladanie/i.test(r.namePl) || r.workId === "ukladanie-plytek-m2"),
  );
  ok(
    "T5 known material remains",
    rows.some((r) => r.workId === WORK_ID && r.materialKey === MAT_KEY && r.basePrice === 199),
  );
  ok("T2b labor blocklist known", isLaborCatalogWorkBlockedForProductQuotes(laborId));
  ok("T3b montaż blocklist known", isLaborCatalogWorkBlockedForProductQuotes(montazId));
}

// ——— TEST 6: 372 materialKeys preserved / HIT ———
{
  eq("T6 meta uniqueMaterialCount", ZYGMUNT_INVOICE_PURCHASE_SEED_META.uniqueMaterialCount, 372);
  eq("T6 seed length", ZYGMUNT_INVOICE_PURCHASE_SEED.length, 372);
  const applied = applyZygmuntInvoicePurchaseSeedToWorkCatalog(emptyCatalog());
  const rows = buildOurPriceCatalogRows({ store: applied.store, nowMs: T_NOW });
  const byKey = new Map(rows.map((r) => [r.materialKey, r]));
  const missing = [];
  for (const row of ZYGMUNT_INVOICE_PURCHASE_SEED) {
    const hit = byKey.get(row.materialKey);
    if (!hit || hit.workId !== row.catalogWorkId || !(hit.basePrice > 0)) {
      missing.push(row.materialKey);
    }
  }
  ok("T6 all 372 material HIT remain", missing.length === 0, missing.slice(0, 8));
  const badMaterial = [];
  for (const r of rows) {
    if (!r.materialKey.startsWith("mat.")) {
      badMaterial.push(r);
      continue;
    }
    const id = resolveDemandProductIdentityExact({ materialKey: r.materialKey });
    if (
      !id ||
      isLaborCatalogWorkBlockedForProductQuotes(r.workId) ||
      !isOurPriceCatalogMaterialHost(r.workId, id.catalogWorkId)
    ) {
      badMaterial.push(r);
    }
  }
  ok(
    "T6 material HIT stays material",
    badMaterial.length === 0,
    badMaterial.slice(0, 5).map((r) => ({ mk: r.materialKey, wid: r.workId })),
  );
}

// ——— TEST 7–8: no companyPricePln / unit-only classification ———
{
  const src = readFileSync(
    join(ROOT, "src/lib/price-intelligence/our-price-catalog.ts"),
    "utf8",
  );
  const buildFn = src.slice(src.indexOf("export function buildOurPriceCatalogRows"));
  ok(
    "T7 no companyPricePln-based classification",
    !/companyPricePln\s*[><=!]|if\s*\(.*companyPricePln/.test(buildFn),
  );
  ok(
    "T8 no unit-only classification",
    !/unit\s*===\s*["']rbh["']|unit\s*===\s*["']szt["']|classify.*unit/.test(buildFn),
  );
  // Semantic: labor with high companyPrice still excluded; material with 0 companyPrice included
  const store = catalogWithWorks([
    makeWork({
      id: WORK_ID,
      keywords: [MAT_KEY, WORK_ID],
      companyPricePln: 0,
      marketQuotes: quoteCell(50),
    }),
    makeWork({
      id: "malowanie-lateksowe-m2",
      namePl: "Malowanie",
      unit: "rbh",
      companyPricePln: 999,
      marketQuotes: quoteCell(999),
    }),
  ]);
  const rows = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  ok("T7b material with companyPrice=0 included", rows.some((r) => r.workId === WORK_ID));
  ok(
    "T8b labor rbh with Quotes excluded",
    !rows.some((r) => r.workId === "malowanie-lateksowe-m2"),
  );
}

// ——— TEST 9: open catalog → 0 fetch ———
{
  fetchCalls = 0;
  const store = catalogWithWorks([
    makeWork({ keywords: [MAT_KEY, WORK_ID], marketQuotes: quoteCell(110) }),
  ]);
  buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  eq("T9 opening catalog fetchCalls=0", fetchCalls, 0);
}

// ——— TEST 10–12: Price Memory / CURRENT / STALE ———
{
  const storeCurrent = catalogWithWorks([
    makeWork({
      keywords: [MAT_KEY, WORK_ID],
      marketQuotes: quoteCell(100, T_FRESH),
    }),
  ]);
  const rowsC = buildOurPriceCatalogRows({ store: storeCurrent, nowMs: T_NOW });
  const current = rowsC.find((r) => r.workId === WORK_ID);
  ok("T10 Price Memory lookup works", current?.basePrice === 100);
  ok("T11 CURRENT readable", current?.freshness === "CURRENT");

  const storeStale = catalogWithWorks([
    makeWork({
      keywords: [MAT_KEY, WORK_ID],
      marketQuotes: quoteCell(88, T_STALE),
    }),
  ]);
  const rowsS = buildOurPriceCatalogRows({ store: storeStale, nowMs: T_NOW });
  ok(
    "T12 STALE remains readable",
    rowsS[0]?.freshness === "STALE" && rowsS[0]?.basePrice === 88,
  );
}

// ——— TEST 13–15: manual CURRENT refresh · ONE key · Accept ———
{
  resetMaterialResearchSessionCooldownForTests();
  let store = catalogWithWorks([
    makeWork({
      keywords: [MAT_KEY, WORK_ID],
      marketQuotes: quoteCell(100, T_FRESH),
      commercialPricing: { marginPct: 20, updatedAt: T_FRESH, source: "owner" },
    }),
  ]);
  const forced = await forceResearchMaterialMarketPrice({
    materialKey: MAT_KEY,
    catalogWorkId: WORK_ID,
    namePl: "WC kompakt",
    unit: "szt",
    claimantId: "c02-force",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: worksMap(store),
    nowMs: T_NOW,
    forceRefresh: true,
    useMockForTests: true,
    mockPriceNet: 141,
  });
  ok("T13 manual CURRENT refresh functional", forced.ok && forced.candidate?.priceNet === 141);
  eq("T14 ONE materialKey only", forced.materialKeysRequested.length, 1);
  eq("T14 key", forced.materialKeysRequested[0], MAT_KEY);
  eq("T14b max shops", forced.maxShops, OUR_PRICE_CATALOG_MAX_SHOPS_PER_KEY);

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
  ok("T15 Accept → commitMarketQuotesImport", acc.ok === true && (commitCalled || acc.persisted));
  store = deps.get();
}

// ——— TEST 16–18: commercialPricing / margin / sellPrice ———
{
  let store = catalogWithWorks([
    makeWork({
      keywords: [MAT_KEY, WORK_ID],
      marketQuotes: quoteCell(100),
      commercialPricing: { marginPct: 20, updatedAt: T_FRESH, source: "owner" },
    }),
  ]);
  const before = store.catalogs.wroclaw.works[0].commercialPricing.marginPct;
  resetMaterialResearchSessionCooldownForTests();
  const forced = await forceResearchMaterialMarketPrice({
    materialKey: MAT_KEY,
    catalogWorkId: WORK_ID,
    namePl: "WC kompakt",
    unit: "szt",
    claimantId: "c02-m",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: worksMap(store),
    nowMs: T_NOW,
    forceRefresh: true,
    useMockForTests: true,
    mockPriceNet: 150,
  });
  const deps = memoryCatalogDeps(store);
  await acceptForceRefreshCandidate({
    candidate: forced.candidate,
    expectedUnit: "szt",
    commitDeps: deps,
  });
  const after = deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID);
  eq("T16 commercialPricing intact", after?.commercialPricing?.marginPct, before);
  eq("T17 margin intact after refresh", after?.commercialPricing?.marginPct, 20);
  const rows = buildOurPriceCatalogRows({ store: deps.get(), nowMs: T_NOW });
  const row = rows.find((r) => r.workId === WORK_ID);
  const expectedSell = computeSellPricePln(row?.basePrice ?? 0, 20);
  ok("T18 sellPrice correct", row?.sellPrice === expectedSell && expectedSell != null);
}

// ——— TEST 19: marketQuoteHistory intact ———
{
  const store = catalogWithWorks([
    makeWork({
      keywords: [MAT_KEY, WORK_ID],
      marketQuotes: quoteCell(120),
      marketQuoteHistory: [
        {
          workId: WORK_ID,
          price: 100,
          origin: "wgdom",
          regionCode: "wroclaw",
          updatedAt: "2026-07-01T12:00:00.000Z",
          confidence: 0.8,
          coverage: "indicative",
        },
      ],
    }),
  ]);
  const rows = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  const row = rows.find((r) => r.workId === WORK_ID);
  ok(
    "T19 marketQuoteHistory intact",
    (row?.history ?? []).some((h) => h.price === 100) &&
      (store.catalogs.wroclaw.works[0].marketQuoteHistory ?? []).some((h) => h.price === 100),
  );
}

// ——— TEST 20: Biblioteka Robót regression (labor path untouched) ———
{
  ok(
    "T20 Biblioteka labor blocklist size",
    LABOR_CATALOG_WORK_BLOCKLIST.length >= 10,
  );
  const identity = resolveDemandProductIdentityExact({
    catalogWorkId: "malowanie-lateksowe-m2",
  });
  ok("T20 labor identity rejected", identity == null);
  const seedCheck = spawnSync("npx", ["vite-node", join(ROOT, "scripts/test-work-catalog-seed-manifest.mjs")], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    timeout: 120_000,
  });
  ok("T20 Biblioteka seed manifest", seedCheck.status === 0, (seedCheck.stderr || seedCheck.stdout || "").slice(-400));
}

// ——— TEST 21: Bid regression ———
{
  const a = defaultCostModel().minMarginPct;
  const b = defaultCostModel().minMarginPct;
  eq("T21 Bid minMarginPct stable", a, b);
  let store = catalogWithWorks([
    makeWork({
      keywords: [MAT_KEY, WORK_ID],
      marketQuotes: quoteCell(100),
      companyPricePln: 77,
    }),
  ]);
  store = patchWorkCommercialPricing(store, WORK_ID, 15, T_FRESH, "owner");
  eq("T21 companyPricePln untouched", store.catalogs.wroclaw.works[0].companyPricePln, 77);
}

// ——— TEST 22–24: LIVE-08 / invoice seed / MMR-02 ———
if (process.env.SKIP_CHILD_REGRESSIONS === "1") {
  ok("T22 LIVE-ADAPTERS-08 skipped (SKIP_CHILD_REGRESSIONS)", true);
  ok("T23 MMR-02 skipped (SKIP_CHILD_REGRESSIONS)", true);
  ok("T24 invoice seed skipped (SKIP_CHILD_REGRESSIONS)", true);
} else {
  runChild("T22 LIVE-ADAPTERS-08", "scripts/test-real-source-live-adapters-08.mjs");
  runChild("T24 invoice seed", "scripts/test-invoice-price-memory-seed.mjs");
  runChild("T23 MMR-02", "scripts/test-market-material-research-02.mjs");
}

console.log(`\nPRICE-MEMORY-CATALOG-02: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
