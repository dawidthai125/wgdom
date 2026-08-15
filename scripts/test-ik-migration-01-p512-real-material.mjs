/**
 * IK-MIGRATION-01 P5.12 — Real Material Expert odpowietrznik.
 * Run: npx vite-node scripts/test-ik-migration-01-p512-real-material.mjs
 *
 * Historical: P5.12 documented BLOCKED (identity-before-research).
 * P5.13 supersedes: MATERIAL demand may enter Supplier Research without mat.*.
 * This suite now asserts the post-P5.13 contract + still no invent / no auto-Accept.
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
  buildMaterialDemandResearchKey,
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
globalThis.fetch = async () => ({ ok: true, json: async () => ({}), text: async () => "" });

const NOW = Date.parse("2026-08-15T18:00:00.000Z");
const T_FRESH = "2026-08-10T12:00:00.000Z";
const ZAWOR = P59_FOCUS_WORK_ZAWOR;
const ZAPRAWA = P59_FOCUS_WORK_ZAPRAWIANIE;

const OWNER_EVIDENCE = Object.freeze([
  { retailer: "leroy", productCode: "89178695", priceNet: 56.99, unit: "szt." },
  { retailer: "castorama", productCode: "5902510004040", priceNet: 40.48, unit: "szt." },
]);

const zaworSpecs = P59_ZZK_FOCUS_LINE_SPECS.filter((l) => l.workId === ZAWOR);
const zapSpecs = P59_ZZK_FOCUS_LINE_SPECS.filter((l) => l.workId === ZAPRAWA);

forceIkEntryEnabledForTests(null);
assert("1 Gate A ikEntryEnabled=false", isIkEntryEnabled() === false);
assert("1 Gate A NG-10", resolveIkDetailFirstScreen(false) === "ng10_gate");
assert("1 Gate B ON path", resolveIkDetailFirstScreen(true) === "ik_entry");

assert("1 two valve demands", zaworSpecs.length === 2);

for (const spec of zaworSpecs) {
  const exact = resolveDemandProductIdentityExact({
    catalogWorkId: spec.workId,
    namePl: spec.description,
    unit: spec.unit,
  });
  assert(`2 exact product identity still null ${spec.lineId}`, exact === null);
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

assert("8 distinct product codes", OWNER_EVIDENCE[0].productCode !== OWNER_EVIDENCE[1].productCode);

const idReport = runIkMaterialIdentityP59({ lines: P59_ZZK_FOCUS_LINE_SPECS });
assert("9 PRODUCT_IDENTITY_GAP both", idReport.counts.productIdentityGap === 2);
assert("19 invented product 0", idReport.counts.inventedProducts === 0);

function makeWave1Work(id, namePl, unit) {
  return {
    id,
    tradeId: "HYDRAULIKA",
    namePl,
    unit,
    companyPricePln: 0,
    marketQuoteHistory: [],
    updatedAt: T_FRESH,
    freshnessStatus: "missing",
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
    lp: "1",
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
let providerCalls = 0;
const countingProvider = {
  id: "p512_post_p513",
  connected: true,
  async research(input) {
    providerCalls += 1;
    return {
      ok: true,
      autoAccepted: false,
      candidate: {
        candidateId: `cand_${providerCalls}`,
        demandId: input.demandId,
        provider: "leroy",
        sourceType: "market_reference",
        name: 'Odpowietrznik automatyczny 1/2"',
        unit: input.unit,
        priceNet: 56.99,
        currency: "PLN",
        priceDate: new Date(NOW).toISOString().slice(0, 10),
        sourceUrl: "https://example.test/leroy/89178695",
        providerSku: "89178695",
        retrievedAt: new Date(NOW).toISOString(),
        provenance: "mock_test",
        materialKey: input.materialKey,
        catalogWorkId: input.catalogWorkId,
        region: input.region,
      },
    };
  },
};

forceIkEntryEnabledForTests(true);
const report = await runIkMasterBoqMaterialExpert({
  item: { id: "t-p512", tenderId: "t-p512", title: "P5.12" },
  expert: readyExpert(focusLines),
  store,
  works,
  executeResearch: true,
  lease: leasePort(createMemoryAtomicResearchJobStore()),
  provider: countingProvider,
  nowMs: NOW,
});
forceIkEntryEnabledForTests(null);

const zaworRows = report.lines.filter((l) => zaworSpecs.some((s) => s.lineId === l.lineId));
const zapRows = report.lines.filter((l) => zapSpecs.some((s) => s.lineId === l.lineId));
const demandKey = buildMaterialDemandResearchKey(ZAWOR);

assert("P5.13 supersede: research without product mat.*", providerCalls >= 1);
assert(
  "demand research key used",
  report.researchKeys.some((k) => k.startsWith(demandKey)),
);
assert("MATERIAL IDENTITY (product) = 0", report.counts.materialIdentityResolved === 0);
assert("candidates from research", report.counts.candidates >= 1);
assert("10 no auto-accept", report.autoAcceptExecuted === false && report.counts.accepted === 0);
assert(
  "18 zaprawianie MATERIAL input 0",
  zapRows.every((l) => l.plane === "LABOR" && !l.candidate),
);
assert("19 no invented product", zaworRows.every((l) => !l.materialIdentity));
assert("researchBoundaryOk", report.researchBoundaryOk === true);

console.log(`\nP5.12 (post-P5.13) RESULT: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
