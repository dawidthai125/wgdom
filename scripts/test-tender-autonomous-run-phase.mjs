/**
 * NG-10-03 — LIB-NG10-01 Autonomous Run derive (pure lib).
 * npx vite-node scripts/test-tender-autonomous-run-phase.mjs
 */

import {
  buildAutonomousRunFingerprint,
  buildAutonomousRunFingerprintParts,
  deriveAutonomousRunRequired,
  autonomousRunStorageKey,
} from "../src/lib/tender-autonomous-run-fingerprint.ts";
import {
  deriveAutonomousRunPhase,
  deriveAutonomousPipelineComplete,
  deriveAutonomousScoringReady,
  deriveAutonomousRunComplete,
  deriveAutonomousEtaSeconds,
  listAutonomousActivitySpecs,
} from "../src/lib/tender-autonomous-run-phase.ts";
import {
  deriveAutonomousOutcomePositives,
  deriveAutonomousOutcomeWatchouts,
} from "../src/lib/tender-autonomous-run-outcome.ts";
import {
  formatAutonomousEtaSeconds,
  AUTONOMOUS_AI_AGENT_ORDER,
  AUTONOMOUS_RECOMMENDATION_HERO,
} from "../src/lib/tender-autonomous-run-ux.ts";
import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import { CURRENT_PARSER_VERSION } from "../src/lib/tender-dossier-parser-version.ts";
import { buildTenderIntelligenceContext } from "../src/lib/tender-intelligence-context.ts";
import { loadCompanyProfileLocal } from "../src/lib/tenders-bzp-company.ts";

const TENDER_ID = "bzp-ng10-test";

function baseItem(overrides = {}) {
  return {
    id: "item-ng10",
    tenderId: TENDER_ID,
    noticeNumber: "2026/BZP 00099999",
    title: "NG-10 test",
    status: "seen",
    updatedAt: new Date().toISOString(),
    submittingOffersDate: new Date(Date.now() + 14 * 86400000).toISOString(),
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

let pass = 0;
let fail = 0;

function ok(label, cond) {
  if (cond) {
    pass += 1;
    console.log(`  PASS ${label}`);
  } else {
    fail += 1;
    console.log(`  FAIL ${label}`);
  }
}

console.log("=== NG-10 AUTONOMOUS RUN LIB (LIB-NG10-01) ===\n");

// —— Fingerprint ——
console.log("-- fingerprint --");
const fp1 = buildAutonomousRunFingerprint(baseItem(), null, 0);
const fp2 = buildAutonomousRunFingerprint(baseItem(), null, 0);
ok("fingerprint stable", fp1 === fp2 && fp1.length > 0);

const fpDocs = buildAutonomousRunFingerprint(
  baseItem({ bzpDocuments: [mockDoc], documentsFetchedAt: new Date().toISOString() }),
  null,
  0,
);
ok("fingerprint changes on docs", fpDocs !== fp1);

const fpWycena = buildAutonomousRunFingerprint(
  baseItem(),
  { ok: true, computedAt: "2026-07-10T10:00:00Z", costPricePln: 1000, recommendedBidPln: 1200, costStack: [], assumptions: [], warnings: [] },
  1,
);
ok("fingerprint changes on wycena revision", fpWycena !== fp1);

const parts = buildAutonomousRunFingerprintParts(baseItem(), null, 0);
ok("fingerprint parts keys", Boolean(parts.documents && parts.kosztorys && parts.analiza));

ok("storage key prefix", autonomousRunStorageKey(TENDER_ID).includes("kw-tender-autonomous-run-v1:"));

// —— deriveAutonomousRunRequired ——
console.log("\n-- deriveAutonomousRunRequired --");
ok(
  "required first visit",
  deriveAutonomousRunRequired({
    fingerprint: fp1,
    lastCompletedFingerprint: null,
    pipelineState: PipelineState.Ready,
  }),
);
ok(
  "skip when fresh",
  !deriveAutonomousRunRequired({
    fingerprint: fp1,
    lastCompletedFingerprint: fp1,
    pipelineState: PipelineState.Ready,
  }),
);
ok(
  "required fingerprint change",
  deriveAutonomousRunRequired({
    fingerprint: fpDocs,
    lastCompletedFingerprint: fp1,
    pipelineState: PipelineState.Ready,
  }),
);
ok(
  "required Failed state",
  deriveAutonomousRunRequired({
    fingerprint: fp1,
    lastCompletedFingerprint: fp1,
    pipelineState: PipelineState.Failed,
  }),
);
ok(
  "required parser stale",
  deriveAutonomousRunRequired({
    fingerprint: fp1,
    lastCompletedFingerprint: fp1,
    pipelineState: PipelineState.Ready,
    item: baseItem({
      tenderDossier: {
        builtAt: new Date().toISOString(),
        parserVersion: CURRENT_PARSER_VERSION - 1,
        kosztorys: { ok: true, rowCount: 10, rows: [] },
      },
    }),
  }),
);
ok(
  "required while Heavy in progress",
  deriveAutonomousRunRequired({
    fingerprint: fp1,
    lastCompletedFingerprint: fp1,
    pipelineState: PipelineState.Heavy,
  }),
);

// —— Activity feed / agents ——
console.log("\n-- activity feed --");
const specs = listAutonomousActivitySpecs();
ok("activity specs >= 10", specs.length >= 10);
ok(
  "multi-agent coverage",
  AUTONOMOUS_AI_AGENT_ORDER.every((agent) => specs.some((s) => s.agentId === agent)),
);

const discoveryView = deriveAutonomousRunPhase(phaseInput({
  pipelineState: PipelineState.Discovery,
  autoRunning: true,
}));
ok("discovery live message", discoveryView.activeLive?.message.includes("Pobieram dokumenty"));
ok("discovery agent dokumentacja", discoveryView.activeLive?.agentId === "dokumentacja");

const settledItem = baseItem({
  bzpDocuments: [mockDoc],
  documentsFetchedAt: new Date().toISOString(),
  noticeHtml: "<html>".padEnd(120, "x"),
  swzAnalysis: { analyzedAt: new Date().toISOString(), title: "SWZ" },
});
const settledView = deriveAutonomousRunPhase(phaseInput({
  item: settledItem,
  pipelineState: PipelineState.Idle,
}));
ok(
  "achievement docs count",
  settledView.achievements.some((a) => a.message.includes("Znaleziono 1 dokumentów")),
);
ok(
  "achievement SWZ",
  settledView.achievements.some((a) => a.message.includes("Wykryto SWZ")),
);

const heavyItem = baseItem({
  bzpDocuments: [mockDoc],
  documentsFetchedAt: new Date().toISOString(),
  tenderDossier: {
    builtAt: new Date().toISOString(),
    parserVersion: CURRENT_PARSER_VERSION,
    kosztorys: { ok: true, rowCount: 842, rows: [], sourceFilename: "k.ath" },
    scanSummary: { parsedAt: new Date().toISOString(), kosztorysFound: true },
  },
});
const heavyView = deriveAutonomousRunPhase(phaseInput({
  item: heavyItem,
  pipelineState: PipelineState.Ready,
  ownerFinanceProposal: {
    ok: true,
    computedAt: new Date().toISOString(),
    recommendedBidPln: 500000,
    costPricePln: 400000,
    floorBidPln: null,
    aggressiveBidPln: null,
    safeBidPln: null,
    costStack: [
      { label: "Robocizna", pln: 200000 },
      { label: "Materiały", pln: 150000 },
    ],
    assumptions: [],
    warnings: [],
  },
  intelligenceCtx: mockIntelligenceCtx(heavyItem, {
    ownerFinanceProposal: {
      ok: true,
      computedAt: new Date().toISOString(),
      recommendedBidPln: 500000,
      costPricePln: 400000,
      floorBidPln: null,
      aggressiveBidPln: null,
      safeBidPln: null,
      costStack: [
        { label: "Robocizna", pln: 200000 },
        { label: "Materiały", pln: 150000 },
      ],
      assumptions: [],
      warnings: [],
    },
  }),
}));
ok(
  "achievement positions",
  heavyView.achievements.some((a) => a.message.includes("842 pozycji")),
);
ok(
  "achievement labor",
  heavyView.achievements.some((a) => a.message.includes("robocizn")),
);
ok(
  "achievement materials",
  heavyView.achievements.some((a) => a.message.includes("materiał")),
);

// —— Completion gate ——
console.log("\n-- completion gate --");
const readyInput = phaseInput({
  item: heavyItem,
  pipelineState: PipelineState.Ready,
  intelligenceCtx: mockIntelligenceCtx(heavyItem),
});
ok("pipeline complete Ready", deriveAutonomousPipelineComplete(readyInput));
ok("scoring ready with ctx", deriveAutonomousScoringReady(readyInput));
ok("run complete", deriveAutonomousRunComplete(readyInput));
ok("phase runComplete flag", deriveAutonomousRunPhase(readyInput).runComplete);

const idleSettled = phaseInput({
  item: baseItem({ documentsFetchedAt: new Date().toISOString() }),
  pipelineState: PipelineState.Idle,
});
ok("pipeline complete idle settled", deriveAutonomousPipelineComplete(idleSettled));

// —— ETA ——
console.log("\n-- ETA --");
const etaDiscovery = deriveAutonomousEtaSeconds({
  pipelineState: PipelineState.Discovery,
  elapsedMs: 5000,
});
ok("eta min bound", etaDiscovery >= 8);
ok("eta max bound", etaDiscovery <= 120);
ok(
  "eta decreases with elapsed",
  deriveAutonomousEtaSeconds({ pipelineState: PipelineState.Discovery, elapsedMs: 30_000 })
    < deriveAutonomousEtaSeconds({ pipelineState: PipelineState.Discovery, elapsedMs: 0 }),
);
ok(
  "eta format PL",
  formatAutonomousEtaSeconds(42).includes("około 42"),
);

const etaHeavy = deriveAutonomousEtaSeconds({
  pipelineState: PipelineState.Heavy,
  elapsedMs: 0,
  rowCount: 400,
  dossierBuilding: true,
});
ok("eta heavy row bonus", etaHeavy >= 35);

// —— Outcome ——
console.log("\n-- outcome --");
const ctx = mockIntelligenceCtx(heavyItem, {
  ownerFinanceProposal: {
    ok: true,
    computedAt: new Date().toISOString(),
    recommendedBidPln: 500000,
    costPricePln: 400000,
    floorBidPln: null,
    aggressiveBidPln: null,
    safeBidPln: null,
    costStack: [],
    assumptions: [],
    warnings: ["2 pozycje bez ceny w katalogu"],
  },
});
ctx.finance.marginPct = 20;
const positives = deriveAutonomousOutcomePositives(ctx);
ok("positives max 4", positives.length <= 4);
ok("positives has marża", positives.some((p) => p.includes("marża")));

const watchouts = deriveAutonomousOutcomeWatchouts(ctx, ["Wadium wymaga potwierdzenia"]);
ok("watchouts max 5", watchouts.length <= 5);
ok("watchouts includes warning", watchouts.some((w) => w.includes("Wadium") || w.includes("katalogu")));

ok("hero GO label", AUTONOMOUS_RECOMMENDATION_HERO.GO.includes("WARTO"));
ok("hero HOLD label", AUTONOMOUS_RECOMMENDATION_HERO.HOLD.includes("ANALIZY"));
ok("hero NO-GO label", AUTONOMOUS_RECOMMENDATION_HERO["NO-GO"].includes("NIE WARTO"));

// —— Feed ordering ——
console.log("\n-- feed ordering --");
const feedView = deriveAutonomousRunPhase(readyInput);
ok("feed sorted by priority", feedView.feed.every((e, i, arr) => i === 0 || arr[i - 1].priority <= e.priority));

// —— Live message while building ——
const buildingView = deriveAutonomousRunPhase(phaseInput({
  pipelineState: PipelineState.Heavy,
  dossierBuilding: true,
  elapsedMs: 25_000,
  item: baseItem({
    bzpDocuments: [mockDoc],
    documentsFetchedAt: new Date().toISOString(),
    swzAnalysis: { analyzedAt: new Date().toISOString(), title: "SWZ" },
  }),
}));
ok(
  "live message while dossier building",
  buildingView.activeLive?.message.includes("Buduję kosztorys"),
);

// —— Stuck idle shows next phase prompt ——
const stuckView = deriveAutonomousRunPhase(phaseInput({
  pipelineState: PipelineState.Idle,
  elapsedMs: 25_000,
  item: baseItem({
    bzpDocuments: [mockDoc],
    documentsFetchedAt: new Date().toISOString(),
    noticeHtml: "x".repeat(120),
    swzAnalysis: { analyzedAt: new Date().toISOString(), title: "SWZ" },
  }),
}));
ok(
  "stuck idle shows boq detect prompt",
  stuckView.activeLive?.message.includes("przedmiaru") || stuckView.activeLive?.message.includes("kosztorysu"),
);

// —— Failed partial ——
const failedInput = phaseInput({
  pipelineState: PipelineState.Failed,
  dossierParseFailed: true,
  intelligenceCtx: mockIntelligenceCtx(baseItem()),
});
ok("failed pipeline complete with ctx", deriveAutonomousPipelineComplete(failedInput));

console.log(`\n=== WYNIK: ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
