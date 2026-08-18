/**
 * IK-KNR-EXPERT Slice C2 — KNR conversation adapter (T-ROOM-C2-1…18).
 *
 * npx vite-node scripts/test-ik-knr-expert-slice-c2.mjs
 *
 * ZERO host / chrome / Hub / actorFromStep · ZERO settings/KV · ZERO A08-P3.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";
import { buildIkKnrConversation } from "../src/lib/intelligent-estimator/ik-knr-conversation.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

let pass = 0;
let fail = 0;
function assert(name, cond, extra) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name, extra ?? "");
  }
}

const BASIS_FULL = {
  family: "KNR",
  catalogId: "4-01",
  tableCode: "1202-07",
  rawCode: "KNR 4-01 1202-07",
  display: "KNR 4-01 1202-07",
  normalizedKey: "KNR|4-01|1202-07",
};

function holdExample(lp) {
  return {
    lineId: `hold-${lp}`,
    dwellingId: "d1",
    lp,
    catalogBasis: {
      family: "KNR",
      catalogId: "4-01",
      tableCode: null,
      rawCode: "KNR 4-01",
      display: "KNR 4-01",
      normalizedKey: "KNR|4-01|",
    },
    lineStatus: "HOLD",
    proposedWorkId: null,
    holdReason: "INCOMPLETE_TABLE_CODE",
  };
}

function emptyCounts(over = {}) {
  return {
    withBasis: 0,
    withoutBasis: 0,
    recognized: 0,
    candidate: 0,
    hold: 0,
    conflict: 0,
    none: 0,
    resolved: 0,
    ...over,
  };
}

function makeReport(over = {}) {
  return {
    tenderId: "tender-c2",
    status: "COMPLETED",
    inputLineCount: 0,
    outputLineCount: 0,
    counts: emptyCounts(),
    catalogWorkIdWritten: 0,
    knrHintMutated: false,
    classifyCalled: false,
    mapperCalled: false,
    researchExecuted: false,
    lines: [],
    examplesHold: [],
    reasons: [],
    ...over,
    counts: emptyCounts(over.counts),
  };
}

function copyText(view) {
  return view.steps
    .flatMap((s) => [s.messagePl, s.detailPl, s.statusLabelPl, s.actorLabelPl])
    .filter(Boolean)
    .join("\n");
}

const FORBIDDEN_COPY = [
  /\bidentity\b/i,
  /catalogWorkId/i,
  /catalogBasis/i,
  /knrHint/i,
  /OUR RATE/i,
  /\bbucket\b/i,
  /\bplane\b/i,
  /\bUNKNOWN\b/,
  /\bHOLD\b/,
  /\bcandidate\b/i,
  /\bResearch\b/,
  /\bA1\b/,
  /\bP5\b/,
  /\bP6\b/,
  /\bP7\b/,
  /\bP8\b/,
  /\bmapper\b/i,
  /\bclassifier\b/i,
  /\bSSOT\b/,
  /\bANALYZING\b/,
  /\bCANDIDATE\b/,
  /\bCOMPLETED\b/,
  /\bBLOCKED\b/,
  /\bNONE\b/,
  /\bCONFLICT\b/,
  /\bChief\b/,
  /%/,
  /\bETA\b/i,
  /Analizuję/i,
  /zostało\s+\d/i,
];

const ASSIGN_COPY = [
  /przypis/i,
  /CatalogWork/i,
  /właściw[aąe]\s+prac/i,
  /rozpoznali/i,
  /ustalili/i,
  /nadali/i,
  /identyfikacj/i,
];

function assertNoForbiddenCopy(label, view) {
  const text = copyText(view);
  for (const re of FORBIDDEN_COPY) {
    assert(`${label} copy !${re}`, !re.test(text), text);
  }
}

function stubExpert({ ready = true, refs = [] } = {}) {
  return {
    tenderId: "tender-c2",
    masterBoq: {
      mode: "multi",
      schemaVersion: 5,
      lineCount: refs.length,
      composedLineCount: refs.length,
      sourceLineCount: refs.length,
      dwellingCount: 1,
      branchCount: 0,
      sourceCount: 1,
      hasLineProvenance: true,
      status: ready ? "ready" : "pending",
      readyForExperts: ready,
    },
    masterBoqLines: refs,
  };
}

console.log("=== IK-KNR-EXPERT SLICE C2 ===\n");

const convSrc = readSrc("src/lib/intelligent-estimator/ik-knr-conversation.ts");
const indexSrc = readSrc("src/lib/intelligent-estimator/index.ts");

assert("T-ROOM-C2-12 no mapper import", !/tender-offer-boq-mapping/.test(convSrc));
assert("T-ROOM-C2-13 no classification-gate", !/classification-gate/.test(convSrc));
assert("T-ROOM-C2-13 no ik-classification", !/ik-classification/.test(convSrc));
assert("T-ROOM-C2-13 no classifyEstimatorPricingPlane", !/\bclassifyEstimatorPricingPlane\b/.test(convSrc));
assert("T-ROOM-C2-14 no Research import", !/ik-labor-expert|ik-material-expert|executeResearch/.test(convSrc));
assert("T-ROOM-C2-14 no Owner mapping", !/applyOwnerKnr|OwnerKnr|identity-mapping/.test(convSrc));
assert("T-ROOM-C2-14 no CatalogWork lookup", !/lookupWorkRate|wgdom-work-catalog/.test(convSrc));
assert("T-ROOM-C2-15 no AppSettings", !/AppSettings|admin-settings|ik-entry-flag/.test(convSrc));
assert("T-ROOM-C2-15 no KV/localStorage", !/localStorage|kw-/.test(convSrc));
assert("T-ROOM-C2-15 no new flag token", !/ikKnr|ikExpertRoom/.test(convSrc));
assert("C2 does not edit event actor union", !/IkConversationEventActor/.test(convSrc));
assert("C2 does not import host", !/IkEntryHost/.test(convSrc));
assert("C2 does not import Hub", !/TenderWorkflowHubPanel/.test(convSrc));
assert("index exports buildIkKnrConversation", /buildIkKnrConversation/.test(indexSrc));
assert("T-ROOM-C2-18 no ANALYZING in copy builder", !/Analizuję|status:\s*"ANALYZING"/.test(convSrc));
assert("T-ROOM-C2-18 no fake ETA", !/ETA|zostało\s+\d|progress\s*%/.test(convSrc));
assert("C2 does not iterate lines[] for messages", !/report\.lines\s*\.map/.test(convSrc));

const readyReport = runIkKnrExpert({
  tenderId: "tender-c2",
  documentExpert: stubExpert({
    ready: true,
    refs: [
      {
        dwellingId: "d1",
        line: {
          lineId: "l1",
          lp: "6",
          catalogBasis: BASIS_FULL,
          catalogWorkId: null,
          knrHint: null,
        },
        provenance: { catalogBasis: BASIS_FULL },
      },
    ],
  }),
});
const readyView = buildIkKnrConversation(readyReport);
assert("T-ROOM-C2-1 COMPLETED conversation", readyReport.status === "COMPLETED" && readyView.steps.length === 3);
assert("T-ROOM-C2-1 has lead", readyView.steps[0]?.event === "KNR_LEAD");
assert("T-ROOM-C2-1 has expert", readyView.steps[1]?.event === "KNR_REPORT");
assert("T-ROOM-C2-1 has wrap", readyView.steps[2]?.event === "KNR_WRAP");
assert("T-ROOM-C2-1 lead copy", /oznaczenia katalogowe/i.test(readyView.steps[0].messagePl));
assert("T-ROOM-C2-1 expert uses counts", /Przejrzałem 1 pozycji/.test(readyView.steps[1].messagePl));
assert("T-ROOM-C2-1 sourceRef boq_ready", readyView.steps[0].sourceRef.kind === "boq_ready");
assert("T-ROOM-C2-1 sourceRef evidence", readyView.steps[1].sourceRef.kind === "evidence");
assert("T-ROOM-C2-1 no status hold", readyView.steps.every((s) => s.status !== "hold"));
assertNoForbiddenCopy("T-ROOM-C2-1", readyView);

const emptyView = buildIkKnrConversation(
  makeReport({
    inputLineCount: 4,
    outputLineCount: 4,
    counts: { withBasis: 0, withoutBasis: 4, none: 4, recognized: 0 },
  }),
);
const emptyText = copyText(emptyView);
assert("T-ROOM-C2-2 empty basis copy", /brak.*oznaczeń katalogowych w danych|nie ma jeszcze oznaczeń katalogowych w danych/i.test(emptyText));
assert("T-ROOM-C2-2 not PDF claim", !/PDF/i.test(emptyText));
assert("T-ROOM-C2-2 not parser claim", !/parser/i.test(emptyText));
assertNoForbiddenCopy("T-ROOM-C2-2", emptyView);

const candView = buildIkKnrConversation(
  makeReport({
    inputLineCount: 10,
    outputLineCount: 10,
    counts: { withBasis: 8, withoutBasis: 2, recognized: 8, candidate: 8, none: 2 },
  }),
);
const candText = copyText(candView);
assert("T-ROOM-C2-3 candidate markings copy", /znaleziono oznaczenia katalogowe/i.test(candText));
assert("T-ROOM-C2-3 not assignment", !ASSIGN_COPY.some((re) => re.test(candText)));
assertNoForbiddenCopy("T-ROOM-C2-3", candView);

const holdView = buildIkKnrConversation(
  makeReport({
    inputLineCount: 5,
    outputLineCount: 5,
    counts: { withBasis: 5, recognized: 5, hold: 5 },
    examplesHold: [holdExample("2"), holdExample("3")],
  }),
);
const holdText = copyText(holdView);
assert("T-ROOM-C2-4 uncertainty copy", /nie zgadujemy|niepewne|do sprawdzenia/i.test(holdText));
assert("T-ROOM-C2-4 examples from examplesHold", /Pozycja 2: do sprawdzenia/.test(holdText));
assert("T-ROOM-C2-4 no holdReason in copy", !/INCOMPLETE_TABLE_CODE/.test(holdText));
assertNoForbiddenCopy("T-ROOM-C2-4", holdView);

const conflictView = buildIkKnrConversation(
  makeReport({
    inputLineCount: 6,
    outputLineCount: 6,
    counts: { withBasis: 6, recognized: 6, candidate: 6, conflict: 2 },
  }),
);
const conflictText = copyText(conflictView);
assert("T-ROOM-C2-5 several readings", /kilka odczytów wymaga potwierdzenia/i.test(conflictText));
assertNoForbiddenCopy("T-ROOM-C2-5", conflictView);

for (const view of [readyView, emptyView, candView, holdView, conflictView]) {
  const text = copyText(view);
  assert("T-ROOM-C2-6 no assignment copy", !ASSIGN_COPY.some((re) => re.test(text)), text);
  assert("T-ROOM-C2-16 max 3 steps", view.steps.length <= 3, view.steps.length);
  assert("T-ROOM-C2-18 no fake progress in copy", !/%|ETA|Analizuję|zostało\s+\d/i.test(text));
}

const manyHold = buildIkKnrConversation(
  makeReport({
    inputLineCount: 8,
    outputLineCount: 8,
    counts: { withBasis: 8, recognized: 8, hold: 8 },
    examplesHold: [1, 2, 3, 4, 5].map((n) => holdExample(String(n))),
  }),
);
const holdDetail = manyHold.steps.find((s) => s.event === "KNR_REPORT")?.detailPl ?? "";
const exampleHits = (holdDetail.match(/Pozycja \d+: do sprawdzenia/g) ?? []).length;
assert("T-ROOM-C2-7 max 3 examples", exampleHits === 3, holdDetail);
assert("T-ROOM-C2-7 no 4th example", !/Pozycja 4:/.test(holdDetail));

const noExamples = buildIkKnrConversation(
  makeReport({
    inputLineCount: 3,
    outputLineCount: 3,
    counts: { withBasis: 3, recognized: 3, hold: 3 },
    examplesHold: [],
  }),
);
const noExDetail = noExamples.steps.find((s) => s.event === "KNR_REPORT")?.detailPl;
assert("T-ROOM-C2-8 no invented examples", noExDetail == null);

const blockedReport = runIkKnrExpert({
  tenderId: "tender-c2",
  documentExpert: stubExpert({ ready: false, refs: [] }),
});
const blockedView = buildIkKnrConversation(blockedReport);
const blockedText = copyText(blockedView);
assert("T-ROOM-C2-9 BLOCKED status", blockedReport.status === "BLOCKED");
assert("T-ROOM-C2-9 one step", blockedView.steps.length === 1);
assert("T-ROOM-C2-9 blocked event", blockedView.steps[0]?.event === "KNR_BLOCKED");
assert("T-ROOM-C2-9 no COMPLETED narrative", !/Przejrzałem/.test(blockedText));
assert("T-ROOM-C2-9 czekam na przedmiar", /czekam na przedmiar/i.test(blockedText));
assert("T-ROOM-C2-9 not 'brak KNR'", !/brak KNR/i.test(blockedText));
assert("T-ROOM-C2-9 status blocked not hold", blockedView.steps[0].status === "blocked");
assertNoForbiddenCopy("T-ROOM-C2-9", blockedView);

const mutated = makeReport({
  inputLineCount: 1,
  outputLineCount: 1,
  counts: { withBasis: 1, recognized: 1, candidate: 1 },
  lines: [
    {
      lineId: "l-mut",
      dwellingId: "d1",
      lp: "1",
      catalogBasis: BASIS_FULL,
      lineStatus: "CANDIDATE",
      proposedWorkId: null,
      catalogWorkId: "must-stay",
      knrHint: "must-stay",
    },
  ],
});
const before = JSON.stringify(mutated);
buildIkKnrConversation(mutated);
assert("T-ROOM-C2-10 catalogWorkId unchanged", JSON.stringify(mutated) === before);
assert("T-ROOM-C2-11 knrHint unchanged", mutated.lines[0].knrHint === "must-stay");
assert("T-ROOM-C2-10 extra catalogWorkId unchanged", mutated.lines[0].catalogWorkId === "must-stay");

const analyzingView = buildIkKnrConversation(makeReport({ status: "ANALYZING", inputLineCount: 12 }));
assert("ANALYZING treated as blocked", analyzingView.steps[0]?.event === "KNR_BLOCKED");
assert("ANALYZING not in copy", !/ANALYZING|Analizuję/.test(copyText(analyzingView)));

const allCopyViews = [readyView, emptyView, candView, holdView, conflictView, manyHold, noExamples, blockedView, analyzingView];
for (const view of allCopyViews) {
  assertNoForbiddenCopy("T-ROOM-C2-17", view);
  assert("T-ROOM-C2-16 all views ≤3", view.steps.length <= 3);
  assert(
    "done has sourceRef",
    view.steps.filter((s) => s.status === "done").every((s) => s.sourceRef && s.sourceRef.kind && s.sourceRef.tenderId != null),
  );
}

console.log(`\nC2 ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
