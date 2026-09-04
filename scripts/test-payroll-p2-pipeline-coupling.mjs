/**
 * PAYROLL P2 — cut Payroll mutation → Tender Pipeline write coupling.
 * Run: npx vite-node scripts/test-payroll-p2-pipeline-coupling.mjs
 *
 * Source/unit only. No production mutation.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p2-pipeline-cut";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p2-pipeline-cut";

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const {
  classifyAutoSyncTriggerOrigin,
  mergeSkipTenderPipelineForAutoSync,
  shouldPushTenderPipelineFromRs,
  createAutoSyncSkipSession,
  PAYROLL_ROSTER_AUTO_SYNC_KEYS,
  ADMIN_AUTO_SYNC_KEYS,
} = await import("../src/lib/payroll-auto-sync-pipeline.ts");
const {
  classifyCloudSyncFailure,
  resolveAutoCloudSyncFailureToast,
} = await import("../src/lib/cloud-sync-failure-kind.ts");
const {
  PIPELINE_CLOUD_UNCONFIRMED_BLOCKED,
  PipelineWriteSafetyBlockedError,
} = await import("../src/lib/tender-pipeline-write-safety.ts");
const {
  isPipelineCloudWriteUnconfirmed,
  markPipelineCloudUnconfirmed,
  clearPipelineCloudUnconfirmed,
} = await import("../src/lib/tender-pipeline/tender-pipeline-cloud-unconfirmed.ts");
const {
  decidePayrollVisibleFreshnessPull,
  PAYROLL_VISIBLE_FRESHNESS_VIEW,
} = await import("../src/lib/payroll-visible-freshness-pull.ts");

const appSrc = readFileSync(resolve("src/app/App.tsx"), "utf8");
const cloudSyncSrc = readFileSync(resolve("src/lib/cloud-sync.ts"), "utf8");
const p1Src = readFileSync(resolve("src/lib/payroll-visible-freshness-pull.ts"), "utf8");
const helperSrc = readFileSync(resolve("src/lib/payroll-auto-sync-pipeline.ts"), "utf8");
const pwrSrc = readFileSync(resolve("src/lib/payroll-week-roster-bundle.ts"), "utf8");

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

function pipelineUnconfirmedError() {
  return new PipelineWriteSafetyBlockedError({
    allowed: false,
    code: PIPELINE_CLOUD_UNCONFIRMED_BLOCKED,
    cloudCount: 0,
    localCount: 0,
    missingRecords: 0,
    missingIds: [],
    criticalLoss: [],
  });
}

console.log("=== PAYROLL P2 cut payroll → pipeline coupling ===\n");

assert(
  "P2-keys-roster-includes-weekEmployees-savedWeeks",
  PAYROLL_ROSTER_AUTO_SYNC_KEYS.includes("weekEmployees")
    && PAYROLL_ROSTER_AUTO_SYNC_KEYS.includes("savedWeeks"),
);
assert(
  "P2-keys-admin-includes-jobs-directory",
  ADMIN_AUTO_SYNC_KEYS.includes("jobs") && ADMIN_AUTO_SYNC_KEYS.includes("directory"),
);
assert(
  "P2-keys-no-overlap",
  PAYROLL_ROSTER_AUTO_SYNC_KEYS.every((k) => !ADMIN_AUTO_SYNC_KEYS.includes(k)),
);

assert(
  "P2-1-edit-hours-origin-is-payroll-roster",
  classifyAutoSyncTriggerOrigin({ payrollRosterChanged: true, adminChanged: false }) === "payroll_roster",
);
assert(
  "P2-1-edit-hours-skip-pipeline-write",
  shouldPushTenderPipelineFromRs({
    skipTenderPipeline: mergeSkipTenderPipelineForAutoSync(null, "payroll_roster"),
  }) === false,
);

assert(
  "P2-2-add-employee-same-roster-origin",
  classifyAutoSyncTriggerOrigin({ payrollRosterChanged: true, adminChanged: false }) === "payroll_roster",
);
assert(
  "P2-3-add-hours-after-create-skip-pipeline",
  shouldPushTenderPipelineFromRs({
    skipTenderPipeline: mergeSkipTenderPipelineForAutoSync(
      mergeSkipTenderPipelineForAutoSync(null, "payroll_roster"),
      "payroll_roster",
    ),
  }) === false,
);

assert(
  "P2-4-pwrPush-export-present",
  /export async function pwrPush/.test(pwrSrc),
);
assert(
  "P2-4-addFromDirectory-still-calls-pwrPush",
  /addFromDirectory[\s\S]{0,2500}void pwrPush\(/.test(appSrc),
);
assert(
  "P2-4-persistPayrollRoster-still-calls-pwrPush",
  /const persistPayrollRoster[\s\S]{0,800}void pwrPush\(/.test(appSrc),
);

assert(
  "P2-5-app-does-not-mark-pipeline-latch",
  !appSrc.includes("markPipelineCloudUnconfirmed"),
);
assert(
  "P2-5-app-does-not-clear-pipeline-latch",
  !appSrc.includes("clearPipelineCloudUnconfirmed"),
);
assert(
  "P2-5-helper-does-not-touch-latch",
  !helperSrc.includes("markPipelineCloudUnconfirmed")
    && !helperSrc.includes("clearPipelineCloudUnconfirmed")
    && !helperSrc.includes("wg-pipeline-cloud-unconfirmed"),
);

clearPipelineCloudUnconfirmed();
assert("P2-6-latch-off-before-mark", isPipelineCloudWriteUnconfirmed() === false);
markPipelineCloudUnconfirmed("p2-test-genuine-pipeline");
assert("P2-6-latch-still-sets-for-pipeline", isPipelineCloudWriteUnconfirmed() === true);
const latchErr = pipelineUnconfirmedError();
assert(
  "P2-6-unconfirmed-error-still-classified-pipeline",
  classifyCloudSyncFailure(latchErr) === "pipeline"
    && resolveAutoCloudSyncFailureToast(latchErr).id === "admin-cloud-sync-pipeline",
);
clearPipelineCloudUnconfirmed();
assert("P2-6-latch-clear-still-works-for-pipeline", isPipelineCloudWriteUnconfirmed() === false);

assert(
  "P2-7-admin-origin-allows-pipeline",
  classifyAutoSyncTriggerOrigin({ payrollRosterChanged: false, adminChanged: true }) === "admin"
    && shouldPushTenderPipelineFromRs({
      skipTenderPipeline: mergeSkipTenderPipelineForAutoSync(null, "admin"),
    }) === true,
);
assert(
  "P2-7-admin-wins-over-prior-payroll-skip",
  shouldPushTenderPipelineFromRs({
    skipTenderPipeline: mergeSkipTenderPipelineForAutoSync(
      mergeSkipTenderPipelineForAutoSync(null, "payroll_roster"),
      "admin",
    ),
  }) === true,
);
assert(
  "P2-7-mixed-same-tick-is-admin",
  classifyAutoSyncTriggerOrigin({ payrollRosterChanged: true, adminChanged: true }) === "admin",
);

assert(
  "P2-8-p1-helper-unchanged-api",
  typeof decidePayrollVisibleFreshnessPull === "function"
    && PAYROLL_VISIBLE_FRESHNESS_VIEW === "payroll"
    && !p1Src.includes("pushTenderPipelineToCloud")
    && !p1Src.includes("skipTenderPipeline")
    && /export function decidePayrollVisibleFreshnessPull/.test(p1Src),
);
assert(
  "P2-8-p1-file-not-imported-by-p2-helper",
  !helperSrc.includes("payroll-visible-freshness-pull"),
);
assert(
  "P2-8-app-p1-effect-still-present",
  appSrc.includes("decidePayrollVisibleFreshnessPull")
    && appSrc.includes("executeCloudFreshnessPull({ bypassThrottle: false })"),
);

assert(
  "P2-wiring-app-classifies-origin",
  appSrc.includes("classifyAutoSyncTriggerOrigin")
    && appSrc.includes("createAutoSyncSkipSession")
    && appSrc.includes("skipTenderPipeline"),
);
assert(
  "P2-wiring-addFromDirectory-is-roster-write",
  appSrc.includes('withPayrollWeekEmployeesWriteSource("addFromDirectory"'),
);
assert(
  "P2-wiring-updateWeekEmployeeDay-is-roster-write",
  appSrc.includes('withPayrollWeekEmployeesWriteSource("updateWeekEmployeeDay"'),
);
assert(
  "P2-wiring-cloud-sync-honors-skip",
  /opts\?\.skipTenderPipeline === true/.test(cloudSyncSrc)
    && /pipelineForCanonical = undefined/.test(cloudSyncSrc),
);
assert(
  "P2-wiring-auto-sync-cannot-reach-pipeline-when-payroll-only",
  shouldPushTenderPipelineFromRs({ skipTenderPipeline: true }) === false,
);
assert(
  "P2-default-rs-push-still-allows-pipeline",
  shouldPushTenderPipelineFromRs() === true
    && shouldPushTenderPipelineFromRs({}) === true,
);

/**
 * App-like lifecycle: skip is attached only when a schedule actually lands,
 * discarded on cancel / hidden / pull abort, consumed once on execute.
 */
function createP21Lifecycle() {
  const session = createAutoSyncSkipSession();
  let scheduled = false;
  const fired = [];

  return {
    schedule(origin, { actuallySchedule = true } = {}) {
      if (!actuallySchedule) return;
      session.schedule(origin);
      scheduled = true;
    },
    clearAutoSyncTimers() {
      scheduled = false;
      session.cancel();
    },
    hiddenAbort() {
      if (!scheduled) return;
      scheduled = false;
      session.cancel();
    },
    pullAbort() {
      if (!scheduled) return;
      scheduled = false;
      session.cancel();
    },
    execute() {
      if (!scheduled) {
        fired.push(session.consume());
        return fired[fired.length - 1];
      }
      scheduled = false;
      const skip = session.consume();
      fired.push(skip);
      return skip;
    },
    peek: () => session.peek(),
    fired: () => fired.slice(),
  };
}

console.log("\n=== PAYROLL P2.1 skip lifecycle (runtime, not grep) ===\n");

{
  const h = createP21Lifecycle();
  h.schedule("payroll_roster");
  assert("P2.1-1-payroll-schedule-fires-skip-true", h.execute() === true);
  assert("P2.1-1-no-residual-after-fire", h.peek() === null);
}

{
  const h = createP21Lifecycle();
  h.schedule("payroll_roster");
  h.clearAutoSyncTimers();
  h.schedule(undefined);
  assert("P2.1-2-cancelled-then-unscoped-skip-false", h.execute() === false);
  assert("P2.1-2-no-residual", h.peek() === null);
}

{
  const h = createP21Lifecycle();
  h.schedule("payroll_roster");
  h.clearAutoSyncTimers();
  assert("P2.1-3-clearAutoSyncTimers-discards-skip", h.peek() === null);
  h.schedule(undefined);
  assert("P2.1-3-later-unscoped-skip-false", h.execute() === false);
}

{
  const h = createP21Lifecycle();
  h.schedule("payroll_roster");
  h.hiddenAbort();
  assert("P2.1-4-hidden-abort-discards-skip", h.peek() === null);
  h.schedule(undefined);
  assert("P2.1-4-later-unscoped-skip-false", h.execute() === false);
}

{
  const h = createP21Lifecycle();
  h.schedule("payroll_roster");
  h.schedule("admin");
  assert("P2.1-5-payroll-then-admin-wins-skip-false", h.execute() === false);
}

{
  const h = createP21Lifecycle();
  h.schedule("admin");
  h.schedule("payroll_roster");
  assert(
    "P2.1-6-admin-then-payroll-admin-sticky-skip-false",
    h.execute() === false,
    "admin-sticky: payroll must not re-enable skip in the same window",
  );
}

{
  const h = createP21Lifecycle();
  h.schedule("payroll_roster");
  assert("P2.1-7-first-payroll-consumes-skip", h.execute() === true);
  h.schedule("admin");
  assert("P2.1-7-later-admin-skip-false", h.execute() === false);
}

{
  const h = createP21Lifecycle();
  h.schedule("payroll_roster");
  assert("P2.1-8-first-payroll-skip-true", h.execute() === true);
  h.schedule("payroll_roster");
  assert("P2.1-8-second-payroll-own-skip-true", h.execute() === true);
  assert("P2.1-8-no-residual-after-second", h.peek() === null);
  h.schedule(undefined);
  assert("P2.1-8-later-unscoped-no-stale-skip", h.execute() === false);
}

{
  const h = createP21Lifecycle();
  h.schedule("payroll_roster", { actuallySchedule: false });
  assert("P2.1-early-return-does-not-attach-skip", h.peek() === null);
  h.schedule(undefined);
  assert("P2.1-early-return-later-unscoped-skip-false", h.execute() === false);
}

{
  const h = createP21Lifecycle();
  h.schedule("payroll_roster");
  h.pullAbort();
  h.schedule(undefined);
  assert("P2.1-pull-abort-later-unscoped-skip-false", h.execute() === false);
}

assert(
  "P2.1-app-no-orphan-pendingSkip-ref",
  !appSrc.includes("pendingSkipTenderPipelineRef"),
);
assert(
  "P2.1-clearAutoSyncTimers-cancels-session",
  /const clearAutoSyncTimers = useCallback\(\(\) => \{[\s\S]*?autoSyncSkipSessionRef\.current\.cancel\(\);[\s\S]*?\}, \[\]\)/.test(appSrc),
);
assert(
  "P2.1-hidden-debounce-abort-cancels-session",
  /if \(!tabVisibleRef\.current\) \{\s*autoSyncSkipSessionRef\.current\.cancel\(\);/.test(appSrc),
);
assert(
  "P2.1-pull-debounce-abort-cancels-session",
  /if \(pullInFlightRef\.current\) \{\s*autoSyncSkipSessionRef\.current\.cancel\(\);/.test(appSrc),
);
assert(
  "P2.1-schedule-does-not-attach-before-gates",
  /const scheduleAutoCloudSync = useCallback\(\(origin\?: AutoSyncTriggerOrigin\) => \{\s*if \(!initialSyncDone\.current\) \{\s*return;/.test(appSrc),
);

if (fail > 0) {
  console.log(`\nP2 RESULT: FAIL (${pass} pass / ${fail} fail)`);
  process.exit(1);
}
console.log(`\nP2 RESULT: PASS (${pass} pass / 0 fail)`);
