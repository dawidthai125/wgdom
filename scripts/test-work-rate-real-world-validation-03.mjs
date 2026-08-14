/**
 * WORK-RATE-REAL-WORLD-VALIDATION-03 — real HTML fixtures (offline).
 * npx vite-node scripts/test-work-rate-real-world-validation-03.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  WORK_RATE_CANONICAL_CENNIK_URL,
  acceptWorkRateResearchCandidate,
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  lookupWorkRate,
  normalizeWorkCatalogStore,
  parseWorkRateOffersFromHtml,
  qualifyWorkRateObservation,
  runSelectiveWorkRateResearch,
} from "../src/lib/work-catalog/index.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(__dirname, "..", ".tmp-work-rate-rw-03");
if (!fs.existsSync(path.join(FIX, "kb.html"))) {
  console.log("SKIP RW-03 — brak lokalnych HTML w .tmp-work-rate-rw-03 (pobierz źródła lokalnie przed audytem).");
  process.exit(0);
}

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

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};
globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

/** NOW must be ≥ wall-clock Accept timestamps (accept uses new Date()). */
const NOW = Date.parse("2026-08-20T10:00:00.000Z");
const T = "2026-08-12T09:00:00.000Z";

function loadHtml(name) {
  return fs.readFileSync(path.join(FIX, name), "utf8");
}

const realFixtures = createFixtureWorkRateSelectiveLookup({
  kb_pl: {
    html: loadHtml("kb.html"),
    finalUrl: WORK_RATE_CANONICAL_CENNIK_URL.kb_pl,
  },
  sccot: {
    html: loadHtml("sccot.html"),
    finalUrl: WORK_RATE_CANONICAL_CENNIK_URL.sccot,
  },
  extradom: {
    html: loadHtml("extradom.html"),
    finalUrl: WORK_RATE_CANONICAL_CENNIK_URL.extradom,
  },
  cennikremontow_pl: {
    html: loadHtml("cr.html"),
    finalUrl: WORK_RATE_CANONICAL_CENNIK_URL.cennikremontow_pl,
  },
});

const WORKS = [
  /** Owner Classification Gate LABOR seed (A1) — unmapped cw.* → UNKNOWN → research BLOCKED. */
  { workId: "legacy-malowanie-m2", namePl: "Malowanie ścian", unit: "m2" },
  { workId: "cw.primer.walls", namePl: "Gruntowanie ścian", unit: "m2" },
  { workId: "cw.skim.coat", namePl: "Gładź gipsowa", unit: "m2" },
  { workId: "cw.panels.floor", namePl: "Układanie paneli podłogowych", unit: "m2" },
];

function makeStore(work) {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: {
        region: "wroclaw",
        works: [
          {
            id: work.workId,
            tradeId: "MALOWANIE",
            namePl: work.namePl,
            unit: work.unit,
            companyPricePln: 35,
            marketQuotes: {},
            marketQuoteHistory: [],
            commercialPricing: { marginPct: 0, updatedAt: T, source: "owner" },
            updatedAt: T,
            freshnessStatus: "ok",
            keywords: [],
            active: true,
            favorite: false,
            usageCount: 0,
            source: "custom",
          },
        ],
        updatedAt: T,
      },
      dolnyslask: {
        region: "dolnyslask",
        works: [
          {
            id: work.workId,
            tradeId: "MALOWANIE",
            namePl: work.namePl,
            unit: work.unit,
            companyPricePln: 35,
            marketQuotes: {},
            marketQuoteHistory: [],
            commercialPricing: { marginPct: 0, updatedAt: T, source: "owner" },
            updatedAt: T,
            freshnessStatus: "ok",
            keywords: [],
            active: true,
            favorite: false,
            usageCount: 0,
            source: "custom",
          },
        ],
        updatedAt: T,
      },
    },
    updatedAt: T,
  });
}

console.log("=== PER-SOURCE PARSE / QUALIFY ===");
const sourceReport = {};

for (const sourceId of ["kb_pl", "sccot", "extradom", "cennikremontow_pl"]) {
  const htmlKey =
    sourceId === "kb_pl"
      ? "kb.html"
      : sourceId === "sccot"
        ? "sccot.html"
        : sourceId === "extradom"
          ? "extradom.html"
          : "cr.html";
  const html = loadHtml(htmlKey);
  const url = WORK_RATE_CANONICAL_CENNIK_URL[sourceId];
  const work = WORKS[0];
  const offers = parseWorkRateOffersFromHtml({
    sourceId,
    html,
    sourceUrl: url,
    expectedNamePl: work.namePl,
    expectedUnit: work.unit,
    observedAt: T,
  });
  console.log(`\n${sourceId} offers for "${work.namePl}":`, offers.length);
  for (const o of offers) {
    console.log(
      " ",
      o.workNamePl,
      o.ratePln,
      o.unit,
      o.regionScope,
      o.priceKind,
      "labor",
      o.laborOnly,
      "mat",
      o.includesMaterial,
    );
  }
  const quals = offers.map((offer) =>
    qualifyWorkRateObservation({
      offer,
      expectedWorkId: work.workId,
      expectedUnit: work.unit,
    }),
  );
  const okQ = quals.filter((q) => q.ok);
  const rej = quals.filter((q) => !q.ok);
  let status = "RATE_GAP";
  if (okQ.length > 0) status = "PASS";
  else if (offers.length > 0 && rej.length > 0) status = "REJECT";
  sourceReport[sourceId] = { status, offers: offers.length, qualified: okQ.length, rejects: rej.map((r) => (!r.ok ? r.reason : "")) };
  console.log(" STATUS", status, "qualified", okQ.length, "rejects", rej.map((r) => (!r.ok ? r.reason : "")));
}

ok("KB parse finds malowanie", sourceReport.kb_pl.offers > 0);
ok("Extradom parse finds malowanie", sourceReport.extradom.offers > 0);
ok("CR parse finds malowanie", sourceReport.cennikremontow_pl.offers > 0);

console.log("\n=== FULL FLOW MISS→RESEARCH→ACCEPT→REUSE ===");
clearWorkRateResearchAntiStormState();
const paint = WORKS[0];
let store = makeStore(paint);
const pm0 = JSON.stringify(store.catalogs.wroclaw.works[0].companyPricePln);
const before = fetchCalls;

const res1 = await runSelectiveWorkRateResearch({
  store,
  workId: paint.workId,
  unit: paint.unit,
  namePl: paint.namePl,
  nowMs: NOW,
  bypassCooldown: true,
  lookupPort: realFixtures,
});
console.log("research1", res1.status, res1.status === "CANDIDATE" ? res1.candidate.suggestedRatePln : res1);
ok("research CANDIDATE or GAP", res1.status === "CANDIDATE" || res1.status === "GAP");
eq("no live fetch", fetchCalls, before);

if (res1.status === "CANDIDATE") {
  console.log(
    "median",
    res1.candidate.suggestedRatePln,
    "sample",
    res1.candidate.sampleSize,
    "region",
    res1.candidate.regionScope,
    "obs",
    res1.candidate.observations.map((o) => `${o.sourceId}:${o.ratePln}`),
  );
  const accepted = acceptWorkRateResearchCandidate({
    store,
    candidate: res1.candidate,
  });
  eq("Accept ok", accepted.ok, true);
  if (accepted.ok) {
    store = accepted.store;
    const hit = lookupWorkRate(store, paint.workId, paint.unit, NOW);
    eq("OUR RATE CURRENT", hit.status, "CURRENT");
    eq("companyPrice untouched", store.catalogs.wroclaw.works[0].companyPricePln, 35);
    eq("PM field untouched", JSON.stringify(store.catalogs.wroclaw.works[0].companyPricePln), pm0);

    clearWorkRateResearchAntiStormState();
    const before2 = fetchCalls;
    const res2 = await runSelectiveWorkRateResearch({
      store,
      workId: paint.workId,
      unit: paint.unit,
      namePl: paint.namePl,
      nowMs: NOW,
      lookupPort: realFixtures,
    });
    eq("second REUSE", res2.status, "REUSE");
    eq("second HTTP 0", res2.httpFetchCount ?? 0, 0);
    eq("second no live fetch", fetchCalls, before2);
  }
} else {
  console.log("RATE_GAP overall — insufficient qualifying sources");
}

// SCCOT minimum reject for gruntowanie
{
  const offers = parseWorkRateOffersFromHtml({
    sourceId: "sccot",
    html: loadHtml("sccot.html"),
    sourceUrl: WORK_RATE_CANONICAL_CENNIK_URL.sccot,
    expectedNamePl: "Gruntowanie ścian",
    expectedUnit: "m2",
    observedAt: T,
  });
  ok("SCCOT finds gruntowanie", offers.length > 0);
  if (offers[0]) {
    eq("SCCOT priceKind minimum", offers[0].priceKind, "minimum");
    const q = qualifyWorkRateObservation({
      offer: offers[0],
      expectedWorkId: "cw.primer.walls",
      expectedUnit: "m2",
    });
    eq("SCCOT minimum REJECT", q.ok, false);
  }
}

// Package reject
{
  const offers = parseWorkRateOffersFromHtml({
    sourceId: "sccot",
    html: loadHtml("sccot.html"),
    sourceUrl: WORK_RATE_CANONICAL_CENNIK_URL.sccot,
    expectedNamePl: "Malowanie pokoju 10 m2",
    expectedUnit: "m2",
    observedAt: T,
  });
  if (offers[0]) {
    eq("package kind", offers[0].priceKind, "package");
  }
}

console.log("\nSOURCE_REPORT", JSON.stringify(sourceReport, null, 2));
console.log(`\nWYNIK RW-03: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
