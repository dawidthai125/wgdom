/**
 * PAYROLL P2.2-A — session pending ADD identities.
 *
 * Survives later pwrPush (hours / payout) until CAS ACK or explicit remove.
 * Not a second sync engine — membership intent for Cloud⊕intent rebuild.
 */

import { weekEmployeeMergeKey, type WeekEmployeeMergeIdentity } from "@/lib/payroll-week-employee-merge";

const pendingAddKeys = new Set<string>();

function keyOf(emp: WeekEmployeeMergeIdentity): string {
  return weekEmployeeMergeKey(emp);
}

export function rememberPayrollPendingAdds(
  emps: Array<WeekEmployeeMergeIdentity | null | undefined> | undefined,
): void {
  if (!emps?.length) return;
  for (const emp of emps) {
    if (!emp) continue;
    const key = keyOf(emp);
    if (key) pendingAddKeys.add(key);
  }
}

export function revokePayrollPendingAdd(emp: WeekEmployeeMergeIdentity | null | undefined): void {
  if (!emp) return;
  const key = keyOf(emp);
  if (key) pendingAddKeys.delete(key);
}

export function getPayrollPendingAddKeys(): Set<string> {
  return new Set(pendingAddKeys);
}

/** Union explicit keys with the session registry. */
export function resolvePayrollPendingAddKeys(extra?: Set<string> | null): Set<string> {
  const out = getPayrollPendingAddKeys();
  if (extra) {
    for (const k of extra) {
      if (k) out.add(k);
    }
  }
  return out;
}

/** After successful CAS — drop identities that are now in the written roster. */
export function ackPayrollPendingAddsInRoster(roster: unknown): void {
  if (!Array.isArray(roster) || pendingAddKeys.size === 0) return;
  for (const item of roster) {
    if (!item || typeof item !== "object") continue;
    const key = keyOf(item as WeekEmployeeMergeIdentity);
    if (key) pendingAddKeys.delete(key);
  }
}

export function clearPayrollPendingAddIntents(): void {
  pendingAddKeys.clear();
}

/** @internal test isolation */
export function resetPayrollPendingAddIntentsForTests(): void {
  pendingAddKeys.clear();
}
