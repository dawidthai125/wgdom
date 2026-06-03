/**
 * W&G DOM COMMAND CENTER AI — test Financial Command Center ETAP 6E
 * Run: npx vite-node scripts/test-tender-center-financial-capacity.mjs
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
const { computeForecast90Days, collectGoCandidates } = await import("../src/lib/tender-center-forecast-90d.ts");
const { scoreTender } = await import("../src/lib/tender-center-decision.ts");
const { computeCompanyHealth } = await import("../src/lib/tender-center-health.ts");
const { computeTenderImpact } = await import("../src/lib/tender-center-impact.ts");
const { computeFinancialCapacity } = await import("../src/lib/tender-center-financial-capacity.ts");

const profile = defaultCompanyProfile();
const now = new Date("2026-06-02T12:00:00.000Z");

function job(id, endIso, amount = "400000") {
  return {
    id, address: `Roboty ${id}`, flatNumber: "", client: "Klient",
    startDate: "2026-03-01", endDate: endIso, status: "in_progress",
    keysHandedOver: false, notes: "", documents: {}, workEntries: [], materials: [],
    invoiceStatus: "pending", invoiceNumber: "", invoiceAmount: amount, photos: [],
    plannedHandoverDate: endIso,
  };
}

function tender(id, title, valuePln, opts = {}) {
  const deadline = new Date(now);
  deadline.setDate(deadline.getDate() + (opts.daysUntil ?? 45));
  return {
    id, bzpNumber: `BZP-${id}`, noticeNumber: "n", title,
    organizationName: opts.org ?? "MOPS Wrocław", organizationCity: "Wrocław",
    organizationProvince: "dolnośląskie", cpvCode: "45210000", publicationDate: "2026-05-01",
    submittingOffersDate: deadline.toISOString(), orderType: "Works", tenderId: id, moIdentifier: id,
    status: "new", notes: "", relevanceScore: opts.relevance ?? 45, matchedKeywords: ["remont"],
    isWroclaw: true, priorityBuyerId: "mops", priorityBuyerLabel: "MOPS",
    addedAt: "2026-05-01T10:00:00.000Z", updatedAt: "2026-05-01T10:00:00.000Z",
    ezamowieniaUrl: "https://example.com",
    swzAnalysis: {
      estimatedValuePln: valuePln,
      estimatedValueRaw: `${valuePln.toLocaleString("pl-PL")} zł`,
      wadiumPln: opts.wadium ?? Math.round(valuePln * 0.02),
      wadiumRaw: "2%", referenceRequirement: opts.referenceRequirement ?? null,
      qualificationHints: [], implementationDeadlineRaw: null,
      implementationDays: opts.duration ?? 90, technicalRequirements: [],
      tableExtracts: [], costLines: [], parsedAt: "2026-05-01", source: "html",
      profitabilityHint: "good", profitabilityNote: "",
    },
    ourEstimatePln: opts.ourEstimate ?? null,
    tenderFit: opts.tenderFit ?? null,
  };
}

const jobs = [job("j1", "2026-09-01"), job("j2", "2026-10-15")];
const healthInputBase = {
  jobs, directory: [], weekEmployees: [], weekFrom: "2026-06-02", weekTo: "2026-06-07",
  profile, growthMode: "balanced", savedWeeks: [], now,
};

const results = [];
function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

function runFinancial(label, item) {
  const items = [item];
  const healthInput = { ...healthInputBase, items };
  const health = computeCompanyHealth(healthInput);
  const bundle = scoreTender(item, profile, { health, growthMode: "balanced", jobs, items, profile }, now);
  const scored = [bundle];
  const forecastInput = {
    jobs, savedWeeks: [], weekEmployees: [], directory: [],
    weekFrom: "2026-06-02", weekTo: "2026-06-07", profile, goBundles: scored,
  };
  const forecast = computeForecast90Days(forecastInput);
  const goCandidates = collectGoCandidates(scored);
  const impact = computeTenderImpact({
    bundle, health, healthInput, forecastInput, forecast,
    growthMode: "balanced", jobs, weekEmployees: [], directory: [],
    goCandidates, profile, now,
  });
  const capacity = computeFinancialCapacity({
    bundle, profile, health, impact, jobs,
    growthMode: "balanced", pipelineItems: items,
  });
  return { label, impact, capacity };
}

const small = runFinancial("mały", tender("small", "Remont lokalu", 120_000, {
  ourEstimate: 115_000, wadium: 12_000, duration: 45,
  tenderFit: { score: 72, blockingIssues: [], tips: [] },
}));
const medium = runFinancial("średni", tender("medium", "Remont budynku UP", 850_000, {
  ourEstimate: 820_000, wadium: 18_000, duration: 90,
  tenderFit: { score: 68, blockingIssues: [], tips: [] },
}));
const large = runFinancial("duży", tender("large", "Modernizacja szkoły", 3_200_000, {
  ourEstimate: 3_050_000, wadium: 180_000, duration: 120,
  referenceRequirement: "Referencje co najmniej 2 000 000 zł",
  tenderFit: { score: 45, blockingIssues: ["Referencje"], tips: [] },
}));

for (const sample of [small, medium, large]) {
  const { capacity } = sample;
  assert(`${sample.label} — capacity obiekt`, capacity != null);
  assert(`${sample.label} — score 0-100`, capacity.financialCapacityScore >= 0 && capacity.financialCapacityScore <= 100);
  assert(`${sample.label} — bufor >= 0`, capacity.estimatedBuffer >= 0);
  assert(`${sample.label} — rekomendacja finansowa`, typeof capacity.recommendation === "string");
  assert(`${sample.label} — liquidity risk`, ["NISKIE", "ŚREDNIE", "WYSOKIE", "KRYTYCZNE"].includes(capacity.liquidityRisk));
}

assert("mały — bufor dodatni", small.capacity.estimatedBuffer > 0);
assert("średni — bufor dodatni", medium.capacity.estimatedBuffer > 0);

assert("mały — wysoka/średnia zdolność", small.capacity.financialCapacityScore >= 55);
assert("duży — niska/krytyczna zdolność", large.capacity.financialCapacityScore < 55);
assert("duży — funding gap", large.capacity.fundingGap != null && large.capacity.fundingGap > 0);
assert("mały — brak funding gap", small.capacity.fundingGap == null || small.capacity.fundingGap === 0);
assert("V2 — score maleje ze skalą", small.capacity.financialCapacityScore > large.capacity.financialCapacityScore);

const examples = [small, medium, large].map(({ label, capacity }) => ({
  size: label,
  financialCapacityScore: capacity.financialCapacityScore,
  capacityClass: capacity.capacityClass,
  liquidityRisk: capacity.liquidityRisk,
  estimatedBuffer: capacity.estimatedBuffer,
  fundingGap: capacity.fundingGap,
  depositImpact: capacity.depositImpact,
  depositValue: capacity.depositValue,
  recommendation: capacity.recommendation,
  warnings: capacity.warnings,
  strengths: capacity.strengths,
}));

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({
  test: "tender-center-financial-capacity",
  results,
  pass: failed.length === 0,
  examples,
}, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
