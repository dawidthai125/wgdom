/**
 * WORK-RATE-RESEARCH-DISCOVERY-01 — INFRA PASS2 allowlist plumbing (T1–T18).
 * Fixture only · ZERO live HTTP · empty prod allowlist = PASS1 only.
 *
 * npx vite-node scripts/test-work-rate-research-discovery-01.mjs
 */
import {
  acceptWorkRateResearchCandidate,
  buildWorkRateFixtureHtml,
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  isWorkRatePass2AllowlistEmpty,
  isWorkRateSelectiveUrlAllowed,
  listWorkRateMatchNamesPl,
  lookupWorkRate,
  normalizeWorkCatalogStore,
  qualifyWorkRateObservation,
  resolveWorkRatePass2Url,
  resolveWorkRateSelectiveLookupRequest,
  runSelectiveWorkRateResearch,
  setWorkRatePass2AllowlistForTests,
} from "../src/lib/work-catalog/index.ts";
import { buildLaborRateEvidencePack as buildPack } from "../src/lib/ik-pricing-orchestrator/labor-rate-evidence.ts";
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

const NOW = Date.parse("2026-08-14T10:00:00.000Z");
const T_FRESH = "2026-08-13T12:00:00.000Z";
const WORK_ID = "cw.paint.walls";
const UNIT = "m2";
const NAME = "Malowanie ścian dwukrotne";
const PASS2_URL = "https://kb.pl/cenniki/kategorie/malowanie/";

function makeWork(overrides = {}) {
  return {
    id: WORK_ID,
    tradeId: "MALOWANIE",
    namePl: NAME,
    unit: UNIT,
    companyPricePln: 35,
    marketQuotes: {},
    marketQuoteHistory: [],
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

function htmlOffer(opts) {
  return buildWorkRateFixtureHtml({
    name: opts.name ?? NAME,
    rate: opts.rate,
    unit: opts.unit ?? UNIT,
    region: opts.region ?? "WROCLAW",
    laborOnly: opts.laborOnly !== false,
    includesMaterial: opts.includesMaterial === true,
    priceKind: opts.priceKind ?? "regular",
    identity: opts.identity !== false,
  });
}

function fourPass1Fixtures(rates = { kb: 35, cr: 40, sc: 38, ex: 42 }) {
  return createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: htmlOffer({ rate: rates.kb }) },
    cennikremontow_pl: { html: htmlOffer({ rate: rates.cr }) },
    sccot: { html: htmlOffer({ rate: rates.sc }) },
    extradom: { html: htmlOffer({ rate: rates.ex }) },
  });
}

clearWorkRateResearchAntiStormState();
setWorkRatePass2AllowlistForTests(null);

// ——— T1 PASS1 baseline ———
{
  clearWorkRateResearchAntiStormState();
  setWorkRatePass2AllowlistForTests([]);
  const before = fetchCalls;
  const store = makeStore([makeWork()]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: fourPass1Fixtures(),
    bypassCooldown: true,
  });
  eq("T1 CANDIDATE", res.status, "CANDIDATE");
  if (res.status === "CANDIDATE") {
    eq("T1 marketBase 39", res.candidate.marketBaseRatePln, 39);
    eq("T1 proposed=base @0%", res.candidate.suggestedRatePln, 39);
    eq("T1 sample 4", res.candidate.sampleSize, 4);
  }
  eq("T1 no live fetch", fetchCalls, before);
  ok("T1 empty allowlist override", isWorkRatePass2AllowlistEmpty());
  setWorkRatePass2AllowlistForTests(null);
}

// ——— T2 empty allowlist = PASS1 only ———
{
  clearWorkRateResearchAntiStormState();
  setWorkRatePass2AllowlistForTests([]);
  const store = makeStore([makeWork()]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: fourPass1Fixtures(),
    bypassCooldown: true,
  });
  eq("T2 CANDIDATE", res.status, "CANDIDATE");
  if (res.status === "CANDIDATE") {
    eq("T2 sample still 4", res.candidate.sampleSize, 4);
    ok(
      "T2 no PASS2 method",
      !(res.candidate.discoveryMethods || []).includes("PASS2_CATEGORY"),
    );
  }
  setWorkRatePass2AllowlistForTests(null);
}

// ——— T3 Owner category URL = extra fetch ———
{
  clearWorkRateResearchAntiStormState();
  setWorkRatePass2AllowlistForTests([
    { sourceId: "kb_pl", categoryKey: "painting", url: PASS2_URL },
  ]);
  const port = createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: htmlOffer({ rate: 35 }) },
    "kb_pl::painting": {
      html: htmlOffer({ rate: 50 }),
      requestUrl: PASS2_URL,
      finalUrl: PASS2_URL,
    },
    cennikremontow_pl: { html: htmlOffer({ rate: 40 }) },
    sccot: { html: htmlOffer({ rate: 38 }) },
    extradom: { html: htmlOffer({ rate: 42 }) },
  });
  const store = makeStore([makeWork()]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: port,
    bypassCooldown: true,
  });
  eq("T3 CANDIDATE", res.status, "CANDIDATE");
  if (res.status === "CANDIDATE") {
    eq("T3 sample 5", res.candidate.sampleSize, 5);
    ok(
      "T3 PASS2 method",
      (res.candidate.discoveryMethods || []).includes("PASS2_CATEGORY"),
    );
    ok(
      "T3 PASS1 method",
      (res.candidate.discoveryMethods || []).includes("PASS1_CANONICAL"),
    );
  }
  // T4 shared qualified[]
  if (res.status === "CANDIDATE") {
    ok("T4 shared observations", res.candidate.observations.length === 5);
  }
  setWorkRatePass2AllowlistForTests(null);
}

// ——— T5 duplicate URL / observation does not inflate sample ———
{
  clearWorkRateResearchAntiStormState();
  // PASS2 points at same URL as PASS1 canonical → URL dedupe
  const sameAsPass1 =
    "https://kb.pl/cenniki/miejskie/remonty-mieszkan/wroclaw/";
  setWorkRatePass2AllowlistForTests([
    { sourceId: "kb_pl", categoryKey: "painting", url: sameAsPass1 },
  ]);
  const store = makeStore([makeWork()]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: fourPass1Fixtures(),
    bypassCooldown: true,
  });
  eq("T5 CANDIDATE", res.status, "CANDIDATE");
  if (res.status === "CANDIDATE") {
    eq("T5 sample still 4", res.candidate.sampleSize, 4);
  }
  ok(
    "T5 telemetry DEDUPED",
    (res.telemetry || []).some((t) => t.code === "DEDUPED"),
  );
  setWorkRatePass2AllowlistForTests(null);
}

// ——— T6 L+M still rejected ———
{
  const offer = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html: htmlOffer({ rate: 90, laborOnly: false, includesMaterial: true }),
    sourceUrl: "https://kb.pl/?s=x",
    expectedNamePl: NAME,
    expectedUnit: UNIT,
  })[0];
  const q = qualifyWorkRateObservation({
    offer,
    expectedWorkId: WORK_ID,
    expectedUnit: UNIT,
  });
  eq("T6 L+M reject", q.ok, false);
}

// ——— T7 incompatible unit ———
{
  const offer = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html: htmlOffer({ rate: 35, unit: "mb" }),
    sourceUrl: "https://kb.pl/?s=x",
    expectedNamePl: NAME,
    expectedUnit: UNIT,
  })[0];
  const q = qualifyWorkRateObservation({
    offer,
    expectedWorkId: WORK_ID,
    expectedUnit: UNIT,
  });
  eq("T7 unit reject", q.ok, false);
  if (!q.ok) eq("T7 reason", q.reason, "unit_mismatch");
}

// ——— T8 companyPrice ≠ OUR RATE ———
{
  clearWorkRateResearchAntiStormState();
  const store = makeStore([makeWork({ companyPricePln: 999 })]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: fourPass1Fixtures(),
    bypassCooldown: true,
  });
  eq("T8 CANDIDATE", res.status, "CANDIDATE");
  if (res.status === "CANDIDATE") {
    eq("T8 not companyPrice", res.candidate.suggestedRatePln, 39);
    ok("T8 ≠ 999", res.candidate.suggestedRatePln !== 999);
    const accepted = acceptWorkRateResearchCandidate({
      store,
      candidate: res.candidate,
    });
    eq("T8 Accept ok", accepted.ok, true);
    if (accepted.ok) {
      const hit = lookupWorkRate(accepted.store, WORK_ID, UNIT, NOW);
      eq("T8 OUR RATE from candidate", hit.status !== "MISSING" ? hit.ourRatePln : null, 39);
      const w = accepted.store.catalogs.wroclaw.works.find((x) => x.id === WORK_ID);
      eq("T8 companyPrice untouched", w.companyPricePln, 999);
    }
  }
}

// ——— T9 arbitrary URL rejected ———
{
  const r = resolveWorkRateSelectiveLookupRequest({
    sourceId: "kb_pl",
    query: NAME,
    url: "https://kb.pl/evil",
    hasOwnUrlProperty: true,
  });
  eq("T9 reject url", r.ok, false);
  if (!r.ok) eq("T9 error", r.error, "arbitrary_url_forbidden");
}

// ——— T10 unknown sourceId ———
{
  const r = resolveWorkRateSelectiveLookupRequest({
    sourceId: "evil_source",
    query: NAME,
  });
  eq("T10 reject source", r.ok, false);
  if (!r.ok) eq("T10 error", r.error, "invalid_sourceId");
}

// ——— T11 unknown categoryKey ———
{
  setWorkRatePass2AllowlistForTests(null);
  const r = resolveWorkRateSelectiveLookupRequest({
    sourceId: "kb_pl",
    query: NAME,
    categoryKey: "painting",
  });
  eq("T11 reject category", r.ok, false);
  if (!r.ok) eq("T11 error", r.error, "unknown_category_key");
  eq("T11 resolve null", resolveWorkRatePass2Url("kb_pl", "painting"), null);
}

// ——— T12 redirect host (allowlist host check) ———
{
  ok("T12 evil host reject", !isWorkRateSelectiveUrlAllowed("https://evil.example/x"));
  ok(
    "T12 allowlisted host ok",
    isWorkRateSelectiveUrlAllowed("https://kb.pl/cenniki/kategorie/malowanie/"),
  );
  // Edge re-checks finalUrl after redirect — same helper
  ok(
    "T12 off-host redirect would reject",
    !isWorkRateSelectiveUrlAllowed("https://attacker.tld/steal"),
  );
}

// ——— T13 no observations = GAP ———
{
  clearWorkRateResearchAntiStormState();
  const emptyPort = createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: "<html><body>brak cennika</body></html>" },
    cennikremontow_pl: { html: "<html><body>brak</body></html>" },
    sccot: { html: "<html><body>brak</body></html>" },
    extradom: { html: "<html><body>brak</body></html>" },
  });
  const store = makeStore([makeWork()]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: emptyPort,
    bypassCooldown: true,
  });
  eq("T13 GAP", res.status, "GAP");
  ok(
    "T13 PARSE_EMPTY telemetry",
    (res.telemetry || []).some((t) => t.code === "PARSE_EMPTY"),
  );
}

// ——— T14 Candidate only after qualified ———
{
  clearWorkRateResearchAntiStormState();
  const store = makeStore([makeWork()]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: fourPass1Fixtures(),
    bypassCooldown: true,
  });
  eq("T14 CANDIDATE", res.status, "CANDIDATE");
  if (res.status === "CANDIDATE") {
    ok("T14 observations>0", res.candidate.observations.length > 0);
    ok(
      "T14 all laborOnly",
      res.candidate.observations.every((o) => o.laborOnly === true),
    );
  }
}

// ——— T15 synonym alone ≠ Candidate ———
{
  clearWorkRateResearchAntiStormState();
  const names = listWorkRateMatchNamesPl("Skasowanie wykwitów i zacieków");
  ok("T15 has synonyms", names.length > 1);
  const emptyPort = createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: "<html><body>nic</body></html>" },
    cennikremontow_pl: { html: "<html><body>nic</body></html>" },
    sccot: { html: "<html><body>nic</body></html>" },
    extradom: { html: "<html><body>nic</body></html>" },
  });
  const store = makeStore([
    makeWork({
      id: "cw.repairs.efflorescence",
      namePl: "Skasowanie wykwitów i zacieków",
      unit: "m2",
    }),
  ]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: "cw.repairs.efflorescence",
    unit: "m2",
    namePl: "Skasowanie wykwitów i zacieków",
    nowMs: NOW,
    lookupPort: emptyPort,
    bypassCooldown: true,
  });
  eq("T15 synonym GAP", res.status, "GAP");
}

// ——— T16 synonym does not bypass LABOR_ONLY ———
{
  const offer = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html: htmlOffer({
      name: "wykwity",
      rate: 80,
      laborOnly: false,
      includesMaterial: true,
    }),
    sourceUrl: "https://kb.pl/?s=x",
    expectedNamePl: "Skasowanie wykwitów i zacieków",
    expectedUnit: "m2",
    alternateNamesPl: listWorkRateMatchNamesPl("Skasowanie wykwitów i zacieków").slice(1),
  })[0];
  ok("T16 parsed via synonym", Boolean(offer));
  if (offer) {
    const q = qualifyWorkRateObservation({
      offer,
      expectedWorkId: "cw.repairs.efflorescence",
      expectedUnit: "m2",
    });
    eq("T16 L+M still reject", q.ok, false);
  }
}

// ——— T17 telemetry codes ———
{
  clearWorkRateResearchAntiStormState();
  const emptyPort = createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: "<html><body>empty page xyz</body></html>" },
    cennikremontow_pl: { html: "<html><body>empty</body></html>" },
    sccot: { html: "<html><body>empty</body></html>" },
    extradom: { html: "<html><body>empty</body></html>" },
  });
  const store = makeStore([makeWork()]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: emptyPort,
    bypassCooldown: true,
  });
  const codes = new Set((res.telemetry || []).map((t) => t.code));
  ok("T17 PARSE_EMPTY", codes.has("PARSE_EMPTY"));
  ok("T17 GAP", codes.has("GAP"));

  clearWorkRateResearchAntiStormState();
  const missPort = createFixtureWorkRateSelectiveLookup({});
  const res2 = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: missPort,
    bypassCooldown: true,
  });
  const codes2 = new Set((res2.telemetry || []).map((t) => t.code));
  ok("T17 NO_PAGE_HIT", codes2.has("NO_PAGE_HIT"));

  clearWorkRateResearchAntiStormState();
  const lmPort = createFixtureWorkRateSelectiveLookup({
    kb_pl: {
      html: htmlOffer({ rate: 90, laborOnly: false, includesMaterial: true }),
    },
    cennikremontow_pl: {
      html: htmlOffer({ rate: 90, laborOnly: false, includesMaterial: true }),
    },
    sccot: {
      html: htmlOffer({ rate: 90, laborOnly: false, includesMaterial: true }),
    },
    extradom: {
      html: htmlOffer({ rate: 90, laborOnly: false, includesMaterial: true }),
    },
  });
  const res3 = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: lmPort,
    bypassCooldown: true,
  });
  const codes3 = new Set((res3.telemetry || []).map((t) => t.code));
  ok("T17 LABOR_ONLY_REJECT", codes3.has("LABOR_ONLY_REJECT"));
}

// ——— Evidence provenance + companyPrice excluded ———
{
  clearWorkRateResearchAntiStormState();
  setWorkRatePass2AllowlistForTests([
    { sourceId: "kb_pl", categoryKey: "painting", url: PASS2_URL },
  ]);
  const port = createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: htmlOffer({ rate: 35 }) },
    "kb_pl::painting": {
      html: htmlOffer({ rate: 50 }),
      requestUrl: PASS2_URL,
      finalUrl: PASS2_URL,
    },
    cennikremontow_pl: { html: htmlOffer({ rate: 40 }) },
    sccot: { html: htmlOffer({ rate: 38 }) },
    extradom: { html: htmlOffer({ rate: 42 }) },
  });
  const store = makeStore([makeWork()]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: port,
    bypassCooldown: true,
  });
  if (res.status === "CANDIDATE") {
    const pack = buildPack(res.candidate, res.rejects, { httpFetchCount: 0 });
    ok("evidence pack", Boolean(pack));
    if (pack) {
      eq("evidence rate = candidate", pack.candidateRatePln, res.candidate.suggestedRatePln);
      eq("evidence companyPrice excluded", pack.companyPricePlnExcluded, true);
      ok("evidence discovery provenance", Boolean(pack.provenance.discovery));
    }
  }
  setWorkRatePass2AllowlistForTests(null);
}

// ——— T18 W2 regression pointer (smoke selective candidate) ———
{
  clearWorkRateResearchAntiStormState();
  const store = makeStore([makeWork()]);
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW,
    lookupPort: fourPass1Fixtures(),
    bypassCooldown: true,
  });
  eq("T18 W2-shape CANDIDATE", res.status, "CANDIDATE");
  if (res.status === "CANDIDATE") {
    const accepted = acceptWorkRateResearchCandidate({
      store,
      candidate: res.candidate,
    });
    eq("T18 Accept", accepted.ok, true);
    if (accepted.ok) {
      const hit = lookupWorkRate(accepted.store, WORK_ID, UNIT, NOW);
      eq("T18 OUR RATE CURRENT", hit.status, "CURRENT");
      const reuse = await runSelectiveWorkRateResearch({
        store: accepted.store,
        workId: WORK_ID,
        unit: UNIT,
        namePl: NAME,
        nowMs: NOW,
        lookupPort: fourPass1Fixtures(),
      });
      eq("T18 REUSE", reuse.status, "REUSE");
      eq("T18 REUSE http 0", reuse.httpFetchCount, 0);
    }
  }
}

console.log(`\nDiscovery-01 INFRA: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
