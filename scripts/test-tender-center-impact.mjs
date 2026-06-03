/**
 * W&G DOM COMMAND CENTER AI — test Impact Engine V2 ETAP 6D
 * Run: npx vite-node scripts/test-tender-center-impact.mjs
 */

if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init) {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
      if (init && typeof init === "object") Object.assign(this, init);
    }
    multiply() { return new DOMMatrix(this); }
    translate() { return new DOMMatrix(this); }
    scale() { return new DOMMatrix(this); }
    inverse() { return new DOMMatrix(this); }
  };
}

const { defaultCompanyProfile } = await import("../src/lib/tenders-bzp-company.ts");
const { computeForecast90Days } = await import("../src/lib/tender-center-forecast-90d.ts");
const { scoreTender } = await import("../src/lib/tender-center-decision.ts");
const { computeCompanyHealth } = await import("../src/lib/tender-center-health.ts");
const { computeTenderImpact } = await import("../src/lib/tender-center-impact.ts");
const { collectGoCandidates } = await import("../src/lib/tender-center-forecast-90d.ts");

const profile = defaultCompanyProfile();
const now = new Date("2026-06-02T12:00:00.000Z");

function job(id, endIso, amount = "400000") {
  return {
    id,
    address: `Roboty ${id}`,
    flatNumber: "",
    client: "Klient",
    startDate: "2026-03-01",
    endDate: endIso,
    status: "in_progress",
    keysHandedOver: false,
    notes: "",
    documents: {},
    workEntries: [],
    materials: [],
    invoiceStatus: "pending",
    invoiceNumber: "",
    invoiceAmount: amount,
    photos: [],
    plannedHandoverDate: endIso,
  };
}

function tender(id, title, valuePln, opts = {}) {
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + (opts.daysUntil ?? 45));
  return {
    id,
    bzpNumber: `BZP-${id}`,
    noticeNumber: "n",
    title,
    organizationName: opts.org ?? "MOPS Wrocław",
    organizationCity: "Wrocław",
    organizationProvince: "dolnośląskie",
    cpvCode: "45210000",
    publicationDate: "2026-05-01",
    submittingOffersDate: deadline.toISOString(),
    orderType: "Works",
    tenderId: id,
    moIdentifier: id,
    status: "new",
    notes: "",
    relevanceScore: opts.relevance ?? 45,
    matchedKeywords: ["remont"],
    isWroclaw: true,
    priorityBuyerId: "mops",
    priorityBuyerLabel: "MOPS",
    addedAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
    ezamowieniaUrl: "https://example.com",
    swzAnalysis: {
      estimatedValuePln: valuePln,
      estimatedValueRaw: `${valuePln.toLocaleString("pl-PL")} zł`,
      wadiumPln: opts.wadium ?? Math.round(valuePln * 0.02),
      wadiumRaw: "2%",
      referenceRequirement: opts.referenceRequirement ?? null,
      qualificationHints: [],
      implementationDeadlineRaw: null,
      implementationDays: opts.duration ?? 90,
      technicalRequirements: [],
      tableExtracts: [],
      costLines: [],
      parsedAt: "2026-05-01",
      source: "html",
      profitabilityHint: "good",
      profitabilityNote: "",
    },
    ourEstimatePln: opts.ourEstimate ?? null,
    tenderFit: opts.tenderFit ?? null,
  };
}

const jobs = [
  job("j1", "2026-09-01"),
  job("j2", "2026-10-15"),
];

const healthInputBase = {
  jobs,
  directory: [],
  weekEmployees: [],
  weekFrom: "2026-06-02",
  weekTo: "2026-06-07",
  profile,
  growthMode: "balanced",
  savedWeeks: [],
  now,
};

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

function runImpact(label, item) {
  const items = [item];
  const healthInput = { ...healthInputBase, items };
  const health = computeCompanyHealth(healthInput);
  const strategicContext = { health, growthMode: "balanced", jobs, items, profile };
  const bundle = scoreTender(item, profile, strategicContext, now);
  const scored = [bundle];
  const forecastInput = {
    jobs,
    savedWeeks: [],
    weekEmployees: [],
    directory: [],
    weekFrom: "2026-06-02",
    weekTo: "2026-06-07",
    profile,
    goBundles: scored,
  };
  const forecast = computeForecast90Days(forecastInput);
  const goCandidates = collectGoCandidates(scored);

  const impact = computeTenderImpact({
    bundle,
    health,
    healthInput,
    forecastInput,
    forecast,
    growthMode: "balanced",
    jobs,
    weekEmployees: [],
    directory: [],
    goCandidates,
    profile,
    now,
  });

  return { label, bundle, impact };
}

const small = runImpact("mały", tender("small", "Remont lokalu mieszkalnego", 120_000, {
  ourEstimate: 115_000,
  wadium: 12_000,
  duration: 45,
  relevance: 55,
  tenderFit: { score: 72, blockingIssues: [], tips: [] },
}));

const medium = runImpact("średni", tender("medium", "Remont budynku użyteczności publicznej", 850_000, {
  ourEstimate: 820_000,
  wadium: 18_000,
  duration: 90,
  relevance: 62,
  tenderFit: { score: 68, blockingIssues: [], tips: [] },
}));

const large = runImpact("duży", tender("large", "Modernizacja kompleksu szkolnego", 3_200_000, {
  ourEstimate: 3_050_000,
  wadium: 180_000,
  duration: 120,
  relevance: 58,
  referenceRequirement: "Referencje co najmniej 2 000 000 zł",
  tenderFit: { score: 45, blockingIssues: ["Referencje poniżej wymogu"], tips: [] },
}));

for (const sample of [small, medium, large]) {
  const { impact } = sample;
  assert(`${sample.label} — impact obiekt`, impact != null);
  assert(`${sample.label} — health 0-100`, impact.healthBefore >= 0 && impact.healthAfter <= 100);
  assert(`${sample.label} — forecast delta liczba`, Number.isFinite(impact.forecastDelta));
  assert(`${sample.label} — rekomendacja`, ["GO", "HOLD", "NO-GO"].includes(impact.recommendation));
  assert(`${sample.label} — max 6 ryzyk`, impact.risks.length <= 6);
  assert(`${sample.label} — impact score 0-100`, impact.impactScore.score >= 0 && impact.impactScore.score <= 100);
  assert(`${sample.label} — contract scale`, ["SMALL", "MEDIUM", "LARGE", "STRATEGIC"].includes(impact.contractScale));
  assert(`${sample.label} — cash flow level`, ["NISKI", "ŚREDNI", "WYSOKI", "KRYTYCZNY"].includes(impact.cashFlowImpact.level));
  assert(`${sample.label} — team impact`, impact.teamImpact.level.length > 0);
}

assert("mały — scale SMALL", small.impact.contractScale === "SMALL");
assert("średni — scale MEDIUM", medium.impact.contractScale === "MEDIUM");
assert("duży — scale STRATEGIC", large.impact.contractScale === "STRATEGIC");

assert("mały — niski cash flow", small.impact.cashFlowImpact.level === "NISKI");
assert("duży — wysoki/krytyczny cash flow", ["WYSOKI", "KRYTYCZNY"].includes(large.impact.cashFlowImpact.level));

assert("V2 — health delta różnicuje skalę", Math.abs(large.impact.healthDelta) >= Math.abs(small.impact.healthDelta));
assert("V2 — forecast delta różnicuje skalę", large.impact.forecastDelta > small.impact.forecastDelta);
assert("V2 — impact score różnicuje skalę", large.impact.impactScore.score !== small.impact.impactScore.score);

const examples = [small, medium, large].map(({ label, bundle, impact }) => ({
  size: label,
  title: impact.tenderTitle,
  revenue: impact.revenueImpact.contractValuePln,
  contractScale: impact.contractScale,
  impactScore: impact.impactScore.score,
  impactScoreClass: impact.impactScore.label,
  health: `${impact.healthBefore} → ${impact.healthAfter} (${impact.healthDelta >= 0 ? "+" : ""}${impact.healthDelta})`,
  forecast90: `${impact.forecastBefore}% → ${impact.forecastAfter}% (${impact.forecastDelta >= 0 ? "+" : ""}${impact.forecastDelta}%)`,
  cashFlowImpact: impact.cashFlowImpact.level,
  wadium: impact.cashFlowImpact.wadiumPln,
  teamImpact: impact.teamImpact.level,
  slots: `${impact.freeSlotsBefore} → ${impact.freeSlotsAfter}`,
  recommendation: impact.recommendationLabel,
  risks: impact.risks.map((r) => `${r.tone === "warning" ? "⚠" : "✓"} ${r.text}`),
  opportunityScore: bundle.opportunity.score,
  strategicScore: bundle.strategic.score,
}));

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({
  test: "tender-center-impact-v2",
  results,
  pass: failed.length === 0,
  examples,
}, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
