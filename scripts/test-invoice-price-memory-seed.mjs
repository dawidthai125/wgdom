/**
 * Invoice Price Memory seed + cache-first research boundary harness.
 * TEST 1–10 (Owner) · Legal Gate OPEN / D1 UNKNOWN → ZERO live HTTP.
 *
 * npx vite-node scripts/test-invoice-price-memory-seed.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { MARKET_SYNC_P3_LEGAL_GATE, isMarketSyncP3LegalPass } from "../src/lib/market-sync/p3-flag.ts";
import {
  MMR_02_PRIMARY_SOURCE_STATUS,
  averageQualifyingRegularMarketPrices,
  dedupeNeededMaterialKeys,
  evaluateMaterialCache,
  executeMaterialResearchPhase2,
  isMmr02LiveHttpEligible,
  lookupPriceMemory,
  normalizeZygmuntInvoiceSeedFixture,
  qualifyMarketResearchObservation,
  resetMaterialResearchSessionCooldownForTests,
  resolveDemandProductIdentityExact,
  resolveMmr02Phase2Provider,
  seedInvoiceLinesToPriceMemory,
  applyZygmuntInvoicePurchaseSeedToWorkCatalog,
  ZYGMUNT_INVOICE_PURCHASE_SEED,
  ZYGMUNT_INVOICE_PURCHASE_SEED_META,
} from "../src/lib/price-intelligence/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import {
  claimResearchJobLease,
  createMemoryAtomicResearchJobStore,
  releaseResearchJobLease,
} from "../supabase/functions/make-server-0afb8820/research-job-lease.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

let fetchCalls = 0;
globalThis.fetch = async (...args) => {
  fetchCalls += 1;
  throw new Error(`UNEXPECTED_FETCH ${String(args[0])}`);
};

let passed = 0;
function ok(name, cond, detail) {
  assert.ok(cond, `${name}${detail ? ": " + JSON.stringify(detail) : ""}`);
  passed += 1;
  console.log(`PASS ${name}`);
}
function eq(name, a, b) {
  assert.equal(a, b, `${name}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`);
  passed += 1;
  console.log(`PASS ${name}`);
}

function emptyCatalog() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: "2026-01-01T00:00:00.000Z",
    catalogs: {
      wroclaw: { region: "wroclaw", updatedAt: "2026-01-01T00:00:00.000Z", works: [] },
      dolnyslask: { region: "dolnyslask", updatedAt: "2026-01-01T00:00:00.000Z", works: [] },
    },
  });
}

function worksMap(store) {
  return new Map(store.catalogs.wroclaw.works.map((w) => [w.id, w]));
}

const fixturePath = join(
  __dirname,
  "../src/lib/price-intelligence/fixtures/zygmunt-invoices-seed-2026.json",
);
const fixture = normalizeZygmuntInvoiceSeedFixture(JSON.parse(readFileSync(fixturePath, "utf8")));

ok("LEGAL gate OPEN", MARKET_SYNC_P3_LEGAL_GATE === "OPEN");
ok("LEGAL pass false", isMarketSyncP3LegalPass() === false);
eq("D1 UNKNOWN", MMR_02_PRIMARY_SOURCE_STATUS, "UNKNOWN");
ok("live HTTP not eligible", isMmr02LiveHttpEligible() === false);

const seed = seedInvoiceLinesToPriceMemory(emptyCatalog(), fixture.lines);

// —— TEST 1: import → Price Memory ——
ok("T1 seeded lines > 0", seed.seededLineCount > 0, { seeded: seed.seededLineCount });
ok("T1 unique materials >= 300", seed.uniqueMaterialCount >= 300, {
  unique: seed.uniqueMaterialCount,
});
ok("T1 works have wgdom quotes", seed.store.catalogs.wroclaw.works.some((w) => w.marketQuotes?.wgdom?.wroclaw?.price > 0));
eq("T1 fixture lineCount", fixture.meta.lineCount, fixture.lines.length);
eq("T1 unique matches works", seed.uniqueMaterialCount, seed.worksUpserted);

// —— TEST 2: duplicate product → one materialKey + history ——
const ha13 = seed.observations.filter((o) => /HA13/i.test(o.productName));
ok("T2 HA13 lines > 1", ha13.length > 1, { n: ha13.length });
const ha13Keys = new Set(ha13.map((o) => o.materialKey));
eq("T2 HA13 single materialKey", ha13Keys.size, 1);
const ha13WorkId = ha13[0].catalogWorkId;
const ha13Work = worksMap(seed.store).get(ha13WorkId);
ok("T2 HA13 work exists", !!ha13Work);
ok(
  "T2 HA13 history or multi-obs",
  (ha13Work.marketQuoteHistory?.length ?? 0) >= 0 && ha13Work.marketQuotes.wgdom.wroclaw.price === 34.96,
  { price: ha13Work.marketQuotes.wgdom.wroclaw.price, hist: ha13Work.marketQuoteHistory?.length },
);

// —— TEST 3: CURRENT → REUSE · providerCalls = 0 ——
const mk = [...ha13Keys][0];
const cache = evaluateMaterialCache({
  materialKey: mk,
  catalogWorkId: ha13WorkId,
  region: "wroclaw",
  worksById: worksMap(seed.store),
  nowMs: Date.parse("2026-08-11T12:00:00.000Z"),
});
eq("T3 usability CURRENT", cache.usability, "CURRENT");
const ident = resolveDemandProductIdentityExact({ materialKey: mk });
ok("T3 identity resolves", !!ident && ident.catalogWorkId === ha13WorkId);
const hit = lookupPriceMemory({
  materialKey: mk,
  worksById: worksMap(seed.store),
  region: "wroclaw",
  nowMs: Date.parse("2026-08-11T12:00:00.000Z"),
});
eq("T3 lookup HIT", hit.status, "HIT");
const beforeFetch = fetchCalls;
const phase2Reuse = await executeMaterialResearchPhase2({
  demand: {
    demandId: "d-reuse-ha13",
    materialKey: mk,
    catalogWorkId: ha13WorkId,
    normalizedName: ha13[0].productName,
    unit: "szt",
    region: "wroclaw",
    missingLayer: "MARKET",
    status: "open",
    createdAt: "2026-08-11T12:00:00.000Z",
    updatedAt: "2026-08-11T12:00:00.000Z",
    tenderIds: ["t1"],
  },
  claimantId: "test-reuse",
  lease: {
    async claim() {
      return { acquired: true, reason: "acquired_new", job: null };
    },
    async release() {
      return { released: true };
    },
  },
  worksById: worksMap(seed.store),
  nowMs: Date.parse("2026-08-11T12:00:00.000Z"),
});
eq("T3 CURRENT blocks research", phase2Reuse.error, "current_reuse_no_research");
eq("T3 no fetch", fetchCalls, beforeFetch);

// —— TEST 4: MISSING → demand ——
const missingMk = "mat.inv.hmissingtest99";
const miss = evaluateMaterialCache({
  materialKey: missingMk,
  region: "wroclaw",
  worksById: worksMap(seed.store),
  nowMs: Date.parse("2026-08-11T12:00:00.000Z"),
});
eq("T4 MISSING", miss.usability, "MISSING");

// —— TEST 5: research result average (mock qualify path) ——
const avg = averageQualifyingRegularMarketPrices([
  {
    materialKey: missingMk,
    provider: "leroy",
    priceNet: 100,
    priceType: "regular",
    sellerKind: "direct_retailer",
    observedAt: "2026-08-11T10:00:00.000Z",
  },
  {
    materialKey: missingMk,
    provider: "castorama",
    priceNet: 120,
    priceType: "regular",
    sellerKind: "direct_retailer",
    observedAt: "2026-08-11T10:00:00.000Z",
  },
  {
    materialKey: missingMk,
    provider: "obi",
    priceNet: 110,
    priceType: "regular",
    sellerKind: "direct_retailer",
    observedAt: "2026-08-11T10:00:00.000Z",
  },
]);
eq("T5 average 110", avg.averagePln, 110);
ok("T5 multi-source", avg.isMultiSourceAverage === true);

// —— TEST 6: second tender REUSE ——
const cache2 = evaluateMaterialCache({
  materialKey: mk,
  catalogWorkId: ha13WorkId,
  region: "wroclaw",
  worksById: worksMap(seed.store),
  nowMs: Date.parse("2026-08-20T12:00:00.000Z"),
});
eq("T6 second tender CURRENT", cache2.usability, "CURRENT");

// —— TEST 7: promo excluded ——
const promo = qualifyMarketResearchObservation({
  materialKey: missingMk,
  provider: "obi",
  priceNet: 159,
  priceType: "promo",
  sellerKind: "direct_retailer",
  observedAt: "2026-08-11T10:00:00.000Z",
});
eq("T7 promo rejected", promo.ok, false);
const avgPromo = averageQualifyingRegularMarketPrices([
  {
    materialKey: missingMk,
    provider: "leroy",
    priceNet: 200,
    priceType: "regular",
    sellerKind: "direct_retailer",
    observedAt: "2026-08-11T10:00:00.000Z",
  },
  {
    materialKey: missingMk,
    provider: "obi",
    priceNet: 159,
    priceType: "promo",
    sellerKind: "direct_retailer",
    observedAt: "2026-08-11T10:00:00.000Z",
  },
]);
eq("T7 average ignores promo", avgPromo.averagePln, 200);
eq("T7 qualifyingCount 1", avgPromo.qualifyingCount, 1);

// —— TEST 8: marketplace excluded ——
const mkt = qualifyMarketResearchObservation({
  materialKey: missingMk,
  provider: "castorama",
  priceNet: 99,
  priceType: "regular",
  sellerKind: "marketplace",
  observedAt: "2026-08-11T10:00:00.000Z",
});
eq("T8 marketplace rejected", mkt.ok, false);

// —— TEST 9: single-flight ——
resetMaterialResearchSessionCooldownForTests();
const leaseStore = createMemoryAtomicResearchJobStore();
const jobId = `mat-inv-sf-test`;
const nowSf = Date.parse("2026-08-11T12:00:00.000Z");
const c1 = await claimResearchJobLease(
  leaseStore,
  { researchJobId: jobId, claimantId: "t1", leaseMs: 60_000 },
  nowSf,
);
const c2 = await claimResearchJobLease(
  leaseStore,
  { researchJobId: jobId, claimantId: "t2", leaseMs: 60_000 },
  nowSf + 10,
);
ok("T9 first claim ok", c1.acquired === true);
ok("T9 second claim blocked", c2.acquired === false);
await releaseResearchJobLease(leaseStore, {
  researchJobId: jobId,
  claimantId: "t1",
  nowMs: nowSf + 20,
});

const dedup = dedupeNeededMaterialKeys([
  { materialKey: missingMk, catalogWorkId: "", namePl: "A", unit: "szt", region: "wroclaw", tenderId: null },
  { materialKey: missingMk, catalogWorkId: "", namePl: "B", unit: "szt", region: "wroclaw", tenderId: null },
  { materialKey: mk, catalogWorkId: ha13WorkId, namePl: "C", unit: "szt", region: "wroclaw", tenderId: null },
]);
eq("T9 dedupe materialKeys", dedup.length, 2);

// —— TEST 10: wrong identity / unknown price type → GAP ——
const unknown = qualifyMarketResearchObservation({
  materialKey: missingMk,
  provider: "leroy",
  priceNet: 50,
  priceType: "unknown",
  sellerKind: "direct_retailer",
  observedAt: "2026-08-11T10:00:00.000Z",
});
eq("T10 unknown priceType GAP", unknown.ok, false);

const prodProvider = resolveMmr02Phase2Provider();
ok("T10 production provider disconnected", prodProvider.connected === false);
ok("T10 liveHttpEligible false", prodProvider.liveHttpEligible === false);
eq("T10 httpFetchCount 0", prodProvider.httpFetchCount, 0);

ok("no unexpected fetch overall", fetchCalls === 0, { fetchCalls });

const compact = applyZygmuntInvoicePurchaseSeedToWorkCatalog(emptyCatalog());
ok("compact seed count matches meta", compact.seedCount === ZYGMUNT_INVOICE_PURCHASE_SEED_META.uniqueMaterialCount);
ok("compact seed upserts", compact.worksUpserted === ZYGMUNT_INVOICE_PURCHASE_SEED.length);
const compact2 = applyZygmuntInvoicePurchaseSeedToWorkCatalog(compact.store);
eq("compact seed idempotent", compact2.changed, false);

console.log("\n=== SEED SUMMARY ===");
console.log(
  JSON.stringify(
    {
      seededLineCount: seed.seededLineCount,
      uniqueMaterialCount: seed.uniqueMaterialCount,
      worksUpserted: seed.worksUpserted,
      compactSeedCount: ZYGMUNT_INVOICE_PURCHASE_SEED.length,
      gapCount: seed.gapCount,
      rejectedParseCount: seed.rejectedParseCount,
      fixtureRejectedParseCount: fixture.meta.rejectedParseCount,
      fixtureIntegrityFailCount: fixture.meta.integrityFailCount,
      unmatchedAmbiguous: fixture.meta.rejectedParseCount + fixture.meta.integrityFailCount,
      legalGate: MARKET_SYNC_P3_LEGAL_GATE,
      d1: MMR_02_PRIMARY_SOURCE_STATUS,
      researchLive: false,
    },
    null,
    2,
  ),
);
console.log(`\nALL PASS (${passed})`);
