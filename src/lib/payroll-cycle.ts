/** Wypłaty co 2 tygodnie (sobota) — logika kasowa i archiwum. */

import type { WeekSnapshot } from "@/app/app-domain";

const DAY_KEYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"] as const;

/** Niedziela od tej godziny (lokalnie) — lista płac przechodzi na nadchodzący tydzień Pn–So. */
export const PAYROLL_WEEK_ROLLOVER_HOUR = 20;

function localIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Niedziela ≥ 20:00 — czas przejścia na nowy tydzień płacowy (przed poniedziałkiem). */
export function isPayrollWeekRolloverTime(now = new Date()): boolean {
  return now.getDay() === 0 && now.getHours() >= PAYROLL_WEEK_ROLLOVER_HOUR;
}

/**
 * Bieżący tydzień płacowy Pn–So do pracy w liście płac.
 * Nd przed 20:00 → domykany tydzień (Pn–So z wczorajszej soboty).
 * Nd po 20:00 → nadchodzący tydzień (od jutrzejszego poniedziałku).
 */
export function getPayrollWeekRange(now = new Date()): { from: string; to: string } {
  const day = now.getDay();
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  if (day === 0 && !isPayrollWeekRolloverTime(now)) {
    mon.setDate(mon.getDate() - 6);
  } else if (day === 0 && isPayrollWeekRolloverTime(now)) {
    mon.setDate(mon.getDate() + 1);
  } else {
    mon.setDate(mon.getDate() + (1 - day));
  }
  const sat = new Date(mon);
  sat.setDate(mon.getDate() + 5);
  return { from: localIsoDate(mon), to: localIsoDate(sat) };
}

function parsePayrollIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], 12, 0, 0, 0);
}

/**
 * Pn–So: weekTo = sobota; niedziela (Pn+6) traktowana jak sobota (Pn+5) przy porównaniu tygodni.
 * SSOT UI — parity z merge w cloud-sync (weekRangeKey).
 */
export function canonicalPayrollWeekTo(weekFrom: string, weekTo: string): string {
  const mon = parsePayrollIsoDate(weekFrom);
  if (!mon) return weekTo;
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  if (weekTo === localIsoDate(sun)) {
    const sat = new Date(mon);
    sat.setDate(mon.getDate() + 5);
    return localIsoDate(sat);
  }
  return weekTo;
}

/** Kanoniczny klucz tygodnia Pn–So (from|canonicalTo). */
export function payrollWeekRangeKey(weekFrom: string, weekTo: string): string {
  if (!weekFrom || !weekTo) return "";
  return `${weekFrom}|${canonicalPayrollWeekTo(weekFrom, weekTo)}`;
}

export function isSamePayrollWeekRange(
  aFrom: string,
  aTo: string,
  bFrom: string,
  bTo: string,
): boolean {
  return payrollWeekRangeKey(aFrom, aTo) === payrollWeekRangeKey(bFrom, bTo);
}

/** Wyświetlany tydzień jest za bieżącym tygodniem płacowym (kalendarzowo). */
export function isPayrollCalendarBehind(
  weekFrom: string,
  weekTo: string,
  now = new Date(),
): boolean {
  const current = getPayrollWeekRange(now);
  return !isSamePayrollWeekRange(weekFrom, weekTo, current.from, current.to);
}

export function findPayrollWeekSnapshot(
  savedWeeks: WeekSnapshot[],
  weekFrom: string,
  weekTo: string,
): WeekSnapshot | undefined {
  const key = payrollWeekRangeKey(weekFrom, weekTo);
  return savedWeeks.find((w) => payrollWeekRangeKey(w.weekFrom, w.weekTo) === key);
}

/** Snapshot istnieje w archiwum (backup) — nie oznacza zamknięcia operacyjnego tygodnia. */
export function isPayrollWeekSaved(
  savedWeeks: WeekSnapshot[],
  weekFrom: string,
  weekTo: string,
): boolean {
  return findPayrollWeekSnapshot(savedWeeks, weekFrom, weekTo) != null;
}

/**
 * Tydzień historyczny — po rolloverze lub nawigacji poza bieżący zakres payroll.
 * Sprint 20.1B: saved ≠ closed.
 */
export function isPayrollWeekClosed(
  weekFrom: string,
  weekTo: string,
  now = new Date(),
): boolean {
  return isPayrollCalendarBehind(weekFrom, weekTo, now);
}

/**
 * Sprint 20.1D — closed dla UI / defer / snapshot.
 * Tydzień w tyle kalendarza, ale rollover zablokowany (20.1C) → nadal operacyjny.
 */
export function isPayrollWeekClosedForUi(
  weekFrom: string,
  weekTo: string,
  hasRolloverBlockers: boolean,
  now = new Date(),
): boolean {
  const calendarBehind = isPayrollCalendarBehind(weekFrom, weekTo, now);
  if (!calendarBehind) return false;
  if (hasRolloverBlockers) return false;
  return true;
}

/** Tydzień domykany w weekend (Pn–So z ostatnią sobotą). Nd zawsze = tydzień kończący się wczoraj. */
export function getPayrollClosingWeekRange(now = new Date()): { from: string; to: string } {
  const day = now.getDay();
  const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  if (day === 0) {
    mon.setDate(mon.getDate() - 6);
  } else {
    mon.setDate(mon.getDate() + (1 - day));
  }
  const sat = new Date(mon);
  sat.setDate(mon.getDate() + 5);
  return { from: localIsoDate(mon), to: localIsoDate(sat) };
}

export interface DirectoryPayrollRef {
  id: string;
  name: string;
  biweeklyPayroll?: boolean;
  biweeklyAnchorDate?: string;
}

export interface WeekEmpPayrollInput {
  directoryId?: string;
  name: string;
  rate: string;
  days: Record<string, {
    active: boolean;
    from: string;
    to: string;
    zaliczka: string;
    extraHours?: { from: string; to: string }[];
  }>;
  extraCosts?: { amount: string; status?: string }[];
}

export interface WeekArchiveRef {
  weekFrom: string;
  weekTo: string;
  weekEmployees?: WeekEmpPayrollInput[];
}

export interface WeekNetCalc {
  weekHours: number;
  totalZaliczka: number;
  totalExtraCosts: number;
  grossPay: number;
  netPay: number;
  rateNum: number;
}

export interface BiweeklyRowDisplay {
  isBiweekly: true;
  isPayoutWeek: boolean;
  nextPayoutDate: string;
  thisWeekNet: number;
  prevWeekNet: number;
  displayNet: number;
  accruedOnly: boolean;
  prevWeekFrom: string;
  prevWeekTo: string;
  thisWeek: WeekNetCalc;
}

export interface PayrollCashSplit {
  weeklyNet: number;
  biweeklyPayoutNet: number;
  biweeklyAccruedNet: number;
  totalSaturdayCash: number;
  isAnyBiweeklyPayoutWeek: boolean;
  nextBiweeklyPayoutDate: string;
  hasBiweeklyEmployees: boolean;
  weeklyCount: number;
  biweeklyCount: number;
}

/** Netto Pn–So dla tygodnia (bez Sob. poprz.) — z uwzględnieniem urlopu gdy przekazane. */
export type CalcBiweeklyWeekNetFn = (
  emp: WeekEmpPayrollInput,
  weekFrom: string,
  weekTo: string,
) => number;

function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return Number.isNaN(h) || Number.isNaN(m) ? 0 : h + m / 60;
}

function hoursWorked(from: string, to: string): number {
  const d = parseTime(to) - parseTime(from);
  return d > 0 ? +d.toFixed(2) : 0;
}

function dayTotalHours(day: WeekEmpPayrollInput["days"][string]): number {
  const base = day.active ? hoursWorked(day.from, day.to) : 0;
  const extra = (day.extraHours ?? []).reduce((s, e) => s + hoursWorked(e.from, e.to), 0);
  return +(base + extra).toFixed(2);
}

function approvedExtraCostAmount(c: { amount: string; status?: string }): number {
  const status = c.status ?? "approved";
  if (status !== "approved") return 0;
  return parseFloat(c.amount) || 0;
}

export function normalizeEmpName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Netto za tydzień Pn–So bez Sob. poprz. (dla wypłat co 2 tygodnie). */
export function calcWeekNetNoPrevSat(emp: WeekEmpPayrollInput): WeekNetCalc {
  const weekHours = +(DAY_KEYS.reduce((s, d) => s + dayTotalHours(emp.days[d] ?? { active: false, from: "07:00", to: "16:00", zaliczka: "" }), 0)).toFixed(2);
  const totalZaliczka = DAY_KEYS.reduce((s, d) => s + (parseFloat(emp.days[d]?.zaliczka ?? "") || 0), 0);
  const totalExtraCosts = (emp.extraCosts ?? []).reduce((s, c) => s + approvedExtraCostAmount(c), 0);
  const rateNum = parseFloat(emp.rate) || 0;
  const grossPay = +(weekHours * rateNum).toFixed(2);
  const netPay = +(grossPay - totalZaliczka + totalExtraCosts).toFixed(2);
  return { weekHours, totalZaliczka, totalExtraCosts, grossPay, netPay, rateNum };
}

export function directoryEmployeeForRef(
  empRef: Pick<WeekEmpPayrollInput, "directoryId" | "name">,
  directory: DirectoryPayrollRef[],
): DirectoryPayrollRef | undefined {
  if (empRef.directoryId) return directory.find((d) => d.id === empRef.directoryId);
  return directory.find((d) => normalizeEmpName(d.name) === normalizeEmpName(empRef.name));
}

export function isBiweeklyPayrollEmployee(
  empRef: Pick<WeekEmpPayrollInput, "directoryId" | "name">,
  directory: DirectoryPayrollRef[],
): boolean {
  return directoryEmployeeForRef(empRef, directory)?.biweeklyPayroll === true;
}

export function biweeklyAnchorFor(
  empRef: Pick<WeekEmpPayrollInput, "directoryId" | "name">,
  directory: DirectoryPayrollRef[],
): string | undefined {
  const dir = directoryEmployeeForRef(empRef, directory);
  if (!dir?.biweeklyPayroll) return undefined;
  return dir.biweeklyAnchorDate?.trim() || undefined;
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function isoFromDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function daysBetweenIso(fromIso: string, toIso: string): number {
  const a = parseIsoDate(fromIso).getTime();
  const b = parseIsoDate(toIso).getTime();
  return Math.round((b - a) / 86400000);
}

/** ISO + N dni (lokalna data kalendarzowa). */
export function addDaysToIso(iso: string, days: number): string {
  const dt = parseIsoDate(iso);
  dt.setDate(dt.getDate() + days);
  return localIsoDate(dt);
}

/** Następny tydzień Pn–So (przesunięcie +7 dni). */
export function nextPayrollWeekRange(range: { from: string; to: string }): { from: string; to: string } {
  return {
    from: addDaysToIso(range.from, 7),
    to: addDaysToIso(range.to, 7),
  };
}

/** Kolejne tygodnie rozliczeniowe Pn–So od startRange (włącznie). */
export function listPayrollWeekRanges(
  startRange: { from: string; to: string },
  count: number,
): { from: string; to: string }[] {
  const out: { from: string; to: string }[] = [];
  let cur = { ...startRange };
  for (let i = 0; i < count; i++) {
    out.push({ from: cur.from, to: cur.to });
    cur = nextPayrollWeekRange(cur);
  }
  return out;
}

/** Czy sobota weekTo to sobota wypłaty w cyklu co 2 tygodnie (anchor + N×14 dni). */
export function isBiweeklyPayoutWeek(weekTo: string, anchor: string): boolean {
  if (!anchor) return false;
  const diff = daysBetweenIso(anchor, weekTo);
  return diff >= 0 && diff % 14 === 0;
}

/** Następna sobota wypłaty UK po weekTo (włącznie z weekTo jeśli to już sobota wypłaty). */
export function nextBiweeklyPayoutSaturday(weekTo: string, anchor: string): string {
  if (!anchor) return weekTo;
  if (isBiweeklyPayoutWeek(weekTo, anchor)) return weekTo;
  const diff = daysBetweenIso(anchor, weekTo);
  const nextOffset = diff < 0 ? 0 : Math.floor(diff / 14) + 1;
  const next = parseIsoDate(anchor);
  next.setDate(next.getDate() + nextOffset * 14);
  return isoFromDate(next);
}

export function previousWeekRange(weekFrom: string): { from: string; to: string } {
  const mon = parseIsoDate(weekFrom);
  mon.setDate(mon.getDate() - 7);
  const sat = new Date(mon);
  sat.setDate(mon.getDate() + 5);
  return { from: isoFromDate(mon), to: isoFromDate(sat) };
}

export function weekRangeFromSaturday(saturdayIso: string): { from: string; to: string } {
  const sat = parseIsoDate(saturdayIso);
  const mon = new Date(sat);
  mon.setDate(sat.getDate() - 5);
  return { from: isoFromDate(mon), to: saturdayIso };
}

export function findWeekEmployeeInArchive(
  savedWeeks: WeekArchiveRef[],
  weekFrom: string,
  weekTo: string,
  empRef: Pick<WeekEmpPayrollInput, "directoryId" | "name">,
): WeekEmpPayrollInput | undefined {
  const snap = findPayrollWeekSnapshot(savedWeeks, weekFrom, weekTo);
  if (!snap?.weekEmployees?.length) return undefined;
  return snap.weekEmployees.find(
    (we) =>
      (empRef.directoryId && we.directoryId === empRef.directoryId) ||
      normalizeEmpName(we.name) === normalizeEmpName(empRef.name),
  );
}

export function calcBiweeklyRowDisplay(
  emp: WeekEmpPayrollInput,
  directory: DirectoryPayrollRef[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekArchiveRef[],
  calcBiweeklyWeekNet?: CalcBiweeklyWeekNetFn,
): BiweeklyRowDisplay | null {
  const anchor = biweeklyAnchorFor(emp, directory);
  if (!anchor) return null;
  const thisWeek = calcWeekNetNoPrevSat(emp);
  const weekNetFor = (e: WeekEmpPayrollInput, from: string, to: string) =>
    calcBiweeklyWeekNet ? calcBiweeklyWeekNet(e, from, to) : calcWeekNetNoPrevSat(e).netPay;
  const thisWeekNet = weekNetFor(emp, weekFrom, weekTo);
  const isPayoutWeek = isBiweeklyPayoutWeek(weekTo, anchor);
  const nextPayoutDate = nextBiweeklyPayoutSaturday(weekTo, anchor);
  const prevRange = previousWeekRange(weekFrom);
  const prevEmp = findWeekEmployeeInArchive(savedWeeks, prevRange.from, prevRange.to, emp);
  const prevWeek = prevEmp ? calcWeekNetNoPrevSat(prevEmp) : { weekHours: 0, totalZaliczka: 0, totalExtraCosts: 0, grossPay: 0, netPay: 0, rateNum: 0 };
  const prevWeekNet = prevEmp ? weekNetFor(prevEmp, prevRange.from, prevRange.to) : 0;

  if (!isPayoutWeek) {
    return {
      isBiweekly: true,
      isPayoutWeek: false,
      nextPayoutDate,
      thisWeekNet,
      prevWeekNet: 0,
      displayNet: thisWeekNet,
      accruedOnly: true,
      prevWeekFrom: prevRange.from,
      prevWeekTo: prevRange.to,
      thisWeek,
    };
  }

  return {
    isBiweekly: true,
    isPayoutWeek: true,
    nextPayoutDate,
    thisWeekNet,
    prevWeekNet,
    displayNet: +(thisWeekNet + prevWeekNet).toFixed(2),
    accruedOnly: false,
    prevWeekFrom: prevRange.from,
    prevWeekTo: prevRange.to,
    thisWeek,
  };
}

export function computePayrollCashSplit(
  weekEmployees: WeekEmpPayrollInput[],
  directory: DirectoryPayrollRef[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekArchiveRef[],
  calcWeeklyNet: (emp: WeekEmpPayrollInput) => number,
  calcBiweeklyWeekNet?: CalcBiweeklyWeekNetFn,
): PayrollCashSplit {
  let weeklyNet = 0;
  let biweeklyPayoutNet = 0;
  let biweeklyAccruedNet = 0;
  let isAnyBiweeklyPayoutWeek = false;
  let hasBiweeklyEmployees = false;
  let nextBiweeklyPayoutDate = "";
  let weeklyCount = 0;
  let biweeklyCount = 0;

  for (const emp of weekEmployees) {
    if (isBiweeklyPayrollEmployee(emp, directory)) {
      hasBiweeklyEmployees = true;
      biweeklyCount += 1;
      const row = calcBiweeklyRowDisplay(emp, directory, weekFrom, weekTo, savedWeeks, calcBiweeklyWeekNet);
      if (!row) continue;
      if (!nextBiweeklyPayoutDate) nextBiweeklyPayoutDate = row.nextPayoutDate;
      if (row.isPayoutWeek) {
        isAnyBiweeklyPayoutWeek = true;
        biweeklyPayoutNet += row.displayNet;
      } else {
        biweeklyAccruedNet += row.thisWeekNet;
      }
    } else {
      weeklyCount += 1;
      weeklyNet += calcWeeklyNet(emp);
    }
  }

  return {
    weeklyNet: +weeklyNet.toFixed(2),
    biweeklyPayoutNet: +biweeklyPayoutNet.toFixed(2),
    biweeklyAccruedNet: +biweeklyAccruedNet.toFixed(2),
    totalSaturdayCash: +(weeklyNet + biweeklyPayoutNet).toFixed(2),
    isAnyBiweeklyPayoutWeek,
    nextBiweeklyPayoutDate,
    hasBiweeklyEmployees,
    weeklyCount,
    biweeklyCount,
  };
}

/** Krótki opis wypłaty co 2 tygodnie — sidebar / pulpit. */
export function biweeklyCashContextLine(split: PayrollCashSplit, weekTo: string, compact = false): string | null {
  if (!split.hasBiweeklyEmployees) return null;
  const sat = fmtDateShort(weekTo);
  const satShort = sat.slice(0, 5);
  if (compact) {
    if (split.isAnyBiweeklyPayoutWeek) {
      return `Wypłata co 2 tyg. (${split.biweeklyCount} os.) — ten + popr. tydzień`;
    }
    const next = fmtDateShort(split.nextBiweeklyPayoutDate).slice(0, 5);
    return `Bez wypłaty co 2 tyg. → sob. ${next}`;
  }
  if (split.isAnyBiweeklyPayoutWeek) {
    return `W sob. ${sat} wypada wypłata co 2 tygodnie (${split.biweeklyCount} os.) — wypłata za bieżący i poprzedni tydzień`;
  }
  const next = fmtDateShort(split.nextBiweeklyPayoutDate);
  return `W sob. ${satShort} bez wypłaty co 2 tyg. (${split.biweeklyCount} os.) — kwota przechodzi na sob. ${next.slice(0, 5)}`;
}

function fmtDateShort(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/** Brak poprzedniego tygodnia w archiwum dla UK — potrzebny przed pierwszą wypłatą 2-tygodniową. */
export function biweeklyMissingPrevWeekArchive(
  weekEmployees: WeekEmpPayrollInput[],
  directory: DirectoryPayrollRef[],
  weekFrom: string,
  weekTo: string,
  savedWeeks: WeekArchiveRef[],
): { missing: boolean; prevRange: { from: string; to: string }; biweeklyCount: number } {
  const prevRange = previousWeekRange(weekFrom);
  const biweeklyEmps = weekEmployees.filter((e) => isBiweeklyPayrollEmployee(e, directory));
  if (biweeklyEmps.length === 0) {
    return { missing: false, prevRange, biweeklyCount: 0 };
  }
  const anyPayoutWeek = biweeklyEmps.some((e) => {
    const anchor = biweeklyAnchorFor(e, directory);
    return anchor && isBiweeklyPayoutWeek(weekTo, anchor);
  });
  if (!anyPayoutWeek) return { missing: false, prevRange, biweeklyCount: biweeklyEmps.length };
  const hasPrev = savedWeeks.some((w) => w.weekFrom === prevRange.from && w.weekTo === prevRange.to && (w.weekEmployees?.length ?? 0) > 0);
  return { missing: !hasPrev, prevRange, biweeklyCount: biweeklyEmps.length };
}
