/**
 * PAYROLL-CLOUD-RESURRECTION-01 — fence: stale LocalStorage must not re-seed Cloud KV.
 * Pure helpers (no React / no Edge). Used by cloud-sync bootstrap merge + push gate.
 */
import {
  mayPersistPayrollRosterUnderWeekKeys,
  PAYROLL_RESURRECTION_FENCE_BLOCKED_REASON,
  payrollRosterFingerprint,
  liveMatchesHistoricalArchiveFingerprint,
} from "@/lib/payroll-week-roster-binding";

export const PAYROLL_RESURRECTION_01 = "PAYROLL-CLOUD-RESURRECTION-01";

export { payrollRosterFingerprint };

export type ArchiveWeekLike = {
  id?: string;
  weekFrom?: string;
  weekTo?: string;
  savedAt?: string;
  weekEmployees?: unknown[];
};

function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function asIso(v: unknown): string {
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

export function payrollWeekRangeKey(from: unknown, to: unknown): string {
  const f = asIso(from);
  const t = asIso(to);
  return f && t ? `${f}|${t}` : "";
}

export function findArchiveWeek(
  archive: unknown,
  weekFrom: unknown,
  weekTo: unknown,
): ArchiveWeekLike | undefined {
  const key = payrollWeekRangeKey(weekFrom, weekTo);
  if (!key) return undefined;
  return asArray(archive).find((w) => {
    const snap = w as ArchiveWeekLike;
    return payrollWeekRangeKey(snap.weekFrom, snap.weekTo) === key;
  }) as ArchiveWeekLike | undefined;
}

export function archiveWeekIsRich(snap: ArchiveWeekLike | undefined | null): boolean {
  const n = Array.isArray(snap?.weekEmployees) ? snap!.weekEmployees!.length : 0;
  return n > 0;
}

/**
 * Local live roster looks like a copy of some *other* (already archived) week.
 * Primary signal for PAYROLL-CLOUD-RESURRECTION-01 (GO6: fingerprint SSOT in binding).
 */
export function localRosterMatchesHistoricalArchive(
  localEmps: unknown,
  archive: unknown,
  currentFrom: unknown,
  currentTo: unknown,
): boolean {
  return liveMatchesHistoricalArchiveFingerprint(
    localEmps,
    archive,
    currentFrom,
    currentTo,
  );
}

/**
 * Local-only polluted archive for *current* live week (cloud lacks it) matching live roster.
 */
export function localCurrentArchiveIsPollutedClone(params: {
  localEmps: unknown;
  localArchive: unknown;
  cloudArchive: unknown;
  weekFrom: unknown;
  weekTo: unknown;
}): boolean {
  const { localEmps, localArchive, cloudArchive, weekFrom, weekTo } = params;
  const local = asArray(localEmps);
  if (local.length === 0) return false;
  if (archiveWeekIsRich(findArchiveWeek(cloudArchive, weekFrom, weekTo))) return false;
  const localSnap = findArchiveWeek(localArchive, weekFrom, weekTo);
  if (!archiveWeekIsRich(localSnap)) return false;
  return payrollRosterFingerprint(local) === payrollRosterFingerprint(localSnap!.weekEmployees);
}


export type ResurrectionFenceDecision = {
  preferCloudEmptyRoster: boolean;
  stripLocalOnlyCurrentArchive: boolean;
  blockBootstrapPushWeekEmployees: boolean;
  blockBootstrapPushArchive: boolean;
  reason: string;
};

/**
 * Core freshness / resurrection decision (R1).
 * Cloud intentional empty + stale local (matches historical archive or polluted current archive) → cloud wins, no push.
 */
export function evaluatePayrollResurrectionFence(params: {
  localEmps: unknown;
  cloudEmps: unknown;
  localFrom: unknown;
  localTo: unknown;
  cloudFrom: unknown;
  cloudTo: unknown;
  localArchive: unknown;
  cloudArchive: unknown;
  calendarFrom?: string;
  calendarTo?: string;
}): ResurrectionFenceDecision {
  const idle: ResurrectionFenceDecision = {
    preferCloudEmptyRoster: false,
    stripLocalOnlyCurrentArchive: false,
    blockBootstrapPushWeekEmployees: false,
    blockBootstrapPushArchive: false,
    reason: "no_fence",
  };

  const cloudEmps = asArray(params.cloudEmps);
  const localEmps = asArray(params.localEmps);
  const cloudFrom = asIso(params.cloudFrom);
  const cloudTo = asIso(params.cloudTo);
  const localFrom = asIso(params.localFrom);
  const localTo = asIso(params.localTo);

  if (cloudEmps.length > 0) return { ...idle, reason: "cloud_live_nonempty" };
  if (localEmps.length === 0) return { ...idle, reason: "local_live_empty" };

  const sameKeys =
    !!cloudFrom &&
    !!cloudTo &&
    cloudFrom === localFrom &&
    cloudTo === localTo;

  const calFrom = params.calendarFrom || "";
  const localBehindCalendar =
    !!calFrom && !!localFrom && localFrom < calFrom && cloudFrom === calFrom;

  const combinedArchive = [...asArray(params.cloudArchive), ...asArray(params.localArchive)];
  const matchesHistorical = localRosterMatchesHistoricalArchive(
    localEmps,
    combinedArchive,
    cloudFrom || localFrom,
    cloudTo || localTo,
  );
  const pollutedCurrent = sameKeys
    ? localCurrentArchiveIsPollutedClone({
        localEmps,
        localArchive: params.localArchive,
        cloudArchive: params.cloudArchive,
        weekFrom: cloudFrom,
        weekTo: cloudTo,
      })
    : false;

  if (sameKeys && (matchesHistorical || pollutedCurrent)) {
    return {
      preferCloudEmptyRoster: true,
      stripLocalOnlyCurrentArchive: true,
      blockBootstrapPushWeekEmployees: true,
      blockBootstrapPushArchive: pollutedCurrent || matchesHistorical,
      reason: matchesHistorical
        ? "stale_local_matches_historical_archive"
        : "stale_local_polluted_current_archive_clone",
    };
  }

  if (localBehindCalendar && matchesHistorical) {
    return {
      preferCloudEmptyRoster: true,
      stripLocalOnlyCurrentArchive: true,
      blockBootstrapPushWeekEmployees: true,
      blockBootstrapPushArchive: true,
      reason: "local_behind_calendar_and_matches_archive",
    };
  }

  // Cloud on current calendar week empty; local same keys but roster equals prev-week archive only
  if (
    sameKeys &&
    calFrom &&
    cloudFrom === calFrom &&
    matchesHistorical
  ) {
    return {
      preferCloudEmptyRoster: true,
      stripLocalOnlyCurrentArchive: true,
      blockBootstrapPushWeekEmployees: true,
      blockBootstrapPushArchive: true,
      reason: "cloud_current_empty_local_is_archived_clone",
    };
  }

  return idle;
}

/** Remove local-only current-week archive snap when fence says strip (cloud lacked it). */
export function stripLocalOnlyArchiveWeek(
  mergedArchive: unknown,
  cloudArchive: unknown,
  weekFrom: unknown,
  weekTo: unknown,
): unknown[] {
  const key = payrollWeekRangeKey(weekFrom, weekTo);
  if (!key) return asArray(mergedArchive);
  if (archiveWeekIsRich(findArchiveWeek(cloudArchive, weekFrom, weekTo))) {
    return asArray(mergedArchive);
  }
  return asArray(mergedArchive).filter((w) => {
    const snap = w as ArchiveWeekLike;
    return payrollWeekRangeKey(snap.weekFrom, snap.weekTo) !== key;
  });
}

/**
 * Freshness gate before bootstrap push of a single key.
 * PAYROLL-WEEK-ROSTER-INVARIANT-01 / D-F3 — block historical residual under current keys.
 */
export function bootstrapPayrollPushAllowed(params: {
  key: string;
  mergedValue: unknown;
  cloudValue: unknown;
  fence: ResurrectionFenceDecision;
  /** Optional week binding context (D-F3). When omitted, week-employees historical check is skipped here. */
  weekBinding?: {
    weekFrom: string;
    weekTo: string;
    archive: unknown;
    currentFrom: string;
    currentTo: string;
    /** GO6 — optional current-week tombstone merge keys. */
    tombstonedMergeKeys?: Set<string>;
  };
}): { allow: boolean; reason: string } {
  const { key, mergedValue, cloudValue, fence, weekBinding } = params;
  if (key === "kw-week-employees" && fence.blockBootstrapPushWeekEmployees) {
    return { allow: false, reason: `${PAYROLL_RESURRECTION_01}:${fence.reason}` };
  }
  if (key === "kw-archive" && fence.blockBootstrapPushArchive) {
    // Allow push only if merged archive is *cleaner* than cloud (reinforcement) — still block
    // re-seeding richer polluted weeks from stale local.
    const mergedArr = asArray(mergedValue);
    const cloudArr = asArray(cloudValue);
    if (mergedArr.length > cloudArr.length) {
      return { allow: false, reason: `${PAYROLL_RESURRECTION_01}:block_richer_archive_push` };
    }
  }
  // Generic: never push rich week-employees onto empty cloud when merged still rich but fence preferred empty
  if (
    key === "kw-week-employees" &&
    fence.preferCloudEmptyRoster &&
    asArray(cloudValue).length === 0 &&
    asArray(mergedValue).length > 0
  ) {
    return { allow: false, reason: `${PAYROLL_RESURRECTION_01}:block_push_onto_empty_cloud` };
  }
  if (key === "kw-week-employees" && weekBinding) {
    const gate = mayPersistPayrollRosterUnderWeekKeys({
      weekFrom: weekBinding.weekFrom,
      weekTo: weekBinding.weekTo,
      roster: mergedValue,
      archive: weekBinding.archive,
      currentFrom: weekBinding.currentFrom,
      currentTo: weekBinding.currentTo,
      cloudRoster: cloudValue,
      tombstonedMergeKeys: weekBinding.tombstonedMergeKeys,
    });
    if (!gate.allow) {
      const reason = String(gate.reason || "");
      return {
        allow: false,
        reason: reason.startsWith(PAYROLL_RESURRECTION_FENCE_BLOCKED_REASON)
          ? reason
          : `${PAYROLL_RESURRECTION_FENCE_BLOCKED_REASON}:${reason}`,
      };
    }
  }
  return { allow: true, reason: "ok" };
}
