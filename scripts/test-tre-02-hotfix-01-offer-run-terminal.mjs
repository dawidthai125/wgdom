/**
 * TRE-02-HOTFIX-01 — terminal mapping Offer Run (deriveOfferRunSnapshot).
 * Run: npx vite-node scripts/test-tre-02-hotfix-01-offer-run-terminal.mjs
 */
import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import { deriveOfferRunSnapshot } from "../src/lib/tender-offer-run.ts";
import { buildTenderRecommendationResult } from "../src/lib/tender-recommendation-result.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

function trust(overall = "trusted") {
  return {
    trustVersion: 2,
    computedAt: "2026-07-28T00:00:00.000Z",
    overall,
    overallLabelPl: "Zaufane",
    dimensions: [],
  };
}

function item() {
  return {
    id: "tender-hf01",
    title: "Hotfix terminal test",
    shortTitle: "HF",
    bzpNumber: "BZP-HF01",
    tenderId: "BZP-HF01",
    status: "seen",
    updatedAt: "2026-07-28T00:00:00.000Z",
    tenderDossier: { builtAt: "2026-07-28", kosztorys: { ok: true, rows: [], rowCount: 0 } },
  };
}

function signals(over = {}) {
  return {
    pipelineState: PipelineState.Pricing,
    autoRunning: false,
    dossierBuilding: false,
    dossierSaving: false,
    dossierParseFailed: false,
    parseErrorMessage: null,
    pricingReadyPartial: false,
    pricingReadyFinal: false,
    bidProposal: null,
    trustAssessment: trust(),
    discoveryMergedItem: item(),
    ...over,
  };
}

// 1) pricing running → running
{
  const snap = deriveOfferRunSnapshot(
    signals({
      pipelineState: PipelineState.Pricing,
      autoRunning: true,
      bidProposal: null,
    }),
  );
  assert("HF1 pricing+I/O → running", snap.lifecycleStatus === "running");
  assert("HF1 label Trwa wycena", snap.phaseLabelPl === "Trwa wycena…");
  assert("HF1 phase pricing", snap.phase === "pricing");
}

// 2) pricing finished + recommendedBidPln > 0 → Recommendation Result
{
  const snap = deriveOfferRunSnapshot(
    signals({
      pipelineState: PipelineState.Ready,
      pricingReadyFinal: true,
      bidProposal: { ok: true, recommendedBidPln: 125_000 },
      trustAssessment: trust("trusted"),
    }),
  );
  assert("HF2 has bid", snap.hasBidRecommendation === true);
  assert("HF2 lifecycle ready", snap.lifecycleStatus === "ready");
  assert("HF2 pln", snap.recommendedBidPln === 125_000);
  const result = buildTenderRecommendationResult({
    runId: "hf01",
    snapshot: snap,
    trustAssessment: trust("trusted"),
  });
  assert("HF2 RR quality ready", result.qualityStatus === "ready");
  assert("HF2 RR price", result.recommendedOfferPln === 125_000);
}

// 3) pricing finished + bid.ok = false → Brak rekomendowanej ceny
{
  const snap = deriveOfferRunSnapshot(
    signals({
      pipelineState: PipelineState.Pricing,
      bidProposal: { ok: false, recommendedBidPln: null },
    }),
  );
  assert("HF3 ok:false → insufficient", snap.lifecycleStatus === "insufficient_data");
  assert("HF3 label", snap.phaseLabelPl === "Brak rekomendowanej ceny");
  assert("HF3 not running", snap.lifecycleStatus !== "running");
}

// 4) pricing finished + recommendedBidPln = null → terminal
{
  const snap = deriveOfferRunSnapshot(
    signals({
      pipelineState: PipelineState.Ready,
      pricingReadyFinal: true,
      bidProposal: { ok: true, recommendedBidPln: null },
    }),
  );
  assert("HF4 null → insufficient", snap.lifecycleStatus === "insufficient_data");
  assert("HF4 label", snap.phaseLabelPl === "Brak rekomendowanej ceny");
}

// 5) pricing finished + recommendedBidPln = 0 → terminal
{
  const snap = deriveOfferRunSnapshot(
    signals({
      pipelineState: PipelineState.Ready,
      pricingReadyFinal: true,
      pricingReadyPartial: true,
      bidProposal: { ok: true, recommendedBidPln: 0 },
    }),
  );
  assert("HF5 zero → insufficient", snap.lifecycleStatus === "insufficient_data");
  assert("HF5 label", snap.phaseLabelPl === "Brak rekomendowanej ceny");
  assert("HF5 not Trwa wycena", snap.phaseLabelPl !== "Trwa wycena…");
}

// RCA case: Pricing + bid null (idle) must not spin forever
{
  const snap = deriveOfferRunSnapshot(
    signals({
      pipelineState: PipelineState.Pricing,
      bidProposal: null,
    }),
  );
  assert("HF6 Pricing idle null → terminal", snap.lifecycleStatus === "insufficient_data");
}

console.log(`\nTRE-02-HOTFIX-01: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
