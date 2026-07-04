/**
 * SYNC-ARCH-01 RC-B-1 — PayrollWeekRosterBundle (PWRB) Facade.
 * Jedyny publiczny entry point mutacji pary (roster + tombstones) w UI.
 */
import type { WeekEmployee, DirectoryEmployee } from "@/app/app-domain";
import { weekEmployeeFromDir, filterDirectoryForPayrollWeekAdd } from "@/app/app-domain";
import {
  addDeletedWeekEmployeeKey,
  computeMergedDataBundle,
  getDeletedWeekEmployeeKeys,
  mergeDeletedWeekEmployeeKeys,
  mergeWeekEmployees,
  mergeWeekEmployeesForWeekRange,
  pushWeekEmployeesToCloud,
  reconcileTombstonesWithRoster,
  removeDeletedWeekEmployeeKeysForWeek,
  saveDeletedWeekEmployeeKeys,
  type PushWeekEmployeesOptions,
} from "@/lib/cloud-sync";

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
  try {
    await pushWeekEmployeesToCloud(next, params.options);
    return { roster: next, tombstones, changed: true, pushed: true };
  } catch {
    return { roster: next, tombstones, changed: true, pushed: false };
  }
}

export async function pwrRemove(params: {
  weekFrom: string;
  weekTo: string;
  employeeId: string;
  currentRoster: WeekEmployee[];
  options?: PushWeekEmployeesOptions;
}): Promise<PwrMutationResult> {
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
  try {
    await pushWeekEmployeesToCloud(next, params.options);
    return { roster: next, tombstones, changed: true, pushed: true };
  } catch {
    return { roster: next, tombstones, changed: true, pushed: false };
  }
}

export async function pwrPush(params: PwrPushParams): Promise<void> {
  if (params.revokeIdentities?.length) {
    removeDeletedWeekEmployeeKeysForWeek(params.weekFrom, params.weekTo, params.revokeIdentities);
  }
  reconcileTombstonesWithRoster(params.weekFrom, params.weekTo, params.roster);
  await pushWeekEmployeesToCloud(params.roster, params.options);
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
