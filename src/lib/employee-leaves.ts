/** Nieobecności pracowników — tygodnie rozliczeniowe (Pn–So), KV `kw-employee-leaves`. */

import type { EmployeeSnapshot, WeekSnapshot } from "@/app/app-domain";
import { fmtDate } from "@/app/app-domain";
import { getPayrollWeekRange, listPayrollWeekRanges } from "@/lib/payroll-cycle";

export type LeaveType = "vacation" | "sick" | "unpaid";

export type PayrollLeaveStatus = LeaveType;

export interface EmployeeLeave {
  id: string;
  employeeId: string;
  leaveType: LeaveType;
  weekStart: string;
  weekEnd: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export const LEAVE_TYPE_OPTIONS: { value: LeaveType; label: string }[] = [
  { value: "vacation", label: "Urlop" },
  { value: "sick", label: "Chorobowe" },
  { value: "unpaid", label: "Bezpłatny" },
];

export const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  vacation: "URLOP",
  sick: "CHOROBOWE",
  unpaid: "BEZPŁATNY",
};

export const LEAVE_TYPE_UI_EMOJI: Record<LeaveType, string> = {
  vacation: "🏖",
  sick: "🤒",
  unpaid: "🚫",
};

export function leaveTypeDisplayLabel(type: LeaveType, withEmoji = true): string {
  const base = LEAVE_TYPE_LABELS[type];
  return withEmoji ? `${LEAVE_TYPE_UI_EMOJI[type]} ${base}` : base;
}

export function leaveTypeShortLabel(type: LeaveType): string {
  return LEAVE_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
}

export function normalizeEmployeeLeaves(raw: unknown): EmployeeLeave[] {
  if (!Array.isArray(raw)) return [];
  const out: EmployeeLeave[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const r = item as Partial<EmployeeLeave>;
    if (!r.id || !r.employeeId || !r.leaveType || !r.weekStart || !r.weekEnd) continue;
    if (r.leaveType !== "vacation" && r.leaveType !== "sick" && r.leaveType !== "unpaid") continue;
    out.push({
      id: String(r.id),
      employeeId: String(r.employeeId),
      leaveType: r.leaveType,
      weekStart: String(r.weekStart),
      weekEnd: String(r.weekEnd),
      notes: typeof r.notes === "string" ? r.notes : "",
      createdAt: String(r.createdAt ?? new Date().toISOString()),
      updatedAt: String(r.updatedAt ?? r.createdAt ?? new Date().toISOString()),
    });
  }
  return out;
}

/** Zakresy ISO (weekStart–weekEnd) nachodzą na siebie. */
export function leaveDateRangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && aEnd >= bStart;
}

/** Tydzień payroll (weekFrom–weekTo) nachodzi na zakres nieobecności. */
export function leaveCoversPayrollWeek(
  leave: Pick<EmployeeLeave, "weekStart" | "weekEnd">,
  weekFrom: string,
  weekTo: string,
): boolean {
  return leaveDateRangesOverlap(leave.weekStart, leave.weekEnd, weekFrom, weekTo);
}

export function findLeaveForEmployeeWeek(
  leaves: EmployeeLeave[],
  employeeId: string,
  weekFrom: string,
  weekTo: string,
): EmployeeLeave | null {
  if (!employeeId) return null;
  for (const leave of leaves) {
    if (leave.employeeId !== employeeId) continue;
    if (leaveCoversPayrollWeek(leave, weekFrom, weekTo)) return leave;
  }
  return null;
}

/** Czy zakres nieobecności nachodzi na którykolwiek zapisany tydzień archiwum. */
export function leaveRangeOverlapsArchivedWeeks(
  weekStart: string,
  weekEnd: string,
  savedWeeks: WeekSnapshot[],
): boolean {
  for (const snap of savedWeeks) {
    if (!snap.weekFrom || !snap.weekTo) continue;
    if (leaveDateRangesOverlap(weekStart, weekEnd, snap.weekFrom, snap.weekTo)) return true;
  }
  return false;
}

export type LeaveValidationError =
  | "missing_fields"
  | "invalid_range"
  | "overlap"
  | "archived_week";

export interface LeaveValidationResult {
  ok: boolean;
  error?: LeaveValidationError;
  message?: string;
}

export function validateEmployeeLeaveRecord(
  record: Pick<EmployeeLeave, "id" | "employeeId" | "leaveType" | "weekStart" | "weekEnd">,
  existing: EmployeeLeave[],
  savedWeeks: WeekSnapshot[],
): LeaveValidationResult {
  if (!record.employeeId || !record.weekStart || !record.weekEnd || !record.leaveType) {
    return { ok: false, error: "missing_fields", message: "Uzupełnij typ i zakres tygodni." };
  }
  if (record.weekEnd < record.weekStart) {
    return { ok: false, error: "invalid_range", message: "Tydzień „Do” nie może być wcześniejszy niż „Od”." };
  }
  if (leaveRangeOverlapsArchivedWeeks(record.weekStart, record.weekEnd, savedWeeks)) {
    return {
      ok: false,
      error: "archived_week",
      message: "Nie można dodać nieobecności dla tygodni już zamkniętych w archiwum listy płac.",
    };
  }
  for (const other of existing) {
    if (other.id === record.id) continue;
    if (other.employeeId !== record.employeeId) continue;
    if (leaveDateRangesOverlap(record.weekStart, record.weekEnd, other.weekStart, other.weekEnd)) {
      return {
        ok: false,
        error: "overlap",
        message: "Nakładające się nieobecności tego pracownika — zmień zakres lub edytuj istniejący wpis.",
      };
    }
  }
  return { ok: true };
}

export function validateEmployeeLeavesArray(
  leaves: EmployeeLeave[],
  savedWeeks: WeekSnapshot[],
): LeaveValidationResult {
  for (const leave of leaves) {
    const others = leaves.filter((l) => l.id !== leave.id);
    const r = validateEmployeeLeaveRecord(leave, others, savedWeeks);
    if (!r.ok) return r;
  }
  return { ok: true };
}

export function mergeEmployeeLeaves(
  local: unknown,
  cloud: unknown,
  deletedIds: string[] = [],
): EmployeeLeave[] {
  const deleted = new Set(deletedIds);
  const loc = normalizeEmployeeLeaves(local).filter((l) => !deleted.has(l.id));
  const clo = normalizeEmployeeLeaves(cloud).filter((l) => !deleted.has(l.id));
  const byId = new Map<string, EmployeeLeave>();
  for (const item of loc) byId.set(item.id, item);
  for (const item of clo) {
    const prev = byId.get(item.id);
    if (!prev) {
      byId.set(item.id, item);
      continue;
    }
    const prevTs = prev.updatedAt || prev.createdAt;
    const nextTs = item.updatedAt || item.createdAt;
    byId.set(item.id, nextTs >= prevTs ? item : prev);
  }
  return [...byId.values()].sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

export interface PayrollWeekOption {
  weekFrom: string;
  weekTo: string;
  label: string;
  archived: boolean;
}

const LEAVE_PICKER_MONTHS_FORWARD = 12;
const LEAVE_PICKER_WEEKS_FORWARD = 52;

/**
 * Tygodnie Pn–So do pickera urlopów — ta sama logika co lista płac (`getPayrollWeekRange`).
 * Od bieżącego otwartego tygodnia w przód (~12 mies.), bez tygodni archiwalnych.
 */
export function listSelectablePayrollWeeks(
  savedWeeks: WeekSnapshot[],
  monthsForward = LEAVE_PICKER_MONTHS_FORWARD,
  now = new Date(),
): PayrollWeekOption[] {
  const archivedSet = new Set(savedWeeks.map((w) => `${w.weekFrom}|${w.weekTo}`));
  const openWeek = getPayrollWeekRange(now);
  const weekCount = Math.max(1, Math.ceil((monthsForward * 52) / 12) || LEAVE_PICKER_WEEKS_FORWARD);
  const ranges = listPayrollWeekRanges(openWeek, weekCount);

  return ranges
    .filter(({ from, to }) => !archivedSet.has(`${from}|${to}`))
    .map(({ from, to }) => ({
      weekFrom: from,
      weekTo: to,
      label: `${fmtDate(from)} – ${fmtDate(to)}`,
      archived: false,
    }));
}

export function frozenLeaveStatusFromSnapshot(
  snap: WeekSnapshot,
  directoryId: string,
  name: string,
): PayrollLeaveStatus | undefined {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const es = snap.employees.find(
    (e) => (directoryId && norm(e.name) === norm(name)) || norm(e.name) === norm(name),
  );
  if (!es?.leaveStatus) return undefined;
  if (es.leaveStatus === "vacation" || es.leaveStatus === "sick" || es.leaveStatus === "unpaid") {
    return es.leaveStatus;
  }
  return undefined;
}

export function matchEmployeeSnapshot(
  snap: EmployeeSnapshot,
  directoryId: string,
  name: string,
): boolean {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return norm(snap.name) === norm(name);
}
