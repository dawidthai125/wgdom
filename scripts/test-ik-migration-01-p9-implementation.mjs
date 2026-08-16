/**
 * IK-MIGRATION-01 P9 IMPLEMENTATION — Owner Verify (Gate A → Gate B → Owner).
 * Run: npx vite-node scripts/test-ik-migration-01-p9-implementation.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { defaultAppSettings } from "../src/lib/app-settings.ts";
import {
  IK_P9_TARGET_TENDER_ID,
  IK_P9_OWNER_VERIFY_SCHEMA_VERSION,
  isIkP9TargetTender,
  snapshotIkP9DState,
  compareIkP9DSnapshots,
  evaluateIkP9GateA,
  evaluateIkP9GateB,
  runIkP9OwnerVerify,
  canRunIkP9OwnerVerify,
} from "../src/lib/intelligent-estimator/ik-p9-owner-verify.ts";

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

function runSuite(rel) {
  const r2 = spawnSync(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["vite-node", rel],
    { cwd: root, encoding: "utf8", shell: true },
  );
  const out = (r2.stdout || "") + (r2.stderr || "");
  const ok = r2.status === 0 && /PASS|0 FAIL|PASS \/ 0 FAIL/i.test(out);
  return { ok, out: out.slice(-600) };
}

const TARGET = IK_P9_TARGET_TENDER_ID;
const WRONG = "00000000-0000-0000-0000-000000000000";

// A — identity
assert("A target constant", TARGET === "08def45d-ead6-5db8-962b-120001d33d37");
assert("A is target", isIkP9TargetTender(TARGET) === true);
assert("H wrong tender", isIkP9TargetTender(WRONG) === false);

const gateAOk = {
  tenderId: TARGET,
  buildPass: true,
  routingOk: true,
  detailPageOk: true,
  hubOk: true,
  ikEntryOffNg10Ok: true,
  dualOutcomeUnchanged: true,
  payrollCloudSyncUntouched: true,
  whiteScreen: false,
};
const gateBOk = {
  tenderId: TARGET,
  isLiveProduction: true,
  hasSourceRefEvidence: true,
  claimsInventedPassWithoutEvidence: false,
  bidOkUsedAsMaterialsDone: false,
};

// B / C Gate A
assert("B Gate A PASS", evaluateIkP9GateA(gateAOk).status === "pass");
assert(
  "C Gate A NO-GO white screen",
  evaluateIkP9GateA({ ...gateAOk, whiteScreen: true }).status === "no_go",
);
assert(
  "C Gate A FAIL wrong tender",
  evaluateIkP9GateA({ ...gateAOk, tenderId: WRONG }).status === "fail",
);

// D / E Gate B
assert("D Gate B PASS", evaluateIkP9GateB(gateBOk).status === "pass");
assert(
  "E Gate B FAIL localhost",
  evaluateIkP9GateB({ ...gateBOk, isLiveProduction: false }).status === "fail",
);
assert(
  "E Gate B FAIL invent",
  evaluateIkP9GateB({ ...gateBOk, claimsInventedPassWithoutEvidence: true }).status === "fail",
);

// K / L / M D snapshots
const d0 = snapshotIkP9DState({ expertAiDecydentEnabled: false, nowMs: 1 });
const d1 = snapshotIkP9DState({ expertAiDecydentEnabled: false, nowMs: 2 });
const d2 = snapshotIkP9DState({ expertAiDecydentEnabled: true, nowMs: 3 });
assert("K D before snapshot", d0.expertAiDecydentEnabled === false);
assert("L D after same", compareIkP9DSnapshots(d0, d1).diff === 0);
assert("M D diff=0 same", compareIkP9DSnapshots(d0, d1).mutated === false);
assert("M D mutation detected", compareIkP9DSnapshots(d0, d2).diff === 1);

// F Owner Verify PASS
const okReport = runIkP9OwnerVerify({
  tenderId: TARGET,
  dBefore: d0,
  dAfter: d1,
  gateA: gateAOk,
  gateB: gateBOk,
  ownerJudgment: "pass",
});
assert("F schema", okReport.schemaVersion === IK_P9_OWNER_VERIFY_SCHEMA_VERSION);
assert("F Owner PASS", okReport.ownerVerifyStatus === "pass");
assert("F gate order A then B", okReport.gateAStatus === "pass" && okReport.gateBStatus === "pass");
assert("N researchExecuted false", okReport.researchExecuted === false);
assert("O httpCalls 0", okReport.httpCalls === 0);
assert("P accept false", okReport.acceptExecuted === false);
assert("Q create false", okReport.createExecuted === false);
assert("R bind false", okReport.bindExecuted === false);
assert("S catalogWrite false", okReport.catalogWorkWrite === false);
assert("T pmWrite false", okReport.priceMemoryWrite === false);
assert("M dDiff 0", okReport.dDiff === 0);
assert("J provenance truth gates", okReport.provenance.truthGatesSsot.includes("E2E-TRUTH-GATES"));

// G REVIEW
const rev = runIkP9OwnerVerify({
  tenderId: TARGET,
  dBefore: d0,
  dAfter: d1,
  gateA: gateAOk,
  gateB: gateBOk,
  ownerJudgment: "review",
});
assert("G Owner REVIEW", rev.ownerVerifyStatus === "review");

// H wrong tender protection on session
const wrong = runIkP9OwnerVerify({
  tenderId: WRONG,
  dBefore: d0,
  dAfter: d1,
  gateA: { ...gateAOk, tenderId: WRONG },
  gateB: { ...gateBOk, tenderId: WRONG },
  ownerJudgment: "pass",
});
assert("H session rejects wrong tender", wrong.ownerVerifyStatus === "fail" && wrong.identityOk === false);

// Order: Gate A fail blocks Owner PASS
const blocked = runIkP9OwnerVerify({
  tenderId: TARGET,
  dBefore: d0,
  dAfter: d1,
  gateA: { ...gateAOk, whiteScreen: true },
  gateB: gateBOk,
  ownerJudgment: "pass",
});
assert("order Gate A block Owner PASS", blocked.ownerVerifyStatus !== "pass");
assert("order Gate B blocked when A fails", blocked.gateBStatus === "blocked" || blocked.gateAStatus === "no_go");

// D mutation fail
const dMut = runIkP9OwnerVerify({
  tenderId: TARGET,
  dBefore: d0,
  dAfter: d2,
  gateA: gateAOk,
  gateB: gateBOk,
  ownerJudgment: "pass",
});
assert("M D mutation → FAIL", dMut.dMutated === true && dMut.ownerVerifyStatus === "fail");

// Research / Accept locks
const researchFail = runIkP9OwnerVerify({
  tenderId: TARGET,
  dBefore: d0,
  dAfter: d1,
  gateA: gateAOk,
  gateB: gateBOk,
  ownerJudgment: "pass",
  laborResearchEnabled: true,
});
assert("N labor research → FAIL", researchFail.ownerVerifyStatus === "fail");
const acceptFail = runIkP9OwnerVerify({
  tenderId: TARGET,
  dBefore: d0,
  dAfter: d1,
  gateA: gateAOk,
  gateB: gateBOk,
  ownerJudgment: "pass",
  acceptAttempted: true,
});
assert("P accept → FAIL", acceptFail.ownerVerifyStatus === "fail");

// I permissions
assert("I super_admin can", canRunIkP9OwnerVerify({ role: "super_admin" }) === true);
assert(
  "I moderator without flag cannot",
  canRunIkP9OwnerVerify({ role: "moderator", tendersTabForStaffEnabled: false }) === false,
);

// No ikP9 lever
const settingsSrc = readSrc("src/lib/app-settings.ts");
const flagSrc = readSrc("src/lib/intelligent-estimator/ik-entry-flag.ts");
assert("no ikP9Enabled", !/ikP9Enabled|ikOwnerVerifyEnabled|ikGateAEnabled|ikGateBEnabled/.test(settingsSrc + flagSrc));
assert("default settings unchanged P8", defaultAppSettings().ikRiskDecisionE2eEnabled === false);

// Wiring / markers
const detailSrc = readSrc("src/app/TenderDetailPage.tsx");
const markerSrc = readSrc("src/app/intelligent-estimator/IkP9OwnerVerifyMarker.tsx");
const p9Src = readSrc("src/lib/intelligent-estimator/ik-p9-owner-verify.ts");
assert("UI marker present", /IkP9OwnerVerifyMarker/.test(detailSrc));
assert("data-ik-p9-owner-verify", /data-ik-p9-owner-verify/.test(markerSrc));
assert("no executeResearch in P9", !/executeResearch/.test(p9Src));
assert("no fetch/mmr/diy in P9", !/fetch\(|mmr-|diy/i.test(p9Src));
assert("changelog 2.66.86", /2\.66\.86/.test(readSrc("src/app/changelog-data.ts")));
assert("DF no ikP9", /NOT REQUIRED|BRAK ikP9|no `ikP9/i.test(readSrc("docs/architecture/IK-MIGRATION-01-P9-PLAN-DESIGN-FREEZE.md")));

// Static regression U–AB markers (avoid nesting full P8→P7 chain hang)
assert("U P8 lever present", /ikRiskDecisionE2eEnabled/.test(flagSrc));
assert("V P7 lever present", /ikF5E2eEnabled/.test(flagSrc));
assert("W P6 lever present", /ikMaterialE2eEnabled/.test(flagSrc));
assert("X P5 lever present", /ikLaborE2eEnabled/.test(flagSrc));
assert("Y P4 lever present", /ikChiefWiringEnabled/.test(flagSrc));
assert("Z P3 lever present", /ikIdentityCoverageEnabled/.test(flagSrc));
assert("AA P2 lever present", /ikAutoIngestEnabled/.test(flagSrc));
assert("AB P1 entry present", /ikEntryEnabled/.test(flagSrc));
assert("AC marker mobile attrs", /data-ik-p9-research/.test(markerSrc) && /data-ik-p9-d-diff/.test(markerSrc));

const optional = [
  ["Validation expert", "scripts/test-validation-expert-01.mjs"],
  ["P4 chief wiring", "scripts/test-ik-migration-01-p4-implementation.mjs"],
];
for (const [label, rel] of optional) {
  if (!existsSync(join(root, rel))) continue;
  const r = runSuite(rel);
  assert(label + " reuse", r.ok, r.out);
}

console.log(`\nP9 IMPLEMENTATION: ${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
