/**
 * PAYROLL P1 — visible Payroll freshness-pull isolation.
 * Run: npx vite-node scripts/test-payroll-p1-visible-pull-isolation.mjs
 *
 * Does not write repo artifacts. Does not mutate Guard / CAS / P0.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p1-visible-pull";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p1-visible-pull";

globalThis.localStorage ??= {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { MIN_PULL_INTERVAL_MS } = await import("../src/lib/cloud-sync-throttle.ts");
const {
  decidePayrollVisibleFreshnessPull,
  PAYROLL_VISIBLE_FRESHNESS_VIEW,
} = await import("../src/lib/payroll-visible-freshness-pull.ts");
const {
  classifyCloudSyncFailure,
  resolveAutoCloudSyncFailureToast,
  PAYROLL_WRITE_BLOCKED_TOAST_TITLE,
  PIPELINE_WRITE_BLOCKED_TOAST_TITLE,
} = await import("../src/lib/cloud-sync-failure-kind.ts");
const {
  PIPELINE_CLOUD_UNCONFIRMED_BLOCKED,
  PipelineWriteSafetyBlockedError,
} = await import("../src/lib/tender-pipeline-write-safety.ts");

let pass = 0;
let fail = 0;

function assert(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
  }
}

const idleBase = {
  view: PAYROLL_VISIBLE_FRESHNESS_VIEW,
  hidden: false,
  mutationGuardBlocked: false,
  hasPendingDomainPush: false,
  lastPullAt: 0,
  now: 1_000_000,
};

const appSrc = readFileSync(resolve("src/app/App.tsx"), "utf8");
const p1Marker = "PAYROLL-P1-VISIBLE-FRESHNESS-PULL";
const p1Start = appSrc.indexOf(p1Marker);
const p1Dep = "}, [view, executeCloudFreshnessPull, refreshPayrollFreshnessUx, weekFrom, weekTo]);";
const p1DepLegacy = "}, [view, executeCloudFreshnessPull]);";
const p1EndNew = appSrc.indexOf(p1Dep, p1Start);
const p1EndLegacy = appSrc.indexOf(p1DepLegacy, p1Start);
const p1End = p1EndNew >= 0 ? p1EndNew : p1EndLegacy;
const p1EndLen = p1EndNew >= 0 ? p1Dep.length : p1DepLegacy.length;
const p1Block = p1Start >= 0 && p1End > p1Start
  ? appSrc.slice(p1Start, p1End + p1EndLen)
  : "";

const helperSrc = readFileSync(resolve("src/lib/payroll-visible-freshness-pull.ts"), "utf8");

console.log("=== PAYROLL P1 visible pull isolation ===\n");

{
  const d = decidePayrollVisibleFreshnessPull({ ...idleBase, hidden: true });
  assert("P1-1 hidden skips pull", d.allow === false && d.reason === "hidden");
}

{
  const d = decidePayrollVisibleFreshnessPull({ ...idleBase, mutationGuardBlocked: true });
  assert("P1-2 mutation guard blocked skips pull", d.allow === false && d.reason === "mutation_guard_blocked");
}

{
  const d = decidePayrollVisibleFreshnessPull({ ...idleBase, hasPendingDomainPush: true });
  assert("P1-3 pending domain push skips pull", d.allow === false && d.reason === "pending_domain_push");
}

{
  const d = decidePayrollVisibleFreshnessPull(idleBase);
  assert("P1-4 visible idle pull-due allows executeCloudFreshnessPull", d.allow === true);
  assert("P1-4 interval is existing 15s throttle", MIN_PULL_INTERVAL_MS === 15_000);
  assert("P1-4 App timer uses executeCloudFreshnessPull",
    p1Block.includes("executeCloudFreshnessPull({ bypassThrottle:"));
  assert("P1-4 App immediate entry tick", p1Block.includes('tick("entry")'));
}

{
  const d = decidePayrollVisibleFreshnessPull({
    ...idleBase,
    lastPullAt: idleBase.now - 5_000,
  });
  assert("P1-5 visible but pull not due (throttle)", d.allow === false && d.reason === "throttle");
}

{
  assert("P1-6 timer path found in App.tsx", p1Block.includes(p1Marker) && p1Block.length > 80);
  assert("P1-6 timer path never calls requestCloudFreshnessOnResume",
    !p1Block.includes("requestCloudFreshnessOnResume"));
  assert("P1-6 helper never imports resume", !helperSrc.includes("requestCloudFreshnessOnResume"));
}

{
  assert("P1-7 timer path never calls cancelPayrollDomainPushPreservingSettlement",
    !p1Block.includes("cancelPayrollDomainPushPreservingSettlement"));
  assert("P1-7 helper never cancels pending", !helperSrc.includes("cancelPayrollDomainPush"));
}

{
  assert("P1-8 timer path does not call pwrPush", !p1Block.includes("pwrPush"));
  assert("P1-8 timer path does not call enqueueKwWeekEmployeesWrite",
    !p1Block.includes("enqueueKwWeekEmployeesWrite"));
  assert("P1-8 helper does not push payroll",
    !helperSrc.includes("pwrPush") && !helperSrc.includes("enqueueKwWeekEmployeesWrite")
    && !helperSrc.includes("pushWeekEmployeesToCloud"));
}

{
  const pullFn = appSrc.slice(
    appSrc.indexOf("const executeCloudFreshnessPull"),
    appSrc.indexOf("}, [adminDataBundle, applyAdminDataBundle, buildAdminFreshSnapshot, clearAutoSyncTimers"),
  );
  assert("P1-9 inbound merge still pullAndMergeDataBundle", pullFn.includes("pullAndMergeDataBundle"));
  assert("P1-9 inbound apply still applyAdminDataBundle", pullFn.includes('applyAdminDataBundle(finalBundle, "pullFromCloudAndMerge")'));
  assert("P1-9 helper does not overwrite weekEmployees", !helperSrc.includes("weekEmployees"));
}

{
  const pipelineErr = new PipelineWriteSafetyBlockedError({
    allowed: false,
    code: PIPELINE_CLOUD_UNCONFIRMED_BLOCKED,
    cloudCount: 1,
    localCount: 1,
    missingRecords: 0,
    missingIds: [],
    criticalLoss: [],
  });
  const toast = resolveAutoCloudSyncFailureToast(pipelineErr);
  assert("P1-10 pipeline still classified as pipeline", classifyCloudSyncFailure(pipelineErr) === "pipeline");
  assert("P1-10 pipeline toast is not Payroll Guard", toast.title === PIPELINE_WRITE_BLOCKED_TOAST_TITLE);
  assert("P1-10 pipeline toast is not Zapis listy płac zablokowany", toast.title !== PAYROLL_WRITE_BLOCKED_TOAST_TITLE);
}

{
  const dash = decidePayrollVisibleFreshnessPull({ ...idleBase, view: "dashboard" });
  assert("P1 extra: dashboard view does not arm pull", dash.allow === false && dash.reason === "not_payroll_view");
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
