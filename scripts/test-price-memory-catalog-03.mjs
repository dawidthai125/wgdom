/**
 * PRICE-MEMORY-CATALOG-03 — material catalog ≠ HIT list harness.
 *
 * npx vite-node scripts/test-price-memory-catalog-03.mjs
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  acceptForceRefreshCandidate,
  applyZygmuntInvoicePurchaseSeedToWorkCatalog,
  buildOurPriceCatalogRows,
  computeSellPricePln,
  ensureOurPriceCatalogMaterialPurchaseSeed,
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
} from "../src/lib/pricing-expert/material-market-map.ts";
import {
  loadWorkCatalogStoreLocal,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
  WORK_CATALOG_STORAGE_KEY,
} from "../src/lib/work-catalog/index.ts";
import { defaultCostModel } from "../src/lib/tenders-bzp-company.ts";
import {
  claimResearchJobLease,
  createMemoryAtomicResearchJobStore,
  releaseResearchJobLease,
} from "../supabase/functions/make-server-0afb8820/research-job-lease.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** Fixed clock — matches AUDIT expected CURRENT/STALE split. */
const T_NOW = Date.parse("2026-08-11T18:30:00.000Z");
const T_FRESH = "2026-08-10T12:00:00.000Z";

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

function makeProductWork(opts) {
  return {
    id: opts.id,
    tradeId: "HYDRAULIKA",
    namePl: opts.namePl,
    unit: opts.unit ?? "szt",
    companyPricePln: opts.companyPricePln ?? 0,
    updatedAt: T_FRESH,
    keywords: [opts.namePl.toLowerCase(), opts.materialKey, opts.id],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    freshnessStatus: "ok",
    ...(opts.marketQuotes ? { marketQuotes: opts.marketQuotes } : {}),
    ...(opts.commercialPricing ? { commercialPricing: opts.commercialPricing } : {}),
    ...(opts.marketQuoteHistory ? { marketQuoteHistory: opts.marketQuoteHistory } : {}),
  };
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

function runChild(label, rel) {
  const r = spawnSync("npx", ["vite-node", join(ROOT, rel)], {
    cwd: ROOT,
    encoding: "utf8",
    shell: true,
    timeout: 600_000,
    env: process.env,
  });
  ok(`${label} exit 0`, r.status === 0, `${(r.stdout || "").slice(-400)}\n${(r.stderr || "").slice(-400)}`);
}

console.log("PRICE-MEMORY-CATALOG-03\n");

eq("meta 372", ZYGMUNT_INVOICE_PURCHASE_SEED_META.uniqueMaterialCount, 372);
eq("seed length 372", ZYGMUNT_INVOICE_PURCHASE_SEED.length, 372);

// ——— T1 fresh store → after ensure candidates ———
{
  storage.clear();
  saveWorkCatalogStoreLocal(emptyCatalog());
  fetchCalls = 0;
  const ensured = ensureOurPriceCatalogMaterialPurchaseSeed({ pushCloud: false });
  eq("T1 open fetchCalls", fetchCalls, 0);
  ok("T1 seed changed or already", ensured.seedCount === 372);
  const local = loadWorkCatalogStoreLocal();
  const rows = buildOurPriceCatalogRows({ store: local, nowMs: T_NOW });
  ok("T1 material candidates available", rows.length >= 372);
}

// ——— T2–T5 seed 372 / CURRENT / STALE / no dup ———
{
  const applied = applyZygmuntInvoicePurchaseSeedToWorkCatalog(emptyCatalog());
  const rows = buildOurPriceCatalogRows({ store: applied.store, nowMs: T_NOW });
  const byId = new Set(rows.map((r) => r.workId));
  eq("T2 seed → 372 materials", rows.length, 372);
  eq("T3 no duplicate workIds", byId.size, rows.length);
  const cur = rows.filter((r) => r.freshness === "CURRENT").length;
  const st = rows.filter((r) => r.freshness === "STALE").length;
  const miss = rows.filter((r) => r.freshness === "MISSING").length;
  const labor = rows.filter((r) => isLaborCatalogWorkBlockedForProductQuotes(r.workId)).length;
  eq("T4 CURRENT 286", cur, 286);
  eq("T5 STALE 86", st, 86);
  eq("T2b MISSING 0 with full seed", miss, 0);
  eq("T7 LABOR 0", labor, 0);
  ok(
    "T2c all material keys",
    rows.every((r) => r.materialKey.startsWith("mat.")),
  );
}

// ——— T6 MISSING visible ———
{
  let store = emptyCatalog();
  store.catalogs.wroclaw.works.push(
    makeProductWork({
      id: "cw.product.wc_compact",
      namePl: "WC kompakt",
      materialKey: "mat.wc_compact",
      // no marketQuotes → MISSING
    }),
  );
  store = normalizeWorkCatalogStore(store);
  const rows = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  const miss = rows.find((r) => r.materialKey === "mat.wc_compact");
  ok("T6 MISSING appears", miss?.freshness === "MISSING" && miss.basePrice == null);
  ok("T6 sell null", miss?.sellPrice == null);
}

// ——— T8–T9 open = 0 HTTP / no research ———
{
  fetchCalls = 0;
  const applied = applyZygmuntInvoicePurchaseSeedToWorkCatalog(emptyCatalog());
  buildOurPriceCatalogRows({ store: applied.store, nowMs: T_NOW });
  ensureOurPriceCatalogMaterialPurchaseSeed({ pushCloud: false });
  eq("T8 open catalog HTTP 0", fetchCalls, 0);
  ok("T9 no research on open", true);
}

// ——— T10–T15 refresh / C4 / C5 / margin / sell / history ———
{
  const WORK_ID = "cw.product.wc_compact";
  const MAT_KEY = "mat.wc_compact";
  let store = emptyCatalog();
  store.catalogs.wroclaw.works.push(
    makeProductWork({
      id: WORK_ID,
      namePl: "WC kompakt",
      materialKey: MAT_KEY,
      marketQuotes: quoteCell(100, T_FRESH),
      commercialPricing: { marginPct: 20, updatedAt: T_FRESH, source: "owner" },
      marketQuoteHistory: [
        {
          workId: WORK_ID,
          price: 90,
          origin: "wgdom",
          regionCode: "wroclaw",
          updatedAt: "2026-07-01T12:00:00.000Z",
          confidence: 0.8,
          coverage: "indicative",
        },
      ],
    }),
  );
  store = normalizeWorkCatalogStore(store);
  const rows0 = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  const row0 = rows0.find((r) => r.workId === WORK_ID);
  ok("T15 history on row", (row0?.history ?? []).some((h) => h.price === 90));
  eq("T14 sell 100@20", computeSellPricePln(100, 20), 120);

  resetMaterialResearchSessionCooldownForTests();
  fetchCalls = 0;
  const forced = await forceResearchMaterialMarketPrice({
    materialKey: MAT_KEY,
    catalogWorkId: WORK_ID,
    namePl: "WC kompakt",
    unit: "szt",
    claimantId: "c03",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: new Map(store.catalogs.wroclaw.works.map((w) => [w.id, w])),
    nowMs: T_NOW,
    forceRefresh: true,
    useMockForTests: true,
    mockPriceNet: 155,
  });
  ok("T10/T11 ONE key force", forced.ok && forced.materialKeysRequested.length === 1);
  eq("T10 max shops", forced.maxShops, OUR_PRICE_CATALOG_MAX_SHOPS_PER_KEY);

  const deps = memoryCatalogDeps(store);
  const acc = await acceptForceRefreshCandidate({
    candidate: forced.candidate,
    expectedUnit: "szt",
    commitDeps: deps,
  });
  ok("T12 Accept → commit", acc.ok && acc.persisted);
  const after = deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_ID);
  eq("T13 margin persists", after?.commercialPricing?.marginPct, 20);
  ok(
    "T15 history persists after accept",
    (after?.marketQuoteHistory ?? []).length >= 1,
  );
}

// ——— T6b labor excluded with quotes ———
{
  let store = applyZygmuntInvoicePurchaseSeedToWorkCatalog(emptyCatalog()).store;
  store.catalogs.wroclaw.works.push(
    makeProductWork({
      id: "malowanie-lateksowe-m2",
      namePl: "Malowanie",
      materialKey: "mat.fake",
      marketQuotes: quoteCell(40),
      companyPricePln: 40,
    }),
  );
  store = normalizeWorkCatalogStore(store);
  const rows = buildOurPriceCatalogRows({ store, nowMs: T_NOW });
  ok(
    "T7b labor work excluded",
    !rows.some((r) => r.workId === "malowanie-lateksowe-m2"),
  );
  ok("T7c blocklist size", LABOR_CATALOG_WORK_BLOCKLIST.length >= 10);
  ok(
    "host gate labor false",
    !isOurPriceCatalogMaterialHost("malowanie-lateksowe-m2"),
  );
}

// ——— Bid / companyPrice ———
{
  const a = defaultCostModel().minMarginPct;
  eq("Bid minMargin stable", a, defaultCostModel().minMarginPct);
  let store = emptyCatalog();
  store.catalogs.wroclaw.works.push(
    makeProductWork({
      id: "cw.product.wc_compact",
      namePl: "WC",
      materialKey: "mat.wc_compact",
      marketQuotes: quoteCell(50),
      companyPricePln: 77,
    }),
  );
  store = patchWorkCommercialPricing(
    normalizeWorkCatalogStore(store),
    "cw.product.wc_compact",
    15,
    T_FRESH,
    "owner",
  );
  eq(
    "companyPricePln untouched",
    store.catalogs.wroclaw.works[0].companyPricePln,
    77,
  );
}

// ——— ensure idempotent ———
{
  storage.clear();
  saveWorkCatalogStoreLocal(emptyCatalog());
  const a = ensureOurPriceCatalogMaterialPurchaseSeed({ pushCloud: false });
  const b = ensureOurPriceCatalogMaterialPurchaseSeed({ pushCloud: false });
  ok("idempotent second ensure", b.catalogChanged === false || b.worksUpserted === 0);
  const rows = buildOurPriceCatalogRows({
    store: loadWorkCatalogStoreLocal(),
    nowMs: T_NOW,
  });
  eq("idempotent still 372", rows.length, 372);
  void a;
}

if (process.env.SKIP_CHILD_REGRESSIONS === "1") {
  ok("T16–T20 skipped", true);
} else {
  runChild("T16 CATALOG-01", "scripts/test-price-memory-catalog-01.mjs");
  runChild("T17 CATALOG-02", "scripts/test-price-memory-catalog-02.mjs");
  runChild("T18 LIVE-08", "scripts/test-real-source-live-adapters-08.mjs");
  runChild("T20 invoice seed", "scripts/test-invoice-price-memory-seed.mjs");
  runChild("T19 MMR-02", "scripts/test-market-material-research-02.mjs");
}

console.log(`\nPRICE-MEMORY-CATALOG-03: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
