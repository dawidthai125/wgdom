/**
 * PHASE B — RESEARCH_HELD_COMPOUND (parent COMPOUND intentional HOLD).
 * Run: npx vite-node scripts/test-ik-research-held-compound-b.mjs
 *
 * ZERO Leaf Research · ZERO pack→kg · ZERO Accept · ZERO business write.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  IK_RESEARCH_HELD_COMPOUND_MESSAGE_PL,
  IK_RESEARCH_HELD_COMPOUND_STATUS,
  classifyEstimatorPricingPlane,
  getOwnerClassificationPlane,
  runIkMasterBoqLaborExpert,
  runIkMasterBoqMaterialExpert,
} from "../src/lib/intelligent-estimator/index.ts";
import { researchEligible } from "../src/lib/intelligent-estimator/ik-material-expert.ts";
import {
  clearWorkRateResearchAntiStormState,
  createFixtureWorkRateSelectiveLookup,
  normalizeWorkCatalogStore,
} from "../src/lib/work-catalog/index.ts";
import { resetMaterialResearchSessionCooldownForTests } from "../src/lib/price-intelligence/market-material-research-wire.ts";

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

const NOW = Date.parse("2026-08-15T01:00:00.000Z");
const T_FRESH = "2026-08-14T12:00:00.000Z";
const PARENT = "legacy-gladzie_tynki-m2";

function makeWork(overrides = {}) {
  return {
    id: PARENT,
    tradeId: "MALOWANIE",
    namePl: "Gładzie / tynki",
    unit: "m2",
    companyPricePln: 0,
    marketQuotes: {},
    marketQuoteHistory: [],
    commercialPricing: null,
    updatedAt: T_FRESH,
    freshnessStatus: "ok",
    keywords: ["gladzie", "tynki"],
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
    description: opts.description ?? "Gładź gipsowa ścian i sufitów",
    quantity: opts.quantity ?? 13,
    quantityRaw: String(opts.quantity ?? 13),
    unit: opts.unit ?? "m2",
    catalogWorkId: opts.catalogWorkId ?? PARENT,
    workCategory: "construction",
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    knrHint: null,
    matchMethod: opts.matchMethod ?? "manual",
    matchedBy: opts.matchedBy ?? "manual",
    matchConfidence: "high",
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

function provenance(lineId) {
  return {
    lineId,
    sourceDocumentId: "doc-construction",
    sourceDocumentIds: ["doc-construction"],
    sourceArtifactId: "art-construction",
    sourceArtifactIds: ["art-construction"],
    branchHint: "construction",
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
    tenderId: "t-held-compound-b",
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
    status: "ready",
    reasons: [],
    offerBoq: { schemaVersion: 5, lines: lines.map((L) => L.line) },
    lineProvenance: Object.fromEntries(lines.map((L) => [L.line.lineId, L.provenance])),
    masterBoqLines,
  };
}

// --- Classification unchanged ---
assert("parent Owner map COMPOUND", getOwnerClassificationPlane(PARENT) === "COMPOUND");
const classify = classifyEstimatorPricingPlane({
  workId: PARENT,
  materialKey: null,
  namePl: "Gładź",
  unit: "m2",
});
assert("classify COMPOUND", classify.plane === "COMPOUND");
assert("allowLaborResearch false", classify.allowLaborResearch === false);
assert("allowMaterialResearch false", classify.allowMaterialResearch === false);
assert("hold true", classify.hold === true);

assert(
  "status const",
  IK_RESEARCH_HELD_COMPOUND_STATUS === "RESEARCH_HELD_COMPOUND",
);
assert(
  "copy PL",
  IK_RESEARCH_HELD_COMPOUND_MESSAGE_PL === "Research celowo wstrzymany — parent COMPOUND.",
);

// Test 3 / 4 — semantic ≠ RESEARCH_GAP / NO_PACK
assert("T3 !== RESEARCH_GAP", IK_RESEARCH_HELD_COMPOUND_STATUS !== "RESEARCH_GAP");
assert("T4 !== NO_PACK", IK_RESEARCH_HELD_COMPOUND_STATUS !== "NO_PACK");
const compositeSrc = readFileSync(
  join(root, "src/lib/intelligent-estimator/ik-composite-both-hold.ts"),
  "utf8",
);
assert(
  "T4 Composite gap enum keeps NO_PACK without RESEARCH_HELD_COMPOUND",
  /\| "NO_PACK"/.test(compositeSrc)
    && !/IkCompositeGapCode[\s\S]*RESEARCH_HELD_COMPOUND/.test(compositeSrc),
);

// Test 5 — mat.* MATERIAL research eligibility unchanged
const matIdentity = {
  materialKey: "mat.gladz_gipsowa",
  catalogWorkId: "cw.product.gladz_gipsowa",
  labelPl: "Gładź gipsowa",
  via: "materialKey",
};
assert(
  "T5 mat.gladz MATERIAL+MATERIAL eligible",
  researchEligible(matIdentity, "MATERIAL", "MATERIAL") === true,
);
assert(
  "T5 parent BOTH+COMPOUND not eligible",
  researchEligible(matIdentity, "BOTH", "COMPOUND") === false,
);

clearWorkRateResearchAntiStormState();
resetMaterialResearchSessionCooldownForTests();

const works = [makeWork()];
const store = makeStore(works);
const fixtureLines = [
  {
    dwellingId: "kotlarska",
    line: minimalLine({ lineId: "L-gladzie", lp: "13", quantity: 13 }),
    provenance: provenance("L-gladzie"),
  },
];
const expert = readyExpert(fixtureLines);
const item = {
  id: "t-held-compound-b",
  tenderId: "t-held-compound-b",
  title: "PHASE B held compound",
  status: "seen",
  updatedAt: new Date().toISOString(),
};

const lookupPort = createFixtureWorkRateSelectiveLookup({
  kb_pl: { html: "<html></html>" },
  cennikremontow_pl: { html: "<html></html>" },
  sccot: { html: "<html></html>" },
  extradom: { html: "<html></html>" },
});

liveFetch = 0;
const labor = await runIkMasterBoqLaborExpert({
  item,
  expert,
  store,
  works,
  executeResearch: true,
  lookupPort,
  nowMs: NOW,
  bypassCooldown: true,
});

const laborRow = labor.lines.find((l) => l.lineId === "L-gladzie");
assert("T1 plane COMPOUND", laborRow?.plane === "COMPOUND", laborRow);
assert("T1 bucket BOTH", laborRow?.bucket === "BOTH", laborRow);
assert(
  "T1 rateStatus RESEARCH_HELD_COMPOUND",
  laborRow?.rateStatus === "RESEARCH_HELD_COMPOUND",
  laborRow?.rateStatus,
);
assert("T1 no researchKey", !laborRow?.researchKey, laborRow?.researchKey);
assert("T1 no candidate", laborRow?.candidate == null);
assert(
  "T1 message PL",
  laborRow?.researchMessagePl === IK_RESEARCH_HELD_COMPOUND_MESSAGE_PL,
);
assert("T1 researchCalls 0", labor.counts.researchCalls === 0, labor.counts);
assert("T1 researchHttpFetches 0", labor.counts.researchHttpFetches === 0, labor.counts);
assert("T1 no live HTTP", liveFetch === 0, liveFetch);
assert("T1 !== RESEARCH_GAP", laborRow?.rateStatus !== "RESEARCH_GAP");
assert("T1 researchBoundaryOk", labor.researchBoundaryOk === true);

liveFetch = 0;
const material = await runIkMasterBoqMaterialExpert({
  item,
  expert,
  store,
  works,
  executeResearch: true,
  nowMs: NOW,
});

const matRow = material.lines.find((l) => l.lineId === "L-gladzie");
assert("T2 plane COMPOUND", matRow?.plane === "COMPOUND", matRow);
assert("T2 bucket BOTH", matRow?.bucket === "BOTH", matRow);
assert(
  "T2 priceStatus RESEARCH_HELD_COMPOUND",
  matRow?.priceStatus === "RESEARCH_HELD_COMPOUND",
  matRow?.priceStatus,
);
assert("T2 no researchKey", !matRow?.researchKey, matRow?.researchKey);
assert("T2 no candidate", matRow?.candidate == null);
assert(
  "T2 researchError PL",
  matRow?.researchError === IK_RESEARCH_HELD_COMPOUND_MESSAGE_PL,
);
assert("T2 researchCalls 0", material.counts.researchCalls === 0, material.counts);
assert("T2 no live HTTP", liveFetch === 0, liveFetch);
assert("T2 !== RESEARCH_GAP", matRow?.priceStatus !== "RESEARCH_GAP");

// Test 6 — TPI regression (13 gładzie parent COMPOUND · explicit HOLD · no mutation)
const tpiLines = Array.from({ length: 13 }, (_, i) => ({
  dwellingId: "kotlarska",
  line: minimalLine({
    lineId: `L-tpi-${i + 1}`,
    lp: String(i + 1),
    quantity: 1 + i,
  }),
  provenance: provenance(`L-tpi-${i + 1}`),
}));
const tpiExpert = readyExpert(tpiLines);
liveFetch = 0;
const tpiLabor = await runIkMasterBoqLaborExpert({
  item: { ...item, id: "t-tpi-13" },
  expert: tpiExpert,
  store,
  works,
  executeResearch: true,
  lookupPort,
  nowMs: NOW,
  bypassCooldown: true,
});
const tpiMat = await runIkMasterBoqMaterialExpert({
  item: { ...item, id: "t-tpi-13" },
  expert: tpiExpert,
  store,
  works,
  executeResearch: true,
  nowMs: NOW,
});

assert("T6 13 labor lines", tpiLabor.lines.length === 13);
assert(
  "T6 all parent COMPOUND",
  tpiLabor.lines.every((l) => l.plane === "COMPOUND" && l.bucket === "BOTH"),
);
assert(
  "T6 all RESEARCH_HELD_COMPOUND labor",
  tpiLabor.lines.every((l) => l.rateStatus === "RESEARCH_HELD_COMPOUND"),
);
assert(
  "T6 all RESEARCH_HELD_COMPOUND material",
  tpiMat.lines.every((l) => l.priceStatus === "RESEARCH_HELD_COMPOUND"),
);
assert("T6 labor researchCalls 0", tpiLabor.counts.researchCalls === 0);
assert("T6 material researchCalls 0", tpiMat.counts.researchCalls === 0);
assert("T6 no candidates labor", tpiLabor.counts.evidenceCandidates === 0);
assert("T6 no candidates material", tpiMat.counts.candidates === 0);
assert("T6 no live HTTP", liveFetch === 0, liveFetch);
assert(
  "T6 no OUR RATE write path",
  tpiLabor.counts.acceptedOurRate === 0 && tpiLabor.autoAcceptExecuted === false,
);
assert(
  "T6 no PM Accept",
  tpiMat.counts.accepted === 0 && tpiMat.autoAcceptExecuted === false,
);

// Host attrs present (no second diagnostic channel)
const hostSrc = readFileSync(
  join(root, "src/app/intelligent-estimator/IkEntryHost.tsx"),
  "utf8",
);
assert("UI labor held-compound attr", /data-ik-labor-held-compound=/.test(hostSrc));
assert("UI material held-compound attr", /data-ik-material-held-compound=/.test(hostSrc));

// Owner map / classification files untouched by B semantics
const mapSrc = readFileSync(
  join(root, "src/lib/intelligent-estimator/owner-classification-map.ts"),
  "utf8",
);
assert(
  "classification map still COMPOUND for parent",
  /"legacy-gladzie_tynki-m2": "COMPOUND"/.test(mapSrc),
);

console.log(`\nPHASE B: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
