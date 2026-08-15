/**
 * IK-MIGRATION-01 P5 — Material Expert (identity → Price Memory → Research → Accept).
 * Run: npx vite-node scripts/test-ik-migration-01-p5-material-expert.mjs
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
  buildIkEntryConversationViewModel,
} from "../src/lib/intelligent-estimator/index.ts";
import {
  evaluateMaterialCache,
  normalizePriceDemandStore,
} from "../src/lib/price-intelligence/index.ts";
import { normalizeWorkCatalogStore as normalizeCatalog } from "../src/lib/work-catalog/index.ts";
import {
  claimResearchJobLease,
  createMemoryAtomicResearchJobStore,
  releaseResearchJobLease,
} from "../supabase/functions/make-server-0afb8820/research-job-lease.ts";
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

const NOW = Date.parse("2026-08-15T14:00:00.000Z");
const T_FRESH = "2026-08-10T12:00:00.000Z";
const WORK_PAINT = "cw.product.farba_lateksowa_wewnetrzna";
const MAT_PAINT = "mat.farba_lateksowa_wewnetrzna";
const LABOR_ID = CATALOG_WAVE2_PRODUCT_IDS.oczyszczenie_podloza;

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
    unit: opts.unit ?? "l",
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
    tenderId: "t-p5",
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

const item = { id: "t-p5", tenderId: "t-p5", title: "P5 harness" };

// ─── Gate A ──────────────────────────────────────────────────────────────────
forceIkEntryEnabledForTests(null);
assert("Gate A ikEntryEnabled OFF", isIkEntryEnabled(defaultAppSettings()) === false);
assert("Gate A firstScreen ng10", resolveIkDetailFirstScreen(defaultAppSettings()) === "ng10_gate");

const detailSrc = readFileSync(join(root, "src/app/TenderDetailPage.tsx"), "utf8");
assert("Gate A TenderDetailPage retains NG-10", /resolveIkDetailFirstScreen|ng10_gate|TenderAutonomous/.test(detailSrc));

// ─── Harness lines ───────────────────────────────────────────────────────────
const fixtureLines = [
  {
    dwellingId: "kotlarska",
    line: minimalLine({
      lineId: "L-hit",
      description: "Farba lateksowa biała",
      unit: "l",
    }),
    provenance: provenance("L-hit", "construction"),
  },
  {
    dwellingId: "nasturcjowa",
    line: minimalLine({
      lineId: "L-miss",
      description: "Farba lateksowa wewnętrzna",
      unit: "l",
    }),
    provenance: provenance("L-miss", "construction"),
  },
  {
    dwellingId: "ptasia",
    line: minimalLine({
      lineId: "L-unres",
      description: "Wykucie bruzd w ścianie betonowej",
      unit: "mb",
    }),
    provenance: provenance("L-unres", "electrical"),
  },
  {
    dwellingId: "zernicka",
    line: minimalLine({
      lineId: "L-labor",
      description: "Oczyszczenie / zmywanie podłoża",
      unit: "m2",
      workCategory: "construction",
    }),
    provenance: provenance("L-labor", "construction"),
  },
];

const expert = readyExpert(fixtureLines);

// Store: paint WITH quotes (HIT for L-hit) + labor work for mapper
// For MISS we use a second run with empty quotes — first run uses HIT catalog for L-hit
// and miss catalog for L-miss: use store WITHOUT quotes so L-hit and L-miss both MISS,
// then separate HIT-only store test.

resetMaterialResearchSessionCooldownForTests();
const missStore = makeStore([makePaintWork(null), makeLaborWork()]);
const missWorks = missStore.catalogs.wroclaw.works;
const atomic = createMemoryAtomicResearchJobStore();

let providerCalls = 0;
const countingProvider = {
  id: "p5_count",
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
        name: `Farba lateksowa · Castorama · 10 L · TEST`,
        unit: input.unit,
        priceNet: 18.5,
        currency: "PLN",
        priceDate: new Date(NOW).toISOString().slice(0, 10),
        sourceUrl: "https://example.test/castorama/farba",
        retrievedAt: new Date(NOW).toISOString(),
        provenance: "mock_test",
        notes: "TEST harness concrete product",
        materialKey: input.materialKey,
        catalogWorkId: input.catalogWorkId,
        region: input.region,
      },
    };
  },
};

const reportMiss = await runIkMasterBoqMaterialExpert({
  item,
  expert,
  store: missStore,
  works: missWorks,
  executeResearch: true,
  lease: leasePort(atomic),
  provider: countingProvider,
  nowMs: NOW,
});

assert("A trusted material identity", reportMiss.counts.materialIdentityResolved >= 2, reportMiss.counts);
assert("B Price Memory MISS path", reportMiss.counts.priceMemoryMiss >= 1, reportMiss.counts);
assert("C Research executed", reportMiss.counts.researchCalls >= 1, reportMiss.researchKeys);
assert("D Research deduped (2 paint lines → 1 call)", reportMiss.counts.researchCalls === 1, reportMiss.researchKeys);
assert("E concrete product", reportMiss.counts.concreteProducts >= 1
  && reportMiss.lines.some((l) => l.candidate?.name?.includes("Farba")), reportMiss.counts);
assert("F source returned", reportMiss.lines.some((l) => l.candidate?.provider === "castorama"
  && l.candidate?.sourceUrl), reportMiss.lines.find((l) => l.candidate));
assert("G price returned", reportMiss.lines.some((l) => l.candidate?.priceNet === 18.5));
assert("H evidence", reportMiss.counts.evidence >= 1
  && reportMiss.lines.some((l) => l.candidate?.provenance === "mock_test"));
assert("I candidate created", reportMiss.counts.candidates >= 1);
assert("J Owner Accept required", reportMiss.counts.ownerAcceptRequired === reportMiss.counts.candidates
  && reportMiss.counts.accepted === 0);
assert("N no auto-Accept", reportMiss.autoAcceptExecuted === false && reportMiss.counts.accepted === 0);

const unres = reportMiss.lines.find((l) => l.lineId === "L-unres");
assert("M no research for UNKNOWN", unres && !unres.materialIdentity && !unres.researchKey
  && unres.bucket === "UNRESOLVED", unres);

assert("O line coverage", reportMiss.reconciliation.ok
  && reportMiss.counts.inputLineCount === 4
  && reportMiss.counts.outputLineCount === 4
  && reportMiss.counts.material + reportMiss.counts.labor + reportMiss.counts.both
    + reportMiss.counts.unresolved + reportMiss.counts.nonCost === 4,
  reportMiss.counts);
assert("P provenance", reportMiss.provenancePreservation
  && reportMiss.lines[0].sourceDocumentId === "doc-construction");
assert("Q dwelling preservation", reportMiss.dwellingPreservation
  && reportMiss.lines.map((l) => l.dwellingId).join(",") === "kotlarska,nasturcjowa,ptasia,zernicka");
assert("R branch preservation", reportMiss.branchPreservation);
assert("research boundary ok", reportMiss.researchBoundaryOk === true);
assert("no live HTTP", liveFetch === 0, liveFetch);
assert("labor research not executed by P5", reportMiss.laborResearchExecuted === false);
assert("pricing not executed", reportMiss.pricingExecuted === false);

// HIT path — catalog with CURRENT quotes
resetMaterialResearchSessionCooldownForTests();
providerCalls = 0;
const hitStore = makeStore([makePaintWork({ price: 11.1, updatedAt: T_FRESH }), makeLaborWork()]);
const reportHit = await runIkMasterBoqMaterialExpert({
  item,
  expert: readyExpert([fixtureLines[0], fixtureLines[2]]),
  store: hitStore,
  works: hitStore.catalogs.wroclaw.works,
  executeResearch: true,
  lease: leasePort(createMemoryAtomicResearchJobStore()),
  provider: countingProvider,
  nowMs: NOW,
});
assert("B2 Price Memory HIT", reportHit.counts.priceMemoryHit >= 1
  && reportHit.lines.some((l) => l.lineId === "L-hit" && l.priceStatus === "PRICE_MEMORY_HIT"),
  reportHit.counts);
assert("B3 HIT → researchCalls 0", reportHit.counts.researchCalls === 0 && providerCalls === 0, {
  researchCalls: reportHit.counts.researchCalls,
  providerCalls,
});

// Accept → persist → second lookup HIT
resetMaterialResearchSessionCooldownForTests();
providerCalls = 0;
const acceptStore = makeStore([makePaintWork(null), makeLaborWork()]);
const deps = memoryCatalogDeps(acceptStore);
const atomic2 = createMemoryAtomicResearchJobStore();
const reportAccept = await runIkMasterBoqMaterialExpert({
  item,
  expert: readyExpert([fixtureLines[1]]),
  store: acceptStore,
  works: acceptStore.catalogs.wroclaw.works,
  executeResearch: true,
  lease: leasePort(atomic2),
  provider: countingProvider,
  nowMs: NOW,
});
const cand = reportAccept.lines.find((l) => l.candidate)?.candidate;
assert("K candidate before Accept", Boolean(cand) && reportAccept.counts.accepted === 0, cand);

const beforeQuotes = JSON.stringify(deps.get().catalogs.wroclaw.works.find((w) => w.id === WORK_PAINT)?.marketQuotes ?? null);
assert("K2 no auto persist before Accept", beforeQuotes === "null" || beforeQuotes === undefined || beforeQuotes === "null");

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
assert("K3 Accept persisted", acc.ok && acc.persisted && acc.accepted, acc);
assert("K4 no Purchase write", acc.wrotePurchase === false);

const afterMem = evaluateMaterialCache({
  materialKey: MAT_PAINT,
  catalogWorkId: WORK_PAINT,
  region: "wroclaw",
  worksById: new Map(deps.get().catalogs.wroclaw.works.map((w) => [w.id, w])),
  nowMs: NOW,
});
assert("K5 Price Memory CURRENT after Accept", afterMem.usability === "CURRENT", afterMem);

// L — second lookup → HIT · researchCalls = 0
resetMaterialResearchSessionCooldownForTests();
const callsBeforeSecond = providerCalls;
const reportSecond = await runIkMasterBoqMaterialExpert({
  item,
  expert: readyExpert([fixtureLines[1]]),
  store: deps.get(),
  works: deps.get().catalogs.wroclaw.works,
  executeResearch: true,
  lease: leasePort(createMemoryAtomicResearchJobStore()),
  provider: countingProvider,
  nowMs: NOW,
});
assert("L second lookup HIT", reportSecond.counts.priceMemoryHit >= 1
  && reportSecond.lines[0].priceStatus === "PRICE_MEMORY_HIT", reportSecond.counts);
assert("L second lookup researchCalls 0", reportSecond.counts.researchCalls === 0
  && providerCalls === callsBeforeSecond, { providerCalls, callsBeforeSecond });

// EC facts
forceIkEntryEnabledForTests(true);
const vm = buildIkEntryConversationViewModel(item, {
  material: reportMiss,
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
assert("EC MATERIAL_IDENTITY_RESOLVED", events.includes("MATERIAL_IDENTITY_RESOLVED"));
assert("EC MATERIAL_PRICE_MEMORY_MISS", events.includes("MATERIAL_PRICE_MEMORY_MISS"));
assert("EC MATERIAL_RESEARCH_STARTED", events.includes("MATERIAL_RESEARCH_STARTED"));
assert("EC MATERIAL_CANDIDATE_READY", events.includes("MATERIAL_CANDIDATE_READY"));
assert("EC MATERIAL_OWNER_ACCEPT_REQUIRED", events.includes("MATERIAL_OWNER_ACCEPT_REQUIRED"));
assert("EC no false ACCEPTED", !events.includes("MATERIAL_PRICE_ACCEPTED"));
assert("EC sourceRef present", vm.steps.filter((s) => s.id === "material").every((s) => s.sourceRef?.tenderId));

forceIkEntryEnabledForTests(null);

assert(
  "ATH writer remains GAP / NOT IMPLEMENTED",
  /ATH writer|NOT IMPLEMENTED|GAP/.test(
    readFileSync(join(root, "docs/architecture/IK-MIGRATION-01-P4-LABOR-EXPERT.md"), "utf8"),
  ),
);

console.log(`\nP5 RESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
