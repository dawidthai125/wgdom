/**
 * WORK-RATE-RESEARCH-KB-BRUZDY-POLICY-01 — T1–T22 (fixture · ZERO live HTTP · ZERO KV).
 *
 * npx vite-node scripts/test-work-rate-kb-bruzdy-policy-01.mjs
 */
import {
  acceptWorkRateResearchCandidate,
  buildWorkRateFixtureHtml,
  clearWorkRateResearchAntiStormState,
  computeProposedWorkRatePln,
  createFixtureWorkRateSelectiveLookup,
  isCompanyPriceForbiddenAsWorkRateBase,
  listWorkRateMatchNamesPl,
  namesLooselyMatch,
  normalizeWorkCatalogStore,
  parseWorkRateOffersFromHtml,
  qualifyWorkRateObservation,
  resolveWorkRateSelectiveLookupRequest,
  resolveWorkRateWorkFamily,
  runSelectiveWorkRateResearch,
  WORK_RATE_OWNER_SYNONYMS,
  WORK_RATE_PASS2_CATEGORY_ALLOWLIST,
  computeWorkRateMarketBaseFromRange,
} from "../src/lib/work-catalog/index.ts";
import { namesLooselyMatchAny } from "../src/lib/work-catalog/work-rate-source-html-parse.ts";
import {
  applyGlobalCommercialMarginFloorToStore,
  applyGlobalMarginFloor,
  computeSellPricePln,
  patchWorkCommercialPricing,
  resolveMarginPct,
} from "../src/lib/price-intelligence/index.ts";
import { buildLaborRateEvidencePack } from "../src/lib/ik-pricing-orchestrator/labor-rate-evidence.ts";

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

const NOW = Date.parse("2026-08-14T12:00:00.000Z");
const T_FRESH = "2026-08-14T10:00:00.000Z";
const WORK_ID = "cc-p0c-w1-zaprawianie-bruzd";
const UNIT = "mb";
const NAME = "Zaprawianie / zamurowanie bruzd";
const KB_URL =
  "https://kb.pl/cenniki/uslugi/cennik-naprawy-ubytkow-w-scianie-i-suficie-aktualne-ceny/";
const ALIAS = "szpachlowanie bruzd po kablach";

const KB_HTML = `
<html><body>
<table>
<tr><th>Usługa</th><th>Średnia cena od</th><th>Średnia cena do</th></tr>
<tr><td>Szpachlowanie bruzd po kablach</td><td>15,00 zł/mb</td><td>25,00 zł/mb</td></tr>
<tr><td>Kucie bruzd pod instalacje hydrauliczne</td><td>55,00 zł/mb</td><td>90,00 zł/mb</td></tr>
</table>
</body></html>
`;

function makeWork(overrides = {}) {
  return {
    id: WORK_ID,
    tradeId: "ELEKTRYKA",
    namePl: NAME,
    unit: UNIT,
    companyPricePln: 35,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 20, updatedAt: T_FRESH, source: "owner" },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["bruzdy"],
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

// ——— T1 / T3 alias identity ———
{
  const names = listWorkRateMatchNamesPl(NAME);
  ok("T1 alias in match names", names.some((n) => n === ALIAS), names);
  ok(
    "T3 namesLooselyMatchAny alias",
    namesLooselyMatchAny(names, ALIAS).ok,
  );
  ok(
    "T1 synonym table row",
    WORK_RATE_OWNER_SYNONYMS.some(
      (r) =>
        r.canonicalConcept === "zaprawianie bruzd" &&
        r.synonym === ALIAS &&
        r.allowedForMatching,
    ),
  );
}

// ——— T2 kucie reject ———
{
  ok(
    "T2 kucie ≠ alias",
    !namesLooselyMatch(NAME, "Kucie bruzd pod instalacje hydrauliczne"),
  );
  ok(
    "T2 kucie ≠ szpachlowanie",
    !namesLooselyMatch(ALIAS, "Kucie bruzd pod instalacje hydrauliczne"),
  );
}

// ——— T4 bare szpachlowanie bruzd unsupported ———
{
  const names = listWorkRateMatchNamesPl(NAME);
  ok(
    "T4 bare szpachlowanie not approved synonym",
    !WORK_RATE_OWNER_SYNONYMS.some((r) => r.synonym === "szpachlowanie bruzd"),
  );
  ok(
    "T4 bare phrase may fail first-token vs zaprawianie",
    !namesLooselyMatch(NAME, "szpachlowanie bruzd"),
  );
  // Even if in alternate list somehow — not in Owner table
  ok("T4 not in match list as exact", !names.includes("szpachlowanie bruzd"));
}

// ——— T5 / T6 / T7 / T8 range → marketBase ———
{
  eq("T5 midpoint", computeWorkRateMarketBaseFromRange(15, 25), 20);
  eq("T6 proposed 24", computeProposedWorkRatePln(20, 20), 24);
  const offers = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html: KB_HTML,
    sourceUrl: KB_URL,
    expectedNamePl: NAME,
    expectedUnit: UNIT,
    alternateNamesPl: listWorkRateMatchNamesPl(NAME).slice(1),
    observedAt: T_FRESH,
  });
  eq("T5 parse one row", offers.length, 1);
  const o = offers[0];
  eq("T5 rate=marketBase 20", o.ratePln, 20);
  eq("T7 sourceMin 15", o.sourceMinPln, 15);
  eq("T7 sourceMax 25", o.sourceMaxPln, 25);
  eq("T8 marketBaseKind range", o.marketBaseKind, "range_midpoint");
  ok("T21 not lower bound", o.ratePln !== 15);
  ok("T22 not single max as source alone", o.sourceMinPln !== o.sourceMaxPln);
}

// ——— T9 national region ———
{
  const offers = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html: KB_HTML,
    sourceUrl: KB_URL,
    expectedNamePl: NAME,
    expectedUnit: UNIT,
    alternateNamesPl: [ALIAS],
    observedAt: T_FRESH,
  });
  eq("T9 region POLSKA", offers[0]?.regionScope, "POLSKA");
  ok("T9 not WROCLAW", offers[0]?.regionScope !== "WROCLAW");

  const wroclawUrl =
    "https://kb.pl/cenniki/miejskie/remonty-mieszkan/wroclaw/";
  const wOffers = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html: buildWorkRateFixtureHtml({
      name: "Malowanie ścian",
      rate: 30,
      unit: "m2",
      region: "WROCLAW",
    }),
    sourceUrl: wroclawUrl,
    expectedNamePl: "Malowanie ścian",
    expectedUnit: "m2",
    observedAt: T_FRESH,
  });
  // fixture marker forces region from data-region; URL-only path:
  const urlOnly = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html: `<table><tr><td>Malowanie ścian</td><td>30 zł/m2</td></tr></table>`,
    sourceUrl: wroclawUrl,
    expectedNamePl: "Malowanie ścian",
    expectedUnit: "m2",
    observedAt: T_FRESH,
  });
  eq("T9 wroclaw URL → WROCLAW", urlOnly[0]?.regionScope, "WROCLAW");
  void wOffers;
}

// ——— T10 width ———
{
  clearWorkRateResearchAntiStormState();
  const port = createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: "<html></html>" },
    "kb_pl::grooves": {
      html: KB_HTML,
      requestUrl: KB_URL,
      finalUrl: KB_URL,
    },
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
  eq("T10 family grooves", resolveWorkRateWorkFamily({ workId: WORK_ID, namePl: NAME }), "grooves");
  eq("T10 CANDIDATE", res.status, "CANDIDATE");
  if (res.status === "CANDIDATE") {
    eq("T10 width NOT_SPECIFIED", res.candidate.widthClaim, "NOT_SPECIFIED");
    eq("T10 marketBase 20", res.candidate.marketBaseRatePln, 20);
    eq("T10 proposed 24", res.candidate.proposedOurRatePln, 24);
    eq("T10 suggested=proposed", res.candidate.suggestedRatePln, 24);
    eq("T10 sourceMin", res.candidate.sourceMinPln, 15);
    eq("T10 sourceMax", res.candidate.sourceMaxPln, 25);
    eq("T10 region POLSKA", res.candidate.regionScope, "POLSKA");
    eq("T10 country POLSKA", res.candidate.countryScope, "POLSKA");
    eq("T11 sample 1", res.candidate.sampleSize, 1);
    ok("T11 lowSample", res.candidate.lowSample === true);
    ok(
      "T1 synonym used",
      res.candidate.synonymUsed === ALIAS ||
        res.candidate.observations[0]?.workNamePl.toLowerCase().includes("szpachlowanie"),
    );

    const pack = buildLaborRateEvidencePack(res.candidate, res.rejects);
    ok("T10 evidence pack", pack != null);
    eq("T8 evidence marketBase DERIVED layer", pack?.provenance.layers.marketBase, "DERIVED");
    eq("T7 evidence sourceMin", pack?.sourceMinPln, 15);
    eq("T6 evidence proposed", pack?.proposedOurRatePln, 24);
    eq("T6 evidence candidateRate", pack?.candidateRatePln, 24);
  }
  eq("T10 no live fetch", fetchCalls, 0);
}

// ——— T12 companyPrice forbidden ———
{
  ok("T12 companyPrice forbidden helper", isCompanyPriceForbiddenAsWorkRateBase());
  const base = computeWorkRateMarketBaseFromRange(15, 25);
  ok("T12 companyPrice 35 ≠ marketBase", base !== 35);
  ok("T12 companyPrice ≠ proposed", computeProposedWorkRatePln(20, 20) !== 35);
}

// ——— T13 Expert RO flags (static contract via evidence/rec types) ———
{
  const { analyzeLaborRateCandidate } = await import(
    "../src/lib/ik-pricing-orchestrator/labor-rate-expert-rec.ts"
  );
  const store = makeStore([makeWork()]);
  clearWorkRateResearchAntiStormState();
  const port = createFixtureWorkRateSelectiveLookup({
    "kb_pl::grooves": { html: KB_HTML, requestUrl: KB_URL, finalUrl: KB_URL },
    kb_pl: { html: "<html></html>" },
  });
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW + 1,
    lookupPort: port,
    bypassCooldown: true,
  });
  if (res.status === "CANDIDATE") {
    const pack = buildLaborRateEvidencePack(res.candidate, res.rejects);
    const rec = analyzeLaborRateCandidate({
      pack,
      sourceCandidate: res.candidate,
    });
    eq("T13 expertMayWrite false", rec.expertMayWrite, false);
    eq("T13 expertMayAccept false", rec.expertMayAccept, false);
    eq("T13 aiAutoAccept false", rec.aiAutoAccept, false);
  } else {
    ok("T13 CANDIDATE required", false, res);
  }
}

// ——— T14 Owner Accept only write ———
{
  clearWorkRateResearchAntiStormState();
  const store = makeStore([makeWork()]);
  const port = createFixtureWorkRateSelectiveLookup({
    "kb_pl::grooves": { html: KB_HTML, requestUrl: KB_URL, finalUrl: KB_URL },
    kb_pl: { html: "<html></html>" },
  });
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW + 2,
    lookupPort: port,
    bypassCooldown: true,
  });
  ok("T14 research does not write OUR RATE", !store.catalogs.wroclaw.works[0].ourWorkRate);
  if (res.status === "CANDIDATE") {
    const accepted = acceptWorkRateResearchCandidate({
      store,
      candidate: res.candidate,
      observedAt: T_FRESH,
      updatedAt: T_FRESH,
    });
    eq("T14 Accept ok", accepted.ok, true);
    if (accepted.ok) {
      eq(
        "T14 OUR RATE = proposed 24",
        accepted.store.catalogs.wroclaw.works.find((w) => w.id === WORK_ID)
          ?.ourWorkRate?.ourRatePln,
        24,
      );
      eq(
        "T14 companyPrice untouched",
        accepted.store.catalogs.wroclaw.works.find((w) => w.id === WORK_ID)
          ?.companyPricePln,
        35,
      );
    }
  }
}

// ——— T15 / T16 URL / category ———
{
  const bad = resolveWorkRateSelectiveLookupRequest({
    sourceId: "kb_pl",
    query: NAME,
    url: KB_URL,
    hasOwnUrlProperty: true,
  });
  eq("T15 arbitrary URL reject", bad.ok, false);
  if (!bad.ok) eq("T15 error", bad.error, "arbitrary_url_forbidden");

  const unk = resolveWorkRateSelectiveLookupRequest({
    sourceId: "kb_pl",
    query: NAME,
    categoryKey: "painting_unknown_xyz",
  });
  eq("T16 unknown category", unk.ok, false);
  if (!unk.ok) eq("T16 error", unk.error, "unknown_category_key");

  const okPass2 = resolveWorkRateSelectiveLookupRequest({
    sourceId: "kb_pl",
    query: NAME,
    categoryKey: "grooves",
  });
  eq("T15 pass2 ok", okPass2.ok, true);
  if (okPass2.ok) {
    eq("T15 pass2 url", okPass2.url, KB_URL);
    eq("T15 method PASS2", okPass2.discoveryMethod, "PASS2_CATEGORY");
  }
  ok(
    "T15 allowlist has grooves",
    WORK_RATE_PASS2_CATEGORY_ALLOWLIST.some(
      (e) => e.sourceId === "kb_pl" && e.categoryKey === "grooves",
    ),
  );
}

// ——— T17 GAP empty ———
{
  clearWorkRateResearchAntiStormState();
  const store = makeStore([makeWork()]);
  const port = createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: "<html><body>empty</body></html>" },
    "kb_pl::grooves": {
      html: "<html><body>brak pozycji</body></html>",
      requestUrl: KB_URL,
      finalUrl: KB_URL,
    },
  });
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    nowMs: NOW + 3,
    lookupPort: port,
    bypassCooldown: true,
  });
  eq("T17 GAP", res.status, "GAP");
}

// ——— T18 PASS1 regression painting ———
{
  clearWorkRateResearchAntiStormState();
  const paintId = "cw.paint.walls";
  const paintName = "Malowanie ścian dwukrotne";
  const paintWork = {
    ...makeWork({
      id: paintId,
      namePl: paintName,
      unit: "m2",
      tradeId: "MALOWANIE",
      commercialPricing: { marginPct: 0, updatedAt: T_FRESH, source: "owner" },
    }),
  };
  const html = buildWorkRateFixtureHtml({
    name: paintName,
    rate: 40,
    unit: "m2",
    region: "WROCLAW",
  });
  const store = makeStore([paintWork]);
  const port = createFixtureWorkRateSelectiveLookup({
    kb_pl: { html },
    sccot: { html },
    extradom: { html },
    cennikremontow_pl: { html },
  });
  const res = await runSelectiveWorkRateResearch({
    store,
    workId: paintId,
    unit: "m2",
    namePl: paintName,
    nowMs: NOW + 4,
    lookupPort: port,
    bypassCooldown: true,
  });
  eq("T18 PASS1 CANDIDATE", res.status, "CANDIDATE");
  if (res.status === "CANDIDATE") {
    eq("T18 marketBase 40", res.candidate.marketBaseRatePln, 40);
    eq("T18 proposed 40 @0%", res.candidate.suggestedRatePln, 40);
  }
}

// ——— T19 / T20 material margin engine unchanged ———
{
  const sell = computeSellPricePln(100, 20);
  eq("T19 computeSellPricePln", sell, 120);
  eq("T19 REUSE proposed", computeProposedWorkRatePln(100, 20), 120);
  eq("T20 MAX floor", applyGlobalMarginFloor(10, 20), 20);
  eq("T20 MAX keeps higher", applyGlobalMarginFloor(25, 20), 25);
  let store = makeStore([makeWork({ commercialPricing: { marginPct: 10, updatedAt: T_FRESH, source: "owner" } })]);
  store = applyGlobalCommercialMarginFloorToStore(store, [WORK_ID], 20, T_FRESH);
  eq(
    "T20 store floor MAX",
    resolveMarginPct(store.catalogs.wroclaw.works[0]),
    20,
  );
  const patched = patchWorkCommercialPricing(store, WORK_ID, 18, T_FRESH, "owner");
  ok("T19 patch still works", patched != null);
}

// ——— T2 kucie not qualified from KB html ———
{
  const offers = parseWorkRateOffersFromHtml({
    sourceId: "kb_pl",
    html: KB_HTML,
    sourceUrl: KB_URL,
    expectedNamePl: NAME,
    expectedUnit: UNIT,
    alternateNamesPl: listWorkRateMatchNamesPl(NAME).slice(1),
    observedAt: T_FRESH,
  });
  ok(
    "T2 no kucie offer",
    !offers.some((o) => /kucie/i.test(o.workNamePl)),
  );
  const q = qualifyWorkRateObservation({
    offer: {
      sourceId: "kb_pl",
      workNamePl: "Kucie bruzd",
      ratePln: 70,
      currency: "PLN",
      unit: "mb",
      regionScope: "POLSKA",
      laborOnly: true,
      includesMaterial: false,
      vatIncluded: null,
      netGross: "unknown",
      priceKind: "regular",
      sourceUrl: KB_URL,
      identityMatched: false,
      observedAt: T_FRESH,
    },
    expectedWorkId: WORK_ID,
    expectedUnit: UNIT,
  });
  eq("T2 identity reject", q.ok, false);
}

console.log(`\nKB-BRUZDY-POLICY-01: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
