/**
 * IK-KNR-EXPERT Slice B — evidence adapter report (T-KNR-1…14).
 *
 * npx vite-node scripts/test-ik-knr-expert-slice-b.mjs
 *
 * ZERO settings write · ZERO KV · ZERO Research HTTP · ZERO A08-P3 · ZERO Sala/Owner apply.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  athPreviewToSnapshot,
  buildCatalogBasisFromRawCode,
} from "../src/lib/tenders-bzp-brief.ts";
import {
  composeDwellingOfferBoq,
  mergeDwellingArtifactLines,
} from "../src/lib/multi-boq/index.ts";
import { classifyEstimatorPricingPlane } from "../src/lib/intelligent-estimator/classification-gate.ts";
import { mapOfferBoqLine } from "../src/lib/tender-offer-boq-mapping.ts";
import { runIkKnrExpert } from "../src/lib/intelligent-estimator/ik-knr-expert.ts";

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

const DESC = "Skasowanie wykwitów i zacieków";
const CODE_FULL = "KNR 4-01 1202-07";
const CODE_HOLD = "KNR 4-01";

function previewRow(opts) {
  return {
    lp: opts.lp ?? "6",
    code: opts.code ?? "",
    description: opts.description ?? DESC,
    unit: opts.unit ?? "m2",
    quantity: opts.quantity ?? "12,5",
    unitPrice: "",
    total: "",
  };
}

function makePreview(row) {
  return {
    ok: true,
    format: "text",
    rows: [row],
    categories: [],
    warnings: [],
    summaryLines: [],
  };
}

function mergeCompose(snapshot, tenderId = "tender-slice-b") {
  const merged = mergeDwellingArtifactLines([
    {
      documentId: "doc-mops-6",
      artifactId: "art-mops-6",
      filename: "Miernicza_15_7_modernizacja PRZEDMIAR.pdf",
      branchHint: "unknown",
      snapshot,
    },
  ]);
  const dwellingSnap = {
    tenderId,
    dwellingId: "d1",
    sourceDocumentIds: ["doc-mops-6"],
    sourceArtifactIds: ["art-mops-6"],
    lines: merged.lines,
    completeness: merged.completeness,
    warnings: merged.warnings,
  };
  const composed = composeDwellingOfferBoq({ snapshot: dwellingSnap, builtAt: "2026-08-18T00:00:00.000Z" });
  return { merged, dwellingSnap, composed };
}

function stubExpert({ tenderId = "tender-slice-b", ready = true, refs = [] } = {}) {
  return {
    tenderId,
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

function refFromCompose(composed, dwellingId = "d1") {
  const line = composed.document.lines[0];
  const provenance = composed.lineProvenance[line.lineId];
  return { dwellingId, line, provenance };
}

function runOnCompose(composed, ready = true) {
  const ref = refFromCompose(composed);
  return {
    ref,
    report: runIkKnrExpert({
      tenderId: "tender-slice-b",
      documentExpert: stubExpert({ ready, refs: [ref] }),
    }),
  };
}

const HARD = {
  catalogWorkIdWritten: 0,
  knrHintMutated: false,
  classifyCalled: false,
  mapperCalled: false,
  researchExecuted: false,
};

function assertHardInvariants(label, report) {
  assert(`${label} catalogWorkIdWritten=0`, report.catalogWorkIdWritten === 0);
  assert(`${label} knrHintMutated=false`, report.knrHintMutated === false);
  assert(`${label} classifyCalled=false`, report.classifyCalled === false);
  assert(`${label} mapperCalled=false`, report.mapperCalled === false);
  assert(`${label} researchExecuted=false`, report.researchExecuted === false);
  assert(`${label} resolved=0`, report.counts.resolved === 0);
  assert(`${label} conflict=0`, report.counts.conflict === 0);
  assert(
    `${label} proposedWorkId null`,
    report.lines.every((l) => l.proposedWorkId === null),
  );
}

console.log("=== IK-KNR-EXPERT SLICE B ===\n");

const expertSrc = readSrc("src/lib/intelligent-estimator/ik-knr-expert.ts");
assert("B source does not import mapper", !/tender-offer-boq-mapping/.test(expertSrc));
assert("B source does not import classification-gate", !/classification-gate/.test(expertSrc));
assert("B source does not import ik-classification", !/ik-classification/.test(expertSrc));
assert("B source does not import labor expert", !/ik-labor-expert/.test(expertSrc));
assert("B source does not import material expert", !/ik-material-expert/.test(expertSrc));
assert("B source does not call mapOfferBoqLine", !/\bmapOfferBoqLine\s*\(/.test(expertSrc));
assert("B source does not call classifyEstimatorPricingPlane", !/\bclassifyEstimatorPricingPlane\s*\(/.test(expertSrc));
assert("B source does not mention ANALYZING return", !/status:\s*"ANALYZING"/.test(expertSrc));

const snapFull = athPreviewToSnapshot(makePreview(previewRow({ code: CODE_FULL })), "mops.pdf");
const snapNone = athPreviewToSnapshot(makePreview(previewRow({ code: "", description: `${DESC} 1202-07` })), "mops.pdf");
const snapHold = athPreviewToSnapshot(makePreview(previewRow({ code: CODE_HOLD })), "mops.pdf");

const pathFull = mergeCompose(snapFull);
const pathNone = mergeCompose(snapNone);
const pathHold = mergeCompose(snapHold);

assert("compose full ok", pathFull.composed.ok === true);
assert("compose none ok", pathNone.composed.ok === true);
assert("compose hold ok", pathHold.composed.ok === true);

const fullRun = runOnCompose(pathFull.composed);
const noneRun = runOnCompose(pathNone.composed);
const holdRun = runOnCompose(pathHold.composed);

assert("T-KNR-1 status COMPLETED", fullRun.report.status === "COMPLETED");
assert("T-KNR-1 evidencja rawCode", fullRun.report.lines[0]?.catalogBasis?.rawCode === CODE_FULL);
assert("T-KNR-1 evidencja normalizedKey", fullRun.report.lines[0]?.catalogBasis?.normalizedKey === "KNR|4-01|1202-07");
assert("T-KNR-1 withBasis=1", fullRun.report.counts.withBasis === 1);
assert("T-KNR-1 recognized=1", fullRun.report.counts.recognized === 1);
assertHardInvariants("T-KNR-1", fullRun.report);

assert("T-KNR-2 NONE", noneRun.report.lines[0]?.lineStatus === "NONE");
assert("T-KNR-2 catalogBasis null", noneRun.report.lines[0]?.catalogBasis == null);
assert("T-KNR-2 candidate=0", noneRun.report.counts.candidate === 0);
assert("T-KNR-2 none=1", noneRun.report.counts.none === 1);
assert("T-KNR-2 withoutBasis=1", noneRun.report.counts.withoutBasis === 1);
assertHardInvariants("T-KNR-2", noneRun.report);

assert("T-KNR-3 CANDIDATE", fullRun.report.lines[0]?.lineStatus === "CANDIDATE");
assert("T-KNR-3 proposedWorkId null", fullRun.report.lines[0]?.proposedWorkId === null);
assert("T-KNR-3 candidate=1", fullRun.report.counts.candidate === 1);
assert("T-KNR-3 BOQ catalogWorkId still null", fullRun.ref.line.catalogWorkId === null);

assert("T-KNR-4 HOLD", holdRun.report.lines[0]?.lineStatus === "HOLD");
assert("T-KNR-4 holdReason INCOMPLETE_TABLE_CODE", holdRun.report.lines[0]?.holdReason === "INCOMPLETE_TABLE_CODE");
assert("T-KNR-4 examplesHold<=3", holdRun.report.examplesHold.length === 1);
assert("T-KNR-4 not CANDIDATE", holdRun.report.counts.candidate === 0);

const familyCodes = {
  KNR: "KNR 4-01 1202-07",
  "KNR-W": "KNR-W 4-01 1202-07",
  KNNR: "KNNR 4-01 1202-07",
  NNRNKB: "NNRNKB 4-01 1202-07",
};
for (const [family, code] of Object.entries(familyCodes)) {
  const basis = buildCatalogBasisFromRawCode(code);
  const snap = athPreviewToSnapshot(makePreview(previewRow({ code })), "fam.pdf");
  const path = mergeCompose(snap, `tender-${family}`);
  const { report } = runOnCompose(path.composed);
  assert(`T-KNR-5 ${family} family`, report.lines[0]?.catalogBasis?.family === family, basis);
  assert(`T-KNR-5 ${family} CANDIDATE`, report.lines[0]?.lineStatus === "CANDIDATE");
}

assert("T-KNR-6 description-only still NONE", noneRun.report.lines[0]?.lineStatus === "NONE");
assert(
  "T-KNR-6 description still contains 1202-07",
  String(noneRun.ref.line.description).includes("1202-07"),
);
assert("T-KNR-6 B did not lift description into basis", noneRun.report.lines[0]?.catalogBasis == null);

const fakeOwnerMap = [
  { normalizedKey: "KNR|4-01|1202-07", workId: "cw-wykwity-zacieki", ownerApproval: true },
];
const beforeWorkId = fullRun.ref.line.catalogWorkId;
const beforeHint = fullRun.ref.line.knrHint;
const withIgnoredMap = runIkKnrExpert({
  tenderId: "tender-slice-b",
  documentExpert: stubExpert({ refs: [fullRun.ref] }),
  ownerKnrMap: fakeOwnerMap,
});
assert("T-KNR-7 ignored Owner map still CANDIDATE", withIgnoredMap.lines[0]?.lineStatus === "CANDIDATE");
assert("T-KNR-7 proposedWorkId null", withIgnoredMap.lines[0]?.proposedWorkId === null);
assert("T-KNR-7 catalogWorkIdWritten=0", withIgnoredMap.catalogWorkIdWritten === 0);
assert("T-KNR-7 line catalogWorkId unchanged", fullRun.ref.line.catalogWorkId === beforeWorkId);
assert("T-KNR-7 line knrHint unchanged", fullRun.ref.line.knrHint === beforeHint);

assert("T-KNR-8 no map catalogWorkId null", noneRun.ref.line.catalogWorkId === null);
assert("T-KNR-8 full path catalogWorkId null", fullRun.ref.line.catalogWorkId === null);

const a1Before = classifyEstimatorPricingPlane({
  workId: fullRun.ref.line.catalogWorkId,
  materialKey: null,
  namePl: fullRun.ref.line.description,
  unit: fullRun.ref.line.unit,
});
runIkKnrExpert({
  tenderId: "tender-slice-b",
  documentExpert: stubExpert({ refs: [fullRun.ref] }),
});
const a1After = classifyEstimatorPricingPlane({
  workId: fullRun.ref.line.catalogWorkId,
  materialKey: null,
  namePl: fullRun.ref.line.description,
  unit: fullRun.ref.line.unit,
});
assert("T-KNR-9 A1 plane unchanged", a1Before.plane === a1After.plane);
assert("T-KNR-9 A1 still UNKNOWN without Owner HIT", a1After.plane === "UNKNOWN");
assert(
  "T-KNR-9 classification-gate has no catalogBasis",
  !/catalogBasis/.test(readSrc("src/lib/intelligent-estimator/classification-gate.ts")),
);

assert(
  "T-KNR-10 labor expert has no catalogBasis",
  !/catalogBasis/.test(readSrc("src/lib/intelligent-estimator/ik-labor-expert.ts")),
);
assert(
  "T-KNR-10 material expert has no catalogBasis",
  !/catalogBasis/.test(readSrc("src/lib/intelligent-estimator/ik-material-expert.ts")),
);
assert("T-KNR-10 researchExecuted false", fullRun.report.researchExecuted === false);
assert(
  "T-KNR-10 mapper still keys knrHint",
  /normalizeKnrKey\(line\.knrHint\)/.test(readSrc("src/lib/tender-offer-boq-mapping.ts")),
);

const mapCtx = { works: [], mappedAt: "2026-08-18T00:00:00.000Z", cenyMaterialowUplift: false };
const mappedBefore = mapOfferBoqLine(fullRun.ref.line, mapCtx);
runIkKnrExpert({
  tenderId: "tender-slice-b",
  documentExpert: stubExpert({ refs: [fullRun.ref] }),
});
const mappedAfter = mapOfferBoqLine(fullRun.ref.line, mapCtx);
assert("T-KNR-11 mapperCalled false", fullRun.report.mapperCalled === false);
assert("T-KNR-11 mapped catalogWorkId baseline", mappedBefore.catalogWorkId === mappedAfter.catalogWorkId);
assert("T-KNR-11 mapped knrHint baseline", mappedBefore.knrHint === mappedAfter.knrHint);
assert(
  "T-KNR-11 mapper source ignores catalogBasis",
  !/line\.catalogBasis/.test(readSrc("src/lib/tender-offer-boq-mapping.ts")),
);

assert("T-KNR-12 classifyCalled false", fullRun.report.classifyCalled === false);
assert(
  "T-KNR-12 ik-classification has no catalogBasis",
  !/catalogBasis/.test(readSrc("src/lib/intelligent-estimator/ik-classification.ts")),
);

const settingsSrc = readSrc("src/lib/app-settings.ts");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
assert("T-KNR-13 no ikKnrEnabled", !/\bikKnrEnabled\b/.test(settingsSrc) && !/\bikKnrEnabled\b/.test(flagSrc));
assert("T-KNR-13 no knrExpertEnabled", !/\bknrExpertEnabled\b/.test(settingsSrc));
assert("T-KNR-13 no ikRoomEnabled", !/\bikRoomEnabled\b/.test(settingsSrc));
assert(
  "T-KNR-13 B source has no AppSettings write",
  !/app-settings/.test(expertSrc) && !/ik-entry-flag/.test(expertSrc),
);

const hashBefore = fullRun.ref.provenance.contentHash;
const keyBefore = fullRun.ref.provenance.sourceLineKey;
const lineIdBefore = fullRun.ref.line.lineId;
const descBefore = fullRun.ref.line.description;
runIkKnrExpert({
  tenderId: "tender-slice-b",
  documentExpert: stubExpert({ refs: [fullRun.ref] }),
});
assert("T-KNR-14 contentHash unchanged", fullRun.ref.provenance.contentHash === hashBefore);
assert("T-KNR-14 sourceLineKey unchanged", fullRun.ref.provenance.sourceLineKey === keyBefore);
assert("T-KNR-14 lineId unchanged", fullRun.ref.line.lineId === lineIdBefore);
assert("T-KNR-14 description unchanged", fullRun.ref.line.description === descBefore);
assert("T-KNR-14 outputLineCount = input", fullRun.report.outputLineCount === fullRun.report.inputLineCount);

const blockedMissing = runIkKnrExpert({ tenderId: "tender-slice-b", documentExpert: null });
assert("BLOCKED missing expert", blockedMissing.status === "BLOCKED");
assert("BLOCKED missing 0 lines", blockedMissing.lines.length === 0 && blockedMissing.inputLineCount === 0);
assert("BLOCKED ≠ NONE", blockedMissing.counts.none === 0);

const blockedNotReady = runOnCompose(pathFull.composed, false);
assert("BLOCKED not ready", blockedNotReady.report.status === "BLOCKED");
assert("BLOCKED not ready 0 lines", blockedNotReady.report.lines.length === 0);
assert("BLOCKED not ANALYZING", blockedNotReady.report.status !== "ANALYZING");
assert("COMPLETED legal with all NONE", noneRun.report.status === "COMPLETED");

assert("index exports runIkKnrExpert", /export \{ runIkKnrExpert \}/.test(readSrc("src/lib/intelligent-estimator/index.ts")));
assert("no IkEntryHost change in B file set", !/IkEntryHost/.test(expertSrc));
assert("HARD object shape", Object.keys(HARD).length === 5);

console.log(`\n=== ${fail === 0 ? "PASS" : "FAIL"} ${pass} passed, ${fail} failed ===`);
if (fail > 0) process.exit(1);
