/**
 * Tender Center PRO — test explainability ETAP 3C
 * Run: npx vite-node scripts/test-tender-center-explain.mjs
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
const { computeCompanyHealth } = await import("../src/lib/tender-center-health.ts");
const { computeForecast90Days } = await import("../src/lib/tender-center-forecast-90d.ts");
const { scoreTender } = await import("../src/lib/tender-center-decision.ts");
const {
  explainHealth,
  explainOpportunityScore,
  explainStrategicDecision,
  buildForecastExplainContext,
  explainAllForecastHorizons,
  buildOwnerStrategicAlerts,
} = await import("../src/lib/tender-center-explain.ts");

const profile = defaultCompanyProfile();
const now = new Date("2026-06-02T12:00:00.000Z");

function job(id, endIso) {
  return {
    id, address: `Robota ${id}`, flatNumber: "", client: "MOPS", startDate: "2026-03-01",
    endDate: endIso, status: "in_progress", keysHandedOver: false, notes: "", documents: {},
    workEntries: [], materials: [], invoiceStatus: "pending", invoiceNumber: "", invoiceAmount: "400000",
    photos: [], plannedHandoverDate: endIso,
  };
}

function tender(id, title, daysOut = 5) {
  const dl = new Date(now);
  dl.setDate(dl.getDate() + daysOut);
  return {
    id, bzpNumber: id, noticeNumber: "n", title, organizationName: "MOPS Wrocław",
    organizationCity: "Wrocław", organizationProvince: "dolnośląskie", cpvCode: "45210000",
    publicationDate: "2026-05-01", submittingOffersDate: dl.toISOString(), orderType: "Works",
    tenderId: id, moIdentifier: id, status: "new", notes: "", relevanceScore: 48,
    matchedKeywords: ["remont"], isWroclaw: true, priorityBuyerId: "mops", priorityBuyerLabel: "MOPS",
    addedAt: "2026-05-01T10:00:00.000Z", updatedAt: "2026-05-01T10:00:00.000Z",
    ezamowieniaUrl: "https://x", swzAnalysis: { estimatedValuePln: 650_000, estimatedValueRaw: "650k",
      wadiumPln: 13000, wadiumRaw: "13k", referenceRequirement: null, qualificationHints: [],
      implementationDays: 90, technicalRequirements: [], tableExtracts: [], costLines: [],
      parsedAt: "2026-05-01", source: "html", profitabilityHint: "good", profitabilityNote: "" },
    ourEstimatePln: 620_000,
    tenderFit: { fitScore: 82, fitLabel: "strong", winChancePct: 50, winChanceNote: "",
      requirementChecks: [], awardCriteria: [], priceWeightPct: 60, tips: [], blockingIssues: [],
      assessedAt: "2026-05-01" },
  };
}

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

const jobs = [
  job("mops", "2026-06-25"),
  job("szkola", "2026-07-10"),
  job("um", "2026-09-01"),
];
const items = [tender("t1", "Remont MOPS biuro"), tender("t2", "Szkoła malowanie", 6)];
const health = computeCompanyHealth({
  items, jobs, directory: [], weekEmployees: [], weekFrom: "2026-06-02", weekTo: "2026-06-07",
  profile, growthMode: "balanced", now,
});
const bundles = items.map((i) => scoreTender(i, profile, { health, growthMode: "balanced", jobs, items, profile }, now));
const forecast = computeForecast90Days({
  jobs, savedWeeks: [], weekEmployees: [], directory: [], weekFrom: "2026-06-02", weekTo: "2026-06-07",
  profile, goBundles: bundles, now,
});

const healthEx = explainHealth(
  { items, jobs, directory: [], weekEmployees: [], weekFrom: "2026-06-02", weekTo: "2026-06-07", profile, growthMode: "balanced", savedWeeks: [], now },
  health,
  forecast,
);
assert("health explainer has bullets", healthEx.plus.length + healthEx.minus.length >= 2, { index: healthEx.index });

const oppEx = explainOpportunityScore(bundles[0].opportunity);
assert("opportunity top3", oppEx.plus.length <= 3 && oppEx.minus.length <= 3);

const stratEx = explainStrategicDecision(bundles[0]);
assert("strategic explains decision", stratEx.decision === bundles[0].decision && stratEx.reasons.length > 0);

const ctx = buildForecastExplainContext(jobs, items);
const fEx = explainAllForecastHorizons(forecast, ctx);
const h90 = fEx.find((e) => e.horizon.days === 90);
assert("forecast 90d reasons", (h90?.reasons.length ?? 0) >= 2, { h90: h90?.horizon.utilizationPct });

const alerts = buildOwnerStrategicAlerts({
  jobs, items, goBundles: bundles, forecast, forecastContext: ctx, profile, now,
});
assert("alerts have sources", alerts.every((a) => a.source.length > 3), { count: alerts.length });

const examples = {
  healthIndex: healthEx.index,
  healthPlus: healthEx.plus.slice(0, 2).map((l) => l.text),
  healthMinus: healthEx.minus.slice(0, 2).map((l) => l.text),
  opportunityPlus: oppEx.plus.map((l) => l.text),
  opportunityMinus: oppEx.minus.map((l) => l.text),
  strategicDecision: stratEx.decision,
  strategicReasons: stratEx.reasons.slice(0, 3).map((r) => r.text),
  forecast90: {
    pct: h90?.horizon.utilizationPct,
    reasons: h90?.reasons.map((r) => r.text),
    recommendation: h90?.recommendation,
  },
  alerts: alerts.map((a) => ({ message: a.message, source: a.source })),
};

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ test: "tender-center-explain", results, examples, pass: failed.length === 0 }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
