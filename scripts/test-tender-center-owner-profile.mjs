/**
 * W&G DOM COMMAND CENTER AI — Owner Profile Engine ETAP 7B
 * Run: npx vite-node scripts/test-tender-center-owner-profile.mjs
 */

const { computeOwnerProfile } = await import("../src/lib/tender-center-owner-profile.ts");

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

function makeEntry(overrides) {
  return {
    id: `e-${Math.random().toString(36).slice(2, 8)}`,
    tenderId: "t1",
    ownerDecision: "GO",
    reason: "brak_ludzi",
    customReason: "",
    systemDecision: "GO",
    opportunityScore: 70,
    strategicScore: 65,
    impactScore: 68,
    createdAt: "2026-06-02T10:00:00.000Z",
    ...overrides,
  };
}

function scenarioA() {
  return Array.from({ length: 10 }, (_, i) =>
    makeEntry({
      id: `go-${i}`,
      tenderId: `t-go-${i}`,
      ownerDecision: "GO",
      reason: "poza_regionem",
      opportunityScore: 80,
      impactScore: 75,
    }),
  );
}

function scenarioB() {
  return Array.from({ length: 10 }, (_, i) =>
    makeEntry({
      id: `hold-${i}`,
      tenderId: `t-hold-${i}`,
      ownerDecision: "HOLD",
      reason: "za_wysokie_wadium",
      opportunityScore: 55,
      impactScore: 50,
    }),
  );
}

function scenarioC() {
  const entries = [];
  for (let i = 0; i < 5; i++) {
    entries.push(
      makeEntry({
        id: `c-go-${i}`,
        tenderId: `t-c-go-${i}`,
        ownerDecision: "GO",
        reason: "poza_regionem",
        opportunityScore: 72,
        impactScore: 70,
      }),
    );
  }
  for (let i = 0; i < 3; i++) {
    entries.push(
      makeEntry({
        id: `c-hold-${i}`,
        tenderId: `t-c-hold-${i}`,
        ownerDecision: "HOLD",
        reason: "za_wysokie_wadium",
        opportunityScore: 60,
        impactScore: 58,
      }),
    );
  }
  for (let i = 0; i < 2; i++) {
    entries.push(
      makeEntry({
        id: `c-nogo-${i}`,
        tenderId: `t-c-nogo-${i}`,
        ownerDecision: "NO-GO",
        reason: "za_duze_ryzyko",
        opportunityScore: 40,
        impactScore: 35,
      }),
    );
  }
  return entries;
}

const scenarios = [
  { label: "A) 10× GO", entries: scenarioA() },
  { label: "B) 10× HOLD", entries: scenarioB() },
  { label: "C) 5 GO / 3 HOLD / 2 NO-GO", entries: scenarioC() },
];

for (const { label, entries } of scenarios) {
  const profile = computeOwnerProfile(entries);
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(profile, null, 2));
}

const profileA = computeOwnerProfile(scenarioA());
const profileB = computeOwnerProfile(scenarioB());
const profileC = computeOwnerProfile(scenarioC());
const empty = computeOwnerProfile([]);

assert("A ownerType AGRESYWNY", profileA.ownerType === "AGRESYWNY", { got: profileA.ownerType });
assert("A preferred GO", profileA.preferredDecision === "GO");
assert("A total 10", profileA.totalDecisions === 10);
assert("A high risk tolerance", profileA.riskProfile === "WYSOKA TOLERANCJA RYZYKA", {
  got: profileA.riskProfile,
});

assert("B ownerType OSTROŻNY", profileB.ownerType === "OSTROŻNY", { got: profileB.ownerType });
assert("B preferred HOLD", profileB.preferredDecision === "HOLD");
assert("B low risk tolerance", profileB.riskProfile === "NISKA TOLERANCJA RYZYKA", {
  got: profileB.riskProfile,
});

assert("C ownerType WYWAŻONY", profileC.ownerType === "WYWAŻONY", { got: profileC.ownerType });
assert("C preferred GO", profileC.preferredDecision === "GO");
assert("C total 10", profileC.totalDecisions === 10);
assert("C insights max 5", profileC.profileInsights.length <= 5);

assert("empty ownerType null", empty.ownerType === null);
assert("empty contract NIEOKREŚLONE", empty.preferredContractSize === "NIEOKREŚLONE");
assert("empty risk BRAK DANYCH", empty.riskProfile === "BRAK DANYCH");

const failed = results.filter((r) => !r.pass);
console.log("\n=== TEST RESULTS ===");
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"} — ${r.name}${r.got != null ? ` (got: ${r.got})` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) process.exit(1);
