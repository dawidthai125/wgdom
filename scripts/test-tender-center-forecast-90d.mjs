/**
 * Tender Center PRO — test prognozy 90 dni ETAP 3B
 * Run: npx vite-node scripts/test-tender-center-forecast-90d.mjs
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
const { computeForecast90Days, primaryForecastScenario } = await import("../src/lib/tender-center-forecast-90d.ts");
const { scoreTender } = await import("../src/lib/tender-center-decision.ts");
const { computeCompanyHealth } = await import("../src/lib/tender-center-health.ts");

const profile = defaultCompanyProfile();
const now = new Date("2026-06-02T12:00:00.000Z");

function job(id, endIso, status = "in_progress") {
  return {
    id,
    address: `Roboty ${id}`,
    flatNumber: "",
    client: "Klient",
    startDate: "2026-03-01",
    endDate: endIso,
    status,
    keysHandedOver: false,
    notes: "",
    documents: {},
    workEntries: [],
    materials: [],
    invoiceStatus: "pending",
    invoiceNumber: "",
    invoiceAmount: "400000",
    photos: [],
    plannedHandoverDate: endIso,
  };
}

function tender(id, title, daysUntilDeadline = 60) {
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + daysUntilDeadline);
  return {
    id,
    bzpNumber: `BZP-${id}`,
    noticeNumber: "n",
    title,
    organizationName: "MOPS Wrocław",
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
    relevanceScore: 45,
    matchedKeywords: ["remont"],
    isWroclaw: true,
    priorityBuyerId: "mops",
    priorityBuyerLabel: "MOPS",
    addedAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
    ezamowieniaUrl: "https://example.com",
    swzAnalysis: {
      estimatedValuePln: 600_000,
      estimatedValueRaw: "600 000",
      wadiumPln: 12_000,
      wadiumRaw: "12 000",
      referenceRequirement: null,
      qualificationHints: [],
      implementationDeadlineRaw: null,
      implementationDays: 90,
      technicalRequirements: [],
      tableExtracts: [],
      costLines: [],
      parsedAt: "2026-05-01",
      source: "html",
      profitabilityHint: "good",
      profitabilityNote: "",
    },
    ourEstimatePln: 580_000,
    tenderFit: {
      fitScore: 80,
      fitLabel: "strong",
      winChancePct: 50,
      winChanceNote: "",
      requirementChecks: [],
      awardCriteria: [],
      priceWeightPct: 60,
      tips: [],
      blockingIssues: [],
      assessedAt: "2026-05-01",
    },
  };
}

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

const savedWeeks = [
  { id: "w1", weekFrom: "2026-05-26", weekTo: "2026-05-31", savedAt: "", employees: [], totalEmployees: 8, totalHours: 320, totalGross: 0, totalZaliczka: 0, totalNet: 0 },
  { id: "w2", weekFrom: "2026-05-19", weekTo: "2026-05-24", savedAt: "", employees: [], totalEmployees: 8, totalHours: 300, totalGross: 0, totalZaliczka: 0, totalNet: 0 },
];

const examples = [];

// Przykład 1: mało robót, kończą się wkrótce → niskie obciążenie
{
  const jobs = [job("j1", "2026-06-20"), job("j2", "2026-07-01")];
  const items = [tender("t1", "Remont A"), tender("t2", "Remont B")];
  const health = computeCompanyHealth({
    items, jobs, directory: [], weekEmployees: [], weekFrom: "2026-06-02", weekTo: "2026-06-07", profile, growthMode: "balanced", now,
  });
  const bundles = items.map((i) => scoreTender(i, profile, { health, growthMode: "balanced", jobs, items, profile }, now));
  const forecast = computeForecast90Days({
    jobs, savedWeeks, weekEmployees: [], directory: [], weekFrom: "2026-06-02", weekTo: "2026-06-07", profile, goBundles: bundles, now,
  });
  const c = primaryForecastScenario(forecast);
  assert("example1 has 3 horizons", c.horizons.length === 3);
  examples.push({
    name: "2 roboty kończące się w czerwcu, 2 GO",
    activeNow: forecast.activeJobsNow,
    scenarioC: Object.fromEntries(c.horizons.map((h) => [`${h.days}d`, `${h.utilizationPct}%`])),
    alert: c.alert,
    risks: Object.fromEntries(c.horizons.map((h) => [`${h.days}d`, h.risk])),
  });
}

// Przykład 2: pełne obciążenie + wiele GO → przeciążenie
{
  const jobs = [
    job("j1", "2026-09-01"),
    job("j2", "2026-09-01"),
    job("j3", "2026-09-15"),
    job("j4", "2026-10-01"),
  ];
  const items = [tender("t1", "GO 1"), tender("t2", "GO 2"), tender("t3", "GO 3")];
  const health = computeCompanyHealth({
    items, jobs, directory: [], weekEmployees: [], weekFrom: "2026-06-02", weekTo: "2026-06-07", profile, growthMode: "growth", now,
  });
  const bundles = items.map((i) => scoreTender(i, profile, { health, growthMode: "growth", jobs, items, profile }, now));
  const ownerStore = {
    version: 1,
    byId: Object.fromEntries(items.map((i) => [i.id, {
      id: i.id, decision: "GO", createdAt: now.toISOString(), updatedAt: now.toISOString(),
      systemDecision: "GO", opportunityScore: 85, strategicScore: 70,
    }])),
  };
  const forecast = computeForecast90Days({
    jobs, savedWeeks, weekEmployees: [], directory: [], weekFrom: "2026-06-02", weekTo: "2026-06-07", profile, goBundles: bundles, ownerStore, now,
  });
  const b = forecast.scenarios.find((s) => s.id === "all_go");
  const h90 = b?.horizons.find((h) => h.days === 90);
  assert("example2 overload possible", (h90?.utilizationPct ?? 0) >= 100, { h90: h90?.utilizationPct });
  examples.push({
    name: "4 roboty + 3 GO (scenariusz B)",
    activeNow: forecast.activeJobsNow,
    scenarioB_90d: `${h90?.utilizationPct}%`,
    alert: b?.alert,
    risk90: h90?.risk,
  });
}

// Przykład 3: scenariusz A vs C
{
  const jobs = [job("j1", "2026-08-15"), job("j2", "2026-08-30")];
  const items = [tender("t1", "Jeden GO")];
  const health = computeCompanyHealth({
    items, jobs, directory: [], weekEmployees: [], weekFrom: "2026-06-02", weekTo: "2026-06-07", profile, growthMode: "balanced", now,
  });
  const bundles = items.map((i) => scoreTender(i, profile, { health, growthMode: "balanced", jobs, items, profile }, now));
  const forecast = computeForecast90Days({
    jobs, savedWeeks, weekEmployees: [], directory: [], weekFrom: "2026-06-02", weekTo: "2026-06-07", profile, goBundles: bundles, now,
  });
  const a = forecast.scenarios.find((s) => s.id === "none");
  const c = forecast.scenarios.find((s) => s.id === "half_go");
  assert("scenario A 90d <= scenario C 90d", (a?.horizons[2].utilizationPct ?? 0) <= (c?.horizons[2].utilizationPct ?? 999));
  examples.push({
    name: "Porównanie A vs C (2 roboty, 1 GO)",
    scenarioA: Object.fromEntries((a?.horizons ?? []).map((h) => [`${h.days}d`, `${h.utilizationPct}%`])),
    scenarioC: Object.fromEntries((c?.horizons ?? []).map((h) => [`${h.days}d`, `${h.utilizationPct}%`])),
  });
}

assert("3 scenarios always", examples.length === 3);

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ test: "tender-center-forecast-90d", results, examples, pass: failed.length === 0 }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
