/**
 * AUT-MAT — Material Expert runtime wire proof.
 *
 * Proves (not pure contract-only):
 *   Material Expert research CANDIDATE
 *   → tryAutMatAcceptMaterialCandidate
 *   → acceptMaterialResearchCandidate (decision AUT_MAT)
 *   → Price Memory CURRENT
 *
 * Reuses P5.13 demand.work MATERIAL harness (zawor) — known MATERIAL plane.
 *
 * Run: npx vite-node scripts/test-aut-mat-orchestra-wire.mjs
 */
import {
  runIkMasterBoqMaterialExpert,
  resetMaterialResearchSessionCooldownForTests,
  forceIkEntryEnabledForTests,
  buildMaterialDemandResearchKey,
  P59_ZZK_FOCUS_LINE_SPECS,
  P59_FOCUS_WORK_ZAWOR,
} from "../src/lib/intelligent-estimator/index.ts";
import { evaluateMaterialCache } from "../src/lib/price-intelligence/market-material-research-cache.ts";
import { normalizeWorkCatalogStore as normalizeCatalog } from "../src/lib/work-catalog/index.ts";
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
globalThis.fetch = async () => ({
  ok: false,
  status: 404,
  json: async () => ({}),
  text: async () => "",
});

const NOW = Date.parse("2026-09-10T12:00:00.000Z");
const T_FRESH = "2026-09-09T12:00:00.000Z";
const PRICE = 56.99;
const ZAWOR = P59_FOCUS_WORK_ZAWOR;

function makeWork(id, namePl, unit) {
  return {
    id,
    tradeId: "HYDRAULIKA",
    namePl,
    unit,
    companyPricePln: 999,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: { marginPct: 10, updatedAt: T_FRESH, source: "owner" },
    updatedAt: T_FRESH,
    freshnessStatus: "missing",
    keywords: ["zawor"],
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
    load: async () => structuredClone(store),
    save: async (next) => {
      store = structuredClone(next);
      return { ok: true, saved: true };
    },
    loadLocal: () => store,
    saveLocal: (next) => {
      store = next;
    },
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
    catalogWorkId: opts.catalogWorkId ?? null,
    workCategory: opts.workCategory ?? "sanitary",
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
    tenderId: "t-autmat-wire",
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
      dwellingCount: 1,
      branchCount: 1,
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

const zaworSpecs = P59_ZZK_FOCUS_LINE_SPECS.filter((l) => l.workId === ZAWOR).slice(0, 1);
assert("fixture zawor line", zaworSpecs.length === 1, ZAWOR);

const focusLines = zaworSpecs.map((s) => ({
  dwellingId: s.dwellingId,
  line: minimalLine({
    lineId: s.lineId,
    description: s.description,
    unit: s.unit,
    quantity: s.quantity,
    workCategory: "sanitary",
    catalogWorkId: ZAWOR,
  }),
  provenance: provenance(s.lineId, s.branch),
}));

const provider = {
  id: "autmat_wire",
  connected: true,
  async research(input) {
    return {
      ok: true,
      autoAccepted: false,
      candidate: {
        candidateId: "cand_autmat_wire",
        demandId: input.demandId,
        provider: "leroy",
        sourceType: "market_reference",
        name: "Odpowietrznik automatyczny CO · Leroy · TEST",
        unit: input.unit || "szt",
        priceNet: PRICE,
        currency: "PLN",
        priceDate: new Date(NOW).toISOString().slice(0, 10),
        sourceUrl: "https://example.test/leroy/odpowietrznik",
        providerSku: "89178695",
        retrievedAt: new Date(NOW).toISOString(),
        provenance: "mock_test",
        notes: "TEST / MOCK · single_source · shops=leroy · AUT-MAT wire",
        materialKey: input.materialKey,
        catalogWorkId: input.catalogWorkId,
        region: input.region,
      },
    };
  },
};

forceIkEntryEnabledForTests(true);
resetMaterialResearchSessionCooldownForTests();

const store0 = makeStore([makeWork(ZAWOR, "Odpowietrznik automatyczny CO", "szt")]);
const deps = memoryCatalogDeps(store0);

const report = await runIkMasterBoqMaterialExpert({
  item: { id: "t-autmat", tenderId: "t-autmat", title: "AUT-MAT wire" },
  expert: readyExpert(focusLines),
  store: deps.loadLocal(),
  works: deps.loadLocal().catalogs.wroclaw.works,
  executeResearch: true,
  enableAutMatAccept: true,
  autMatPersist: true,
  autMatCommitDeps: deps,
  lease: leasePort(createMemoryAtomicResearchJobStore()),
  provider,
  nowMs: NOW,
  region: "wroclaw",
});

const row = report.lines.find((l) => l.lineId === zaworSpecs[0].lineId);
assert("A1 expert status", report.status === "ready" || report.status === "partial", report);
assert("A2 autoAcceptExecuted", report.autoAcceptExecuted === true, {
  reasons: report.reasons,
  row,
  counts: report.counts,
});
assert("A3 autMatAccepted", report.counts.autMatAccepted >= 1, report.counts);
assert("A4 PRICE_MEMORY_HIT", row?.priceStatus === "PRICE_MEMORY_HIT", row);
assert(
  "A5 not Owner-exception",
  row?.priceStatus !== "CANDIDATE_OWNER_ACCEPT_REQUIRED",
  row,
);
assert(
  "A6 AUT-MAT marker",
  typeof row?.researchError === "string" && row.researchError.startsWith("AUT-MAT"),
  row?.researchError,
);

const after = deps.loadLocal();
const worksById = new Map(after.catalogs.wroclaw.works.map((w) => [w.id, w]));
const demandKey = buildMaterialDemandResearchKey(ZAWOR);
const cache = evaluateMaterialCache({
  materialKey: demandKey,
  catalogWorkId: ZAWOR,
  region: "wroclaw",
  worksById,
  nowMs: NOW + 2000,
});
assert("A7 PM CURRENT", cache.usability === "CURRENT", cache);
assert("A8 price", Math.abs((cache.hit?.price ?? 0) - PRICE) < 0.01, cache.hit);

const work = after.catalogs.wroclaw.works.find((w) => w.id === ZAWOR);
let snap = null;
for (const perOrigin of Object.values(work?.marketQuotes ?? {})) {
  for (const cell of Object.values(perOrigin ?? {})) {
    if (cell?.decisionKind === "AUT_MAT") snap = cell;
  }
}
if (!snap) {
  for (const perOrigin of Object.values(work?.marketQuotes ?? {})) {
    for (const cell of Object.values(perOrigin ?? {})) {
      if (cell) snap = cell;
    }
  }
}
assert("A9 decisionKind AUT_MAT", snap?.decisionKind === "AUT_MAT", snap);
assert("A10 companyPrice untouched", work?.companyPricePln === 999);

// B — flag off keeps Owner path
resetMaterialResearchSessionCooldownForTests();
const depsB = memoryCatalogDeps(makeStore([makeWork(ZAWOR, "Odpowietrznik automatyczny CO", "szt")]));
const reportB = await runIkMasterBoqMaterialExpert({
  item: { id: "t-autmat-b", tenderId: "t-autmat-b", title: "AUT-MAT off" },
  expert: readyExpert(focusLines),
  store: depsB.loadLocal(),
  works: depsB.loadLocal().catalogs.wroclaw.works,
  executeResearch: true,
  enableAutMatAccept: false,
  lease: leasePort(createMemoryAtomicResearchJobStore()),
  provider,
  nowMs: NOW,
});
const rowB = reportB.lines.find((l) => l.lineId === zaworSpecs[0].lineId);
assert("B1 autoAccept false", reportB.autoAcceptExecuted === false);
assert(
  "B2 Owner Accept required",
  rowB?.priceStatus === "CANDIDATE_OWNER_ACCEPT_REQUIRED" && Boolean(rowB.candidate),
  rowB,
);

console.log(`\nAUT-MAT orchestra wire: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
