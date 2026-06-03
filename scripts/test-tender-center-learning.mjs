/**
 * W&G DOM COMMAND CENTER AI — Learning Engine ETAP 7A
 * Run: npx vite-node scripts/test-tender-center-learning.mjs
 */

const {
  loadTenderLearning,
  saveTenderLearning,
  recordTenderLearningDecision,
  getLearningStats,
  topLearningReasons,
  TENDER_LEARNING_STORAGE_KEY,
} = await import("../src/lib/tender-center-learning.ts");

// Mock localStorage for Node
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, v),
  removeItem: (k) => mem.delete(k),
  clear: () => mem.clear(),
  key: () => null,
  length: 0,
};

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

mem.clear();
saveTenderLearning({ version: 1, entries: [] });

recordTenderLearningDecision({
  tenderId: "t-go-1",
  ownerDecision: "GO",
  reason: "brak_ludzi",
  systemDecision: "GO",
  opportunityScore: 88,
  strategicScore: 76,
  impactScore: 72,
  now: "2026-06-02T10:00:00.000Z",
});

recordTenderLearningDecision({
  tenderId: "t-hold-1",
  ownerDecision: "HOLD",
  reason: "za_wysokie_wadium",
  systemDecision: "GO",
  opportunityScore: 65,
  strategicScore: 70,
  impactScore: 55,
  now: "2026-06-02T11:00:00.000Z",
});

recordTenderLearningDecision({
  tenderId: "t-nogo-1",
  ownerDecision: "NO-GO",
  reason: "inne",
  customReason: "Klient problematyczny w przeszłości",
  systemDecision: "HOLD",
  opportunityScore: 42,
  strategicScore: 50,
  impactScore: 38,
  now: "2026-06-02T12:00:00.000Z",
});

const store = loadTenderLearning();
const stats = getLearningStats(store);
const top = topLearningReasons(stats, 5);

assert("store key", TENDER_LEARNING_STORAGE_KEY === "kw-tender-learning");
assert("entries count", store.entries.length === 3, { count: store.entries.length });
assert("version", store.version === 1);
assert("GO entry reason", store.entries.some((e) => e.ownerDecision === "GO" && e.reason === "brak_ludzi"));
assert("HOLD entry reason", store.entries.some((e) => e.ownerDecision === "HOLD" && e.reason === "za_wysokie_wadium"));
assert("NO-GO inne custom", store.entries.some((e) => e.reason === "inne" && e.customReason.includes("Klient")));
assert("stats total", stats.total === 3, { total: stats.total });
assert("stats go", stats.go === 1, { go: stats.go });
assert("stats hold", stats.hold === 1, { hold: stats.hold });
assert("stats noGo", stats.noGo === 1, { noGo: stats.noGo });
assert("reason brak_ludzi", stats.reasons.brak_ludzi === 1);
assert("reason za_wysokie_wadium", stats.reasons.za_wysokie_wadium === 1);
assert("reason inne", stats.reasons.inne === 1);
assert("top reasons length", top.length === 3);

console.log("\n=== getLearningStats() ===");
console.log(JSON.stringify(stats, null, 2));
console.log("\n=== TOP 5 powodów ===");
for (const r of top) {
  console.log(`${r.label} (${r.count})`);
}

const failed = results.filter((r) => !r.pass);
console.log("\n=== TEST RESULTS ===");
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"} — ${r.name}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) process.exit(1);
