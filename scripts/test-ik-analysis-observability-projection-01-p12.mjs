/**
 * IK-ANALYSIS-OBSERVABILITY-PROJECTION-01 — Phase 1–2 unit tests.
 * Run: npx vite-node scripts/test-ik-analysis-observability-projection-01-p12.mjs
 *
 * Pure fixtures only · ZERO cloud / KV / network / Host wiring.
 */
import {
  OBSERVATION_STAGE_WEIGHTS,
  buildAnalysisObservation,
  computeAnalysisProgress,
  contributionFactor,
  mapCompositeReportStatus,
  mapDocumentExpertStatus,
  mapKnrExpertStatus,
  mapNg02IngestPhase,
  mapP7Status,
  mapP8Status,
  mapReadyBlockedPartial,
} from "../src/lib/intelligent-estimator/analysis-observation.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name);
  }
}

function assertEq(name, actual, expected) {
  const ok = Object.is(actual, expected) || JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, "actual=", actual, "expected=", expected);
  }
}

const EMPTY_KNR_COUNTS = {
  withBasis: 0,
  withoutBasis: 0,
  recognized: 0,
  candidate: 0,
  hold: 0,
  conflict: 0,
  none: 0,
  resolved: 0,
  historicalExactRms: 0,
  historicalExact: 0,
  historicalFamily: 0,
  historicalConflict: 0,
  historicalMiss: 0,
};

function baseFlags(over = {}) {
  return {
    p2DocumentsBoqOn: true,
    identityCoverageOn: false,
    p5LaborOn: true,
    p5ResearchOn: false,
    p6MaterialOn: true,
    p6ResearchOn: false,
    p7F5On: true,
    p8RiskOn: true,
    ...over,
  };
}

function baseDocumentReport(over = {}) {
  return {
    tenderId: "t-1",
    documents: [{ documentId: "d1" }],
    status: "ready",
    reasons: [],
    masterBoq: {
      mode: "legacy_single",
      schemaVersion: 1,
      lineCount: 3,
      composedLineCount: 3,
      sourceLineCount: 3,
      dwellingCount: 1,
      branchCount: 1,
      sourceCount: 1,
      hasLineProvenance: false,
      status: "ready",
      readyForExperts: true,
    },
    masterBoqLines: [],
    offerBoq: null,
    lineProvenance: null,
    ...over,
  };
}

function baseKnr(over = {}) {
  return {
    tenderId: "t-1",
    status: "COMPLETED",
    inputLineCount: 3,
    outputLineCount: 3,
    counts: { ...EMPTY_KNR_COUNTS, recognized: 2, historicalMiss: 1 },
    catalogWorkIdWritten: 0,
    knrHintMutated: false,
    classifyCalled: false,
    mapperCalled: false,
    researchExecuted: false,
    historicalAuthority: false,
    lines: [],
    examplesHold: [],
    reasons: [],
    ...over,
  };
}

function baseClassification(over = {}) {
  return {
    tenderId: "t-1",
    status: "ready",
    inputLineCount: 3,
    outputLineCount: 3,
    counts: { LABOR: 1, MATERIAL: 1, COMPOUND: 0, UNKNOWN: 1 },
    reconciliation: { ok: true, unexplainedLoss: 0, unexplainedDuplication: 0, reasons: [] },
    dwellingPreservation: true,
    branchPreservation: true,
    provenancePreservation: true,
    quantityUnitPreservation: true,
    researchExecuted: false,
    pricingExecuted: false,
    autoAcceptExecuted: false,
    lines: [],
    reasons: [],
    ...over,
  };
}

function baseIdentityContext(over = {}) {
  return {
    status: "ready",
    lineCount: 3,
    trustedOkCount: 2,
    ambiguousCount: 0,
    noIdentityCount: 1,
    persistPlans: [],
    reasons: [],
    ...over,
  };
}

function baseLabor(over = {}) {
  return {
    tenderId: "t-1",
    status: "ready",
    counts: {
      inputLineCount: 3,
      outputLineCount: 3,
      workIdentityResolved: 2,
      labor: 2,
      nonLabor: 1,
      both: 0,
      unresolved: 0,
      nonCost: 0,
      currentOurRateHit: 1,
      ourRateMiss: 1,
      researchCalls: 0,
      evidenceCandidates: 0,
      ownerAcceptRequired: 0,
      acceptedOurRate: 0,
      internalExactHits: 0,
      internalSemanticHits: 0,
      internalReview: 0,
      researchHttpFetches: 0,
    },
    reconciliation: { ok: true, unexplainedLoss: 0, unexplainedDuplication: 0, reasons: [] },
    dwellingPreservation: true,
    branchPreservation: true,
    provenancePreservation: true,
    researchBoundaryOk: true,
    autoAcceptExecuted: false,
    pricingExecuted: false,
    materialResearchExecuted: false,
    lines: [],
    researchKeys: [],
    reasons: [],
    ...over,
  };
}

function baseMaterial(over = {}) {
  return {
    tenderId: "t-1",
    status: "ready",
    counts: {
      inputLineCount: 3,
      outputLineCount: 3,
      materialIdentityResolved: 2,
      priceMemoryHit: 1,
      researchCalls: 0,
    },
    lines: [],
    reasons: [],
    ...over,
  };
}

function baseComposite(over = {}) {
  return {
    schemaVersion: 1,
    tenderId: "t-1",
    status: "ready",
    p5Active: true,
    p6Active: true,
    bothHoldLineCount: 0,
    completeLineCount: 1,
    gapLineCount: 0,
    skippedLineCount: 0,
    autoAcceptExecuted: false,
    researchHttpExecuted: false,
    catalogWorkWrite: false,
    priceMemoryWrite: false,
    feedsP7Bid: false,
    computePositionCostChanged: false,
    lines: [],
    reasons: [],
    ...over,
  };
}

function baseP7(over = {}) {
  return {
    schemaVersion: 1,
    status: "ready",
    mode: "legacy_single",
    tenderId: "t-1",
    researchExecuted: false,
    httpCalls: 0,
    catalogWorkWrite: false,
    priceMemoryWrite: false,
    cutoverGatePass: true,
    packageGatePass: null,
    billableLineCount: 3,
    completeLineCount: 2,
    gapLineCount: 1,
    laborCostPln: null,
    materialCostPln: null,
    ...over,
  };
}

function baseP8(over = {}) {
  return {
    schemaVersion: 1,
    status: "ready",
    tenderId: "t-1",
    researchExecuted: false,
    httpCalls: 0,
    catalogWorkWrite: false,
    priceMemoryWrite: false,
    autoAcceptExecuted: false,
    expertAiDecydentFlipped: false,
    ikChiefWiringMutated: false,
    overlay: null,
    displayDecision: null,
    downgradeRule: null,
    validationVerdict: null,
    validation: null,
    chiefAvailable: false,
    chiefCaseId: null,
    chiefStatus: null,
    decisionWorkspace: null,
    ...over,
  };
}

/** Minimal FULL IkOrchestraSnapshot fixture (not SyncSnapshot). */
function makeSnapshot(over = {}) {
  const {
    report: reportOver,
    flags: flagsOver,
    knr: knrOver,
    labor: laborOver,
    material: materialOver,
    classification: classOver,
    identityContext: idOver,
    composite: compositeOver,
    positionCostBid: p7Over,
    riskDecision: p8Over,
    ...rest
  } = over;
  const report = baseDocumentReport(reportOver && typeof reportOver === "object" ? reportOver : {});
  return {
    effectiveItem: { id: "t-1", tenderId: "t-1", title: "Test" },
    pkg: null,
    ingest: null,
    bridgeBusy: false,
    labor: laborOver === undefined ? baseLabor() : laborOver,
    material: materialOver === undefined ? baseMaterial() : materialOver,
    flags: baseFlags(flagsOver && typeof flagsOver === "object" ? flagsOver : {}),
    packageBlockers: null,
    ownerActionQueue: null,
    identityCoverageOps: null,
    refreshF5AfterOwnerInput: () => {},
    report,
    knr: baseKnr(knrOver && typeof knrOver === "object" ? knrOver : {}),
    knrKnowledgeDiag: {
      status: "idle",
      hits: 0,
      misses: 0,
      staleHits: 0,
      pendingVerify: 0,
      researchExecuted: 0,
      http: 0,
    },
    knrApplicationResults: [],
    knrAppDiag: {
      status: "idle",
      priced: 0,
      partial: 0,
      hold: 0,
      skipped: 0,
      reject: 0,
    },
    knrMapped: { expert: report, applied: 0 },
    identityContext:
      idOver === undefined ? baseIdentityContext() : idOver,
    postIdentityExpert: report,
    identityPersistOutcome: null,
    classification: baseClassification(
      classOver && typeof classOver === "object" ? classOver : {},
    ),
    identityCoverage: null,
    composite:
      compositeOver === undefined ? baseComposite() : compositeOver,
    positionCostBid: p7Over === undefined ? baseP7() : p7Over,
    riskDecision: p8Over === undefined ? baseP8() : p8Over,
    ...rest,
  };
}

// ─── A/B/C/D/E Mapper matrix ────────────────────────────────────────────────

console.log("\n=== Mapper matrix ===");

for (const [src, exp] of [
  ["ready", "done"],
  ["partial", "partial"],
  ["hold", "hold"],
  ["gap", "failed"],
  ["pending", "pending"],
]) {
  assertEq(`Document ${src}→${exp}`, mapDocumentExpertStatus(src), exp);
}

for (const [src, exp] of [
  ["NOT_STARTED", "pending"],
  ["ANALYZING", "running"],
  ["COMPLETED", "done"],
  ["BLOCKED", "blocked"],
]) {
  assertEq(`KNR ${src}→${exp}`, mapKnrExpertStatus(src), exp);
}

for (const [src, exp] of [
  ["ready", "done"],
  ["blocked", "blocked"],
  ["partial", "partial"],
]) {
  assertEq(`RBP ${src}→${exp}`, mapReadyBlockedPartial(src), exp);
}

for (const [src, exp] of [
  ["ready", "done"],
  ["partial", "partial"],
  ["gap", "failed"],
  ["hold", "hold"],
  ["blocked", "blocked"],
]) {
  assertEq(`Composite ${src}→${exp}`, mapCompositeReportStatus(src), exp);
}

for (const [src, exp] of [
  ["ready", "done"],
  ["partial", "partial"],
  ["gap", "failed"],
  ["blocked", "blocked"],
  ["hold", "hold"],
]) {
  assertEq(`P7 ${src}→${exp}`, mapP7Status(src), exp);
}

for (const [src, exp] of [
  ["ready", "done"],
  ["partial", "partial"],
  ["gap", "failed"],
  ["blocked", "blocked"],
  ["hold", "hold"],
  ["needs_review", "hold"],
]) {
  assertEq(`P8 ${src}→${exp}`, mapP8Status(src), exp);
}

for (const [src, exp] of [
  ["idle", "pending"],
  ["needs_docs", "pending"],
  ["started", "running"],
  ["completed", "done"],
  ["blocked", "blocked"],
  ["skipped_already_done", "done"],
]) {
  assertEq(`P2 phase ${src}→${exp}`, mapNg02IngestPhase(src, false), exp);
}

assertEq("bridgeBusy forces running", mapNg02IngestPhase("idle", true), "running");
assertEq("bridgeBusy over completed", mapNg02IngestPhase("completed", true), "running");

// ─── Progress contribution ──────────────────────────────────────────────────

console.log("\n=== Progress contribution ===");
assertEq("done factor", contributionFactor("done"), 1);
assertEq("partial factor", contributionFactor("partial"), 0.5);
assertEq("running factor", contributionFactor("running"), 0.25);
assertEq("pending factor", contributionFactor("pending"), 0);
assertEq("blocked factor", contributionFactor("blocked"), 0);
assertEq("hold factor", contributionFactor("hold"), 0);
assertEq("failed factor", contributionFactor("failed"), 0);

{
  const stages = [
    { stageId: "documents", status: "done", actor: "Document", labelPl: "D" },
    { stageId: "boq", status: "partial", actor: "Document", labelPl: "B" },
    { stageId: "knr", status: "running", actor: "Knr", labelPl: "K" },
    { stageId: "complete", status: "pending", actor: "Chief", labelPl: "C" },
  ];
  const p = computeAnalysisProgress(stages);
  // weights 10+10+15=35; completed 10 + 5 + 3.75 = 18.75 → 54%
  assertEq("progress mixed percent", p.percent, 54);
  assertEq("progress totalWeight", p.totalWeight, 35);
  assertEq("progress runningStageId", p.runningStageId, "knr");
  assertEq("progress blocked false", p.blocked, false);
}

{
  const stages = [
    { stageId: "labor", status: "blocked", actor: "Labor", labelPl: "L" },
    { stageId: "complete", status: "blocked", actor: "Chief", labelPl: "C" },
  ];
  const p = computeAnalysisProgress(stages);
  assertEq("blocked sets blocked", p.blocked, true);
  assertEq("blocked percent 0", p.percent, 0);
}

assertEq("weights sum 100", Object.values(OBSERVATION_STAGE_WEIGHTS).reduce((a, b) => a + b, 0), 100);

// ─── Adapter: async null, flags, eta/final/hints ────────────────────────────

console.log("\n=== Adapter Phase 1–2 locks ===");

{
  const snap = makeSnapshot({
    labor: null,
    material: null,
    flags: baseFlags({ p5LaborOn: true, p6MaterialOn: true }),
  });
  const obs = buildAnalysisObservation(snap);
  const labor = obs.stages.find((s) => s.stageId === "labor");
  const material = obs.stages.find((s) => s.stageId === "material");
  assertEq("labor null+ON → pending", labor?.status, "pending");
  assertEq("material null+ON → pending", material?.status, "pending");
  assertEq("eta null", obs.eta, null);
  assertEq("final null", obs.final, null);
  assertEq("conversationHints []", JSON.stringify(obs.conversationHints), "[]");
  assert("conversationHints length 0", Array.isArray(obs.conversationHints) && obs.conversationHints.length === 0);
}

{
  const snap = makeSnapshot({
    bridgeBusy: true,
    ingest: {
      phase: "idle",
      started: false,
      completed: false,
      tenderId: "t-1",
      documentsUsed: 0,
      zipEvidence: [],
      parsersReused: [],
      artifactCount: 0,
      extractedLineCount: 0,
      primarySourceFilename: null,
      reasons: [],
      itemPatch: null,
      mergedItem: { id: "t-1" },
      expert: null,
    },
    flags: baseFlags({ p2DocumentsBoqOn: true }),
  });
  const obs = buildAnalysisObservation(snap);
  const docs = obs.stages.find((s) => s.stageId === "documents");
  assertEq("bridgeBusy → documents running", docs?.status, "running");
  assertEq("progress runningStageId documents", obs.progress.runningStageId, "documents");
}

{
  const snap = makeSnapshot({
    flags: baseFlags({
      p2DocumentsBoqOn: false,
      p5LaborOn: false,
      p6MaterialOn: false,
      p7F5On: false,
      p8RiskOn: false,
    }),
    labor: null,
    material: null,
    composite: null,
    positionCostBid: null,
    riskDecision: null,
  });
  const obs = buildAnalysisObservation(snap);
  const ids = obs.stages.map((s) => s.stageId);
  assert("no documents when P2 OFF", !ids.includes("documents"));
  assert("no labor when P5 OFF", !ids.includes("labor"));
  assert("no material when P6 OFF", !ids.includes("material"));
  assert("no composite when P5/P6 OFF", !ids.includes("composite"));
  assert("no pricing when P7 OFF", !ids.includes("pricing"));
  assert("no risk when P8 OFF", !ids.includes("risk"));
  assert("boq always present", ids.includes("boq"));
  assert("knr always present", ids.includes("knr"));
  assert("identity always present", ids.includes("identity"));
  assert("classification always present", ids.includes("classification"));
  assert("complete present", ids.includes("complete"));
  // active weights: boq10+knr15+identity5+classification5 = 35
  assertEq("OFF stages excluded totalWeight", obs.progress.totalWeight, 35);
  assert("no fake 100% when optional OFF", obs.progress.percent < 100 || obs.progress.totalWeight === 35);
}

{
  const snap = makeSnapshot({
    knr: baseKnr({ status: "BLOCKED" }),
    labor: baseLabor({ status: "ready" }),
  });
  const obs = buildAnalysisObservation(snap);
  assertEq("knr blocked → blocked stage", obs.stages.find((s) => s.stageId === "knr")?.status, "blocked");
  assertEq("progress.blocked true", obs.progress.blocked, true);
}

{
  const snap = makeSnapshot({
    riskDecision: baseP8({ status: "needs_review" }),
  });
  const obs = buildAnalysisObservation(snap);
  assertEq("needs_review → hold", obs.stages.find((s) => s.stageId === "risk")?.status, "hold");
}

{
  const report = baseDocumentReport({
    status: "gap",
    masterBoq: { ...baseDocumentReport().masterBoq, status: "gap" },
  });
  const snap = makeSnapshot({ report });
  const obs = buildAnalysisObservation(snap);
  assertEq("documents gap → failed", obs.stages.find((s) => s.stageId === "documents")?.status, "failed");
  assertEq("boq gap → failed", obs.stages.find((s) => s.stageId === "boq")?.status, "failed");
}

// ─── Purity / full snapshot ─────────────────────────────────────────────────

console.log("\n=== Purity + full snapshot ===");

{
  const snap = makeSnapshot();
  const a = buildAnalysisObservation(snap, { nowIso: "" });
  const b = buildAnalysisObservation(snap, { nowIso: "" });
  assertEq("same snapshot → same JSON", JSON.stringify(a), JSON.stringify(b));
  assert("has labor field on input", "labor" in snap);
  assert("has material field on input", "material" in snap);
  assert("has bridgeBusy on input", "bridgeBusy" in snap);
  assert("has flags on input", "flags" in snap);
  assert("has refreshF5AfterOwnerInput (full snap)", typeof snap.refreshF5AfterOwnerInput === "function");
  // SyncSnapshot would NOT have labor/material/bridgeBusy/flags — we require them
  assert("full snapshot not sync-only", snap.labor != null && snap.flags != null && typeof snap.bridgeBusy === "boolean");
}

{
  let wrote = false;
  const snap = makeSnapshot({
    refreshF5AfterOwnerInput: () => {
      wrote = true;
    },
  });
  buildAnalysisObservation(snap);
  assert("adapter does not call refreshF5", wrote === false);
}

{
  const snap = makeSnapshot({
    flags: baseFlags({ p5LaborOn: true }),
    labor: null,
  });
  const obs = buildAnalysisObservation(snap);
  const labor = obs.stages.find((s) => s.stageId === "labor");
  assert("null labor has no invented counts", labor?.counts === undefined);
}

{
  const snap = makeSnapshot();
  const obs = buildAnalysisObservation(snap);
  assert("no startedAt in phase 1-2", obs.stages.every((s) => s.startedAt === undefined));
  assert("no finishedAt in phase 1-2", obs.stages.every((s) => s.finishedAt === undefined));
  assert("no durationMs in phase 1-2", obs.stages.every((s) => s.durationMs === undefined));
}

// All-done progress
{
  const snap = makeSnapshot();
  const obs = buildAnalysisObservation(snap);
  assertEq("all-ready overall done-ish", obs.overallStatus === "done" || obs.overallStatus === "partial", true);
  assert("percent > 0 when stages done", obs.progress.percent > 0);
  assertEq("complete stage done when work done", obs.stages.find((s) => s.stageId === "complete")?.status, "done");
}

console.log(`\n=== RESULT pass=${pass} fail=${fail} ===`);
if (fail > 0) process.exit(1);
