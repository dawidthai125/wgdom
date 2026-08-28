/**
 * PAYROLL-IMPLEMENT-02 D2/D3 — hours-collapse domain gate + push option resolution.
 *
 * D2: detect destructive hours transitions (primary protection).
 * D3: skipPayrollGuard only when intentionalHoursClear === true (when guardStrict ON).
 *
 * Pure domain helpers — no React. weekEmployeeFromDir stays PURE (not used here).
 */
import {
  DAYS,
  dayTotalHours,
  defaultDay,
  type DayData,
  type DayKey,
  type WeekEmployee,
} from "@/app/app-domain";

import type { PayrollScopedHoursIntent } from "@/lib/payroll-hours-intent";

/** Subset of push options used by D2/D3 (avoids circular import with cloud-sync). */
export type PayrollHoursClearPushOptions = {
  intentionalHoursClear?: boolean;
  skipPayrollGuard?: boolean;
  /** P0 — scoped hours intents (cloud-verified); not a broad boolean. */
  hoursIntents?: PayrollScopedHoursIntent[];
};

/** D14 — DF threshold */
export const PAYROLL_HOURS_COLLAPSE_THRESHOLD_HOURS = 4;
export const PAYROLL_HOURS_COLLAPSE_THRESHOLD_ACTIVE_DAYS = 2;

const CONFIRM_KILL_SWITCH = "wg-payroll-hours-collapse-confirm";
const GUARD_STRICT_KILL_SWITCH = "wg-payroll-domain-push-guard-strict";

export type HoursCollapseReason =
  | "hours_to_zero"
  | "default_day_fingerprint"
  | "all_inactive";

export type HoursCollapseFinding = {
  empId: string;
  directoryId?: string;
  name?: string;
  prevHours: number;
  nextHours: number;
  prevActiveDays: number;
  nextActiveDays: number;
  reason: HoursCollapseReason;
};

export const PAYROLL_HOURS_COLLAPSE_CONFIRM_REQUIRED =
  "PAYROLL_HOURS_COLLAPSE_CONFIRM_REQUIRED";

function asList(list: unknown): WeekEmployee[] {
  return Array.isArray(list) ? (list as WeekEmployee[]) : [];
}

export function empActiveDays(emp: WeekEmployee): number {
  let n = 0;
  const days = emp.days;
  if (!days) return 0;
  for (const k of DAYS) {
    if (days[k]?.active) n += 1;
  }
  return n;
}

export function empTotalHours(emp: WeekEmployee): number {
  let h = 0;
  const days = emp.days;
  if (days) {
    for (const k of DAYS) {
      const d = days[k];
      if (d) h += dayTotalHours(d);
    }
  }
  if (emp.prevSaturday) h += dayTotalHours(emp.prevSaturday);
  return +h.toFixed(2);
}

function isDefaultDayFingerprint(d: DayData | undefined): boolean {
  if (!d || typeof d !== "object") return false;
  const base = defaultDay();
  return (
    d.active === false
    && d.from === base.from
    && d.to === base.to
  );
}

/** All Pn–So match defaultDay() shape (inactive + 07:00–16:00). */
export function daysMatchDefaultDayFingerprint(emp: WeekEmployee): boolean {
  const days = emp.days;
  if (!days) return false;
  for (const k of DAYS) {
    if (!isDefaultDayFingerprint(days[k as DayKey])) return false;
  }
  return true;
}

function meetsCollapseThreshold(prevHours: number, prevActiveDays: number): boolean {
  return (
    prevHours >= PAYROLL_HOURS_COLLAPSE_THRESHOLD_HOURS
    || prevActiveDays >= PAYROLL_HOURS_COLLAPSE_THRESHOLD_ACTIVE_DAYS
  );
}

/**
 * Per-employee destructive transitions (D2).
 * Skips CREATED (no before) and REMOVED (no after).
 */
export function detectHoursCollapse(
  before: unknown,
  after: unknown,
): HoursCollapseFinding[] {
  const prevList = asList(before);
  const nextList = asList(after);
  const nextById = new Map(nextList.map((e) => [e.id, e]));
  const findings: HoursCollapseFinding[] = [];

  for (const prev of prevList) {
    if (!prev?.id) continue;
    const next = nextById.get(prev.id);
    if (!next) continue; // removed — not hours-collapse on same row

    const prevHours = empTotalHours(prev);
    const nextHours = empTotalHours(next);
    const prevActiveDays = empActiveDays(prev);
    const nextActiveDays = empActiveDays(next);

    if (!meetsCollapseThreshold(prevHours, prevActiveDays)) continue;

    let reason: HoursCollapseReason | null = null;
    if (prevHours > 0 && nextHours === 0) {
      reason = "hours_to_zero";
    } else if (prevActiveDays > 0 && nextActiveDays === 0) {
      reason = "all_inactive";
    } else if (prevHours > 0 && daysMatchDefaultDayFingerprint(next)) {
      reason = "default_day_fingerprint";
    }

    if (!reason) continue;
    findings.push({
      empId: prev.id,
      directoryId: prev.directoryId,
      name: prev.name,
      prevHours,
      nextHours,
      prevActiveDays,
      nextActiveDays,
      reason,
    });
  }

  return findings;
}

export function requiresHoursCollapseConfirm(before: unknown, after: unknown): boolean {
  return detectHoursCollapse(before, after).length > 0;
}

/** Default ON — `localStorage wg-payroll-hours-collapse-confirm=0` disables dialog. */
export function isPayrollHoursCollapseConfirmEnabled(): boolean {
  try {
    if (typeof localStorage === "undefined") return true;
    return localStorage.getItem(CONFIRM_KILL_SWITCH) !== "0";
  } catch {
    return true;
  }
}

/** Default ON — `=0` allows legacy skipPayrollGuard without intentionalHoursClear. */
export function isPayrollDomainPushGuardStrictEnabled(): boolean {
  try {
    if (typeof localStorage === "undefined") return true;
    return localStorage.getItem(GUARD_STRICT_KILL_SWITCH) !== "0";
  } catch {
    return true;
  }
}

export function formatHoursCollapseConfirmMessage(findings: HoursCollapseFinding[]): string {
  const names = findings
    .map((f) => f.name || f.directoryId || f.empId)
    .slice(0, 5)
    .join(", ");
  const extra = findings.length > 5 ? ` (+${findings.length - 5})` : "";
  return (
    `Uwaga: wyzerowanie godzin / dni nieaktywne dla: ${names}${extra}.\n\n`
    + `To trafi do chmury (Lista Płac). Kontynuować?`
  );
}

/**
 * D3 — skipPayrollGuard only when intentionalHoursClear (guardStrict ON).
 */
export function resolvePayrollDomainPushOptions(
  input?: PayrollHoursClearPushOptions | null,
): PayrollHoursClearPushOptions {
  const intentional = input?.intentionalHoursClear === true;
  const hoursIntents = Array.isArray(input?.hoursIntents) ? input!.hoursIntents : undefined;
  if (intentional) {
    return { intentionalHoursClear: true, skipPayrollGuard: true, hoursIntents };
  }
  if (!isPayrollDomainPushGuardStrictEnabled() && input?.skipPayrollGuard === true) {
    return { intentionalHoursClear: false, skipPayrollGuard: true, hoursIntents };
  }
  return {
    intentionalHoursClear: false,
    skipPayrollGuard: false,
    hoursIntents,
  };
}

/**
 * Whether applyPayrollGuardBeforePush may bypass shrink guard.
 * D3: intentionalHoursClear; legacy: bare skip when guardStrict OFF.
 */
export function maySkipPayrollShrinkGuard(opts?: PayrollHoursClearPushOptions | null): boolean {
  if (opts?.intentionalHoursClear === true) return true;
  if (!isPayrollDomainPushGuardStrictEnabled() && opts?.skipPayrollGuard === true) return true;
  return false;
}

export function assertHoursCollapseAllowedOrThrow(
  before: unknown,
  after: unknown,
  options?: PayrollHoursClearPushOptions | null,
): void {
  if (!requiresHoursCollapseConfirm(before, after)) return;
  if (options?.intentionalHoursClear === true) return;
  // Both kill-switches OFF → legacy allow (no domain block)
  if (!isPayrollHoursCollapseConfirmEnabled() && !isPayrollDomainPushGuardStrictEnabled()) return;
  throw new Error(PAYROLL_HOURS_COLLAPSE_CONFIRM_REQUIRED);
}
