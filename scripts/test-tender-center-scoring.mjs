/**
 * Tender Center PRO — test scoring ETAP 2B
 * Run: npx vite-node scripts/test-tender-center-scoring.mjs
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
const { computeTenderDecision } = await import("../src/lib/tender-center-decision.ts");
const { computeOpportunityScore } = await import("../src/lib/tender-center-opportunity-score.ts");
const { computeStrategicScore } = await import("../src/lib/tender-center-strategic-score.ts");
const { scoreTender } = await import("../src/lib/tender-center-decision.ts");

const profile = defaultCompanyProfile();
const now = new Date("2026-06-02T12:00:00.000Z");

function baseItem(overrides) {
  return {
    id: "x",
    bzpNumber: "2026/BZP 0000",
    noticeNumber: "n",
    title: "Przetarg",
    organizationName: "Zamawiający",
    organizationCity: "Wrocław",
    organizationProvince: "dolnośląskie",
    cpvCode: "45210000",
    publicationDate: "2026-05-01",
    submittingOffersDate: "2026-12-31T12:00:00.000Z",
    orderType: "Works",
    tenderId: "t",
    moIdentifier: "mo",
    status: "new",
    notes: "",
    relevanceScore: 30,
    matchedKeywords: ["remont"],
    isWroclaw: true,
    priorityBuyerId: null,
    priorityBuyerLabel: null,
    addedAt: "2026-05-01T10:00:00.000Z",
    updatedAt: "2026-05-01T10:00:00.000Z",
    ezamowieniaUrl: "https://example.com",
    ...overrides,
  };
}

/** Scenariusz 1: MOPS Wrocław — remont budynku, pełna analiza, Wrocław, wycena. */
const tenderMops = baseItem({
  id: "wg-mops-1",
  bzpNumber: "2026/BZP 004521",
  title: "Remont i modernizacja pomieszczeń biurowych w budynku administracyjnym",
  organizationName: "MOPS Wrocław",
  priorityBuyerId: "mops",
  priorityBuyerLabel: "MOPS Wrocław",
  relevanceScore: 48,
  status: "preparing",
  submittingOffersDate: "2026-07-15T12:00:00.000Z",
  ourEstimatePln: 620_000,
  swzAnalysis: {
    estimatedValuePln: 650_000,
    estimatedValueRaw: "650 000 zł",
    wadiumPln: 13_000,
    wadiumRaw: "13 000 zł",
    referenceRequirement: "doświadczenie min. 500 000 zł",
    qualificationHints: [],
    implementationDeadlineRaw: "120 dni",
    implementationDays: 120,
    technicalRequirements: [],
    tableExtracts: [],
    costLines: [],
    parsedAt: "2026-05-20",
    source: "html",
    profitabilityHint: "good",
    profitabilityNote: "",
  },
  tenderFit: {
    fitScore: 82,
    fitLabel: "strong",
    winChancePct: 52,
    winChanceNote: "",
    requirementChecks: [],
    awardCriteria: [],
    priceWeightPct: 60,
    tips: [],
    blockingIssues: [],
    assessedAt: "2026-05-20",
  },
});

/** Scenariusz 2: UM Wrocław — duży kontrakt, krótki termin, firma przeciążona. */
const tenderUm = baseItem({
  id: "wg-um-1",
  bzpNumber: "2026/BZP 009812",
  title: "Kompleksowy remont elewacji i klatek schodowych — budynek wielorodzinny",
  organizationName: "Urząd Miasta Wrocławia",
  priorityBuyerId: "um-wro",
  priorityBuyerLabel: "UM Wrocław",
  relevanceScore: 42,
  status: "interested",
  submittingOffersDate: "2026-06-08T12:00:00.000Z",
  swzAnalysis: {
    estimatedValuePln: 2_400_000,
    estimatedValueRaw: "2 400 000 zł",
    wadiumPln: 48_000,
    wadiumRaw: "48 000 zł",
    referenceRequirement: "referencje min. 1 500 000 zł",
    qualificationHints: [],
    implementationDeadlineRaw: null,
    implementationDays: 180,
    technicalRequirements: [],
    tableExtracts: [],
    costLines: [],
    parsedAt: "2026-05-28",
    source: "html",
    profitabilityHint: "neutral",
    profitabilityNote: "",
  },
  tenderFit: {
    fitScore: 58,
    fitLabel: "possible",
    winChancePct: 28,
    winChanceNote: "",
    requirementChecks: [],
    awardCriteria: [],
    priceWeightPct: 100,
    tips: [],
    blockingIssues: ["Wysokie wymagane referencje"],
    assessedAt: "2026-05-28",
  },
});

/** Scenariusz 3: Poznań — poza Wrocławiem, słaba trafność, brak SWZ. */
const tenderPoznan = baseItem({
  id: "wg-poz-1",
  bzpNumber: "2026/BZP 002103",
  title: "Malowanie i drobne naprawy w szkole podstawowej",
  organizationName: "Szkoła Podstawowa nr 12",
  organizationCity: "Poznań",
  isWroclaw: false,
  priorityBuyerId: null,
  priorityBuyerLabel: null,
  relevanceScore: 8,
  submittingOffersDate: "2026-08-01T12:00:00.000Z",
});

const busyJobs = Array.from({ length: 4 }, (_, i) => ({
  id: `job-${i}`,
  status: "in_progress",
  address: `Roboty ${i}`,
  client: "Klient",
  notes: "",
  invoiceAmount: "400000",
  documents: { zlecenie: true, kosztorys: true },
}));

const healthStrong = computeCompanyHealth({
  items: [tenderMops],
  jobs: busyJobs.slice(0, 2),
  directory: [],
  weekEmployees: [],
  weekFrom: "2026-06-02",
  weekTo: "2026-06-07",
  profile,
  growthMode: "balanced",
  now,
});

const healthStrained = computeCompanyHealth({
  items: [tenderMops, tenderUm, tenderUm],
  jobs: busyJobs,
  directory: [],
  weekEmployees: [],
  weekFrom: "2026-06-02",
  weekTo: "2026-06-07",
  profile,
  growthMode: "stabilize",
  now,
});

function ctx(health, growthMode, items, jobs) {
  return { health, growthMode, jobs, items, profile, now };
}

const results = [];

function assert(name, cond, detail = {}) {
  results.push({ name, pass: !!cond, ...detail });
}

const s1 = scoreTender(tenderMops, profile, ctx(healthStrong, "balanced", [tenderMops], busyJobs.slice(0, 2)), now);
const s2 = scoreTender(tenderUm, profile, ctx(healthStrained, "stabilize", [tenderMops, tenderUm, tenderUm], busyJobs), now);
const s3 = scoreTender(tenderPoznan, profile, ctx(healthStrong, "balanced", [tenderPoznan], busyJobs.slice(0, 2)), now);

assert("decision GO example", computeTenderDecision(90, 85) === "GO");
assert("decision HOLD example", computeTenderDecision(90, 30) === "HOLD");
assert("decision NO-GO example", computeTenderDecision(40, 20) === "NO-GO");
assert("opportunity score 0-100", s1.opportunity.score >= 0 && s1.opportunity.score <= 100);
assert("strategic score 0-100", s1.strategic.score >= 0 && s1.strategic.score <= 100);
assert("MOPS has reasons", s1.opportunity.reasons.length >= 2, { reasons: s1.opportunity.reasons });
assert("MOPS decision valid", ["GO", "HOLD", "NO-GO"].includes(s1.decision), { decision: s1.decision });

const examples = [
  {
    name: "MOPS Wrocław — remont biurowy (pełna analiza)",
    bzp: tenderMops.bzpNumber,
    opportunity: s1.opportunity.score,
    opportunityLabel: s1.opportunity.label,
    strategic: s1.strategic.score,
    decision: s1.decision,
    decisionLabel: s1.decisionLabel,
    reasons: [...s1.opportunity.reasons.slice(0, 3), ...s1.strategic.reasons.slice(0, 2)],
  },
  {
    name: "UM Wrocław — elewacja 2,4 mln (krótki termin, obciążenie)",
    bzp: tenderUm.bzpNumber,
    opportunity: s2.opportunity.score,
    opportunityLabel: s2.opportunity.label,
    strategic: s2.strategic.score,
    decision: s2.decision,
    decisionLabel: s2.decisionLabel,
    reasons: [...s2.opportunity.reasons.slice(0, 3), ...s2.strategic.reasons.slice(0, 2)],
  },
  {
    name: "Poznań — szkoła (poza regionem, brak SWZ)",
    bzp: tenderPoznan.bzpNumber,
    opportunity: s3.opportunity.score,
    opportunityLabel: s3.opportunity.label,
    strategic: s3.strategic.score,
    decision: s3.decision,
    decisionLabel: s3.decisionLabel,
    reasons: [...s3.opportunity.reasons.slice(0, 3), ...s3.strategic.reasons.slice(0, 2)],
  },
];

const failed = results.filter((r) => !r.pass);
console.log(JSON.stringify({
  test: "tender-center-scoring",
  results,
  examples,
  pass: failed.length === 0,
}, null, 2));
process.exit(failed.length === 0 ? 0 : 1);
