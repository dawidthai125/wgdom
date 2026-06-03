/**
 * W&G DOM COMMAND CENTER AI — Morning Briefing ETAP 7D
 * Run: npx vite-node scripts/test-tender-center-morning-briefing.mjs
 */

const { buildMorningBriefing } = await import("../src/lib/tender-center-morning-briefing.ts");
const { computeOwnerProfile } = await import("../src/lib/tender-center-owner-profile.ts");
const { computeAiInsights } = await import("../src/lib/tender-center-ai-insights.ts");

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

const now = new Date("2026-06-02T09:00:00.000Z");

function baseHealth(overrides = {}) {
  return {
    index: 78,
    label: "healthy",
    dimensions: { O: 80, Z: 75, F: 70, R: 82, D: 78 },
    recommendation: "Firma w dobrej kondycji.",
    weights: { O: 0.2, Z: 0.2, F: 0.2, R: 0.2, D: 0.2 },
    suggestedGrowthMode: "balanced",
    freeSlots: 3,
    overloadIndex: 0.4,
    ...overrides,
  };
}

function baseForecast(overrides = {}) {
  return {
    asOf: now.toISOString(),
    activeJobsNow: 4,
    maxConcurrentProjects: 6,
    activeWorkersOnSite: 12,
    freeSlotsToday: 3,
    avgWeeklyHoursArchive: 420,
    endingJobs: [
      { id: "j1", label: "MOPS remont", endIso: "2026-07-15" },
    ],
    simulatedWinsCount: 5,
    scenarios: [
      {
        id: "half_go",
        label: "C — 50% GO",
        horizons: [
          { days: 30, utilizationPct: 72, activeJobs: 4, risk: "STABILNIE" },
          { days: 60, utilizationPct: 68, activeJobs: 4, risk: "STABILNIE" },
          { days: 90, utilizationPct: 65, activeJobs: 3, risk: "STABILNIE" },
        ],
        alert: null,
      },
    ],
    ...overrides,
  };
}

function baseActionCenter(overrides = {}) {
  return {
    actions: [
      {
        id: "a1",
        priority: "HIGH",
        category: "TENDERS",
        title: "Termin składania oferty za 3 dni",
        description: "Remont MOPS Wrocław",
        reason: "deadline",
        source: "radar",
        recommendedAction: "Przygotuj ofertę MOPS Wrocław",
        tenderId: "t-mops",
      },
    ],
    counts: { CRITICAL: 0, HIGH: 1, MEDIUM: 0, LOW: 0 },
    primaryAction: {
      id: "a1",
      priority: "HIGH",
      category: "TENDERS",
      title: "Termin składania oferty za 3 dni",
      description: "Remont MOPS Wrocław",
      reason: "deadline",
      source: "radar",
      recommendedAction: "Przygotuj ofertę MOPS Wrocław",
      tenderId: "t-mops",
    },
    headline: "Dzisiaj system rekomenduje: Przygotuj ofertę MOPS Wrocław",
    ...overrides,
  };
}

function baseOpportunity() {
  return {
    item: {
      id: "t-mops",
      title: "Remont MOPS Wrocław",
      organizationName: "MOPS Wrocław",
      submittingOffersDate: "2026-06-05T12:00:00.000Z",
      bzpNumber: "BZP-1",
    },
    decision: "GO",
    opportunity: { score: 91, reasons: [] },
    strategic: { score: 88, reasons: [] },
  };
}

function baseFinancial(overrides = {}) {
  return {
    contractValue: 650_000,
    depositValue: 13_000,
    financialCapacityScore: 82,
    capacityClass: "WYSOKA",
    depositImpact: "NISKI WPŁYW",
    liquidityRisk: "NISKIE",
    estimatedBuffer: 120_000,
    fundingGap: null,
    recommendation: "MOŻESZ STARTOWAĆ",
    recommendationDetail: ["Bufor płynności wystarczający na wadium i start."],
    warnings: [],
    strengths: ["Dobra zdolność finansowa"],
    ...overrides,
  };
}

const learningEntries = [
  {
    id: "e1",
    tenderId: "t1",
    ownerDecision: "GO",
    reason: "poza_regionem",
    customReason: "",
    systemDecision: "GO",
    opportunityScore: 80,
    strategicScore: 75,
    impactScore: 72,
    createdAt: "2026-06-01T10:00:00.000Z",
  },
];
const ownerProfile = computeOwnerProfile(learningEntries);
const aiInsights = computeAiInsights({ learningEntries, ownerProfile });

const healthyBriefing = buildMorningBriefing({
  health: baseHealth(),
  actionCenter: baseActionCenter(),
  forecast: baseForecast(),
  financialCapacity: baseFinancial(),
  ownerProfile,
  aiInsights,
  bestOpportunity: baseOpportunity(),
  ownerName: "Dawid Kowalski",
  now,
});

const overloadedBriefing = buildMorningBriefing({
  health: baseHealth({
    index: 52,
    label: "strained",
    freeSlots: 0,
    overloadIndex: 1.2,
    recommendation: "Firma przeciążona.",
  }),
  actionCenter: baseActionCenter({
    actions: [
      {
        id: "overload",
        priority: "CRITICAL",
        category: "PLANNING",
        title: "Pipeline ofert przeciążony",
        description: "Zbyt wiele przetargów w przygotowaniu.",
        reason: "overload",
        source: "health",
        recommendedAction: "Zamknij część ofert w przygotowaniu.",
      },
    ],
    counts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
    primaryAction: {
      id: "overload",
      priority: "CRITICAL",
      category: "PLANNING",
      title: "Pipeline ofert przeciążony",
      description: "Zbyt wiele przetargów w przygotowaniu.",
      reason: "overload",
      source: "health",
      recommendedAction: "Zamknij część ofert w przygotowaniu.",
    },
    headline: "Dzisiaj system rekomenduje: Zamknij część ofert w przygotowaniu.",
  }),
  forecast: baseForecast({
    freeSlotsToday: 0,
    endingJobs: [
      { id: "j1", label: "Robota A", endIso: "2026-07-01" },
      { id: "j2", label: "Robota B", endIso: "2026-07-10" },
    ],
    scenarios: [
      {
        id: "half_go",
        label: "C",
        horizons: [
          { days: 30, utilizationPct: 95, activeJobs: 6, risk: "PRZECIAZENIE" },
          { days: 60, utilizationPct: 98, activeJobs: 6, risk: "PRZECIAZENIE" },
          { days: 90, utilizationPct: 100, activeJobs: 6, risk: "BRAK_LUDZI" },
        ],
        alert: "Scenariusz C — ryzyko braku ludzi w horyzoncie 90 dni.",
      },
    ],
  }),
  financialCapacity: baseFinancial({ capacityClass: "ŚREDNIA", liquidityRisk: "ŚREDNIE" }),
  ownerProfile,
  aiInsights,
  bestOpportunity: baseOpportunity(),
  ownerName: "Dawid Kowalski",
  now,
});

const financialBriefing = buildMorningBriefing({
  health: baseHealth({ index: 48, label: "strained" }),
  actionCenter: baseActionCenter({
    primaryAction: {
      id: "fin",
      priority: "CRITICAL",
      category: "FINANCE",
      title: "Krytyczne ryzyko płynności",
      description: "Wadium przekracza bufor.",
      reason: "liquidity",
      source: "financial",
      recommendedAction: "Wstrzymaj nowe oferty do zabezpieczenia finansowania.",
    },
    headline: "Dzisiaj system rekomenduje: Wstrzymaj nowe oferty.",
    counts: { CRITICAL: 1, HIGH: 0, MEDIUM: 0, LOW: 0 },
  }),
  forecast: baseForecast(),
  financialCapacity: baseFinancial({
    capacityClass: "KRYTYCZNA",
    liquidityRisk: "KRYTYCZNE",
    recommendation: "ZBYT DUŻE RYZYKO FINANSOWE",
    recommendationDetail: ["Wadium i skala kontraktu przekraczają bezpieczny bufor."],
  }),
  ownerProfile,
  aiInsights,
  bestOpportunity: baseOpportunity(),
  now,
});

const scenarios = [
  { label: "A) Zdrowa firma", briefing: healthyBriefing },
  { label: "B) Przeciążona firma", briefing: overloadedBriefing },
  { label: "C) Wysoki problem finansowy", briefing: financialBriefing },
];

for (const { label, briefing } of scenarios) {
  console.log(`\n=== ${label} ===`);
  console.log(`greeting: ${briefing.greeting}`);
  console.log(`headline: ${briefing.headline}`);
  console.log(`summaryTone: ${briefing.summaryTone}`);
  console.log(`priorityAction: ${briefing.priorityAction.replace(/\n/g, " | ")}`);
  console.log(`biggestRisk: ${briefing.biggestRisk}`);
  console.log(`financialStatus: ${briefing.financialStatus}`);
  console.log(`opportunityStatus: ${briefing.opportunityStatus.replace(/\n/g, " | ")}`);
  console.log(`ownerInsight: ${briefing.ownerInsight}`);
}

assert("healthy greeting", healthyBriefing.greeting.includes("Dawid"));
assert("healthy tone good", ["ŚWIETNY DZIEŃ", "DOBRY DZIEŃ"].includes(healthyBriefing.summaryTone), {
  got: healthyBriefing.summaryTone,
});
assert("healthy financial positive", healthyBriefing.financialStatus.includes("bezpiecznie"));
assert("healthy opportunity GO", healthyBriefing.opportunityStatus.includes("STARTUJ"));
assert("healthy has priority", healthyBriefing.priorityAction.includes("MOPS"));

assert("overloaded tone cautious", ["OSTROŻNIE", "WYSOKIE RYZYKO"].includes(overloadedBriefing.summaryTone), {
  got: overloadedBriefing.summaryTone,
});
assert("overloaded risk people", overloadedBriefing.biggestRisk.toLowerCase().includes("zasob") || overloadedBriefing.biggestRisk.includes("przeciąż"), {
  got: overloadedBriefing.biggestRisk,
});

assert("financial tone high risk", financialBriefing.summaryTone === "WYSOKIE RYZYKO", {
  got: financialBriefing.summaryTone,
});
assert("financial liquidity", financialBriefing.financialStatus.toLowerCase().includes("płynno") || financialBriefing.financialStatus.toLowerCase().includes("ryzyko"), {
  got: financialBriefing.financialStatus,
});

assert("all fields non-empty", scenarios.every(({ briefing }) =>
  briefing.greeting && briefing.headline && briefing.priorityAction
  && briefing.biggestRisk && briefing.financialStatus && briefing.opportunityStatus
  && briefing.ownerInsight && briefing.summaryTone,
));

const failed = results.filter((r) => !r.pass);
console.log("\n=== TEST RESULTS ===");
for (const r of results) {
  console.log(`${r.pass ? "PASS" : "FAIL"} — ${r.name}${r.got != null ? ` (got: ${r.got})` : ""}`);
}
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length > 0) process.exit(1);
