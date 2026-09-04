/**
 * PAYROLL P1 — decide whether the visible Payroll timer may call
 * executeCloudFreshnessPull({ bypassThrottle: false }).
 *
 * Not a sync engine. Does not pull, merge, push, or cancel pending edits.
 * Reuses shouldPullNow / MIN_PULL_INTERVAL_MS.
 */

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

export function decidePayrollVisibleFreshnessPull(input: {
  view: string;
  hidden: boolean;
  mutationGuardBlocked: boolean;
  hasPendingDomainPush: boolean;
  lastPullAt: number;
  now: number;
}): PayrollVisibleFreshnessDecision {
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
