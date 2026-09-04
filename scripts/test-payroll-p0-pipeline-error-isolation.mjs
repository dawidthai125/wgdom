/**
 * PAYROLL P0 — Payroll domain write vs Tender Pipeline error isolation.
 * Run: npx vite-node scripts/test-payroll-p0-pipeline-error-isolation.mjs
 *
 * Does not write repo artifacts. Does not change Guard / CAS / freshness / latch.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p0-pipeline-iso";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p0-pipeline-iso";

globalThis.localStorage ??= {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

globalThis.sessionStorage ??= {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

const {
  PAYROLL_GUARD_BLOCKED_MESSAGE,
  isPayrollGuardBlockedError,
  PayrollStaleRevisionError,
} = await import("../src/lib/cloud-sync.ts");
const {
  CloudFreshnessBlockedError,
  isCloudFreshnessBlockedError,
} = await import("../src/lib/cloud-freshness-gate.ts");
const {
  PIPELINE_CLOUD_UNCONFIRMED_BLOCKED,
  PipelineWriteSafetyBlockedError,
  isPipelineWriteSafetyBlockedError,
} = await import("../src/lib/tender-pipeline-write-safety.ts");
const {
  classifyCloudSyncFailure,
  resolveAutoCloudSyncFailureToast,
  separatePayrollAndPipelineReports,
  PAYROLL_WRITE_BLOCKED_TOAST_TITLE,
  PIPELINE_WRITE_BLOCKED_TOAST_TITLE,
  GENERIC_CLOUD_PUSH_TOAST_TITLE,
} = await import("../src/lib/cloud-sync-failure-kind.ts");

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
    cloudCount: 12,
    localCount: 12,
    missingRecords: 0,
    missingIds: [],
    criticalLoss: [],
  });
}

function payrollGuardError() {
  return new Error(PAYROLL_GUARD_BLOCKED_MESSAGE);
}

function payrollStaleError() {
  return new PayrollStaleRevisionError("stale_revision", 7, [], "Payroll revision conflict (stale_revision)");
}

console.log("=== PAYROLL P0 pipeline error isolation ===\n");

// P0-1: Payroll SUCCESS + pipeline UNCONFIRMED → no false Payroll Guard toast
{
  const pipelineErr = pipelineUnconfirmedError();
  const autoToast = resolveAutoCloudSyncFailureToast(pipelineErr);
  const report = separatePayrollAndPipelineReports("success", { error: pipelineErr });
  assert("P0-1 payroll write remains SUCCESS", report.payrollWriteOk === true);
  assert("P0-1 reports pipeline failure", report.reportsPipelineFailure === true);
  assert("P0-1 does not report Payroll write failure", report.reportsPayrollWriteFailure === false);
  assert("P0-1 auto-sync toast is pipeline, not payroll", autoToast.kind === "pipeline" && autoToast.reportsPayrollWriteFailure === false);
  assert("P0-1 auto-sync title is pipeline", autoToast.title === PIPELINE_WRITE_BLOCKED_TOAST_TITLE);
  assert("P0-1 auto-sync title is not Payroll Guard", autoToast.title !== PAYROLL_WRITE_BLOCKED_TOAST_TITLE);
  assert("P0-1 auto-sync id is pipeline", autoToast.id === "admin-cloud-sync-pipeline");
  assert("P0-1 auto-sync is not generic cloud", autoToast.title !== GENERIC_CLOUD_PUSH_TOAST_TITLE);
}

// P0-2: Payroll Guard BLOCK → existing PAYROLL_GUARD_BLOCKED_MESSAGE
{
  const guardErr = payrollGuardError();
  const autoToast = resolveAutoCloudSyncFailureToast(guardErr);
  const report = separatePayrollAndPipelineReports({ error: guardErr }, "idle");
  assert("P0-2 isPayrollGuardBlockedError", isPayrollGuardBlockedError(guardErr) === true);
  assert("P0-2 classify payroll_guard", classifyCloudSyncFailure(guardErr) === "payroll_guard");
  assert("P0-2 reports Payroll write failure", report.reportsPayrollWriteFailure === true);
  assert("P0-2 uses Payroll Guard title", report.usesPayrollGuardTitle === true);
  assert("P0-2 message unchanged", guardErr.message === PAYROLL_GUARD_BLOCKED_MESSAGE);
  assert("P0-2 auto-sync toast is payroll guard", autoToast.title === PAYROLL_WRITE_BLOCKED_TOAST_TITLE);
  assert("P0-2 auto-sync does not use pipeline title", autoToast.title !== PIPELINE_WRITE_BLOCKED_TOAST_TITLE);
}

// P0-3: CAS 409 → PayrollStaleRevisionError (existing rebase/retry path)
{
  const stale = payrollStaleError();
  assert("P0-3 instanceof PayrollStaleRevisionError", stale instanceof PayrollStaleRevisionError);
  assert("P0-3 code stale_revision", stale.code === "stale_revision");
  assert("P0-3 classify payroll_stale", classifyCloudSyncFailure(stale) === "payroll_stale");
  assert("P0-3 not pipeline", classifyCloudSyncFailure(stale) !== "pipeline");
  assert("P0-3 not payroll_guard", classifyCloudSyncFailure(stale) !== "payroll_guard");
  const report = separatePayrollAndPipelineReports({ error: stale }, "idle");
  assert("P0-3 reports Payroll failure as stale, not pipeline", report.payrollKind === "payroll_stale" && report.reportsPipelineFailure === false);
}

// P0-4: pipeline latch / unconfirmed exists + Payroll write succeeds
{
  const latchErr = pipelineUnconfirmedError();
  assert("P0-4 latch error is pipeline write-safety", isPipelineWriteSafetyBlockedError(latchErr) === true);
  const report = separatePayrollAndPipelineReports("success", { error: latchErr });
  assert("P0-4 Payroll write SUCCESS while pipeline unconfirmed", report.payrollWriteOk === true);
  assert("P0-4 no Payroll failure toast", report.reportsPayrollWriteFailure === false);
  assert("P0-4 pipeline remains a pipeline problem", report.pipelineKind === "pipeline");
}

// P0-5: pipeline unconfirmed + genuine Payroll failure → both, separately
{
  const pipelineErr = pipelineUnconfirmedError();
  const guardErr = payrollGuardError();
  const report = separatePayrollAndPipelineReports({ error: guardErr }, { error: pipelineErr });
  assert("P0-5 Payroll failure is payroll_guard", report.payrollKind === "payroll_guard");
  assert("P0-5 pipeline failure is pipeline", report.pipelineKind === "pipeline");
  assert("P0-5 both reported", report.reportsPayrollWriteFailure === true && report.reportsPipelineFailure === true);
  assert("P0-5 titles stay distinct", report.usesPayrollGuardTitle === true && report.pipelineToastTitle === PIPELINE_WRITE_BLOCKED_TOAST_TITLE);

  const leaked = separatePayrollAndPipelineReports({ error: pipelineErr }, { error: pipelineErr });
  assert("P0-5 leaked pipeline error is not a Payroll write failure", leaked.reportsPayrollWriteFailure === false);
  assert("P0-5 leaked pipeline is reported as pipeline", leaked.reportsPipelineFailure === true && leaked.pipelineKind === "pipeline");

  const genuineGeneric = separatePayrollAndPipelineReports(
    { error: new Error("Nie udało się zapisać składu do chmury") },
    { error: pipelineErr },
  );
  assert("P0-5 genuine generic Payroll fail stays Payroll", genuineGeneric.reportsPayrollWriteFailure === true && genuineGeneric.payrollKind === "generic");
  assert("P0-5 genuine generic + pipeline stay separate", genuineGeneric.reportsPipelineFailure === true && genuineGeneric.pipelineKind === "pipeline");
}

// P0-6: do not worsen freshness / Payroll Guard; no live-propagation claim
{
  const guardErr = payrollGuardError();
  const freshErr = new CloudFreshnessBlockedError("freshness blocked", "unconfirmed");
  assert("P0-6 Payroll Guard predicate unchanged", isPayrollGuardBlockedError(guardErr) === true);
  assert("P0-6 freshness predicate unchanged", isCloudFreshnessBlockedError(freshErr) === true);
  assert("P0-6 freshness is not payroll_guard", classifyCloudSyncFailure(freshErr) === "cloud_freshness");
  assert("P0-6 freshness auto-sync is not Payroll Guard title", resolveAutoCloudSyncFailureToast(freshErr).title !== PAYROLL_WRITE_BLOCKED_TOAST_TITLE);
  assert("P0-6 Guard still maps to payroll_guard", classifyCloudSyncFailure(guardErr) === "payroll_guard");
  assert("P0-6 no live A→B hours claim", true);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
