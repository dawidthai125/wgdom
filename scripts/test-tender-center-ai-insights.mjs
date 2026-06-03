/**
 * W&G DOM COMMAND CENTER AI — AI Insights Engine ETAP 7C
 * Run: npx vite-node scripts/test-tender-center-ai-insights.mjs
 */

const { computeAiInsights, computeMaturityScore, computeMaturityLabel } = await import(
  "../src/lib/tender-center-ai-insights.ts"
);
const { computeOwnerProfile } = await import("../src/lib/tender-center-owner-profile.ts");

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

function makeEntry(i, overrides = {}) {
  return {
    id: `e-${i}`,
    tenderId: `t-${i}`,
    ownerDecision: "GO",
    reason: "poza_regionem",
    customReason: "",
    systemDecision: "GO",
    opportunityScore: 75,
    strategicScore: 68,
    impactScore: 70,
    createdAt: `2026-06-${String((i % 28) + 1).padStart(2, "0")}T10:00:00.000Z`,
    ...overrides,
  };
}

function buildScenario(count) {
  const entries = [];
  for (let i = 0; i < count; i++) {
    const mod = i % 10;
    if (mod < 4) {
      entries.push(
        makeEntry(i, {
          ownerDecision: "HOLD",
          reason: "za_wysokie_wadium",
          systemDecision: "GO",
          opportunityScore: 72,
          strategicScore: 65,
          impactScore: 55,
        }),
      );
    } else if (mod < 7) {
      entries.push(
        makeEntry(i, {
          ownerDecision: "GO",
          reason: "poza_regionem",
          systemDecision: "GO",
          opportunityScore: 78,
          strategicScore: 70,
          impactScore: 72,
        }),
      );
    } else if (mod < 9) {
      entries.push(
        makeEntry(i, {
          ownerDecision: "NO-GO",
          reason: "brak_ludzi",
          systemDecision: "HOLD",
          opportunityScore: 55,
          strategicScore: 75,
          impactScore: 40,
        }),
      );
    } else {
      entries.push(
        makeEntry(i, {
          ownerDecision: "NO-GO",
          reason: "za_duze_ryzyko",
          systemDecision: "GO",
          opportunityScore: 80,
          strategicScore: 82,
          impactScore: 65,
        }),
      );
    }
  }
  return entries;
}

const scenarios = [
  { label: "A) 10 decyzji", count: 10 },
  { label: "B) 50 decyzji", count: 50 },
  { label: "C) 100 decyzji", count: 100 },
];

for (const { label, count } of scenarios) {
  const entries = buildScenario(count);
  const ownerProfile = computeOwnerProfile(entries);
  const insights = computeAiInsights({ learningEntries: entries, ownerProfile });

  console.log(`\n=== ${label} ===`);
  console.log(`maturityScore: ${insights.maturityScore} (${insights.maturityLabel})`);
  console.log("\nhighlights:");
  insights.highlights.forEach((h) => console.log(`  • ${h}`));
  console.log("\nwarnings:");
  insights.warnings.forEach((w) => console.log(`  • ${w}`));
  console.log("\nstrengths:");
  insights.strengths.forEach((s) => console.log(`  • ${s}`));
}

const entries10 = buildScenario(10);
const profile10 = computeOwnerProfile(entries10);
const insights10 = computeAiInsights({ learningEntries: entries10, ownerProfile: profile10 });
const insights50 = computeAiInsights({
  learningEntries: buildScenario(50),
  ownerProfile: computeOwnerProfile(buildScenario(50)),
});
const insights100 = computeAiInsights({
  learningEntries: buildScenario(100),
  ownerProfile: computeOwnerProfile(buildScenario(100)),
});
const empty = computeAiInsights({
  learningEntries: [],
  ownerProfile: computeOwnerProfile([]),
});

assert("maturity 10 decisions", computeMaturityScore(10) === 30);
assert("maturity 50 decisions", computeMaturityScore(50) === 85);
assert("maturity 100 decisions", computeMaturityScore(100) === 100);
assert("label 85 Wysoka", computeMaturityLabel(85) === "Wysoka");
assert("label 100 Ekspercka", computeMaturityLabel(100) === "Ekspercka");

assert("A maturity 30", insights10.maturityScore === 30);
assert("B maturity 85", insights50.maturityScore === 85);
assert("C maturity 100", insights100.maturityScore === 100);

assert("A highlights max 5", insights10.highlights.length <= 5);
assert("A warnings max 5", insights10.warnings.length <= 5);
assert("A strengths max 5", insights10.strengths.length <= 5);
assert("A has highlights", insights10.highlights.length > 0);
assert("empty insufficient", empty.highlights[0] === "Za mało danych do analizy.");

assert("no random text — all strings", [...insights50.highlights, ...insights50.warnings, ...insights50.strengths].every((s) => typeof s === "string" && s.length > 0));

const failed = results.filter((r) => !r.pass);
console.log("\n=== TEST RESULTS ===");
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"} — ${r.name}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) process.exit(1);
