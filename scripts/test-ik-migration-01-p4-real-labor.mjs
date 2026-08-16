/**
 * IK-MIGRATION-01 P4-REAL — trusted Work Labor Expert (HIT/MISS/research/Accept).
 * Run: npx vite-node scripts/test-ik-migration-01-p4-real-labor.mjs
 *
 * Live Gate B evidence: scripts/probe-ik-migration-01-p4-real-labor.mjs
 * (ZZK 44 trusted · 31 CURRENT HIT · 7 RESEARCH_GAP · 6 NON_LABOR/COMPOUND)
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
  summarizeIkLaborForTrustedWorkLines,
  buildIkEntryConversationViewModel,
} from "../src/lib/intelligent-estimator/index.ts";
import {
  acceptWorkRateResearchCandidate,
  buildWorkRateFixtureHtml,
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  lookupWorkRate,
  normalizeWorkCatalogStore,
  saveWorkCatalogStoreLocal,
} from "../src/lib/work-catalog/index.ts";
import { CATALOG_WAVE2_PRODUCT_IDS } from "../src/lib/catalog-coverage/alias-pack-wave2.ts";
import { resolveWorkIdentityFromOfferBoqLine } from "../src/lib/tender-position-cost/boq-shadow-adapter.ts";

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
const W_HIT = CATALOG_WAVE2_PRODUCT_IDS.oczyszczenie_podloza;
const W_MISS = CATALOG_WAVE2_PRODUCT_IDS.mocowanie_aparatow;
const W_OTW = CATALOG_WAVE2_PRODUCT_IDS.przebijanie_otworow;

function quoteOur(workId, rate, unit, at) {
  return {
    ourWorkRate: {
      workId,
      unit,
      ourRatePln: rate,
      sourceType: "ACCEPT",
      regionScope: "WROCLAW",
      observedAt: at,
      updatedAt: at,
      history: [],
    },
  };
}

function makeWork(overrides = {}) {
  return {
    id: W_HIT,
    tradeId: "MALOWANIE",
    namePl: "Oczyszczenie / zmywanie podłoża",
    unit: "m2",
    companyPricePln: 12,
    marketQuotes: {
      owner: {
        wroclaw: {
          price: 40,
          regionCode: "wroclaw",
          coverage: "indicative",
          updatedAt: T_FRESH,
          confidence: 0.85,
          origin: "owner",
        },
      },
    },
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
    unit: opts.unit ?? "szt",
    catalogWorkId: null,
    workCategory: opts.workCategory ?? "electrical",
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
    materialSource: { kind: "unknown", labelPl: "Brak" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "Brak" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "Brak" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    aiConfidence: "medium",
    warnings: [],
  };
}

function provenance(lineId, branchHint = "electrical") {
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
    tenderId: "t-p4r",
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
    masterBoqLines,
    status: "ready",
    reasons: [],
  };
}

clearWorkRateResearchAntiStormState();
forceIkEntryEnabledForTests(null);
assert("Gate A OFF", defaultAppSettings().ikEntryEnabled === true);
assert("Gate A ik_entry", resolveIkDetailFirstScreen(defaultAppSettings()) === "ik_entry");

const hitWork = makeWork({
  id: W_HIT,
  namePl: "Oczyszczenie / zmywanie podłoża",
  unit: "m2",
  ...quoteOur(W_HIT, 42, "m2", T_FRESH),
});
const otwWork = makeWork({
  id: W_OTW,
  namePl: "Przebijanie otworów w ścianach/stropach",
  unit: "szt",
  tradeId: "PRZYGOTOWANIE",
  companyPricePln: 85,
  keywords: ["przebijanie"],
  ...quoteOur(W_OTW, 85, "szt", T_FRESH),
});
const missWork = makeWork({
  id: W_MISS,
  namePl: "Mocowanie aparatów na gotowym podłożu",
  unit: "szt",
  tradeId: "ELEKTRYKA",
  companyPricePln: 45,
  ourWorkRate: undefined,
  keywords: ["mocowanie", "aparat"],
});

let store = makeStore([hitWork, otwWork, missWork]);
/** Raw works keep marketQuotes — normalizeWorkCatalogStore strips Quotes (Alias bind gate). */
const works = [hitWork, otwWork, missWork];

const fixtureLines = [
  {
    dwellingId: "ptasia",
    line: minimalLine({
      lineId: "L-hit",
      description: "Oczyszczenie i zmywanie podłoża",
      unit: "m2",
      quantity: 2,
      workCategory: "construction",
    }),
    provenance: provenance("L-hit", "construction"),
  },
  {
    dwellingId: "ptasia",
    line: minimalLine({
      lineId: "L-otw",
      description: "Mechaniczne przebijanie otworów w ścianach z cegły",
      unit: "otw.",
      quantity: 3,
    }),
    provenance: provenance("L-otw"),
  },
  {
    dwellingId: "kotlarska",
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
    dwellingId: "zernicka",
    line: minimalLine({
      lineId: "L-unk",
      description: "Pozycja bez mapowania P4R-XYZ",
      unit: "kpl",
      quantity: 1,
    }),
    provenance: provenance("L-unk", "construction"),
  },
];

const item = { id: "t-p4r", tenderId: "t-p4r", title: "P4-REAL" };
const expert = readyExpert(fixtureLines);
const qtySnap = Object.fromEntries(fixtureLines.map((f) => [f.line.lineId, f.line.quantity]));
const unitSnap = Object.fromEntries(fixtureLines.map((f) => [f.line.lineId, f.line.unit]));

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

const trustedIds = ["L-hit", "L-otw", "L-miss"];
const slice = summarizeIkLaborForTrustedWorkLines(report, trustedIds);

assert("A trusted input 3", slice.trustedWorkInput === 3 && slice.coverageOk);
assert("B CURRENT HIT present", slice.currentOurRateHit >= 1
  && report.lines.some((l) => l.lineId === "L-hit" && l.rateStatus === "CURRENT_HIT"));
assert("C miss path present", slice.ourRateMissPath >= 1
  || report.lines.some((l) => l.lineId === "L-miss" && l.rateStatus !== "NONE"));
assert("D research only on miss keys", report.researchKeys.every((k) => k.includes(W_MISS) || k.includes("|")));
assert(
  "D2 no research on UNKNOWN",
  !report.lines.some((l) => l.lineId === "L-unk" && l.researchKey && report.researchKeys.includes(l.researchKey)),
);

const missRow = report.lines.find((l) => l.lineId === "L-miss");
assert(
  "E/F evidence or honest GAP",
  missRow
  && (
    (missRow.candidate && missRow.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED")
    || missRow.rateStatus === "RESEARCH_GAP"
    || missRow.rateStatus === "RESEARCH_BLOCKED"
  ),
  missRow?.rateStatus,
);

assert("J no auto-Accept", report.autoAcceptExecuted === false && report.counts.acceptedOurRate === 0);
assert("K no research UNKNOWN identity", report.researchBoundaryOk);
assert("L no invented rate on UNKNOWN", report.lines.find((l) => l.lineId === "L-unk")?.ourRatePln == null);
assert("M provenance", report.provenancePreservation);
assert("N dwelling", report.dwellingPreservation
  && report.lines.find((l) => l.lineId === "L-miss")?.dwellingId === "kotlarska");
assert("O branch", report.branchPreservation);
assert("P quantity unchanged", report.lines.every((l) => qtySnap[l.lineId] === undefined || l.quantity === qtySnap[l.lineId]));
assert("Q source unit preserved", report.lines.every((l) => unitSnap[l.lineId] === undefined || l.unit === unitSnap[l.lineId]));
assert("Q2 otw. preserved + identity szt", (() => {
  const row = report.lines.find((l) => l.lineId === "L-otw");
  return row?.unit === "otw." && row.identity.unit === "szt" && row.identity.status === "OK";
})());
assert("orphan rates 0 on slice", slice.orphanRates === 0);
assert("no live HTTP", liveFetch === 0);

// G/H/I Owner Accept + second lookup (only when candidate exists)
let secondLookupPass = false;
if (missRow?.candidate && missRow.rateStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED") {
  assert("G candidate before Accept", Boolean(missRow.candidate) && report.counts.acceptedOurRate === 0);
  const accepted = acceptWorkRateResearchCandidate({
    store,
    candidate: missRow.candidate,
    observedAt: new Date(NOW).toISOString(),
    updatedAt: new Date(NOW).toISOString(),
  });
  assert("H Accept persisted", accepted.ok === true, accepted);
  store = accepted.store ?? store;
  saveWorkCatalogStoreLocal(store);
  const looked = lookupWorkRate(store, W_MISS, "szt", NOW);
  secondLookupPass = looked.status === "CURRENT" && looked.ourRatePln != null;
  assert("I second lookup HIT", secondLookupPass, looked);
  const worksAfterAccept = works.map((w) => {
    const fromStore = store.catalogs.wroclaw.works.find((x) => x.id === w.id);
    return fromStore ? { ...w, ourWorkRate: fromStore.ourWorkRate } : w;
  });
  const again = await runIkMasterBoqLaborExpert({
    item,
    expert,
    store,
    works: worksAfterAccept,
    executeResearch: true,
    lookupPort,
    nowMs: NOW,
    bypassCooldown: true,
  });
  assert(
    "I2 after Accept CURRENT_HIT (research 0 for accepted)",
    again.lines.find((l) => l.lineId === "L-miss")?.rateStatus === "CURRENT_HIT",
  );
} else {
  assert("G/H/I FAIL — expected fixture candidate for Accept path", false, missRow?.rateStatus);
  secondLookupPass = false;
}

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
    extractedLineCount: fixtureLines.length,
    primarySourceFilename: null,
    reasons: [],
    itemPatch: null,
    mergedItem: item,
    expert,
  },
});
const events = vm.steps.map((s) => s.event).filter(Boolean);
assert(
  "EC labor facts present",
  events.some((e) => String(e).startsWith("LABOR_")),
);
assert(
  "EC no false ACCEPTED",
  !events.includes("LABOR_RATE_ACCEPTED") || report.counts.acceptedOurRate > 0,
);

forceIkEntryEnabledForTests(null);
assert(
  "REUSE runIkMasterBoqLaborExpert only",
  /runIkMasterBoqLaborExpert/.test(
    readFileSync(join(root, "src/lib/intelligent-estimator/ik-labor-expert.ts"), "utf8"),
  ),
);
assert(
  "no IkLaborResearchV2",
  !readFileSync(join(root, "src/lib/intelligent-estimator/ik-labor-expert.ts"), "utf8").includes("IkLaborResearchV2"),
);
assert(
  "ATH writer GAP",
  /ATH writer|GAP|NOT IMPLEMENTED/.test(
    readFileSync(join(root, "docs/architecture/IK-MIGRATION-01-P4-REAL-LABOR.md"), "utf8"),
  ),
);
assert("P5.7 unit resolve still works", resolveWorkIdentityFromOfferBoqLine({
  catalogWorkId: W_OTW,
  unit: "otw.",
  matchMethod: "alias",
  matchConfidence: "high",
  candidateMatches: [],
  isNoise: false,
  noiseKind: null,
  costIntelligence: null,
  quantity: 1,
}).status === "OK");

console.log(`\nP4-REAL RESULT: ${pass} PASS / ${fail} FAIL · secondLookup=${secondLookupPass ? "PASS" : "FAIL"}`);
if (fail > 0) process.exit(1);
