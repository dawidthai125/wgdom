/**
 * WORK-CATALOG-REBUILD-01 P1 — harness UI / view-model Nasz Katalog Robót.
 *
 * npx vite-node scripts/test-work-catalog-rebuild-01-p1.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  OUR_WORK_RATE_HISTORY_CAP,
  WORK_RATE_LEGAL_GATE,
  buildOurWorkRateCatalogRows,
  computeOurWorkRatePriceChange,
  normalizeWorkCatalogStore,
  ourWorkRateCatalogUiUsesPolishLabelsOnly,
  patchOurWorkRateInStore,
  requestWorkRateResearch,
  summarizeOurWorkRateCatalogRows,
  workRateFreshnessLabelPl,
} from "../src/lib/work-catalog/index.ts";
import { MARKET_SYNC_P3_LEGAL_GATE } from "../src/lib/market-sync/p3-flag.ts";
import { TENDERS_COMPANY_SECTION_LABELS } from "../src/lib/tenders-module-labels.ts";
import { isTendersCompanySectionId } from "../src/lib/tenders-module-nav.ts";

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

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

const NOW = Date.parse("2026-08-12T10:30:00.000Z");
const T_FRESH = "2026-08-12T08:00:00.000Z";
const T_STALE = "2026-04-01T14:20:00.000Z";
const WORK_ID = "cw.paint.walls";
const UNIT = "m2";

function makeWork(overrides = {}) {
  return {
    id: WORK_ID,
    tradeId: "MALOWANIE",
    namePl: "Malowanie ścian",
    unit: UNIT,
    companyPricePln: 100,
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
    updatedAt: T_FRESH,
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: T_FRESH },
    },
  });
}

// ——— nav / labels ———
eq(
  "T_nav section label PL",
  TENDERS_COMPANY_SECTION_LABELS.workratecatalog,
  "Nasz Katalog Robót",
);
ok("T_nav section id known", isTendersCompanySectionId("workratecatalog"));
ok("T25 Polish freshness labels", ourWorkRateCatalogUiUsesPolishLabelsOnly());
eq("T25b CURRENT→AKTUALNA", workRateFreshnessLabelPl("CURRENT"), "AKTUALNA");
eq("T25c STALE→PRZETERMINOWANA", workRateFreshnessLabelPl("STALE"), "PRZETERMINOWANA");
eq("T25d MISSING→BRAK STAWKI", workRateFreshnessLabelPl("MISSING"), "BRAK STAWKI");

// ——— 1 Biblioteka → lista ———
{
  const store = makeStore([
    makeWork(),
    makeWork({
      id: "cw.gk.board",
      namePl: "Montaż GK",
      unit: "m2",
      tradeId: "SCIANY_GK",
      companyPricePln: 80,
    }),
  ]);
  const rows = buildOurWorkRateCatalogRows({ store, nowMs: NOW });
  eq("T01 lista z Biblioteki", rows.length, 2);
  ok(
    "T01b identity workId+unit",
    rows.every((r) => r.identityKey === `${r.workId}|${r.unit}`),
  );
}

// ——— MISSING + C-NO-SEED companyPrice ———
{
  const store = makeStore([makeWork({ companyPricePln: 100 })]);
  const rows = buildOurWorkRateCatalogRows({ store, nowMs: NOW });
  eq("T04 MISSING", rows[0].freshness, "MISSING");
  eq("T04b label", rows[0].freshnessLabelPl, "BRAK STAWKI");
  eq("T04c ourRate null", rows[0].ourRatePln, null);
  eq("T05 legacy field still 100", rows[0].companyPricePlnLegacy, 100);
  ok("T06 UI rate not 100", rows[0].ourRatePln !== 100);
  ok("T06b display would be dash", rows[0].ourRatePln == null);
}

// ——— CURRENT ———
{
  let store = makeStore([makeWork({ companyPricePln: 100 })]);
  store = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 50,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T_FRESH,
    updatedAt: T_FRESH,
  }).store;
  const row = buildOurWorkRateCatalogRows({ store, nowMs: NOW })[0];
  eq("T02 CURRENT", row.freshness, "CURRENT");
  eq("T02b rate 50", row.ourRatePln, 50);
  eq("T02c label", row.freshnessLabelPl, "AKTUALNA");
  eq("T02d company still 100", row.companyPricePlnLegacy, 100);
  eq("T02e source PL", row.sourceLabelPl, "WŁASNA STAWKA");
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
  const row = buildOurWorkRateCatalogRows({ store, nowMs: NOW })[0];
  eq("T03 STALE", row.freshness, "STALE");
  eq("T03b rate kept", row.ourRatePln, 48);
  eq("T03c label", row.freshnessLabelPl, "PRZETERMINOWANA");
  eq("T03d region", row.regionLabelPl, "Dolny Śląsk");
}

// ——— Owner edit path + no companyPrice mutate ———
{
  let store = makeStore([makeWork({ companyPricePln: 100 })]);
  const before = store.catalogs.wroclaw.works[0].companyPricePln;
  store = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 55,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T_FRESH,
    updatedAt: T_FRESH,
  }).store;
  eq("T07 Owner edit rate", store.catalogs.wroclaw.works[0].ourWorkRate?.ourRatePln, 55);
  eq("T08/T09 companyPrice unchanged", store.catalogs.wroclaw.works[0].companyPricePln, before);
  ok("T10 historia zapisana", (store.catalogs.wroclaw.works[0].ourWorkRate?.history?.length ?? 0) === 1);

  // second edit → change
  store = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 60,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: "2026-08-12T10:00:00.000Z",
    updatedAt: "2026-08-12T10:00:00.000Z",
  }).store;
  const change = computeOurWorkRatePriceChange(store.catalogs.wroclaw.works[0].ourWorkRate);
  eq("T11 change known", change.status, "KNOWN");
  eq("T11b delta +5", change.deltaPln, 5);
  ok("T11c label +5", change.labelPl.includes("+5"));
  eq("T09b company still 100", store.catalogs.wroclaw.works[0].companyPricePln, 100);
}

// ——— first rate → BRAK DANYCH PORÓWNAWCZYCH ———
{
  let store = makeStore([makeWork()]);
  store = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 40,
    sourceType: "OWNER",
    regionScope: "POLSKA",
    observedAt: T_FRESH,
    updatedAt: T_FRESH,
  }).store;
  const change = computeOurWorkRatePriceChange(store.catalogs.wroclaw.works[0].ourWorkRate);
  eq("T12 no prev", change.status, "UNKNOWN");
  eq("T12b label", change.labelPl, "BRAK DANYCH PORÓWNAWCZYCH");
}

// ——— history cap 24 ———
{
  let store = makeStore([makeWork()]);
  for (let i = 1; i <= 30; i += 1) {
    store = patchOurWorkRateInStore(store, {
      workId: WORK_ID,
      unit: UNIT,
      ourRatePln: 40 + i * 0.1,
      sourceType: "OWNER",
      regionScope: "WROCLAW",
      observedAt: T_FRESH,
      updatedAt: `2026-08-12T10:${String(i).padStart(2, "0")}:00.000Z`,
    }).store;
  }
  eq(
    "T13 history cap 24",
    store.catalogs.wroclaw.works[0].ourWorkRate?.history?.length,
    OUR_WORK_RATE_HISTORY_CAP,
  );
}

// ——— search + filters + summary ———
{
  let store = makeStore([
    makeWork({ companyPricePln: 10 }),
    makeWork({
      id: "cw.tile",
      namePl: "Układanie glazury",
      tradeId: "GLAZURA",
      unit: "m2",
      companyPricePln: 20,
    }),
  ]);
  // GLAZURA may fail tradeId - use PODLOGI
  store = makeStore([
    makeWork({ companyPricePln: 10 }),
    makeWork({
      id: "cw.tile",
      namePl: "Układanie glazury",
      tradeId: "PODLOGI",
      unit: "m2",
      companyPricePln: 20,
      keywords: ["glazura", "plytki"],
    }),
  ]);
  store = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 50,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T_FRESH,
    updatedAt: T_FRESH,
  }).store;
  store = patchOurWorkRateInStore(store, {
    workId: "cw.tile",
    unit: UNIT,
    ourRatePln: 70,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T_STALE,
    updatedAt: T_STALE,
  }).store;

  const all = buildOurWorkRateCatalogRows({ store, nowMs: NOW });
  const summary = summarizeOurWorkRateCatalogRows(all);
  eq("T16 total", summary.total, 2);
  eq("T16 current", summary.current, 1);
  eq("T16 stale", summary.stale, 1);
  eq("T16 missing", summary.missing, 0);

  const searchRows = buildOurWorkRateCatalogRows({
    store,
    search: "malowanie",
    nowMs: NOW,
  });
  eq("T14 search", searchRows.length, 1);
  eq("T14b name", searchRows[0].namePl, "Malowanie ścian");

  const missingOnly = buildOurWorkRateCatalogRows({
    store: makeStore([makeWork()]),
    freshnessFilter: "MISSING",
    nowMs: NOW,
  });
  eq("T15 filter MISSING", missingOnly.length, 1);
  const currentOnly = buildOurWorkRateCatalogRows({
    store,
    freshnessFilter: "CURRENT",
    nowMs: NOW,
  });
  eq("T15b filter CURRENT", currentOnly.length, 1);
}

// ——— zero HTTP ———
{
  const before = fetchCalls;
  const store = makeStore([makeWork()]);
  buildOurWorkRateCatalogRows({ store, nowMs: NOW });
  buildOurWorkRateCatalogRows({
    store,
    freshnessFilter: "MISSING",
    nowMs: NOW,
  });
  eq("T17 zero HTTP open", fetchCalls, before);
  eq("T18 zero HTTP MISSING", fetchCalls, before);
  const res = requestWorkRateResearch({ workId: WORK_ID, unit: UNIT });
  eq("T19 research NOT_IMPLEMENTED", res.status, "NOT_IMPLEMENTED");
  eq("T20 gate PASS", WORK_RATE_LEGAL_GATE, "PASS");
  eq("T20b material gate PASS", MARKET_SYNC_P3_LEGAL_GATE, "PASS");
  eq("T17b still zero HTTP", fetchCalls, before);
}

// ——— static: panel + Bid/Offer/PM ———
{
  const panel = readFileSync(
    join(ROOT, "src/app/work-rate-catalog/OurWorkRateCatalogPanel.tsx"),
    "utf8",
  );
  ok("T24 mobile cards", /data-work-rate-catalog-mobile/.test(panel));
  ok("T24b no CURRENT in UI string literal for user", !/["']CURRENT["']/.test(panel) || /data-freshness=\{row\.freshness\}/.test(panel));
  ok("T25e AKTUALNA in panel", /AKTUALNA/.test(panel));
  ok("T25f BRAK STAWKI in panel", /BRAK STAWKI/.test(panel));
  ok("T06c no companyPrice as display rate", !/companyPricePln\s*\?\s*/.test(panel));
  ok("T06d no fallback ??= companyPrice", !/ourRate.*companyPricePln|companyPricePln.*ourRate/.test(panel));

  const companyTab = readFileSync(
    join(ROOT, "src/app/tenders/tabs/TendersCompanyTab.tsx"),
    "utf8",
  );
  ok("T_nav wired", /OurWorkRateCatalogPanel/.test(companyTab));
  ok("T_nav workratecatalog", /workratecatalog/.test(companyTab));

  const bidSrc = readFileSync(join(ROOT, "src/lib/tenders-bid-calculator.ts"), "utf8");
  const offerSrc = readFileSync(
    join(ROOT, "src/lib/tender-offer-boq-pricing-engine.ts"),
    "utf8",
  );
  ok("T Bid untouched", !/buildOurWorkRateCatalogRows|OurWorkRateCatalogPanel/.test(bidSrc));
  ok("T Offer untouched", !/buildOurWorkRateCatalogRows|OurWorkRateCatalogPanel/.test(offerSrc));

  const pm = readFileSync(
    join(ROOT, "src/lib/price-intelligence/our-price-catalog.ts"),
    "utf8",
  );
  ok("T21 PM unchanged path", !/buildOurWorkRateCatalogRows/.test(pm));
}

// ——— normalize preserve with UI row ———
{
  let store = makeStore([makeWork({ companyPricePln: 35 })]);
  store = patchOurWorkRateInStore(store, {
    workId: WORK_ID,
    unit: UNIT,
    ourRatePln: 50,
    sourceType: "OWNER",
    regionScope: "WROCLAW",
    observedAt: T_FRESH,
    updatedAt: T_FRESH,
  }).store;
  const round = normalizeWorkCatalogStore(JSON.parse(JSON.stringify(store)));
  const row = buildOurWorkRateCatalogRows({ store: round, nowMs: NOW })[0];
  eq("T23 normalize our 50", row.ourRatePln, 50);
  eq("T23b company 35", row.companyPricePlnLegacy, 35);
}

console.log(`\nWYNIK P1: ${passed} PASS / ${failed} FAIL`);
if (failed > 0) process.exit(1);
