/**
 * NG10-UX-03 — LIB Transition + Timeout Autonomous Run.
 * npx vite-node scripts/test-tender-autonomous-run-transition-timeout.mjs
 */

import { deriveAutonomousRunPhase } from "../src/lib/tender-autonomous-run-phase.ts";
import {
  AUTONOMOUS_COMPLETE_HOLD_TITLE,
  AUTONOMOUS_FAQ_AUTO_EXPAND_MS,
  AUTONOMOUS_PARTIAL_REASON_CHIP,
  AUTONOMOUS_TIMEOUT_BAR_LABEL,
  AUTONOMOUS_TIMEOUT_BAR_VISIBLE_AFTER_MS,
  AUTONOMOUS_TIMEOUT_T30_MESSAGE,
  AUTONOMOUS_TRANSITION_BRIDGE_MESSAGE,
  AUTONOMOUS_TRANSITION_PRESENTATION_SUBTITLE,
  deriveAutonomousExitSummary,
  deriveAutonomousPartialReasonLabel,
  deriveAutonomousTimeoutProgress,
  deriveAutonomousTimeoutT30Message,
  formatAutonomousTimeoutElapsed,
  shouldAutoExpandAutonomousFaq,
  shouldHideLegacyAutonomousEta,
  shouldShowAutonomousTimeoutBar,
} from "../src/lib/tender-autonomous-run-transition.ts";
import { AUTONOMOUS_RUN_MAX_MS } from "../src/lib/tender-autonomous-run-ux.ts";
import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import { buildTenderIntelligenceContext } from "../src/lib/tender-intelligence-context.ts";
import { loadCompanyProfileLocal } from "../src/lib/tenders-bzp-company.ts";
import { buildTenderTrustAssessment } from "../src/lib/tender-trust-layer.ts";

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
    id: "item-ux03",
    tenderId: "bzp-ng10-ux03",
    noticeNumber: "2026/BZP 00077777",
    title: "NG10-UX-03 test",
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
    kosztorysProcessSession: null,
    executiveMainWorksCount: undefined,
    elapsedMs: 0,
    ...overrides,
  };
}

function mockFeed() {
  const input = phaseInput({
    item: baseItem({
      documentsFetchedAt: new Date().toISOString(),
      bzpDocuments: [{ index: 0, filename: "swz.pdf", isSwzHint: true }],
    }),
    elapsedMs: 12_000,
  });
  return deriveAutonomousRunPhase(input).feed;
}

console.log("NG10-UX-03 transition + timeout lib\n");

// T1 — frozen copy constants
ok("T1 complete hold title frozen", AUTONOMOUS_COMPLETE_HOLD_TITLE === "✓ Analiza zakończona");
ok("T2 bridge message frozen", AUTONOMOUS_TRANSITION_BRIDGE_MESSAGE.includes("prezentację wyników"));
ok("T3 presentation subtitle frozen", AUTONOMOUS_TRANSITION_PRESENTATION_SUBTITLE.includes("prezentację wyników"));
ok("T4 timeout bar label frozen", AUTONOMOUS_TIMEOUT_BAR_LABEL.includes("2 minuty"));

// T5 — exit summary (last achievements)
const feed = mockFeed();
const summary = deriveAutonomousExitSummary(feed);
ok("T5 exitSummary is array", Array.isArray(summary));
ok("T5b exitSummary max 3", summary.length <= 3);
ok("T5c exitSummary strips checkmark", summary.every((line) => !line.startsWith("✓")));

// T6 — partial reason timeout
const timeoutLabel = deriveAutonomousPartialReasonLabel({
  gatePartialReason: "timeout",
  input: phaseInput({
    item: baseItem({ documentsFetchedAt: new Date().toISOString() }),
    elapsedMs: AUTONOMOUS_RUN_MAX_MS,
  }),
  discoveryPending: false,
});
ok("T6 timeout partial reason", timeoutLabel === "timeout");
ok("T6 chip copy", AUTONOMOUS_PARTIAL_REASON_CHIP.timeout.includes("limit czasu"));

// T7 — partial reason discovery_pending
const discoveryLabel = deriveAutonomousPartialReasonLabel({
  gatePartialReason: "timeout",
  input: phaseInput({ elapsedMs: AUTONOMOUS_RUN_MAX_MS }),
  discoveryPending: true,
});
ok("T7 discovery_pending on timeout + pending", discoveryLabel === "discovery_pending");

// T8 — partial reason no_attachments (organic)
const noDocsLabel = deriveAutonomousPartialReasonLabel({
  gatePartialReason: "organic",
  input: phaseInput({
    item: baseItem({
      documentsFetchedAt: new Date().toISOString(),
      bzpDocuments: [],
    }),
  }),
  discoveryPending: false,
});
ok("T8 no_attachments organic 0-doc", noDocsLabel === "no_attachments");

// T9 — partial reason incomplete_pricing
const pricingLabel = deriveAutonomousPartialReasonLabel({
  gatePartialReason: "organic",
  input: phaseInput({
    item: baseItem({
      documentsFetchedAt: new Date().toISOString(),
      bzpDocuments: [{ index: 0, filename: "swz.pdf", isSwzHint: true }],
    }),
    pipelineState: PipelineState.Pricing,
  }),
  discoveryPending: false,
});
ok("T9 incomplete_pricing when Pricing state", pricingLabel === "incomplete_pricing");

// T10 — timeout bar visibility (OD-UX-2)
ok("T10 bar hidden before 30s", !shouldShowAutonomousTimeoutBar(29_999, false));
ok("T10b bar visible after 30s", shouldShowAutonomousTimeoutBar(30_000, false));
ok("T10c bar hidden when complete", !shouldShowAutonomousTimeoutBar(60_000, true));

// T11 — progress percent
const at75s = deriveAutonomousTimeoutProgress(75_000);
ok("T11 progress 50% at 75s", at75s.percent === 50);
ok("T11b max seconds 150", at75s.maxSeconds === 150);

// T12 — T-30 message
const t30Threshold = AUTONOMOUS_RUN_MAX_MS - 30_000;
ok("T12 T-30 null before threshold", deriveAutonomousTimeoutT30Message(t30Threshold - 1, false) == null);
ok(
  "T12b T-30 message at threshold",
  deriveAutonomousTimeoutT30Message(t30Threshold, false) === AUTONOMOUS_TIMEOUT_T30_MESSAGE,
);
ok("T12c T-30 hidden when complete", deriveAutonomousTimeoutT30Message(AUTONOMOUS_RUN_MAX_MS, true) == null);

// T13 — legacy ETA hide (OD-UX-4)
ok(
  "T13 hide ETA when timeline visible",
  shouldHideLegacyAutonomousEta({ showTimeline: true, elapsedMs: 5_000, runComplete: false }),
);
ok(
  "T13b hide ETA when timeout bar visible",
  shouldHideLegacyAutonomousEta({ showTimeline: false, elapsedMs: 35_000, runComplete: false }),
);
ok(
  "T13c show ETA early path",
  !shouldHideLegacyAutonomousEta({ showTimeline: false, elapsedMs: 5_000, runComplete: false }),
);

// T14 — FAQ auto-expand
ok("T14 FAQ collapsed before 45s", !shouldAutoExpandAutonomousFaq(AUTONOMOUS_FAQ_AUTO_EXPAND_MS, false));
ok("T14b FAQ expand after 45s", shouldAutoExpandAutonomousFaq(AUTONOMOUS_FAQ_AUTO_EXPAND_MS + 1, false));
ok("T14c FAQ no expand when complete", !shouldAutoExpandAutonomousFaq(60_000, true));

// T15 — elapsed format
ok("T15 format 1:05", formatAutonomousTimeoutElapsed(65) === "1:05");
ok("T15b format 0:09", formatAutonomousTimeoutElapsed(9) === "0:09");

// T16 — null partial reason when gate reason null
ok(
  "T16 null label when no gate reason",
  deriveAutonomousPartialReasonLabel({
    gatePartialReason: null,
    input: phaseInput(),
    discoveryPending: false,
  }) == null,
);

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
