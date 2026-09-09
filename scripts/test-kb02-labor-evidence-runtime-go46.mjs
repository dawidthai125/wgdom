/**
 * GO46 / KB-02 — main-path labor Research → durable Evidence runtime.
 * Fixture · ZERO live HTTP · ZERO TPI/729 control work · ZERO OUR RATE Accept.
 *
 * npx vite-node scripts/test-kb02-labor-evidence-runtime-go46.mjs
 */
import {
  KB02_EVIDENCE_HTTP_SUPPRESS_POLICY,
  KB02_LABOR_EVIDENCE_SEAM_ID,
  buildWorkRateFixtureHtml,
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  createNullWorkRateSelectiveLookup,
  lookupReusableLaborResearchEvidence,
  lookupWorkRate,
  normalizeWorkCatalogStore,
  persistMeaningfulLaborResearchEvidence,
  runSelectiveWorkRateResearch,
} from "../src/lib/work-catalog/index.ts";
import {
  LABOR_SOURCE_EVIDENCE_STORAGE_KEY,
  clearLaborSourceEvidenceStoreLocalForTests,
  loadLaborSourceEvidenceStoreLocal,
} from "../src/lib/labor-source-evidence/index.ts";
import { WORK_CATALOG_STORAGE_KEY } from "../src/lib/work-catalog/work-catalog-store.ts";

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

const T_FRESH = "2026-08-14T12:00:00.000Z";
const NOW = Date.parse("2026-08-20T10:00:00.000Z");

/** Classification Gate LABOR seed — NOT TPI control work. */
const FIX_WORK_ID = "legacy-malowanie-m2";
const FIX_NAME = "Malowanie ścian dwukrotne";
const FIX_UNIT = "m2";

function makeWork(overrides = {}) {
  return {
    id: FIX_WORK_ID,
    tradeId: "MALOWANIE",
    namePl: FIX_NAME,
    unit: FIX_UNIT,
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

function reset() {
  storage.clear();
  clearLaborSourceEvidenceStoreLocalForTests();
  clearWorkRateResearchAntiStormState();
  fetchCalls = 0;
}

function fixturePort() {
  const html = (rate) =>
    buildWorkRateFixtureHtml({
      name: FIX_NAME,
      rate,
      unit: FIX_UNIT,
      region: "WROCLAW",
      laborOnly: true,
      includesMaterial: false,
    });
  return createFixtureWorkRateSelectiveLookup({
    kb_pl: { html: html(35) },
    cennikremontow_pl: { html: html(35) },
    sccot: { html: html(35) },
    extradom: { html: html(35) },
  });
}

async function main() {
  ok("seam id", KB02_LABOR_EVIDENCE_SEAM_ID.includes("KB-02"));
  ok("http suppress policy STATE_ONLY", KB02_EVIDENCE_HTTP_SUPPRESS_POLICY === "STATE_ONLY");

  // 1. meaningful Research → Evidence persisted
  reset();
  {
    const store = makeStore([makeWork()]);
    const before = lookupWorkRate(store, FIX_WORK_ID, FIX_UNIT, NOW);
    ok("1 pre OUR RATE MISSING", before.status === "MISSING");
    const res = await runSelectiveWorkRateResearch({
      store,
      workId: FIX_WORK_ID,
      unit: FIX_UNIT,
      namePl: FIX_NAME,
      bypassCooldown: true,
      nowMs: NOW,
      lookupPort: fixturePort(),
    });
    ok("1 status CANDIDATE", res.status === "CANDIDATE", res.status);
    ok("1 evidencePersist meaningful", res.evidencePersist?.meaningful === true, res.evidencePersist);
    ok("1 evidencePersist persisted>0", (res.evidencePersist?.persisted ?? 0) > 0, res.evidencePersist);
    ok("1 ourRateWritten false", res.evidencePersist?.ourRateWritten === false);
    const ev = loadLaborSourceEvidenceStoreLocal();
    ok("1 store has observations", ev.observations.length >= 1, ev.observations.length);
    ok(
      "1 workId match",
      ev.observations.some((o) => o.workId === FIX_WORK_ID),
    );
    const afterLookup = lookupWorkRate(store, FIX_WORK_ID, FIX_UNIT, NOW);
    ok("1 OUR RATE still MISSING", afterLookup.status === "MISSING");
    ok("1 telemetry EVIDENCE_PERSISTED", res.telemetry.some((t) => t.code === "EVIDENCE_PERSISTED"));
    ok("1 zero live fetch", fetchCalls === 0);
  }

  // 2–4. failed / empty / unsupported → no Evidence
  reset();
  {
    const store = makeStore([makeWork()]);
    const res = await runSelectiveWorkRateResearch({
      store,
      workId: FIX_WORK_ID,
      unit: FIX_UNIT,
      namePl: FIX_NAME,
      bypassCooldown: true,
      nowMs: NOW,
      lookupPort: createNullWorkRateSelectiveLookup(),
    });
    ok("2/3/4 null port GAP", res.status === "GAP", res.status);
    ok(
      "2/3/4 no evidence rows",
      loadLaborSourceEvidenceStoreLocal().observations.length === 0,
    );
    ok(
      "2/3/4 persist skip telemetry",
      res.telemetry.some((t) => t.code === "EVIDENCE_PERSIST_SKIP"),
    );
  }

  // 5. malformed observation → no Evidence
  reset();
  {
    const bad = persistMeaningfulLaborResearchEvidence({
      workId: FIX_WORK_ID,
      workNamePl: FIX_NAME,
      unit: FIX_UNIT,
      observations: [
        {
          sourceId: "cennikremontow_pl",
          workNamePl: FIX_NAME,
          ratePln: NaN,
          unit: FIX_UNIT,
          regionScope: "WROCLAW",
          laborOnly: true,
          sourceUrl: "https://cennikremontow.pl/x",
          observedAt: T_FRESH,
          netGross: "unknown",
        },
      ],
    });
    ok("5 malformed not meaningful", bad.meaningful === false);
    ok("5 malformed no persist", bad.persisted === 0);
    ok("5 store empty", loadLaborSourceEvidenceStoreLocal().observations.length === 0);
  }

  // 6. duplicate → idempotent
  reset();
  {
    const store = makeStore([makeWork()]);
    const port = fixturePort();
    const r1 = await runSelectiveWorkRateResearch({
      store,
      workId: FIX_WORK_ID,
      unit: FIX_UNIT,
      namePl: FIX_NAME,
      bypassCooldown: true,
      forceRefresh: true,
      nowMs: NOW,
      lookupPort: port,
    });
    clearWorkRateResearchAntiStormState();
    const n1 = loadLaborSourceEvidenceStoreLocal().observations.length;
    const r2 = await runSelectiveWorkRateResearch({
      store,
      workId: FIX_WORK_ID,
      unit: FIX_UNIT,
      namePl: FIX_NAME,
      bypassCooldown: true,
      forceRefresh: true,
      nowMs: NOW + 1,
      lookupPort: port,
    });
    const n2 = loadLaborSourceEvidenceStoreLocal().observations.length;
    const keys = new Set(
      loadLaborSourceEvidenceStoreLocal().observations.map((o) => o.dedupeKey),
    );
    ok("6 first candidate", r1.status === "CANDIDATE");
    ok("6 second candidate", r2.status === "CANDIDATE");
    ok("6 count stable", n2 === n1 && n1 >= 1, { n1, n2 });
    ok("6 unique dedupeKeys === count", keys.size === n2);
  }

  // 7. rehydration survives localStorage round-trip
  reset();
  {
    const store = makeStore([makeWork()]);
    await runSelectiveWorkRateResearch({
      store,
      workId: FIX_WORK_ID,
      unit: FIX_UNIT,
      namePl: FIX_NAME,
      bypassCooldown: true,
      nowMs: NOW,
      lookupPort: fixturePort(),
    });
    const raw = localStorage.getItem(LABOR_SOURCE_EVIDENCE_STORAGE_KEY);
    ok("7 raw LS present", typeof raw === "string" && raw.length > 10);
    const snap = JSON.parse(raw);
    storage.delete(LABOR_SOURCE_EVIDENCE_STORAGE_KEY);
    ok("7 cleared", loadLaborSourceEvidenceStoreLocal().observations.length === 0);
    localStorage.setItem(LABOR_SOURCE_EVIDENCE_STORAGE_KEY, JSON.stringify(snap));
    const rehydrated = loadLaborSourceEvidenceStoreLocal();
    ok("7 rehydrated count", rehydrated.observations.length >= 1);
  }

  // 8. consumer finds Evidence; forceRefresh still researches; without force → suppress
  reset();
  {
    const store = makeStore([makeWork()]);
    await runSelectiveWorkRateResearch({
      store,
      workId: FIX_WORK_ID,
      unit: FIX_UNIT,
      namePl: FIX_NAME,
      bypassCooldown: true,
      nowMs: NOW,
      lookupPort: fixturePort(),
    });
    const hit = lookupReusableLaborResearchEvidence({
      workId: FIX_WORK_ID,
      workNamePl: FIX_NAME,
      unit: FIX_UNIT,
    });
    ok("8 lookup hit", hit.hit === true);
    ok("8 count>0", hit.count > 0);
    ok("8 isOurRate false", hit.isOurRate === false);
    ok("8 maySuppress policy flag", hit.maySuppressExternalResearch === true);
    ok("8 policy STATE_ONLY", hit.httpSuppressPolicy === "STATE_ONLY");

    clearWorkRateResearchAntiStormState();
    const forced = await runSelectiveWorkRateResearch({
      store,
      workId: FIX_WORK_ID,
      unit: FIX_UNIT,
      namePl: FIX_NAME,
      bypassCooldown: true,
      forceRefresh: true,
      nowMs: NOW + 2,
      lookupPort: fixturePort(),
    });
    ok(
      "8 telemetry EVIDENCE_AVAILABLE",
      forced.telemetry.some((t) => t.code === "EVIDENCE_AVAILABLE"),
    );
    ok("8 forceRefresh still CANDIDATE", forced.status === "CANDIDATE");

    clearWorkRateResearchAntiStormState();
    const suppressed = await runSelectiveWorkRateResearch({
      store,
      workId: FIX_WORK_ID,
      unit: FIX_UNIT,
      namePl: FIX_NAME,
      bypassCooldown: true,
      forceRefresh: false,
      nowMs: NOW + 3,
      lookupPort: fixturePort(),
    });
    ok("8 no force → EVIDENCE_REUSE", suppressed.status === "EVIDENCE_REUSE", suppressed.status);
    ok("8 httpFetchCount 0", suppressed.status === "EVIDENCE_REUSE" && suppressed.httpFetchCount === 0);
  }

  // 9. Evidence never writes OUR RATE / catalog pricing
  reset();
  {
    const store = makeStore([makeWork({ companyPricePln: 35 })]);
    const catalogBefore = JSON.stringify(store);
    await runSelectiveWorkRateResearch({
      store,
      workId: FIX_WORK_ID,
      unit: FIX_UNIT,
      namePl: FIX_NAME,
      bypassCooldown: true,
      nowMs: NOW,
      lookupPort: fixturePort(),
    });
    ok("9 catalog object unchanged", JSON.stringify(store) === catalogBefore);
    ok(
      "9 LS catalog key absent",
      localStorage.getItem(WORK_CATALOG_STORAGE_KEY) == null,
    );
    ok(
      "9 evidence key only",
      localStorage.getItem(LABOR_SOURCE_EVIDENCE_STORAGE_KEY) != null,
    );
    ok(
      "9 lookup still MISSING",
      lookupWorkRate(store, FIX_WORK_ID, FIX_UNIT, NOW).status === "MISSING",
    );
  }

  ok(
    "control work id unused",
    !String(storage.get(LABOR_SOURCE_EVIDENCE_STORAGE_KEY) || "").includes(
      "cc-ic-accept-6c2b8e82",
    ),
  );
  ok("zero live fetch total", fetchCalls === 0);

  console.log(`\nGO46 KB-02 TESTS: ${passed} PASS / ${failed} FAIL`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
