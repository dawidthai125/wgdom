/**
 * REAL-SOURCE-LIVE-ADAPTERS-08 — selective DIY research harness (fixtures · ZERO live HTTP).
 *
 * npx vite-node scripts/test-real-source-live-adapters-08.mjs
 */
import {
  acceptMaterialResearchCandidate,
  averageQualifyingRegularMarketPrices,
  buildDiySelectiveRequestUrl,
  createFixtureDiySelectiveLookup,
  createNullDiySelectiveLookup,
  createSelectiveDiyTrioResearchProvider,
  dedupeNeededMaterialKeys,
  evaluateMaterialCache,
  executeMaterialResearchPhase2,
  identityMatchesQuery,
  isDiySelectiveUrlAllowed,
  normalizePriceDemandStore,
  orchestrateMaterialResearch,
  parseDiyShopHtml,
  qualifyMarketResearchObservation,
  resetMaterialResearchSessionCooldownForTests,
  resolveMmr02Phase2Provider,
} from "../src/lib/price-intelligence/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import { createMemoryAtomicResearchJobStore, claimResearchJobLease, releaseResearchJobLease } from "../supabase/functions/make-server-0afb8820/research-job-lease.ts";

const T_NOW = Date.parse("2026-08-11T15:00:00.000Z");
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

const LEROY_HTML = `<html><head><title>WC kompakt poziomy Zita Sensea</title>
<meta property="og:title" content="WC kompakt poziomy Zita Sensea" /></head><body>
<p>Sprzedawane i wysyłane przez LEROY MERLIN</p><p>Cena 178 zł</p>
</body></html>`;

const CASTO_HTML = `<html><head><title>Kompakt WC Tapia bezkołnierzowy</title></head><body>
<p>Sprzedaje i wysyła przedsiębiorca: Castorama Polska</p><p>178 zł</p>
</body></html>`;

const CASTO_MARKET_HTML = `<html><head><title>Kompakt WC LaVita</title></head><body>
<p>Sprzedaje i wysyła przedsiębiorca: Łazienkaplus</p><p>1259 zł</p>
</body></html>`;

const OBI_HTML = `<html><head><title>Cersanit Kompakt WC poziomy Meza</title></head><body>
<p>Cena regularna 329,00 zł</p><p>Cena promocyjna 164,50 zł</p>
<p>Oferta promocyjna do 18.08.2026</p></body></html>`;

const OBI_REGULAR_HTML = `<html><head><title>Kompakt WC Mos</title></head><body>
<p>199,99 zł</p></body></html>`;

function makeWork(opts) {
  const {
    id,
    namePl,
    unit = "szt",
    materialKey,
    marketQuotes = undefined,
  } = opts;
  return {
    id,
    tradeId: "MALOWANIE",
    namePl,
    unit,
    companyPricePln: 0,
    updatedAt: T_FRESH,
    keywords: [namePl.toLowerCase(), materialKey, id],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    freshnessStatus: "missing",
    materialKey,
    ...(marketQuotes ? { marketQuotes } : {}),
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

function catalogWithQuote(workId, materialKey, namePl, price) {
  const store = emptyCatalog();
  store.catalogs.wroclaw.works.push(
    makeWork({
      id: workId,
      namePl,
      materialKey,
      marketQuotes: {
        wgdom: {
          wroclaw: {
            price,
            regionCode: "wroclaw",
            coverage: "indicative",
            updatedAt: T_FRESH,
            confidence: 0.8,
            origin: "wgdom",
          },
        },
      },
    }),
  );
  return store;
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

function researchInput(overrides = {}) {
  return {
    materialKey: "mat.wc_kompakt",
    catalogWorkId: "cw.wc_kompakt",
    namePl: "WC kompakt",
    unit: "szt",
    region: "wroclaw",
    demandId: "d1",
    researchJobId: "job1",
    nowIso: new Date(T_NOW).toISOString(),
    ...overrides,
  };
}

function missingDemand(overrides = {}) {
  return {
    demandId: "mat.wc_kompakt|cw.wc_kompakt|wroclaw|MARKET_QUOTE_MISSING",
    materialKey: "mat.wc_kompakt",
    catalogWorkId: "cw.wc_kompakt",
    normalizedName: "WC kompakt",
    unit: "szt",
    region: "wroclaw",
    missingLayer: "MARKET_QUOTE_MISSING",
    status: "QUEUED",
    priority: "MEDIUM",
    occurrenceCount: 1,
    tenderIds: ["tenderA"],
    firstRequestedAt: new Date(T_NOW).toISOString(),
    lastRequestedAt: new Date(T_NOW).toISOString(),
    reason: "MARKET PRICE MISSING",
    ...overrides,
  };
}

console.log("REAL-SOURCE-LIVE-ADAPTERS-08\n");

ok(
  "URL LM allowed",
  isDiySelectiveUrlAllowed(buildDiySelectiveRequestUrl({ provider: "leroy", query: "WC kompakt" })),
);
ok("URL evil rejected", !isDiySelectiveUrlAllowed("https://evil.example/search?q=x"));
ok("identity WC", identityMatchesQuery("WC kompakt poziomy Zita Sensea", "WC kompakt"));
ok("identity reject paint", !identityMatchesQuery("Farba lateksowa biała", "WC kompakt"));

{
  const lm = parseDiyShopHtml({
    provider: "leroy",
    html: LEROY_HTML,
    query: "WC kompakt",
    sourceUrl: "https://www.leroymerlin.pl/produkty/wc-kompakt-poziomy-zita-sensea-89322996.html",
  });
  eq("LM price", lm?.priceGrossPln, 178);
  eq("LM direct", lm?.sellerKind, "direct_retailer");
  eq("LM regular", lm?.priceType, "regular");
  ok("LM identity", lm?.identityMatched === true);

  const casto = parseDiyShopHtml({
    provider: "castorama",
    html: CASTO_HTML,
    query: "WC kompakt",
    sourceUrl: "https://www.castorama.pl/kompakt-wc-tapia/5063022580511_CAPL.prd",
  });
  eq("Casto price", casto?.priceGrossPln, 178);
  eq("Casto direct", casto?.sellerKind, "direct_retailer");

  const mkt = parseDiyShopHtml({
    provider: "castorama",
    html: CASTO_MARKET_HTML,
    query: "WC kompakt",
    sourceUrl: "https://www.castorama.pl/x",
  });
  eq("Casto marketplace", mkt?.sellerKind, "marketplace");

  const obiPromo = parseDiyShopHtml({
    provider: "obi",
    html: OBI_HTML,
    query: "WC kompakt Meza",
    sourceUrl: "https://www.obi.pl/p/7120249/cersanit",
  });
  eq("OBI regular from promo page", obiPromo?.priceType, "regular");
  eq("OBI regular amount", obiPromo?.priceGrossPln, 329);
}

{
  const mktQ = qualifyMarketResearchObservation({
    materialKey: "mat.wc_kompakt",
    provider: "castorama",
    priceNet: 100,
    priceType: "regular",
    sellerKind: "marketplace",
    observedAt: new Date(T_NOW).toISOString(),
  });
  eq("T6 marketplace REJECT", mktQ.ok, false);

  const promoQ = qualifyMarketResearchObservation({
    materialKey: "mat.wc_kompakt",
    provider: "obi",
    priceNet: 164.5,
    priceType: "promo",
    sellerKind: "direct_retailer",
    observedAt: new Date(T_NOW).toISOString(),
  });
  eq("T8 promo REJECT", promoQ.ok, false);

  const avg = averageQualifyingRegularMarketPrices([
    {
      materialKey: "mat.wc_kompakt",
      provider: "leroy",
      priceNet: 200,
      priceType: "regular",
      sellerKind: "direct_retailer",
      observedAt: new Date(T_NOW).toISOString(),
    },
    {
      materialKey: "mat.wc_kompakt",
      provider: "castorama",
      priceNet: 220,
      priceType: "regular",
      sellerKind: "direct_retailer",
      observedAt: new Date(T_NOW).toISOString(),
    },
    {
      materialKey: "mat.wc_kompakt",
      provider: "obi",
      priceNet: 210,
      priceType: "regular",
      sellerKind: "direct_retailer",
      observedAt: new Date(T_NOW).toISOString(),
    },
  ]);
  eq("T10 average 210", avg.averagePln, 210);
  eq("T10 coverage 3", avg.sourceCoverage, 3);
}

{
  resetMaterialResearchSessionCooldownForTests();
  const lookup = createFixtureDiySelectiveLookup({
    leroy: { html: LEROY_HTML },
    castorama: { html: CASTO_HTML },
    obi: { html: OBI_REGULAR_HTML },
  });
  let attempts = 0;
  const provider = createSelectiveDiyTrioResearchProvider({
    lookup,
    onShopAttempt: () => {
      attempts += 1;
    },
  });
  eq("provider connected", provider.connected, true);
  const out = await provider.research(researchInput());
  ok("T2/T3/T7 research ok", out.ok === true);
  if (out.ok) {
    ok("T9 candidate price finite", out.candidate.priceNet > 0);
    eq("autoAccepted false", out.autoAccepted, false);
  }
  eq("exactly 3 shop attempts (not catalogue)", attempts, 3);
}

{
  const lookup = createFixtureDiySelectiveLookup({
    castorama: { html: CASTO_MARKET_HTML },
  });
  const provider = createSelectiveDiyTrioResearchProvider({ lookup });
  const out = await provider.research(researchInput());
  eq("T6 market → GAP", out.ok, false);
  if (!out.ok) eq("T6 gap err", out.error, "PRICE_GAP");
}

{
  resetMaterialResearchSessionCooldownForTests();
  const store = catalogWithQuote("cw.wc_kompakt", "mat.wc_kompakt", "WC kompakt", 180);
  let researchCalls = 0;
  const counting = {
    id: "count",
    connected: true,
    async research() {
      researchCalls += 1;
      return { ok: false, error: "should_not_run", autoAccepted: false };
    },
  };
  const mem = evaluateMaterialCache({
    materialKey: "mat.wc_kompakt",
    catalogWorkId: "cw.wc_kompakt",
    region: "wroclaw",
    worksById: worksMap(store),
    nowMs: T_NOW,
  });
  eq("T1 CURRENT", mem.usability, "CURRENT");
  const r = await executeMaterialResearchPhase2({
    demand: missingDemand(),
    claimantId: "t1",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: worksMap(store),
    nowMs: T_NOW,
    provider: counting,
  });
  eq("T1 reuse error", r.error, "current_reuse_no_research");
  eq("T1 researchCalls 0", researchCalls, 0);
}

{
  const lines = [];
  for (let i = 0; i < 23; i++) {
    lines.push({
      materialKey: `mat.hit_${i}`,
      catalogWorkId: `cw.hit_${i}`,
      namePl: `Hit ${i}`,
      unit: "szt",
      region: "wroclaw",
      tenderId: "tenderA",
      lineId: `L${i}`,
    });
  }
  for (let i = 0; i < 7; i++) {
    lines.push({
      materialKey: `mat.miss_${i}`,
      catalogWorkId: `cw.miss_${i}`,
      namePl: `Miss ${i}`,
      unit: "szt",
      region: "wroclaw",
      tenderId: "tenderA",
      lineId: `M${i}`,
    });
  }
  for (let i = 0; i < 10; i++) {
    lines.push({
      materialKey: "mat.miss_0",
      catalogWorkId: "cw.miss_0",
      namePl: "Miss 0",
      unit: "szt",
      region: "wroclaw",
      tenderId: "tenderA",
      lineId: `DUP${i}`,
    });
  }
  const deduped = dedupeNeededMaterialKeys(lines);
  eq("T4/T5 unique keys", deduped.length, 30);
  const miss0 = deduped.find((d) => d.materialKey === "mat.miss_0");
  ok("T5 duplicate lines → occurrence > 1", (miss0?.occurrenceCount ?? 0) >= 11);
}

// ★ Architecture proof: MISSING → research → Accept → SECOND TENDER REUSE
{
  resetMaterialResearchSessionCooldownForTests();
  const lookup = createFixtureDiySelectiveLookup({
    leroy: { html: LEROY_HTML },
    castorama: { html: CASTO_HTML },
    obi: { html: OBI_REGULAR_HTML },
  });
  const provider = createSelectiveDiyTrioResearchProvider({ lookup });
  let catalog = emptyCatalog();
  catalog.catalogs.wroclaw.works.push(
    makeWork({
      id: "cw.wc_kompakt",
      namePl: "WC kompakt",
      materialKey: "mat.wc_kompakt",
    }),
  );
  const deps = memoryCatalogDeps(catalog);
  const demand = missingDemand();

  const phase2 = await executeMaterialResearchPhase2({
    demand,
    claimantId: "arch-a",
    lease: leasePort(createMemoryAtomicResearchJobStore()),
    worksById: worksMap(deps.get()),
    nowMs: T_NOW,
    provider,
  });
  ok("TENDER A candidate", phase2.ok && !!phase2.candidate, phase2);

  if (phase2.candidate) {
    const acc = await acceptMaterialResearchCandidate({
      candidate: phase2.candidate,
      demandStore: normalizePriceDemandStore({
        schemaVersion: 1,
        updatedAt: new Date(T_NOW).toISOString(),
        demands: [demand],
      }),
      expectedUnit: "szt",
      commitDeps: deps,
      updatedAtIso: new Date(T_NOW).toISOString(),
    });
    ok("T11 persist ok", acc.ok === true && acc.persisted === true, acc);

    const mem = evaluateMaterialCache({
      materialKey: "mat.wc_kompakt",
      catalogWorkId: "cw.wc_kompakt",
      region: "wroclaw",
      worksById: worksMap(deps.get()),
      nowMs: T_NOW,
    });
    eq("after Accept CURRENT", mem.usability, "CURRENT");

    let researchCalls = 0;
    const counting = {
      id: "count2",
      connected: true,
      async research() {
        researchCalls += 1;
        return { ok: false, error: "no", autoAccepted: false };
      },
    };
    const r2 = await executeMaterialResearchPhase2({
      demand: missingDemand({
        demandId: "mat.wc_kompakt|cw.wc_kompakt|wroclaw|MARKET_QUOTE_MISSING|b",
        tenderIds: ["tenderB"],
      }),
      claimantId: "arch-b",
      lease: leasePort(createMemoryAtomicResearchJobStore()),
      worksById: worksMap(deps.get()),
      nowMs: T_NOW + 1000,
      provider: counting,
    });
    eq("T12 SECOND TENDER reuse", r2.error, "current_reuse_no_research");
    eq("T12 researchCalls 0", researchCalls, 0);
  }
}

{
  resetMaterialResearchSessionCooldownForTests();
  const lookup = createFixtureDiySelectiveLookup({ leroy: { html: LEROY_HTML } });
  const provider = createSelectiveDiyTrioResearchProvider({ lookup });
  const jobStore = createMemoryAtomicResearchJobStore();
  const lease = leasePort(jobStore);
  const catalog = emptyCatalog();
  catalog.catalogs.wroclaw.works.push(
    makeWork({
      id: "cw.wc_kompakt",
      namePl: "WC kompakt",
      materialKey: "mat.wc_kompakt",
    }),
  );
  const lines = [
    {
      materialKey: "mat.wc_kompakt",
      catalogWorkId: "cw.wc_kompakt",
      namePl: "WC kompakt",
      unit: "szt",
      region: "wroclaw",
      tenderId: "t1",
    },
  ];
  const [ra, rb] = await Promise.all([
    orchestrateMaterialResearch({
      lines,
      worksById: worksMap(catalog),
      provider,
      lease,
      claimantId: "sf-a",
      nowMs: T_NOW,
      demandStore: normalizePriceDemandStore({ schemaVersion: 1, updatedAt: new Date(T_NOW).toISOString(), demands: [] }),
    }),
    orchestrateMaterialResearch({
      lines,
      worksById: worksMap(catalog),
      provider,
      lease,
      claimantId: "sf-b",
      nowMs: T_NOW,
      demandStore: normalizePriceDemandStore({ schemaVersion: 1, updatedAt: new Date(T_NOW).toISOString(), demands: [] }),
    }),
  ]);
  const actions = [ra.decisions[0].action, rb.decisions[0].action];
  ok(
    "T13 single-flight",
    actions.includes("HELD_SINGLE_FLIGHT") ||
      actions.filter((x) => x === "CANDIDATE_READY").length <= 1,
    { actions },
  );
}

{
  const provider = createSelectiveDiyTrioResearchProvider({
    lookup: createNullDiySelectiveLookup(),
  });
  const out = await provider.research(researchInput());
  eq("T14 fail-soft GAP", out.ok, false);
  if (!out.ok) eq("T14 PRICE_GAP", out.error, "PRICE_GAP");
}

{
  const lookup = createFixtureDiySelectiveLookup({
    leroy: {
      html: `<html><head><title>Farba lateksowa biała 10L</title></head><body>
        <p>Sprzedawane i wysyłane przez LEROY MERLIN</p><p>99 zł</p></body></html>`,
    },
  });
  const provider = createSelectiveDiyTrioResearchProvider({ lookup });
  const out = await provider.research(researchInput({ namePl: "WC kompakt" }));
  eq("T15 wrong identity GAP", out.ok, false);
}

{
  const r = resolveMmr02Phase2Provider({
    diyLookup: createNullDiySelectiveLookup(),
  });
  eq("factory reason DIY", r.reason, "OK_DIY_SELECTIVE");
  eq("factory connected", r.connected, true);
  eq("factory liveHttpEligible", r.liveHttpEligible, true);
}

ok("FULL CATALOG / fetch = ZERO", fetchCalls === 0, { fetchCalls });

console.log(`\nSELECTIVE RESEARCH harness: ${failed === 0 ? "PASS" : "FAIL"} (${passed} pass · ${failed} fail)`);
if (failed) process.exit(1);
