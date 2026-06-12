/**
 * Tender Center PRO — test decyzji właściciela ETAP 3A
 * Run: npx vite-node scripts/test-tender-center-owner-decisions.mjs
 */

const {
  loadOwnerDecisions,
  saveOwnerDecisions,
  upsertOwnerDecision,
  computeOwnerDecisionStats,
  computeOwnerSystemAlignment,
  computeLiveSystemAlignment,
  listOwnerDecisions,
  TENDER_DECISIONS_STORAGE_KEY,
} = await import("../src/lib/tenders-strategy-owner-decisions.ts");

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

// Izolowany store w pamięci (bez dotykania prawdziwego LS w Node)
let store = loadOwnerDecisions();
store = { version: 1, byId: {} };

store = upsertOwnerDecision(store, {
  id: "t1",
  decision: "HOLD",
  systemDecision: "GO",
  opportunityScore: 91,
  strategicScore: 85,
  now: "2026-06-02T10:00:00.000Z",
});

store = upsertOwnerDecision(store, {
  id: "t2",
  decision: "GO",
  systemDecision: "GO",
  opportunityScore: 73,
  strategicScore: 62,
  now: "2026-06-02T11:00:00.000Z",
});

store = upsertOwnerDecision(store, {
  id: "t3",
  decision: "NO-GO",
  systemDecision: "NO-GO",
  opportunityScore: 32,
  strategicScore: 88,
  now: "2026-06-02T12:00:00.000Z",
});

const stats = computeOwnerDecisionStats(store);
assert("stats GO/HOLD/NO-GO", stats.go === 1 && stats.hold === 1 && stats.noGo === 1, { stats });

const align = computeOwnerSystemAlignment(store);
assert("alignment 67% (2/3)", align.agreementPct === 67 && align.aligned === 2, { align });

const live = computeLiveSystemAlignment(store, {
  t1: "GO",
  t2: "HOLD",
  t3: "NO-GO",
});
assert("live alignment 33% (1/3)", live.agreementPct === 33 && live.aligned === 1, { live });

const list = listOwnerDecisions(store);
assert("recent sorted desc", list[0]?.id === "t3", { first: list[0]?.id });

store = upsertOwnerDecision(store, {
  id: "t1",
  decision: "GO",
  systemDecision: "GO",
  opportunityScore: 92,
  strategicScore: 86,
  now: "2026-06-02T13:00:00.000Z",
});
assert("upsert preserves createdAt", store.byId.t1.createdAt === "2026-06-02T10:00:00.000Z");
assert("upsert updates updatedAt", store.byId.t1.updatedAt === "2026-06-02T13:00:00.000Z");

assert("storage key", TENDER_DECISIONS_STORAGE_KEY === "kw-tender-decisions");

const examples = [
  {
    scenario: "System GO, właściciel HOLD (rozbieżność)",
    before: { system: "GO", owner: "HOLD", opp: 91, strat: 85 },
    afterOwnerChange: { system: "GO", owner: "GO", aligned: true },
    snapshotAlignmentPct: 67,
  },
  {
    scenario: "Zapis do localStorage (format)",
    record: store.byId.t2,
  },
  {
    scenario: "Analiza zgodności po 3 decyzjach",
    stats,
    snapshotAlignment: computeOwnerSystemAlignment(store),
    liveIfSystemChanged: computeLiveSystemAlignment(store, { t1: "HOLD", t2: "GO", t3: "NO-GO" }),
  },
];

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({
  test: "tender-center-owner-decisions",
  results,
  examples,
  pass: failed.length === 0,
}, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
