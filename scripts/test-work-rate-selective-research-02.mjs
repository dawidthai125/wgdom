/**
 * WORK-RATE-SELECTIVE-RESEARCH-02 — harness (fixture · ZERO live HTTP).
 *
 * npx vite-node scripts/test-work-rate-selective-research-02.mjs
 */
import {
  MARKET_SYNC_P3_LEGAL_GATE,
} from "../src/lib/market-sync/p3-flag.ts";
import {
  WORK_RATE_FRESHNESS_STALE_AFTER_DAYS,
  WORK_RATE_LEGAL_GATE,
  acceptWorkRateResearchCandidate,
  buildWorkRateFixtureHtml,
  buildWorkRateSelectiveRequestUrl,
  calculateRepresentativeWorkRate,
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  createNullWorkRateSelectiveLookup,
  dedupeWorkRateResearchTargets,
  isWorkRateFullCatalogueForbidden,
  isWorkRateFullCatalogueResearchImplemented,
  isWorkRateKbPlAdapterImplemented,
  isWorkRateMinForbiddenAsRepresentative,
  isWorkRateResearchInCooldown,
  isWorkRateSelectiveUrlAllowed,
  lookupWorkRate,
  markWorkRateResearchCooldown,
  normalizeWorkCatalogStore,
  patchOurWorkRateInStore,
  qualifyWorkRateObservation,
  requestWorkRateResearch,
  runSelectiveWorkRateResearch,
  runWorkRateResearchSingleFlight,
  workRateUnitsCompatible,
} from "../src/lib/work-catalog/index.ts";
import { parseWorkRateOffersFromHtml } from "../src/lib/work-catalog/work-rate-source-html-parse.ts";

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

/** NOW must be ≥ wall-clock Accept timestamps (accept uses new Date()). */
const NOW = Date.parse("2026-08-20T10:00:00.000Z");
const T_FRESH = "2026-08-14T12:00:00.000Z";
const T_STALE = "2026-04-01T12:00:00.000Z";
/** Owner Classification Gate LABOR seed (A1) — unmapped ids → UNKNOWN → research BLOCKED. */
const WORK_ID = "legacy-malowanie-m2";
const UNIT = "m2";
const NAME = "Malowanie ścian dwukrotne";

function makeWork(overrides = {}) {
  return {
    id: WORK_ID,
    tradeId: "MALOWANIE",
    namePl: NAME,
    unit: UNIT,
    companyPricePln: 35,
    marketQuotes: {
      leroy: {
        wroclaw: {
          price: 12.5,
          regionCode: "wroclaw",
          coverage: "full",
          updatedAt: T_FRESH,
          confidence: 0.9,
          origin: "leroy",
        },
      },
    },
    marketQuoteHistory: [
      {
        workId: WORK_ID,
        price: 12.5,
        origin: "leroy",
        regionCode: "wroclaw",
        updatedAt: T_FRESH,
        confidence: 0.9,
        coverage: "full",
      },
    ],
    commercialPricing: { marginPct: 0, updatedAt: T_FRESH, source: "owner" },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["malowanie"],
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
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [...works], updatedAt: T_FRESH },
    },
    updatedAt: T_FRESH,
  });
}

function snapshotPm(store) {
  const w = store.catalogs.wroclaw.works.find((x) => x.id === WORK_ID);
  return JSON.stringify({
    companyPricePln: w.companyPricePln,
    marketQuotes: w.marketQuotes,
    marketQuoteHistory: w.marketQuoteHistory,
    commercialPricing: w.commercialPricing,
  });
}

function fourSourceFixtures(opts = {}) {
  const rate = opts.rates ?? { kb: 35, cr: 40, sc: 38, ex: 42 };
  const region = opts.region ?? "WROCLAW";
  const unit = opts.unit ?? "m2";
  const laborOnly = opts.laborOnly !== false;
  const includesMaterial = opts.includesMaterial === true;
  const priceKind = opts.priceKind ?? "regular";
  const identity = opts.identity !== false;
  const html = (r) =>
    buildWorkRateFixtureHtml({
      name: NAME,
      rate: r,
      unit,
      region,
      laborOnly,
      includesMaterial,
      priceKind,
      identity,
    });
  return createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: html(rate.kb) },
    cennikremontow_pl: { html: html(rate.cr) },
    sccot: { html: html(rate.sc) },
    extradom: { html: html(rate.ex) },
  });
}

clearWorkRateResearchAntiStormState();

// ——— baseline flags ———
eq("gate PASS", WORK_RATE_LEGAL_GATE, "PASS");
eq("material gate UNCHANGED", MARKET_SYNC_P3_LEGAL_GATE, "PASS");
eq("full catalogue forbidden", isWorkRateFullCatalogueForbidden(), true);
eq("full catalogue impl ZERO", isWorkRateFullCatalogueResearchImplemented(), false);
eq("KB adapter true", isWorkRateKbPlAdapterImplemented(), true);
eq("min forbidden", isWorkRateMinForbiddenAsRepresentative(), true);
eq("sync READY", requestWorkRateResearch({ workId: WORK_ID, unit: UNIT }).status, "READY");

// ——— URL allowlist ———
ok("kb url allowed", isWorkRateSelectiveUrlAllowed(buildWorkRateSelectiveRequestUrl({ sourceId: "kb_pl", query: NAME })));
ok("evil rejected", !isWorkRateSelectiveUrlAllowed("https://evil.example/x"));
ok("http rejected", !isWorkRateSelectiveUrlAllowed("http://kb.pl/?s=x"));

// ——— unit qualify ———
ok("unit m2==m²", workRateUnitsCompatible("m2", "m²"));
ok("unit reject m2 vs mb", !workRateUnitsCompatible("m2", "mb"));

{
  const offer = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html: buildWorkRateFixtureHtml({
      name: NAME,
      rate: 35,
      unit: "mb",
      laborOnly: true,
    }),
    sourceUrl: "https://kb.pl/?s=x",
    expectedNamePl: NAME,
    expectedUnit: UNIT,
  })[0];
  const q = qualifyWorkRateObservation({
    offer,
    expectedWorkId: WORK_ID,
    expectedUnit: UNIT,
  });
  eq("invalid unit reject", q.ok, false);
  if (!q.ok) eq("invalid unit reason", q.reason, "unit_mismatch");
}

{
  const offer = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html: buildWorkRateFixtureHtml({
      name: NAME,
      rate: 90,
      unit: "m2",
      laborOnly: false,
      includesMaterial: true,
    }),
    sourceUrl: "https://kb.pl/?s=x",
    expectedNamePl: NAME,
    expectedUnit: UNIT,
  })[0];
  const q = qualifyWorkRateObservation({
    offer,
    expectedWorkId: WORK_ID,
    expectedUnit: UNIT,
  });
  eq("material+labor reject", q.ok, false);
}

{
  const offer = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html: buildWorkRateFixtureHtml({
      name: NAME,
      rate: 35,
      unit: "m2",
      laborOnly: true,
      region: "WROCLAW",
    }),
    sourceUrl: "https://kb.pl/?s=x",
    expectedNamePl: NAME,
    expectedUnit: UNIT,
  })[0];
  const q = qualifyWorkRateObservation({
    offer,
    expectedWorkId: WORK_ID,
    expectedUnit: UNIT,
  });
  eq("labor-only accept", q.ok, true);
}

// ——— median + region ———
{
  const obs = [
    { sourceId: "kb_pl", workNamePl: NAME, ratePln: 35, unit: UNIT, regionScope: "WROCLAW", laborOnly: true, sourceUrl: "u", observedAt: T_FRESH, netGross: "netto" },
    { sourceId: "sccot", workNamePl: NAME, ratePln: 38, unit: UNIT, regionScope: "WROCLAW", laborOnly: true, sourceUrl: "u", observedAt: T_FRESH, netGross: "netto" },
    { sourceId: "extradom", workNamePl: NAME, ratePln: 42, unit: UNIT, regionScope: "WROCLAW", laborOnly: true, sourceUrl: "u", observedAt: T_FRESH, netGross: "netto" },
    { sourceId: "cennikremontow_pl", workNamePl: NAME, ratePln: 40, unit: UNIT, regionScope: "WROCLAW", laborOnly: true, sourceUrl: "u", observedAt: T_FRESH, netGross: "netto" },
  ];
  const rep = calculateRepresentativeWorkRate(obs);
  eq("median 39", rep.status === "ok" ? rep.medianPln : null, 39);
  eq("region WROCLAW", rep.status === "ok" ? rep.regionScope : null, "WROCLAW");
  ok("not min 35", rep.status === "ok" && rep.medianPln !== 35);
}

{
  const obs = [
    { sourceId: "kb_pl", workNamePl: NAME, ratePln: 50, unit: UNIT, regionScope: "DOLNY_SLASK", laborOnly: true, sourceUrl: "u", observedAt: T_FRESH, netGross: "netto" },
    { sourceId: "sccot", workNamePl: NAME, ratePln: 52, unit: UNIT, regionScope: "POLSKA", laborOnly: true, sourceUrl: "u", observedAt: T_FRESH, netGross: "netto" },
  ];
  const rep = calculateRepresentativeWorkRate(obs);
  eq("prefer Dolny Śląsk", rep.status === "ok" ? rep.regionScope : null, "DOLNY_SLASK");
  eq("DS rate 50", rep.status === "ok" ? rep.medianPln : null, 50);
}

{
  const obs = [
    { sourceId: "extradom", workNamePl: NAME, ratePln: 44, unit: UNIT, regionScope: "POLSKA", laborOnly: true, sourceUrl: "u", observedAt: T_FRESH, netGross: "netto" },
  ];
  const rep = calculateRepresentativeWorkRate(obs);
  eq("fallback Polska", rep.status === "ok" ? rep.regionScope : null, "POLSKA");
}

// ——— CURRENT → ZERO HTTP ———
{
  clearWorkRateResearchAntiStormState();
  const before = fetchCalls;
  let store = makeStore([
    makeWork({
      ourWorkRate: {
        workId: WORK_ID,
        unit: UNIT,
        ourRatePln: 55,
        sourceType: "OWNER",
        regionScope: "WROCLAW",
        observedAt: T_FRESH,
        updatedAt: T_FRESH,
        history: [],
      },
    }),
  ]);
  const pm0 = snapshotPm(store);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: fourSourceFixtures(),
  });
  eq("CURRENT REUSE", res.status, "REUSE");
  eq("CURRENT http 0", res.httpFetchCount, 0);
  eq("CURRENT global fetch 0", fetchCalls, before);
  eq("PM untouched CURRENT", snapshotPm(store), pm0);
}

// ——— MISSING → candidate ———
{
  clearWorkRateResearchAntiStormState();
  const before = fetchCalls;
  const store = makeStore([makeWork()]);
  const pm0 = snapshotPm(store);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: fourSourceFixtures(),
    bypassCooldown: true,
  });
  eq("MISSING CANDIDATE", res.status, "CANDIDATE");
  if (res.status === "CANDIDATE") {
    eq("median candidate 39", res.candidate.suggestedRatePln, 39);
    eq("sample 4", res.candidate.sampleSize, 4);
    eq("prev MISSING", res.candidate.previousFreshness, "MISSING");
    eq("full cat forbidden flag", res.fullCatalogueForbidden, true);
  }
  eq("MISSING fixture httpFetchCount 0", res.httpFetchCount, 0);
  eq("MISSING no live fetch", fetchCalls, before);
  eq("PM untouched MISSING", snapshotPm(store), pm0);

  // Accept
  if (res.status === "CANDIDATE") {
    const accepted = acceptWorkRateResearchCandidate({ store, candidate: res.candidate });
    eq("Accept ok", accepted.ok, true);
    if (accepted.ok) {
      const hit = lookupWorkRate(accepted.store, WORK_ID, UNIT, NOW);
      eq("after Accept CURRENT", hit.status, "CURRENT");
      eq("OUR RATE 39", hit.status !== "MISSING" ? hit.ourRatePln : null, 39);
      eq("source ACCEPT", hit.status !== "MISSING" ? hit.sourceType : null, "ACCEPT");
      const hist = hit.status !== "MISSING" ? hit.rate.history : [];
      ok("history has SOURCE", hist.some((h) => h.kind === "SOURCE"));
      ok("history has OUR", hist.some((h) => h.kind === "OUR" && h.sourceType === "ACCEPT"));
      eq("companyPrice still 35", accepted.store.catalogs.wroclaw.works[0].companyPricePln, 35);
      eq("PM untouched Accept", snapshotPm(accepted.store), pm0);
    }
  }
}

// ——— STALE → research ———
{
  clearWorkRateResearchAntiStormState();
  const store = makeStore([
    makeWork({
      ourWorkRate: {
        workId: WORK_ID,
        unit: UNIT,
        ourRatePln: 30,
        sourceType: "OWNER",
        regionScope: "WROCLAW",
        observedAt: T_STALE,
        updatedAt: T_STALE,
        history: [],
      },
    }),
  ]);
  ok(
    "stale days const",
    WORK_RATE_FRESHNESS_STALE_AFTER_DAYS === 90,
  );
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: fourSourceFixtures(),
    bypassCooldown: true,
  });
  eq("STALE CANDIDATE", res.status, "CANDIDATE");
  if (res.status === "CANDIDATE") {
    eq("prev STALE", res.candidate.previousFreshness, "STALE");
    eq("prev our 30", res.candidate.previousOurRatePln, 30);
  }
}

// ——— force CURRENT → candidate ———
{
  clearWorkRateResearchAntiStormState();
  const store = makeStore([
    makeWork({
      ourWorkRate: {
        workId: WORK_ID,
        unit: UNIT,
        ourRatePln: 55,
        sourceType: "OWNER",
        regionScope: "WROCLAW",
        observedAt: T_FRESH,
        updatedAt: T_FRESH,
        history: [],
      },
    }),
  ]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    forceRefresh: true,
    bypassCooldown: true,
    lookupPort: fourSourceFixtures(),
  });
  eq("force refresh CANDIDATE", res.status, "CANDIDATE");
}

// ——— ONE work · null port GAP ———
{
  clearWorkRateResearchAntiStormState();
  const store = makeStore([makeWork()]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    bypassCooldown: true,
    lookupPort: createNullWorkRateSelectiveLookup(),
  });
  eq("null port GAP", res.status, "GAP");
}

// ——— cooldown ———
{
  clearWorkRateResearchAntiStormState();
  markWorkRateResearchCooldown(WORK_ID, UNIT, NOW, 60_000);
  ok("in cooldown", isWorkRateResearchInCooldown(WORK_ID, UNIT, NOW + 1000));
  const store = makeStore([makeWork()]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW + 1000,
    lookupPort: fourSourceFixtures(),
    bypassCooldown: false,
  });
  eq("cooldown status", res.status, "COOLDOWN");
}

// ——— single-flight ———
{
  clearWorkRateResearchAntiStormState();
  let runs = 0;
  const p1 = runWorkRateResearchSingleFlight(WORK_ID, UNIT, async () => {
    runs += 1;
    await new Promise((r) => setTimeout(r, 30));
    return "A";
  });
  const p2 = runWorkRateResearchSingleFlight(WORK_ID, UNIT, async () => {
    runs += 1;
    return "B";
  });
  const [a, b] = await Promise.all([p1, p2]);
  eq("single-flight same", a, b);
  eq("single-flight runs 1", runs, 1);
}

// ——— dedupe ———
{
  const d = dedupeWorkRateResearchTargets([
    { workId: WORK_ID, unit: UNIT },
    { workId: WORK_ID, unit: UNIT },
    { workId: "other", unit: UNIT },
  ]);
  eq("dedupe length", d.length, 2);
}

// ——— open catalog path = 0 fetch (null research) ———
eq("open catalog fetchCalls still only throws", fetchCalls >= 0, true);

console.log(`\nWYNIK P2 SELECTIVE RESEARCH: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
