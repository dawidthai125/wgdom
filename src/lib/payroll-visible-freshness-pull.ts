/**
 * PAYROLL P1 A′ — visible Payroll freshness decisions (entry + interval).
 *
 * Not a sync engine. Does not pull, merge, push, or cancel pending edits.
 * Reuses shouldPullNow / MIN_PULL_INTERVAL_MS and Cloud freshness gate state.
 *
 * rosterRevision is a DETECTION SIGNAL only — never a second Payroll SSOT.
 */

import type { CloudFreshnessState } from "@/lib/cloud-freshness-gate";
import { shouldPullNow } from "@/lib/cloud-sync-throttle";

export const PAYROLL_VISIBLE_FRESHNESS_VIEW = "payroll" as const;

export type PayrollVisibleFreshnessSkipReason =
  | "not_payroll_view"
  | "hidden"
  | "mutation_guard_blocked"
  | "pending_domain_push"
  | "throttle";

export type PayrollVisibleFreshnessDecision =
  | { allow: true }
  | { allow: false; reason: PayrollVisibleFreshnessSkipReason };

export type PayrollVisibleFreshnessTrigger = "entry" | "interval";

export function decidePayrollVisibleFreshnessPull(input: {
  view: string;
  hidden: boolean;
  mutationGuardBlocked: boolean;
  hasPendingDomainPush: boolean;
  lastPullAt: number;
  now: number;
  /** Informational — entry and interval share the same throttle/skip rules. */
  trigger?: PayrollVisibleFreshnessTrigger;
}): PayrollVisibleFreshnessDecision {
  void input.trigger;
  if (input.view !== PAYROLL_VISIBLE_FRESHNESS_VIEW) {
    return { allow: false, reason: "not_payroll_view" };
  }
  if (input.hidden) {
    return { allow: false, reason: "hidden" };
  }
  if (input.mutationGuardBlocked) {
    return { allow: false, reason: "mutation_guard_blocked" };
  }
  if (input.hasPendingDomainPush) {
    return { allow: false, reason: "pending_domain_push" };
  }
  if (!shouldPullNow(input.lastPullAt, input.now)) {
    return { allow: false, reason: "throttle" };
  }
  return { allow: true };
}

/** Detection-only compare of local vs Cloud rosterRevision. */
export type PayrollRevisionCompareResult =
  | "cloud_newer"
  | "equal"
  | "cloud_older_or_local_ahead"
  | "unknown";

export function comparePayrollRosterRevisions(
  localRev: unknown,
  cloudRev: unknown,
): PayrollRevisionCompareResult {
  const local =
    typeof localRev === "number" && Number.isFinite(localRev) ? Math.floor(localRev) : null;
  const cloud =
    typeof cloudRev === "number" && Number.isFinite(cloudRev) ? Math.floor(cloudRev) : null;
  if (local == null || cloud == null) return "unknown";
  if (cloud > local) return "cloud_newer";
  if (cloud === local) return "equal";
  return "cloud_older_or_local_ahead";
}

/**
 * Whether to run the existing full freshness pull after a meta probe.
 * equal / cloud_older → skip unnecessary full replace.
 * unknown → fall back to existing pull behavior.
 */
export function shouldRunFullFreshnessPullForRevision(
  compare: PayrollRevisionCompareResult,
): boolean {
  return compare === "cloud_newer" || compare === "unknown";
}

export type PayrollFreshnessUxLevel = "green" | "yellow" | "red";

export function derivePayrollFreshnessUxLevel(input: {
  gateState: CloudFreshnessState;
  hasPendingDomainPush?: boolean;
}): PayrollFreshnessUxLevel {
  if (input.gateState === "fresh" && !input.hasPendingDomainPush) return "green";
  // YELLOW: checking / reconciliation pending / pending local domain write
  if (input.gateState === "checking" || input.hasPendingDomainPush === true) {
    return "yellow";
  }
  // RED: unconfirmed / unknown / stale (detection only — no settlement block)
  return "red";
}

/** Local verification clock label — never claim Cloud updatedAt. */
export function formatPayrollFreshnessCheckedLabel(atMs: number): string | null {
  if (!(typeof atMs === "number" && Number.isFinite(atMs) && atMs > 0)) return null;
  const d = new Date(atMs);
  if (Number.isNaN(d.getTime())) return null;
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `Sprawdzono: ${hh}:${mm}`;
}
