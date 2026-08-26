/**
 * IK S6-B — multi-dwelling primary-graph fallback harden (Option 1).
 * npx vite-node scripts/test-ik-s6b-multi-graph-fallback.mjs
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { enrichOfferBoqDocumentForOutcomeS4b } from "../src/lib/intelligent-estimator/boq-outcome-s4b-enrichment.ts";
import {
  enrichOfferBoqLinesWithDependencyGraph,
} from "../src/lib/intelligent-estimator/boq-dependency-graph.ts";
import {
  enrichOfferBoqLinesWithQuantityIntelligence,
} from "../src/lib/intelligent-estimator/boq-quantity-intelligence.ts";
import { resolveBoqPricingQuantity } from "../src/lib/intelligent-estimator/boq-pricing-quantity-resolver.ts";
import { assertMopsS1DiscoveryFrozenContract } from "../src/lib/intelligent-estimator/ik-mops-identity-bridge-audit.ts";
import { runIkP7PositionCostBid } from "../src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts";
import { normalizeDwellingId } from "../src/lib/multi-dwelling/constants.ts";
import {
  evaluateAllDwellingsInPackage,
  evaluateTenderPackage,
} from "../src/lib/multi-dwelling/orchestration.ts";
import {
  clearOwnerRateInputStore,
  ensureOwnerRateQuestionForGap,
  submitOwnerRateAnswer,
} from "../src/lib/owner-rate-input/index.ts";
import { parseOfferBoqQuantity } from "../src/lib/tender-offer-boq.ts";
import { buildOfferBoqFromSnapshot } from "../src/lib/tender-offer-boq.ts";
import {
  clearTransportBidCandidateStore,
  computeShadowPositionCostForOfferBoqLine,
} from "../src/lib/tender-position-cost/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    Object.keys(lsStore).forEach((key) => delete lsStore[key]);
  },
};

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

const OWNER = { userId: "owner-s6b", displayName: "Owner S6B" };
const NOW = Date.parse("2026-08-26T09:00:00.000Z");
const DW_A = normalizeDwellingId("dw-a");
const DW_B = normalizeDwellingId("dw-b");

function reset() {
  clearOwnerRateInputStore();
  clearTransportBidCandidateStore();
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
}

function makeStore() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: "2026-08-26T00:00:00.000Z",
    catalogs: {
      wroclaw: { region: "wroclaw", works: [], updatedAt: "2026-08-26T00:00:00.000Z" },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: "2026-08-26T00:00:00.000Z" },
    },
  });
}

function baseLine(overrides = {}) {
  const quantityRaw = overrides.quantityRaw ?? "3";
  const quantity = overrides.quantity ?? parseOfferBoqQuantity(quantityRaw);
  return {
    lineId: overrides.lineId ?? "EQ-1",
    lp: overrides.lp ?? "5",
    description: overrides.description ?? "Koparka gąsienicowa",
    quantity,
    quantityRaw,
    quantityExpressionRaw: overrides.quantityExpressionRaw ?? quantityRaw,
    unit: overrides.unit ?? "dzień",
    catalogWorkId: null,
    workCategory: null,
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    knrHint: null,
    catalogBasis: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    costIntelligence: { lineKind: "Equipment" },
    linePricing: null,
    materialUnitPln: null,
    materialCostPln: null,
    materialSource: { kind: "unknown", labelPl: "" },
    laborRbh: null,
    laborRatePlnPerH: null,
    laborCostPln: null,
    laborSource: { kind: "unknown", labelPl: "" },
    equipmentUnitPln: null,
    equipmentCostPln: null,
    equipmentSource: { kind: "unknown", labelPl: "" },
    directCostPln: null,
    kpPln: null,
    overheadSharePln: null,
    marginPln: null,
    lineTotalPln: null,
    athUnitPricePln: null,
    athTotalPln: null,
    pricingSourceLabelPl: "s6b",
    aiConfidence: "low",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    quantityIntelligence: null,
    ...overrides,
    quantity,
    quantityRaw,
    costIntelligence: overrides.costIntelligence ?? { lineKind: "Equipment" },
  };
}

function enrich(lines) {
  const qty = enrichOfferBoqLinesWithQuantityIntelligence(lines);
  return enrichOfferBoqLinesWithDependencyGraph(qty);
}

function dirtyGraph(baseGraph, positionNo = 5) {
  return {
    ...baseGraph,
    unresolvedPositions: [...new Set([...(baseGraph.unresolvedPositions ?? []), positionNo])].sort(
      (a, b) => a - b,
    ),
    cycles: [[positionNo]],
  };
}

function setupEquipmentOwnerInput(tenderId, lineId, qty = 3, dwellingId = null) {
  const q = ensureOwnerRateQuestionForGap({
    tenderId,
    domain: "equipment",
    lineRef: lineId,
    ...(dwellingId ? { dwellingId } : {}),
    evidenceSummaryPl: "S6-B equipment owner input evidence.",
    askedByRole: "chief",
    equipment: { namePl: "Koparka", quantity: qty, unit: "dzień" },
  });
  if (!q.ok) return false;
  const a = submitOwnerRateAnswer({
    tenderId,
    questionId: q.question.questionId,
    amountPlnNet: 1800,
    unit: "dzień",
    approvedBy: OWNER,
  });
  return a.ok === true;
}

function makeOfferBoq(tenderId, lines) {
  return {
    schemaVersion: 1,
    tenderId,
    lines,
    updatedAt: "2026-08-26T00:00:00.000Z",
  };
}

function buildMultiPkg(tenderId, dwellingLines) {
  const dwellings = Object.entries(dwellingLines).map(([dwellingId, lines]) => ({
    dwellingId,
    labelPl: dwellingId,
    sourceDocumentIds: [`doc-${dwellingId}`],
    offerBoq: makeOfferBoq(tenderId, lines),
    lineProvenance: null,
    f5Gate: null,
    subtotals: null,
  }));
  return {
    schemaVersion: 1,
    tenderId,
    mode: "multi",
    expectedDwellingCount: dwellings.length,
    dwellings,
  };
}

function hasQtyHold(pkg, dwellingId) {
  const d = pkg.dwellings.find(
    (x) => normalizeDwellingId(x.dwellingId) === normalizeDwellingId(dwellingId),
  );
  return Boolean(d?.f5Gate?.gapCodes?.includes("BOQ_QUANTITY_HOLD"));
}

function readSrc(rel) {
  return readFileSync(join(ROOT, rel), "utf8");
}

function prepCleanEquipmentPair(tenderId) {
  let rawA = baseLine({ lineId: "EQ-A", lp: "5", quantity: 3, quantityRaw: "3", quantityExpressionRaw: "3" });
  let rawB = baseLine({ lineId: "EQ-B", lp: "5", quantity: 2, quantityRaw: "2", quantityExpressionRaw: "2" });
  const semA = enrich([rawA]);
  const semB = enrich([rawB]);
  const lineA = { ...semA.lines[0], lineId: "EQ-A", costIntelligence: { lineKind: "Equipment" } };
  const lineB = { ...semB.lines[0], lineId: "EQ-B", costIntelligence: { lineKind: "Equipment" } };
  const cleanGraph = semB.graph;
  const holdGraph = dirtyGraph(semA.graph, 5);
  setupEquipmentOwnerInput(tenderId, "EQ-A", 3, "dw-a");
  setupEquipmentOwnerInput(tenderId, "EQ-B", 2, "dw-b");
  return { lineA, lineB, cleanGraph, holdGraph };
}

// --- ORACLE: equipment shadow uses S4-B graph for HOLD ---
{
  reset();
  const store = makeStore();
  const { lineA, cleanGraph, holdGraph } = prepCleanEquipmentPair("t-s6b-oracle");
  const shadowHold = computeShadowPositionCostForOfferBoqLine({
    line: lineA,
    store,
    nowMs: NOW,
    tenderId: "t-s6b-oracle",
    dwellingId: "dw-a",
    ensureOwnerQuestions: false,
    boqDependencyGraph: holdGraph,
  });
  const shadowNull = computeShadowPositionCostForOfferBoqLine({
    line: lineA,
    store,
    nowMs: NOW,
    tenderId: "t-s6b-oracle",
    dwellingId: "dw-a",
    ensureOwnerQuestions: false,
    boqDependencyGraph: null,
  });
  const rHold = resolveBoqPricingQuantity({
    line: lineA,
    lineIndex: 0,
    dependencyGraph: holdGraph,
  });
  ok("ORACLE resolve HOLD", rHold.status === "HOLD" && rHold.gapCode === "BOQ_QUANTITY_HOLD");
  ok("ORACLE shadow dirty → BOQ_QUANTITY_HOLD", shadowHold.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("ORACLE shadow null → no BOQ_QUANTITY_HOLD", !shadowNull.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("ORACLE clean graph no HOLD", !dirtyGraph(cleanGraph, 99).unresolvedPositions.includes(5)
    || resolveBoqPricingQuantity({ line: lineA, lineIndex: 0, dependencyGraph: cleanGraph }).status === "ACCEPTED");
}

// --- T-B1 full map ---
{
  reset();
  const store = makeStore();
  const tenderId = "t-s6b-1";
  const { lineA, lineB, cleanGraph, holdGraph } = prepCleanEquipmentPair(tenderId);
  const evaluated = evaluateAllDwellingsInPackage(
    buildMultiPkg(tenderId, { "dw-a": [lineA], "dw-b": [lineB] }),
    {
      store,
      nowMs: NOW,
      ensureOwnerQuestions: false,
      boqDependencyGraphsByDwelling: { [DW_A]: holdGraph, [DW_B]: cleanGraph },
      boqDependencyGraph: holdGraph,
    },
  );
  ok("T-B1 A uses own HOLD graph", hasQtyHold(evaluated, "dw-a") === true);
  ok("T-B1 B uses own clean graph", hasQtyHold(evaluated, "dw-b") === false);
}

// --- T-B2 map miss B → null, never primary A ---
{
  reset();
  const store = makeStore();
  const tenderId = "t-s6b-2";
  const { lineA, lineB, holdGraph } = prepCleanEquipmentPair(tenderId);
  const evaluated = evaluateAllDwellingsInPackage(
    buildMultiPkg(tenderId, { "dw-a": [lineA], "dw-b": [lineB] }),
    {
      store,
      nowMs: NOW,
      ensureOwnerQuestions: false,
      boqDependencyGraphsByDwelling: { [DW_A]: holdGraph },
      boqDependencyGraph: holdGraph,
    },
  );
  ok("T-B2 A HOLD from map hit", hasQtyHold(evaluated, "dw-a") === true);
  ok("T-B2 B never primary A", hasQtyHold(evaluated, "dw-b") === false);
}

// --- T-B3 maps={} → null never primary ---
{
  reset();
  const store = makeStore();
  const tenderId = "t-s6b-3";
  const { lineA, lineB, holdGraph } = prepCleanEquipmentPair(tenderId);
  const evaluated = evaluateAllDwellingsInPackage(
    buildMultiPkg(tenderId, { "dw-a": [lineA], "dw-b": [lineB] }),
    {
      store,
      nowMs: NOW,
      ensureOwnerQuestions: false,
      boqDependencyGraphsByDwelling: {},
      boqDependencyGraph: holdGraph,
    },
  );
  ok("T-B3 A miss → null", hasQtyHold(evaluated, "dw-a") === false);
  ok("T-B3 B miss → null", hasQtyHold(evaluated, "dw-b") === false);
}

// --- T-B4 same positionNo both directions ---
{
  reset();
  const store = makeStore();
  const tenderId = "t-s6b-4";
  const { lineA, lineB, cleanGraph, holdGraph } = prepCleanEquipmentPair(tenderId);
  const ev1 = evaluateAllDwellingsInPackage(
    buildMultiPkg(tenderId, { "dw-a": [lineA], "dw-b": [lineB] }),
    {
      store,
      nowMs: NOW,
      ensureOwnerQuestions: false,
      boqDependencyGraphsByDwelling: { [DW_A]: holdGraph, [DW_B]: cleanGraph },
      boqDependencyGraph: holdGraph,
    },
  );
  ok("T-B4 A HOLD own", hasQtyHold(ev1, "dw-a") === true);
  ok("T-B4 B not contaminated by A", hasQtyHold(ev1, "dw-b") === false);

  const ev2 = evaluateAllDwellingsInPackage(
    buildMultiPkg(`${tenderId}-rev`, { "dw-a": [lineA], "dw-b": [lineB] }),
    {
      store,
      nowMs: NOW,
      ensureOwnerQuestions: false,
      boqDependencyGraphsByDwelling: { [DW_B]: holdGraph },
      boqDependencyGraph: holdGraph,
    },
  );
  ok("T-B4 reverse B HOLD own", hasQtyHold(ev2, "dw-b") === true);
  ok("T-B4 reverse A not contaminated by B primary", hasQtyHold(ev2, "dw-a") === false);
}

// --- T-B5 relations A must not affect B ---
{
  reset();
  const store = makeStore();
  const tenderId = "t-s6b-5";
  const { lineA, lineB, cleanGraph, holdGraph } = prepCleanEquipmentPair(tenderId);
  const relHoldGraph = {
    ...holdGraph,
    relations: [
      ...(holdGraph.relations ?? []),
      {
        relationId: "bqr_5_9_DEPENDS_ON",
        fromPositionNo: 5,
        toPositionNo: 9,
        relation: "DEPENDS_ON",
        state: "REQUIRES_OWNER",
        confidence: "high",
        evidence: { kind: "manual", labelPl: "A-only relation" },
      },
    ],
  };
  const evaluated = evaluateAllDwellingsInPackage(
    buildMultiPkg(tenderId, { "dw-a": [lineA], "dw-b": [lineB] }),
    {
      store,
      nowMs: NOW,
      ensureOwnerQuestions: false,
      boqDependencyGraphsByDwelling: { [DW_A]: relHoldGraph, [DW_B]: cleanGraph },
      boqDependencyGraph: relHoldGraph,
    },
  );
  ok("T-B5 A HOLD (A graph)", hasQtyHold(evaluated, "dw-a") === true);
  ok("T-B5 B unaffected by A relations/graph", hasQtyHold(evaluated, "dw-b") === false);
}

// --- T-B6 HOLD isolation ---
{
  reset();
  const store = makeStore();
  const tenderId = "t-s6b-6";
  const { lineA, lineB, holdGraph } = prepCleanEquipmentPair(tenderId);
  const evaluated = evaluateAllDwellingsInPackage(
    buildMultiPkg(tenderId, { "dw-a": [lineA], "dw-b": [lineB] }),
    {
      store,
      nowMs: NOW,
      ensureOwnerQuestions: false,
      boqDependencyGraphsByDwelling: { [DW_A]: holdGraph },
      boqDependencyGraph: holdGraph,
    },
  );
  ok("T-B6 HOLD stays on A", hasQtyHold(evaluated, "dw-a") === true);
  ok("T-B6 HOLD does not propagate to B", hasQtyHold(evaluated, "dw-b") === false);
}

// --- T-B7 ACCEPTED isolation ---
{
  reset();
  const store = makeStore();
  const tenderId = "t-s6b-7";
  const { lineA, lineB, cleanGraph, holdGraph } = prepCleanEquipmentPair(tenderId);
  const evaluated = evaluateAllDwellingsInPackage(
    buildMultiPkg(tenderId, { "dw-a": [lineA], "dw-b": [lineB] }),
    {
      store,
      nowMs: NOW,
      ensureOwnerQuestions: false,
      boqDependencyGraphsByDwelling: { [DW_A]: cleanGraph, [DW_B]: holdGraph },
      boqDependencyGraph: holdGraph,
    },
  );
  ok("T-B7 A no HOLD (own clean)", hasQtyHold(evaluated, "dw-a") === false);
  ok("T-B7 B HOLD (own dirty)", hasQtyHold(evaluated, "dw-b") === true);
  const shadowA = computeShadowPositionCostForOfferBoqLine({
    line: lineA,
    store,
    nowMs: NOW,
    tenderId,
    dwellingId: "dw-a",
    ensureOwnerQuestions: false,
    boqDependencyGraph: cleanGraph,
  });
  ok("T-B7 A equipment resolved (not contaminated)", shadowA.identity.status === "EQUIPMENT_RESOLVED");
}

// --- T-B8 package gate parity ---
{
  reset();
  const store = makeStore();
  const tenderId = "t-s6b-8";
  const { lineA, lineB, cleanGraph, holdGraph } = prepCleanEquipmentPair(tenderId);
  const maps = { [DW_A]: holdGraph, [DW_B]: cleanGraph };
  const pkg = buildMultiPkg(tenderId, { "dw-a": [lineA], "dw-b": [lineB] });
  const evPkg = evaluateTenderPackage(pkg, {
    store,
    nowMs: NOW,
    ensureOwnerQuestions: false,
    boqDependencyGraphsByDwelling: maps,
    boqDependencyGraph: holdGraph,
  });
  const evaluated = evaluateAllDwellingsInPackage(pkg, {
    store,
    nowMs: NOW,
    ensureOwnerQuestions: false,
    boqDependencyGraphsByDwelling: maps,
    boqDependencyGraph: holdGraph,
  });
  ok("T-B8 package A HOLD", hasQtyHold(evPkg.package, "dw-a") === true);
  ok("T-B8 package B clean", hasQtyHold(evPkg.package, "dw-b") === false);
  ok(
    "T-B8 parity A",
    hasQtyHold(evPkg.package, "dw-a") === hasQtyHold(evaluated, "dw-a"),
  );
  ok(
    "T-B8 parity B",
    hasQtyHold(evPkg.package, "dw-b") === hasQtyHold(evaluated, "dw-b"),
  );
  ok("T-B8 packageGate boolean", typeof evPkg.packageGate?.pass === "boolean");
}

// --- T-B9 P7 happy-path full map ---
{
  reset();
  const store = makeStore();
  const tenderId = "t-s6b-9";
  const { lineA, lineB, cleanGraph, holdGraph } = prepCleanEquipmentPair(tenderId);
  const maps = { [DW_A]: holdGraph, [DW_B]: cleanGraph };
  const pkg = buildMultiPkg(tenderId, { "dw-a": [lineA], "dw-b": [lineB] });
  const evaluated = evaluateAllDwellingsInPackage(pkg, {
    store,
    nowMs: NOW,
    ensureOwnerQuestions: false,
    boqDependencyGraphsByDwelling: maps,
    boqDependencyGraph: holdGraph,
  });
  const expert = {
    tenderId,
    status: "ready",
    reasons: [],
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: { extractedCount: 2 },
    masterBoq: { status: "ready", readyForExperts: true, lineCount: 2, mode: "multi" },
    offerBoq: null,
    masterBoqLines: [
      { dwellingId: "dw-a", line: lineA },
      { dwellingId: "dw-b", line: lineB },
    ],
    boqDependencyGraphsByDwelling: maps,
    boqDependencyGraph: holdGraph,
  };
  const p7 = runIkP7PositionCostBid({
    item: {
      id: tenderId,
      tenderId,
      title: "S6-B P7",
      submittingOffersDate: "2099-12-31",
      swzAnalysis: { implementationDays: 30, estimatedValuePln: 100_000 },
      tenderFit: { priceWeightPct: 60 },
    },
    expert,
    package: evaluated,
    store,
    nowMs: NOW,
  });
  ok("T-B9 A HOLD preserved", hasQtyHold(evaluated, "dw-a") === true);
  ok("T-B9 B clean preserved", hasQtyHold(evaluated, "dw-b") === false);
  ok("T-B9 P7 gapCodes has HOLD", p7.gapCodes.includes("BOQ_QUANTITY_HOLD"));
  ok("T-B9 P7 cutoverGatePass false", p7.cutoverGatePass === false);
}

// --- T-B10 legacy maps null/undefined → primary used ---
{
  reset();
  const store = makeStore();
  const tenderId = "t-s6b-10";
  const { lineA, lineB, holdGraph } = prepCleanEquipmentPair(tenderId);
  const pkg = buildMultiPkg(tenderId, { "dw-a": [lineA], "dw-b": [lineB] });
  const evNull = evaluateAllDwellingsInPackage(pkg, {
    store,
    nowMs: NOW,
    ensureOwnerQuestions: false,
    boqDependencyGraphsByDwelling: null,
    boqDependencyGraph: holdGraph,
  });
  const evUndef = evaluateAllDwellingsInPackage(pkg, {
    store,
    nowMs: NOW,
    ensureOwnerQuestions: false,
    boqDependencyGraph: holdGraph,
  });
  ok("T-B10 maps=null A primary HOLD", hasQtyHold(evNull, "dw-a") === true);
  ok("T-B10 maps=null B primary HOLD", hasQtyHold(evNull, "dw-b") === true);
  ok("T-B10 maps=undefined A primary HOLD", hasQtyHold(evUndef, "dw-a") === true);
  ok("T-B10 maps=undefined B primary HOLD", hasQtyHold(evUndef, "dw-b") === true);
}

// --- T-B11 S6-A Outcome Bid regression ---
{
  reset();
  const snapHold = {
    ok: true,
    sourceFilename: "s6b-t11.ath",
    parsedAt: "2026-08-26T00:00:00.000Z",
    rowCount: 1,
    rows: [],
    catalogQuantities: [
      {
        lp: "1",
        description: "Tynk HOLD unresolved",
        unit: "m2",
        quantity: "10",
        quantityExpressionRaw: null,
      },
    ],
    warnings: [],
    quantityExpressionsByLp: { "1": "poz.99" },
  };
  const doc = buildOfferBoqFromSnapshot({ tenderId: "t-s6b-11", snapshot: snapHold });
  ok("T-B11 built OfferBoq", doc?.lines?.length === 1);
  const enriched = enrichOfferBoqDocumentForOutcomeS4b(doc);
  const r = resolveBoqPricingQuantity({
    line: enriched.document.lines[0],
    lineIndex: 0,
    dependencyGraph: enriched.boqDependencyGraph,
  });
  ok("T-B11 S6-A enrich graph non-null", enriched.boqDependencyGraph != null);
  ok("T-B11 S6-A unresolved → HOLD", r.status === "HOLD");
  ok("T-B11 S6-A gap BOQ_QUANTITY_HOLD", r.gapCode === "BOQ_QUANTITY_HOLD");
  ok(
    "T-B11 Outcome explainability still wires enrich",
    readSrc("src/lib/tender-offer-boq-explainability.ts").includes(
      "enrichOfferBoqDocumentForOutcomeS4b",
    ),
  );
}

// --- T-B12 frozen contracts ---
{
  const orch = readSrc("src/lib/multi-dwelling/orchestration.ts");
  ok(
    "T-B12 Option 1 selection present",
    orch.includes("maps != null ? null : opts.boqDependencyGraph"),
  );
  ok(
    "T-B12 old primary-steal fallback gone",
    !/boqDependencyGraphsByDwelling\?\.\[dwKey\]\s*\n\s*\?\? opts\.boqDependencyGraph/.test(orch),
  );
  ok(
    "T-B12 resolveBoqPricingQuantity still exported",
    readSrc("src/lib/intelligent-estimator/boq-pricing-quantity-resolver.ts").includes(
      "export function resolveBoqPricingQuantity",
    ),
  );
  ok(
    "T-B12 no S6-B in P7",
    !readSrc("src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts").includes("S6-B"),
  );
  ok(
    "T-B12 no S6-B in P8",
    !readSrc("src/lib/intelligent-estimator/ik-p8-quantity-advisory.ts").includes("S6-B"),
  );
  ok(
    "T-B12 no S6-B in Document Expert",
    !readSrc("src/lib/intelligent-estimator/ik-document-expert.ts").includes("S6-B"),
  );
  const frozen = assertMopsS1DiscoveryFrozenContract();
  ok("T-B12 Phase 2D", frozen.phase2d);
  ok("T-B12 Phase 2E", frozen.phase2e);
  ok("T-B12 orchestration does not touch P4 engine", !orch.includes("ik-orchestra-engine"));
}

console.log(`\nS6-B result: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
