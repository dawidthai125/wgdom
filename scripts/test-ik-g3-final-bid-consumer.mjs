/**
 * G3 Final Bid — consumer / UI projection (≠ fake P7).
 * Run: npx vite-node scripts/test-ik-g3-final-bid-consumer.mjs
 */
import {
  buildIkG3FinalBidRecord,
  readIkG3FinalBid,
  formatIkG3FinalBidStatusPl,
} from "../src/lib/intelligent-estimator/ik-g3-final-bid.ts";
import { resolveTenderBidProposalForUi } from "../src/lib/intelligent-estimator/resolve-tender-bid-proposal-ui.ts";
import { buildIkAnalysisHandoffViewModel } from "../src/lib/intelligent-estimator/ik-analysis-handoff-ui.ts";
import { buildIkEntryConversationViewModel } from "../src/lib/intelligent-estimator/ik-entry-conversation.ts";

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name, extra ?? "");
  }
}

const PIPE = "08df0363-7b22-e462-ab56-940001283cba";
const OCDS = "ocds-148610-6f859612-6631-426b-83fc-830bfec1c888";
const NET = 159000;
const VAT = 36570;
const GROSS = 195570;

const built = buildIkG3FinalBidRecord({
  tenderPipelineId: PIPE,
  ocdsId: OCDS,
  netPln: NET,
  vatPln: VAT,
  grossPln: GROSS,
  p7RecommendedNetPln: 152900,
  caseLabel: "CHROBREGO_34A",
});
ok("fixture build", built.ok === true);
const g3 = built.ok ? built.record : null;

const itemWithG3 = {
  id: PIPE,
  tenderId: OCDS,
  title: "Chrobrego 34a",
  status: "seen",
  submittedBidPln: null,
  ourEstimatePln: null,
  ikFinalBid: g3,
};

const itemWithoutG3 = {
  ...itemWithG3,
  ikFinalBid: null,
};

const pkgSingle = { mode: "single", dwellings: [] };

const p7Fail = {
  mode: "legacy_single",
  status: "blocked",
  bidOk: false,
  cutoverGatePass: false,
  packageGatePass: null,
  recommendedBidPln: null,
  proposal: { ok: false, recommendedBidPln: null },
  reasonsPl: ["cutover FAIL"],
  packageGate: null,
  catalogWorkWrite: 0,
  priceMemoryWrite: 0,
  researchExecuted: 0,
  httpCalls: 0,
  billableLineCount: 56,
  completeLineCount: 0,
  gapLineCount: 56,
  gapCodes: ["CUTOVER_FAIL"],
  laborCostPln: null,
  materialCostPln: null,
  directPln: null,
  provenance: {
    sourceRefKind: "test",
    packageSumUsed: false,
    rateSources: ["catalog"],
  },
  provisionalPricingSummary: null,
};

// —— 1. Cutover FAIL without G3 keeps legacy FAIL message ——
{
  const ui = resolveTenderBidProposalForUi({
    item: itemWithoutG3,
    pkg: pkgSingle,
    p7Report: p7Fail,
    legacyProposal: null,
    costPipeline01Enabled: true,
  });
  ok("no-G3 authoritative none", ui.authoritativeSource === "none");
  ok("no-G3 recommended null", ui.recommendedBidPln == null);
  ok("no-G3 gap is classic Cutover FAIL", ui.gapNotePl?.includes("brak authoritative P7 bid") === true);
  ok("no-G3 g3Persisted false", ui.g3Persisted === false);
  ok("no-G3 no fake P7", ui.proposal == null && ui.pdfExportBlocked === true);
}

// —— 2. Cutover FAIL with G3: G3 surfaced · P7 semantics intact · no fake recommended ——
{
  const ui = resolveTenderBidProposalForUi({
    item: itemWithG3,
    pkg: pkgSingle,
    p7Report: p7Fail,
    legacyProposal: null,
    costPipeline01Enabled: true,
  });
  ok("with-G3 authoritative still none (≠ fake P7)", ui.authoritativeSource === "none");
  ok("with-G3 recommendedBid still null", ui.recommendedBidPln == null);
  ok("with-G3 proposal null", ui.proposal == null);
  ok("with-G3 pdf still blocked (G3 ≠ PDF/P7)", ui.pdfExportBlocked === true);
  ok("with-G3 persisted", ui.g3Persisted === true);
  ok("with-G3 net", ui.g3FinalBid?.netPln === NET);
  ok("with-G3 vat", ui.g3FinalBid?.vatPln === VAT);
  ok("with-G3 gross", ui.g3FinalBid?.grossPln === GROSS);
  ok("with-G3 note", ui.g3NotePl?.includes("G3 FINAL BID: PERSISTED") === true);
  ok("with-G3 note has 159000", ui.g3NotePl?.includes("159") === true || ui.g3NotePl?.includes("159\u00a0000") === true || /159\s?000/.test(ui.g3NotePl ?? ""));
  ok(
    "with-G3 gap rephrased (no false 'brak' Owner bid)",
    ui.gapNotePl?.includes("P7 prep") === true
      && !ui.gapNotePl?.includes("brak authoritative P7 bid"),
  );
  ok("submittedBid untouched on item", itemWithG3.submittedBidPln == null);
  ok("ourEstimate untouched on item", itemWithG3.ourEstimatePln == null);
  ok("status seen", itemWithG3.status === "seen");
}

// —— 3. Handoff VM shows G3 · no false Bid: CutoverGate FAIL as Owner absence ——
{
  const ui = resolveTenderBidProposalForUi({
    item: itemWithG3,
    pkg: pkgSingle,
    p7Report: p7Fail,
    legacyProposal: null,
    costPipeline01Enabled: true,
  });
  const vm = buildIkAnalysisHandoffViewModel({
    observation: {
      tenderId: PIPE,
      caseKey: PIPE,
      updatedAt: "2026-08-31T00:00:00.000Z",
      overallStatus: "done",
      stages: [
        { stageId: "documents", status: "done", actor: "Document", labelPl: "Dokumenty" },
        { stageId: "complete", status: "done", actor: "Control", labelPl: "Complete" },
      ],
      conversationHints: [],
      progress: {
        percent: 100,
        completedWeight: 5,
        totalWeight: 5,
        runningStageId: null,
        blocked: false,
      },
      eta: null,
      final: null,
    },
    ownerActionQueue: null,
    packageBlockers: null,
    bidUi: ui,
    chiefDossierAvailable: false,
  });
  ok("handoff g3Persisted", vm.g3Persisted === true);
  ok("handoff g3 note", vm.g3FinalBidNotePl?.includes("G3 FINAL BID: PERSISTED") === true);
  ok("handoff still exposes P7 prep gap separately", vm.bidGapNotePl?.includes("P7 prep") === true);
  ok("handoff CTA not forced kosztorys solely by P7 gap", vm.cta.kind !== "kosztorys_bid" || vm.bucket === "ready_for_next");
  ok("handoff ready_for_next when done+G3", vm.bucket === "ready_for_next");
}

// —— 4. Expert conversation surfaces G3_FINAL_BID ——
{
  const conv = buildIkEntryConversationViewModel(itemWithG3, {
    positionCostBid: p7Fail,
  });
  const g3Step = conv.steps.find((s) => s.event === "G3_FINAL_BID");
  const bidStep = conv.steps.find((s) => s.event === "BID_PROPOSAL");
  ok("conversation has G3 step", g3Step != null);
  ok("conversation G3 done", g3Step?.status === "done");
  ok(
    "conversation G3 message",
    g3Step?.messagePl?.includes("G3 FINAL BID: PERSISTED") === true,
  );
  ok(
    "conversation P7 bid does not claim Owner absence falsely",
    bidStep?.messagePl?.includes("P7 Bid prep") === true
      || bidStep?.messagePl?.includes("≠ G3") === true,
  );
  ok(
    "conversation does not invent recommendedBid=159000 as P7",
    !bidStep?.messagePl?.includes("rekomendowana 159"),
  );
}

// —— 5. format helper ——
ok(
  "format status pl",
  formatIkG3FinalBidStatusPl(g3)?.startsWith("G3 FINAL BID: PERSISTED") === true,
);
ok("readIkG3 from item", readIkG3FinalBid(itemWithG3)?.netPln === NET);
ok("readIkG3 null without", readIkG3FinalBid(itemWithoutG3) == null);

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail) process.exit(1);
