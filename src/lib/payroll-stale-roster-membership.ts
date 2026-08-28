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
 * Intentional ADD = present in after, no match in intentBefore.
 */
export function sanitizeStaleRosterMembership(
  cloud: unknown,
  outgoing: unknown,
  intentBefore: unknown | undefined,
  tombstonedMergeKeys?: Set<string>,
): StaleMembershipSanitizeResult {
  const cloudList = asEmpList(cloud);
  const outList = asEmpList(outgoing);
  if (outList.length === 0) {
    return { roster: outList, dropped: [], changed: false };
  }

  const beforeList = intentBefore === undefined ? null : asEmpList(intentBefore);
  const dropped: WeekEmployee[] = [];
  const roster: WeekEmployee[] = [];

  for (const emp of outList) {
    const key = weekEmployeeMergeKey(emp);
    if (tombstonedMergeKeys?.has(key)) {
      dropped.push(emp);
      continue;
    }
    if (findMatchingEmployee(cloudList, emp)) {
      roster.push(emp);
      continue;
    }
    // Not in cloud — only legal if this push's intent is ADD (absent in before).
    if (beforeList == null) {
      // No membership baseline → fail-closed for cloud-absent rows.
      dropped.push(emp);
      continue;
    }
    const wasInBefore = !!findMatchingEmployee(beforeList, emp);
    if (!wasInBefore) {
      roster.push(emp); // intentional ADD / legal RE-ADD (tomb already revoked)
      continue;
    }
    // Was in before + after, missing from cloud → remote DELETE (or never synced). Drop.
    dropped.push(emp);
  }

  return {
    roster,
    dropped,
    changed: dropped.length > 0,
  };
}
