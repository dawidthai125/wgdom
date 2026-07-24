/**
 * PAYROLL-IMPLEMENT-03 D5 — Soft Restore overlay (factory stays PURE).
 *
 * weekEmployeeFromDir unchanged. Overlay applied in add/PWRB before Domain Push.
 * Sources (priority): session snapshot (remove→re-add) → kw-week-employees-prev.
 */
import type { DayData, DayKey, WeekEmployee } from "@/app/app-domain";
import { DAYS } from "@/app/app-domain";
import { empTotalHours } from "@/lib/payroll-hours-collapse-gate";

const SESSION_KEY = "wg-payroll-soft-restore-session";
const SOFT_RESTORE_KILL = "wg-payroll-soft-restore";

export type SoftRestoreSessionEntry = {
  directoryId: string;
  name?: string;
  rate?: string;
  days: Record<DayKey, DayData>;
  prevSaturday: DayData;
  extraCosts?: WeekEmployee["extraCosts"];
  rememberedAt: string;
  weekFrom: string;
  weekTo: string;
};

export type SoftRestoreSessionStore = {
  byDirectoryId: Record<string, SoftRestoreSessionEntry>;
};

export type SoftRestoreOverlayOptions = {
  weekFrom: string;
  weekTo: string;
  /** Cloud/local -prev roster (optional). */
  prevRoster?: WeekEmployee[] | null;
  /** Conscious empty add — skip overlay (AC-D5-2). */
  preferEmptyHours?: boolean;
};

/** Default ON — `=0` disables soft restore overlay. */
export function isPayrollSoftRestoreEnabled(): boolean {
  try {
    if (typeof localStorage === "undefined") return true;
    return localStorage.getItem(SOFT_RESTORE_KILL) !== "0";
  } catch {
    return true;
  }
}

function readSession(): SoftRestoreSessionStore {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { byDirectoryId: {} };
    const parsed = JSON.parse(raw) as SoftRestoreSessionStore;
    if (!parsed || typeof parsed !== "object" || !parsed.byDirectoryId) return { byDirectoryId: {} };
    return parsed;
  } catch {
    return { byDirectoryId: {} };
  }
}

function writeSession(store: SoftRestoreSessionStore): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(store));
  } catch { /* ignore */ }
}

function dirIdOf(emp: { directoryId?: string } | null | undefined): string {
  return String(emp?.directoryId ?? "").trim();
}

/** Call on remove (W2) — remember hours for soft re-add. */
export function rememberPayrollSoftRestoreSnapshot(
  emp: WeekEmployee,
  weekFrom: string,
  weekTo: string,
): void {
  if (!isPayrollSoftRestoreEnabled()) return;
  const directoryId = dirIdOf(emp);
  if (!directoryId) return;
  if (empTotalHours(emp) <= 0) return;
  const store = readSession();
  store.byDirectoryId[directoryId] = {
    directoryId,
    name: emp.name,
    rate: emp.rate,
    days: structuredClone(emp.days),
    prevSaturday: structuredClone(emp.prevSaturday),
    extraCosts: structuredClone(emp.extraCosts ?? []),
    rememberedAt: new Date().toISOString(),
    weekFrom,
    weekTo,
  };
  writeSession(store);
}

export function clearPayrollSoftRestoreSnapshot(directoryId: string): void {
  const id = String(directoryId ?? "").trim();
  if (!id) return;
  const store = readSession();
  if (!(id in store.byDirectoryId)) return;
  delete store.byDirectoryId[id];
  writeSession(store);
}

export function peekPayrollSoftRestoreSession(
  directoryId: string,
  weekFrom: string,
  weekTo: string,
): SoftRestoreSessionEntry | null {
  const id = String(directoryId ?? "").trim();
  if (!id) return null;
  const entry = readSession().byDirectoryId[id];
  if (!entry) return null;
  if (entry.weekFrom !== weekFrom || entry.weekTo !== weekTo) return null;
  return entry;
}

function findPrevByDirectory(
  prevRoster: WeekEmployee[] | null | undefined,
  directoryId: string,
): WeekEmployee | null {
  if (!prevRoster?.length || !directoryId) return null;
  return prevRoster.find((e) => dirIdOf(e) === directoryId) ?? null;
}

function hasUsableHours(days: Record<DayKey, DayData> | undefined, prevSaturday?: DayData): boolean {
  if (!days) return false;
  for (const k of DAYS) {
    if (days[k]?.active) return true;
  }
  if (prevSaturday?.active) return true;
  return false;
}

function overlayFromEntry(
  emp: WeekEmployee,
  days: Record<DayKey, DayData>,
  prevSaturday: DayData,
  extraCosts?: WeekEmployee["extraCosts"],
  rate?: string,
): WeekEmployee {
  return {
    ...emp,
    days: structuredClone(days),
    prevSaturday: structuredClone(prevSaturday),
    extraCosts: extraCosts != null ? structuredClone(extraCosts) : emp.extraCosts,
    rate: rate != null && rate !== "" ? rate : emp.rate,
    dataUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Apply Soft Restore onto freshly created WeekEmployees (post weekEmployeeFromDir).
 * Does not mutate factory — returns new array.
 * AC-D5-3: weekEmployeeFromDir body untouched.
 */
export function applyPayrollSoftRestoreOverlay(
  created: WeekEmployee[],
  options: SoftRestoreOverlayOptions,
): { roster: WeekEmployee[]; restoredDirectoryIds: string[] } {
  if (!created.length) return { roster: created, restoredDirectoryIds: [] };
  if (!isPayrollSoftRestoreEnabled() || options.preferEmptyHours === true) {
    return { roster: created, restoredDirectoryIds: [] };
  }
  const restoredDirectoryIds: string[] = [];
  const roster = created.map((emp) => {
    const directoryId = dirIdOf(emp);
    if (!directoryId) return emp;

    const session = peekPayrollSoftRestoreSession(directoryId, options.weekFrom, options.weekTo);
    if (session && hasUsableHours(session.days, session.prevSaturday)) {
      restoredDirectoryIds.push(directoryId);
      clearPayrollSoftRestoreSnapshot(directoryId);
      return overlayFromEntry(emp, session.days, session.prevSaturday, session.extraCosts, session.rate);
    }

    const fromPrev = findPrevByDirectory(options.prevRoster ?? null, directoryId);
    if (fromPrev && hasUsableHours(fromPrev.days, fromPrev.prevSaturday)) {
      restoredDirectoryIds.push(directoryId);
      return overlayFromEntry(
        emp,
        fromPrev.days,
        fromPrev.prevSaturday ?? emp.prevSaturday,
        fromPrev.extraCosts,
        fromPrev.rate,
      );
    }

    return emp;
  });
  return { roster, restoredDirectoryIds };
}
