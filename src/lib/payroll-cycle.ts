/** Wypłaty co 2 tygodnie (sobota) — logika kasowa i archiwum. */

const DAY_KEYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"] as const;

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
}

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
  const snap = savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo);
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
): BiweeklyRowDisplay | null {
  const anchor = biweeklyAnchorFor(emp, directory);
  if (!anchor) return null;
  const thisWeek = calcWeekNetNoPrevSat(emp);
  const isPayoutWeek = isBiweeklyPayoutWeek(weekTo, anchor);
  const nextPayoutDate = nextBiweeklyPayoutSaturday(weekTo, anchor);
  const prevRange = previousWeekRange(weekFrom);
  const prevEmp = findWeekEmployeeInArchive(savedWeeks, prevRange.from, prevRange.to, emp);
  const prevWeek = prevEmp ? calcWeekNetNoPrevSat(prevEmp) : { weekHours: 0, totalZaliczka: 0, totalExtraCosts: 0, grossPay: 0, netPay: 0, rateNum: 0 };

  if (!isPayoutWeek) {
    return {
      isBiweekly: true,
      isPayoutWeek: false,
      nextPayoutDate,
      thisWeekNet: thisWeek.netPay,
      prevWeekNet: 0,
      displayNet: thisWeek.netPay,
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
    thisWeekNet: thisWeek.netPay,
    prevWeekNet: prevWeek.netPay,
    displayNet: +(thisWeek.netPay + prevWeek.netPay).toFixed(2),
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
): PayrollCashSplit {
  let weeklyNet = 0;
  let biweeklyPayoutNet = 0;
  let biweeklyAccruedNet = 0;
  let isAnyBiweeklyPayoutWeek = false;
  let hasBiweeklyEmployees = false;
  let nextBiweeklyPayoutDate = "";

  for (const emp of weekEmployees) {
    if (isBiweeklyPayrollEmployee(emp, directory)) {
      hasBiweeklyEmployees = true;
      const row = calcBiweeklyRowDisplay(emp, directory, weekFrom, weekTo, savedWeeks);
      if (!row) continue;
      if (!nextBiweeklyPayoutDate) nextBiweeklyPayoutDate = row.nextPayoutDate;
      if (row.isPayoutWeek) {
        isAnyBiweeklyPayoutWeek = true;
        biweeklyPayoutNet += row.displayNet;
      } else {
        biweeklyAccruedNet += row.thisWeekNet;
      }
    } else {
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
  };
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
