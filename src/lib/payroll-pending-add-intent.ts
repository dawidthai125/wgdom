/**
 * PAYROLL P2.2-A / P2.5 — session pending ADD identities + snapshots.
 *
 * Survives later pwrPush (hours / payout) and freshness apply until CAS ACK
 * or explicit remove. Not a second sync engine — membership intent for
 * Cloud⊕intent rebuild. Snapshots let freshness re-attach ADD rows the
 * stale 15-person bundle would otherwise drop.
 */

import {
  weekEmployeeMergeKey,
  weekEmployeeMergeKeysFromList,
  type WeekEmployeeMergeIdentity,
} from "@/lib/payroll-week-employee-merge";

/** P2.8 — pending ADD not confirmed in effective persisted Cloud roster. */
export const PAYROLL_MEMBERSHIP_PERSIST_FAILED_MESSAGE =
  "Nie udało się potwierdzić zapisu składu w chmurze. Odśwież listę płac i spróbuj ponownie.";

const pendingAddKeys = new Set<string>();
const pendingAddSnapshots = new Map<string, Record<string, unknown>>();

function keyOf(emp: WeekEmployeeMergeIdentity): string {
  return weekEmployeeMergeKey(emp);
}

function cloneJson<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function looksLikeWeekEmployeeSnapshot(emp: object): boolean {
  return "days" in emp || "rate" in emp || "settled" in emp;
}

export function rememberPayrollPendingAdds(
  emps: Array<WeekEmployeeMergeIdentity | null | undefined> | undefined,
): void {
  if (!emps?.length) return;
  for (const emp of emps) {
    if (!emp) continue;
    const key = keyOf(emp);
    if (!key) continue;
    pendingAddKeys.add(key);
    if (looksLikeWeekEmployeeSnapshot(emp)) {
      pendingAddSnapshots.set(key, cloneJson(emp as Record<string, unknown>));
    }
  }
}

export function revokePayrollPendingAdd(emp: WeekEmployeeMergeIdentity | null | undefined): void {
  if (!emp) return;
  const key = keyOf(emp);
  if (!key) return;
  pendingAddKeys.delete(key);
  pendingAddSnapshots.delete(key);
}

export function getPayrollPendingAddKeys(): Set<string> {
  return new Set(pendingAddKeys);
}

/** Full pending-ADD rows (for freshness / rebuild re-attach). */
export function listPayrollPendingAddSnapshots(): Record<string, unknown>[] {
  return [...pendingAddSnapshots.values()].map((row) => cloneJson(row));
}

/**
 * Keep active pending ADD rows on a roster that freshness / a second write
 * would otherwise shrink back to cloud-only membership.
 */
export function unionRosterWithPendingAdds(roster: unknown): unknown[] {
  const list = Array.isArray(roster) ? [...roster] : [];
  const have = new Set<string>();
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const key = weekEmployeeMergeKey(item as WeekEmployeeMergeIdentity);
    if (key) have.add(key);
  }
  for (const [key, snap] of pendingAddSnapshots) {
    if (!key || have.has(key) || !snap) continue;
    list.push(cloneJson(snap));
    have.add(key);
  }
  return list;
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

/**
 * Pending ADD merge keys present in `outgoing` that still require Cloud
 * membership confirmation before ACK (P2.8 — not HTTP 2xx alone).
 */
export function pendingAddKeysToConfirmInOutgoing(outgoing: unknown): Set<string> {
  const pending = getPayrollPendingAddKeys();
  const out = new Set<string>();
  if (pending.size === 0 || !Array.isArray(outgoing)) return out;
  for (const item of outgoing) {
    if (!item || typeof item !== "object") continue;
    const key = keyOf(item as WeekEmployeeMergeIdentity);
    if (key && pending.has(key)) out.add(key);
  }
  return out;
}

/** Keys from `keysToConfirm` missing from effective persisted roster. */
export function pendingAddKeysMissingFromPersistedRoster(
  persistedRoster: unknown,
  keysToConfirm: Set<string>,
): string[] {
  if (keysToConfirm.size === 0) return [];
  const have = weekEmployeeMergeKeysFromList(
    Array.isArray(persistedRoster) ? persistedRoster : [],
  );
  const missing: string[] = [];
  for (const key of keysToConfirm) {
    if (key && !have.has(key)) missing.push(key);
  }
  return missing;
}

/**
 * P2.8 — throw when effective persisted roster lacks pending ADD identities.
 * Does not clear pending. Caller must not ACK on failure.
 */
export function assertPayrollPendingAddsPersistedOrThrow(
  persistedRoster: unknown,
  keysToConfirm: Set<string>,
): void {
  const missing = pendingAddKeysMissingFromPersistedRoster(persistedRoster, keysToConfirm);
  if (missing.length > 0) {
    throw new Error(PAYROLL_MEMBERSHIP_PERSIST_FAILED_MESSAGE);
  }
}

/** After verified persistence — drop identities that are now in the written roster. */
export function ackPayrollPendingAddsInRoster(roster: unknown): void {
  if (!Array.isArray(roster) || pendingAddKeys.size === 0) return;
  for (const item of roster) {
    if (!item || typeof item !== "object") continue;
    const key = keyOf(item as WeekEmployeeMergeIdentity);
    if (!key) continue;
    pendingAddKeys.delete(key);
    pendingAddSnapshots.delete(key);
  }
}

export function clearPayrollPendingAddIntents(): void {
  pendingAddKeys.clear();
  pendingAddSnapshots.clear();
}

/** @internal test isolation */
export function resetPayrollPendingAddIntentsForTests(): void {
  pendingAddKeys.clear();
  pendingAddSnapshots.clear();
}
