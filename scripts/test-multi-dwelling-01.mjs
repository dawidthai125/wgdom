/**
 * MULTI-DWELLING-01 — package of dwellings · identity · PackageGate harness.
 *
 * npx vite-node scripts/test-multi-dwelling-01.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  clearOwnerRateInputStore,
  createOwnerRateQuestion,
  DEFAULT_DWELLING_ID,
  ensureOwnerRateQuestionForGap,
  findOwnerInputForLine,
  submitOwnerRateAnswer,
} from "../src/lib/owner-rate-input/index.ts";
import {
  buildOfferBoqLineId,
} from "../src/lib/tender-offer-boq.ts";
import {
  clearTransportBidCandidateStore,
  evaluateBidCutoverGate,
  isTransportBidCandidate,
  markTransportBidCandidate,
  computeShadowPositionCostsForOfferBoq,
} from "../src/lib/tender-position-cost/index.ts";
import {
  aggregatePackageDirect,
  attachOfferBoqToDwelling,
  buildOfferBoqLineIdWithDwelling,
  clearMultiDwellingPackageStore,
  computePackageBidProposal,
  confirmDwelling,
  enableMultiDwellingMode,
  evaluatePackageGate,
  evaluateTenderPackage,
  getTenderPackage,
  hintDwellingCountFromDocumentIds,
  mapDocumentToDwelling,
  setExpectedDwellingCount,
  upsertTenderPackage,
} from "../src/lib/multi-dwelling/index.ts";
import { defaultCostModel } from "../src/lib/tenders-bzp-company.ts";
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
    Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  },
};

let fetchCalls = 0;
globalThis.fetch = async () => {
  fetchCalls += 1;
  throw new Error("UNEXPECTED_LIVE_FETCH");
};

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name, extra ?? "");
  }
}
function eq(name, a, b) {
  ok(name, Object.is(a, b), { a, b });
}

function reset() {
  clearOwnerRateInputStore();
  clearTransportBidCandidateStore();
  clearMultiDwellingPackageStore();
  Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  fetchCalls = 0;
}

const OWNER = { userId: "owner-dawid", displayName: "Dawid" };
const NOW = Date.parse("2026-08-13T10:00:00.000Z");
const T_FRESH = "2026-08-12T12:00:00.000Z";
const TID = "tender-MD-01";

function makeStore() {
  return normalizeWorkCatalogStore({
    schemaVersion: 4,
    activeRegion: "wroclaw",
    updatedAt: T_FRESH,
    catalogs: {
      wroclaw: { region: "wroclaw", works: [], updatedAt: T_FRESH },
      dolnyslask: { region: "dolnyslask", works: [], updatedAt: T_FRESH },
    },
  });
}

function eqLine(dwellingId, lp, over = {}) {
  const description = "Koparka gąsienicowa";
  const index = Number(lp) - 1;
  const lineId = buildOfferBoqLineIdWithDwelling(
    TID,
    dwellingId,
    String(lp),
    description,
    index,
  );
  return {
    lineId,
    lp: String(lp),
    description,
    quantity: 1,
    unit: "dzień",
    catalogWorkId: null,
    matchMethod: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    isNoise: false,
    noiseKind: null,
    costIntelligence: { lineKind: "Equipment" },
    lineTotalPln: null,
    ...over,
  };
}

function trLine(dwellingId, lp, over = {}) {
  const description = "Transport gruzu kontenerem";
  const index = Number(lp) - 1;
  const lineId = buildOfferBoqLineIdWithDwelling(
    TID,
    dwellingId,
    String(lp),
    description,
    index,
  );
  return {
    lineId,
    lp: String(lp),
    description,
    quantity: 1,
    unit: "dzień",
    catalogWorkId: null,
    matchMethod: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    isNoise: false,
    noiseKind: null,
    categoryId: null,
    costIntelligence: { lineKind: "IndividualAnalysis" },
    lineTotalPln: null,
    ...over,
  };
}

function makeDoc(dwellingId, lines) {
  return {
    schemaVersion: 5,
    tenderId: TID,
    version: 1,
    builtAt: T_FRESH,
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
    recomputeToken: "rt_test",
    buildStatus: "structural_only",
    mappingStats: null,
    mappingAppliedAt: null,
    costIntelligenceStats: null,
    costIntelligenceAppliedAt: null,
    pricingStats: null,
    pricingAppliedAt: null,
    userEditStats: null,
    warnings: [],
    _dwellingId: dwellingId,
  };
}

function answerEquipment(dwellingId, lineId, amount) {
  const q = ensureOwnerRateQuestionForGap({
    tenderId: TID,
    domain: "equipment",
    lineRef: lineId,
    dwellingId,
    evidenceSummaryPl: `Equip ${dwellingId}`,
    askedByRole: "chief",
    equipment: { namePl: "Koparka", quantity: 1, unit: "dzień" },
  });
  if (!q.ok) return false;
  const a = submitOwnerRateAnswer({
    tenderId: TID,
    questionId: q.question.questionId,
    amountPlnNet: amount,
    unit: "dzień",
    approvedBy: OWNER,
  });
  return a.ok === true;
}

function answerTransport(dwellingId, lineId, amount) {
  markTransportBidCandidate({
    tenderId: TID,
    lineId,
    dwellingId,
    markedByRole: "owner",
  });
  const q = ensureOwnerRateQuestionForGap({
    tenderId: TID,
    domain: "transport",
    lineRef: lineId,
    dwellingId,
    evidenceSummaryPl: `Transport ${dwellingId}`,
    askedByRole: "chief",
    transport: { namePl: "Transport gruzu", quantity: 1, unit: "dzień" },
  });
  if (!q.ok) return false;
  const a = submitOwnerRateAnswer({
    tenderId: TID,
    questionId: q.question.questionId,
    amountPlnNet: amount,
    unit: "dzień",
    approvedBy: OWNER,
  });
  return a.ok === true;
}

function buildThreeDwellingPackage(opts = {}) {
  const { resolveD03 = true, expected = 3 } = opts;
  enableMultiDwellingMode(TID, {
    labelPl: "Paczka test",
    expectedDwellingCount: expected,
  });
  setExpectedDwellingCount(TID, expected);
  for (const id of ["D01", "D02", "D03"]) {
    confirmDwelling({ tenderId: TID, dwellingId: id, labelPl: `Mieszkanie ${id}` });
  }
  mapDocumentToDwelling({ tenderId: TID, documentId: "doc-01", dwellingId: "D01" });
  mapDocumentToDwelling({ tenderId: TID, documentId: "doc-02", dwellingId: "D02" });
  mapDocumentToDwelling({ tenderId: TID, documentId: "doc-03", dwellingId: "D03" });

  const d01Lines = [
    eqLine("D01", "1"),
    eqLine("D01", "2"),
    trLine("D01", "3"),
  ];
  const d02Lines = [
    eqLine("D02", "1"),
    eqLine("D02", "2"),
    trLine("D02", "3"),
  ];
  const d03Lines = [
    eqLine("D03", "1"),
    eqLine("D03", "2"),
    trLine("D03", "3"),
  ];

  attachOfferBoqToDwelling({
    tenderId: TID,
    dwellingId: "D01",
    offerBoq: makeDoc("D01", d01Lines),
  });
  attachOfferBoqToDwelling({
    tenderId: TID,
    dwellingId: "D02",
    offerBoq: makeDoc("D02", d02Lines),
  });
  attachOfferBoqToDwelling({
    tenderId: TID,
    dwellingId: "D03",
    offerBoq: makeDoc("D03", d03Lines),
  });

  answerEquipment("D01", d01Lines[0].lineId, 1000);
  answerEquipment("D01", d01Lines[1].lineId, 500);
  answerTransport("D01", d01Lines[2].lineId, 500);

  answerEquipment("D02", d02Lines[0].lineId, 300);
  answerEquipment("D02", d02Lines[1].lineId, 200);
  answerTransport("D02", d02Lines[2].lineId, 700);

  if (resolveD03) {
    answerEquipment("D03", d03Lines[0].lineId, 400);
    answerEquipment("D03", d03Lines[1].lineId, 100);
    answerTransport("D03", d03Lines[2].lineId, 200);
  } else {
    // leave D03 equipment GAP (questions may be ensured by shadow later)
    markTransportBidCandidate({
      tenderId: TID,
      lineId: d03Lines[2].lineId,
      dwellingId: "D03",
    });
  }

  return { d01Lines, d02Lines, d03Lines };
}

// ——— Safety: legacy lineId unchanged ———
{
  const a = buildOfferBoqLineId("T", "1", "opis", 0);
  const b = buildOfferBoqLineId("T", "1", "opis", 0);
  eq("SAFE legacy lineId stable", a, b);
  const multi = buildOfferBoqLineIdWithDwelling("T", "D01", "1", "opis", 0);
  ok("SAFE multi ≠ legacy", multi !== a);
  const multi2 = buildOfferBoqLineIdWithDwelling("T", "D02", "1", "opis", 0);
  ok("SAFE D01 lineId ≠ D02", multi !== multi2);
}

// ——— SAFE: no filename SSOT in multi-dwelling core ———
{
  const storeSrc = readFileSync(join(ROOT, "src/lib/multi-dwelling/store.ts"), "utf8");
  const gateSrc = readFileSync(join(ROOT, "src/lib/multi-dwelling/package-gate.ts"), "utf8");
  ok(
    "SAFE no filename as dwellingId assignment",
    !/dwellingId\s*=\s*.*filename/i.test(storeSrc + gateSrc),
  );
  ok(
    "SAFE hint helper exists",
    /hintDwellingCountFromDocumentIds/.test(
      readFileSync(join(ROOT, "src/lib/multi-dwelling/orchestration.ts"), "utf8"),
    ),
  );
  eq("SAFE hint count", hintDwellingCountFromDocumentIds(["a", "b", "a"]), 2);
}

// ——— T1 1 tender × 3 dwellings ———
{
  reset();
  buildThreeDwellingPackage({ resolveD03: true });
  const pkg = getTenderPackage(TID);
  eq("T1 dwellings", pkg?.dwellings.length, 3);
  eq("T1 expected", pkg?.expectedDwellingCount, 3);
  eq("T1 mode multi", pkg?.mode, "multi");
}

// ——— T2 shared LP D01/D02 ———
{
  reset();
  const { d01Lines, d02Lines } = buildThreeDwellingPackage({ resolveD03: true });
  eq("T2 shared LP", d01Lines[0].lp, d02Lines[0].lp);
  ok("T2 different lineId", d01Lines[0].lineId !== d02Lines[0].lineId);
}

// ——— T3 OI D01 ≠ D02 ———
{
  reset();
  const { d01Lines, d02Lines } = buildThreeDwellingPackage({ resolveD03: true });
  // Same semantic lineRef would collide without dwelling — use same lineId string artificially
  const sharedRef = "SHARED-LINE-123";
  createOwnerRateQuestion({
    tenderId: TID,
    domain: "equipment",
    dwellingId: "D01",
    lineRef: sharedRef,
    evidenceSummaryPl: "D01",
    askedByRole: "owner",
    equipment: { namePl: "Eq", quantity: 1, unit: "dzień" },
  });
  const q1 = findOwnerInputForLine({
    tenderId: TID,
    domain: "equipment",
    lineRef: sharedRef,
    dwellingId: "D01",
  });
  createOwnerRateQuestion({
    tenderId: TID,
    domain: "equipment",
    dwellingId: "D02",
    lineRef: sharedRef,
    evidenceSummaryPl: "D02",
    askedByRole: "owner",
    equipment: { namePl: "Eq", quantity: 1, unit: "dzień" },
  });
  const q2 = findOwnerInputForLine({
    tenderId: TID,
    domain: "equipment",
    lineRef: sharedRef,
    dwellingId: "D02",
  });
  ok("T3 both Q", q1 && q2);
  ok("T3 different questionId", q1.question.questionId !== q2.question.questionId);
  submitOwnerRateAnswer({
    tenderId: TID,
    questionId: q1.question.questionId,
    amountPlnNet: 100,
    unit: "dzień",
    approvedBy: OWNER,
  });
  submitOwnerRateAnswer({
    tenderId: TID,
    questionId: q2.question.questionId,
    amountPlnNet: 300,
    unit: "dzień",
    approvedBy: OWNER,
  });
  const a1 = findOwnerInputForLine({
    tenderId: TID,
    domain: "equipment",
    lineRef: sharedRef,
    dwellingId: "D01",
  });
  const a2 = findOwnerInputForLine({
    tenderId: TID,
    domain: "equipment",
    lineRef: sharedRef,
    dwellingId: "D02",
  });
  eq("T3 OI D01 amount", a1?.currentAnswer?.amountPlnNet, 100);
  eq("T3 OI D02 amount", a2?.currentAnswer?.amountPlnNet, 300);
  void d01Lines;
  void d02Lines;
}

// ——— T4 Equipment D01 ≠ D02 ———
{
  reset();
  buildThreeDwellingPackage({ resolveD03: true });
  const evaluated = evaluateTenderPackage(getTenderPackage(TID), {
    store: makeStore(),
    nowMs: NOW,
    ensureOwnerQuestions: false,
  });
  const d01 = evaluated.package.dwellings.find((d) => d.dwellingId === "D01");
  const d02 = evaluated.package.dwellings.find((d) => d.dwellingId === "D02");
  ok("T4 equip D01", d01?.subtotals?.equipmentPln === 1500);
  ok("T4 equip D02", d02?.subtotals?.equipmentPln === 500);
  ok("T4 unequal", d01?.subtotals?.equipmentPln !== d02?.subtotals?.equipmentPln);
}

// ——— T5 Transport D01 ≠ D02 ———
{
  reset();
  buildThreeDwellingPackage({ resolveD03: true });
  const evaluated = evaluateTenderPackage(getTenderPackage(TID), {
    store: makeStore(),
    nowMs: NOW,
    ensureOwnerQuestions: false,
  });
  const d01 = evaluated.package.dwellings.find((d) => d.dwellingId === "D01");
  const d02 = evaluated.package.dwellings.find((d) => d.dwellingId === "D02");
  eq("T5 transport D01", d01?.subtotals?.transportPln, 500);
  eq("T5 transport D02", d02?.subtotals?.transportPln, 700);
}

// ——— T6 D03 GAP → package FAIL ———
{
  reset();
  buildThreeDwellingPackage({ resolveD03: false });
  const evaluated = evaluateTenderPackage(getTenderPackage(TID), {
    store: makeStore(),
    nowMs: NOW,
    ensureOwnerQuestions: false,
  });
  ok("T6 package FAIL", !evaluated.packageGate.pass);
  ok(
    "T6 D03 equipment gap",
    (evaluated.package.dwellings.find((d) => d.dwellingId === "D03")?.f5Gate
      ?.equipmentGapCount ?? 0) > 0,
  );
}

// ——— T7 D03 resolved → package PASS ———
{
  reset();
  buildThreeDwellingPackage({ resolveD03: true });
  const evaluated = evaluateTenderPackage(getTenderPackage(TID), {
    store: makeStore(),
    nowMs: NOW,
    ensureOwnerQuestions: false,
  });
  ok("T7 package PASS", evaluated.packageGate.pass);
  eq("T7 complete 3", evaluated.packageGate.completeDwellingCount, 3);
}

// ——— T8 expected=4 / only 3 → FAIL ———
{
  reset();
  buildThreeDwellingPackage({ resolveD03: true, expected: 3 });
  setExpectedDwellingCount(TID, 4);
  const gate = evaluatePackageGate(getTenderPackage(TID));
  ok("T8 FAIL count mismatch", !gate.pass);
  ok(
    "T8 reason COUNT_MISMATCH",
    gate.failReasons.includes("COUNT_MISMATCH"),
  );
}

// ——— T9 duplicate dwellingId → FAIL ———
{
  reset();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 2 });
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "A" });
  const dup = confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "B" });
  eq("T9 reject duplicate", dup.ok, false);
  const pkg = getTenderPackage(TID);
  pkg.dwellings.push({
    dwellingId: "D01",
    labelPl: "dup",
    sourceDocumentIds: [],
    offerBoq: makeDoc("D01", [eqLine("D01", "1")]),
    f5Gate: null,
    subtotals: null,
  });
  upsertTenderPackage(pkg);
  const gate = evaluatePackageGate(getTenderPackage(TID));
  ok("T9 gate FAIL dup", !gate.pass);
  ok("T9 DUPLICATE", gate.failReasons.includes("DUPLICATE_DWELLING"));
}

// ——— T10 empty required dwelling → FAIL ———
{
  reset();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 1 });
  setExpectedDwellingCount(TID, 1);
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "Empty" });
  // no offerBoq
  const gate = evaluatePackageGate(getTenderPackage(TID));
  ok("T10 FAIL empty", !gate.pass);
  ok(
    "T10 EMPTY/BOQ",
    gate.failReasons.includes("EMPTY_REQUIRED_DWELLING") ||
      gate.failReasons.includes("BOQ_NOT_IMPORTED"),
  );
}

// ——— T11 SUM dwelling = package total ———
{
  reset();
  buildThreeDwellingPackage({ resolveD03: true });
  const evaluated = evaluateTenderPackage(getTenderPackage(TID), {
    store: makeStore(),
    nowMs: NOW,
    ensureOwnerQuestions: false,
  });
  const sum = evaluated.package.dwellings.reduce(
    (acc, d) => acc + (d.subtotals?.directPln ?? 0),
    0,
  );
  const direct = aggregatePackageDirect(evaluated.package);
  eq("T11 SUM == package direct", direct?.directPln, sum);
  eq("T11 expected sum", sum, 3900);
}

// ——— T12 Final Bid blocked until PackageGate PASS ———
{
  reset();
  buildThreeDwellingPackage({ resolveD03: false });
  const blocked = computePackageBidProposal({
    pkg: getTenderPackage(TID),
    store: makeStore(),
    nowMs: NOW,
    kosztorys: null,
    swz: null,
    fit: null,
    costModel: defaultCostModel(),
    ensureOwnerQuestions: false,
  });
  ok("T12 bid blocked", blocked.proposal.ok === false);
  ok("T12 no recommended", blocked.proposal.recommendedBidPln == null);

  reset();
  buildThreeDwellingPackage({ resolveD03: true });
  const allowed = computePackageBidProposal({
    pkg: getTenderPackage(TID),
    store: makeStore(),
    nowMs: NOW,
    kosztorys: null,
    swz: null,
    fit: null,
    costModel: defaultCostModel(),
    ensureOwnerQuestions: false,
  });
  ok("T12 bid allowed", allowed.proposal.ok === true);
  ok(
    "T12 recommended > 0",
    allowed.proposal.recommendedBidPln != null &&
      allowed.proposal.recommendedBidPln > 0,
  );
}

// ——— T13 single legacy GREEN ———
{
  reset();
  const legacyLineId = buildOfferBoqLineId(TID, "1", "Koparka gąsienicowa", 0);
  const line = {
    lineId: legacyLineId,
    lp: "1",
    description: "Koparka gąsienicowa",
    quantity: 2,
    unit: "dzień",
    catalogWorkId: null,
    matchMethod: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
    isNoise: false,
    noiseKind: null,
    costIntelligence: { lineKind: "Equipment" },
    lineTotalPln: null,
  };
  const q = ensureOwnerRateQuestionForGap({
    tenderId: TID,
    domain: "equipment",
    lineRef: legacyLineId,
    evidenceSummaryPl: "legacy",
    askedByRole: "chief",
    equipment: { namePl: "Koparka", quantity: 2, unit: "dzień" },
  });
  ok("T13 ensure", q.ok);
  if (q.ok) {
    submitOwnerRateAnswer({
      tenderId: TID,
      questionId: q.question.questionId,
      amountPlnNet: 1800,
      unit: "dzień",
      approvedBy: OWNER,
    });
  }
  const found = findOwnerInputForLine({
    tenderId: TID,
    domain: "equipment",
    lineRef: legacyLineId,
  });
  eq("T13 DEFAULT dwelling", found?.question.dwellingId, DEFAULT_DWELLING_ID);
  const shadow = computeShadowPositionCostsForOfferBoq({
    doc: { lines: [line] },
    store: makeStore(),
    nowMs: NOW,
    tenderId: TID,
    ensureOwnerQuestions: false,
  });
  const gate = evaluateBidCutoverGate(shadow);
  ok("T13 legacy F5 PASS", gate.pass);
  eq("T13 equipmentPln", shadow.aggregates.equipmentCostPln, 3600);
}

// ——— T14 COST-MULTI branch ≠ dwelling ———
{
  const types = readFileSync(join(ROOT, "src/lib/multi-dwelling/types.ts"), "utf8");
  const gate = readFileSync(join(ROOT, "src/lib/multi-dwelling/package-gate.ts"), "utf8");
  ok("T14 no CostPackage as identity", !/CostPackage|BranchPackage|lotKey/.test(gate));
  ok("T14 dwellingId field", /dwellingId/.test(types));
  ok(
    "T14 costMulti optional only",
    /costMulti\?/.test(types) || /costMulti\?:/.test(types),
  );
}

// ——— T15 missing document ≠ silent 0 ———
{
  reset();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 1 });
  setExpectedDwellingCount(TID, 1);
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "Missing BOQ" });
  const evaluated = evaluateTenderPackage(getTenderPackage(TID), {
    store: makeStore(),
    nowMs: NOW,
  });
  ok("T15 gate FAIL", !evaluated.packageGate.pass);
  ok("T15 no packageDirect", evaluated.packageDirect == null);
  ok(
    "T15 not invent 0",
    !evaluated.packageGate.reasonsPl.some((r) => /0 PLN.*PASS/i.test(r)),
  );
  ok(
    "T15 mapping missing reason",
    evaluated.packageGate.failReasons.includes("DOCUMENT_MAPPING_MISSING") ||
      evaluated.packageGate.failReasons.includes("BOQ_NOT_IMPORTED"),
  );
}

function fakePassGate() {
  return {
    pass: true,
    billableLineCount: 1,
    completeLineCount: 1,
    gapLineCount: 0,
    skippedNoiseCount: 0,
    equipmentGapCount: 0,
    transportGapCount: 0,
    auxiliaryGapCount: 0,
    reasonsPl: [],
    gapCodes: [],
  };
}

// ——— T16 sourceDocumentIds=[] → FAIL ———
{
  reset();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 1 });
  setExpectedDwellingCount(TID, 1);
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "A" });
  const pkg = getTenderPackage(TID);
  pkg.dwellings[0].offerBoq = makeDoc("D01", [eqLine("D01", "1")]);
  pkg.dwellings[0].f5Gate = fakePassGate();
  pkg.dwellings[0].sourceDocumentIds = [];
  pkg.documentToDwelling = {};
  upsertTenderPackage(pkg);
  const gate = evaluatePackageGate(getTenderPackage(TID));
  ok("T16 FAIL", !gate.pass);
  ok(
    "T16 DOCUMENT_MAPPING_MISSING",
    gate.failReasons.includes("DOCUMENT_MAPPING_MISSING"),
  );
}

// ——— T17 sources set but documentToDwelling empty → FAIL ———
{
  reset();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 1 });
  setExpectedDwellingCount(TID, 1);
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "A" });
  const pkg = getTenderPackage(TID);
  pkg.dwellings[0].sourceDocumentIds = ["doc-01"];
  pkg.documentToDwelling = {};
  pkg.dwellings[0].offerBoq = makeDoc("D01", [eqLine("D01", "1")]);
  pkg.dwellings[0].f5Gate = fakePassGate();
  upsertTenderPackage(pkg);
  const gate = evaluatePackageGate(getTenderPackage(TID));
  ok("T17 FAIL", !gate.pass);
  ok(
    "T17 UNKNOWN/MISSING",
    gate.failReasons.includes("DOCUMENT_MAPPING_UNKNOWN") ||
      gate.failReasons.includes("DOCUMENT_MAPPING_MISSING"),
  );
}

// ——— T18 doc maps to D02 but listed on D01 → FAIL ———
{
  reset();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 2 });
  setExpectedDwellingCount(TID, 2);
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "A" });
  confirmDwelling({ tenderId: TID, dwellingId: "D02", labelPl: "B" });
  mapDocumentToDwelling({ tenderId: TID, documentId: "doc-01", dwellingId: "D02" });
  const pkg = getTenderPackage(TID);
  const d01 = pkg.dwellings.find((d) => d.dwellingId === "D01");
  d01.sourceDocumentIds = ["doc-01"];
  d01.offerBoq = makeDoc("D01", [eqLine("D01", "1")]);
  d01.f5Gate = fakePassGate();
  const d02 = pkg.dwellings.find((d) => d.dwellingId === "D02");
  d02.offerBoq = makeDoc("D02", [eqLine("D02", "1")]);
  d02.f5Gate = fakePassGate();
  upsertTenderPackage(pkg);
  const gate = evaluatePackageGate(getTenderPackage(TID));
  ok("T18 FAIL", !gate.pass);
  ok(
    "T18 MISMATCH or DUPLICATE",
    gate.failReasons.includes("DOCUMENT_MAPPING_MISMATCH") ||
      gate.failReasons.includes("DOCUMENT_MAPPING_DUPLICATE"),
  );
}

// ——— T19 BOQ+F5 PASS without mapping → FAIL ———
{
  reset();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 1 });
  setExpectedDwellingCount(TID, 1);
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "A" });
  const pkg = getTenderPackage(TID);
  pkg.dwellings[0].offerBoq = makeDoc("D01", [eqLine("D01", "1")]);
  pkg.dwellings[0].f5Gate = fakePassGate();
  pkg.dwellings[0].sourceDocumentIds = [];
  pkg.documentToDwelling = {};
  upsertTenderPackage(pkg);
  const gate = evaluatePackageGate(getTenderPackage(TID));
  ok("T19 FAIL despite F5", !gate.pass);
  ok(
    "T19 mapping blocks",
    gate.failReasons.includes("DOCUMENT_MAPPING_MISSING"),
  );
}

// ——— T20 same document on two dwellings → FAIL ———
{
  reset();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 2 });
  setExpectedDwellingCount(TID, 2);
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "A" });
  confirmDwelling({ tenderId: TID, dwellingId: "D02", labelPl: "B" });
  const pkg = getTenderPackage(TID);
  pkg.documentToDwelling = { "doc-01": "D01" };
  pkg.dwellings[0].sourceDocumentIds = ["doc-01"];
  pkg.dwellings[1].sourceDocumentIds = ["doc-01"];
  pkg.dwellings[0].offerBoq = makeDoc("D01", [eqLine("D01", "1")]);
  pkg.dwellings[1].offerBoq = makeDoc("D02", [eqLine("D02", "1")]);
  pkg.dwellings[0].f5Gate = fakePassGate();
  pkg.dwellings[1].f5Gate = fakePassGate();
  upsertTenderPackage(pkg);
  const gate = evaluatePackageGate(getTenderPackage(TID));
  ok("T20 FAIL", !gate.pass);
  ok(
    "T20 DUPLICATE",
    gate.failReasons.includes("DOCUMENT_MAPPING_DUPLICATE") ||
      gate.failReasons.includes("DOCUMENT_MAPPING_MISMATCH"),
  );
}

// ——— T21 unknown documentId → FAIL ———
{
  reset();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 1 });
  setExpectedDwellingCount(TID, 1);
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "A" });
  const pkg = getTenderPackage(TID);
  pkg.dwellings[0].sourceDocumentIds = ["doc-unknown"];
  pkg.documentToDwelling = { "doc-other": "D01" };
  pkg.dwellings[0].offerBoq = makeDoc("D01", [eqLine("D01", "1")]);
  pkg.dwellings[0].f5Gate = fakePassGate();
  upsertTenderPackage(pkg);
  const gate = evaluatePackageGate(getTenderPackage(TID));
  ok("T21 FAIL", !gate.pass);
  ok(
    "T21 UNKNOWN",
    gate.failReasons.includes("DOCUMENT_MAPPING_UNKNOWN") ||
      gate.failReasons.includes("DOCUMENT_MAPPING_MISSING"),
  );
}

// ——— T22 correct mapping all dwellings → PASS ———
{
  reset();
  buildThreeDwellingPackage({ resolveD03: true });
  const evaluated = evaluateTenderPackage(getTenderPackage(TID), {
    store: makeStore(),
    nowMs: NOW,
    ensureOwnerQuestions: false,
  });
  ok("T22 package PASS", evaluated.packageGate.pass);
}

// ——— T23 attach BOQ before mapping → REJECT ———
{
  reset();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 1 });
  setExpectedDwellingCount(TID, 1);
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "A" });
  const r = attachOfferBoqToDwelling({
    tenderId: TID,
    dwellingId: "D01",
    offerBoq: makeDoc("D01", [eqLine("D01", "1")]),
  });
  eq("T23 reject", r.ok, false);
  if (!r.ok) eq("T23 reason", r.reason, "DOCUMENT_MAPPING_REQUIRED");
}

// ——— T24 map → attach → PASS path ———
{
  reset();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 1 });
  setExpectedDwellingCount(TID, 1);
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "A" });
  const mapped = mapDocumentToDwelling({
    tenderId: TID,
    documentId: "doc-01",
    dwellingId: "D01",
  });
  ok("T24 map ok", mapped.ok === true);
  const line = eqLine("D01", "1");
  const attached = attachOfferBoqToDwelling({
    tenderId: TID,
    dwellingId: "D01",
    offerBoq: makeDoc("D01", [line]),
  });
  ok("T24 attach ok", attached.ok === true);
  answerEquipment("D01", line.lineId, 900);
  const evaluated = evaluateTenderPackage(getTenderPackage(TID), {
    store: makeStore(),
    nowMs: NOW,
    ensureOwnerQuestions: false,
  });
  ok("T24 package PASS", evaluated.packageGate.pass);
}

// ——— documentId === dwellingId rejected ———
{
  reset();
  enableMultiDwellingMode(TID, { expectedDwellingCount: 1 });
  confirmDwelling({ tenderId: TID, dwellingId: "D01", labelPl: "A" });
  const bad = mapDocumentToDwelling({
    tenderId: TID,
    documentId: "D01",
    dwellingId: "D01",
  });
  eq("SAFE reject docId=dwellingId", bad.ok, false);
}

// ——— Transport mark collision prevention ———
{
  reset();
  const lid = "TR-SHARED";
  markTransportBidCandidate({ tenderId: TID, lineId: lid, dwellingId: "D01" });
  markTransportBidCandidate({ tenderId: TID, lineId: lid, dwellingId: "D02" });
  ok("SAFE mark D01", isTransportBidCandidate(TID, lid, "D01"));
  ok("SAFE mark D02", isTransportBidCandidate(TID, lid, "D02"));
  ok("SAFE no cross D01/D99", !isTransportBidCandidate(TID, lid, "D99"));
}

// ——— OfferBoq schema version untouched ———
{
  const src = readFileSync(join(ROOT, "src/lib/tender-offer-boq.ts"), "utf8");
  ok(
    "SAFE OFFER_BOQ_SCHEMA_VERSION 5",
    /export const OFFER_BOQ_SCHEMA_VERSION = 5/.test(src),
  );
  ok(
    "SAFE no WithDwelling in offer-boq",
    !/buildOfferBoqLineIdWithDwelling/.test(src),
  );
}

console.log("\n---");
console.log(`MULTI-DWELLING-01: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
