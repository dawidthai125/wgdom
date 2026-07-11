/**
 * NG10-UX-01 — LIB timeline Autonomous Run (12 kroków + 5 makrogrup).
 * npx vite-node scripts/test-tender-autonomous-run-timeline.mjs
 */

import {
  deriveAutonomousRunPhase,
} from "../src/lib/tender-autonomous-run-phase.ts";
import {
  AUTONOMOUS_TIMELINE_MACRO_LABELS,
  AUTONOMOUS_TIMELINE_STEP_LABELS,
  AUTONOMOUS_TIMELINE_STEP_ORDER,
  deriveAutonomousRunTimelineView,
} from "../src/lib/tender-autonomous-run-timeline.ts";
import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import { buildTenderIntelligenceContext } from "../src/lib/tender-intelligence-context.ts";
import { loadCompanyProfileLocal } from "../src/lib/tenders-bzp-company.ts";

const TENDER_ID = "bzp-ng10-ux01";

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS  ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${label}`);
  }
}

function baseItem(overrides = {}) {
  return {
    id: "item-ux01",
    tenderId: TENDER_ID,
    noticeNumber: "2026/BZP 00099999",
    title: "NG10-UX-01 test",
    status: "seen",
    updatedAt: new Date().toISOString(),
    submittingOffersDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    noticeHtml: "<p>".repeat(40),
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
    ...overrides,
  };
}

function timeline(overrides = {}) {
  const input = phaseInput(overrides);
  const phaseView = deriveAutonomousRunPhase(input);
  return deriveAutonomousRunTimelineView(input, phaseView);
}

function stepStatus(view, stepId) {
  return view.steps.find((s) => s.id === stepId)?.status;
}

function macroStatus(view, macroId) {
  return view.macros.find((m) => m.id === macroId)?.status;
}

console.log("=== NG10-UX-01 TIMELINE LIB ===\n");

// —— Structure ——
console.log("-- structure --");
ok("12 timeline steps", AUTONOMOUS_TIMELINE_STEP_ORDER.length === 12);
ok("step labels for all 12", AUTONOMOUS_TIMELINE_STEP_ORDER.every((id) => AUTONOMOUS_TIMELINE_STEP_LABELS[id]));
ok("5 macro groups", Object.keys(AUTONOMOUS_TIMELINE_MACRO_LABELS).length === 5);

const fresh = timeline();
ok("derive returns 12 steps", fresh.steps.length === 12);
ok("derive returns 5 macros", fresh.macros.length === 5);
ok(
  "macro ids frozen",
  fresh.macros.map((m) => m.id).join(",") === "dokumenty,zalaczniki,analiza,wycena,rekomendacja",
);

// —— Discovery running ——
console.log("\n-- discovery running --");
const discovering = timeline({
  pipelineState: PipelineState.Discovery,
  autoRunning: true,
});
ok("doc_fetch active", stepStatus(discovering, "doc_fetch") === "active");
ok("doc_found pending", stepStatus(discovering, "doc_found") === "pending");
ok("dokumenty macro active", macroStatus(discovering, "dokumenty") === "active");

// —— 0-doc settled (RCA path) ——
console.log("\n-- 0-doc settled --");
const zeroDoc = timeline({
  item: baseItem({ documentsFetchedAt: new Date().toISOString() }),
  pipelineState: PipelineState.Idle,
  intelligenceCtx: mockIntelligenceCtx(baseItem({ documentsFetchedAt: new Date().toISOString() })),
});
ok("doc_fetch partial (0 docs)", stepStatus(zeroDoc, "doc_fetch") === "partial");
ok("doc_found skipped", stepStatus(zeroDoc, "doc_found") === "skipped");
ok("swz_found skipped", stepStatus(zeroDoc, "swz_found") === "skipped");
ok("boq_detect skipped", stepStatus(zeroDoc, "boq_detect") === "skipped");

// Fix: doc_fetch should be partial when 0 docs settled
const zeroDoc2 = timeline({
  item: baseItem({ documentsFetchedAt: new Date().toISOString() }),
  pipelineState: PipelineState.Idle,
});
ok("doc_fetch partial 0-doc", stepStatus(zeroDoc2, "doc_fetch") === "partial");

// —— With documents + SWZ ——
console.log("\n-- docs + swz --");
const withSwz = timeline({
  item: baseItem({
    bzpDocuments: [mockDoc],
    documentsFetchedAt: new Date().toISOString(),
    swzAnalysis: { analyzedAt: new Date().toISOString(), title: "SWZ" },
  }),
});
ok("doc_found done", stepStatus(withSwz, "doc_found") === "done");
ok("swz_found done", stepStatus(withSwz, "swz_found") === "done");

// —— Scoring ready ——
console.log("\n-- scoring ready --");
const itemFull = baseItem({
  bzpDocuments: [mockDoc],
  documentsFetchedAt: new Date().toISOString(),
  swzAnalysis: { analyzedAt: new Date().toISOString(), title: "SWZ" },
  tenderDossier: {
    builtAt: new Date().toISOString(),
    parserVersion: CURRENT_PARSER_VERSION,
    kosztorys: { ok: true, rowCount: 42, source: "ath" },
  },
});
const proposal = {
  ok: true,
  costPricePln: 100000,
  ourEstimatePln: 120000,
  computedAt: new Date().toISOString(),
  costStack: [
    { label: "Robocizna", pln: 60000 },
    { label: "Materiały", pln: 40000 },
  ],
  warnings: [],
};
const ctx = mockIntelligenceCtx(itemFull, { ownerFinanceProposal: proposal });
const ready = timeline({
  item: itemFull,
  pipelineState: PipelineState.Ready,
  ownerFinanceProposal: proposal,
  intelligenceCtx: ctx,
});
ok("recommendation_prep done when scoring", stepStatus(ready, "recommendation_prep") === "done");
ok("rekomendacja macro done", macroStatus(ready, "rekomendacja") === "done");
ok("activeStep null when run complete", ready.activeStepId === null);

// —— Active phase sync ——
console.log("\n-- active step sync --");
const pricing = timeline({
  item: itemFull,
  pipelineState: PipelineState.Pricing,
  dossierBuilding: false,
  ownerFinanceProposal: proposal,
  intelligenceCtx: ctx,
});
const inputPricing = phaseInput({
  item: itemFull,
  pipelineState: PipelineState.Pricing,
  ownerFinanceProposal: proposal,
  intelligenceCtx: ctx,
});
const phasePricing = deriveAutonomousRunPhase(inputPricing);
const tvPricing = deriveAutonomousRunTimelineView(inputPricing, phasePricing);
ok(
  "activeStep matches phaseView.activePhaseId",
  tvPricing.activeStepId === phasePricing.activePhaseId
    || (phasePricing.activePhaseId === "complete" && tvPricing.activeStepId === null),
);
ok("activeMacro set when active step", tvPricing.activeMacroId != null || tvPricing.activeStepId === null);

// —— Max one active ——
console.log("\n-- single active --");
const activeCount = discovering.steps.filter((s) => s.status === "active").length;
ok("at most one active step", activeCount <= 1);

// —— Macro aggregation ——
console.log("\n-- macro aggregation --");
ok(
  "wycena macro exists with 3 steps",
  ready.macros.find((m) => m.id === "wycena")?.steps.length === 3,
);
ok(
  "analiza macro has 4 steps",
  ready.macros.find((m) => m.id === "analiza")?.steps.length === 4,
);

console.log(`\n=== WYNIK: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
