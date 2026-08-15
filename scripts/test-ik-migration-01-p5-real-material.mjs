/**
 * IK-MIGRATION-01 P5-REAL — Material Expert focus + Accept persistence.
 * Run: npx vite-node scripts/test-ik-migration-01-p5-real-material.mjs
 *
 * Live Gate B: scripts/probe-ik-migration-01-p5-real-material.mjs
 * ZZK focus: 2 MATERIAL + zaprawianie LABOR (P5.11) + paint lines
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defaultAppSettings } from "../src/lib/app-settings.ts";
import {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
  runIkMasterBoqMaterialExpert,
  acceptIkMaterialResearchCandidate,
  resetMaterialResearchSessionCooldownForTests,
  summarizeIkMaterialForFocusLines,
  buildIkEntryConversationViewModel,
} from "../src/lib/intelligent-estimator/index.ts";
import { evaluateMaterialCache, normalizePriceDemandStore } from "../src/lib/price-intelligence/index.ts";
import { normalizeWorkCatalogStore as normalizeCatalog } from "../src/lib/work-catalog/index.ts";
import {
  claimResearchJobLease,
  createMemoryAtomicResearchJobStore,
  releaseResearchJobLease,
} from "../supabase/functions/make-server-0afb8820/research-job-lease.ts";
import { CATALOG_WAVE2_PRODUCT_IDS } from "../src/lib/catalog-coverage/alias-pack-wave2.ts";
import { isWave1MaterialsRequiredPending } from "../src/lib/tender-position-cost/wave1-materials-required.ts";

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

const NOW = Date.parse("2026-08-15T16:00:00.000Z");
const T_FRESH = "2026-08-10T12:00:00.000Z";
const WORK_PAINT = "cw.product.farba_lateksowa_wewnetrzna";
const MAT_PAINT = "mat.farba_lateksowa_wewnetrzna";
const LABOR_ID = CATALOG_WAVE2_PRODUCT_IDS.oczyszczenie_podloza;
const ZAWOR = "cc-p0c-w1-zawor-odpowietrzajacy";
const ZAPRAWA = "cc-p0c-w1-zaprawianie-bruzd";

function quoteCell(price, at) {
  return {
    wgdom: {
      wroclaw: {
        price,
        regionCode: "wroclaw",
        coverage: "indicative",
        updatedAt: at,
        confidence: 0.8,
        origin: "wgdom",
      },
    },
  };
}

function makePaintWork(withQuotes) {
  const paint = {
    id: WORK_PAINT,
    tradeId: "MALOWANIE",
    namePl: "Farba lateksowa wewn.",
    unit: "l",
    companyPricePln: 0,
    updatedAt: T_FRESH,
    keywords: ["farba"],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "seed",
    freshnessStatus: "missing",
    marketQuoteHistory: [],
  };
  if (withQuotes) {
    paint.marketQuotes = quoteCell(withQuotes.price, withQuotes.updatedAt);
    paint.freshnessStatus = "ok";
  }
  return paint;
}

function makeLaborWork() {
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
  };
}

function makeWave1Work(id, namePl, unit) {
  return {
    id,
    tradeId: "HYDRAULIKA",
    namePl,
    unit,
    companyPricePln: 0,
    marketQuotes: quoteCell(10, T_FRESH),
    marketQuoteHistory: [],
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

function makeStore(works) {
  return normalizeCatalog({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    catalogs: {
      wroclaw: { region: "wroclaw", works, updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [...works], updatedAt: T_FRESH },
    },
    updatedAt: T_FRESH,
  });
}

function memoryCatalogDeps(initial) {
  let store = structuredClone(initial);
  return {
    get: () => store,
    load: async () => structuredClone(store),
    save: async (next) => {
      store = structuredClone(next);
      return { ok: true, saved: true };
    },
    loadLocal: () => store,
  };
}

function leasePort(atomic, nowMs = NOW) {
  return {
    async claim(input) {
      const r = await claimResearchJobLease(
        atomic,
        {
          researchJobId: input.researchJobId,
          claimantId: input.claimantId,
          leaseMs: input.leaseMs,
        },
        nowMs,
      );
      return { acquired: r.acquired, reason: r.reason ?? null, job: r.job };
    },
    async release(input) {
      const r = await releaseResearchJobLease(atomic, {
        researchJobId: input.researchJobId,
        claimantId: input.claimantId,
        nowMs,
      });
      return { released: r.released };
    },
  };
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
    tenderId: "t-p5r",
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
      dwellingCount: 3,
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

forceIkEntryEnabledForTests(null);
assert("Gate A OFF", isIkEntryEnabled(defaultAppSettings()) === false);
assert("Gate A ng10", resolveIkDetailFirstScreen(defaultAppSettings()) === "ng10_gate");
assert("O Wave1 zaprawianie NOT pending (P5.11 LABOR)", isWave1MaterialsRequiredPending(ZAPRAWA) === false);

const focusLines = [
  {
    dwellingId: "kotlarska",
    line: minimalLine({
      lineId: "L-zawor",
      description: "Zawór odpowietrzający automatyczny",
      unit: "szt",
      quantity: 3,
      workCategory: "sanitary",
    }),
    provenance: provenance("L-zawor", "sanitary"),
  },
  {
    dwellingId: "ptasia",
    line: minimalLine({
      lineId: "L-zap",
      description: "Zaprawianie bruzd w ścianach",
      unit: "mb",
      quantity: 12,
      workCategory: "construction",
    }),
    provenance: provenance("L-zap", "construction"),
  },
  {
    dwellingId: "nasturcjowa",
    line: minimalLine({
      lineId: "L-hit",
      description: "Farba lateksowa biała",
      unit: "l",
      quantity: 2,
    }),
    provenance: provenance("L-hit"),
  },
  {
    dwellingId: "zernicka",
    line: minimalLine({
      lineId: "L-miss",
      description: "Farba lateksowa wewnętrzna",
      unit: "l",
      quantity: 4,
    }),
    provenance: provenance("L-miss"),
  },
  {
    dwellingId: "common_wentylacja",
    line: minimalLine({
      lineId: "L-unk",
      description: "Pozycja bez mapowania P5R-XYZ",
      unit: "kpl",
      quantity: 1,
    }),
    provenance: provenance("L-unk"),
  },
];

const qtySnap = Object.fromEntries(focusLines.map((f) => [f.line.lineId, f.line.quantity]));
const item = { id: "t-p5r", tenderId: "t-p5r", title: "P5-REAL" };
const expert = readyExpert(focusLines);

// Focus Wave1 works + paint WITHOUT quotes → miss research path for paint
resetMaterialResearchSessionCooldownForTests();
const waveWorks = [
  makeWave1Work(ZAWOR, "Odpowietrznik automatyczny CO", "szt"),
  makeWave1Work(ZAPRAWA, "Zaprawianie / zamurowanie bruzd", "mb"),
  makePaintWork(null),
  makeLaborWork(),
];
const missStore = makeStore(waveWorks);
const missWorks = [waveWorks[0], waveWorks[1], waveWorks[2], waveWorks[3]];

const atomic = createMemoryAtomicResearchJobStore();
let providerCalls = 0;
const countingProvider = {
  id: "p5r_count",
  connected: true,
  async research(input) {
    providerCalls += 1;
    return {
      ok: true,
      autoAccepted: false,
      candidate: {
        candidateId: `cand_${providerCalls}`,
        demandId: input.demandId,
        provider: "castorama",
        sourceType: "market_reference",
        name: "Farba lateksowa · Castorama · 10 L · TEST",
        unit: input.unit,
        priceNet: 19.2,
        currency: "PLN",
        priceDate: new Date(NOW).toISOString().slice(0, 10),
        sourceUrl: "https://example.test/castorama/farba",
        retrievedAt: new Date(NOW).toISOString(),
        provenance: "mock_test",
        notes: "P5-REAL harness concrete product",
        materialKey: input.materialKey,
        catalogWorkId: input.catalogWorkId,
        region: input.region,
      },
    };
  },
};

const report = await runIkMasterBoqMaterialExpert({
  item,
  expert,
  store: missStore,
  works: missWorks,
  executeResearch: true,
  lease: leasePort(atomic),
  provider: countingProvider,
  nowMs: NOW,
});

const focusIds = ["L-zawor", "L-zap", "L-hit", "L-miss"];
const slice = summarizeIkMaterialForFocusLines(report, focusIds);

assert("A focus input 4", slice.focusInput === 4 && slice.coverageOk);
assert(
  "O zawór MATERIAL without mat.* → NO_MATERIAL_COMPONENT",
  slice.noMaterialComponent >= 1
  && report.lines.some((l) => l.lineId === "L-zawor" && !l.materialIdentity && l.plane === "MATERIAL"),
);
assert(
  "O2 zaprawianie LABOR skipped by Material Expert (P5.11)",
  report.lines.some((l) => l.lineId === "L-zap" && l.plane === "LABOR" && !l.materialIdentity)
  && (slice.byCoverage.LABOR_SKIPPED ?? 0) >= 1,
);
assert(
  "P no invent materialKey on zawor work id",
  report.lines.find((l) => l.lineId === "L-zawor")?.materialIdentity == null,
);
assert("B trusted paint identity on miss/hit lines",
  report.lines.filter((l) => (l.lineId === "L-hit" || l.lineId === "L-miss") && l.materialIdentity).length >= 1
  || report.lines.some((l) => l.materialIdentity?.materialKey?.includes("farba")));

const paintRows = report.lines.filter((l) => l.lineId === "L-hit" || l.lineId === "L-miss");
assert("D Price Memory MISS path for paint without quotes",
  paintRows.some((l) => l.priceStatus !== "NONE" && l.priceStatus !== "PRICE_MEMORY_HIT")
  || paintRows.some((l) => l.materialIdentity && l.priceStatus === "PRICE_MEMORY_MISS")
  || paintRows.some((l) => l.candidate || l.priceStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED" || l.priceStatus === "RESEARCH_GAP"),
  paintRows.map((l) => ({ id: l.lineId, st: l.priceStatus, mid: l.materialIdentity?.materialKey })));

assert("E research only justified keys", report.researchBoundaryOk);
assert("M no research UNKNOWN", !report.lines.some((l) => l.lineId === "L-unk" && l.researchKey && report.researchKeys.includes(l.researchKey)));
assert("N no auto-Accept", report.autoAcceptExecuted === false && report.counts.accepted === 0);
assert("Q provenance", report.provenancePreservation);
assert("R dwelling", report.dwellingPreservation
  && report.lines.find((l) => l.lineId === "L-zawor")?.dwellingId === "kotlarska");
assert("S branch", report.branchPreservation);
assert("T quantity unchanged", report.lines.every((l) => qtySnap[l.lineId] === undefined || l.quantity === qtySnap[l.lineId]));
assert("no live HTTP", liveFetch === 0);
assert("orphan 0 on slice", slice.orphanPrices === 0);

// HIT store — Price Memory CURRENT
const hitStore = makeStore([
  makeWave1Work(ZAWOR, "Odpowietrznik automatyczny CO", "szt"),
  makeWave1Work(ZAPRAWA, "Zaprawianie / zamurowanie bruzd", "mb"),
  makePaintWork({ price: 22, updatedAt: T_FRESH }),
  makeLaborWork(),
]);
const hitWorks = hitStore.catalogs.wroclaw.works;
const reportHit = await runIkMasterBoqMaterialExpert({
  item,
  expert,
  store: hitStore,
  works: hitWorks,
  executeResearch: true,
  lease: leasePort(createMemoryAtomicResearchJobStore()),
  provider: countingProvider,
  nowMs: NOW,
});
assert(
  "C Price Memory HIT present",
  reportHit.counts.priceMemoryHit >= 1
  || reportHit.lines.some((l) => (l.lineId === "L-hit" || l.lineId === "L-miss") && l.priceStatus === "PRICE_MEMORY_HIT"),
);

// Accept + second lookup (dedicated paint-only expert run — like P5 unit)
resetMaterialResearchSessionCooldownForTests();
providerCalls = 0;
const acceptStore = makeStore([makePaintWork(null), makeLaborWork()]);
const deps = memoryCatalogDeps(acceptStore);
const atomic2 = createMemoryAtomicResearchJobStore();
const paintOnly = [
  {
    dwellingId: "zernicka",
    line: minimalLine({
      lineId: "L-miss",
      description: "Farba lateksowa wewnętrzna",
      unit: "l",
      quantity: 4,
    }),
    provenance: provenance("L-miss"),
  },
];
const reportAccept = await runIkMasterBoqMaterialExpert({
  item,
  expert: readyExpert(paintOnly),
  store: acceptStore,
  works: acceptStore.catalogs.wroclaw.works,
  executeResearch: true,
  lease: leasePort(atomic2),
  provider: countingProvider,
  nowMs: NOW,
});
const cand = reportAccept.lines.find((l) => l.candidate)?.candidate;
assert("I candidate before Accept", Boolean(cand) && reportAccept.counts.accepted === 0, cand);
assert("F concrete product", Boolean(cand?.name?.includes("Farba")));
assert("G source", cand?.provider === "castorama" && Boolean(cand?.sourceUrl));
assert("H evidence / price", cand?.provenance === "mock_test" && Number(cand?.priceNet) > 0);

const demandStore = normalizePriceDemandStore({
  schemaVersion: 1,
  updatedAt: new Date(NOW).toISOString(),
  demands: [],
});
const acc = await acceptIkMaterialResearchCandidate({
  candidate: cand,
  expectedUnit: "l",
  demandStore,
  commitDeps: deps,
  updatedAtIso: new Date(NOW).toISOString(),
});
assert("J Owner Accept persisted", acc.ok && acc.persisted && acc.accepted, acc);

const afterMem = evaluateMaterialCache({
  materialKey: MAT_PAINT,
  catalogWorkId: WORK_PAINT,
  region: "wroclaw",
  worksById: new Map(deps.get().catalogs.wroclaw.works.map((w) => [w.id, w])),
  nowMs: NOW,
});
assert("K Price Memory CURRENT after Accept", afterMem.usability === "CURRENT", afterMem);

resetMaterialResearchSessionCooldownForTests();
const callsBeforeSecond = providerCalls;
const reportSecond = await runIkMasterBoqMaterialExpert({
  item,
  expert: readyExpert(paintOnly),
  store: deps.get(),
  works: deps.get().catalogs.wroclaw.works,
  executeResearch: true,
  lease: leasePort(createMemoryAtomicResearchJobStore()),
  provider: countingProvider,
  nowMs: NOW,
});
const secondLookupPass =
  reportSecond.counts.priceMemoryHit >= 1
  && reportSecond.lines[0]?.priceStatus === "PRICE_MEMORY_HIT"
  && reportSecond.counts.researchCalls === 0
  && providerCalls === callsBeforeSecond;
assert("L second lookup HIT + research 0", secondLookupPass, {
  counts: reportSecond.counts,
  providerCalls,
  callsBeforeSecond,
});

forceIkEntryEnabledForTests(true);
const vm = buildIkEntryConversationViewModel(item, {
  material: report,
  ingest: {
    phase: "completed",
    started: true,
    completed: true,
    tenderId: item.id,
    documentsUsed: 1,
    zipEvidence: [],
    parsersReused: [],
    artifactCount: 1,
    extractedLineCount: focusLines.length,
    primarySourceFilename: null,
    reasons: [],
    itemPatch: null,
    mergedItem: item,
    expert,
  },
});
const events = vm.steps.map((s) => s.event).filter(Boolean);
assert("EC material facts when ops happened",
  events.some((e) => String(e).startsWith("MATERIAL_")) || report.counts.materialIdentityResolved === 0);
assert("EC no false ACCEPTED", !events.includes("MATERIAL_PRICE_ACCEPTED") || report.counts.accepted > 0);

forceIkEntryEnabledForTests(null);
assert(
  "REUSE runIkMasterBoqMaterialExpert",
  /runIkMasterBoqMaterialExpert|executeMaterialResearchPhase2|evaluateMaterialCache/.test(
    readFileSync(join(root, "src/lib/intelligent-estimator/ik-material-expert.ts"), "utf8"),
  ),
);
assert(
  "no MaterialExpertV2",
  !readFileSync(join(root, "src/lib/intelligent-estimator/ik-material-expert.ts"), "utf8").includes("MaterialExpertV2"),
);
assert(
  "ATH writer GAP",
  /ATH writer|GAP|NOT IMPLEMENTED/.test(
    readFileSync(join(root, "docs/architecture/IK-MIGRATION-01-P5-REAL-MATERIAL.md"), "utf8"),
  ),
);
assert("no P4 labor rewrite in material expert",
  !/runIkLaborGapResearch|lookupWorkRate/.test(
    readFileSync(join(root, "src/lib/intelligent-estimator/ik-material-expert.ts"), "utf8"),
  ));

console.log(`\nP5-REAL RESULT: ${pass} PASS / ${fail} FAIL · secondLookup=${secondLookupPass ? "PASS" : "FAIL"}`);
if (fail > 0) process.exit(1);
