/**
 * Tender Center PRO — test lib ETAP 2A (Krok 1)
 * Run: npx vite-node scripts/test-tender-center-lib.mjs
 */

if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = class DOMMatrix {
    constructor(init) {
      this.a = 1;
      this.b = 0;
      this.c = 0;
      this.d = 1;
      this.e = 0;
      this.f = 0;
      if (init && typeof init === "object") Object.assign(this, init);
    }
    multiply() { return new DOMMatrix(this); }
    translate() { return new DOMMatrix(this); }
    scale() { return new DOMMatrix(this); }
    inverse() { return new DOMMatrix(this); }
  };
}

const { defaultCompanyProfile } = await import("../src/lib/tenders-bzp-company.ts");
const {
  healthWeightsForMode,
  suggestGrowthMode,
  minOpportunityScoreForMode,
} = await import("../src/lib/tenders-strategy-growth-mode.ts");
const {
  aggregateMarketKpi,
  countPreparingOffers,
  sumOpenMarketValuePln,
} = await import("../src/lib/tenders-strategy-kpi.ts");
const { computeCompanyHealth } = await import("../src/lib/tenders-strategy-health.ts");

const profile = defaultCompanyProfile();

const sampleOpenItem = {
  id: "t1",
  bzpNumber: "2026/BZP 0001",
  noticeNumber: "n1",
  title: "Remont budynku Wrocław",
  organizationName: "MOPS Wrocław",
  organizationCity: "Wrocław",
  organizationProvince: "dolnośląskie",
  cpvCode: "45210000",
  publicationDate: "2026-05-01",
  submittingOffersDate: "2026-12-31T12:00:00.000Z",
  orderType: "Works",
  tenderId: "tid1",
  moIdentifier: "mo1",
  status: "preparing",
  notes: "",
  relevanceScore: 45,
  matchedKeywords: ["remont"],
  isWroclaw: true,
  priorityBuyerId: "mops",
  priorityBuyerLabel: "MOPS Wrocław",
  addedAt: "2026-05-01T10:00:00.000Z",
  updatedAt: "2026-05-01T10:00:00.000Z",
  ezamowieniaUrl: "https://example.com",
  swzAnalysis: {
    estimatedValuePln: 500_000,
    estimatedValueRaw: "500 000 zł",
    wadiumPln: 10_000,
    wadiumRaw: "10 000 zł",
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
  ourEstimatePln: 480_000,
};

const results = [];

function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

assert("healthWeightsForMode balanced sums ~1", (() => {
  const w = healthWeightsForMode("balanced");
  const sum = w.O + w.Z + w.F + w.R + w.D;
  return Math.abs(sum - 1) < 0.001;
})());

assert("suggestGrowthMode stabilize on low health", suggestGrowthMode({
  healthIndex: 35,
  overloadIndex: 0.5,
  wmOverdueCount: 0,
  wadiumHeadroomPln: 50_000,
  winRate: 50,
  freeSlots: 2,
}) === "stabilize");

assert("suggestGrowthMode expansion on strong metrics", suggestGrowthMode({
  healthIndex: 88,
  overloadIndex: 0.25,
  wmOverdueCount: 0,
  wadiumHeadroomPln: 40_000,
  winRate: 45,
  freeSlots: 3,
}) === "expansion");

assert("minOpportunityScore stabilize >= balanced", minOpportunityScoreForMode("stabilize") > minOpportunityScoreForMode("balanced"));

const kpi = aggregateMarketKpi([sampleOpenItem], profile);
assert("aggregateMarketKpi market value", kpi.marketValuePln === 500_000, { kpi });
assert("aggregateMarketKpi pipeline bid", kpi.pipelineBidValuePln === 480_000, { kpi });
assert("countPreparingOffers", countPreparingOffers([sampleOpenItem]) === 1);
assert("sumOpenMarketValuePln", sumOpenMarketValuePln([sampleOpenItem]) === 500_000);

const health = computeCompanyHealth({
  items: [sampleOpenItem],
  jobs: [],
  directory: [],
  weekEmployees: [],
  weekFrom: "2026-06-02",
  weekTo: "2026-06-07",
  profile,
  growthMode: "balanced",
  now: new Date("2026-06-02T12:00:00.000Z"),
});

assert("health index 0-100", health.index >= 0 && health.index <= 100, { index: health.index });
assert("health has 5 dimensions", health.dimensions.O >= 0 && health.dimensions.D >= 0);
assert("health label valid", ["healthy", "stable", "strained", "at_risk"].includes(health.label));
assert("health suggested mode", typeof health.suggestedGrowthMode === "string");

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({ test: "tender-center-lib", results, pass: failed.length === 0 }, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
