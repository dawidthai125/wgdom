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
  flushPayrollDomainPush,
  schedulePayrollDomainPush,
  unbindPayrollDomainPushHandler,
} from "@/lib/payroll-domain-sync";
import {
  assertHoursCollapseAllowedOrThrow,
  resolvePayrollDomainPushOptions,
} from "@/lib/payroll-hours-collapse-gate";
import { emitPayrollWritePathTelemetry } from "@/lib/payroll-write-path-telemetry";
import { enqueueKwWeekEmployeesWrite } from "@/lib/cloud-sync-mutation-guard";

export {
  bindPayrollDomainPushHandler,
  cancelPayrollDomainPush,
  flushPayrollDomainPush,
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

export async function pwrAdd(params: {
  weekFrom: string;
  weekTo: string;
  directoryIds: string[];
  directory: DirectoryEmployee[];
  currentRoster: WeekEmployee[];
  options?: PushWeekEmployeesOptions;
}): Promise<PwrMutationResult> {
  return enqueueKwWeekEmployeesWrite(async () => {
    const toAdd = filterDirectoryForPayrollWeekAdd(params.directory, params.directoryIds, params.currentRoster);
    if (toAdd.length === 0) {
      return {
        roster: params.currentRoster,
        tombstones: getDeletedWeekEmployeeKeys(),
        changed: false,
        pushed: false,
      };
    }
    const newEmps = toAdd.map(weekEmployeeFromDir);
    const next = [...params.currentRoster, ...newEmps];
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

const PAYROLL_REBASE_MAX_ATTEMPTS = 3;

export async function pwrPush(params: PwrPushParams): Promise<PwrPushResult> {
  return enqueueKwWeekEmployeesWrite(async () => {
    if (params.revokeIdentities?.length) {
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

    const intentBefore = params.rosterBefore ?? params.roster;
    const intentAfter = params.roster;
    let roster = params.roster;

    for (let attempt = 0; attempt < PAYROLL_REBASE_MAX_ATTEMPTS; attempt++) {
      try {
        roster = await pushWeekEmployeesToCloud(roster, {
          ...resolved,
          rosterBefore: intentBefore,
        });
        return { roster, rebased: attempt > 0 };
      } catch (e) {
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
