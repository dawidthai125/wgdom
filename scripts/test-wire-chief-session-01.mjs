/**
 * WIRE-CHIEF-SESSION-01 — unit tests.
 * npx vite-node scripts/test-wire-chief-session-01.mjs
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildChiefSessionCaseId,
  buildChiefSessionFingerprint,
  CHIEF_ORCHESTRATOR_SESSION_DEFAULT,
  CHIEF_ORCHESTRATOR_SESSION_LS_KEY,
  createChiefSessionEngine,
  forceChiefOrchestratorSessionForTests,
  isChiefOrchestratorSessionEnabled,
} from "../src/lib/chief-session/index.ts";
import { runChiefOrchestrator } from "../src/lib/chief-orchestrator/index.ts";
import { defaultExecutionExpertBusinessProfile } from "../src/lib/execution-expert/index.ts";
import { DEFAULT_MATERIAL_MARKET_MAP } from "../src/lib/pricing-expert/index.ts";
import {
  clearCapabilityRegistryForTests,
  clearDefinitionRegistryForTests,
  clearPackRegistryForTests,
  seedB0Fixtures,
} from "../src/lib/technology-foundation/index.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

let passed = 0;
function ok(name, cond = true) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`PASS ${name}`);
}

function resetTf() {
  clearPackRegistryForTests();
  clearDefinitionRegistryForTests();
  clearCapabilityRegistryForTests();
  seedB0Fixtures();
}

function snap(price, origin, updatedAt, confidence = 0.85) {
  return {
    price,
    regionCode: "dolnyslask",
    coverage: "full",
    updatedAt,
    confidence,
    origin,
  };
}

function makeWork(id, price) {
  const freshAt = "2026-07-15T00:00:00.000Z";
  return {
    id,
    tradeId: "POZOSTALE",
    namePl: id,
    unit: "m2",
    companyPricePln: 999,
    marketQuotes: {
      kb_pl: { dolnyslask: snap(price, "kb_pl", freshAt) },
      interbud: { dolnyslask: snap(price * 1.1, "interbud", freshAt, 0.7) },
      sekocenbud: { dolnyslask: snap(price * 1.05, "sekocenbud", freshAt) },
      wgdom: { dolnyslask: snap(price * 0.98, "wgdom", freshAt) },
    },
    updatedAt: freshAt,
    freshnessStatus: "ok",
    keywords: [],
    active: true,
    favorite: false,
    usageCount: 0,
    source: "custom",
  };
}

function eticsLine() {
  return {
    lineId: "L1",
    lp: "1",
    description: "Ocieplenie ścian zewnętrznych systemem ETICS",
    quantity: 100,
    quantityRaw: "100",
    unit: "m2",
    catalogWorkId: "cw.etics.boards",
    workCategory: null,
    categoryId: null,
    knrHint: null,
    matchMethod: "unmatched",
    matchedBy: "unmatched",
    matchConfidence: "low",
    candidateMatches: [],
  };
}

function baseDoc(lines, tenderId = "t-session-01") {
  return {
    schemaVersion: 5,
    tenderId,
    version: 1,
    builtAt: "2026-08-07T12:00:00.000Z",
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
    recomputeToken: "tok-session",
    buildStatus: "mapped",
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

function companyRo() {
  return {
    purchaseByMaterialKey: {
      "mat.eps_graph": { unitPricePln: 45 },
      "mat.glue_etics": { unitPricePln: 3.2 },
      "mat.mesh": { unitPricePln: 4.5 },
      "mat.render": { unitPricePln: 2.8 },
    },
    defaultLaborPlnPerHour: 65,
    equipmentRateByKey: {
      "eq.scaffold": { unitPricePln: 8 },
      "eq.mixer": { unitPricePln: 120 },
    },
    auxiliaryPctOfDirect: 0.03,
    internalOverheadPct: 0.08,
  };
}

function catalogMap() {
  const worksById = new Map();
  for (const e of DEFAULT_MATERIAL_MARKET_MAP) {
    worksById.set(e.workId, makeWork(e.workId, 50));
  }
  return worksById;
}

function readyRuntimeRo(overrides = {}) {
  const nowMs = Date.parse("2026-08-07T12:00:00.000Z");
  const nowIso = new Date(nowMs).toISOString();
  return {
    offerBoq: baseDoc([eticsLine()]),
    pricing: {
      catalog: { worksById: catalogMap() },
      nowMs,
      computedAtIso: nowIso,
    },
    company: companyRo(),
    offerStrategy: undefined,
    meta: {
      builtAtIso: nowIso,
      tenderPipelineItemId: "t-session-01",
      sources: {
        offerBoq: "buildOfferBoqDocumentForPipelineItem",
        catalog: "kw-wgdom-work-catalog",
        companyProfile: "kw-tenders-company-profile",
        companyKnowledge: "skipped",
        offerStrategy: "offer-expert.defaultOfferStrategyParams",
      },
      gaps: [],
    },
    readyForChiefInput: true,
    ...overrides,
  };
}

function flushMicrotasks() {
  return new Promise((r) => queueMicrotask(r));
}

console.log("\n=== WIRE-CHIEF-SESSION-01 — flag default OFF ===\n");
forceChiefOrchestratorSessionForTests(null);
ok("flag default const false", CHIEF_ORCHESTRATOR_SESSION_DEFAULT === false);
ok("flag LS key", CHIEF_ORCHESTRATOR_SESSION_LS_KEY === "kw-chief-orchestrator-session");
ok("flag runtime OFF", isChiefOrchestratorSessionEnabled() === false);
forceChiefOrchestratorSessionForTests(true);
ok("flag force ON", isChiefOrchestratorSessionEnabled() === true);
forceChiefOrchestratorSessionForTests(false);
ok("flag force OFF", isChiefOrchestratorSessionEnabled() === false);
forceChiefOrchestratorSessionForTests(null);

console.log("\n=== caseId / fingerprint ===\n");
ok(
  "caseId shape",
  buildChiefSessionCaseId({ tenderPipelineItemId: "abc", fingerprint: "1|x" }) ===
    "chief:abc:1|x",
);
ok(
  "fingerprint stable",
  buildChiefSessionFingerprint({
    offerBoqLineCount: 2,
    recomputeToken: "t",
    builtAt: "b",
    parserVersion: 3,
  }) === "2|t|b|3",
);

console.log("\n=== Happy path ===\n");
resetTf();
{
  const engine = createChiefSessionEngine({ isEnabled: () => true });
  const started = engine.start({
    runtimeRo: readyRuntimeRo(),
    caseId: "chief:t-session-01:happy",
    pricingReady: true,
    maxReturnLoops: 0,
    nowIso: "2026-08-07T12:00:00.000Z",
  });
  ok("happy start accepted", started === true);
  ok("happy running", engine.getSnapshot().running === true);
  await flushMicrotasks();
  const s = engine.getSnapshot();
  ok("happy ready_for_decydent", s.status === "ready_for_decydent");
  ok("happy readyForDecision", s.readyForDecision === true);
  ok("happy dossier in-memory", s.dossier != null && s.dossier.caseId === s.caseId);
  ok("happy caseState", s.caseState === "ready_for_decydent");
  ok("happy tasks", Array.isArray(s.taskStates) && s.taskStates.length > 0);
}

console.log("\n=== Not ready ===\n");
{
  const engine = createChiefSessionEngine({ isEnabled: () => true });
  const started = engine.start({
    runtimeRo: readyRuntimeRo({ readyForChiefInput: false, offerBoq: null }),
    caseId: "chief:not-ready",
    pricingReady: true,
  });
  ok("not-ready rejected", started === false);
  ok("not-ready idle", engine.getSnapshot().status === "idle");
  ok("not-ready error", engine.getSnapshot().error === "not_ready_for_chief_input");
}

console.log("\n=== Flag OFF blocks start ===\n");
{
  const engine = createChiefSessionEngine({ isEnabled: () => false });
  const started = engine.start({
    runtimeRo: readyRuntimeRo(),
    caseId: "chief:flag-off",
    pricingReady: true,
  });
  ok("flag-off rejected", started === false);
  ok("flag-off idle", engine.getSnapshot().status === "idle");
}

console.log("\n=== Cancel (before apply) ===\n");
resetTf();
{
  let deferred = null;
  const engine = createChiefSessionEngine({
    isEnabled: () => true,
    schedule: (fn) => {
      deferred = fn;
    },
  });
  engine.start({
    runtimeRo: readyRuntimeRo(),
    caseId: "chief:cancel",
    pricingReady: true,
    maxReturnLoops: 0,
    nowIso: "2026-08-07T12:00:00.000Z",
  });
  ok("cancel pre-running", engine.getSnapshot().status === "running");
  engine.cancel();
  ok("cancel status", engine.getSnapshot().status === "cancelled");
  ok("cancel not running", engine.getSnapshot().running === false);
  deferred?.();
  ok("cancel ignore late apply", engine.getSnapshot().status === "cancelled");
  ok("cancel no dossier", engine.getSnapshot().dossier == null);
}

console.log("\n=== Stale request ===\n");
resetTf();
{
  let deferred = null;
  const engine = createChiefSessionEngine({
    isEnabled: () => true,
    schedule: (fn) => {
      deferred = fn;
    },
  });
  engine.start({
    runtimeRo: readyRuntimeRo(),
    caseId: "chief:stale-a",
    pricingReady: true,
    maxReturnLoops: 0,
    nowIso: "2026-08-07T12:00:00.000Z",
  });
  const firstDeferred = deferred;
  engine.invalidate("stale");
  ok("stale status cancelled", engine.getSnapshot().status === "cancelled");
  ok("stale error", engine.getSnapshot().error === "stale");
  firstDeferred?.();
  ok("stale late apply ignored", engine.getSnapshot().dossier == null);
}

console.log("\n=== Double run blocked ===\n");
resetTf();
{
  let deferred = null;
  const engine = createChiefSessionEngine({
    isEnabled: () => true,
    schedule: (fn) => {
      deferred = fn;
    },
  });
  const a = engine.start({
    runtimeRo: readyRuntimeRo(),
    caseId: "chief:double",
    pricingReady: true,
    maxReturnLoops: 0,
    nowIso: "2026-08-07T12:00:00.000Z",
  });
  const b = engine.start({
    runtimeRo: readyRuntimeRo(),
    caseId: "chief:double-2",
    pricingReady: true,
    maxReturnLoops: 0,
    nowIso: "2026-08-07T12:00:00.000Z",
  });
  ok("double first ok", a === true);
  ok("double second blocked", b === false);
  deferred?.();
  await flushMicrotasks();
}

console.log("\n=== Loop via real Chief ===\n");
resetTf();
{
  const engine = createChiefSessionEngine({ isEnabled: () => true });
  engine.start({
    runtimeRo: readyRuntimeRo(),
    caseId: "chief:loop",
    pricingReady: true,
    maxReturnLoops: 1,
    nowIso: "2026-08-07T12:00:00.000Z",
  });
  await flushMicrotasks();
  const s = engine.getSnapshot();
  ok("loop count 1", s.loopCount === 1);
  ok("loop ready", s.status === "ready_for_decydent");
}

console.log("\n=== Blocked Cost ===\n");
resetTf();
{
  const engine = createChiefSessionEngine({ isEnabled: () => true });
  engine.start({
    runtimeRo: readyRuntimeRo({
      company: { ...companyRo(), purchaseByMaterialKey: {} },
    }),
    caseId: "chief:block-cost",
    pricingReady: true,
    nowIso: "2026-08-07T12:00:00.000Z",
  });
  await flushMicrotasks();
  const s = engine.getSnapshot();
  ok("blocked-cost status", s.status === "blocked");
  ok("blocked-cost case", s.caseState === "blocked");
  ok("blocked-cost dossier", s.dossier?.status === "blocked");
  ok("blocked-cost not readyForDecision", s.readyForDecision === false);
}

console.log("\n=== Blocked Offer (injected) ===\n");
{
  const engine = createChiefSessionEngine({
    isEnabled: () => true,
    run: () => ({
      caseId: "chief:block-offer",
      status: "blocked",
      tasks: [
        {
          id: "T5_offer",
          status: "failed",
          startedAt: "t",
          finishedAt: "t",
          failReasonPl: "G-OFFER FAIL",
        },
      ],
      loopCount: 0,
      experts: {
        execution: null,
        materials: null,
        pricing: null,
        cost: null,
        offer: null,
      },
      dossier: {
        caseId: "chief:block-offer",
        status: "blocked",
        createdAt: "t",
        finishedAt: "t",
        loopCount: 0,
        tasks: [],
        traces: {
          execution: null,
          materials: null,
          pricing: null,
          cost: null,
          offer: null,
        },
        experts: {
          execution: null,
          materials: null,
          pricing: null,
          cost: null,
          offer: null,
        },
        offerHandoffPayload: null,
        decisionMakerPayload: null,
        primaryRecommendation: null,
        scenarios: [],
        orchestrationNotesPl: ["G-OFFER FAIL"],
        handoffBlockersPl: ["G-OFFER FAIL"],
        returnFlags: {
          returnToMaterialExpert: false,
          requiresReanalysis: false,
        },
      },
    }),
  });
  engine.start({
    runtimeRo: readyRuntimeRo(),
    caseId: "chief:block-offer",
    pricingReady: true,
  });
  await flushMicrotasks();
  ok("blocked-offer status", engine.getSnapshot().status === "blocked");
  ok(
    "blocked-offer T5 failed",
    engine.getSnapshot().taskStates?.find((t) => t.id === "T5_offer")?.status ===
      "failed",
  );
}

console.log("\n=== Rerun ===\n");
resetTf();
{
  const engine = createChiefSessionEngine({ isEnabled: () => true });
  engine.start({
    runtimeRo: readyRuntimeRo(),
    caseId: "chief:rerun-1",
    pricingReady: true,
    maxReturnLoops: 0,
    nowIso: "2026-08-07T12:00:00.000Z",
  });
  await flushMicrotasks();
  const firstId = engine.getSnapshot().requestId;
  const okRerun = engine.rerun({
    runtimeRo: readyRuntimeRo(),
    caseId: "chief:rerun-2",
    pricingReady: true,
    maxReturnLoops: 0,
    nowIso: "2026-08-07T12:00:00.000Z",
  });
  ok("rerun accepted", okRerun === true);
  await flushMicrotasks();
  ok("rerun new requestId", engine.getSnapshot().requestId > firstId);
  ok("rerun ready", engine.getSnapshot().status === "ready_for_decydent");
}

console.log("\n=== LOCK — no Expert/Chief/TF/Adapter BC edits in this EPIC ===\n");
{
  const adapters = [
    "src/lib/chief-wire-adapters/assemble.ts",
    "src/lib/chief-wire-adapters/types.ts",
    "src/lib/chief-orchestrator/run.ts",
    "src/lib/chief-orchestrator/gates.ts",
    "src/lib/execution-expert/index.ts",
    "src/lib/material-expert/index.ts",
    "src/lib/pricing-expert/index.ts",
    "src/lib/cost-expert/index.ts",
    "src/lib/offer-expert/index.ts",
  ];
  // Presence-only: files exist and Session does not re-export domain analyze*
  for (const rel of adapters) {
    const abs = join(root, rel);
    readFileSync(abs, "utf8");
    ok(`lock file exists ${rel}`);
  }
  const engineSrc = readFileSync(join(root, "src/lib/chief-session/engine.ts"), "utf8");
  ok("session no analyzeExecution", !engineSrc.includes("analyzeExecutionFromOfferBoq"));
  ok("session no analyzeMaterials", !engineSrc.includes("analyzeMaterialsFromExecution"));
  ok("session no OfferBoq write", !engineSrc.includes("saveOfferBoq"));
  ok("session REUSE runChiefOrchestrator", engineSrc.includes("runChiefOrchestrator"));
}

console.log("\n=== Regression smoke: real Chief still works ===\n");
resetTf();
{
  const nowMs = Date.parse("2026-08-07T12:00:00.000Z");
  const nowIso = new Date(nowMs).toISOString();
  const happy = runChiefOrchestrator({
    caseId: "case-reg",
    offerBoq: baseDoc([eticsLine()], "t-reg"),
    executionProfile: defaultExecutionExpertBusinessProfile(),
    pricing: {
      catalog: { worksById: catalogMap() },
      nowMs,
      computedAtIso: nowIso,
    },
    company: companyRo(),
    maxReturnLoops: 0,
    nowIso,
  });
  ok("regression chief ready", happy.status === "ready_for_decydent");
}

console.log(`\nALL PASS (${passed})\n`);
