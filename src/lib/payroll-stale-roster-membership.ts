/**
 * PAYROLL P1 — stale roster membership sanitize.
 *
 * Rule: a stale client must not turn an old full-roster snapshot into a
 * "create employee" intent. Only before→after ADD (absent in before, present
 * in after) may introduce a person missing from canonical cloud.
 * Tombstoned identities are never re-added here (legal RE-ADD must revoke first).
 */

import type { WeekEmployee } from "@/app/app-domain";
import { weekEmployeeMergeKey } from "@/lib/payroll-week-employee-merge";
import { findMatchingEmployee } from "@/lib/payroll-hours-intent";
import { resolvePayrollPendingAddKeys } from "@/lib/payroll-pending-add-intent";

function asEmpList(list: unknown): WeekEmployee[] {
  return Array.isArray(list) ? (list as WeekEmployee[]) : [];
}

export type StaleMembershipSanitizeResult = {
  roster: WeekEmployee[];
  dropped: WeekEmployee[];
  changed: boolean;
};

/**
 * Drop outgoing employees that are absent from cloud and were NOT intentional ADDs.
 * Intentional ADD = present in after, no match in intentBefore
 *   OR session pending-ADD intent (P2.2-A — survives later pwrPush).
 * P2.4 — stale current-week tombstone does not drop legal ADD / pending ADD /
 *   cloud-present rows. Explicit REMOVE is absent from outgoing (not restored).
 * H14 ghost (before+after, not in cloud, no pending ADD) still drops.
 */
export function sanitizeStaleRosterMembership(
  cloud: unknown,
  outgoing: unknown,
  intentBefore: unknown | undefined,
  tombstonedMergeKeys?: Set<string>,
  pendingAddMergeKeys?: Set<string>,
): StaleMembershipSanitizeResult {
  const cloudList = asEmpList(cloud);
  const outList = asEmpList(outgoing);
  if (outList.length === 0) {
    return { roster: outList, dropped: [], changed: false };
  }

  const beforeList = intentBefore === undefined ? null : asEmpList(intentBefore);
  const pendingAdds = resolvePayrollPendingAddKeys(pendingAddMergeKeys);
  const dropped: WeekEmployee[] = [];
  const roster: WeekEmployee[] = [];

  for (const emp of outList) {
    const key = weekEmployeeMergeKey(emp);
    const inCloud = !!findMatchingEmployee(cloudList, emp);
    const pendingAdd = pendingAdds.has(key);
    const legalAdd = beforeList != null && !findMatchingEmployee(beforeList, emp);
    // P2.4 — stale current-week tomb loses to cloud presence, pending ADD, or legal ADD.
    // Explicit REMOVE is not in outgoing; H14 ghost (in before+after, no pending) still drops.
    if (tombstonedMergeKeys?.has(key) && !inCloud && !pendingAdd && !legalAdd) {
      dropped.push(emp);
      continue;
    }
    if (inCloud) {
      roster.push(emp);
      continue;
    }
    if (pendingAdd) {
      roster.push(emp);
      continue;
    }
    // Not in cloud — only legal if this push's intent is ADD (absent in before).
    if (beforeList == null) {
      // No membership baseline → fail-closed for cloud-absent rows.
      dropped.push(emp);
      continue;
    }
    if (legalAdd) {
      roster.push(emp);
      continue;
    }
    // Was in before + after, missing from cloud, no pending ADD → remote DELETE ghost.
    dropped.push(emp);
  }

  return {
    roster,
    dropped,
    changed: dropped.length > 0,
  };
}

/**
 * True when outgoing contains a cloud-absent row that is a legal ADD
 * (absent in intentBefore) or a session pending ADD.
 * Used so membership-only ADD does not inherit fail-loud hours-down
 * from unrelated existing members (hours-down is still not authorized).
 */
export function outgoingHasLegalMembershipAdd(
  cloud: unknown,
  outgoing: unknown,
  intentBefore: unknown | undefined,
  pendingAddMergeKeys?: Set<string>,
): boolean {
  const cloudList = asEmpList(cloud);
  const outList = asEmpList(outgoing);
  const beforeList = intentBefore === undefined ? null : asEmpList(intentBefore);
  const pendingAdds = resolvePayrollPendingAddKeys(pendingAddMergeKeys);
  for (const emp of outList) {
    if (findMatchingEmployee(cloudList, emp)) continue;
    const key = weekEmployeeMergeKey(emp);
    const pendingAdd = pendingAdds.has(key);
    const legalAdd = beforeList != null && !findMatchingEmployee(beforeList, emp);
    if (pendingAdd || legalAdd) return true;
  }
  return false;
}
