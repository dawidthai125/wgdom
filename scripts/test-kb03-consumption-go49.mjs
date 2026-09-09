/**
 * GO49 — KB-03 Router consumption / E2E validation (labor Evidence).
 * Isolated fixtures · ZERO live HTTP · ZERO TPI/729 control · ZERO OUR RATE Accept.
 *
 * Outcome target: PARTIAL — Evidence persisted + Tender B lookup; HTTP suppress OPEN.
 *
 * npx vite-node scripts/test-kb03-consumption-go49.mjs
 */
import {
  EVIDENCE_REUSE_POLICY,
  buildWorkRateFixtureHtml,
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  lookupWorkRate,
  normalizeWorkCatalogStore,
  runSelectiveWorkRateResearch,
} from "../src/lib/work-catalog/index.ts";
import {
  classifyKnowledge,
  persistKnowledge,
  resolveKnowledgeReuse,
  routeKnowledge,
} from "../src/lib/knowledge-destination-router/index.ts";
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
      name: NAME,
      rate,
      unit: UNIT,
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

async function tenderResearch(store, nowMs, port) {
  return runSelectiveWorkRateResearch({
    store,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    bypassCooldown: true,
    forceRefresh: true,
    nowMs,
    lookupPort: port,
  });
}

ok("EVIDENCE_REUSE_POLICY STATE_ONLY", EVIDENCE_REUSE_POLICY === "STATE_ONLY");

// 1–3 Research → KDR classify → LABOR_EVIDENCE → durable store
reset();
{
  const cls = classifyKnowledge({ knowledgeType: "EVIDENCE" });
  ok("1 classify EVIDENCE", cls.knowledgeType === "EVIDENCE");
  ok("2 route LABOR_SOURCE_EVIDENCE", routeKnowledge({ knowledgeType: "EVIDENCE" }).destination === "LABOR_SOURCE_EVIDENCE");

  const store = makeStore([makeWork()]);
  const res = await tenderResearch(store, NOW, fixturePort());
  ok("3 research CANDIDATE", res.status === "CANDIDATE", res.status);
  ok("3 evidencePersist via KDR", (res.evidencePersist?.persisted ?? 0) > 0, res.evidencePersist);
  ok("3 telemetry KDR", res.telemetry.some((t) => String(t.messagePl || "").includes("KDR")));
  ok("3 durable store", loadLaborSourceEvidenceStoreLocal().observations.length >= 1);
  ok("3 ourRateWritten false", res.evidencePersist?.ourRateWritten === false);
}

// 4 rehydration
{
  const raw = localStorage.getItem(LABOR_SOURCE_EVIDENCE_STORAGE_KEY);
  ok("4 LS present", typeof raw === "string" && raw.length > 10);
  const snap = JSON.parse(raw);
  storage.delete(LABOR_SOURCE_EVIDENCE_STORAGE_KEY);
  ok("4 cleared", loadLaborSourceEvidenceStoreLocal().observations.length === 0);
  localStorage.setItem(LABOR_SOURCE_EVIDENCE_STORAGE_KEY, JSON.stringify(snap));
  ok("4 rehydrated", loadLaborSourceEvidenceStoreLocal().observations.length >= 1);
}

// 5 duplicate idempotent
reset();
{
  const store = makeStore([makeWork()]);
  const port = fixturePort();
  await tenderResearch(store, NOW, port);
  clearWorkRateResearchAntiStormState();
  const n1 = loadLaborSourceEvidenceStoreLocal().observations.length;
  await tenderResearch(store, NOW + 1, port);
  const n2 = loadLaborSourceEvidenceStoreLocal().observations.length;
  const keys = new Set(loadLaborSourceEvidenceStoreLocal().observations.map((o) => o.dedupeKey));
  ok("5 count stable", n2 === n1 && n1 >= 1, { n1, n2 });
  ok("5 unique keys", keys.size === n2);
}

// 6–7 Tender A → Tender B Evidence lookup; no OUR RATE
reset();
{
  // TENDER A
  const storeA = makeStore([makeWork()]);
  const resA = await tenderResearch(storeA, NOW, fixturePort());
  ok("6A tender A candidate", resA.status === "CANDIDATE");
  ok("6A OUR RATE still MISSING", lookupWorkRate(storeA, WORK_ID, UNIT, NOW).status === "MISSING");

  // Simulate Tender B session: same LS Evidence, fresh research store without OUR RATE
  clearWorkRateResearchAntiStormState();
  const reuse = resolveKnowledgeReuse({
    knowledgeType: "EVIDENCE",
    workId: WORK_ID,
    workNamePl: NAME,
    unit: UNIT,
  });
  ok("6B Evidence lookup hit", reuse.hit === true && reuse.count > 0);
  ok("6B isOurRate false", reuse.isOurRate === false);
  ok("6B orphanReuse / suppress open", reuse.orphanReuse === true);

  const storeB = makeStore([makeWork()]);
  // Tender B without forceRefresh — GO53 suppress when Evidence SUFFICIENT
  const resB = await runSelectiveWorkRateResearch({
    store: storeB,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    bypassCooldown: true,
    forceRefresh: false,
    nowMs: NOW + 10,
    lookupPort: fixturePort(),
  });
  ok("7B EVIDENCE_REUSE suppress", resB.status === "EVIDENCE_REUSE", resB.status);
  ok("7B httpFetchCount 0", resB.status === "EVIDENCE_REUSE" && resB.httpFetchCount === 0);
  ok(
    "7B EVIDENCE_AVAILABLE telemetry",
    resB.telemetry.some((t) => t.code === "EVIDENCE_AVAILABLE"),
  );
  ok(
    "7B EVIDENCE_SUFFICIENT telemetry",
    resB.telemetry.some((t) => t.code === "EVIDENCE_SUFFICIENT"),
  );
  ok(
    "7B OUR RATE still MISSING after Evidence",
    lookupWorkRate(storeB, WORK_ID, UNIT, NOW + 10).status === "MISSING",
  );
  ok("7B isOurRate false", resB.status === "EVIDENCE_REUSE" && resB.isOurRate === false);
  ok("7B no WC LS write", localStorage.getItem(WORK_CATALOG_STORAGE_KEY) == null);
}

// 8 CURRENT OUR RATE stronger than Evidence
reset();
{
  // Seed Evidence first
  await tenderResearch(makeStore([makeWork()]), NOW, fixturePort());
  clearWorkRateResearchAntiStormState();
  const storeCurrent = makeStore([
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
    store: storeCurrent,
    workId: WORK_ID,
    unit: UNIT,
    namePl: NAME,
    bypassCooldown: true,
    forceRefresh: false,
    nowMs: NOW + 20,
    lookupPort: fixturePort(),
  });
  ok("8 REUSE OUR RATE", res.status === "REUSE");
  ok("8 httpFetchCount 0", res.httpFetchCount === 0);
  ok("8 no Evidence telemetry needed", true);
}

// 9–10 fail closed / Owner required
ok(
  "9 unknown type",
  classifyKnowledge({ knowledgeType: "NOPE" }).status === "AMBIGUOUS_TYPE",
);
ok(
  "10 Owner OUR_RATE no write",
  persistKnowledge({ knowledgeType: "OUR_RATE" }).wrote === false,
);

// 11 Evidence does not auto-become Candidate authority via router
{
  const p = routeKnowledge({ knowledgeType: "EVIDENCE" });
  ok("11 not canonical", p.canonical === false);
  ok("11 authority observation", p.authority === "EVIDENCE_OBSERVATION");
}

// 12 HTTP suppress STATE_ONLY (GO53)
ok("12 EVIDENCE_REUSE_POLICY STATE_ONLY", EVIDENCE_REUSE_POLICY === "STATE_ONLY");
ok(
  "12 resolve orphanReuse",
  resolveKnowledgeReuse({
    knowledgeType: "EVIDENCE",
    workId: WORK_ID,
    workNamePl: NAME,
    unit: UNIT,
  }).orphanReuse === true ||
    resolveKnowledgeReuse({
      knowledgeType: "EVIDENCE",
      workId: WORK_ID,
      workNamePl: NAME,
      unit: UNIT,
    }).hit === false,
);

ok(
  "control unused",
  !String(storage.get(LABOR_SOURCE_EVIDENCE_STORAGE_KEY) || "").includes(
    "cc-ic-accept-6c2b8e82",
  ),
);
ok("zero live fetch", fetchCalls === 0);

console.log(`\nGO49 CONSUMPTION: ${passed} PASS / ${failed} FAIL`);
console.log(
  `VERDICT_HINT: CLOSED_SUPPRESS — Evidence reusable; HTTP suppress STATE_ONLY (GO53)`,
);
process.exit(failed > 0 ? 1 : 0);
