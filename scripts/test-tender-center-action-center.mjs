/**
 * Tender Center PRO — test Action Center ETAP 3D
 * Run: npx vite-node scripts/test-tender-center-action-center.mjs
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
const { scoreTender, rankTopTenderOpportunities } = await import("../src/lib/tender-center-decision.ts");
const { buildOwnerStrategicAlerts } = await import("../src/lib/tender-center-explain.ts");
const { buildActionCenter } = await import("../src/lib/tender-center-action-center.ts");

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

function tender(id, title, daysOut, status = "preparing") {
  const dl = new Date(now);
  dl.setDate(dl.getDate() + daysOut);
  return {
    id, bzpNumber: id, noticeNumber: "n", title, organizationName: "MOPS Wrocław",
    organizationCity: "Wrocław", organizationProvince: "dolnośląskie", cpvCode: "45210000",
    publicationDate: "2026-05-01", submittingOffersDate: dl.toISOString(), orderType: "Works",
    tenderId: id, moIdentifier: id, status, notes: "", relevanceScore: 48,
    matchedKeywords: ["remont"], isWroclaw: true, priorityBuyerId: "mops", priorityBuyerLabel: "MOPS",
    addedAt: "2026-05-01T10:00:00.000Z", updatedAt: "2026-05-01T10:00:00.000Z",
    ezamowieniaUrl: "https://x",
    swzAnalysis: {
      estimatedValuePln: 650_000, estimatedValueRaw: "650k", wadiumPln: 13000, wadiumRaw: "13k",
      referenceRequirement: null, qualificationHints: [], implementationDays: 90,
      technicalRequirements: [], tableExtracts: [], costLines: [], parsedAt: "2026-05-01",
      source: "html", profitabilityHint: "good", profitabilityNote: "",
    },
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

const jobs = [job("mops", "2026-06-25"), job("szkola", "2026-07-10")];
const items = [
  tender("t1", "Remont MOPS — termin 3 dni", 3, "preparing"),
  tender("t2", "Szkoła malowanie", 6, "new"),
  tender("t3", "UM elewacja", 45, "new"),
];
const health = computeCompanyHealth({
  items, jobs, directory: [], weekEmployees: [], weekFrom: "2026-06-02", weekTo: "2026-06-07",
  profile, growthMode: "balanced", now,
});
const ctx = { health, growthMode: "balanced", jobs, items, profile };
const bundles = items.map((i) => scoreTender(i, profile, ctx, now));
const radarTop = rankTopTenderOpportunities(items, profile, ctx, 5, now);
const forecast = computeForecast90Days({
  jobs, savedWeeks: [], weekEmployees: [], directory: [], weekFrom: "2026-06-02", weekTo: "2026-06-07",
  profile, goBundles: bundles, now,
});
const alerts = buildOwnerStrategicAlerts({
  jobs, items, goBundles: bundles, forecast, forecastContext: { spansScenarioC: [], goCountScenarioC: 2, now },
  profile, now,
});

const center = buildActionCenter({
  radarTop,
  scoredBundles: bundles,
  health,
  forecast,
  ownerStore: { version: 1, byId: {} },
  strategicAlerts: alerts,
  now,
});

assert("has actions", center.actions.length > 0, { count: center.actions.length });
assert("sorted critical first", center.actions.length === 0 || center.actions[0].priority === "CRITICAL" || center.actions[0].priority === "HIGH");
assert("has primary", center.primaryAction != null);
assert("counts sum", center.counts.CRITICAL + center.counts.HIGH + center.counts.MEDIUM + center.counts.LOW === center.actions.length);
assert("critical deadline action", center.actions.some((a) => a.id.includes("deadline-3d") || a.priority === "CRITICAL"));

const examples = center.actions.slice(0, 5).map((a) => ({
  priority: a.priority,
  category: a.category,
  title: a.title,
  recommendedAction: a.recommendedAction,
  source: a.source,
}));

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({
  test: "tender-center-action-center",
  results,
  primary: center.primaryAction,
  counts: center.counts,
  headline: center.headline,
  examples,
  pass: failed.length === 0,
}, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
