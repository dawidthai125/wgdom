/**
 * IK-ANALYSIS-DECISION-BID-HANDOFF-01 — pure VM + presentation contract smoke.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { buildIkAnalysisHandoffViewModel } from "../src/lib/intelligent-estimator/ik-analysis-handoff-ui.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

let failed = 0;
function ok(name, cond) {
  if (cond) console.log(`PASS ${name}`);
  else {
    console.error(`FAIL ${name}`);
    failed += 1;
  }
}

function baseObservation(overrides = {}) {
  return {
    tenderId: "t1",
    caseKey: "t1",
    updatedAt: "2026-01-01T00:00:00.000Z",
    overallStatus: "running",
    stages: [
      {
        stageId: "documents",
        status: "done",
        actor: "Document",
        labelPl: "Dokumenty",
      },
      {
        stageId: "boq",
        status: "running",
        actor: "Document",
        labelPl: "BOQ",
      },
      {
        stageId: "complete",
        status: "pending",
        actor: "Control",
        labelPl: "Complete",
      },
    ],
    conversationHints: [],
    progress: {
      percent: 40,
      completedWeight: 2,
      totalWeight: 5,
      runningStageId: "boq",
      blocked: false,
    },
    eta: null,
    final: null,
    ...overrides,
  };
}

const runningVm = buildIkAnalysisHandoffViewModel({
  observation: baseObservation(),
  ownerActionQueue: null,
  packageBlockers: null,
  bidUi: null,
});
ok("in_progress bucket", runningVm.bucket === "in_progress");
ok("final null proof", runningVm.observationFinalIsNull === true);
ok("eta null proof", runningVm.observationEtaIsNull === true);

const ownerVm = buildIkAnalysisHandoffViewModel({
  observation: baseObservation({
    overallStatus: "done",
    progress: {
      percent: 100,
      completedWeight: 5,
      totalWeight: 5,
      blocked: false,
    },
    stages: [
      {
        stageId: "documents",
        status: "done",
        actor: "Document",
        labelPl: "Dokumenty",
      },
      {
        stageId: "complete",
        status: "done",
        actor: "Control",
        labelPl: "Complete",
      },
    ],
  }),
  ownerActionQueue: {
    tenderId: "t1",
    itemCount: 1,
    packageGateBlockingCount: 1,
    items: [
      {
        domain: "labor_accept",
        lineRef: "L1",
        dwellingId: "d1",
        blockerCode: "X",
        priority: 1,
        deepLink: "labor",
        labelPl: "Akceptuj labor",
        suggestedActionPl: "Accept",
        blocksPackageGate: true,
      },
    ],
  },
  packageBlockers: null,
  bidUi: null,
  deepLinkContext: { chiefDossierAvailable: true },
});
ok("requires_owner bucket", ownerVm.bucket === "requires_owner");
ok("owner CTA kind", ownerVm.cta.kind === "owner_action" || ownerVm.cta.kind === "kosztorys_bid" || ownerVm.cta.kind === "decision" || ownerVm.cta.kind === "none");

const readyVm = buildIkAnalysisHandoffViewModel({
  observation: baseObservation({
    overallStatus: "done",
    progress: {
      percent: 100,
      completedWeight: 5,
      totalWeight: 5,
      blocked: false,
    },
    stages: [
      {
        stageId: "documents",
        status: "done",
        actor: "Document",
        labelPl: "Dokumenty",
      },
      {
        stageId: "complete",
        status: "done",
        actor: "Control",
        labelPl: "Complete",
      },
    ],
  }),
  ownerActionQueue: { tenderId: "t1", itemCount: 0, packageGateBlockingCount: 0, items: [] },
  packageBlockers: null,
  bidUi: {
    authoritativeSource: "legacy",
    proposal: null,
    recommendedBidPln: null,
    pdfExportBlocked: false,
    uiStatus: "legacy",
    packageGatePass: null,
    reasonsPl: [],
    gapNotePl: null,
  },
  chiefDossierAvailable: true,
  decisionUiPhase: "ready",
});
ok("ready_for_next bucket", readyVm.bucket === "ready_for_next");
ok("ready CTA decision or kosztorys", readyVm.cta.kind === "decision" || readyVm.cta.kind === "kosztorys_bid");

const bidGapVm = buildIkAnalysisHandoffViewModel({
  observation: baseObservation({
    overallStatus: "done",
    progress: { percent: 100, completedWeight: 5, totalWeight: 5, blocked: false },
    stages: [
      { stageId: "documents", status: "done", actor: "Document", labelPl: "Dokumenty" },
      { stageId: "complete", status: "done", actor: "Control", labelPl: "Complete" },
    ],
  }),
  ownerActionQueue: { tenderId: "t1", itemCount: 0, packageGateBlockingCount: 0, items: [] },
  packageBlockers: null,
  bidUi: {
    authoritativeSource: "none",
    proposal: null,
    recommendedBidPln: null,
    pdfExportBlocked: true,
    uiStatus: "gap",
    packageGatePass: false,
    reasonsPl: ["gap"],
    gapNotePl: "BID PROPOSAL GAP — test",
  },
  chiefDossierAvailable: false,
});
ok("bid gap CTA kosztorys", bidGapVm.cta.kind === "kosztorys_bid");
ok("bid gap note surfaced", bidGapVm.bidGapNotePl?.includes("BID PROPOSAL GAP") === true);

const lib = read("src/lib/intelligent-estimator/ik-analysis-handoff-ui.ts");
const strip = read("src/app/intelligent-estimator/IkAnalysisHandoffStrip.tsx");
const surface = read("src/app/intelligent-estimator/IkAnalysisSurface.tsx");
const detail = read("src/app/TenderDetailPage.tsx");

ok("lib has no Phase 5 populate", !/final:\s*\{/.test(lib) && !/eta:\s*\{/.test(lib));
ok("strip outside chrome slot", /data-ik-analysis-handoff-slot/.test(surface));
ok("surface accepts handoff prop", /handoff\?:/.test(surface) || /handoff,/.test(surface));
ok("DetailPage wires handoff strip", /IkAnalysisHandoffStrip/.test(detail));
ok("DetailPage closes surface on CTA", /setIkAnalysisSurfaceOpen\(false\)/.test(detail));
ok("CTA-FOCUS decision sets pending DW focus", /setPendingDecisionWorkspaceFocus\(true\)/.test(detail));
ok("CTA-FOCUS decision scrolls DW surface id", /getElementById\(\"decision-workspace-surface\"\)/.test(detail));
ok("CTA-FOCUS decision fallback host selector", /data-decision-workspace-host/.test(detail));
ok("CTA-FOCUS kosztorys reuses setFocusOfferBoq", /cta\.kind === \"kosztorys_bid\"[\s\S]*setFocusOfferBoq\(true\)/.test(detail));
ok("CTA-FOCUS owner_action path unchanged", /cta\.kind === \"owner_action\"[\s\S]*navigateIkOwnerActionTarget/.test(detail));
ok("CTA-FOCUS one-shot setTimeout only in DW focus effect", /pendingDecisionWorkspaceFocus[\s\S]*setTimeout\(/.test(detail));
ok("CTA-FOCUS no setInterval in DetailPage handoff region", !/setInterval/.test(detail.slice(detail.indexOf("handleIkAnalysisHandoffCta"), detail.indexOf("chiefSessionForDecision"))));
ok("no F5 import in handoff lib", !/computePositionCost|OUR_RATE|MarketQuotes/.test(lib));
ok("strip has data marker", /data-ik-analysis-handoff=\"1\"/.test(strip));
ok("strip proves final/eta null attrs", /data-ik-analysis-handoff-final-null/.test(strip) && /data-ik-analysis-handoff-eta-null/.test(strip));

if (failed) {
  console.error(`\n${failed} FAIL`);
  process.exit(1);
}
console.log("\nALL PASS");
