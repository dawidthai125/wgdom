/**
 * PAYROLL P2 — decide whether generic auto-sync may write Tender Pipeline.
 *
 * Payroll roster mutations persist via pwrPush. They must not call
 * pushTenderPipelineToCloud. Admin / non-roster auto-sync still may.
 * Does not touch Guard, CAS, latch, or P1 pull.
 */

export type AutoSyncTriggerOrigin = "payroll_roster" | "admin";

/** React state that is a Payroll roster / week snapshot — not Pipeline. */
export const PAYROLL_ROSTER_AUTO_SYNC_KEYS = [
  "weekEmployees",
  "savedWeeks",
  "weekFrom",
  "weekTo",
] as const;

/** Remaining auto-sync effect deps — legitimate RS / Pipeline candidates. */
export const ADMIN_AUTO_SYNC_KEYS = [
  "directory",
  "jobs",
  "contacts",
  "employeeLeaves",
  "recoverableCharges",
  "operationalNotes",
  "wmPrintTemplates",
  "wmPrintJobDocs",
  "wmPrintSettings",
  "wmPrintHistory",
  "deliveryPackagePublications",
  "electricalMeasurements",
  "electricalMeasurementRegistry",
  "electricalMeasurementSettings",
  "electricalSchematics",
] as const;

export function classifyAutoSyncTriggerOrigin(input: {
  payrollRosterChanged: boolean;
  adminChanged: boolean;
}): AutoSyncTriggerOrigin | null {
  if (input.adminChanged) return "admin";
  if (input.payrollRosterChanged) return "payroll_roster";
  return null;
}

/**
 * Merge origins inside the auto-sync debounce / guard-hold window.
 *
 * Precedence (explicit, not last-write-wins):
 * - admin always wins → skip=false (Pipeline allowed)
 * - payroll after admin in the same window stays skip=false (admin-sticky)
 * - payroll-only keeps skip=true
 * `currentSkip === null` = no pending scheduled operation yet.
 */
export function mergeSkipTenderPipelineForAutoSync(
  currentSkip: boolean | null,
  origin: AutoSyncTriggerOrigin,
): boolean {
  if (origin === "admin") return false;
  if (currentSkip === null) return true;
  return currentSkip;
}

export type ScheduledAutoSyncSkip = {
  skipTenderPipeline: boolean;
  generation: number;
};

export type AutoSyncSkipSession = {
  /** Attach / merge skip onto the currently scheduled auto-sync. */
  schedule(origin?: AutoSyncTriggerOrigin): ScheduledAutoSyncSkip;
  /** Discard skip with the cancelled / aborted scheduled operation. */
  cancel(): void;
  /** One-shot consume for THIS execution. Residual skip is gone. */
  consume(): boolean;
  peek(): boolean | null;
  generation(): number;
};

/**
 * Pending skip lives only on the current scheduled auto-sync.
 * cancel() / consume() leave nothing for a later unrelated schedule().
 */
export function createAutoSyncSkipSession(): AutoSyncSkipSession {
  let current: ScheduledAutoSyncSkip | null = null;
  let nextGeneration = 0;

  return {
    schedule(origin?: AutoSyncTriggerOrigin): ScheduledAutoSyncSkip {
      if (origin === undefined) {
        if (current) return current;
        nextGeneration += 1;
        current = { skipTenderPipeline: false, generation: nextGeneration };
        return current;
      }
      const merged = mergeSkipTenderPipelineForAutoSync(
        current ? current.skipTenderPipeline : null,
        origin,
      );
      nextGeneration += 1;
      current = { skipTenderPipeline: merged, generation: nextGeneration };
      return current;
    },
    cancel(): void {
      current = null;
    },
    consume(): boolean {
      const skip = current?.skipTenderPipeline === true;
      current = null;
      return skip;
    },
    peek(): boolean | null {
      return current ? current.skipTenderPipeline : null;
    },
    generation(): number {
      return current?.generation ?? 0;
    },
  };
}

export function shouldPushTenderPipelineFromRs(opts?: {
  skipTenderPipeline?: boolean;
}): boolean {
  return opts?.skipTenderPipeline !== true;
}
