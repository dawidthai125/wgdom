/**
 * Tender Center PRO — test Co jeśli ETAP 6A
 * Run: npx vite-node scripts/test-tender-center-what-if.mjs
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
const { scoreTender } = await import("../src/lib/tender-center-decision.ts");
const {
  computeWhatIfComparison,
  computeAllWhatIfPresets,
  WHAT_IF_PRESET_ORDER,
} = await import("../src/lib/tender-center-what-if.ts");

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

function tender(id, title, daysOut) {
  const dl = new Date(now);
  dl.setDate(dl.getDate() + daysOut);
  return {
    id, bzpNumber: id, noticeNumber: "n", title, organizationName: "MOPS",
    organizationCity: "Wrocław", organizationProvince: "dolnośląskie", cpvCode: "45210000",
    publicationDate: "2026-05-01", submittingOffersDate: dl.toISOString(), orderType: "Works",
    tenderId: id, moIdentifier: id, status: "new", notes: "", relevanceScore: 48,
    matchedKeywords: ["remont"], isWroclaw: true, priorityBuyerId: "mops", priorityBuyerLabel: "MOPS",
    addedAt: "2026-05-01T10:00:00.000Z", updatedAt: "2026-05-01T10:00:00.000Z",
    ezamowieniaUrl: "https://x",
    swzAnalysis: {
      estimatedValuePln: 650_000, implementationDays: 90,
      wadiumPln: 13000, referenceRequirement: null, qualificationHints: [],
      technicalRequirements: [], tableExtracts: [], costLines: [], parsedAt: "2026-05-01",
      source: "html", profitabilityHint: "good", profitabilityNote: "",
    },
    tenderFit: { fitScore: 82, fitLabel: "strong", winChancePct: 50, winChanceNote: "",
      requirementChecks: [], awardCriteria: [], priceWeightPct: 60, tips: [], blockingIssues: [],
      assessedAt: "2026-05-01" },
  };
}

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

const jobs = [job("j1", "2026-08-01"), job("j2", "2026-09-15")];
const items = [
  tender("t1", "Remont A", 45),
  tender("t2", "Remont B", 50),
  tender("t3", "Remont C", 55),
];
const health = computeCompanyHealth({
  items, jobs, directory: [], weekEmployees: [], weekFrom: "2026-06-02", weekTo: "2026-06-07",
  profile, growthMode: "balanced", now,
});
const ctx = { health, growthMode: "balanced", jobs, items, profile };
const bundles = items.map((i) => scoreTender(i, profile, ctx, now));

const input = {
  jobs, savedWeeks: [], weekEmployees: [], directory: [],
  weekFrom: "2026-06-02", weekTo: "2026-06-07", profile,
  goBundles: bundles, ownerStore: { version: 1, byId: {} }, now,
};

const baseline = computeWhatIfComparison(input, "baseline");
const none = computeWhatIfComparison(input, "none");
const allGo = computeWhatIfComparison(input, "all_go");
const plusSlot = computeWhatIfComparison(input, "plus_one_slot");

assert("baseline zero deltas", baseline.horizons.every((h) => h.deltaPct === 0));
assert("none <= baseline 90d", none.horizons[2].simulatedPct <= baseline.horizons[2].baselinePct);
assert("all_go >= baseline 90d", allGo.horizons[2].simulatedPct >= baseline.horizons[2].baselinePct);
assert("plus_slot lowers vs baseline same wins", plusSlot.horizons[2].simulatedPct <= baseline.horizons[2].baselinePct);
assert("has conclusion", typeof allGo.conclusion === "string" && allGo.conclusion.length > 10);
assert("biggest change number", Number.isFinite(allGo.biggestChangeDeltaPct));

const allPresets = computeAllWhatIfPresets(input);
assert("all presets", WHAT_IF_PRESET_ORDER.filter((id) => id !== "custom").every((id) => allPresets[id] != null));

const customOne = computeWhatIfComparison(input, "custom", ["t1"]);
const customAll = computeWhatIfComparison(input, "custom", ["t1", "t2", "t3"]);
const customNone = computeWhatIfComparison(input, "custom", []);
assert("custom one between none and all 90d",
  customOne.horizons[2].simulatedPct >= customNone.horizons[2].simulatedPct
  && customOne.horizons[2].simulatedPct <= customAll.horizons[2].simulatedPct);
assert("custom none equals preset none 90d",
  customNone.horizons[2].simulatedPct === none.horizons[2].simulatedPct);
assert("custom all equals preset all_go 90d",
  customAll.horizons[2].simulatedPct === allGo.horizons[2].simulatedPct);
assert("custom label", customOne.presetLabel.includes("1 wygranych"));

const pass = results.every((r) => r.pass);

console.log(JSON.stringify({
  test: "tender-center-what-if",
  results,
  baseline90: baseline.horizons[2],
  allGo90: allGo.horizons[2],
  allGoBiggest: { horizon: allGo.biggestChangeHorizon, delta: allGo.biggestChangeDeltaPct },
  allGoConclusion: allGo.conclusion,
  pass,
}, null, 2));

process.exit(pass ? 0 : 1);
