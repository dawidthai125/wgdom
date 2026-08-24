/**
 * PAYROLL-WEEK-ROSTER-INVARIANT-01 — week ↔ roster binding helpers.
 * SSOT for hours gate + historical residual persist fence (#I-WEEK-ROSTER / D-F1 / D-F3).
 * Pure — no React / no Edge. Hours via app-domain dayTotalHours (no duplicate math).
 */
import { DAYS, dayTotalHours, type DayData, type DayKey } from "@/app/app-domain";
import { weekEmployeeMergeKey } from "@/lib/payroll-week-employee-merge";

export const PAYROLL_WEEK_ROSTER_INVARIANT_01 = "PAYROLL-WEEK-ROSTER-INVARIANT-01";

export const QUARANTINE_HISTORICAL_HOURS_REASON =
  "quarantine_historical_hours_under_stale_labels" as const;

export const ALIGN_ZERO_HOURS_BOOTSTRAP_REASON = "align_zero_hours_bootstrap" as const;

export const PAYROLL_RESURRECTION_FENCE_BLOCKED_REASON =
  "payroll_resurrection_fence_blocked" as const;

type EmpLike = {
  id?: string;
  directoryId?: string;
  name?: string;
  days?: Partial<Record<DayKey, DayData>>;
  prevSaturday?: DayData;
};

type ArchiveWeekLike = {
  weekFrom?: string;
  weekTo?: string;
  weekEmployees?: unknown[];
};

function asIsoDate(v: unknown): string {
  if (v == null) return "";
  let s = typeof v === "string" ? v : String(v);
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    try {
      s = JSON.parse(s);
    } catch {
      s = s.slice(1, -1);
    }
  }
  const m = String(s).trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : String(s).trim();
}

function weekRangeKey(from: unknown, to: unknown): string {
  const f = asIsoDate(from);
  const t = asIsoDate(to);
  return f && t ? `${f}|${t}` : "";
}

function asEmpList(list: unknown): EmpLike[] {
  if (!Array.isArray(list)) return [];
  return list.filter((e) => e && typeof e === "object") as EmpLike[];
}

/** Total positive hours across Pn–So (+ prevSaturday) — SSOT dayTotalHours. */
export function liveRosterTotalHours(list: unknown): number {
  let h = 0;
  for (const emp of asEmpList(list)) {
    for (const d of DAYS) {
      const day = emp.days?.[d];
      if (day) h += dayTotalHours(day);
    }
    if (emp.prevSaturday) h += dayTotalHours(emp.prevSaturday);
  }
  return +h.toFixed(2);
}

export function liveRosterHasPositiveHours(list: unknown): boolean {
  return liveRosterTotalHours(list) > 0;
}

/**
 * Live roster shares identity with an archived *other* week that has positive hours,
 * and live itself has positive hours — historical residual signal (D-F3).
 */
export function rosterOverlapsArchivedHistorical(
  liveRoster: unknown,
  archive: unknown,
  currentFrom: unknown,
  currentTo: unknown,
): boolean {
  const live = asEmpList(liveRoster);
  if (live.length === 0) return false;
  if (!liveRosterHasPositiveHours(live)) return false;

  const curKey = weekRangeKey(currentFrom, currentTo);
  const liveKeys = new Set(
    live.map((e) => weekEmployeeMergeKey(e)).filter(Boolean),
  );
  if (liveKeys.size === 0) return false;

  for (const item of Array.isArray(archive) ? archive : []) {
    if (!item || typeof item !== "object") continue;
    const snap = item as ArchiveWeekLike;
    const key = weekRangeKey(snap.weekFrom, snap.weekTo);
    if (!key || (curKey && key === curKey)) continue;
    const archEmps = Array.isArray(snap.weekEmployees) ? snap.weekEmployees : [];
    if (archEmps.length === 0) continue;
    if (!liveRosterHasPositiveHours(archEmps)) continue;

    let overlap = 0;
    for (const a of archEmps) {
      if (!a || typeof a !== "object") continue;
      const mk = weekEmployeeMergeKey(a as EmpLike);
      if (mk && liveKeys.has(mk)) overlap++;
    }
    if (overlap >= 1) return true;
  }
  return false;
}

export type MayPersistPayrollRosterResult = {
  allow: boolean;
  reason: string;
  hoursTotal: number;
};

/**
 * D-F3 — may we persist this roster under the given week keys?
 * Blocks: current week keys + positive hours + overlap with historical archive week.
 */
export function mayPersistPayrollRosterUnderWeekKeys(params: {
  weekFrom: string;
  weekTo: string;
  roster: unknown;
  archive: unknown;
  /** Current calendar payroll week (getPayrollWeekRange). */
  currentFrom: string;
  currentTo: string;
}): MayPersistPayrollRosterResult {
  const hoursTotal = liveRosterTotalHours(params.roster);
  const keysAreCurrent =
    weekRangeKey(params.weekFrom, params.weekTo) ===
    weekRangeKey(params.currentFrom, params.currentTo);

  if (!keysAreCurrent) {
    return { allow: true, reason: "ok_not_current_week_keys", hoursTotal };
  }
  if (hoursTotal <= 0) {
    return { allow: true, reason: "ok_zero_hours", hoursTotal };
  }
  if (
    rosterOverlapsArchivedHistorical(
      params.roster,
      params.archive,
      params.currentFrom,
      params.currentTo,
    )
  ) {
    return {
      allow: false,
      reason: PAYROLL_RESURRECTION_FENCE_BLOCKED_REASON,
      hoursTotal,
    };
  }
  return { allow: true, reason: "ok_no_historical_overlap", hoursTotal };
}
