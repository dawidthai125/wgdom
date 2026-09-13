/**
 * KL-3 resume — pending diag ≠ FAIL · latch clear on defer.
 * npx vite-node scripts/test-ik-kl3-resume-01.mjs
 */
import {
  buildKnrDownstreamPendingDiag,
  planKnrReanalysisOrchestraInvalidation,
  shouldDeferIkDownstreamUntilKnrKnowledge,
} from "../src/lib/intelligent-estimator/orchestra/ik-knr-reanalysis-seam.ts";
import {
  listIkFullAutonomyLearningRules,
  IK_FULL_AUTONOMY_LEARNING_RULES_VERSION,
} from "../src/lib/intelligent-estimator/knr-knowledge/ik-full-autonomy-learning-rules-v1.ts";

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

const pending = shouldDeferIkDownstreamUntilKnrKnowledge({
  readyForExperts: true,
  knrLineCount: 5,
  knowledgeBusy: true,
  knrKnowledge: null,
});
ok("defer_while_busy", pending === true);

const diag = buildKnrDownstreamPendingDiag({
  readyForExperts: true,
  knrLineCount: 5,
  knowledgeBusy: true,
  knrKnowledge: null,
});
ok("diag_kind", diag.kind === "KNR_DOWNSTREAM_PENDING");
ok("diag_pending", diag.pending === true);
ok("message_not_terminal_fail", /nie FAIL/i.test(diag.messagePl));

const ready = shouldDeferIkDownstreamUntilKnrKnowledge({
  readyForExperts: true,
  knrLineCount: 5,
  knowledgeBusy: false,
  knrKnowledge: { tenderId: "t1", lineResults: [] },
});
ok("resume_when_ready", ready === false);

const plan = planKnrReanalysisOrchestraInvalidation(
  {
    reanalysisRequired: true,
    reanalysisExecuted: true,
    targets: [],
    httpRequestCount: 0,
    stagedPendingCount: 0,
  },
  { downstreamAlreadyDeferred: true },
);
ok("no_identity_bump_when_deferred", plan.bumpIdentityResearchEpoch === false);
ok("labor_bump_once", plan.bumpLaborRecalcEpoch === true);

const rules = listIkFullAutonomyLearningRules();
ok("rules_25", rules.length === 25, rules.length);
ok("rules_version", IK_FULL_AUTONOMY_LEARNING_RULES_VERSION === "v1");
ok("rule_22_global_pv", rules.some((r) => r.id === "RULE_22"));

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
