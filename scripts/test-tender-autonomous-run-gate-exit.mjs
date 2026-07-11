/**
 * NG10-HOTFIX-02 — LIB-NG10-HF02 gate exit (organic vs timeout partial).
 * npx vite-node scripts/test-tender-autonomous-run-gate-exit.mjs
 */

import {
  deriveAutonomousGateExitReady,
  deriveAutonomousOutcomePartialEligible,
  deriveAutonomousRunTimeoutExceeded,
  deriveAutonomousRunTimeoutPartialEligible,
} from "../src/lib/tender-autonomous-run-gate-exit.ts";
import {
  deriveAutonomousPipelineComplete,
  deriveAutonomousRunComplete,
  deriveAutonomousScoringReady,
} from "../src/lib/tender-autonomous-run-phase.ts";
import { AUTONOMOUS_RUN_MAX_MS, AUTONOMOUS_RUN_MIN_DISPLAY_MS } from "../src/lib/tender-autonomous-run-ux.ts";
import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import { buildTenderIntelligenceContext } from "../src/lib/tender-intelligence-context.ts";
import { loadCompanyProfileLocal } from "../src/lib/tenders-bzp-company.ts";
import { applyTenderIntelligenceOverlay } from "../src/lib/tender-intelligence-overlay.ts";

const TENDER_ID = "bzp-ng10-hf01";

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}`);
  }
}

function baseItem(overrides = {}) {
  return {
    id: "item-hf01",
    tenderId: TENDER_ID,
    noticeNumber: "2026/BZP 00099999",
    title: "NG10-HF01 test",
    status: "seen",
    updatedAt: new Date().toISOString(),
    submittingOffersDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    noticeHtml: "<p>".repeat(40),
    documentsFetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

const mockDoc = {
  index: 1,
  documentId: "doc-a",
  filename: "kosztorys.ath",
  contentType: "application/octet-stream",
};

function scoringContext() {
  return {
    health: { score: 70, label: "OK", reasons: [] },
    growthMode: "balanced",
    jobs: [],
    items: [],
    profile: loadCompanyProfileLocal(),
  };
}

function mockIntelligenceCtx(item, overrides = {}) {
  return buildTenderIntelligenceContext({
    item,
    scoringContext: scoringContext(),
    ownerFinanceProposal: overrides.ownerFinanceProposal ?? null,
    ...overrides,
  });
}

function phaseInput(overrides = {}) {
  const item = overrides.item ?? baseItem();
  return {
    item,
    pipelineState: PipelineState.Idle,
    autoRunning: false,
    dossierBuilding: false,
    dossierSaving: false,
    dossierParseFailed: false,
    ownerFinanceProposal: null,
    intelligenceCtx: null,
    trustAssessment: null,
    elapsedMs: 5000,
    ...overrides,
  };
}

function heavyDossierItem() {
  return baseItem({
    bzpDocuments: [mockDoc],
    swzAnalysis: { analyzedAt: new Date().toISOString(), title: "SWZ" },
    tenderDossier: {
      builtAt: new Date().toISOString(),
      parserVersion: CURRENT_PARSER_VERSION,
      kosztorys: { ok: true, rowCount: 120, rows: [] },
      scanSummary: { parsedAt: new Date().toISOString() },
    },
  });
}

function ctxWithDecision(decision) {
  const item = heavyDossierItem();
  const ctx = mockIntelligenceCtx(item);
  const overlay = applyTenderIntelligenceOverlay({
    bundle: ctx.scoringBundle,
    decisionView: ctx.decisionView,
    ownerFinanceProposal: null,
    item,
  });
  return {
    ...ctx,
    overlay: { ...overlay, displayDecision: decision },
  };
}

function trustPartial() {
  return {
    overall: "partial",
    overallLabelPl: "Częściowa",
    dimensions: [],
    computedAt: new Date().toISOString(),
  };
}

console.log("\n=== NG10-HOTFIX-02 gate exit ===\n");

console.log("-- T01 happy complete --");
const readyItem = heavyDossierItem();
const readyProposal = {
  ok: true,
  computedAt: new Date().toISOString(),
  recommendedBidPln: 500000,
  costPricePln: 400000,
  floorBidPln: null,
  aggressiveBidPln: null,
  safeBidPln: null,
  costStack: [],
  assumptions: [],
  warnings: [],
};
const readyInput = phaseInput({
  item: readyItem,
  pipelineState: PipelineState.Ready,
  intelligenceCtx: mockIntelligenceCtx(readyItem, { ownerFinanceProposal: readyProposal }),
  ownerFinanceProposal: readyProposal,
});
const t01 = deriveAutonomousGateExitReady({
  input: readyInput,
  elapsedMs: AUTONOMOUS_RUN_MIN_DISPLAY_MS,
  minDisplayElapsed: true,
});
ok("T01 gate exit ready", t01.ready);
ok("T01 outcome complete", t01.outcomeMode === "complete");

console.log("\n-- T02 organic partial HOLD --");
const holdInput = phaseInput({
  item: heavyDossierItem(),
  pipelineState: PipelineState.Pricing,
  intelligenceCtx: ctxWithDecision("HOLD"),
  trustAssessment: trustPartial(),
});
ok("T02 partial eligible", deriveAutonomousOutcomePartialEligible(holdInput));
const t02 = deriveAutonomousGateExitReady({
  input: holdInput,
  elapsedMs: 5000,
  minDisplayElapsed: true,
});
ok("T02 gate exit partial", t02.ready && t02.outcomeMode === "partial");

console.log("\n-- T03 organic NO-GO --");
const nogoInput = phaseInput({
  item: heavyDossierItem(),
  pipelineState: PipelineState.Pricing,
  intelligenceCtx: ctxWithDecision("NO-GO"),
  trustAssessment: trustPartial(),
});
ok("T03 partial eligible NO-GO", deriveAutonomousOutcomePartialEligible(nogoInput));

console.log("\n-- T04 GO blocks organic --");
const goInput = phaseInput({
  item: heavyDossierItem(),
  pipelineState: PipelineState.Pricing,
  intelligenceCtx: ctxWithDecision("GO"),
  trustAssessment: trustPartial(),
});
ok("T04 organic false for GO", !deriveAutonomousOutcomePartialEligible(goInput));

console.log("\n-- T05 trust unknown --");
const unknownTrustInput = phaseInput({
  item: heavyDossierItem(),
  pipelineState: PipelineState.Pricing,
  intelligenceCtx: ctxWithDecision("HOLD"),
  trustAssessment: { overall: "unknown", overallLabelPl: "?", dimensions: [], computedAt: "" },
});
ok("T05 organic false trust unknown", !deriveAutonomousOutcomePartialEligible(unknownTrustInput));

console.log("\n-- T06 discovery not settled --");
const unsettledInput = phaseInput({
  item: baseItem({ documentsFetchedAt: undefined, bzpDocuments: [] }),
  pipelineState: PipelineState.Discovery,
  intelligenceCtx: ctxWithDecision("HOLD"),
  trustAssessment: trustPartial(),
});
ok("T06 organic false unsettled", !deriveAutonomousOutcomePartialEligible(unsettledInput));

console.log("\n-- T07 timeout Pricing GO --");
const timeoutGoInput = phaseInput({
  item: heavyDossierItem(),
  pipelineState: PipelineState.Pricing,
  intelligenceCtx: ctxWithDecision("GO"),
  trustAssessment: trustPartial(),
});
const timeoutMs = AUTONOMOUS_RUN_MAX_MS + 1000;
ok("T07 timeout exceeded", deriveAutonomousRunTimeoutExceeded(timeoutMs));
ok(
  "T07 timeout partial eligible",
  deriveAutonomousRunTimeoutPartialEligible(timeoutGoInput, timeoutMs),
);
const t07 = deriveAutonomousGateExitReady({
  input: timeoutGoInput,
  elapsedMs: timeoutMs,
  minDisplayElapsed: true,
});
ok("T07 gate exit partial via timeout", t07.ready && t07.outcomeMode === "partial");

console.log("\n-- T08 before timeout --");
ok(
  "T08 no timeout partial",
  !deriveAutonomousRunTimeoutPartialEligible(timeoutGoInput, 10_000),
);

console.log("\n-- T09 runComplete priority --");
const t09 = deriveAutonomousGateExitReady({
  input: readyInput,
  elapsedMs: AUTONOMOUS_RUN_MAX_MS + 5000,
  minDisplayElapsed: true,
});
ok("T09 complete not partial", t09.outcomeMode === "complete");

console.log("\n-- T10 Failed + ctx --");
const failedInput = phaseInput({
  pipelineState: PipelineState.Failed,
  dossierParseFailed: true,
  intelligenceCtx: mockIntelligenceCtx(baseItem()),
});
ok("T10 pipeline complete failed", deriveAutonomousPipelineComplete(failedInput));

console.log("\n-- T11 no scoring timeout --");
const noCtxInput = phaseInput({
  item: heavyDossierItem(),
  pipelineState: PipelineState.Pricing,
  intelligenceCtx: null,
});
ok(
  "T11 timeout without ctx",
  !deriveAutonomousRunTimeoutPartialEligible(noCtxInput, AUTONOMOUS_RUN_MAX_MS + 1),
);

console.log("\n-- T12 minDisplay --");
const t12 = deriveAutonomousGateExitReady({
  input: holdInput,
  elapsedMs: 5000,
  minDisplayElapsed: false,
});
ok("T12 blocked before min display", !t12.ready);

console.log("\n-- T13-14 pipeline complete regression --");
ok("T13 Ready complete", deriveAutonomousPipelineComplete(readyInput));
ok("T14 runComplete Ready", deriveAutonomousRunComplete(readyInput));

console.log("\n-- T15 scoring ready --");
ok("T15 scoring ready hold", deriveAutonomousScoringReady(holdInput));

console.log("\n-- T16 organic when complete --");
ok(
  "T16 organic false when run complete",
  !deriveAutonomousOutcomePartialEligible(readyInput),
);

console.log("\n-- T17 timeout without discovery settled (HF02) --");
ok(
  "T17 timeout unsettled true",
  deriveAutonomousRunTimeoutPartialEligible(unsettledInput, AUTONOMOUS_RUN_MAX_MS + 1),
);
const t17 = deriveAutonomousGateExitReady({
  input: unsettledInput,
  elapsedMs: AUTONOMOUS_RUN_MAX_MS + 1,
  minDisplayElapsed: true,
});
ok("T17 gate exit partial timeout", t17.ready && t17.outcomeMode === "partial" && t17.partialReason === "timeout");

console.log("\n-- T-HF02-01 RCA tender 08ded29a (scoring + timeout, discovery unsettled) --");
const rcaItem = baseItem({
  id: "08ded29a-a9a9-3fd5-92be-eb0001c24019",
  documentsFetchedAt: undefined,
  bzpDocuments: [],
});
const rcaCtx = ctxWithDecision("HOLD");
const rcaInput = phaseInput({
  item: rcaItem,
  pipelineState: PipelineState.Pricing,
  intelligenceCtx: rcaCtx,
  trustAssessment: trustPartial(),
});
const rcaElapsed = AUTONOMOUS_RUN_MAX_MS + 1;
ok("T-HF02-01 timeout partial RCA", deriveAutonomousRunTimeoutPartialEligible(rcaInput, rcaElapsed));
ok("T-HF02-01 organic false unsettled", !deriveAutonomousOutcomePartialEligible(rcaInput));
const tRca = deriveAutonomousGateExitReady({
  input: rcaInput,
  elapsedMs: rcaElapsed,
  minDisplayElapsed: true,
});
ok("T-HF02-01 gate exit ready", tRca.ready && tRca.partialReason === "timeout");

console.log("\n-- T-HF02-02 timeout needs displayDecision --");
const noDecisionCtx = { ...ctxWithDecision("HOLD"), overlay: { ...ctxWithDecision("HOLD").overlay, displayDecision: null } };
const noDecisionInput = phaseInput({
  item: heavyDossierItem(),
  pipelineState: PipelineState.Pricing,
  intelligenceCtx: noDecisionCtx,
  trustAssessment: trustPartial(),
});
ok(
  "T-HF02-02 timeout false without displayDecision",
  !deriveAutonomousRunTimeoutPartialEligible(noDecisionInput, AUTONOMOUS_RUN_MAX_MS + 1),
);

console.log("\n-- T18 constants --");
ok("T18 MAX_MS 150000", AUTONOMOUS_RUN_MAX_MS === 150_000);
ok("T18 MIN_DISPLAY 3000", AUTONOMOUS_RUN_MIN_DISPLAY_MS === 3000);

console.log(`\n=== WYNIK: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
