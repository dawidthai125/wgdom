/**
 * IK-ANALYSIS-OBSERVABILITY-PROJECTION-01 — Phase 4 Team Conversation tests.
 * Run: npx vite-node scripts/test-ik-analysis-observability-projection-01-p4-team-conversation.mjs
 *
 * Fixtures only · ZERO cloud / KV / network.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAnalysisObservation,
} from "../src/lib/intelligent-estimator/analysis-observation.ts";
import {
  mapObservationStatusToEcStepStatus,
  resolveObservationStageIdForEcStep,
  overlayObservationStatusesOnConversationVm,
} from "../src/lib/intelligent-estimator/ik-entry-conversation.ts";
import { labelConversationStatusPl } from "../src/lib/expert-conversation-ui/labels.ts";

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

const BRIDGE = [
  ["pending", "pending"],
  ["running", "active"],
  ["done", "done"],
  ["partial", "partial"],
  ["blocked", "blocked"],
  ["hold", "hold"],
  ["failed", "gap"],
];

console.log("\n=== P4.1 Exhaustive status bridge ===");
for (const [obs, ec] of BRIDGE) {
  assertEq(`bridge ${obs}→${ec}`, mapObservationStatusToEcStepStatus(obs), ec);
}
assert("running→active mandatory", mapObservationStatusToEcStepStatus("running") === "active");
assert("failed→gap mandatory", mapObservationStatusToEcStepStatus("failed") === "gap");
assert(
  "no skipped from Observation",
  BRIDGE.every(([, ec]) => ec !== "skipped"),
);

console.log("\n=== P4.2 / P4.3 Stage mapping (id,event) ===");
assertEq("documents", resolveObservationStageIdForEcStep("documents", "DOCUMENTS_DISCOVERED"), "documents");
assertEq("ingest", resolveObservationStageIdForEcStep("ingest", "INGEST_STARTED"), "documents");
assertEq("swz", resolveObservationStageIdForEcStep("swz", "SWZ_PRESENT"), "documents");
assertEq("cost_docs", resolveObservationStageIdForEcStep("cost_docs", "COST_DOCUMENTS_IDENTIFIED"), "documents");
assertEq("przedmiary", resolveObservationStageIdForEcStep("przedmiary", "PRZEDMIARY_DISCOVERED"), "documents");
assertEq("extraction BOQ", resolveObservationStageIdForEcStep("extraction", "BOQ_EXTRACTED"), "boq");
assertEq("BOQ_VALIDATED", resolveObservationStageIdForEcStep("validation", "BOQ_VALIDATED"), "boq");
assertEq("LINE_INTEGRITY", resolveObservationStageIdForEcStep("validation", "LINE_INTEGRITY_VALIDATED"), "boq");
assertEq("DWELLING_MAP_COMPLETE→boq", resolveObservationStageIdForEcStep("validation", "DWELLING_MAP_COMPLETE"), "boq");
assertEq("DWELLING_MAP_REQUIRED→boq", resolveObservationStageIdForEcStep("validation", "DWELLING_MAP_REQUIRED"), "boq");
assertEq("VALIDATION_EXPERT→risk", resolveObservationStageIdForEcStep("validation", "VALIDATION_EXPERT"), "risk");
assertEq("boq_status", resolveObservationStageIdForEcStep("boq_status", "MASTER_BOQ_READY"), "boq");
assertEq("knr", resolveObservationStageIdForEcStep("knr", "KNR_REPORT"), "knr");
assertEq("classification", resolveObservationStageIdForEcStep("classification", "CLASSIFICATION_STATUS"), "classification");
assertEq("labor family", resolveObservationStageIdForEcStep("labor", "LABOR_RATE_MISS"), "labor");
assertEq("WORK_IDENTITY_RESOLVED", resolveObservationStageIdForEcStep("labor", "WORK_IDENTITY_RESOLVED"), "labor");
assertEq("material family", resolveObservationStageIdForEcStep("material", "MATERIAL_PRICE_MEMORY_HIT"), "material");
assertEq("OWNER_MATERIAL", resolveObservationStageIdForEcStep("material", "OWNER_MATERIAL_MAPPING_REQUIRED"), "material");
assertEq("identity_coverage", resolveObservationStageIdForEcStep("identity_coverage", "IDENTITY_COVERAGE_STARTED"), "identity");
assertEq("IDENTITY_COVERAGE_OPS", resolveObservationStageIdForEcStep("identity", "IDENTITY_COVERAGE_OPS"), "identity");
assertEq("OWNER_ACTION_QUEUE", resolveObservationStageIdForEcStep("identity", "OWNER_ACTION_QUEUE"), "identity");
assertEq("COMPOSITE", resolveObservationStageIdForEcStep("cost", "COMPOSITE_BOTH_HOLD"), "composite");
assertEq("POSITION_COST_F5", resolveObservationStageIdForEcStep("cost", "POSITION_COST_F5"), "pricing");
assertEq("PACKAGE_SUM", resolveObservationStageIdForEcStep("pricing", "PACKAGE_SUM"), "pricing");
assertEq("BID_PROPOSAL", resolveObservationStageIdForEcStep("offer", "BID_PROPOSAL"), "pricing");
assertEq("RISK_OVERLAY", resolveObservationStageIdForEcStep("chief_start", "RISK_OVERLAY"), "risk");
assertEq("CHIEF_FINAL", resolveObservationStageIdForEcStep("chief_final", "CHIEF_DECISION_CONTEXT"), "risk");
assertEq("DECISION_WORKSPACE", resolveObservationStageIdForEcStep("offer", "DECISION_WORKSPACE"), "risk");

console.log("\n=== Unmapped / unknown events ===");
assertEq("unknown validation event → null", resolveObservationStageIdForEcStep("validation", "SOMETHING_NEW"), null);
assertEq("unknown cost event → null", resolveObservationStageIdForEcStep("cost", "UNKNOWN_COST"), null);
assertEq("unknown offer event → null", resolveObservationStageIdForEcStep("offer", "UNKNOWN_OFFER"), null);
assert("no silent id-alone for validation", resolveObservationStageIdForEcStep("validation", "") === null);

console.log("\n=== Overlay pure + authority + truth ===");

function makeStep(partial) {
  return {
    id: "labor",
    actorLabelPl: "Labor",
    status: "pending",
    statusLabelPl: labelConversationStatusPl("pending"),
    messagePl: "legacy message",
    detailPl: "legacy detail",
    event: "LABOR_RATE_MISS",
    offerPricePln: null,
    offerPriceDisplayPl: null,
    iconKey: "flag",
    messageWeight: 14,
    sourceRef: {
      kind: "labor_lookup",
      tenderId: "t-1",
      artifact: { ourRateMiss: 1 },
    },
    ...partial,
  };
}

function makeVm(steps) {
  return {
    visible: true,
    titlePl: "T",
    subtitlePl: "S",
    uiPhase: "ik_entry",
    caseIdShort: "t-1",
    steps,
    readyForDecision: false,
    hasBlocked: false,
  };
}

const observationRunningLabor = {
  tenderId: "t-1",
  caseKey: "t-1",
  updatedAt: "",
  overallStatus: "running",
  conversationHints: [],
  eta: null,
  final: null,
  progress: {
    percent: 42,
    completedWeight: 20,
    totalWeight: 100,
    runningStageId: "labor",
    blocked: false,
  },
  stages: [
    { stageId: "documents", status: "done", actor: "Document", labelPl: "Dokumenty" },
    { stageId: "boq", status: "done", actor: "Document", labelPl: "BOQ" },
    { stageId: "knr", status: "done", actor: "Knr", labelPl: "KNR" },
    { stageId: "identity", status: "done", actor: "Control", labelPl: "Identity" },
    { stageId: "classification", status: "done", actor: "Control", labelPl: "Klasyfikacja" },
    { stageId: "labor", status: "running", actor: "Labor", labelPl: "Robocizna" },
    { stageId: "material", status: "pending", actor: "Material", labelPl: "Materiały" },
    { stageId: "composite", status: "pending", actor: "Pricing", labelPl: "Composite" },
    { stageId: "pricing", status: "pending", actor: "Pricing", labelPl: "Pricing" },
    { stageId: "risk", status: "pending", actor: "Risk", labelPl: "Risk" },
    { stageId: "complete", status: "pending", actor: "Chief", labelPl: "Gotowe" },
  ],
};

const legacy = makeVm([
  makeStep({ status: "partial", statusLabelPl: labelConversationStatusPl("partial") }),
]);
const frozenLegacyStatus = legacy.steps[0].status;
const overlaid = overlayObservationStatusesOnConversationVm(legacy, observationRunningLabor);

assertEq("overlay labor status from Observation running→active", overlaid.steps[0].status, "active");
assertEq(
  "statusLabelPl from labelConversationStatusPl",
  overlaid.steps[0].statusLabelPl,
  labelConversationStatusPl("active"),
);
assertEq("messagePl preserved", overlaid.steps[0].messagePl, "legacy message");
assertEq("detailPl preserved", overlaid.steps[0].detailPl, "legacy detail");
assertEq("sourceRef preserved", overlaid.steps[0].sourceRef?.kind, "labor_lookup");
assertEq("event preserved", overlaid.steps[0].event, "LABOR_RATE_MISS");
assertEq("id preserved", overlaid.steps[0].id, "labor");
assertEq("legacy VM not mutated", legacy.steps[0].status, frozenLegacyStatus);
assertEq("messageWeight preserved", overlaid.steps[0].messageWeight, 14);
assert(
  "overlay does not change Observation percent",
  observationRunningLabor.progress.percent === 42,
);

// Truth: done without valid sourceRef → hold after overlay
const truthVm = makeVm([
  makeStep({
    id: "boq_status",
    event: "MASTER_BOQ_READY",
    status: "gap",
    statusLabelPl: labelConversationStatusPl("gap"),
    sourceRef: null,
  }),
]);
const obsDoneBoq = {
  ...observationRunningLabor,
  overallStatus: "done",
  stages: observationRunningLabor.stages.map((s) =>
    s.stageId === "boq" ? { ...s, status: "done" } : s,
  ),
};
const afterTruth = overlayObservationStatusesOnConversationVm(truthVm, obsDoneBoq);
assertEq("done without sourceRef → hold", afterTruth.steps[0].status, "hold");

console.log("\n=== Flag-OFF / missing stage ===");
const obsNoLabor = {
  ...observationRunningLabor,
  overallStatus: "partial",
  stages: observationRunningLabor.stages.filter((s) => s.stageId !== "labor"),
  progress: { ...observationRunningLabor.progress, runningStageId: undefined },
};
const laborLegacyDone = makeVm([
  makeStep({ status: "done", statusLabelPl: labelConversationStatusPl("done") }),
]);
const offOverlay = overlayObservationStatusesOnConversationVm(laborLegacyDone, obsNoLabor);
assert(
  "Flag-OFF never → skipped",
  offOverlay.steps[0].status !== "skipped",
);
assertEq(
  "missing stage uses overallStatus bridge (partial→partial), not legacy done",
  offOverlay.steps[0].status,
  "partial",
);

console.log("\n=== Event-gated validation/cost/offer ===");
const multi = makeVm([
  makeStep({ id: "validation", event: "DWELLING_MAP_COMPLETE", status: "pending" }),
  makeStep({ id: "validation", event: "VALIDATION_EXPERT", status: "pending" }),
  makeStep({ id: "cost", event: "COMPOSITE_BOTH_HOLD", status: "pending" }),
  makeStep({ id: "cost", event: "POSITION_COST_F5", status: "pending" }),
  makeStep({ id: "offer", event: "BID_PROPOSAL", status: "pending" }),
  makeStep({ id: "offer", event: "DECISION_WORKSPACE", status: "pending" }),
]);
const obsGated = {
  ...observationRunningLabor,
  overallStatus: "running",
  stages: observationRunningLabor.stages.map((s) => {
    if (s.stageId === "boq") return { ...s, status: "partial" };
    if (s.stageId === "risk") return { ...s, status: "running" };
    if (s.stageId === "composite") return { ...s, status: "hold" };
    if (s.stageId === "pricing") return { ...s, status: "blocked" };
    return s;
  }),
};
const gated = overlayObservationStatusesOnConversationVm(multi, obsGated);
assertEq("DWELLING→boq partial", gated.steps[0].status, "partial");
assertEq("VALIDATION_EXPERT→risk active", gated.steps[1].status, "active");
assertEq("COMPOSITE→hold", gated.steps[2].status, "hold");
assertEq("POSITION_COST→blocked", gated.steps[3].status, "blocked");
assertEq("BID→blocked (pricing)", gated.steps[4].status, "blocked");
assertEq("DW→active (risk)", gated.steps[5].status, "active");

console.log("\n=== runningStageId parity (mapped labor) ===");
assertEq(
  "runningStageId labor ↔ active labor step",
  observationRunningLabor.progress.runningStageId,
  "labor",
);
assertEq(
  "mapped labor step is active",
  overlaid.steps[0].status,
  "active",
);

console.log("\n=== No second weighting / Surface untouched (static) ===");
const entrySrc = readFileSync(join(root, "src/lib/intelligent-estimator/ik-entry-conversation.ts"), "utf8");
const hostSrc = readFileSync(join(root, "src/app/intelligent-estimator/IkEntryHost.tsx"), "utf8");
const surfaceSrc = readFileSync(join(root, "src/app/expert-conversation/ExpertConversationSurface.tsx"), "utf8");
const obsSrc = readFileSync(join(root, "src/lib/intelligent-estimator/analysis-observation.ts"), "utf8");

assert("overlay does not call computeAnalysisProgress", !entrySrc.includes("computeAnalysisProgress"));
assert("overlay does not import OBSERVATION_STAGE_WEIGHTS", !entrySrc.includes("OBSERVATION_STAGE_WEIGHTS"));
assert("Host uses overlayObservationStatusesOnConversationVm", hostSrc.includes("overlayObservationStatusesOnConversationVm"));
assert("Host keeps LiveVisualizationView", hostSrc.includes("LiveVisualizationView"));
assert("Host overlays onto vm for Surface", hostSrc.includes("overlayObservationStatusesOnConversationVm(legacyVm, observation)"));
assert("Host Surface still vm={vm}", hostSrc.includes("<ExpertConversationSurface vm={vm}"));
assert("Surface still has 44px", /min-h-\[44px\]/.test(surfaceSrc));
assert("Surface data-ik-mobile-ready", surfaceSrc.includes("data-ik-mobile-ready"));
assert("Surface Skip preserved", surfaceSrc.includes("EXPERT_CONVERSATION_SKIP_PL"));
assert("Surface Continue preserved", surfaceSrc.includes("EXPERT_CONVERSATION_CONTINUE_PL"));
assert("Surface prefersReducedMotion", surfaceSrc.includes("prefersReducedMotion"));
assert("Observation conversationHints still []", obsSrc.includes("conversationHints: []") || obsSrc.includes("conversationHints:[]"));
assert("Observation eta null contract", obsSrc.includes("eta: null"));
assert("no Math.max(8 in Host", !hostSrc.includes("Math.max(8"));

console.log("\n=== Unknown event uses overallStatus (not legacy) ===");
const unknownVm = makeVm([
  makeStep({
    id: "validation",
    event: "BRAND_NEW_EVENT",
    status: "done",
    statusLabelPl: labelConversationStatusPl("done"),
    sourceRef: {
      kind: "document",
      tenderId: "t-1",
      artifact: { x: 1 },
    },
  }),
]);
const unk = overlayObservationStatusesOnConversationVm(unknownVm, {
  ...observationRunningLabor,
  overallStatus: "hold",
});
assertEq("unmapped → overallStatus hold, not legacy done", unk.steps[0].status, "hold");

console.log(`\n=== RESULT pass=${pass} fail=${fail} ===`);
if (fail > 0) process.exit(1);
