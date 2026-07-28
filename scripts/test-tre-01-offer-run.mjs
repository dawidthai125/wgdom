/**
 * TRE-01 Slice A — Offer Run + Recommendation Result + Foundation spine.
 * Run: npx vite-node scripts/test-tre-01-offer-run.mjs
 */
import { PipelineState } from "../src/lib/tender-pipeline/tender-pipeline-types.ts";
import {
  deriveOfferRunSnapshot,
  offerRunIdStorageKey,
} from "../src/lib/tender-offer-run.ts";
import {
  buildTenderRecommendationResult,
  formatRecommendedOfferPln,
} from "../src/lib/tender-recommendation-result.ts";
import {
  bootstrapOfferRunFoundation,
  createOfferRunInsufficientError,
  digestRecommendationPayload,
  emitOfferRecommendedEvent,
  emitRecommendationIssuedAudit,
  ensureOfferRunId,
  TRE_01_AUDIT_RECOMMENDATION_ISSUED,
  TRE_01_EVENT_OFFER_RECOMMENDED,
} from "../src/lib/tender-offer-run-foundation.ts";
import { isValidId } from "../src/lib/wgdom-foundation/id/index.ts";
import { isDigest } from "../src/lib/wgdom-foundation/digest/index.ts";
import { isFoundationError } from "../src/lib/wgdom-foundation/errors/index.ts";
import { isAuditRecord } from "../src/lib/wgdom-foundation/audit/index.ts";
import { isEvent } from "../src/lib/wgdom-foundation/events/index.ts";
import {
  isTre01SliceAEnabled,
  TRE_01_SLICE_A_DEFAULT,
  TRE_01_SLICE_A_LS_KEY,
} from "../src/lib/tenders-v4-config.ts";

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
    overallLabelPl:
      overall === "trusted"
        ? "Zaufane"
        : overall === "partial"
          ? "Częściowe"
          : overall === "blocked"
            ? "Zablokowane"
            : "Nieznane",
    dimensions: [],
  };
}

function baseItem(over = {}) {
  return {
    id: "tender-tre-01-test",
    title: "Remont klatki schodowej — test TRE-01",
    shortTitle: "Remont",
    bzpNumber: "BZP-TRE-01",
    tenderId: "BZP-TRE-01",
    status: "seen",
    updatedAt: "2026-07-28T00:00:00.000Z",
    ...over,
  };
}

function signals(over = {}) {
  return {
    pipelineState: PipelineState.Ready,
    autoRunning: false,
    dossierBuilding: false,
    dossierSaving: false,
    dossierParseFailed: false,
    parseErrorMessage: null,
    pricingReadyPartial: false,
    pricingReadyFinal: true,
    bidProposal: {
      recommendedBidPln: 125_000,
      directCostPln: 100_000,
    },
    trustAssessment: trust("trusted"),
    discoveryMergedItem: baseItem(),
    ...over,
  };
}

// --- Flag R0 ---
assert("F1 default ON (TRE-02)", TRE_01_SLICE_A_DEFAULT === true);
assert("F2 enabled mirrors default (no LS)", isTre01SliceAEnabled() === TRE_01_SLICE_A_DEFAULT);

// --- Offer Run mapping ---
{
  const snap = deriveOfferRunSnapshot(signals());
  assert("R1 ready + price", snap.lifecycleStatus === "ready" && snap.recommendedBidPln === 125_000);
  assert("R1 phase ready", snap.phase === "ready");
}

{
  const snap = deriveOfferRunSnapshot(
    signals({
      bidProposal: null,
      autoRunning: true,
      pipelineState: PipelineState.Discovery,
    }),
  );
  assert("R2 running discovery", snap.lifecycleStatus === "running" && snap.phase === "documents");
}

{
  const snap = deriveOfferRunSnapshot(
    signals({
      bidProposal: { recommendedBidPln: 90_000 },
      trustAssessment: trust("partial"),
    }),
  );
  assert("R3 review_required on partial trust", snap.lifecycleStatus === "review_required");
}

{
  const snap = deriveOfferRunSnapshot(
    signals({
      bidProposal: null,
      dossierParseFailed: true,
      parseErrorMessage: "Parse ATH failed",
      pipelineState: PipelineState.Failed,
    }),
  );
  assert("R4 insufficient on critical fail", snap.lifecycleStatus === "insufficient_data");
  assert("R4 error message", snap.criticalErrorMessage?.includes("Parse") === true);
}

{
  const snap = deriveOfferRunSnapshot(
    signals({
      bidProposal: { recommendedBidPln: null },
      pricingReadyFinal: true,
    }),
  );
  assert("R5 Bid null → no recommendation", snap.hasBidRecommendation === false);
  assert("R5 Bid null → terminal insufficient", snap.lifecycleStatus === "insufficient_data");
  assert("R5 Bid null → Brak rekomendowanej ceny", snap.phaseLabelPl === "Brak rekomendowanej ceny");
}

// --- Recommendation Result (Bid only) ---
{
  const snap = deriveOfferRunSnapshot(signals());
  const result = buildTenderRecommendationResult({
    runId: "str_test",
    snapshot: snap,
    trustAssessment: trust("trusted"),
  });
  assert("RR1 recommendedOfferPln from Bid", result.recommendedOfferPln === 125_000);
  assert("RR2 quality ready", result.qualityStatus === "ready");
  assert("RR3 format PLN", formatRecommendedOfferPln(125_000).includes("125"));
  assert("RR4 canShowCostEstimate", result.canShowCostEstimate === true);
}

{
  const snap = deriveOfferRunSnapshot(
    signals({ bidProposal: { recommendedBidPln: 50_000 }, trustAssessment: trust("blocked") }),
  );
  const result = buildTenderRecommendationResult({
    runId: "str_test",
    snapshot: snap,
    trustAssessment: trust("blocked"),
  });
  assert("RR5 blocked → review_required", result.qualityStatus === "review_required");
  assert("RR5 price still Bid", result.recommendedOfferPln === 50_000);
}

assert("LS key prefix", offerRunIdStorageKey("abc").startsWith("kw-tre-01-offer-run-id:"));
assert("LS flag key", TRE_01_SLICE_A_LS_KEY === "kw-tre-01-slice-a");

// --- Foundation spine ---
async function foundationTests() {
  const tenderId = `tender-fnd-${Date.now()}`;
  const runId = ensureOfferRunId(tenderId);
  assert("FND1 runId start type", isValidId(runId, "start"));
  const again = ensureOfferRunId(tenderId);
  assert("FND1 idempotent runId", again === runId);

  const handles = await bootstrapOfferRunFoundation({ tenderPipelineItemId: `${tenderId}-b` });
  assert("FND1 bootstrap runId", isValidId(handles.runId, "start"));

  const digest = await digestRecommendationPayload({
    runId: handles.runId,
    recommendedOfferPln: 125_000,
    tenderPipelineItemId: tenderId,
  });
  assert("FND2 digest wire", isDigest(digest));

  const err = createOfferRunInsufficientError("brak danych");
  assert("FND3 FoundationError", isFoundationError(err));
  assert("FND3 code", err.code === "FND_OFFER_INSUFFICIENT_DATA");

  const audit = await emitRecommendationIssuedAudit({
    runId: handles.runId,
    tenderPipelineItemId: tenderId,
    recommendedOfferPln: 125_000,
  });
  assert("FND4 audit record", isAuditRecord(audit));
  assert("FND4 action issued", audit.action === TRE_01_AUDIT_RECOMMENDATION_ISSUED);
  assert("FND4 payload digest", isDigest(audit.payloadDigest));

  const evt = await emitOfferRecommendedEvent({
    runId: handles.runId,
    recommendedOfferPln: 125_000,
  });
  assert("FND5 event", isEvent(evt));
  assert("FND5 type recommended", evt.type === TRE_01_EVENT_OFFER_RECOMMENDED);
}

await foundationTests();

console.log(`\nTRE-01 Slice A: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
