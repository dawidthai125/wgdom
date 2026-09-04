/**
 * PAYROLL-WEEK-ROSTER-INVARIANT-01 — week ↔ roster binding helpers.
 * SSOT for hours gate + historical residual persist fence (#I-WEEK-ROSTER / D-F1 / D-F3).
 * Pure — no React / no Edge. Hours via app-domain dayTotalHours (no duplicate math).
 *
 * GO6 (D-F3 amend): archive identity overlap alone ≠ BLOCK.
 * BLOCK requires true residual/clone (fingerprint) and/or tombstone recreate,
 * not legal updates of employees already present in Cloud current roster.
 */
import { DAYS, dayTotalHours, type DayData, type DayKey } from "@/app/app-domain";
import { weekEmployeeMergeKey } from "@/lib/payroll-week-employee-merge";

export const PAYROLL_WEEK_ROSTER_INVARIANT_01 = "PAYROLL-WEEK-ROSTER-INVARIANT-01";

export const QUARANTINE_HISTORICAL_HOURS_REASON =
  "quarantine_historical_hours_under_stale_labels" as const;

export const ALIGN_ZERO_HOURS_BOOTSTRAP_REASON = "align_zero_hours_bootstrap" as const;

export const PAYROLL_RESURRECTION_FENCE_BLOCKED_REASON =
  "payroll_resurrection_fence_blocked" as const;

/** GO6 — outgoing ⊆ cloud current (legal field update of existing identities). */
export const OK_CLOUD_MEMBERSHIP_UPDATE = "ok_cloud_membership_update" as const;
/** GO6 — fingerprint matches historical archive under current keys. */
export const BLOCK_HISTORICAL_CLONE = "payroll_resurrection_fence_blocked:historical_clone" as const;
/** GO6 — novel identity recreates a current-week tombstone. */
export const BLOCK_TOMBSTONE_RECREATE = "payroll_resurrection_fence_blocked:tombstone_recreate" as const;

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

function mergeKeySet(list: unknown): Set<string> {
  const keys = new Set<string>();
  for (const emp of asEmpList(list)) {
    const k = weekEmployeeMergeKey(emp);
    if (k) keys.add(k);
  }
  return keys;
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
 * Stable roster fingerprint (directoryId/id/name + day activity pattern).
 * Shared with PAYROLL-CLOUD-RESURRECTION-01 clone detection.
 */
export function payrollRosterFingerprint(emps: unknown): string {
  const dayKeys = DAYS;
  return asEmpList(emps)
    .map((e) => {
      const id =
        String(e.directoryId || "") ||
        String(e.id || "") ||
        String(e.name || "");
      const days = e.days || {};
      const sig = dayKeys.map((k) => (days[k]?.active ? "1" : "0")).join("");
      return `${id}:${sig}`;
    })
    .sort()
    .join("|");
}

/**
 * Live roster fingerprint equals some *other* archived week with positive hours.
 * True residual / historical clone signal (not mere identity overlap).
 */
export function liveMatchesHistoricalArchiveFingerprint(
  liveRoster: unknown,
  archive: unknown,
  currentFrom: unknown,
  currentTo: unknown,
): boolean {
  const live = asEmpList(liveRoster);
  if (live.length === 0) return false;
  if (!liveRosterHasPositiveHours(live)) return false;
  const fp = payrollRosterFingerprint(live);
  if (!fp) return false;
  const curKey = weekRangeKey(currentFrom, currentTo);
  for (const item of Array.isArray(archive) ? archive : []) {
    if (!item || typeof item !== "object") continue;
    const snap = item as ArchiveWeekLike;
    const key = weekRangeKey(snap.weekFrom, snap.weekTo);
    if (!key || (curKey && key === curKey)) continue;
    const archEmps = Array.isArray(snap.weekEmployees) ? snap.weekEmployees : [];
    if (archEmps.length === 0) continue;
    if (!liveRosterHasPositiveHours(archEmps)) continue;
    if (payrollRosterFingerprint(archEmps) === fp) return true;
  }
  return false;
}

/**
 * @deprecated GO6 — identity overlap alone is NOT a resurrection signal.
 * Kept for diagnostics / legacy tests; fence decisions must use
 * {@link mayPersistPayrollRosterUnderWeekKeys} (cloud membership + fingerprint).
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
 * D-F3 (+ GO6 / GO6.1 amend) — may we persist this roster under the given week keys?
 *
 * Control flow (GO6.1 + P2.7):
 * 1. tombstone recreate → BLOCK
 *    unless identity is explicit legal / pending membership ADD (P2.7)
 * 2. O2 true historical clone/residual (fingerprint) → BLOCK
 *    even when outgoing identity set === cloud identity set
 * 3. O1 outgoing ⊆ Cloud current → ALLOW (legal field update)
 * 4. else no residual signal → ALLOW
 *
 * Precedence (P2.7): explicit REMOVE > legal/pending ADD > in-cloud > stale tomb.
 * Mere archive identity overlap alone is never sufficient to BLOCK.
 */
export function mayPersistPayrollRosterUnderWeekKeys(params: {
  weekFrom: string;
  weekTo: string;
  roster: unknown;
  archive: unknown;
  /** Current calendar payroll week (getPayrollWeekRange). */
  currentFrom: string;
  currentTo: string;
  /**
   * GO6 — Cloud current `kw-week-employees` baseline (when known).
   * When provided and non-empty, outgoing ⊆ cloud ⇒ legal update ALLOW
   * (only after O2 clone check passes).
   */
  cloudRoster?: unknown;
  /** GO6 — current-week tombstone merge keys (dir:/name:/id:). */
  tombstonedMergeKeys?: Set<string>;
  /**
   * P2.7 — explicit legal / pending membership ADD merge keys.
   * Precedence: legal ADD > stale current-week tombstone.
   * Does NOT weaken fence for bootstrap / unauthorized resurrection.
   */
  legalAddMergeKeys?: Set<string>;
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

  const liveKeys = mergeKeySet(params.roster);
  const cloudProvided = params.cloudRoster !== undefined;
  const cloudList = cloudProvided ? asEmpList(params.cloudRoster) : [];
  const cloudKeys = mergeKeySet(cloudList);
  const novelKeys: string[] = [];
  for (const k of liveKeys) {
    if (!cloudKeys.has(k)) novelKeys.push(k);
  }
  const legalAdds = params.legalAddMergeKeys;

  // 1) Tombstone recreate: identity deleted for this week, reappearing in outgoing.
  // P2.7 — skip BLOCK when this novel identity is an explicit/pending legal ADD.
  const tombs = params.tombstonedMergeKeys;
  if (tombs && tombs.size > 0) {
    for (const k of novelKeys.length > 0 ? novelKeys : liveKeys) {
      if (tombs.has(k) && !cloudKeys.has(k)) {
        if (legalAdds?.has(k)) continue;
        return {
          allow: false,
          reason: BLOCK_TOMBSTONE_RECREATE,
          hoursTotal,
        };
      }
    }
  }

  // 2) O2 — historical fingerprint clone / residual BEFORE cloud-membership allow.
  //    Must fire even when outgoing identity set === cloud identity set.
  const isClone = liveMatchesHistoricalArchiveFingerprint(
    params.roster,
    params.archive,
    params.currentFrom,
    params.currentTo,
  );
  if (isClone) {
    if (cloudKeys.size === 0) {
      return { allow: false, reason: BLOCK_HISTORICAL_CLONE, hoursTotal };
    }
    const cloudFp = payrollRosterFingerprint(cloudList);
    const liveFp = payrollRosterFingerprint(params.roster);
    if (cloudFp !== liveFp) {
      return { allow: false, reason: BLOCK_HISTORICAL_CLONE, hoursTotal };
    }
    // cloudFp === liveFp: live already matches Cloud (not a residual diverge) → continue
  }

  // 3) O1 — entire outgoing ⊆ cloud current ⇒ legal field update (settle/hours/rate…).
  if (cloudKeys.size > 0 && novelKeys.length === 0) {
    return { allow: true, reason: OK_CLOUD_MEMBERSHIP_UPDATE, hoursTotal };
  }

  // 4) Archive identity overlap alone is NOT sufficient to block (GO6).
  return { allow: true, reason: "ok_no_residual_clone", hoursTotal };
}
