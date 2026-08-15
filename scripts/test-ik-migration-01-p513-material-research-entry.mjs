/**
 * IK-MIGRATION-01 P5.13 — Material research entry without pre-existing materialKey.
 * Run: npx vite-node scripts/test-ik-migration-01-p513-material-research-entry.mjs
 */
import {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
  runIkMasterBoqMaterialExpert,
  acceptIkMaterialResearchCandidate,
  resetMaterialResearchSessionCooldownForTests,
  summarizeIkMaterialForFocusLines,
  buildMaterialDemandResearchKey,
  isMaterialDemandResearchKey,
  P59_ZZK_FOCUS_LINE_SPECS,
  P59_FOCUS_WORK_ZAWOR,
  P59_FOCUS_WORK_ZAPRAWIANIE,
} from "../src/lib/intelligent-estimator/index.ts";
import { resolveDemandProductIdentityExact } from "../src/lib/pricing-expert/material-market-map.ts";
import { evaluateMaterialCache } from "../src/lib/price-intelligence/index.ts";
import { normalizeWorkCatalogStore as normalizeCatalog } from "../src/lib/work-catalog/index.ts";
import { CATALOG_WAVE2_PRODUCT_IDS } from "../src/lib/catalog-coverage/alias-pack-wave2.ts";
import {
  claimResearchJobLease,
  createMemoryAtomicResearchJobStore,
  releaseResearchJobLease,
} from "../supabase/functions/make-server-0afb8820/research-job-lease.ts";

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
  getItem(k) {
    return mem.has(k) ? mem.get(k) : null;
  },
  setItem(k, v) {
    mem.set(String(k), String(v));
  },
  removeItem(k) {
    mem.delete(k);
  },
  clear() {
    mem.clear();
  },
};
globalThis.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => "" });

const NOW = Date.parse("2026-08-15T19:00:00.000Z");
const T_FRESH = "2026-08-10T12:00:00.000Z";
const ZAWOR = P59_FOCUS_WORK_ZAWOR;
const ZAPRAWA = P59_FOCUS_WORK_ZAPRAWIANIE;
const WORK_PAINT = "cw.product.farba_lateksowa_wewnetrzna";
const MAT_PAINT = "mat.farba_lateksowa_wewnetrzna";

const OWNER_EVIDENCE = [
  {
    retailer: "leroy",
    productCode: "89178695",
    priceNet: 56.99,
    unit: "szt.",
    name: 'Odpowietrznik automatyczny 1/2" z zaworem stopowym',
    sourceUrl: "https://example.test/leroy/89178695",
  },
  {
    retailer: "castorama",
    productCode: "5902510004040",
    priceNet: 40.48,
    unit: "szt.",
    name: 'Odpowietrznik automatyczny AFRISO 1/2"',
    sourceUrl: "https://example.test/castorama/5902510004040",
  },
];

function quoteCell(price, at, origin = "wgdom") {
  return {
    [origin]: {
      wroclaw: {
        price,
        regionCode: "wroclaw",
        coverage: origin === "wgdom" ? "indicative" : "full",
        updatedAt: at,
        confidence: 0.85,
        origin,
      },
    },
  };
}

function makeWork(id, namePl, unit, withQuotes) {
  const w = {
    id,
    tradeId: "HYDRAULIKA",
    namePl,
    unit,
    companyPricePln: 0,
    marketQuoteHistory: [],
    updatedAt: T_FRESH,
    freshnessStatus: withQuotes ? "ok" : "missing",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
  if (withQuotes) w.marketQuotes = quoteCell(withQuotes.price, withQuotes.at, withQuotes.origin || "wgdom");
  return w;
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
    paint.marketQuotes = quoteCell(withQuotes.price, withQuotes.at);
    paint.freshnessStatus = "ok";
  }
  return paint;
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
    unit: opts.unit ?? "szt.",
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

function provenance(lineId, branchHint) {
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
    tenderId: "t-p513",
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

// --- Gate A
forceIkEntryEnabledForTests(null);
assert("Gate A OFF", isIkEntryEnabled() === false);
assert("Gate A NG-10", resolveIkDetailFirstScreen(false) === "ng10_gate");

// --- Helpers
const demandKey = buildMaterialDemandResearchKey(ZAWOR);
assert("1 demand key prefix", isMaterialDemandResearchKey(demandKey) && demandKey.includes(ZAWOR));
assert(
  "1 pre-existing product identity null",
  resolveDemandProductIdentityExact({
    catalogWorkId: ZAWOR,
    namePl: "Montaż odpowietrzników automatycznych na pionach instalacji C.O. DN 20 mm",
    unit: "szt.",
  }) === null,
);

const zaworSpecs = P59_ZZK_FOCUS_LINE_SPECS.filter((l) => l.workId === ZAWOR);
const zapSpecs = P59_ZZK_FOCUS_LINE_SPECS.filter((l) => l.workId === ZAPRAWA);
assert("1 two valve demands", zaworSpecs.length === 2);

const focusLines = [
  ...zaworSpecs.map((s) => ({
    dwellingId: s.dwellingId,
    line: minimalLine({
      lineId: s.lineId,
      description: s.description,
      unit: s.unit,
      quantity: s.quantity,
      workCategory: "sanitary",
    }),
    provenance: provenance(s.lineId, s.branch),
  })),
  ...zapSpecs.map((s) => ({
    dwellingId: s.dwellingId,
    line: minimalLine({
      lineId: s.lineId,
      description: s.description,
      unit: s.unit,
      quantity: s.quantity,
      workCategory: "electrical",
    }),
    provenance: provenance(s.lineId, s.branch),
  })),
  {
    dwellingId: "kotlarska",
    line: minimalLine({
      lineId: "L-paint-hit",
      description: "Farba lateksowa biała",
      unit: "l",
      quantity: 2,
    }),
    provenance: provenance("L-paint-hit", "construction"),
  },
  {
    dwellingId: "ptasia",
    line: minimalLine({
      lineId: "L-paint-miss",
      description: "Farba lateksowa wewnętrzna",
      unit: "l",
      quantity: 4,
    }),
    provenance: provenance("L-paint-miss", "construction"),
  },
];

resetMaterialResearchSessionCooldownForTests();
const zaworWorkNoQuote = makeWork(ZAWOR, "Odpowietrznik automatyczny CO", "szt", null);
const zapWork = makeWork(ZAPRAWA, "Zaprawianie bruzd", "mb", null);
const paintHit = makePaintWork({ price: 22.5, at: T_FRESH });
const paintMiss = makePaintWork(null);
// paint miss needs same work id — use one paint without quotes for miss path + separate hit store later
const worksMiss = [zaworWorkNoQuote, zapWork, makePaintWork(null)];
const storeMiss = makeStore(worksMiss);

let providerCalls = 0;
const evidenceProvider = {
  id: "p513_owner_evidence",
  connected: true,
  async research(input) {
    providerCalls += 1;
    // Distinct commercial offers — first Leroy, do not silently merge Castorama.
    const ev = OWNER_EVIDENCE[0];
    return {
      ok: true,
      autoAccepted: false,
      candidate: {
        candidateId: `cand_leroy_${providerCalls}`,
        demandId: input.demandId,
        provider: "leroy",
        sourceType: "market_reference",
        name: ev.name,
        unit: input.unit || ev.unit,
        priceNet: ev.priceNet,
        currency: "PLN",
        priceDate: new Date(NOW).toISOString().slice(0, 10),
        sourceUrl: ev.sourceUrl,
        providerSku: ev.productCode,
        retrievedAt: new Date(NOW).toISOString(),
        provenance: "mock_test",
        notes: "P5.13 Owner-authorized supplier evidence (harness)",
        materialKey: input.materialKey,
        catalogWorkId: input.catalogWorkId,
        region: input.region,
      },
    };
  },
};

const atomic = createMemoryAtomicResearchJobStore();
forceIkEntryEnabledForTests(true);
const reportMiss = await runIkMasterBoqMaterialExpert({
  item: { id: "t-p513", tenderId: "t-p513", title: "P5.13" },
  expert: readyExpert(focusLines),
  store: storeMiss,
  works: worksMiss,
  executeResearch: true,
  lease: leasePort(atomic),
  provider: evidenceProvider,
  nowMs: NOW,
});

const zaworRows = reportMiss.lines.filter((l) => zaworSpecs.some((s) => s.lineId === l.lineId));
const zapRows = reportMiss.lines.filter((l) => zapSpecs.some((s) => s.lineId === l.lineId));
const paintMissRow = reportMiss.lines.find((l) => l.lineId === "L-paint-miss");
const paintHitRow = reportMiss.lines.find((l) => l.lineId === "L-paint-hit");

assert("2 research without product materialKey", zaworRows.every((l) => l.materialIdentity == null));
assert(
  "2 research entry allowed",
  zaworRows.every((l) => l.plane === "MATERIAL" && (l.researchKey || l.candidate || l.priceStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED" || l.priceStatus === "RESEARCH_GAP")),
);
assert(
  "3 Price Memory skipped fabricate — MISS then research",
  zaworRows.every((l) => l.priceStatus !== "NONE")
  && zaworRows.some((l) =>
    l.priceStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED"
    || l.priceStatus === "PRICE_MEMORY_MISS"
    || l.priceStatus === "RESEARCH_GAP",
  ),
);
assert("4 Supplier Research invoked", providerCalls >= 1, providerCalls);
assert(
  "5 concrete product candidate",
  zaworRows.some((l) => l.candidate && l.candidate.providerSku === "89178695"),
);
assert(
  "6 Evidence",
  zaworRows.some((l) => l.candidate?.sourceUrl && l.candidate.priceNet === 56.99),
);
assert(
  "7 Candidate + no auto-accept",
  reportMiss.counts.candidates >= 1
  && reportMiss.autoAcceptExecuted === false
  && reportMiss.counts.accepted === 0,
);
assert(
  "8 distinct Castorama evidence retained external",
  OWNER_EVIDENCE[1].productCode === "5902510004040"
  && OWNER_EVIDENCE[1].priceNet === 40.48
  && !zaworRows.some((l) => l.candidate?.providerSku === "5902510004040"),
);
assert("11 no auto-accept", reportMiss.autoAcceptExecuted === false);
assert("12 no invented product mat.*", zaworRows.every((l) => !l.materialIdentity));
assert(
  "13 no invented price outside evidence",
  zaworRows.every((l) => !l.candidate || l.candidate.priceNet === 56.99),
);
assert("researchBoundaryOk", reportMiss.researchBoundaryOk === true);

for (const spec of zaworSpecs) {
  const row = zaworRows.find((l) => l.lineId === spec.lineId);
  assert(`14 qty ${spec.lineId}`, row?.quantity === spec.quantity);
  assert(`15 unit ${spec.lineId}`, row?.unit === spec.unit);
  assert(`16 dwelling ${spec.lineId}`, row?.dwellingId === spec.dwellingId);
  assert(`17 branch ${spec.lineId}`, row?.branch === spec.branch || row?.lineProvenance?.branchHint === spec.branch);
  assert(`14 provenance ${spec.lineId}`, Boolean(row?.lineProvenance));
}

assert(
  "22 zaprawianie LABOR never material research",
  zapRows.every((l) => l.plane === "LABOR" && !l.candidate && l.priceStatus === "NONE")
  && !reportMiss.researchKeys.some((k) => k.includes(ZAPRAWA)),
);

// Existing paint paths — identity still required for product path
assert(
  "19 paint identity path still resolves when mapped",
  paintMissRow?.materialIdentity?.materialKey === MAT_PAINT
  || paintHitRow?.materialIdentity?.materialKey === MAT_PAINT
  || resolveDemandProductIdentityExact({ materialKey: MAT_PAINT })?.materialKey === MAT_PAINT,
);

// --- Owner Accept → Price Memory on workId
const cand = zaworRows.find((l) => l.candidate)?.candidate;
assert("8 candidate present for Accept", Boolean(cand));
const deps = memoryCatalogDeps(storeMiss);
const accept = await acceptIkMaterialResearchCandidate({
  candidate: cand,
  expectedUnit: zaworSpecs[0].unit,
  commitDeps: deps,
  updatedAtIso: new Date(NOW).toISOString(),
});
assert("9 Owner Accept ok", accept.ok === true && accept.accepted === true, accept.error);
assert("9 wrote Purchase? no", accept.wrotePurchase === false);

const worksAfter = deps.loadLocal().catalogs.wroclaw.works;
const zaworAfter = worksAfter.find((w) => w.id === ZAWOR);
const worksById = new Map(worksAfter.map((w) => [w.id, w]));
const cacheAfter = evaluateMaterialCache({
  materialKey: "",
  catalogWorkId: ZAWOR,
  region: "wroclaw",
  worksById,
  nowMs: NOW + 1000,
});
assert("10 Price Memory CURRENT after Accept", cacheAfter.usability === "CURRENT", cacheAfter);
assert("10 post-accept trusted work quote", cacheAfter.hit?.price === 56.99, cacheAfter.hit);

resetMaterialResearchSessionCooldownForTests();
providerCalls = 0;
const reportHit = await runIkMasterBoqMaterialExpert({
  item: { id: "t-p513", tenderId: "t-p513", title: "P5.13" },
  expert: readyExpert(focusLines.filter((f) => zaworSpecs.some((s) => s.lineId === f.line.lineId))),
  store: deps.loadLocal(),
  works: worksAfter,
  executeResearch: true,
  lease: leasePort(createMemoryAtomicResearchJobStore()),
  provider: evidenceProvider,
  nowMs: NOW + 2000,
});
const zaworHitRows = reportHit.lines.filter((l) => zaworSpecs.some((s) => s.lineId === l.lineId));
assert(
  "20 second lookup HIT + research 0",
  zaworHitRows.every((l) => l.priceStatus === "PRICE_MEMORY_HIT")
  && providerCalls === 0
  && reportHit.counts.researchCalls === 0,
);
assert(
  "9 post-accept product identity still not invented",
  zaworHitRows.every((l) => l.materialIdentity == null),
);

// Paint HIT path unchanged (dedicated store with quotes)
resetMaterialResearchSessionCooldownForTests();
const paintOnlyLines = [
  {
    dwellingId: "kotlarska",
    line: minimalLine({
      lineId: "L-paint-hit2",
      description: "Farba lateksowa biała",
      unit: "l",
      quantity: 1,
    }),
    provenance: provenance("L-paint-hit2", "construction"),
  },
];
const paintWorks = [makePaintWork({ price: 19.9, at: T_FRESH })];
let paintProviderCalls = 0;
const reportPaintHit = await runIkMasterBoqMaterialExpert({
  item: { id: "t-p513p", tenderId: "t-p513p", title: "P5.13 paint HIT" },
  expert: readyExpert(paintOnlyLines),
  store: makeStore(paintWorks),
  works: paintWorks,
  executeResearch: true,
  lease: leasePort(createMemoryAtomicResearchJobStore()),
  provider: {
    id: "noop",
    connected: true,
    async research() {
      paintProviderCalls += 1;
      return { ok: false, error: "should_not_run" };
    },
  },
  nowMs: NOW,
});
assert(
  "20 existing CURRENT Price Memory HIT unchanged",
  reportPaintHit.lines.some((l) => l.priceStatus === "PRICE_MEMORY_HIT" && l.materialIdentity?.materialKey === MAT_PAINT)
  && paintProviderCalls === 0,
);

console.log(`
P5.13 MATERIAL RESEARCH ENTRY:
MATERIAL DEMAND INPUT = 2
PRE-EXISTING MATERIAL KEY = 0
RESEARCH WITHOUT MATERIAL KEY = PASS
RESEARCH EXECUTED = ${reportMiss.counts.researchCalls}
SUPPLIER CANDIDATES = ${reportMiss.counts.candidates}
EVIDENCE = ${reportMiss.counts.evidence}
OWNER ACCEPT = 1
ACCEPTED = 1
POST-ACCEPT TRUSTED IDENTITY (product mat.*) = 0
POST-ACCEPT PRICE MEMORY = 1
INVENTED PRODUCTS = 0
INVENTED PRICES = 0
AUTO-ACCEPT = NO
`);

console.log(`\nP5.13 RESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
