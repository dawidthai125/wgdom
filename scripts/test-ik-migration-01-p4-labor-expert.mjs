/**
 * IK-MIGRATION-01 P4 — Labor Expert (Work Identity → CURRENT / Research).
 * Run: npx vite-node scripts/test-ik-migration-01-p4-labor-expert.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultAppSettings } from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
  runIkMasterBoqLaborExpert,
  mapAndResolveWorkIdentityForLine,
  buildIkEntryConversationViewModel,
} from "../src/lib/intelligent-estimator/index.ts";
import { resolveWorkIdentityFromOfferBoqLine as resolveWi } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";
import {
  buildWorkRateFixtureHtml,
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  normalizeWorkCatalogStore,
} from "../src/lib/work-catalog/index.ts";
import { CATALOG_WAVE2_PRODUCT_IDS } from "../src/lib/catalog-coverage/alias-pack-wave2.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

const mem = new Map();
globalThis.localStorage = {
  getItem(k) { return mem.has(k) ? mem.get(k) : null; },
  setItem(k, v) { mem.set(String(k), String(v)); },
  removeItem(k) { mem.delete(k); },
  clear() { mem.clear(); },
};

let liveFetch = 0;
globalThis.fetch = async () => {
  liveFetch += 1;
  return { ok: true, json: async () => ({}), text: async () => "" };
};

const NOW = Date.parse("2026-08-15T01:00:00.000Z");
const T_FRESH = "2026-08-14T12:00:00.000Z";
const LABOR_ID = CATALOG_WAVE2_PRODUCT_IDS.oczyszczenie_podloza;
const LABOR_MISS_ID = CATALOG_WAVE2_PRODUCT_IDS.mocowanie_aparatow;
const MATERIAL_ID = CATALOG_WAVE2_PRODUCT_IDS.zawor_odcinajacy_15;
const COMPOUND_ID = "cc-p0c-w1-zabezpieczenie-folia";

function quoteCell(price, at) {
  return {
    owner: {
      wroclaw: {
        price,
        regionCode: "wroclaw",
        coverage: "indicative",
        updatedAt: at,
        confidence: 0.85,
        origin: "owner",
      },
    },
  };
}

function makeWork(overrides = {}) {
  return {
    id: LABOR_ID,
    tradeId: "MALOWANIE",
    namePl: "Oczyszczenie / zmywanie podłoża",
    unit: "m2",
    companyPricePln: 12,
    marketQuotes: quoteCell(40, T_FRESH),
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 10, updatedAt: T_FRESH, source: "owner" },
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["oczyszczenie", "podloza"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
    ourWorkRate: undefined,
    ...overrides,
  };
}

function makeStore(works) {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [...works], updatedAt: T_FRESH },
    },
    updatedAt: T_FRESH,
  });
}

function minimalLine(opts) {
  return {
    lineId: opts.lineId,
    lp: opts.lp ?? "1",
    description: opts.description,
    quantity: opts.quantity ?? 1,
    quantityRaw: String(opts.quantity ?? 1),
    unit: opts.unit ?? "m2",
    catalogWorkId: null,
    workCategory: opts.workCategory ?? "construction",
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    knrHint: null,
    matchMethod: "snapshot",
    matchedBy: "snapshot",
    matchConfidence: "low",
    candidateMatches: [],
    costIntelligence: null,
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "Brak źródła" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "Brak źródła" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "Brak źródła" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    aiConfidence: "medium",
    warnings: [],
  };
}

function provenance(lineId, branchHint = "construction") {
  return {
    lineId,
    sourceDocumentId: `doc-${branchHint}`,
    sourceDocumentIds: [`doc-${branchHint}`],
    sourceArtifactId: `art-${branchHint}`,
    sourceArtifactIds: [`art-${branchHint}`],
    branchHint,
    sourceLineKey: `lp:${lineId}`,
    contentHash: `h-${lineId}`,
  };
}

function readyExpert(lines) {
  const masterBoqLines = lines.map((L) => ({
    dwellingId: L.dwellingId,
    line: L.line,
    provenance: L.provenance,
  }));
  return {
    tenderId: "t-p4",
    discoverySettled: true,
    attachmentCount: 1,
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: {
      detectedRowCount: lines.length,
      extractedCount: lines.length,
      validCount: lines.length,
      executed: true,
      gaps: [],
    },
    validation: {
      missingDescription: 0,
      missingQuantity: 0,
      missingUnit: 0,
      missingLineage: 0,
      duplicateSuspicion: 0,
      reasons: [],
    },
    dwellingMapping: {
      artifactCount: 1,
      mappedCount: 1,
      unmappedCount: 0,
      allMapped: true,
      ownerMapRequired: false,
      sharedCandidateCount: 0,
      ambiguousCount: 0,
      coverage: [],
      dwellings: [],
      reasons: [],
    },
    lineIntegrity: {
      ok: true,
      sourceLineCount: lines.length,
      composedLineCount: lines.length,
      keepOneCollapsed: 0,
      unexplainedLoss: 0,
      unexplainedDuplication: 0,
      reasons: [],
    },
    dwellings: [],
    masterBoq: {
      mode: "multi",
      schemaVersion: 5,
      lineCount: lines.length,
      composedLineCount: lines.length,
      sourceLineCount: lines.length,
      dwellingCount: 2,
      branchCount: 2,
      sourceCount: 1,
      hasLineProvenance: true,
      status: "ready",
      readyForExperts: true,
    },
    status: "ready",
    reasons: [],
    offerBoq: { schemaVersion: 5, lines: lines.map((L) => L.line) },
    lineProvenance: Object.fromEntries(lines.map((L) => [L.line.lineId, L.provenance])),
    masterBoqLines,
  };
}

clearWorkRateResearchAntiStormState();

const works = [
  makeWork({
    id: LABOR_ID,
    namePl: "Oczyszczenie / zmywanie podłoża",
    unit: "m2",
    ourWorkRate: {
      workId: LABOR_ID,
      unit: "m2",
      ourRatePln: 42,
      sourceType: "ACCEPT",
      regionScope: "WROCLAW",
      observedAt: T_FRESH,
      updatedAt: T_FRESH,
      history: [],
    },
  }),
  makeWork({
    id: LABOR_MISS_ID,
    namePl: "Mocowanie aparatów na gotowym podłożu",
    unit: "szt",
    keywords: ["mocowanie", "aparat"],
    ourWorkRate: undefined,
  }),
  makeWork({
    id: MATERIAL_ID,
    namePl: "Zawór odcinający 15",
    unit: "szt",
    tradeId: "HYDRAULIKA",
    keywords: ["zawor"],
    ourWorkRate: undefined,
  }),
  makeWork({
    id: COMPOUND_ID,
    namePl: "Zabezpieczenie folią",
    unit: "m2",
    keywords: ["zabezpieczenie", "folia"],
    ourWorkRate: undefined,
  }),
];

const store = makeStore(works);

const synthetic = [
  {
    dwellingId: "kotlarska",
    line: minimalLine({
      lineId: "L-hit",
      description: "Oczyszczenie i zmywanie podłoża",
      unit: "m2",
      quantity: 10,
    }),
    provenance: provenance("L-hit", "construction"),
  },
  {
    dwellingId: "nasturcjowa",
    line: minimalLine({
      lineId: "L-miss",
      description: "Montaż aparatów",
      unit: "szt",
      quantity: 4,
      workCategory: "electrical",
    }),
    provenance: provenance("L-miss", "electrical"),
  },
  {
    dwellingId: "ptasia",
    line: minimalLine({
      lineId: "L-mat",
      description: "Zawór / pod mywalką odcinający",
      unit: "szt",
      quantity: 2,
      workCategory: "sanitary",
    }),
    provenance: provenance("L-mat", "sanitary"),
  },
  {
    dwellingId: "zernicka",
    line: minimalLine({
      lineId: "L-unres",
      description: "Pozycja bez wiarygodnej tożsamości katalogowej XYZ-998",
      unit: "kpl",
      quantity: 1,
    }),
    provenance: provenance("L-unres", "construction"),
  },
];

const item = {
  id: "t-p4",
  tenderId: "t-p4",
  title: "P4 unit",
  status: "seen",
  updatedAt: new Date().toISOString(),
};
const expert = readyExpert(synthetic);

// A — exact catalog/alias match
const { mapped: mappedHit, identity: idHit } = mapAndResolveWorkIdentityForLine(
  synthetic[0].line,
  { works, cenyMaterialowUplift: false },
);
assert("A Work Catalog exact/alias match", mappedHit.catalogWorkId === LABOR_ID && mappedHit.matchMethod === "alias", mappedHit.catalogWorkId);
assert("B valid identity OK", idHit.status === "OK" && idHit.workId === LABOR_ID, idHit);

// C — ambiguous identity (competing candidates, not invent)
const ambLine = {
  ...minimalLine({ lineId: "L-amb", description: "x", unit: "m2" }),
  catalogWorkId: LABOR_ID,
  matchMethod: "catalog_map",
  matchConfidence: "medium",
  candidateMatches: [
    { catalogWorkId: LABOR_ID, score: 40, labelPl: "a" },
    { catalogWorkId: LABOR_MISS_ID, score: 39, labelPl: "b" },
  ],
};
const amb = resolveWi(ambLine);
assert("C ambiguous identity", amb.status === "AMBIGUOUS" && !amb.workId, amb);

// Pre-flight unresolved name
const { identity: idUn } = mapAndResolveWorkIdentityForLine(
  synthetic[3].line,
  { works, cenyMaterialowUplift: false },
);
assert("D UNKNOWN remains unresolved identity", idUn.status === "NO_IDENTITY" || !idUn.workId, idUn);

const html = buildWorkRateFixtureHtml({
  name: "Mocowanie aparatów na gotowym podłożu",
  rate: 55,
  unit: "szt",
  region: "WROCLAW",
  laborOnly: true,
  includesMaterial: false,
  priceKind: "regular",
  identity: true,
});
const lookupPort = createFixtureWorkRateSelectiveLookup({
  kb_pl: { html },
  cennikremontow_pl: { html },
  sccot: { html },
  extradom: { html },
});

const report = await runIkMasterBoqLaborExpert({
  item,
  expert,
  store,
  works,
  executeResearch: true,
  lookupPort,
  nowMs: NOW,
  bypassCooldown: true,
});

assert("E CURRENT OUR RATE HIT", report.counts.currentOurRateHit >= 1
  && report.lines.some((l) => l.lineId === "L-hit" && l.rateStatus === "CURRENT_HIT"), report.counts);
assert("F OUR RATE MISS path exists", report.counts.ourRateMiss >= 1
  || report.lines.some((l) => l.lineId === "L-miss" && (
    l.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"
    || l.rateStatus === "RESEARCH_GAP"
    || l.rateStatus === "MISS"
    || l.rateStatus === "RESEARCH_BLOCKED"
  )), report.lines.find((l) => l.lineId === "L-miss"));

const missRow = report.lines.find((l) => l.lineId === "L-miss");
assert("G Labor Research executed for miss", report.counts.researchCalls >= 1, report.researchKeys);
assert("H Evidence / candidate when research succeeds OR gap honest",
  missRow
  && (
    (missRow.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED" && missRow.candidate)
    || missRow.rateStatus === "RESEARCH_GAP"
    || missRow.rateStatus === "RESEARCH_BLOCKED"
    || missRow.rateStatus === "RESEARCH_COOLDOWN"
  ),
  missRow?.rateStatus,
);
assert("I Candidate ready implies Owner Accept required",
  report.counts.evidenceCandidates === 0
  || report.counts.ownerAcceptRequired === report.counts.evidenceCandidates);
assert("J Owner Accept required not auto", report.autoAcceptExecuted === false && report.counts.acceptedOurRate === 0);
assert("K accepted OUR RATE = 0 (no Accept in P4)", report.counts.acceptedOurRate === 0);
assert("L no auto-Accept", report.autoAcceptExecuted === false);

const unres = report.lines.find((l) => l.lineId === "L-unres");
assert("M no research for UNKNOWN", unres && unres.bucket === "UNRESOLVED" && !unres.researchKey, unres);
assert("N line coverage", report.reconciliation.ok
  && report.counts.inputLineCount === 4
  && report.counts.outputLineCount === 4
  && report.counts.labor + report.counts.nonLabor + report.counts.both + report.counts.unresolved + report.counts.nonCost === 4,
  report.counts);
assert("O provenance", report.provenancePreservation
  && report.lines[0].sourceDocumentId === "doc-construction");
assert("P dwelling preservation", report.dwellingPreservation
  && report.lines.map((l) => l.dwellingId).join(",") === "kotlarska,nasturcjowa,ptasia,zernicka");
assert("Q branch preservation", report.branchPreservation);

assert("research boundary ok", report.researchBoundaryOk === true);
assert("no live HTTP (fixture port)", liveFetch === 0, liveFetch);
assert("material research not executed", report.materialResearchExecuted === false);
assert("pricing not executed", report.pricingExecuted === false);

// Material / non-labor when alias binds MATERIAL seed
const matRow = report.lines.find((l) => l.lineId === "L-mat");
assert("non-labor or unresolved for zawór (no force LABOR)",
  matRow && (matRow.bucket === "NON_LABOR" || matRow.bucket === "UNRESOLVED"), matRow);

forceIkEntryEnabledForTests(null);
assert("Gate A OFF", isIkEntryEnabled(defaultAppSettings()) === false);
assert("Gate A ng10", resolveIkDetailFirstScreen(defaultAppSettings()) === "ng10_gate");

forceIkEntryEnabledForTests(true);
const vm = buildIkEntryConversationViewModel(item, {
  labor: report,
  ingest: {
    phase: "completed",
    started: true,
    completed: true,
    tenderId: item.id,
    documentsUsed: 1,
    zipEvidence: [],
    parsersReused: [],
    artifactCount: 1,
    extractedLineCount: 4,
    primarySourceFilename: null,
    reasons: [],
    itemPatch: null,
    mergedItem: item,
    expert,
  },
});
const events = vm.steps.map((s) => s.event).filter(Boolean);
assert("EC WORK_IDENTITY or LABOR facts",
  events.includes("WORK_IDENTITY_RESOLVED")
  || events.includes("LABOR_CURRENT_HIT")
  || events.includes("LABOR_UNRESOLVED"));
assert("EC no fake Accept", !events.includes("LABOR_RATE_ACCEPTED") || report.counts.acceptedOurRate > 0);

const src = readFileSync(join(root, "src/lib/intelligent-estimator/ik-labor-expert.ts"), "utf8");
assert("reuses mapOfferBoqLine", /mapOfferBoqLine/.test(src));
assert("reuses runIkLaborGapResearch", /runIkLaborGapResearch/.test(src));
assert("reuses lookupWorkRate", /lookupWorkRate/.test(src));
assert("no Castorama/material DIY", !/castorama|leroy|diy-selective|price-memory/i.test(src));
assert("no F5/Bid mutate", !/computeTenderBidProposal|useTenderPricingAuto/.test(src));
assert("no auto accept call", !/acceptIkLaborResearchAndNotify|acceptWorkRateResearchCandidate/.test(src));

forceIkEntryEnabledForTests(null);

console.log(`\nP4 unit: ${pass} PASS / ${fail} FAIL`);
console.log("counts", report.counts);
process.exit(fail ? 1 : 0);
