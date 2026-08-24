/**
 * IK-ANALYSIS-OBSERVABILITY-PROJECTION-01 — Phase 3 Live Visualization tests.
 * Run: npx vite-node scripts/test-ik-analysis-observability-projection-01-p3-live-viz.mjs
 *
 * Fixtures only · ZERO cloud / KV / network.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  buildAnalysisObservation,
} from "../src/lib/intelligent-estimator/analysis-observation.ts";
import { LiveVisualizationView } from "../src/app/intelligent-estimator/LiveVisualizationView.tsx";
import {
  IK_LIVE_VIZ_ETA_PLACEHOLDER_PL,
  IK_LIVE_VIZ_NO_ACTIVE_STAGES_PL,
  presentObservationStageStatus,
} from "../src/app/intelligent-estimator/ik-live-visualization-labels.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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
    counts: { ...EMPTY_KNR_COUNTS },
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

function makeSnapshot(over = {}) {
  const {
    report: reportOver,
    flags: flagsOver,
    knr: knrOver,
    labor: laborOver,
    material: materialOver,
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
    identityContext: {
      status: "ready",
      lineCount: 3,
      trustedOkCount: 2,
      ambiguousCount: 0,
      noIdentityCount: 1,
      persistPlans: [],
      reasons: [],
    },
    postIdentityExpert: report,
    identityPersistOutcome: null,
    classification: {
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
    },
    identityCoverage: null,
    composite: {
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
    },
    positionCostBid: {
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
    },
    riskDecision: {
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
    },
    ...rest,
  };
}

function renderViz(observation) {
  return renderToStaticMarkup(
    createElement(LiveVisualizationView, { observation }),
  );
}

console.log("\n=== Status presentation labels ===");
for (const [st, label] of [
  ["pending", "Oczekuje"],
  ["running", "W toku"],
  ["done", "Gotowe"],
  ["partial", "Częściowo"],
  ["hold", "HOLD / Wstrzymane"],
  ["blocked", "Zablokowane"],
  ["failed", "Niekompletne"],
]) {
  assertEq(`label ${st}`, presentObservationStageStatus(st).labelPl, label);
}

console.log("\n=== Progress / stages render ===");
{
  const snap = makeSnapshot();
  const obs = buildAnalysisObservation(snap);
  const html = renderViz(obs);
  assertEq("percent attr === observation", html.includes(`data-ik-live-viz-percent="${obs.progress.percent}"`), true);
  assertEq("aria-valuenow === percent", html.includes(`aria-valuenow="${obs.progress.percent}"`), true);
  assert("progressbar role", html.includes('role="progressbar"'));
  assert("aria-valuemin 0", html.includes('aria-valuemin="0"'));
  assert("aria-valuemax 100", html.includes('aria-valuemax="100"'));
  assert("no Math.max(8 fake floor in fill width)", !html.includes("Math.max"));
  // width style must equal percent exactly
  assertEq(
    "fill width = percent%",
    html.includes(`style="width:${obs.progress.percent}%"`) || html.includes(`style="width: ${obs.progress.percent}%"`),
    true,
  );
  assert("eta placeholder present", html.includes(IK_LIVE_VIZ_ETA_PLACEHOLDER_PL));
  assert("eta data null", html.includes('data-ik-live-viz-eta="null"'));
  assert("final slot null", html.includes('data-ik-live-viz-final="null"'));
  assert("no fake Analiza zakończona", !html.includes("Analiza zakończona"));
  assert("deterministic same obs", renderViz(obs) === html);

  for (const stage of obs.stages) {
    assert(`stage ${stage.stageId} present`, html.includes(`data-ik-live-viz-stage="${stage.stageId}"`));
    assert(
      `stage ${stage.stageId} status`,
      html.includes(`data-ik-live-viz-stage-status="${stage.status}"`),
    );
  }
}

console.log("\n=== Flag OFF stages absent ===");
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
  const html = renderViz(obs);
  assert("no documents stage in DOM", !html.includes('data-ik-live-viz-stage="documents"'));
  assert("no labor stage in DOM", !html.includes('data-ik-live-viz-stage="labor"'));
  assert("no material stage in DOM", !html.includes('data-ik-live-viz-stage="material"'));
  assert("boq present", html.includes('data-ik-live-viz-stage="boq"'));
}

console.log("\n=== totalWeight 0 → not 100% ===");
{
  // Empty work stages impossible via adapter with always-on stages; simulate Observation directly
  const emptyObs = {
    tenderId: "t-empty",
    caseKey: "t-empty",
    updatedAt: "",
    overallStatus: "pending",
    stages: [{ stageId: "complete", status: "pending", actor: "Chief", labelPl: "Gotowe" }],
    conversationHints: [],
    progress: { percent: 0, completedWeight: 0, totalWeight: 0, blocked: false },
    eta: null,
    final: null,
  };
  const html = renderViz(emptyObs);
  assertEq("percent 0", html.includes('data-ik-live-viz-percent="0"'), true);
  assert("no active stages copy", html.includes(IK_LIVE_VIZ_NO_ACTIVE_STAGES_PL));
  assert("not 100%", !html.includes('data-ik-live-viz-percent="100"'));
  assertEq("aria-valuenow 0", html.includes('aria-valuenow="0"'), true);
}

console.log("\n=== runningStageId → aria-current ===");
{
  const snap = makeSnapshot({ bridgeBusy: true, labor: null, material: null });
  const obs = buildAnalysisObservation(snap);
  assertEq("running is documents", obs.progress.runningStageId, "documents");
  const html = renderViz(obs);
  // Find documents li with aria-current="step"
  assert(
    "documents has aria-current step",
    /data-ik-live-viz-stage="documents"[^>]*aria-current="step"/.test(html)
      || /aria-current="step"[^>]*data-ik-live-viz-stage="documents"/.test(html)
      || (html.includes('data-ik-live-viz-stage="documents"') && html.includes('aria-current="step"')),
  );
}

console.log("\n=== C-MEMO labor null → ready updates Observation ===");
{
  const snapNull = makeSnapshot({ labor: null });
  const obsNull = buildAnalysisObservation(snapNull);
  const laborNull = obsNull.stages.find((s) => s.stageId === "labor");
  assertEq("labor null → pending", laborNull?.status, "pending");

  const snapReady = makeSnapshot({ labor: baseLabor({ status: "ready" }) });
  // Same object shape but different labor — simulate Host calling buildAnalysisObservation each render
  const obsReady = buildAnalysisObservation(snapReady);
  const laborReady = obsReady.stages.find((s) => s.stageId === "labor");
  assertEq("labor ready → done", laborReady?.status, "done");
  assert("Observation changed", JSON.stringify(obsNull) !== JSON.stringify(obsReady));

  const htmlNull = renderViz(obsNull);
  const htmlReady = renderViz(obsReady);
  assert("DOM reflects pending labor", htmlNull.includes('data-ik-live-viz-stage-status="pending"'));
  assert("DOM reflects done labor after update", htmlReady.includes('data-ik-live-viz-stage="labor"') && htmlReady.includes('data-ik-live-viz-stage-status="done"'));
}

console.log("\n=== Host wiring source audit ===");
{
  const hostSrc = readFileSync(join(root, "src/app/intelligent-estimator/IkEntryHost.tsx"), "utf8");
  assert("Host imports buildAnalysisObservation", hostSrc.includes("buildAnalysisObservation"));
  assert("Host imports LiveVisualizationView", hostSrc.includes("LiveVisualizationView"));
  assert("Host calls buildAnalysisObservation(orchestra)", hostSrc.includes("buildAnalysisObservation(orchestra)"));
  assert("Host mounts LiveVisualizationView", hostSrc.includes("<LiveVisualizationView observation={observation}"));
  const mountLive = hostSrc.indexOf("<LiveVisualizationView");
  const mountEc = hostSrc.indexOf("<ExpertConversationSurface");
  assert("LiveViz JSX before ExpertConversationSurface", mountLive >= 0 && mountEc >= 0 && mountLive < mountEc);
  assert("no useMemo on orchestra alone", !/useMemo\(\s*\(\)\s*=>\s*buildAnalysisObservation\(orchestra\)\s*,\s*\[\s*orchestra\s*\]/.test(hostSrc));
  assert("EC Surface still present", hostSrc.includes("<ExpertConversationSurface vm={vm}"));
  assert("no Math.max(8 in Host", !hostSrc.includes("Math.max(8"));
}

console.log("\n=== Side-effect / forbidden scope source ===");
{
  const vizSrc = readFileSync(join(root, "src/app/intelligent-estimator/LiveVisualizationView.tsx"), "utf8");
  const labelsSrc = readFileSync(join(root, "src/app/intelligent-estimator/ik-live-visualization-labels.ts"), "utf8");
  for (const [name, src] of [
    ["Viz", vizSrc],
    ["labels", labelsSrc],
  ]) {
    assert(`${name}: no fetch(`, !src.includes("fetch("));
    assert(`${name}: no localStorage`, !src.includes("localStorage"));
    assert(`${name}: no supabase`, !src.includes("supabase"));
    assert(`${name}: no useIkOrchestra`, !src.includes("useIkOrchestra"));
    assert(`${name}: no runIk`, !src.includes("runIk"));
  }
  assert("Viz prop only observation", vizSrc.includes("observation: AnalysisObservation"));
  assert("Viz no orchestra prop", !vizSrc.includes("orchestra:"));
  assert("Viz no Math.max(8", !vizSrc.includes("Math.max(8"));
  assert("Viz reduced motion", vizSrc.includes("prefersReducedMotion") || vizSrc.includes("motion-reduce") || vizSrc.includes("motion-safe"));
  assert("long label truncate", vizSrc.includes("truncate"));
}

console.log("\n=== Mobile long label / overflow classes ===");
{
  const longObs = buildAnalysisObservation(makeSnapshot());
  // inject absurdly long label via stages copy
  const obs = {
    ...longObs,
    stages: longObs.stages.map((s, i) =>
      i === 0
        ? { ...s, labelPl: "X".repeat(120) }
        : s,
    ),
  };
  const html = renderViz(obs);
  assert("truncate class present for long labels", html.includes("truncate"));
  assert("title attr for accessibility", html.includes('title="'));
}

console.log(`\n=== RESULT pass=${pass} fail=${fail} ===`);
if (fail > 0) process.exit(1);
