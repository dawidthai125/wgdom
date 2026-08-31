/**
 * IK A08-P4 G3 Final Bid — unit + negative guards (no production write).
 * Run: npx vite-node scripts/test-ik-g3-final-bid.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildIkG3FinalBidRecord,
  validateIkG3Amounts,
  readIkG3FinalBid,
  patchIkG3FinalBidOnItem,
  persistIkG3FinalBid,
  IK_G3_FINAL_BID_KIND,
} from "../src/lib/intelligent-estimator/ik-g3-final-bid.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

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

function readSrc(rel) {
  return readFileSync(join(root, rel), "utf8");
}

const PIPE = "08df0363-7b22-e462-ab56-940001283cba";
const OCDS = "ocds-148610-6f859612-6631-426b-83fc-830bfec1c888";
const NET = 159000;
const VAT = 36570;
const GROSS = 195570;

// —— Pure validation ——
ok("amounts happy", validateIkG3Amounts({ netPln: NET, vatRate: 0.23, vatPln: VAT, grossPln: GROSS }).ok === true);
ok("amounts reject net+vat≠gross", validateIkG3Amounts({ netPln: NET, vatRate: 0.23, vatPln: 1, grossPln: GROSS }).ok === false);
ok("amounts reject bad rate", validateIkG3Amounts({ netPln: NET, vatRate: 2, vatPln: VAT, grossPln: GROSS }).ok === false);

const built = buildIkG3FinalBidRecord({
  tenderPipelineId: PIPE,
  ocdsId: OCDS,
  netPln: NET,
  vatPln: VAT,
  grossPln: GROSS,
  p7RecommendedNetPln: 152900,
  caseLabel: "CHROBREGO_34A",
});
ok("build ok", built.ok === true);
ok("build kind", built.ok && built.record.kind === IK_G3_FINAL_BID_KIND);
ok("build net", built.ok && built.record.netPln === NET);
ok("build vat", built.ok && built.record.vatPln === VAT);
ok("build gross", built.ok && built.record.grossPln === GROSS);
ok("build source owner_g3", built.ok && built.record.source === "owner_g3");
ok("build ownerOverride", built.ok && built.record.ownerOverride === true);
ok("build p7 trail", built.ok && built.record.p7RecommendedNetPln === 152900);

ok(
  "build reject missing id",
  buildIkG3FinalBidRecord({
    tenderPipelineId: "",
    netPln: NET,
    vatPln: VAT,
    grossPln: GROSS,
  }).ok === false,
);

// —— Patch / read ——
const baseItem = {
  id: PIPE,
  tenderId: OCDS,
  title: "Chrobrego",
  status: "new",
  submittedBidPln: null,
  ourEstimatePln: null,
  updatedAt: "2026-08-01T00:00:00.000Z",
};
const patched = patchIkG3FinalBidOnItem(baseItem, built.record);
ok("patch sets ikFinalBid", readIkG3FinalBid(patched)?.netPln === NET);
ok("patch ≠ submittedBid", patched.submittedBidPln == null);
ok("patch ≠ ourEstimate", patched.ourEstimatePln == null);
ok("patch bumps updatedAt", patched.updatedAt !== baseItem.updatedAt);

try {
  patchIkG3FinalBidOnItem({ ...baseItem, id: "wrong" }, built.record);
  ok("patch wrong tender throws", false);
} catch {
  ok("patch wrong tender throws", true);
}

// —— Persist with inject (no cloud) ——
let saved = null;
const items = [{ ...baseItem }];
const persistOk = await persistIkG3FinalBid({
  tenderPipelineId: PIPE,
  expectedOcds: OCDS,
  netPln: NET,
  vatPln: VAT,
  grossPln: GROSS,
  p7RecommendedNetPln: 152900,
  caseLabel: "CHROBREGO_34A",
  items,
  save: async (next) => {
    saved = next;
  },
});
ok("persist ok", persistOk.ok === true);
ok("persist write 1", persistOk.ok && persistOk.writes.pipelinePersist === 1);
ok("persist saved ikFinalBid", saved?.[0]?.ikFinalBid?.netPln === NET);
ok("persist saved kind", saved?.[0]?.ikFinalBid?.kind === IK_G3_FINAL_BID_KIND);
ok("persist status unchanged", saved?.[0]?.status === "new");
ok("persist no submittedBid", saved?.[0]?.submittedBidPln == null);

const persistWrongTender = await persistIkG3FinalBid({
  tenderPipelineId: "other-id",
  expectedOcds: OCDS,
  netPln: NET,
  vatPln: VAT,
  grossPln: GROSS,
  items: [{ ...baseItem }],
  save: async () => {
    throw new Error("MUST_NOT_SAVE");
  },
});
ok("persist wrong tender no write", persistWrongTender.ok === false && persistWrongTender.reason === "TENDER_NOT_FOUND");

const persistOcdsMismatch = await persistIkG3FinalBid({
  tenderPipelineId: PIPE,
  expectedOcds: "ocds-WRONG",
  netPln: NET,
  vatPln: VAT,
  grossPln: GROSS,
  items: [{ ...baseItem }],
  save: async () => {
    throw new Error("MUST_NOT_SAVE");
  },
});
ok("persist ocds mismatch no write", persistOcdsMismatch.ok === false && persistOcdsMismatch.reason === "OCDS_MISMATCH");

const persistBadAmt = await persistIkG3FinalBid({
  tenderPipelineId: PIPE,
  expectedOcds: OCDS,
  netPln: NET,
  vatPln: 1,
  grossPln: GROSS,
  items: [{ ...baseItem }],
  save: async () => {
    throw new Error("MUST_NOT_SAVE");
  },
});
ok("persist bad amounts no write", persistBadAmt.ok === false);

// Idempotent noop
const after = saved;
const persistNoop = await persistIkG3FinalBid({
  tenderPipelineId: PIPE,
  expectedOcds: OCDS,
  netPln: NET,
  vatPln: VAT,
  grossPln: GROSS,
  items: after,
  save: async () => {
    throw new Error("MUST_NOT_SAVE_NOOP");
  },
});
ok("persist idempotent noop", persistNoop.ok === true && persistNoop.noop === true && persistNoop.writes.pipelinePersist === 0);

// —— Source locks ——
const g3Src = readSrc("src/lib/intelligent-estimator/ik-g3-final-bid.ts");
const hookSrc = readSrc("src/lib/intelligent-estimator/orchestra/use-ik-orchestra.ts");
const typeSrc = readSrc("src/lib/intelligent-estimator/orchestra/orchestra-types.ts");
const bzpSrc = readSrc("src/lib/tenders-bzp.ts");
const syncSrc = readSrc("src/lib/tenders-sync.ts");
const dfSrc = readSrc("docs/architecture/IK-AUTONOMY-08-P4-G3-FINAL-BID-DESIGN-FREEZE.md");

ok("DF exists", /DESIGN FREEZE = ACCEPTED/.test(dfSrc));
ok("DF ≠ submittedBid as target", /≠ submittedBidPln/.test(dfSrc));
ok("type ikFinalBid field", /ikFinalBid\?:/.test(bzpSrc));
ok("merge preserve ikFinalBid", /ikFinalBid: prev\.ikFinalBid/.test(bzpSrc) || /ikFinalBid: primary\.ikFinalBid/.test(syncSrc));
ok("sync merge preserve", /ikFinalBid: primary\.ikFinalBid/.test(syncSrc));
ok("hook g3Accept", /g3Accept:/.test(hookSrc));
ok("types g3Accept", /g3Accept:/.test(typeSrc));
ok("adapter no recordDecision call", !/\brecordDecision\s*\(/.test(g3Src));
ok("adapter no setOwnerDecision call", !/\bsetOwnerDecision\s*\(/.test(g3Src));
ok("adapter no import decision-persist", !/decision-persist|tenders-strategy-owner-decisions/.test(g3Src));
ok("adapter no patchSubmittedBid", !/patchSubmittedBidPln/.test(g3Src));
ok("adapter no calibration", !/recordSubmittedBidCalibration/.test(g3Src));
ok("adapter no catalog accept", !/acceptWorkRate|acceptIkLabor|acceptIkMaterial/.test(g3Src));

console.log(`\nIK G3 FINAL BID: ${pass} PASS / ${fail} FAIL`);
process.exit(fail === 0 ? 0 : 1);
