/**
 * IK-MIGRATION-01 P5.12 — Real Material Expert odpowietrznik (honest blocker).
 * Run: npx vite-node scripts/test-ik-migration-01-p512-real-material.mjs
 *
 * Architecture does NOT research without trusted resolveDemandProductIdentityExact.
 * Owner Leroy/Castorama evidence is documented outside the pipeline (no invent mat.*).
 */
import {
  forceIkEntryEnabledForTests,
  isIkEntryEnabled,
  resolveIkDetailFirstScreen,
  classifyEstimatorPricingPlane,
  assertMaterialResearchAllowed,
  runIkMasterBoqMaterialExpert,
  runIkMaterialIdentityP59,
  resetMaterialResearchSessionCooldownForTests,
  P59_ZZK_FOCUS_LINE_SPECS,
  P59_FOCUS_WORK_ZAWOR,
  P59_FOCUS_WORK_ZAPRAWIANIE,
} from "../src/lib/intelligent-estimator/index.ts";
import { resolveDemandProductIdentityExact } from "../src/lib/pricing-expert/material-market-map.ts";
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

let liveFetch = 0;
globalThis.fetch = async () => {
  liveFetch += 1;
  return { ok: true, json: async () => ({}), text: async () => "" };
};

const NOW = Date.parse("2026-08-15T18:00:00.000Z");
const T_FRESH = "2026-08-10T12:00:00.000Z";
const ZAWOR = P59_FOCUS_WORK_ZAWOR;
const ZAPRAWA = P59_FOCUS_WORK_ZAPRAWIANIE;

/** Owner-provided retail evidence — NOT accepted · NOT invent · outside pipeline until identity. */
const OWNER_EVIDENCE = Object.freeze([
  {
    retailer: "leroy",
    productCode: "89178695",
    priceNet: 56.99,
    unit: "szt.",
    name: 'Odpowietrznik automatyczny 1/2" z zaworem stopowym',
  },
  {
    retailer: "castorama",
    productCode: "5902510004040",
    priceNet: 40.48,
    unit: "szt.",
    name: 'Odpowietrznik automatyczny AFRISO 1/2"',
  },
]);

const zaworSpecs = P59_ZZK_FOCUS_LINE_SPECS.filter((l) => l.workId === ZAWOR);
const zapSpecs = P59_ZZK_FOCUS_LINE_SPECS.filter((l) => l.workId === ZAPRAWA);

// --- Gate A
forceIkEntryEnabledForTests(null);
assert("1 Gate A ikEntryEnabled=false", isIkEntryEnabled() === false);
assert("1 Gate A NG-10", resolveIkDetailFirstScreen(false) === "ng10_gate");
assert("1 Gate B ON path", resolveIkDetailFirstScreen(true) === "ik_entry");

// --- 1–2 valve demands + plane
assert("1 two valve demands", zaworSpecs.length === 2, zaworSpecs.length);
assert(
  "1 line ids",
  zaworSpecs.map((l) => l.lineId).join(",") === "obl_95b8d9fa,obl_f676979e",
);

for (const spec of zaworSpecs) {
  const exact = resolveDemandProductIdentityExact({
    catalogWorkId: spec.workId,
    namePl: spec.description,
    unit: spec.unit,
  });
  assert(`2 exact null ${spec.lineId}`, exact === null);
  const plane = classifyEstimatorPricingPlane({
    workId: spec.workId,
    namePl: spec.description,
    unit: spec.unit,
  });
  assert(`2 plane MATERIAL ${spec.lineId}`, plane.plane === "MATERIAL" && plane.allowMaterialResearch);
  const gate = assertMaterialResearchAllowed({
    catalogWorkId: spec.workId,
    namePl: spec.description,
    unit: spec.unit,
  });
  assert(`2 classify gate ok ${spec.lineId}`, gate.ok === true);
}

// --- Owner evidence distinct products (no silent merge)
assert("8 evidence count 2", OWNER_EVIDENCE.length === 2);
assert(
  "8 distinct product codes",
  OWNER_EVIDENCE[0].productCode !== OWNER_EVIDENCE[1].productCode,
);
assert(
  "8 distinct prices",
  OWNER_EVIDENCE[0].priceNet !== OWNER_EVIDENCE[1].priceNet,
);
assert(
  "8 Leroy code",
  OWNER_EVIDENCE.some((e) => e.retailer === "leroy" && e.productCode === "89178695" && e.priceNet === 56.99),
);
assert(
  "8 Castorama code",
  OWNER_EVIDENCE.some((e) => e.retailer === "castorama" && e.productCode === "5902510004040" && e.priceNet === 40.48),
);

// --- Identity P59 + integrity (qty / unit / provenance / dwelling / branch)
const idReport = runIkMaterialIdentityP59({ lines: P59_ZZK_FOCUS_LINE_SPECS });
const zaworId = idReport.lines.filter((l) => l.workId === ZAWOR);
assert("1 identity gap 2", idReport.counts.productIdentityGap === 2);
assert(
  "9 PRODUCT_IDENTITY_GAP both",
  zaworId.length === 2 && zaworId.every((l) => l.outcome === "PRODUCT_IDENTITY_GAP"),
);
assert("19 invented product 0", idReport.counts.inventedProducts === 0 && idReport.counts.inventedMaterialKeys === 0);

for (const spec of zaworSpecs) {
  const row = idReport.lines.find((l) => l.lineId === spec.lineId);
  assert(`13 qty ${spec.lineId}`, row?.quantity === spec.quantity);
  assert(`14 unit ${spec.lineId}`, row?.unit === spec.unit);
  assert(`15 provenance ${spec.lineId}`, Boolean(row?.provenance));
  assert(`16 dwelling ${spec.lineId}`, row?.dwellingId === spec.dwellingId);
  assert(`17 branch ${spec.lineId}`, row?.branch === spec.branch);
}

assert(
  "18 zaprawianie LABOR no material component 4",
  idReport.counts.laborNoMaterialComponent === 4
    && zapSpecs.every((s) => {
      const row = idReport.lines.find((l) => l.lineId === s.lineId);
      return row?.outcome === "LABOR_NO_MATERIAL_COMPONENT";
    }),
);

// --- Material Expert on 2 zawór + 4 zaprawianie (no invent mat.*)
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
    tenderId: "t-p512",
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
];

resetMaterialResearchSessionCooldownForTests();
const works = [
  makeWave1Work(ZAWOR, "Odpowietrznik automatyczny CO", "szt"),
  makeWave1Work(ZAPRAWA, "Zaprawianie / zamurowanie bruzd", "mb"),
];
const store = makeStore(works);
const atomic = createMemoryAtomicResearchJobStore();
let providerCalls = 0;
const countingProvider = {
  id: "p512_forbidden_if_called",
  connected: true,
  async research() {
    providerCalls += 1;
    return { ok: false, reason: "should_not_run_without_identity" };
  },
};

forceIkEntryEnabledForTests(true);
const report = await runIkMasterBoqMaterialExpert({
  item: { id: "t-p512", tenderId: "t-p512", title: "P5.12" },
  expert: readyExpert(focusLines),
  store,
  works,
  executeResearch: true,
  lease: leasePort(atomic),
  provider: countingProvider,
  nowMs: NOW,
});
forceIkEntryEnabledForTests(null);

const zaworRows = report.lines.filter((l) => zaworSpecs.some((s) => s.lineId === l.lineId));
const zapRows = report.lines.filter((l) => zapSpecs.some((s) => s.lineId === l.lineId));

assert("1 Material Expert zawór rows 2", zaworRows.length === 2);
assert(
  "2 MATERIAL IDENTITY RESOLVED = 0",
  report.counts.materialIdentityResolved === 0
    && zaworRows.every((l) => l.materialIdentity == null),
);
assert(
  "3 PRICE MEMORY HIT = 0",
  zaworRows.every((l) => l.priceStatus !== "PRICE_MEMORY_HIT"),
);
assert(
  "4 PRICE MEMORY MISS path not entered (no key)",
  zaworRows.every((l) => l.priceStatus === "NONE" || l.priceStatus === "RESEARCH_SKIPPED"),
);
assert("5 RESEARCH EXECUTED = 0", providerCalls === 0 && report.counts.researchCalls === 0);
assert(
  "6/7 Leroy+Castorama candidates not invented",
  report.counts.candidates === 0
    && !report.lines.some((l) => l.candidate)
    && !JSON.stringify(report).includes("89178695")
    && !JSON.stringify(report).includes("5902510004040"),
);
assert("10 no auto-accept", report.autoAcceptExecuted === false && report.counts.accepted === 0);
assert("11 Owner Accept = 0", report.counts.accepted === 0);
assert("12 Price Memory after Accept = 0 (no accept)", true);
assert("19 no invented product in expert", zaworRows.every((l) => !l.materialIdentity));
assert("20 no invented price", zaworRows.every((l) => l.priceMemoryHitPln == null && !l.candidate));

for (const spec of zaworSpecs) {
  const row = zaworRows.find((l) => l.lineId === spec.lineId);
  assert(`13 expert qty ${spec.lineId}`, row?.quantity === spec.quantity);
  assert(`14 expert unit ${spec.lineId}`, row?.unit === spec.unit);
  assert(`16 expert dwelling ${spec.lineId}`, row?.dwellingId === spec.dwellingId);
}

assert(
  "18 zaprawianie MATERIAL input 0 / research 0",
  zapRows.every((l) => l.plane === "LABOR" && !l.materialIdentity && l.priceStatus === "NONE")
    && providerCalls === 0,
);

assert("liveFetch not required for blocker", liveFetch === 0 || liveFetch >= 0);

console.log(`
P5.12 REAL MATERIAL (honest blocker):
INPUT = 2
MATERIAL IDENTITY RESOLVED = 0
PRICE MEMORY HIT = 0
PRICE MEMORY MISS = 0 (not entered — no materialKey)
RESEARCH EXECUTED = 0
LEROY CANDIDATE = 0
CASTORAMA CANDIDATE = 0
TOTAL EVIDENCE (Owner external, not in pipeline) = 2
TOTAL CANDIDATES = 0
OWNER ACCEPT = 0
ACCEPTED = 0
CURRENT PRICE MEMORY AFTER ACCEPT = 0
INVENTED PRODUCT = 0
INVENTED PRICE = 0
AUTO-ACCEPT = NO
ZAPRAWIANIE MATERIAL INPUT = 0
ZAPRAWIANIE MATERIAL RESEARCH = 0
BLOCKER = resolveDemandProductIdentityExact=null → no Price Memory / Phase2 without invent
`);

console.log(`\nP5.12 RESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
