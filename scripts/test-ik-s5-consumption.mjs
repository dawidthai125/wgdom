/**
 * IK S5 — Equipment/Transport S4-B gate (S5-A) + multi P7 gapCodes (S5-C).
 * npx vite-node scripts/test-ik-s5-consumption.mjs
 */

import {
  clearOwnerRateInputStore,
  ensureOwnerRateQuestionForGap,
  submitOwnerRateAnswer,
} from "../src/lib/owner-rate-input/index.ts";
import {
  enrichOfferBoqLinesWithQuantityIntelligence,
} from "../src/lib/intelligent-estimator/boq-quantity-intelligence.ts";
import {
  enrichOfferBoqLinesWithDependencyGraph,
} from "../src/lib/intelligent-estimator/boq-dependency-graph.ts";
import { resolveBoqPricingQuantity } from "../src/lib/intelligent-estimator/boq-pricing-quantity-resolver.ts";
import { runIkP7PositionCostBid } from "../src/lib/intelligent-estimator/ik-p7-position-cost-bid.ts";
import { evaluateAllDwellingsInPackage } from "../src/lib/multi-dwelling/orchestration.ts";
import { normalizeDwellingId } from "../src/lib/multi-dwelling/constants.ts";
import { parseOfferBoqQuantity } from "../src/lib/tender-offer-boq.ts";
import {
  clearTransportBidCandidateStore,
  computeShadowPositionCostForOfferBoqLine,
  computeShadowPositionCostsForOfferBoq,
  evaluateBidCutoverGate,
  markTransportBidCandidate,
} from "../src/lib/tender-position-cost/index.ts";
import { normalizeWorkCatalogStore } from "../src/lib/work-catalog/index.ts";
import { assertMopsS1DiscoveryFrozenContract } from "../src/lib/intelligent-estimator/ik-mops-identity-bridge-audit.ts";

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

const OWNER = { userId: "owner-s5", displayName: "Owner S5" };
const NOW = Date.parse("2026-08-26T08:00:00.000Z");
const TENDER = "t-s5";

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
    lineId: overrides.lineId ?? "L1",
    lp: overrides.lp ?? "1",
    description: overrides.description ?? "test line",
    quantity,
    quantityRaw,
    quantityExpressionRaw: overrides.quantityExpressionRaw ?? null,
    unit: overrides.unit ?? "dzień",
    catalogWorkId: overrides.catalogWorkId ?? null,
    workCategory: null,
    categoryId: null,
    isNoise: false,
    noiseKind: null,
    normalizedDescription: null,
    aliasRuleId: null,
    knrHint: null,
    catalogBasis: null,
    matchMethod: overrides.matchMethod ?? "unmatched",
    matchedBy: overrides.matchedBy ?? "unmatched",
    matchConfidence: overrides.matchConfidence ?? "low",
    candidateMatches: [],
    costIntelligence: overrides.costIntelligence ?? null,
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
    pricingSourceLabelPl: "t",
    aiConfidence: "low",
    aiRationale: null,
    userEdited: false,
    editedFields: [],
    warnings: [],
    quantityIntelligence: null,
    ...overrides,
    quantity,
    quantityRaw,
  };
}

function eqLine(over = {}) {
  return baseLine({
    lineId: "EQ-KOP",
    lp: "1",
    description: "Koparka gąsienicowa",
    quantity: 3,
    quantityRaw: "3",
    unit: "dzień",
    catalogWorkId: null,
    matchMethod: "unmatched",
    matchConfidence: "low",
    costIntelligence: { lineKind: "Equipment" },
    ...over,
  });
}

function trLine(over = {}) {
  return baseLine({
    lineId: "TR-GRUZ",
    lp: "2",
    description: "Transport gruzu kontenerem",
    quantity: 4,
    quantityRaw: "4",
    unit: "dzień",
    catalogWorkId: null,
    costIntelligence: { lineKind: "Unknown" },
    ...over,
  });
}

function enrich(lines) {
  const qty = enrichOfferBoqLinesWithQuantityIntelligence(lines);
  return enrichOfferBoqLinesWithDependencyGraph(qty);
}

function setupEquipmentOwnerInput(tenderId, lineId, qty = 3, dwellingId = null) {
  const q = ensureOwnerRateQuestionForGap({
    tenderId,
    domain: "equipment",
    lineRef: lineId,
    ...(dwellingId ? { dwellingId } : {}),
    evidenceSummaryPl: "S5 equipment owner input evidence.",
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

function setupTransportOwnerInput(tenderId, lineId, qty = 4, dwellingId = null) {
  const q = ensureOwnerRateQuestionForGap({
    tenderId,
    domain: "transport",
    lineRef: lineId,
    ...(dwellingId ? { dwellingId } : {}),
    evidenceSummaryPl: "S5 transport owner input evidence.",
    askedByRole: "chief",
    transport: { namePl: "Transport", quantity: qty, unit: "dzień" },
  });
  if (!q.ok) return false;
  const a = submitOwnerRateAnswer({
    tenderId,
    questionId: q.question.questionId,
    amountPlnNet: 900,
    unit: "dzień",
    approvedBy: OWNER,
  });
  return a.ok === true;
}

function makeOfferBoqShell(tenderId, lines) {
  return {
    schemaVersion: 5,
    tenderId,
    version: 1,
    builtAt: "2026-08-26T00:00:00.000Z",
    parserSnapshotRef: {
      kosztorysParsedAt: null,
      sourceFilename: null,
      rowCount: lines.length,
      pdfPrzedmiarCase: null,
    },
    lines,
    totals: {
      materialsPln: null,
      laborPln: null,
      equipmentPln: null,
      directPln: null,
      kpPln: null,
      overheadPln: null,
      costPricePln: null,
      marginPln: null,
      recommendedBidPln: null,
      profitPln: null,
      profitabilityPct: null,
      estimatedDurationDays: null,
      workingCapitalPln: null,
      lineCount: lines.length,
      pricedLineCount: 0,
    },
    recomputeToken: "rt",
    buildStatus: "structural_only",
    mappingStats: null,
    mappingAppliedAt: null,
    costIntelligenceStats: null,
    costIntelligenceAppliedAt: null,
    pricingStats: null,
    pricingAppliedAt: null,
    userEditStats: null,
    warnings: [],
  };
}

function shadowLine(line, graph, tenderId = TENDER, dwellingId = null) {
  return computeShadowPositionCostForOfferBoqLine({
    line,
    store: makeStore(),
    nowMs: NOW,
    tenderId,
    dwellingId,
    ensureOwnerQuestions: false,
    boqDependencyGraph: graph,
  });
}

// --- T-A1 Equipment HOLD ---
{
  reset();
  let line = eqLine({ quantityExpressionRaw: "poz.99" });
  const sem = enrich([line]);
  line = { ...sem.lines[0], costIntelligence: { lineKind: "Equipment" } };
  ok("T-A1 setup owner", setupEquipmentOwnerInput(TENDER, "EQ-KOP", 3));
  const shadow = shadowLine(line, sem.graph);
  ok("T-A1 BOQ_QUANTITY_HOLD", shadow.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("T-A1 no equipment totalPln", shadow.equipment?.totalPln == null);
  ok("T-A1 EQUIPMENT_GAP identity", shadow.identity.status === "EQUIPMENT_GAP");
}

// --- T-A2 Transport HOLD ---
{
  reset();
  let line = trLine({ quantityExpressionRaw: "poz.99" });
  const sem = enrich([line]);
  line = sem.lines[0];
  markTransportBidCandidate({ tenderId: TENDER, lineId: "TR-GRUZ", markedByRole: "admin" });
  ok("T-A2 setup owner", setupTransportOwnerInput(TENDER, "TR-GRUZ", 4));
  const shadow = shadowLine(line, sem.graph);
  ok("T-A2 BOQ_QUANTITY_HOLD", shadow.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("T-A2 no transport totalPln", shadow.transport?.totalPln == null);
}

// --- T-A3 Equipment ACCEPTED ---
{
  reset();
  let line = eqLine({ quantity: 3, quantityRaw: "3", quantityExpressionRaw: "3" });
  const sem = enrich([line]);
  line = { ...sem.lines[0], costIntelligence: { lineKind: "Equipment" } };
  const qtyRes = resolveBoqPricingQuantity({ line, dependencyGraph: sem.graph });
  ok("T-A3 S4-B ACCEPTED", qtyRes.status === "ACCEPTED");
  ok("T-A3 setup owner", setupEquipmentOwnerInput(TENDER, "EQ-KOP", 3));
  const shadow = shadowLine(line, sem.graph);
  ok("T-A3 no BOQ_QUANTITY_HOLD", !shadow.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("T-A3 EQUIPMENT_RESOLVED", shadow.identity.status === "EQUIPMENT_RESOLVED");
  ok("T-A3 equipment totalPln 5400", shadow.equipment?.totalPln === 5400);
}

// --- T-A4 Transport ACCEPTED ---
{
  reset();
  let line = trLine({ quantity: 4, quantityRaw: "4", quantityExpressionRaw: "4" });
  const sem = enrich([line]);
  line = sem.lines[0];
  markTransportBidCandidate({ tenderId: TENDER, lineId: "TR-GRUZ", markedByRole: "admin" });
  const qtyRes = resolveBoqPricingQuantity({ line, dependencyGraph: sem.graph });
  ok("T-A4 S4-B ACCEPTED", qtyRes.status === "ACCEPTED");
  ok("T-A4 setup owner", setupTransportOwnerInput(TENDER, "TR-GRUZ", 4));
  const shadow = shadowLine(line, sem.graph);
  ok("T-A4 no BOQ_QUANTITY_HOLD", !shadow.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("T-A4 TRANSPORT_RESOLVED", shadow.identity.status === "TRANSPORT_RESOLVED");
  ok("T-A4 transport totalPln 3600", shadow.transport?.totalPln === 3600);
}

// --- T-A5 Equipment FALLBACK ---
{
  reset();
  const line = eqLine({ quantityIntelligence: null, quantityExpressionRaw: null });
  ok("T-A5 S4-B FALLBACK", resolveBoqPricingQuantity({ line }).status === "FALLBACK");
  ok("T-A5 setup owner", setupEquipmentOwnerInput(TENDER, "EQ-KOP", 3));
  const shadow = shadowLine(line, null);
  ok("T-A5 no BOQ_QUANTITY_HOLD", !shadow.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("T-A5 EQUIPMENT_RESOLVED", shadow.identity.status === "EQUIPMENT_RESOLVED");
  ok("T-A5 equipment totalPln 5400", shadow.equipment?.totalPln === 5400);
}

// --- T-A6 Transport FALLBACK ---
{
  reset();
  const line = trLine({ quantityIntelligence: null, quantityExpressionRaw: null });
  markTransportBidCandidate({ tenderId: TENDER, lineId: "TR-GRUZ", markedByRole: "admin" });
  ok("T-A6 S4-B FALLBACK", resolveBoqPricingQuantity({ line }).status === "FALLBACK");
  ok("T-A6 setup owner", setupTransportOwnerInput(TENDER, "TR-GRUZ", 4));
  const shadow = shadowLine(line, null);
  ok("T-A6 no BOQ_QUANTITY_HOLD", !shadow.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("T-A6 TRANSPORT_RESOLVED", shadow.identity.status === "TRANSPORT_RESOLVED");
  ok("T-A6 transport totalPln 3600", shadow.transport?.totalPln === 3600);
}

// --- T-A7 legacy equipment HOLD gate fail ---
{
  reset();
  let line = eqLine({ quantityExpressionRaw: "poz.99" });
  const sem = enrich([line]);
  line = { ...sem.lines[0], costIntelligence: { lineKind: "Equipment" } };
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: { schemaVersion: 1, tenderId: TENDER, lines: [line], updatedAt: "2026-08-26T00:00:00.000Z" },
    store: makeStore(),
    nowMs: NOW,
    tenderId: TENDER,
    ensureOwnerQuestions: false,
    boqDependencyGraph: sem.graph,
  });
  const gate = evaluateBidCutoverGate(shadow);
  ok("T-A7 legacy HOLD gap", shadow.lines[0].gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("T-A7 legacy gate FAIL", gate.pass === false);
}

// --- T-A8 legacy transport HOLD gate fail ---
{
  reset();
  let line = trLine({ quantityExpressionRaw: "poz.99" });
  const sem = enrich([line]);
  line = sem.lines[0];
  markTransportBidCandidate({ tenderId: TENDER, lineId: "TR-GRUZ", markedByRole: "admin" });
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: { schemaVersion: 1, tenderId: TENDER, lines: [line], updatedAt: "2026-08-26T00:00:00.000Z" },
    store: makeStore(),
    nowMs: NOW,
    tenderId: TENDER,
    ensureOwnerQuestions: false,
    boqDependencyGraph: sem.graph,
  });
  const gate = evaluateBidCutoverGate(shadow);
  ok("T-A8 legacy HOLD gap", shadow.lines[0].gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("T-A8 legacy gate FAIL", gate.pass === false);
}

// --- T-A9 multi equipment isolation ---
{
  reset();
  const store = makeStore();
  let lineA = eqLine({
    lineId: "EQ-A",
    quantityExpressionRaw: "poz.99",
  });
  let lineB = eqLine({
    lineId: "EQ-B",
    quantity: 2,
    quantityRaw: "2",
    quantityExpressionRaw: "2",
  });
  const semA = enrich([lineA]);
  const semB = enrich([lineB]);
  lineA = { ...semA.lines[0], lineId: "EQ-A", costIntelligence: { lineKind: "Equipment" } };
  lineB = { ...semB.lines[0], lineId: "EQ-B", costIntelligence: { lineKind: "Equipment" } };
  setupEquipmentOwnerInput(TENDER, "EQ-B", 2, "dw-b");
  const shadowA = computeShadowPositionCostForOfferBoqLine({
    line: lineA,
    store,
    nowMs: NOW,
    tenderId: TENDER,
    dwellingId: "dw-a",
    ensureOwnerQuestions: false,
    boqDependencyGraph: semA.graph,
  });
  const shadowB = computeShadowPositionCostForOfferBoqLine({
    line: lineB,
    store,
    nowMs: NOW,
    tenderId: TENDER,
    dwellingId: "dw-b",
    ensureOwnerQuestions: false,
    boqDependencyGraph: semB.graph,
  });
  ok("T-A9 A HOLD", shadowA.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("T-A9 A no equipment total", shadowA.equipment?.totalPln == null);
  ok("T-A9 B RESOLVED", shadowB.identity.status === "EQUIPMENT_RESOLVED");
  ok("T-A9 B total 3600", shadowB.equipment?.totalPln === 3600);
}

// --- T-A10 multi transport isolation ---
{
  reset();
  const store = makeStore();
  let lineA = trLine({ lineId: "TR-A", quantityExpressionRaw: "poz.99" });
  let lineB = trLine({
    lineId: "TR-B",
    quantity: 2,
    quantityRaw: "2",
    quantityExpressionRaw: "2",
  });
  const semA = enrich([lineA]);
  const semB = enrich([lineB]);
  lineA = { ...semA.lines[0], lineId: "TR-A" };
  lineB = { ...semB.lines[0], lineId: "TR-B" };
  markTransportBidCandidate({ tenderId: TENDER, lineId: "TR-A", markedByRole: "admin", dwellingId: "dw-a" });
  markTransportBidCandidate({ tenderId: TENDER, lineId: "TR-B", markedByRole: "admin", dwellingId: "dw-b" });
  setupTransportOwnerInput(TENDER, "TR-B", 2, "dw-b");
  const shadowA = computeShadowPositionCostForOfferBoqLine({
    line: lineA,
    store,
    nowMs: NOW,
    tenderId: TENDER,
    dwellingId: "dw-a",
    ensureOwnerQuestions: false,
    boqDependencyGraph: semA.graph,
  });
  const shadowB = computeShadowPositionCostForOfferBoqLine({
    line: lineB,
    store,
    nowMs: NOW,
    tenderId: TENDER,
    dwellingId: "dw-b",
    ensureOwnerQuestions: false,
    boqDependencyGraph: semB.graph,
  });
  ok("T-A10 A HOLD", shadowA.gaps.includes("BOQ_QUANTITY_HOLD"));
  ok("T-A10 A no transport total", shadowA.transport?.totalPln == null);
  ok("T-A10 B RESOLVED", shadowB.identity.status === "TRANSPORT_RESOLVED");
  ok("T-A10 B total 1800", shadowB.transport?.totalPln === 1800);
}

// --- S5-C multi P7 helpers ---
function buildMultiPkg(tenderId, dwellingLines) {
  const dwellings = Object.entries(dwellingLines).map(([dwellingId, spec]) => ({
    dwellingId,
    labelPl: dwellingId,
    sourceDocumentIds: [`doc-${dwellingId}`],
    offerBoq: makeOfferBoqShell(tenderId, spec.lines),
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

function runMultiP7(tenderId, pkg, graphsByDwelling, masterBoqLines) {
  const store = makeStore();
  const evaluated = evaluateAllDwellingsInPackage(pkg, {
    store,
    nowMs: NOW,
    ensureOwnerQuestions: false,
    boqDependencyGraphsByDwelling: graphsByDwelling,
  });
  const item = {
    id: tenderId,
    tenderId,
    title: "S5 multi P7",
    submittingOffersDate: "2099-12-31",
    swzAnalysis: { implementationDays: 30, estimatedValuePln: 100_000 },
    tenderFit: { priceWeightPct: 60 },
  };
  const expert = {
    tenderId,
    status: "ready",
    reasons: [],
    documents: [],
    costDocuments: [],
    przedmiary: [],
    extraction: { extractedCount: masterBoqLines.length },
    masterBoq: {
      status: "ready",
      readyForExperts: true,
      lineCount: masterBoqLines.length,
      mode: "multi",
    },
    offerBoq: null,
    masterBoqLines,
    boqDependencyGraphsByDwelling: graphsByDwelling,
  };
  const p7 = runIkP7PositionCostBid({
    item,
    expert,
    package: evaluated,
    store,
    nowMs: NOW,
  });
  return { p7, evaluated, store };
}

// --- T-C1 multi P7 gapCodes contains BOQ_QUANTITY_HOLD ---
{
  reset();
  const tenderId = "t-s5-c1";
  let holdLine = eqLine({ lineId: "EQ-H", quantityExpressionRaw: "poz.99" });
  let okLine = eqLine({
    lineId: "EQ-OK",
    quantity: 2,
    quantityRaw: "2",
    quantityExpressionRaw: "2",
  });
  const semA = enrich([holdLine]);
  const semB = enrich([okLine]);
  holdLine = { ...semA.lines[0], lineId: "EQ-H", costIntelligence: { lineKind: "Equipment" } };
  okLine = { ...semB.lines[0], lineId: "EQ-OK", costIntelligence: { lineKind: "Equipment" } };
  setupEquipmentOwnerInput(tenderId, "EQ-OK", 2);
  const graphs = {
    [normalizeDwellingId("dw-a")]: semA.graph,
    [normalizeDwellingId("dw-b")]: semB.graph,
  };
  const pkg = buildMultiPkg(tenderId, {
    "dw-a": { lines: [holdLine] },
    "dw-b": { lines: [okLine] },
  });
  const master = [
    { dwellingId: "dw-a", line: holdLine },
    { dwellingId: "dw-b", line: okLine },
  ];
  const { p7, evaluated } = runMultiP7(tenderId, pkg, graphs, master);
  ok(
    "T-C1 per-dwelling A has BOQ_QUANTITY_HOLD",
    evaluated.dwellings[0].f5Gate?.gapCodes?.includes("BOQ_QUANTITY_HOLD"),
  );
  ok("T-C1 P7 gapCodes includes BOQ_QUANTITY_HOLD", p7.gapCodes.includes("BOQ_QUANTITY_HOLD"));
}

// --- T-C2 gate observability only ---
{
  reset();
  const tenderId = "t-s5-c2";
  let holdLine = eqLine({ lineId: "EQ-H2", quantityExpressionRaw: "poz.99" });
  const sem = enrich([holdLine]);
  holdLine = { ...sem.lines[0], lineId: "EQ-H2", costIntelligence: { lineKind: "Equipment" } };
  const graphs = { [normalizeDwellingId("dw-a")]: sem.graph };
  const pkg = buildMultiPkg(tenderId, { "dw-a": { lines: [holdLine] } });
  const master = [{ dwellingId: "dw-a", line: holdLine }];
  const { p7, evaluated } = runMultiP7(tenderId, pkg, graphs, master);
  const cutoverPass = evaluated.dwellings.every(
    (d) => !d.offerBoq?.lines?.length || d.f5Gate?.pass === true,
  );
  ok("T-C2 cutoverGatePass matches f5Gate", p7.cutoverGatePass === cutoverPass);
  ok("T-C2 cutoverGatePass false on HOLD", p7.cutoverGatePass === false);
  ok("T-C2 packageGatePass is boolean", typeof p7.packageGatePass === "boolean");
  ok("T-C2 bidOk false when gate fails", p7.bidOk === false);
}

// --- T-C3 proposal/Bid semantics unchanged (blocked when gate fails) ---
{
  reset();
  const tenderId = "t-s5-c3";
  let holdLine = eqLine({ lineId: "EQ-H3", quantityExpressionRaw: "poz.99" });
  const sem = enrich([holdLine]);
  holdLine = { ...sem.lines[0], lineId: "EQ-H3", costIntelligence: { lineKind: "Equipment" } };
  const graphs = { [normalizeDwellingId("dw-a")]: sem.graph };
  const pkg = buildMultiPkg(tenderId, { "dw-a": { lines: [holdLine] } });
  const master = [{ dwellingId: "dw-a", line: holdLine }];
  const { p7 } = runMultiP7(tenderId, pkg, graphs, master);
  ok("T-C3 proposal.ok false", p7.proposal?.ok === false);
  ok("T-C3 recommendedBidPln null", p7.recommendedBidPln == null);
  ok("T-C3 directPln null", p7.directPln == null);
}

// --- T-C4 dedup gapCodes ---
{
  reset();
  const tenderId = "t-s5-c4";
  let holdA = eqLine({ lineId: "EQ-A4", quantityExpressionRaw: "poz.99" });
  let holdB = eqLine({ lineId: "EQ-B4", lp: "2", quantityExpressionRaw: "poz.88" });
  const semA = enrich([holdA]);
  const semB = enrich([holdB]);
  holdA = { ...semA.lines[0], lineId: "EQ-A4", costIntelligence: { lineKind: "Equipment" } };
  holdB = { ...semB.lines[0], lineId: "EQ-B4", costIntelligence: { lineKind: "Equipment" } };
  const graphs = {
    [normalizeDwellingId("dw-a")]: semA.graph,
    [normalizeDwellingId("dw-b")]: semB.graph,
  };
  const pkg = buildMultiPkg(tenderId, {
    "dw-a": { lines: [holdA] },
    "dw-b": { lines: [holdB] },
  });
  const master = [
    { dwellingId: "dw-a", line: holdA },
    { dwellingId: "dw-b", line: holdB },
  ];
  const { p7 } = runMultiP7(tenderId, pkg, graphs, master);
  const holdCount = p7.gapCodes.filter((c) => c === "BOQ_QUANTITY_HOLD").length;
  ok("T-C4 dedup BOQ_QUANTITY_HOLD once", holdCount === 1);
}

// --- T-C5 deterministic gapCodes ordering ---
{
  reset();
  const tenderId = "t-s5-c5";
  let holdLine = eqLine({ lineId: "EQ-H5", quantityExpressionRaw: "poz.99" });
  let gapLine = eqLine({ lineId: "EQ-G5", quantityExpressionRaw: "3", quantityRaw: "3", quantity: 3 });
  const semA = enrich([holdLine]);
  const semB = enrich([gapLine]);
  holdLine = { ...semA.lines[0], lineId: "EQ-H5", costIntelligence: { lineKind: "Equipment" } };
  gapLine = { ...semB.lines[0], lineId: "EQ-G5", costIntelligence: { lineKind: "Equipment" } };
  const graphs = {
    [normalizeDwellingId("dw-a")]: semA.graph,
    [normalizeDwellingId("dw-b")]: semB.graph,
  };
  const pkg = buildMultiPkg(tenderId, {
    "dw-a": { lines: [holdLine] },
    "dw-b": { lines: [gapLine] },
  });
  const master = [
    { dwellingId: "dw-a", line: holdLine },
    { dwellingId: "dw-b", line: gapLine },
  ];
  const { p7 } = runMultiP7(tenderId, pkg, graphs, master);
  const sorted = [...p7.gapCodes].sort((a, b) => a.localeCompare(b));
  ok("T-C5 gapCodes sorted", JSON.stringify(p7.gapCodes) === JSON.stringify(sorted));
  ok(
    "T-C5 BOQ before EQUIPMENT_OUT_OF_SCOPE lex",
    p7.gapCodes.indexOf("BOQ_QUANTITY_HOLD") < p7.gapCodes.indexOf("EQUIPMENT_OUT_OF_SCOPE"),
  );
}

// --- T-FROZEN ---
{
  const frozen = assertMopsS1DiscoveryFrozenContract();
  ok("T-FROZEN BY_FAMILY empty", Object.keys(frozen.byFamily ?? {}).length === 0);
  ok("T-FROZEN EDGE empty", (frozen.edge ?? []).length === 0);
  ok("T-FROZEN catalogVerified false", frozen.catalogVerifiedFalse === true);
}

console.log(`\n=== IK S5 CONSUMPTION SUMMARY: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
