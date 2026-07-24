/**
 * PAYROLL-IMPLEMENT-03 D4 — Recovery Banner from kw-week-employees-prev only.
 *
 * Zakaz: reuse shouldShowPayrollRestoreBanner (archive).
 * REUSE: payrollMetrics + richer-than pattern.
 */
import type { WeekEmployee } from "@/app/app-domain";
import {
  PAYROLL_RESTORE_BANNER_EPS_HOURS,
  payrollMetrics,
} from "@/lib/cloud-sync";

const KILL_SWITCH = "wg-payroll-recovery-banner-prev";
const DISMISS_PREFIX = "wg-payroll-prev-recovery-dismiss:";

export const PAYROLL_PREV_KEY = "kw-week-employees-prev";

function asList(list: unknown): WeekEmployee[] {
  return Array.isArray(list) ? (list as WeekEmployee[]) : [];
}

function dirKey(emp: { directoryId?: string; id?: string } | null | undefined): string {
  const d = String(emp?.directoryId ?? "").trim();
  if (d) return `d:${d}`;
  const id = String(emp?.id ?? "").trim();
  return id ? `i:${id}` : "";
}

/** Default ON — `localStorage wg-payroll-recovery-banner-prev=0` disables. */
export function isPayrollPrevRecoveryBannerEnabled(): boolean {
  try {
    if (typeof localStorage === "undefined") return true;
    return localStorage.getItem(KILL_SWITCH) !== "0";
  } catch {
    return true;
  }
}

/** Same richer-than pattern as archive banner, but for -prev only (C3). */
export function prevPayrollRicherThanLive(
  prevRoster: unknown,
  liveRoster: unknown,
  epsHours = PAYROLL_RESTORE_BANNER_EPS_HOURS,
): boolean {
  const prevM = payrollMetrics(prevRoster);
  const liveM = payrollMetrics(liveRoster);
  return (
    prevM.activeDays > liveM.activeDays
    || prevM.totalHours > liveM.totalHours + epsHours
  );
}

/**
 * Restrict comparison to overlapping directoryId (or id fallback).
 * Returns null if no overlap.
 */
export function overlappingPrevLiveSlices(
  liveRoster: unknown,
  prevRoster: unknown,
): { liveOverlap: WeekEmployee[]; prevOverlap: WeekEmployee[] } | null {
  const live = asList(liveRoster);
  const prev = asList(prevRoster);
  if (live.length === 0 || prev.length === 0) return null;

  const liveBy = new Map<string, WeekEmployee>();
  for (const e of live) {
    const k = dirKey(e);
    if (k) liveBy.set(k, e);
  }
  const prevBy = new Map<string, WeekEmployee>();
  for (const e of prev) {
    const k = dirKey(e);
    if (k) prevBy.set(k, e);
  }

  const liveOverlap: WeekEmployee[] = [];
  const prevOverlap: WeekEmployee[] = [];
  for (const [k, liveEmp] of liveBy) {
    const prevEmp = prevBy.get(k);
    if (!prevEmp) continue;
    liveOverlap.push(liveEmp);
    prevOverlap.push(prevEmp);
  }
  if (liveOverlap.length === 0) return null;
  return { liveOverlap, prevOverlap };
}

/**
 * AC-D4-1 — show when overlapping live ≪ -prev (metrics).
 * Does NOT consult archive.
 */
export function shouldShowPayrollPrevRecoveryBanner(
  liveRoster: unknown,
  prevRoster: unknown,
): boolean {
  if (!isPayrollPrevRecoveryBannerEnabled()) return false;
  const slices = overlappingPrevLiveSlices(liveRoster, prevRoster);
  if (!slices) return false;
  return prevPayrollRicherThanLive(slices.prevOverlap, slices.liveOverlap);
}

export function dismissKeyForPrevRecovery(weekFrom: string, weekTo: string, prevRoster: unknown): string {
  const m = payrollMetrics(prevRoster);
  return `${DISMISS_PREFIX}${weekFrom}|${weekTo}|${m.activeDays}|${m.totalHours}`;
}

export function isPayrollPrevRecoveryDismissed(
  weekFrom: string,
  weekTo: string,
  prevRoster: unknown,
): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    return localStorage.getItem(dismissKeyForPrevRecovery(weekFrom, weekTo, prevRoster)) === "1";
  } catch {
    return false;
  }
}

export function dismissPayrollPrevRecovery(
  weekFrom: string,
  weekTo: string,
  prevRoster: unknown,
): void {
  try {
    localStorage.setItem(dismissKeyForPrevRecovery(weekFrom, weekTo, prevRoster), "1");
  } catch { /* ignore */ }
}

/**
 * Overlay richer -prev days onto live by directoryId (keep live UUID).
 * Domain-push ready — no archive, no SSOT change beyond returned roster.
 */
export function applyPrevRecoveryToLiveRoster(
  liveRoster: WeekEmployee[],
  prevRoster: unknown,
): WeekEmployee[] {
  const live = asList(liveRoster);
  const prev = asList(prevRoster);
  const prevBy = new Map<string, WeekEmployee>();
  for (const e of prev) {
    const k = dirKey(e);
    if (k) prevBy.set(k, e);
  }
  const now = new Date().toISOString();
  return live.map((emp) => {
    const k = dirKey(emp);
    if (!k) return emp;
    const fromPrev = prevBy.get(k);
    if (!fromPrev) return emp;
    const liveSlice = [emp];
    const prevSlice = [fromPrev];
    if (!prevPayrollRicherThanLive(prevSlice, liveSlice)) return emp;
    return {
      ...emp,
      days: structuredClone(fromPrev.days),
      prevSaturday: structuredClone(fromPrev.prevSaturday ?? emp.prevSaturday),
      extraCosts: structuredClone(fromPrev.extraCosts ?? emp.extraCosts ?? []),
      dataUpdatedAt: now,
    };
  });
}
