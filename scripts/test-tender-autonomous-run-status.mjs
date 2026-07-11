/**
 * NG10-UX-02 — LIB Dynamic Status Autonomous Run.
 * npx vite-node scripts/test-tender-autonomous-run-status.mjs
 */

import { deriveAutonomousRunPhase } from "../src/lib/tender-autonomous-run-phase.ts";
import {
  AUTONOMOUS_STATUS_DISCOVERY_SLOW,
  AUTONOMOUS_STATUS_DOSSIER_PROCESSING,
  AUTONOMOUS_STATUS_PARTIAL_DATA,
  AUTONOMOUS_STATUS_PRICING,
  AUTONOMOUS_STATUS_PROFITABILITY_HEAVY,
  AUTONOMOUS_STATUS_PROFITABILITY_NO_HEAVY,
  AUTONOMOUS_STATUS_ZERO_DOCS,
  deriveAutonomousStatusMessage,
} from "../src/lib/tender-autonomous-run-status.ts";
import { AUTONOMOUS_FALLBACK_LIVE_MESSAGES } from "../src/lib/tender-autonomous-run-ux.ts";
import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import { buildTenderIntelligenceContext } from "../src/lib/tender-intelligence-context.ts";
import { loadCompanyProfileLocal } from "../src/lib/tenders-bzp-company.ts";
import { buildTenderTrustAssessment } from "../src/lib/tender-trust-layer.ts";

const TENDER_ID = "bzp-ng10-ux02";

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
    id: "item-ux02",
    tenderId: TENDER_ID,
    noticeNumber: "2026/BZP 00088888",
    title: "NG10-UX-02 test",
    status: "seen",
    updatedAt: new Date().toISOString(),
    submittingOffersDate: new Date(Date.now() + 14 * 86400000).toISOString(),
    noticeHtml: "<p>".repeat(40),
    ...overrides,
  };
}

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
    elapsedMs: 0,
    ...overrides,
  };
}

function statusFor(overrides = {}) {
  const input = phaseInput(overrides);
  const phaseView = deriveAutonomousRunPhase(input);
  return {
    message: deriveAutonomousStatusMessage(input, phaseView),
    phaseView,
    input,
  };
}

const mockDoc = {
  index: 1,
  documentId: "doc-a",
  filename: "kosztorys.ath",
  contentType: "application/octet-stream",
};

function itemWithDocs(overrides = {}) {
  return baseItem({
    documentsFetchedAt: new Date().toISOString(),
    bzpDocuments: [mockDoc],
    ...overrides,
  });
}

function profitabilityCtx(item, overrides = {}) {
  const ctx = mockIntelligenceCtx(item, overrides);
  return {
    ...ctx,
    finance: { ...ctx.finance, marginPct: null },
  };
}

function heavyDossierItem() {
  return itemWithDocs({
    tenderDossier: {
      parserVersion: CURRENT_PARSER_VERSION,
      kosztorys: { ok: true, rowCount: 12 },
      scanSummary: { parsedAt: new Date().toISOString() },
    },
  });
}

console.log("=== NG10-UX-02 STATUS LIB ===\n");

console.log("-- P0 profitability --");
{
  const item = itemWithDocs();
  const { message, phaseView } = statusFor({
    item,
    intelligenceCtx: profitabilityCtx(item),
    pipelineState: PipelineState.Heavy,
    elapsedMs: 5000,
  });
  ok("activePhase profitability", phaseView.activePhaseId === "profitability");
  ok("P0 no heavy copy", message === AUTONOMOUS_STATUS_PROFITABILITY_NO_HEAVY);
}

{
  const item = heavyDossierItem();
  const { message } = statusFor({
    item,
    intelligenceCtx: profitabilityCtx(item),
    pipelineState: PipelineState.Heavy,
    elapsedMs: 5000,
  });
  ok("P0 heavy copy", message === AUTONOMOUS_STATUS_PROFITABILITY_HEAVY);
}

console.log("\n-- P1 discovery --");
{
  const { message } = statusFor({
    item: baseItem(),
    pipelineState: PipelineState.Discovery,
    autoRunning: true,
    elapsedMs: 35_000,
  });
  ok("P1 discovery slow", message === AUTONOMOUS_STATUS_DISCOVERY_SLOW);
}

{
  const { message } = statusFor({
    item: baseItem({
      documentsFetchedAt: new Date().toISOString(),
      bzpDocuments: [],
    }),
    elapsedMs: 5000,
  });
  ok("P1 zero docs", message === AUTONOMOUS_STATUS_ZERO_DOCS);
}

console.log("\n-- P2 dossier / pricing --");
{
  const { message } = statusFor({
    item: itemWithDocs(),
    dossierBuilding: true,
    elapsedMs: 5000,
  });
  ok("P2 dossier processing", message === AUTONOMOUS_STATUS_DOSSIER_PROCESSING);
}

{
  const { message } = statusFor({
    item: itemWithDocs(),
    pipelineState: PipelineState.Pricing,
    intelligenceCtx: null,
    elapsedMs: 5000,
  });
  ok("P2 pricing", message === AUTONOMOUS_STATUS_PRICING);
}

console.log("\n-- P3 partial data --");
{
  const item = itemWithDocs();
  const trust = buildTenderTrustAssessment({ item });
  const { message } = statusFor({
    item,
    trustAssessment: { ...trust, overall: "partial" },
    intelligenceCtx: null,
    elapsedMs: 5000,
  });
  ok("P3 trust partial", message === AUTONOMOUS_STATUS_PARTIAL_DATA);
}

{
  const item = itemWithDocs();
  const ctx = profitabilityCtx(item);
  const lowCtx = {
    ...ctx,
    finance: { ...ctx.finance, marginPct: 18 },
    overlay: { ...ctx.overlay, confidence: "low" },
  };
  const { message } = statusFor({
    item,
    intelligenceCtx: lowCtx,
    pipelineState: PipelineState.Heavy,
    elapsedMs: 5000,
  });
  ok("P3 confidence low", message === AUTONOMOUS_STATUS_PARTIAL_DATA);
}

console.log("\n-- P4 fallback --");
{
  const input = phaseInput({ item: itemWithDocs(), elapsedMs: 25_000 });
  const phaseView = deriveAutonomousRunPhase(input);
  const forced = {
    ...phaseView,
    activeLive: {
      id: "limbo",
      agentId: "dokumentacja",
      kind: "live",
      phaseId: "doc_fetch",
      message: AUTONOMOUS_FALLBACK_LIVE_MESSAGES[0],
      terminal: false,
      priority: 5,
    },
  };
  const message = deriveAutonomousStatusMessage(input, forced);
  ok(
    "P4 fallback via activeLive",
    message === AUTONOMOUS_FALLBACK_LIVE_MESSAGES[0],
  );
}

console.log("\n-- priority / null --");
{
  const item = heavyDossierItem();
  const { message } = statusFor({
    item,
    intelligenceCtx: profitabilityCtx(item),
    pipelineState: PipelineState.Discovery,
    autoRunning: true,
    elapsedMs: 35_000,
  });
  ok("P0 beats P1 discovery", message === AUTONOMOUS_STATUS_PROFITABILITY_HEAVY);
}

{
  const { message } = statusFor({
    item: itemWithDocs(),
    intelligenceCtx: null,
    elapsedMs: 5000,
  });
  ok("null early idle", message == null);
}

{
  const item = itemWithDocs();
  const ctx = profitabilityCtx(item);
  const phaseView = deriveAutonomousRunPhase(
    phaseInput({ item, intelligenceCtx: ctx, elapsedMs: 1000 }),
  );
  phaseView.runComplete = true;
  const message = deriveAutonomousStatusMessage(
    phaseInput({ item, intelligenceCtx: ctx, elapsedMs: 1000 }),
    phaseView,
  );
  ok("null when run complete", message == null);
}

console.log("\n-- feed wire (no new store) --");
{
  const item = itemWithDocs();
  const input = phaseInput({
    item,
    pipelineState: PipelineState.Pricing,
    elapsedMs: 3000,
  });
  const phaseView = deriveAutonomousRunPhase(input);
  ok("feed includes live or achievements", phaseView.feed.length >= 1);
  ok(
    "feed sorted by priority",
    phaseView.feed.every((e, i, arr) => i === 0 || arr[i - 1].priority <= e.priority),
  );
}

console.log(`\n=== WYNIK: ${pass} PASS / ${fail} FAIL ===\n`);
process.exit(fail > 0 ? 1 : 0);
