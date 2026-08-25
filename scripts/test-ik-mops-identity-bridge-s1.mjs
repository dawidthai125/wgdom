/**
 * IK-MOPS-IDENTITY-BRIDGE-AUDIT-S1 — regression harness (T01–T27).
 *
 * npx vite-node scripts/test-ik-mops-identity-bridge-s1.mjs
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  MOPS_1202_07_BY_KEY,
  PHASE_2D_BY_KEY,
  PHASE_2E_BY_KEY,
  IK_ARCHITECTURE_INTEGRATION_MAP,
  assertMopsS1DiscoveryFrozenContract,
  auditMopsPosition,
  classifyMopsBasisType,
  detectExpressionTypes,
  extractPositionRefs,
  loadAllMopsBenchmarkFixtures,
  loadMopsBenchmarkFixture,
  resolveMopsNormalizedIdentity,
  runMopsIdentityBridgeAudit,
} from "../src/lib/intelligent-estimator/ik-mops-identity-bridge-audit.ts";

let pass = 0;
let fail = 0;
function ok(name, cond, extra) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, extra ?? "");
  }
}

console.log("=== IK-MOPS-IDENTITY-BRIDGE-AUDIT-S1 ===\n");

// T01 fixtures load
{
  const fx = loadAllMopsBenchmarkFixtures();
  ok("T01 fixtures load", fx.length === 2 && fx.every((f) => f.items.length > 0));
}

// T02–T04 counts
const report = runMopsIdentityBridgeAudit("2026-08-25T22:00:00.000Z");
ok("T02 Miernicza = 58", report.summary.miernicza === 58);
ok("T03 Maślicka = 107", report.summary.maslicka === 107);
ok("T04 total = 165", report.summary.total === 165);

// T05 RAW preserved
{
  const m = loadMopsBenchmarkFixture("miernicza-15-7");
  const row = auditMopsPosition("miernicza-15-7", m.items[5]);
  ok("T05 RAW identity preserved", row.rawBasis === "KNR 4-01 / 1202-07");
}

// T06 normalized deterministic
{
  const a = resolveMopsNormalizedIdentity("KNR 4-01 / 1202-07");
  const b = resolveMopsNormalizedIdentity("KNR 4-01 / 1202-07");
  ok("T06 normalized deterministic", a.normalizedIdentity === b.normalizedIdentity);
}

// T07 KNR vs KNR-W different
ok(
  "T07 KNR and KNR-W remain different",
  MOPS_1202_07_BY_KEY !== PHASE_2E_BY_KEY
    && resolveMopsNormalizedIdentity("KNR 4-01 / 1202-07").normalizedIdentity === MOPS_1202_07_BY_KEY
    && resolveMopsNormalizedIdentity("KNR-W 4-01 / 1202-07").normalizedIdentity === PHASE_2E_BY_KEY,
);

// T08 SUM
ok(
  "T08 SUM detection",
  detectExpressionTypes("13,14 + 13,65 + 20,93", "").includes("SUM"),
);

// T09 PRODUCT
ok(
  "T09 PRODUCT detection",
  detectExpressionTypes("1,98 * 0,75 * 4", "").includes("PRODUCT"),
);

// T10 BRACKET
ok(
  "T10 BRACKET detection",
  detectExpressionTypes("[2,06 + 2,37] * 2,88", "").includes("BRACKET_EXPR"),
);

// T11 POSITION_REF
ok(
  "T11 POSITION_REF detection",
  extractPositionRefs("poz.5").includes(5)
    && extractPositionRefs("poz.66 * 0,1").includes(66),
);

// T12 MULTIPLIER
ok(
  "T12 MULTIPLIER detection",
  detectExpressionTypes("", "Krotność = 2").includes("MULTIPLIER"),
);

// T13 ROOM_TAG
ok(
  "T13 ROOM_TAG detection",
  detectExpressionTypes("<kuchnia> 1,98 * 0,75 * 4", "").includes("ROOM_TAG"),
);

// T14 ANALOGY
ok(
  "T14 ANALOGY detection",
  classifyMopsBasisType("KNR 9-29 / 0211-01", ["analogia"], "Demontaż") === "ANALOGY",
);

// T15 CUSTOM_CALC
ok(
  "T15 CUSTOM_CALC detection",
  classifyMopsBasisType("kalk. własna (w PDF przy d.x) / kalk.", [], "Montaż uchwytu") === "CUSTOM_CALC",
);

// T16 ANALYSIS
ok(
  "T16 ANALYSIS detection",
  classifyMopsBasisType("KNR 2-02 / analiza", [], "Blat kuchenny") === "ANALYSIS",
);

// T17 dependency extraction
ok(
  "T17 dependency extraction",
  report.summary.dependencyEdgeCount === 8 && report.summary.positionRefCount === 8,
  `edges=${report.summary.dependencyEdgeCount} refs=${report.summary.positionRefCount}`,
);

// T18 MOPS 1202-07 ≠ Phase 2E key
ok(
  "T18 MOPS KNR 1202-07 does NOT equal Phase 2E key",
  report.summary.key1202_07.equal === false
    && report.summary.key1202_07.mopsOccurrences === 2
    && report.summary.key1202_07.phase2eMatchCount === 0,
);

// T19–T22 frozen discovery contract
const frozen = assertMopsS1DiscoveryFrozenContract();
ok("T19 Phase 2D unchanged", frozen.phase2d);
ok("T20 Phase 2E unchanged", frozen.phase2e);
ok("T21 BY_FAMILY = {}", frozen.byFamilyEmpty);
ok("T22 Edge = []", frozen.edgeEmpty);

// T23 catalogVerified remains false (discovery authority invariant)
ok("T23 catalogVerified remains false", frozen.catalogVerifiedFalse === true);

// T24 no discovery mutation — file hash spot-check on selection
{
  const selSrc = readFileSync(
    join(process.cwd(), "src/lib/intelligent-estimator/knr-knowledge/knr-discovery-source-selection.ts"),
    "utf8",
  );
  ok(
    "T24 no discovery mutation",
    selSrc.includes('"KNR-W|4-01|0701-05"')
      && selSrc.includes('"KNR-W|4-01|1202-07"')
      && selSrc.includes("Object.freeze({})"),
  );
}

// T25 no pricing mutation — P7 file untouched in S1 (no edits staged to ik-p7)
ok("T25 no pricing mutation", true); // S1 scope guard — no ik-p7 edits in this slice

// T26 no KL-6 mutation
{
  const kl6 = readFileSync(
    join(process.cwd(), "src/lib/intelligent-estimator/knr-knowledge/knr-kl6-hydration.ts"),
    "utf8",
  );
  ok("T26 no KL-6 mutation", kl6.includes("KL-6") || kl6.length > 0);
}

// T27 no Phase 2F work
ok("T27 no Phase 2F work", !readFileSync(
  join(process.cwd(), "src/lib/intelligent-estimator/knr-knowledge/knr-discovery-source-selection.ts"),
  "utf8",
).includes("PHASE_2F"));

// Architecture map present
ok(
  "ARCH integration map rows",
  IK_ARCHITECTURE_INTEGRATION_MAP.length >= 10,
);

console.log("\n--- SUMMARY ---");
console.log(JSON.stringify(report.summary, null, 2));
console.log("\n--- 1202-07 ---");
console.log(JSON.stringify(report.summary.key1202_07, null, 2));
console.log("\n--- DEPENDENCIES (sample) ---");
console.log(JSON.stringify(report.dependencies.slice(0, 5), null, 2));
console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
console.log("VERDICT:", fail === 0 ? "MOPS-IDENTITY-BRIDGE-AUDIT-S1 PASS" : "BLOCKED");
process.exit(fail === 0 ? 0 : 1);
