/**
 * PAYROLL P2.3 — isolate Tender Pipeline write from domain-only auto-sync.
 * Run: npx vite-node scripts/test-payroll-p2-3-pipeline-isolation.mjs
 *
 * Source/unit only. No production mutation. Does not clear live latch.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p23-pipeline-iso";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p23-pipeline-iso";

const memLs = new Map();
const memSs = new Map();
globalThis.localStorage ??= {
  getItem: (k) => (memLs.has(k) ? memLs.get(k) : null),
  setItem: (k, v) => { memLs.set(k, String(v)); },
  removeItem: (k) => { memLs.delete(k); },
  clear: () => { memLs.clear(); },
};
globalThis.sessionStorage ??= {
  getItem: (k) => (memSs.has(k) ? memSs.get(k) : null),
  setItem: (k, v) => { memSs.set(k, String(v)); },
  removeItem: (k) => { memSs.delete(k); },
  clear: () => { memSs.clear(); },
};

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const {
  classifyAutoSyncTriggerOrigin,
  mergeSkipTenderPipelineForAutoSync,
  shouldPushTenderPipelineFromRs,
  resolveAutoSyncSkipTenderPipeline,
  createAutoSyncSkipSession,
  ADMIN_AUTO_SYNC_KEYS,
  PAYROLL_ROSTER_AUTO_SYNC_KEYS,
} = await import("../src/lib/payroll-auto-sync-pipeline.ts");
const {
  classifyCloudSyncFailure,
  resolveAutoCloudSyncFailureToast,
  PIPELINE_WRITE_BLOCKED_TOAST_TITLE,
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
const {
  getTenderPipelinePersistPending,
  scheduleTenderPipelinePersist,
  forcePipelinePersistDebounceForTests,
  setTenderPipelineCloudPushForTests,
  resetTenderPipelinePersistCoalesceForTests,
} = await import("../src/lib/tender-pipeline/tender-pipeline-persist-coalesce.ts");

const appSrc = readFileSync(resolve("src/app/App.tsx"), "utf8");
const helperSrc = readFileSync(resolve("src/lib/payroll-auto-sync-pipeline.ts"), "utf8");
const p22Src = readFileSync(resolve("src/lib/payroll-pending-add-intent.ts"), "utf8");
const mergeSrc = readFileSync(resolve("src/lib/payroll-week-employee-record-merge.ts"), "utf8");
const p0Src = readFileSync(resolve("src/lib/cloud-sync-failure-kind.ts"), "utf8");
const p1Src = readFileSync(resolve("src/lib/payroll-visible-freshness-pull.ts"), "utf8");

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

function domainOnlySkip(extra = {}) {
  const origin = classifyAutoSyncTriggerOrigin({
    payrollRosterChanged: false,
    adminChanged: true,
    pipelineChanged: false,
    ...extra,
  });
  const scheduledSkip = mergeSkipTenderPipelineForAutoSync(null, origin);
  const skip = resolveAutoSyncSkipTenderPipeline({
    scheduledSkip,
    pipelinePersistPending: false,
  });
  return { origin, skip, willPush: shouldPushTenderPipelineFromRs({ skipTenderPipeline: skip }) };
}

console.log("=== PAYROLL P2.3 isolate domain auto-sync from Pipeline write ===\n");

assert(
  "P2.3-wiring-app-uses-persist-pending",
  appSrc.includes("getTenderPipelinePersistPending")
    && appSrc.includes("resolveAutoSyncSkipTenderPipeline")
    && appSrc.includes("pipelineChanged:"),
);
assert(
  "P2.3-helper-admin-does-not-unskip",
  /if \(origin === "tender_pipeline"\) return false;/.test(helperSrc)
    && /if \(currentSkip === null\) return true;/.test(helperSrc)
    && !/if \(origin === "admin"\) return false;/.test(helperSrc),
);
assert(
  "P2.3-helper-does-not-touch-latch",
  !helperSrc.includes("markPipelineCloudUnconfirmed")
    && !helperSrc.includes("clearPipelineCloudUnconfirmed")
    && !helperSrc.includes("wg-pipeline-cloud-unconfirmed"),
);
assert(
  "P2.3-app-does-not-mark-or-clear-latch",
  !appSrc.includes("markPipelineCloudUnconfirmed")
    && !appSrc.includes("clearPipelineCloudUnconfirmed"),
);

const notes = domainOnlySkip();
assert("P2.3-1-notes-origin-admin", notes.origin === "admin");
assert("P2.3-1-notes-no-pipeline-push", notes.willPush === false);
assert("P2.3-1-notes-key-is-admin", ADMIN_AUTO_SYNC_KEYS.includes("operationalNotes"));

const directory = domainOnlySkip();
assert("P2.3-2-directory-no-pipeline-push", directory.willPush === false);
assert("P2.3-2-directory-key-is-admin", ADMIN_AUTO_SYNC_KEYS.includes("directory"));

const leaves = domainOnlySkip();
assert("P2.3-3-leaves-no-pipeline-push", leaves.willPush === false);
assert("P2.3-3-leaves-key-is-admin", ADMIN_AUTO_SYNC_KEYS.includes("employeeLeaves"));

const contacts = domainOnlySkip();
assert("P2.3-4-contacts-no-pipeline-push", contacts.willPush === false);
assert("P2.3-4-contacts-key-is-admin", ADMIN_AUTO_SYNC_KEYS.includes("contacts"));

const jobs = domainOnlySkip();
assert("P2.3-5-jobs-no-pipeline-push", jobs.willPush === false);
assert("P2.3-5-jobs-key-is-admin", ADMIN_AUTO_SYNC_KEYS.includes("jobs"));

assert(
  "P2.3-6-wm-print-keys-are-admin",
  ADMIN_AUTO_SYNC_KEYS.includes("wmPrintTemplates")
    && ADMIN_AUTO_SYNC_KEYS.includes("wmPrintJobDocs")
    && ADMIN_AUTO_SYNC_KEYS.includes("wmPrintSettings"),
);
assert("P2.3-6-wm-print-no-pipeline-push", domainOnlySkip().willPush === false);

assert(
  "P2.3-7-measurements-keys-are-admin",
  ADMIN_AUTO_SYNC_KEYS.includes("electricalMeasurements")
    && ADMIN_AUTO_SYNC_KEYS.includes("electricalSchematics"),
);
assert("P2.3-7-measurements-no-pipeline-push", domainOnlySkip().willPush === false);

const hoursOrigin = classifyAutoSyncTriggerOrigin({
  payrollRosterChanged: true,
  adminChanged: false,
  pipelineChanged: false,
});
const hoursSkip = resolveAutoSyncSkipTenderPipeline({
  scheduledSkip: mergeSkipTenderPipelineForAutoSync(null, hoursOrigin),
  pipelinePersistPending: false,
});
assert("P2.3-8-hours-origin-roster", hoursOrigin === "payroll_roster");
assert(
  "P2.3-8-hours-no-pipeline-push",
  shouldPushTenderPipelineFromRs({ skipTenderPipeline: hoursSkip }) === false,
);
assert("P2.3-8-hours-key-is-roster", PAYROLL_ROSTER_AUTO_SYNC_KEYS.includes("weekEmployees"));

const realPipe = classifyAutoSyncTriggerOrigin({
  payrollRosterChanged: false,
  adminChanged: false,
  pipelineChanged: true,
});
const realSkip = resolveAutoSyncSkipTenderPipeline({
  scheduledSkip: mergeSkipTenderPipelineForAutoSync(null, realPipe),
  pipelinePersistPending: true,
});
assert("P2.3-9-real-pipeline-origin", realPipe === "tender_pipeline");
assert(
  "P2.3-9-real-pipeline-push-occurs",
  shouldPushTenderPipelineFromRs({ skipTenderPipeline: realSkip }) === true,
);

const adminPlusPipe = classifyAutoSyncTriggerOrigin({
  payrollRosterChanged: false,
  adminChanged: true,
  pipelineChanged: true,
});
const adminPlusSkip = resolveAutoSyncSkipTenderPipeline({
  scheduledSkip: mergeSkipTenderPipelineForAutoSync(
    mergeSkipTenderPipelineForAutoSync(null, "admin"),
    adminPlusPipe,
  ),
  pipelinePersistPending: true,
});
assert("P2.3-10-admin-plus-pipeline-origin", adminPlusPipe === "tender_pipeline");
assert(
  "P2.3-10-admin-plus-pipeline-push-occurs",
  shouldPushTenderPipelineFromRs({ skipTenderPipeline: adminPlusSkip }) === true,
);

clearPipelineCloudUnconfirmed();
markPipelineCloudUnconfirmed("p23-domain-only-existing-latch");
const domainWithLatch = domainOnlySkip();
assert("P2.3-11-latch-still-set", isPipelineCloudWriteUnconfirmed() === true);
assert("P2.3-11-domain-only-no-pipeline-push", domainWithLatch.willPush === false);
assert(
  "P2.3-11-no-pipeline-toast-when-pipeline-not-in-op",
  domainWithLatch.willPush === false,
);
clearPipelineCloudUnconfirmed();

markPipelineCloudUnconfirmed("p23-real-pipeline-existing-latch");
const realWithLatchSkip = resolveAutoSyncSkipTenderPipeline({
  scheduledSkip: mergeSkipTenderPipelineForAutoSync(null, "tender_pipeline"),
  pipelinePersistPending: true,
});
const latchErr = pipelineUnconfirmedError();
assert("P2.3-12-real-pipeline-still-attempts-push", realWithLatchSkip === false);
assert("P2.3-12-latch-not-auto-cleared", isPipelineCloudWriteUnconfirmed() === true);
assert(
  "P2.3-12-existing-pipeline-block-remains",
  classifyCloudSyncFailure(latchErr) === "pipeline"
    && resolveAutoCloudSyncFailureToast(latchErr).title === PIPELINE_WRITE_BLOCKED_TOAST_TITLE
    && resolveAutoCloudSyncFailureToast(latchErr).id === "admin-cloud-sync-pipeline",
);
clearPipelineCloudUnconfirmed();

assert(
  "P2.3-13-p0-classifier-unchanged",
  classifyCloudSyncFailure(pipelineUnconfirmedError()) === "pipeline"
    && /export function resolveAutoCloudSyncFailureToast/.test(p0Src)
    && /export function separatePayrollAndPipelineReports/.test(p0Src),
);

assert(
  "P2.3-14-p1-api-unchanged",
  typeof decidePayrollVisibleFreshnessPull === "function"
    && PAYROLL_VISIBLE_FRESHNESS_VIEW === "payroll"
    && !p1Src.includes("pushTenderPipelineToCloud")
    && !p1Src.includes("skipTenderPipeline"),
);

assert(
  "P2.3-15-p22-pending-add-exports-remain",
  p22Src.includes("export function rememberPayrollPendingAdds")
    && p22Src.includes("export function ackPayrollPendingAddsInRoster")
    && p22Src.includes("export function revokePayrollPendingAdd"),
);

assert(
  "P2.3-16-payout-picker-export-remains",
  mergeSrc.includes("export function pickPayrollEarlyPayoutsForMerge"),
);

{
  forcePipelinePersistDebounceForTests(true);
  setTenderPipelineCloudPushForTests(async () => {});
  scheduleTenderPipelinePersist([{ id: "p23-pending" }], { force: true });
  assert("P2.3-pending-signal-reused", getTenderPipelinePersistPending() === true);
  assert(
    "P2.3-pending-overrides-domain-skip",
    resolveAutoSyncSkipTenderPipeline({
      scheduledSkip: true,
      pipelinePersistPending: getTenderPipelinePersistPending(),
    }) === false,
  );
  resetTenderPipelinePersistCoalesceForTests();
  assert("P2.3-pending-reset-clears-signal", getTenderPipelinePersistPending() === false);
}

{
  const session = createAutoSyncSkipSession();
  session.schedule("admin");
  assert("P2.3-session-admin-skip-true", session.consume() === true);
  session.schedule("tender_pipeline");
  assert("P2.3-session-pipeline-skip-false", session.consume() === false);
  session.schedule("payroll_roster");
  session.schedule("tender_pipeline");
  assert("P2.3-session-roster-then-pipeline-skip-false", session.consume() === false);
}

assert(
  "P2.3-late-pending-during-domain-debounce",
  resolveAutoSyncSkipTenderPipeline({
    scheduledSkip: true,
    pipelinePersistPending: true,
  }) === false,
);
assert(
  "P2.3-no-pending-keeps-domain-skip",
  resolveAutoSyncSkipTenderPipeline({
    scheduledSkip: true,
    pipelinePersistPending: false,
  }) === true,
);

if (fail > 0) {
  console.log(`\nP2.3 RESULT: FAIL (${pass} pass / ${fail} fail)`);
  process.exit(1);
}
console.log(`\nP2.3 RESULT: PASS (${pass} pass / 0 fail)`);
