/**
 * IK Full Autonomy GO#9–10 — AUT-G3-PERSIST gate + READY_TO_BID.
 * npx vite-node scripts/test-ik-aut-g3-persist-01.mjs
 */
import {
  buildIkG3FinalBidRecord,
  persistIkG3FinalBid,
  readIkG3FinalBid,
} from "../src/lib/intelligent-estimator/ik-g3-final-bid.ts";
import {
  evaluateIkG3PersistReady,
  isIkReadyToBid,
} from "../src/lib/intelligent-estimator/evaluate-ik-g3-persist-ready.ts";

let passed = 0;
let failed = 0;
function ok(name, cond, extra) {
  if (cond) {
    passed += 1;
    console.log(`PASS ${name}`);
  } else {
    failed += 1;
    console.error(`FAIL ${name}`, extra ?? "");
  }
}

const expertClean = {
  status: "ready",
  masterBoq: { status: "ready", readyForExperts: true },
  expertAdmission: {
    documentStatus: "ready",
    readyForExperts: true,
    globalIntegrityBlocker: false,
    expertChainMayProceed: true,
    admittedCount: 5,
    unresolvedCount: 0,
    skippedCount: 0,
    lines: [],
  },
};
const expertDirty = {
  status: "ready",
  masterBoq: { status: "ready", readyForExperts: true },
  expertAdmission: {
    documentStatus: "ready",
    readyForExperts: true,
    globalIntegrityBlocker: false,
    expertChainMayProceed: false,
    admittedCount: 0,
    unresolvedCount: 3,
    skippedCount: 0,
    lines: [],
  },
};

const p7Ready = {
  gapLineCount: 0,
  packageGatePass: true,
  cutoverGatePass: true,
  billableLineCount: 10,
  completeLineCount: 10,
  recommendedBidPln: 100_000,
  bidOk: true,
};
const p7Gaps = { ...p7Ready, gapLineCount: 2, completeLineCount: 8 };
const p7CutoverFail = { ...p7Ready, cutoverGatePass: false };

const failGate = evaluateIkG3PersistReady({
  expert: expertDirty,
  p7: p7Ready,
  requireBidCutover: true,
});
ok("gate_fail_admission", !failGate.ready);

const failGaps = evaluateIkG3PersistReady({
  expert: expertClean,
  p7: p7Gaps,
  requireBidCutover: true,
});
ok("gate_fail_gaps", !failGaps.ready && failGaps.reason === "P7_GAPS");

const failCutover = evaluateIkG3PersistReady({
  expert: expertClean,
  p7: p7CutoverFail,
  requireBidCutover: true,
});
ok("gate_fail_cutover", !failCutover.ready && failCutover.reason === "BID_CUTOVER_FAIL");

const passGate = evaluateIkG3PersistReady({
  expert: expertClean,
  p7: p7Ready,
  risk: { status: "ready" },
  requireBidCutover: true,
});
ok("gate_pass", passGate.ready, passGate);

const built = buildIkG3FinalBidRecord({
  tenderPipelineId: "t-aut-g3",
  netPln: 100_000,
  vatPln: 23_000,
  grossPln: 123_000,
  vatRate: 0.23,
  p7RecommendedNetPln: 100_000,
  source: "autonomous_g3",
});
ok("build_autonomous", built.ok && built.record.source === "autonomous_g3");
ok("owner_override_false", built.ok && built.record.ownerOverride === false);

const pipeline = [
  {
    id: "t-aut-g3",
    tenderId: "ocds-1",
    submittedBidPln: 999_999,
    ikFinalBid: null,
  },
];
const persist = await persistIkG3FinalBid({
  tenderPipelineId: "t-aut-g3",
  expectedOcds: "ocds-1",
  netPln: 100_000,
  vatPln: 23_000,
  grossPln: 123_000,
  vatRate: 0.23,
  p7RecommendedNetPln: 100_000,
  source: "autonomous_g3",
  items: pipeline,
  save: async (items) => {
    pipeline.splice(0, pipeline.length, ...items);
  },
});
ok("persist_ok", persist.ok, persist);
ok(
  "submitted_untouched",
  pipeline[0].submittedBidPln === 999_999,
);
ok(
  "ik_final_durable",
  readIkG3FinalBid(pipeline[0])?.source === "autonomous_g3",
);
ok(
  "ready_to_bid",
  isIkReadyToBid({
    item: pipeline[0],
    expert: expertClean,
    p7: p7Ready,
    financeOk: true,
  }),
);
ok(
  "not_ready_without_g3",
  !isIkReadyToBid({
    item: { id: "x", ikFinalBid: null },
    expert: expertClean,
    p7: p7Ready,
    financeOk: true,
  }),
);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
