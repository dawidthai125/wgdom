/**
 * WORK-CATALOG-REBUILD-01 P0 — harness.
 *
 * npx vite-node scripts/test-work-catalog-rebuild-01-p0.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OUR_WORK_RATE_HISTORY_CAP,
  WORK_RATE_FRESHNESS_STALE_AFTER_DAYS,
  WORK_RATE_LEGAL_GATE,
  WORK_RATE_REGION_FALLBACK_CHAIN,
  buildWorkRateIdentityKey,
  deriveOurWorkRateFreshness,
  isWorkRateFullCatalogueResearchImplemented,
  isWorkRateKbPlAdapterImplemented,
  lookupWorkRate,
  mergeWorkCatalogStore,
  normalizeWorkCatalogStore,
  patchOurWorkRateInStore,
  requestWorkRateResearch,
  workRateFreshnessLabelPl,
  workRateFreshnessStaleAfterMs,
} from "../src/lib/work-catalog/index.ts";
import { MARKET_SYNC_P3_LEGAL_GATE } from "../src/lib/market-sync/p3-flag.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

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

const NOW = Date.parse("2026-08-11T20:00:00.000Z");
const T_FRESH = "2026-08-10T12:00:00.000Z";
const T_STALE = "2026-04-01T12:00:00.000Z";
const T_EDIT = "2026-08-11T18:00:00.000Z";

const WORK_ID = "cw.paint.walls";
const UNIT = "m2";

function makeQuotes() {
  return {
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
  };
}

function makeWork(overrides = {}) {
  return {
    id: WORK_ID,
    tradeId: "MALOWANIE",
    namePl: "Malowanie ścian",
    unit: UNIT,
    companyPricePln: 35,
    marketQuotes: makeQuotes(),
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
    commercialPricing: {
      marginPct: 15,
      updatedAt: T_FRESH,
      source: "owner",
    },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["malowanie", "sciany"],
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
    updatedAt: T_FRESH,
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: T_FRESH },
    },
  });
}

function snapshotPm(work) {
  return JSON.stringify({
    companyPricePln: work.companyPricePln,
    marketQuotes: work.marketQuotes,
    marketQuoteHistory: work.marketQuoteHistory,
    commercialPricing: work.commercialPricing,
  });
}

// ——— 1 identity ———
eq("T01 identity key", buildWorkRateIdentityKey(WORK_ID, UNIT), `${WORK_ID}|${UNIT}`);
ok(
  "T01b region not in identity",
  !buildWorkRateIdentityKey(WORK_ID, UNIT).includes("WROCLAW"),
);

// ——— C-EMPTY / C-NO-SEED ———
{
  const store = makeStore([makeWork()]);
  const work = store.catalogs.wroclaw.works[0];
  eq("T29 C-EMPTY no ourWorkRate", work.ourWorkRate, undefined);
  eq("T29b companyPrice still 35", work.companyPricePln, 35);
  const miss = lookupWorkRate(store, WORK_ID, UNIT, NOW);
  eq("T29c lookup MISSING", miss.status, "MISSING");
  eq("T29d label PL", miss.statusLabelPl, "BRAK STAWKI");
  ok("T30 C-NO-SEED no seed from 35", miss.ourRatePln === null);
}

// ——— create + lookup CURRENT ———
{
  let store = makeStore([makeWork()]);
  const beforePm = snapshotPm(store.catalogs.wroclaw.works[0]);
  const patched = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 50,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T_FRESH,
    updatedAt: T_EDIT,
  });
  ok("T02 create ok", patched.ok === true);
  store = patched.store;
  const work = store.catalogs.wroclaw.works[0];
  eq("T02b ourRate 50", work.ourWorkRate?.ourRatePln, 50);
  eq("T17 sourceType OWNER", work.ourWorkRate?.sourceType, "OWNER");
  eq("T16 regionScope", work.ourWorkRate?.regionScope, "WROCLAW");
  eq("T15 timestamp observedAt", work.ourWorkRate?.observedAt, T_FRESH);
  eq("T09 companyPrice unchanged 35", work.companyPricePln, 35);
  eq("T10-12 PM snapshot", snapshotPm(work), beforePm);

  const hit = lookupWorkRate(store, WORK_ID, UNIT, NOW);
  eq("T03 lookup", hit.status, "CURRENT");
  eq("T04 CURRENT", hit.ourRatePln, 50);
  eq("T04b label", hit.statusLabelPl, "AKTUALNA");
  const fetchBefore = fetchCalls;
  lookupWorkRate(store, WORK_ID, UNIT, NOW);
  eq("T19 lookup zero HTTP", fetchCalls, fetchBefore);
  eq("T31 second lookup REUSE", lookupWorkRate(store, WORK_ID, UNIT, NOW).ourRatePln, 50);
}

// ——— STALE ———
{
  let store = makeStore([makeWork()]);
  store = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 48,
    sourceType: "OWNER",
    regionScope: "DOLNY_SLASK",
    observedAt: T_STALE,
    updatedAt: T_STALE,
  }).store;
  const hit = lookupWorkRate(store, WORK_ID, UNIT, NOW);
  eq("T05 STALE", hit.status, "STALE");
  eq("T05b rate kept", hit.ourRatePln, 48);
  eq("T05c label", hit.statusLabelPl, "PRZETERMINOWANA");
}

// ——— TTL 90 ———
eq("T07 TTL days", WORK_RATE_FRESHNESS_STALE_AFTER_DAYS, 90);
ok("T07b TTL ms", workRateFreshnessStaleAfterMs() === 90 * 24 * 60 * 60 * 1000);

// ——— Owner edit 50 → 60, companyPrice bitowo ———
{
  let store = makeStore([makeWork({ companyPricePln: 35 })]);
  store = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 50,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T_FRESH,
    updatedAt: T_EDIT,
  }).store;
  const before = store.catalogs.wroclaw.works[0].companyPricePln;
  const pmBefore = snapshotPm(store.catalogs.wroclaw.works[0]);
  store = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 60,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T_EDIT,
    updatedAt: T_EDIT,
  }).store;
  const work = store.catalogs.wroclaw.works[0];
  eq("T08 Owner edit 60", work.ourWorkRate?.ourRatePln, 60);
  eq("T09b companyPrice bitowo", work.companyPricePln, before);
  eq("T09c companyPrice 35", work.companyPricePln, 35);
  eq("T10b PM after edit", snapshotPm(work), pmBefore);
  ok("T13 historia OUR", (work.ourWorkRate?.history?.length ?? 0) === 2);
  eq("T13b change", work.ourWorkRate?.history?.[1]?.changePln, 10);
}

// ——— history cap 24 ———
{
  let store = makeStore([makeWork()]);
  for (let i = 1; i <= 30; i += 1) {
    const r = patchOurWorkRateInStore(store, {
      workId: WORK_ID,
      unit: UNIT,
      ourRatePln: 40 + i * 0.1,
      sourceType: "OWNER",
      regionScope: "POLSKA",
      observedAt: T_FRESH,
      updatedAt: `2026-08-11T18:${String(i).padStart(2, "0")}:00.000Z`,
    });
    ok(`T14 loop ${i}`, r.ok);
    store = r.store;
  }
  const hist = store.catalogs.wroclaw.works[0].ourWorkRate?.history ?? [];
  eq("T14 history cap 24", hist.length, OUR_WORK_RATE_HISTORY_CAP);
  ok(
    "T13c not marketQuoteHistory",
    (store.catalogs.wroclaw.works[0].marketQuoteHistory?.length ?? 0) === 1,
  );
}

// ——— duplicate identity / unit mismatch ———
{
  const store = makeStore([makeWork()]);
  const bad = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: "szt",
    ourRatePln: 99,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T_FRESH,
    updatedAt: T_EDIT,
  });
  eq("T18 UNIT_MISMATCH", bad.ok, false);
  if (!bad.ok) eq("T18b reason", bad.reason, "UNIT_MISMATCH");
  eq("T18c still empty", store.catalogs.wroclaw.works[0].ourWorkRate, undefined);
}

// ——— research Legal PASS · adapter absent · ZERO HTTP ———
{
  const fetchBefore = fetchCalls;
  const res = requestWorkRateResearch({ workId: WORK_ID, unit: UNIT, regionScope: "WROCLAW" });
  eq("T20 research NOT_IMPLEMENTED (Legal PASS, brak adaptera)", res.status, "NOT_IMPLEMENTED");
  if (res.status === "NOT_IMPLEMENTED") {
    eq("T20b reason ADAPTER_ABSENT", res.reason, "ADAPTER_ABSENT");
    eq("T20c selectiveAuthorized", res.selectiveAuthorized, true);
    eq("T20d fullCatalogueForbidden", res.fullCatalogueForbidden, true);
  }
  eq("T21 gate PASS", WORK_RATE_LEGAL_GATE, "PASS");
  ok("T21b material gate untouched", MARKET_SYNC_P3_LEGAL_GATE === "PASS" || MARKET_SYNC_P3_LEGAL_GATE === "OPEN" || MARKET_SYNC_P3_LEGAL_GATE === "FAIL");
  eq("T21c MARKET_SYNC_P3_LEGAL_GATE unchanged PASS", MARKET_SYNC_P3_LEGAL_GATE, "PASS");
  eq("T22 KB adapter absent", isWorkRateKbPlAdapterImplemented(), false);
  eq("T23 full catalogue absent", isWorkRateFullCatalogueResearchImplemented(), false);
  eq("T19b research zero HTTP", fetchCalls, fetchBefore);
}

// ——— region chain ———
ok(
  "T16b region chain",
  WORK_RATE_REGION_FALLBACK_CHAIN.join(">") === "WROCLAW>DOLNY_SLASK>POLSKA",
);

// ——— normalize round-trip CRITICAL ———
{
  const store0 = makeStore([
    makeWork({
      ourWorkRate: {
        workId: WORK_ID,
        unit: UNIT,
        ourRatePln: 50,
        sourceType: "OWNER",
        regionScope: "WROCLAW",
        observedAt: T_FRESH,
        updatedAt: T_EDIT,
        history: [
          {
            workId: WORK_ID,
            unit: UNIT,
            ratePln: 50,
            kind: "OUR",
            sourceType: "OWNER",
            regionScope: "WROCLAW",
            observedAt: T_FRESH,
          },
        ],
      },
    }),
  ]);
  const w0 = store0.catalogs.wroclaw.works[0];
  eq("T27 pre company 35", w0.companyPricePln, 35);
  eq("T27 pre our 50", w0.ourWorkRate?.ourRatePln, 50);
  ok("T27 pre quotes", !!w0.marketQuotes?.leroy);
  ok("T27 pre hist MQ", (w0.marketQuoteHistory?.length ?? 0) === 1);
  eq("T27 pre commercial", w0.commercialPricing?.marginPct, 15);

  const json1 = JSON.stringify(store0);
  const store1 = normalizeWorkCatalogStore(JSON.parse(json1));
  const json2 = JSON.stringify(store1);
  const store2 = normalizeWorkCatalogStore(JSON.parse(json2));
  const w = store2.catalogs.wroclaw.works[0];

  eq("T27 round-trip company 35", w.companyPricePln, 35);
  eq("T27 round-trip our 50", w.ourWorkRate?.ourRatePln, 50);
  ok("T27 round-trip quotes", !!w.marketQuotes?.leroy);
  ok("T27 round-trip MQ hist", (w.marketQuoteHistory?.length ?? 0) === 1);
  eq("T27 round-trip commercial", w.commercialPricing?.marginPct, 15);
  eq("T27 round-trip history OUR", w.ourWorkRate?.history?.[0]?.ratePln, 50);

  const patched = patchOurWorkRateInStore(store2, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 60,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T_EDIT,
    updatedAt: T_EDIT,
  });
  const w2 = patched.store.catalogs.wroclaw.works[0];
  eq("T27 after patch our 60", w2.ourWorkRate?.ourRatePln, 60);
  eq("T27 after patch company 35", w2.companyPricePln, 35);
}

// ——— sync preserve (merge LWW) ———
{
  const older = makeStore([makeWork()]);
  let newer = makeStore([makeWork()]);
  newer = patchOurWorkRateInStore(newer, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 55,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T_FRESH,
    updatedAt: "2026-08-11T21:00:00.000Z",
  }).store;
  newer = { ...newer, updatedAt: "2026-08-11T21:00:00.000Z" };
  const merged = mergeWorkCatalogStore(older, newer);
  eq("T28 sync preserve OUR", merged.catalogs.wroclaw.works[0].ourWorkRate?.ourRatePln, 55);
  eq("T28b company", merged.catalogs.wroclaw.works[0].companyPricePln, 35);
}

// ——— Bid / Offer / PM untouched (static) ———
{
  const bidSrc = readFileSync(join(ROOT, "src/lib/tenders-bid-calculator.ts"), "utf8");
  const offerSrc = readFileSync(join(ROOT, "src/lib/tender-offer-boq-pricing-engine.ts"), "utf8");
  ok("T25 Bid no work-rate import", !/work-rate-|lookupWorkRate|ourWorkRate|patchOurWorkRate/.test(bidSrc));
  ok("T26 Offer no work-rate import", !/work-rate-|lookupWorkRate|patchOurWorkRate/.test(offerSrc));
  // Offer may still read companyPricePln (debt) — assert still present
  ok("T26b Offer still legacy companyPrice", /companyPricePln/.test(offerSrc));

  const live08 = readFileSync(
    join(ROOT, "src/lib/price-intelligence/our-price-catalog.ts"),
    "utf8",
  );
  ok("T24 PM catalog no ourWorkRate write", !/patchOurWorkRate|ourWorkRate\s*=/.test(live08));
  ok("T24b PM still separate domain", /companyPricePln/.test(live08));
}

// ——— freshness helper labels ———
eq("T06 MISSING label", workRateFreshnessLabelPl("MISSING"), "BRAK STAWKI");
eq(
  "T06b derive MISSING",
  deriveOurWorkRateFreshness(undefined, NOW),
  "MISSING",
);

console.log(`\nWYNIK: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
