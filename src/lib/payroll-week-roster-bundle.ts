/**
 * SYNC-ARCH-01 RC-B-1 — PayrollWeekRosterBundle (PWRB) Facade.
 * Jedyny publiczny entry point mutacji pary (roster + tombstones) w UI.
 */
import type { WeekEmployee, DirectoryEmployee } from "@/app/app-domain";
import { weekEmployeeFromDir, filterDirectoryForPayrollWeekAdd } from "@/app/app-domain";
import {
  addDeletedWeekEmployeeKey,
  computeMergedDataBundle,
  fetchKeysFromCloud,
  getDeletedWeekEmployeeKeys,
  mergeDeletedWeekEmployeeKeys,
  mergeWeekEmployees,
  mergeWeekEmployeesForWeekRange,
  PayrollAlreadySettledError,
  PayrollStaleRevisionError,
  pushWeekEmployeesToCloud,
  reconcileTombstonesWithRoster,
  removeDeletedWeekEmployeeKeysForWeek,
  saveDeletedWeekEmployeeKeys,
  deletedWeekEmployeeMergeKeySet,
  filterDeletedWeekEmployees,
  type PushWeekEmployeesOptions,
} from "@/lib/cloud-sync";
import {
  getExpectedPayrollRevision,
  normalizePayrollWeekMeta,
  writePayrollWeekMetaToLs,
} from "@/lib/payroll-week-meta";
import {
  isPayrollExtraCostsOnlyIntent,
  rebasePayrollExtraCostsIntent,
} from "@/lib/payroll-roster-rebase";
import { rebasePayrollFieldIntents } from "@/lib/payroll-field-intent";
import {
  bindPayrollDomainPushHandler,
  cancelPayrollDomainPush,
  cancelPayrollDomainPushPreservingSettlement,
  flushPayrollDomainPush,
  flushPayrollDomainPushOnBackground,
  hasPendingPayrollDomainPush,
  schedulePayrollDomainPush,
  unbindPayrollDomainPushHandler,
} from "@/lib/payroll-domain-sync";
import {
  assertHoursCollapseAllowedOrThrow,
  resolvePayrollDomainPushOptions,
} from "@/lib/payroll-hours-collapse-gate";
import { emitPayrollWritePathTelemetry } from "@/lib/payroll-write-path-telemetry";
import { enqueueKwWeekEmployeesWrite } from "@/lib/cloud-sync-mutation-guard";
import {
  rememberPayrollPendingAdds,
  revokePayrollPendingAdd,
} from "@/lib/payroll-pending-add-intent";

export {
  bindPayrollDomainPushHandler,
  cancelPayrollDomainPush,
  cancelPayrollDomainPushPreservingSettlement,
  flushPayrollDomainPush,
  flushPayrollDomainPushOnBackground,
  hasPendingPayrollDomainPush,
  schedulePayrollDomainPush,
  unbindPayrollDomainPushHandler,
  PAYROLL_DOMAIN_PUSH_DEBOUNCE_MS,
} from "@/lib/payroll-domain-sync";

export type PwrMutationResult = {
  roster: WeekEmployee[];
  tombstones: string[];
  changed: boolean;
  pushed: boolean;
};

export type PwrPushParams = {
  roster: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  tombstones?: string[];
  /** Pre-edit roster — D2 domain gate (hours collapse without intentionalHoursClear → throw). */
  rosterBefore?: WeekEmployee[];
  /** RC-B-1 revoke przed push (add / replace-all — te same tożsamości co w rosterze). */
  revokeIdentities?: Array<{ id?: string; directoryId?: string; name?: string }>;
  options?: PushWeekEmployeesOptions;
};

const PAYROLL_REBASE_MAX_ATTEMPTS = 3;

/**
 * CAS push + stale-revision rebase, shared by `pwrPush` and `pwrAdd`.
 *
 * Caller must already hold the kw-week-employees write slot — this helper does
 * not enqueue (nesting `enqueueKwWeekEmployeesWrite` would deadlock the FIFO).
 */
async function pushRosterWithRebase(params: {
  roster: WeekEmployee[];
  weekFrom: string;
  weekTo: string;
  intentBefore: WeekEmployee[];
  intentAfter: WeekEmployee[];
  resolved: ReturnType<typeof resolvePayrollDomainPushOptions>;
  settlementCloudAck?: boolean;
}): Promise<PwrPushResult> {
  const { intentBefore, intentAfter, resolved } = params;
  let roster = params.roster;

  for (let attempt = 0; attempt < PAYROLL_REBASE_MAX_ATTEMPTS; attempt++) {
    try {
      roster = await pushWeekEmployeesToCloud(roster, {
        ...resolved,
        rosterBefore: intentBefore,
        settlementCloudAck: params.settlementCloudAck === true,
      });
      return { roster, rebased: attempt > 0 };
    } catch (e) {
      if (e instanceof PayrollAlreadySettledError) throw e;
      if (!(e instanceof PayrollStaleRevisionError)) throw e;
      writePayrollWeekMetaToLs(
        normalizePayrollWeekMeta(
          {
            rosterRevision: e.serverRevision,
            weekFrom: params.weekFrom,
            weekTo: params.weekTo,
            updatedAt: Date.now(),
          },
          params.weekFrom,
          params.weekTo,
        ),
      );
      let canonical = (e.roster ?? []) as WeekEmployee[];
      if (canonical.length === 0) {
        try {
          const [cloudEmps] = await fetchKeysFromCloud(["kw-week-employees"]);
          canonical = Array.isArray(cloudEmps) ? (cloudEmps as WeekEmployee[]) : [];
        } catch {
          throw e;
        }
      }
      // P0 — after 409, settle intent against already-settled Cloud → ALREADY_SETTLED
      if (resolved.settlementIntent === true && Array.isArray(resolved.settlementTargetEmpIds)) {
        const targets = new Set(
          resolved.settlementTargetEmpIds.map((id) => String(id ?? "").trim()).filter(Boolean),
        );
        const conflicts = canonical.filter(
          (emp) =>
            targets.has(String(emp.id ?? "").trim())
            && emp.settled === true
            && resolved.settlementIntent === true,
        );
        if (conflicts.length > 0) {
          throw new PayrollAlreadySettledError(
            e.serverRevision,
            canonical,
            conflicts.map((c) => String(c.id ?? "")),
            "Payroll already settled after rebase",
          );
        }
      }
      roster = isPayrollExtraCostsOnlyIntent(intentBefore, intentAfter)
        ? rebasePayrollExtraCostsIntent(canonical, intentBefore, intentAfter)
        : rebasePayrollFieldIntents(
            canonical,
            intentBefore,
            intentAfter,
            resolved.hoursIntents,
            params.weekFrom,
            params.weekTo,
          );
      // P1 — drop tombstoned identities after rebase (stale ADD vs DELETE tomb).
      const tombKeys = deletedWeekEmployeeMergeKeySet(
        getDeletedWeekEmployeeKeys(),
        params.weekFrom,
        params.weekTo,
      );
      roster = filterDeletedWeekEmployees(roster, tombKeys) as WeekEmployee[];
    }
  }
  throw new PayrollStaleRevisionError(
    "stale_revision",
    getExpectedPayrollRevision(),
    undefined,
    "Payroll sync conflict — odśwież listę płac",
  );
}

export async function pwrAdd(params: {
  weekFrom: string;
  weekTo: string;
  directoryIds: string[];
  directory: DirectoryEmployee[];
  currentRoster: WeekEmployee[];
  options?: PushWeekEmployeesOptions;
  /** P2.5 — prebuilt rows (soft-restore). Avoids a second factory / new UUIDs. */
  newEmployees?: WeekEmployee[];
}): Promise<PwrMutationResult> {
  return enqueueKwWeekEmployeesWrite(async () => {
    const newEmps = params.newEmployees?.length
      ? params.newEmployees
      : filterDirectoryForPayrollWeekAdd(params.directory, params.directoryIds, params.currentRoster)
        .map(weekEmployeeFromDir);
    if (newEmps.length === 0) {
      return {
        roster: params.currentRoster,
        tombstones: getDeletedWeekEmployeeKeys(),
        changed: false,
        pushed: false,
      };
    }
    const next = [...params.currentRoster, ...newEmps];
    rememberPayrollPendingAdds(newEmps);
    removeDeletedWeekEmployeeKeysForWeek(params.weekFrom, params.weekTo, newEmps);
    const tombstones = reconcileTombstonesWithRoster(params.weekFrom, params.weekTo, next);
    const resolved = resolvePayrollDomainPushOptions(params.options);
    emitPayrollWritePathTelemetry({
      source: "pwrAdd",
      weekFrom: params.weekFrom,
      weekTo: params.weekTo,
      rosterBefore: params.currentRoster,
      rosterAfter: next,
      intentionalHoursClear: resolved.intentionalHoursClear,
      skipPayrollGuard: resolved.skipPayrollGuard,
    });
    // P2.5 — same CAS + stale-revision rebase as pwrPush (409 must not drop ADD).
    const { roster: written } = await pushRosterWithRebase({
      roster: next,
      weekFrom: params.weekFrom,
      weekTo: params.weekTo,
      intentBefore: params.currentRoster,
      intentAfter: next,
      resolved,
    });
    return { roster: written, tombstones, changed: true, pushed: true };
  });
}

export async function pwrRemove(params: {
  weekFrom: string;
  weekTo: string;
  employeeId: string;
  currentRoster: WeekEmployee[];
  options?: PushWeekEmployeesOptions;
}): Promise<PwrMutationResult> {
  return enqueueKwWeekEmployeesWrite(async () => {
    const removed = params.currentRoster.find((e) => e.id === params.employeeId);
    if (!removed) {
      return {
        roster: params.currentRoster,
        tombstones: getDeletedWeekEmployeeKeys(),
        changed: false,
        pushed: false,
      };
    }
    const next = params.currentRoster.filter((e) => e.id !== params.employeeId);
    revokePayrollPendingAdd(removed);
    addDeletedWeekEmployeeKey(params.weekFrom, params.weekTo, removed);
    const tombstones = reconcileTombstonesWithRoster(params.weekFrom, params.weekTo, next);
    const resolved = resolvePayrollDomainPushOptions(params.options);
    emitPayrollWritePathTelemetry({
      source: "pwrRemove",
      weekFrom: params.weekFrom,
      weekTo: params.weekTo,
      rosterBefore: params.currentRoster,
      rosterAfter: next,
      intentionalHoursClear: resolved.intentionalHoursClear,
      skipPayrollGuard: resolved.skipPayrollGuard,
    });
    try {
      await pushWeekEmployeesToCloud(next, {
        ...resolved,
        rosterBefore: params.currentRoster,
      });
      return { roster: next, tombstones, changed: true, pushed: true };
    } catch {
      return { roster: next, tombstones, changed: true, pushed: false };
    }
  });
}

export type PwrPushResult = {
  roster: WeekEmployee[];
  rebased: boolean;
};

export async function pwrPush(params: PwrPushParams): Promise<PwrPushResult> {
  return enqueueKwWeekEmployeesWrite(async () => {
    if (params.revokeIdentities?.length) {
      rememberPayrollPendingAdds(params.revokeIdentities);
      removeDeletedWeekEmployeeKeysForWeek(params.weekFrom, params.weekTo, params.revokeIdentities);
    }
    reconcileTombstonesWithRoster(params.weekFrom, params.weekTo, params.roster);
    const resolved = resolvePayrollDomainPushOptions(params.options);
    if (params.rosterBefore) {
      assertHoursCollapseAllowedOrThrow(params.rosterBefore, params.roster, resolved);
    }
    emitPayrollWritePathTelemetry({
      source: "pwrPush",
      weekFrom: params.weekFrom,
      weekTo: params.weekTo,
      rosterBefore: params.rosterBefore,
      rosterAfter: params.roster,
      intentionalHoursClear: resolved.intentionalHoursClear,
      skipPayrollGuard: resolved.skipPayrollGuard,
    });

    return pushRosterWithRebase({
      roster: params.roster,
      weekFrom: params.weekFrom,
      weekTo: params.weekTo,
      intentBefore: params.rosterBefore ?? params.roster,
      intentAfter: params.roster,
      resolved,
      settlementCloudAck: params.options?.settlementCloudAck === true,
    });
  });
}

export async function pwrPullMerge(params: {
  localBundle: unknown[];
}): Promise<{ merged: unknown[]; cloudReachable: boolean }> {
  return computeMergedDataBundle(params.localBundle);
}

export function pwrReconcile(params: {
  weekFrom: string;
  weekTo: string;
  roster: WeekEmployee[];
  tombstones?: string[];
}): string[] {
  return reconcileTombstonesWithRoster(params.weekFrom, params.weekTo, params.roster);
}

export function pwrImportMerge(params: {
  weekFrom: string;
  weekTo: string;
  localRoster: WeekEmployee[];
  importedRoster: WeekEmployee[];
  localTombs: string[];
  importedTombs: string[];
}): { roster: WeekEmployee[]; tombstones: string[] } {
  const mergedRoster = mergeWeekEmployees(params.localRoster, params.importedRoster) as WeekEmployee[];
  const mergedTombs = mergeDeletedWeekEmployeeKeys(params.localTombs, params.importedTombs);
  saveDeletedWeekEmployeeKeys(mergedTombs);
  const tombstones = reconcileTombstonesWithRoster(params.weekFrom, params.weekTo, mergedRoster);
  return { roster: mergedRoster, tombstones };
}

/** Restore payroll — merge roster (S1 week guard) + I-3 reconcile. */
export function pwrRestorePayrollMerge(params: {
  weekFrom: string;
  weekTo: string;
  localRoster: WeekEmployee[];
  cloudRoster: WeekEmployee[];
  cloudWeekFrom: unknown;
  cloudWeekTo: unknown;
  archive: unknown[];
}): WeekEmployee[] {
  const merged = mergeWeekEmployeesForWeekRange(
    params.weekFrom,
    params.weekTo,
    params.weekFrom,
    params.weekTo,
    params.localRoster,
    params.cloudWeekFrom,
    params.cloudWeekTo,
    params.cloudRoster,
    params.archive,
  ) as WeekEmployee[];
  reconcileTombstonesWithRoster(params.weekFrom, params.weekTo, merged);
  return merged;
}
