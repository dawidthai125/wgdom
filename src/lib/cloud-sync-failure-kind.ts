/**
 * PAYROLL P0 — classify cloud-sync failures for user reporting.
 *
 * Payroll domain write and Tender Pipeline sync are independent.
 * This module does not change Guard / CAS / freshness / pipeline latch.
 * It only maps an error to the correct toast surface.
 */

import {
  isPayrollGuardBlockedError,
  PayrollStaleRevisionError,
} from "@/lib/cloud-sync";
import { isCloudFreshnessBlockedError } from "@/lib/cloud-freshness-gate";
import { PAYROLL_HOURS_COLLAPSE_CONFIRM_REQUIRED } from "@/lib/payroll-hours-collapse-gate";
import { isPipelineWriteSafetyBlockedError } from "@/lib/tender-pipeline-write-safety";

export type CloudSyncFailureKind =
  | "payroll_guard"
  | "payroll_stale"
  | "payroll_hours_collapse"
  | "cloud_freshness"
  | "pipeline"
  | "generic";

export const PAYROLL_WRITE_BLOCKED_TOAST_TITLE = "Zapis listy płac zablokowany";
export const PIPELINE_WRITE_BLOCKED_TOAST_TITLE = "Zapis pipeline zablokowany";
export const GENERIC_CLOUD_PUSH_TOAST_TITLE = "Nie udało się wysłać do chmury";
export const CLOUD_FRESHNESS_BLOCKED_TOAST_TITLE = "Zapis wstrzymany — odśwież dane z chmury";

const PIPELINE_TOAST_MESSAGE_MARKERS = [
  "Zapis pipeline zablokowany",
  "PIPELINE_CLOUD_UNCONFIRMED",
  "reconciliation wymagana",
] as const;

export function isPipelineCloudPushNamedError(err: unknown): boolean {
  return err instanceof Error && err.name === "PipelineCloudPushError";
}

export function isPipelineReconciliationMessage(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message;
  return PIPELINE_TOAST_MESSAGE_MARKERS.some((marker) => msg.includes(marker));
}

export function classifyCloudSyncFailure(err: unknown): CloudSyncFailureKind {
  if (isCloudFreshnessBlockedError(err)) return "cloud_freshness";
  if (isPipelineWriteSafetyBlockedError(err) || isPipelineCloudPushNamedError(err)) {
    return "pipeline";
  }
  if (err instanceof PayrollStaleRevisionError) return "payroll_stale";
  if (isPayrollGuardBlockedError(err)) return "payroll_guard";
  if (err instanceof Error && err.message === PAYROLL_HOURS_COLLAPSE_CONFIRM_REQUIRED) {
    return "payroll_hours_collapse";
  }
  if (isPipelineReconciliationMessage(err)) return "pipeline";
  return "generic";
}

export function reportsPayrollWriteFailure(kind: CloudSyncFailureKind): boolean {
  return (
    kind === "payroll_guard"
    || kind === "payroll_stale"
    || kind === "payroll_hours_collapse"
  );
}

export type CloudSyncFailureToastSpec = {
  kind: CloudSyncFailureKind;
  title: string;
  id: string;
  reportsPayrollWriteFailure: boolean;
};

/** Auto full-bundle sync (`runCloudSync`) — never title a pipeline error as Payroll. */
export function resolveAutoCloudSyncFailureToast(err: unknown): CloudSyncFailureToastSpec {
  const kind = classifyCloudSyncFailure(err);
  if (kind === "cloud_freshness") {
    return {
      kind,
      title: CLOUD_FRESHNESS_BLOCKED_TOAST_TITLE,
      id: "admin-cloud-freshness",
      reportsPayrollWriteFailure: false,
    };
  }
  if (kind === "pipeline") {
    return {
      kind,
      title: PIPELINE_WRITE_BLOCKED_TOAST_TITLE,
      id: "admin-cloud-sync-pipeline",
      reportsPayrollWriteFailure: false,
    };
  }
  if (kind === "payroll_guard") {
    return {
      kind,
      title: PAYROLL_WRITE_BLOCKED_TOAST_TITLE,
      id: "admin-cloud-sync-payroll-guard",
      reportsPayrollWriteFailure: true,
    };
  }
  return {
    kind,
    title: GENERIC_CLOUD_PUSH_TOAST_TITLE,
    id: "admin-cloud-sync",
    reportsPayrollWriteFailure: false,
  };
}

export type SyncDomainOutcome = "success" | "idle" | { error: unknown };

export type SeparatedSyncReport = {
  payrollWriteOk: boolean;
  reportsPayrollWriteFailure: boolean;
  reportsPipelineFailure: boolean;
  payrollKind: CloudSyncFailureKind | null;
  pipelineKind: CloudSyncFailureKind | null;
  payrollToastTitle: string | null;
  pipelineToastTitle: string | null;
  usesPayrollGuardTitle: boolean;
};

/**
 * Evaluate Payroll domain write independently from Tender Pipeline sync.
 * A pipeline error never becomes a Payroll write failure.
 */
export function separatePayrollAndPipelineReports(
  payrollWrite: SyncDomainOutcome,
  pipelineSync: SyncDomainOutcome,
): SeparatedSyncReport {
  const payrollKind =
    typeof payrollWrite === "object" ? classifyCloudSyncFailure(payrollWrite.error) : null;
  const pipelineKind =
    typeof pipelineSync === "object" ? classifyCloudSyncFailure(pipelineSync.error) : null;

  const payrollWriteOk = payrollWrite === "success";
  const payrollErrorIsPipeline = payrollKind === "pipeline";
  // Domain-write throw is a Payroll failure unless the thrown error is pipeline.
  const reportsPayroll =
    typeof payrollWrite === "object" && payrollKind != null && !payrollErrorIsPipeline;
  const reportsPipeline =
    pipelineKind === "pipeline"
    || (typeof pipelineSync === "object" && pipelineKind === "pipeline")
    || payrollErrorIsPipeline;

  return {
    payrollWriteOk,
    reportsPayrollWriteFailure: reportsPayroll,
    reportsPipelineFailure: reportsPipeline,
    payrollKind: payrollErrorIsPipeline ? null : payrollKind,
    pipelineKind: payrollErrorIsPipeline ? "pipeline" : pipelineKind,
    payrollToastTitle: reportsPayroll ? PAYROLL_WRITE_BLOCKED_TOAST_TITLE : null,
    pipelineToastTitle: reportsPipeline ? PIPELINE_WRITE_BLOCKED_TOAST_TITLE : null,
    usesPayrollGuardTitle: payrollKind === "payroll_guard" && reportsPayroll,
  };
}
