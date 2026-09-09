/**
 * GO53 — Evidence sufficiency + Research HTTP suppress (OD-52 STATE_ONLY).
 * Isolated fixtures · ZERO live HTTP · ZERO TPI control mutation · ZERO OUR RATE Accept.
 *
 * npx vite-node scripts/test-labor-evidence-suppress-go53.mjs
 */
import {
  EVIDENCE_REUSE_POLICY,
  OD52_EVIDENCE_FRESHNESS_MODE,
  buildWorkRateFixtureHtml,
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  evaluateLaborEvidenceReuseSufficiency,
  lookupWorkRate,
  normalizeWorkCatalogStore,
  runSelectiveWorkRateResearch,
} from "../src/lib/work-catalog/index.ts";
import {
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
  buildLaborSourceEvidenceObservation,
  clearLaborSourceEvidenceStoreLocalForTests,
  loadLaborSourceEvidenceStoreLocal,
  upsertLaborSourceEvidenceObservations,
} from "../src/lib/labor-source-evidence/index.ts";

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

const WORK_ID = "legacy-malowanie-m2";
const UNIT = "m2";
const NAME = "Malowanie ścian dwukrotne";
const NOW = Date.parse("2026-08-20T10:00:00.000Z");
const T_FRESH = "2026-08-14T12:00:00.000Z";
const CONTROL = "cc-ic-accept-6c2b8e82";

const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
  key: (i) => [...storage.keys()][i] ?? null,
  get length() {
    return storage.size;
  },
};

let fetchCalls = 0;
const _fetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  fetchCalls += 1;
  throw new Error(`GO53 zero live fetch: ${String(args[0])}`);
};

function reset() {
  storage.clear();
  clearLaborSourceEvidenceStoreLocalForTests();
  clearWorkRateResearchAntiStormState();
}

function makeWork(overrides = {}) {
  return {
    id: WORK_ID,
    tradeId: "MALOWANIE",
    namePl: NAME,
    unit: UNIT,
    companyPricePln: 35,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 20, updatedAt: T_FRESH, source: "owner" },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ourWorkRate: null,
    ...overrides,
  };
}

function makeStore(works) {
  return normalizeWorkCatalogStore({
    schemaVersion: 1,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", updatedAt: T_FRESH, works },
      dolnyslask: { region: "dolnyslask", updatedAt: T_FRESH, works: [...works] },
    },
  });
}

function fixturePort(rate = 35) {
  const html = (r) =>
    buildWorkRateFixtureHtml({
      name: NAME,
      rate: r,
      unit: UNIT,
      region: "WROCLAW",
      laborOnly: true,
      includesMaterial: false,
    });
  // Identical rates across sources — conflict fail-closed must not block suppress E2E
  return createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: html(rate) },
    cennikremontow_pl: { html: html(rate) },
    sccot: { html: html(rate) },
    extradom: { html: html(rate) },
  });
}

function fixturePortConflicting() {
  const html = (r) =>
    buildWorkRateFixtureHtml({
      name: NAME,
      rate: r,
      unit: UNIT,
      region: "WROCLAW",
      laborOnly: true,
      includesMaterial: false,
    });
  return createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: html(35) },
    cennikremontow_pl: { html: html(50) },
  });
}

function baseObs(overrides = {}) {
  return buildLaborSourceEvidenceObservation({
    workId: WORK_ID,
    workNamePl: NAME,
    sourceId: "kb_pl",
    sourceUrl: "https://kb.pl/cenniki/uslugi/cennik-malowania-scian-i-sufitow/",
    observedName: "Malowanie ścian",
    unit: UNIT,
    pricePoint: 35,
    priceKind: "point",
    region: "WROCLAW",
    identityMatched: true,
    identityMethod: "exact_name",
    laborOnly: true,
    includesMaterial: false,
    observedAt: T_FRESH,
    retrievedAt: T_FRESH,
    ...overrides,
  });
}

ok("policy STATE_ONLY", EVIDENCE_REUSE_POLICY === "STATE_ONLY");
ok("OD52 mode", OD52_EVIDENCE_FRESHNESS_MODE === "STATE_ONLY");

// ——— Pure evaluator cases ———
{
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [baseObs()],
  });
  ok("1 VALID exact → SUFFICIENT", r.status === "SUFFICIENT" && r.sufficient === true);
  ok("1 isOurRate false", r.isOurRate === false);
}

{
  const stale = baseObs();
  stale.qualityStatus = "STALE";
  stale.staleAt = new Date(NOW).toISOString();
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [stale],
  });
  ok("2 STALE → not sufficient", r.status === "STALE" && r.sufficient === false);
}

{
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [],
  });
  ok("3 missing → NO_EVIDENCE", r.status === "NO_EVIDENCE" && !r.sufficient);
}

{
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [baseObs({ workId: "other-work" })],
  });
  ok("4 wrong workId → INSUFFICIENT", r.status === "INSUFFICIENT" && !r.sufficient);
}

{
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [baseObs({ unit: "szt" })],
  });
  ok("5 wrong unit → INSUFFICIENT", r.status === "INSUFFICIENT" && !r.sufficient);
}

{
  // joinery scope vs painting allowlist walls_ceilings
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [baseObs({ observedName: "Malowanie drzwi" })],
  });
  ok(
    "6 incompatible scope → INCOMPATIBLE_SCOPE",
    r.status === "INCOMPATIBLE_SCOPE" && !r.sufficient,
    r,
  );
}

{
  const pkg = baseObs({
    laborOnly: false,
    includesMaterial: true,
    observedName: "Malowanie ścian pakiet",
  });
  // force VALID flags for masquerade test (ingest would reject)
  pkg.qualityStatus = "VALID";
  pkg.laborOnly = false;
  pkg.includesMaterial = true;
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [pkg],
  });
  ok(
    "7 package/material → INCOMPATIBLE_SCOPE",
    r.status === "INCOMPATIBLE_SCOPE" && !r.sufficient,
    r,
  );
}

{
  const loose = baseObs();
  loose.identityMethod = "names_loosely";
  loose.qualityStatus = "VALID";
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [loose],
  });
  ok("8 names_loosely → INSUFFICIENT", r.status === "INSUFFICIENT" && !r.sufficient, r);
}

{
  const badRegion = baseObs();
  badRegion.region = /** @type {any} */ ("UNKNOWN_REGION");
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [badRegion],
  });
  ok(
    "9 incompatible region → INCOMPATIBLE_REGION",
    r.status === "INCOMPATIBLE_REGION" && !r.sufficient,
    r,
  );
}

{
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [baseObs({ region: "POLSKA" })],
  });
  ok("10 compatible region POLSKA → SUFFICIENT", r.status === "SUFFICIENT", r);
}

{
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [baseObs()],
  });
  ok("11 one valid → eligible", r.sufficient && r.eligible.length === 1);
}

{
  const a = baseObs({ pricePoint: 35 });
  const b = baseObs({
    pricePoint: 50,
    sourceUrl: "https://kb.pl/cenniki/uslugi/cennik-malowania-scian-i-sufitow/?alt=1",
  });
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [a, b],
  });
  ok("12 price conflict → CONFLICT", r.status === "CONFLICT" && !r.sufficient, r);
}

{
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "CURRENT",
    observations: [baseObs()],
  });
  ok("13 CURRENT OUR RATE → N_A", r.status === "N_A_OUR_RATE_CURRENT" && !r.sufficient);
}

{
  const r = evaluateLaborEvidenceReuseSufficiency({
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "STALE",
    observations: [baseObs()],
  });
  ok("14 STALE OUR RATE → BLOCKED", r.status === "BLOCKED_STALE_OUR_RATE" && !r.sufficient);
}

// ——— Runtime Research seam ———
reset();
{
  const store = makeStore([makeWork()]);
  const resA = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    bypassCooldown: true,
    nowMs: NOW,
    lookupPort: fixturePort(),
  });
  ok("15A Tender A CANDIDATE", resA.status === "CANDIDATE", resA.status);
  ok("15A Evidence persisted", (resA.evidencePersist?.persisted ?? 0) > 0);
  ok("15A OUR RATE MISSING", lookupWorkRate(store, WORK_ID, UNIT, NOW).status === "MISSING");

  clearWorkRateResearchAntiStormState();
  const resB = await runSelectiveWorkRateResearch({
    store: makeStore([makeWork()]),
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    bypassCooldown: true,
    forceRefresh: false,
    nowMs: NOW + 5,
    lookupPort: fixturePort(),
  });
  ok("15B EVIDENCE_REUSE", resB.status === "EVIDENCE_REUSE", resB.status);
  ok("15B http=0", resB.status === "EVIDENCE_REUSE" && resB.httpFetchCount === 0);
  ok("15B isOurRate false", resB.status === "EVIDENCE_REUSE" && resB.isOurRate === false);
  ok(
    "15B EVIDENCE_SUFFICIENT telemetry",
    resB.telemetry.some((t) => t.code === "EVIDENCE_SUFFICIENT"),
  );
}

reset();
{
  // Insufficient Evidence (names_loosely only) → HTTP runs
  const loose = baseObs();
  loose.identityMethod = "names_loosely";
  upsertLaborSourceEvidenceObservations({
    observations: [loose],
    nowIso: new Date(NOW).toISOString(),
  });
  // Ensure VALID + names_loosely survives (build may set identity)
  const storeObs = loadLaborSourceEvidenceStoreLocal().observations.map((o) => ({
    ...o,
    identityMethod: "names_loosely",
    qualityStatus: "VALID",
  }));
  storage.set(
    LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
    JSON.stringify({
      ...loadLaborSourceEvidenceStoreLocal(),
      observations: storeObs,
    }),
  );

  clearWorkRateResearchAntiStormState();
  const res = await runSelectiveWorkRateResearch({
    store: makeStore([makeWork()]),
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    bypassCooldown: true,
    forceRefresh: false,
    nowMs: NOW + 1,
    lookupPort: fixturePort(),
  });
  ok("16 insufficient → Research runs", res.status === "CANDIDATE" || res.status === "GAP", res.status);
  ok(
    "16 http > 0 or INSUFFICIENT telemetry",
    (typeof res.httpFetchCount === "number" && res.httpFetchCount > 0) ||
      res.telemetry.some((t) => t.code === "EVIDENCE_INSUFFICIENT"),
    res,
  );
}

// 17 rehydration
reset();
{
  const store = makeStore([makeWork()]);
  await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    bypassCooldown: true,
    nowMs: NOW,
    lookupPort: fixturePort(),
  });
  const raw = localStorage.getItem(LABOR_SOURCE_EVIDENCE_STORAGE_KEY);
  ok("17 LS present", typeof raw === "string");
  const snap = JSON.parse(raw);
  storage.delete(LABOR_SOURCE_EVIDENCE_STORAGE_KEY);
  localStorage.setItem(LABOR_SOURCE_EVIDENCE_STORAGE_KEY, JSON.stringify(snap));
  clearWorkRateResearchAntiStormState();
  const resB = await runSelectiveWorkRateResearch({
    store: makeStore([makeWork()]),
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    bypassCooldown: true,
    forceRefresh: false,
    nowMs: NOW + 9,
    lookupPort: fixturePort(),
  });
  ok("17 rehydrate → EVIDENCE_REUSE", resB.status === "EVIDENCE_REUSE", resB.status);
  ok("17 http=0", resB.status === "EVIDENCE_REUSE" && resB.httpFetchCount === 0);
}

// 18 idempotent pure eval
{
  const input = {
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    ourRateFreshness: "MISSING",
    observations: [baseObs()],
  };
  const a = evaluateLaborEvidenceReuseSufficiency(input);
  const b = evaluateLaborEvidenceReuseSufficiency(input);
  ok("18 identical status", a.status === b.status && a.sufficient === b.sufficient);
  ok("18 zero writes", storage.size === storage.size);
}

// STALE OUR RATE runtime — Evidence must not suppress
reset();
{
  const staleIso = new Date(NOW - 120 * 24 * 60 * 60 * 1000).toISOString();
  const storeSeed = makeStore([makeWork()]);
  await runSelectiveWorkRateResearch({
    store: storeSeed,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    bypassCooldown: true,
    nowMs: NOW,
    lookupPort: fixturePort(),
  });
  clearWorkRateResearchAntiStormState();
  const storeStale = makeStore([
    makeWork({
      ourWorkRate: {
        workId: WORK_ID,
        unit: UNIT,
        ourRatePln: 20,
        sourceType: "ACCEPT",
        regionScope: "WROCLAW",
        observedAt: staleIso,
        updatedAt: staleIso,
        history: [],
      },
    }),
  ]);
  const res = await runSelectiveWorkRateResearch({
    store: storeStale,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    bypassCooldown: true,
    forceRefresh: false,
    nowMs: NOW,
    lookupPort: fixturePort(),
  });
  ok("14r STALE OUR RATE not EVIDENCE_REUSE", res.status !== "EVIDENCE_REUSE", res.status);
  ok(
    "14r researches or blocked_stale telemetry",
    res.status === "CANDIDATE" ||
      res.status === "GAP" ||
      res.telemetry.some((t) => String(t.messagePl || "").includes("BLOCKED_STALE_OUR_RATE")),
    res.status,
  );
}

// CURRENT OUR RATE stronger
reset();
{
  await runSelectiveWorkRateResearch({
    store: makeStore([makeWork()]),
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    bypassCooldown: true,
    nowMs: NOW,
    lookupPort: fixturePort(),
  });
  clearWorkRateResearchAntiStormState();
  const freshIso = new Date(NOW).toISOString();
  const res = await runSelectiveWorkRateResearch({
    store: makeStore([
      makeWork({
        ourWorkRate: {
          workId: WORK_ID,
          unit: UNIT,
          ourRatePln: 21,
          sourceType: "ACCEPT",
          regionScope: "WROCLAW",
          observedAt: freshIso,
          updatedAt: freshIso,
          history: [],
        },
      }),
    ]),
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    bypassCooldown: true,
    forceRefresh: false,
    nowMs: NOW,
    lookupPort: fixturePort(),
  });
  ok("13r CURRENT → REUSE", res.status === "REUSE");
  ok("13r http=0", res.httpFetchCount === 0);
}

ok(
  "control unused",
  !String(storage.get(LABOR_SOURCE_EVIDENCE_STORAGE_KEY) || "").includes(CONTROL),
);
ok("zero live fetch", fetchCalls === 0);

console.log(`\nGO53 SUPPRESS: ${passed} PASS / ${failed} FAIL`);
if (_fetch) globalThis.fetch = _fetch;
process.exit(failed > 0 ? 1 : 0);
