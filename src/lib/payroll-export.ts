/** Lista płac — eksport PDF/Word i HTML email (wydzielone z PayrollView). */

import logoAsset from "@/imports/logo-wg-new-poziom.eb09de3e.png";
import { leaveTypeDisplayLabel, type PayrollLeaveStatus } from "@/lib/employee-leaves";

export const PREV_SAT_SHORT = "Sob. poprz.";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PayrollCalcRowEmp {
  name: string;
  position: string;
  settled: boolean;
}

export interface PayrollCalcRow {
  emp: PayrollCalcRowEmp;
  weekHours: number;
  prevSatHours: number;
  totalHours: number;
  totalExtraHours: number;
  weekZaliczka: number;
  prevSatZaliczka: number;
  totalZaliczka: number;
  totalExtraCosts: number;
  weekGross: number;
  prevSatGross: number;
  grossPay: number;
  weekNet: number;
  prevSatNet: number;
  netPay: number;
  rateNum: number;
  /** Wypłata co 2 tygodnie */
  biweekly?: boolean;
  biweeklyPayoutWeek?: boolean;
  biweeklyAccruedOnly?: boolean;
  biweeklyNextPayout?: string;
  biweeklyThisWeekNet?: number;
  biweeklyPrevWeekNet?: number;
  biweeklyPrevWeekLabel?: string;
  biweeklyDisplayNet?: number;
  /** Nieobecność — zamrożona (archiwum) lub live overlay. */
  leaveStatus?: PayrollLeaveStatus;
}

export function payrollNetDisplayText(row: Pick<PayrollCalcRow, "netPay" | "leaveStatus" | "biweekly" | "biweeklyPayoutWeek" | "biweeklyDisplayNet" | "biweeklyAccruedOnly" | "biweeklyThisWeekNet">): string {
  if (row.leaveStatus) return leaveTypeDisplayLabel(row.leaveStatus, false);
  if (row.biweekly && row.biweeklyPayoutWeek && row.biweeklyDisplayNet != null) return fmt(row.biweeklyDisplayNet);
  if (row.biweekly && row.biweeklyAccruedOnly && row.biweeklyThisWeekNet != null) return fmt(row.biweeklyThisWeekNet);
  return fmt(row.netPay);
}

export function payrollGrossDisplayText(row: Pick<PayrollCalcRow, "grossPay" | "leaveStatus">): string {
  if (row.leaveStatus) return leaveTypeDisplayLabel(row.leaveStatus, false);
  return fmt(row.grossPay);
}

export interface PayrollExportTotals {
  totalWeekHours: number;
  totalPrevSatHours: number;
  totalHoursAll: number;
  totalWeekGross: number;
  totalPrevSatGross: number;
  totalGross: number;
  totalWeekZaliczka: number;
  totalPrevSatZaliczka: number;
  totalZaliczkaSum: number;
  totalExtraCostsSum: number;
  totalNet: number;
  settledCount: number;
  employeeCount: number;
  /** Wypłata w sobotę — tygodniówki */
  cashWeeklyNet?: number;
  /** Wypłata w sobotę — co 2 tyg. (w tygodniu wypłaty) */
  cashBiweeklyPayoutNet?: number;
  /** Narasta na następną wypłatę co 2 tyg. */
  cashBiweeklyAccruedNet?: number;
  /** Suma wypłaty w sobotę */
  cashTotalSaturday?: number;
  nextBiweeklyPayoutDate?: string;
  hasBiweeklyEmployees?: boolean;
  isBiweeklyPayoutWeek?: boolean;
}

export interface WeekExtraHourLine {
  name: string;
  position: string;
  day: string;
  baseShift: string;
  extraRange: string;
  hours: number;
  rate: number;
  amount: number;
  reason: string;
}

/** Pojedynczy zaakceptowany koszt do zwrotu (paragon, paliwo…) — trafia do kolumny Koszty i do wypłaty. */
export interface WeekExtraCostLine {
  name: string;
  position: string;
  description: string;
  amount: number;
}

export interface PrevSatDetailLine {
  name: string;
  position: string;
  dateLabel: string;
  timeRange: string;
  hours: number;
  zaliczka: number;
  gross: number;
  notesText: string;
}

/** Tabela tygodniowa na str. 2 PDF/Word — pracownicy × dni Pn–So. */
export interface PayrollWeeklyGridRow {
  name: string;
  position: string;
  dayCells: string[];
  weekHours: number;
}

export interface PayrollWeeklyGrid {
  dayHeaders: string[];
  rows: PayrollWeeklyGridRow[];
}

/** Siatka tygodniowa dodatkowych godzin — pracownicy × dni Pn–So + suma h i kwota. */
export interface PayrollExtraHoursGridRow {
  name: string;
  dayCells: string[];
  weekHours: number;
  weekAmount: number;
  rate: number;
}

export interface PayrollExtraHoursGrid {
  dayHeaders: string[];
  rows: PayrollExtraHoursGridRow[];
}

const PAYROLL_DAY_LABELS = ["Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"] as const;

function formatExtraHoursDayCell(dayLines: WeekExtraHourLine[]): string {
  if (dayLines.length === 0) return "—";
  const parts: string[] = [];
  let totalH = 0;
  let totalAmt = 0;
  for (const line of dayLines) {
    if (line.extraRange && line.extraRange !== "—") parts.push(line.extraRange);
    const reason = line.reason?.trim();
    if (reason && reason !== "—") {
      const short = reason.length > 24 ? `${reason.slice(0, 23)}…` : reason;
      parts.push(short);
    }
    totalH += line.hours;
    totalAmt += line.amount;
  }
  if (totalH > 0) parts.push(fmtH(totalH));
  if (totalAmt > 0) parts.push(`${fmt(totalAmt)} PLN`);
  if (parts.length === 0) return "—";
  return parts.join("\n");
}

/** Buduje siatkę dodatkowych godzin (jak rozpis tygodniowy) z płaskiej listy wpisów. */
export function buildPayrollExtraHoursGrid(
  lines: WeekExtraHourLine[],
  weekFrom: string,
): PayrollExtraHoursGrid | null {
  if (lines.length === 0) return null;
  const cols = weekDayIsosForJobWork(weekFrom);
  const dayHeaders = cols.map((c) => c.header);

  const byName = new Map<string, WeekExtraHourLine[]>();
  for (const line of lines) {
    const list = byName.get(line.name) ?? [];
    list.push(line);
    byName.set(line.name, list);
  }

  const rows = [...byName.entries()]
    .map(([name, empLines]) => {
      const dayCells = PAYROLL_DAY_LABELS.map((dayLabel) =>
        formatExtraHoursDayCell(empLines.filter((l) => l.day === dayLabel)),
      );
      const weekHours = +empLines.reduce((s, l) => s + l.hours, 0).toFixed(2);
      const weekAmount = +empLines.reduce((s, l) => s + l.amount, 0).toFixed(2);
      const rate = empLines.find((l) => l.rate > 0)?.rate ?? 0;
      return { name, dayCells, weekHours, weekAmount, rate };
    })
    .filter((row) => row.weekHours > 0 || row.dayCells.some((c) => c !== "—"))
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));

  if (rows.length === 0) return null;
  return { dayHeaders, rows };
}

/** Wpis czasu pracownika na konkretnej robocie (tydzień Pn–So). */
export interface PayrollJobWorkLine {
  name: string;
  dateIso: string;
  dayLabel: string;
  jobAddress: string;
  hours: number;
  rate: number;
  cost: number;
  notes: string;
}

/** Siatka tygodniowa pracy na robotach — pracownicy × dni Pn–So. */
export interface PayrollJobWorkGridRow {
  name: string;
  dayCells: string[];
  weekHours: number;
  weekCost: number;
}

export interface PayrollJobWorkGrid {
  dayHeaders: string[];
  rows: PayrollJobWorkGridRow[];
}

const JOB_WORK_DAY_KEYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"] as const;
const JOB_WORK_DAY_SHORT: Record<(typeof JOB_WORK_DAY_KEYS)[number], string> = {
  Pn: "Pn",
  Wt: "Wt",
  Sr: "Śr",
  Cz: "Cz",
  Pt: "Pt",
  So: "So",
};

function payrollExtraHourTotals(lines: WeekExtraHourLine[]): { hours: number; amount: number } {
  return {
    hours: +lines.reduce((s, l) => s + l.hours, 0).toFixed(2),
    amount: +lines.reduce((s, l) => s + l.amount, 0).toFixed(2),
  };
}

/** Wiersze kosztów do zwrotu — tylko zaakceptowane (te same co w kolumnie Koszty / Do wypłaty). */
export function buildPayrollExtraCostLines(
  employees: {
    name: string;
    position: string;
    extraCosts?: { description: string; amount: string; status?: string }[];
  }[],
): WeekExtraCostLine[] {
  const lines: WeekExtraCostLine[] = [];
  for (const emp of employees) {
    for (const cost of emp.extraCosts ?? []) {
      const status = cost.status ?? "approved";
      if (status !== "approved") continue;
      const amount = parseFloat(String(cost.amount).replace(",", ".")) || 0;
      const description = cost.description?.trim() || "";
      if (amount <= 0 && !description) continue;
      lines.push({
        name: emp.name || "—",
        position: emp.position || "—",
        description: description || "—",
        amount: +amount.toFixed(2),
      });
    }
  }
  return lines.sort(
    (a, b) => a.name.localeCompare(b.name, "pl") || a.description.localeCompare(b.description, "pl"),
  );
}

function payrollExtraCostTotals(lines: WeekExtraCostLine[]): number {
  return +lines.reduce((s, l) => s + l.amount, 0).toFixed(2);
}

function payrollEmployeeLabel(r: PayrollCalcRow): string {
  const name = r.emp.name || "—";
  if (!r.biweekly) return name;
  if (r.biweeklyAccruedOnly && r.biweeklyNextPayout) {
    return `${name} [co 2 tyg. → ${fmtDate(r.biweeklyNextPayout)}]`;
  }
  if (r.biweeklyPayoutWeek && r.biweeklyPrevWeekLabel) {
    return `${name} [co 2 tyg. + ${r.biweeklyPrevWeekLabel}]`;
  }
  return `${name} [co 2 tyg.]`;
}

function payrollCashSummaryLines(totals: PayrollExportTotals, weekTo: string): string[] {
  if (!totals.hasBiweeklyEmployees || totals.cashTotalSaturday == null) return [];
  const lines = [
    `Wypłata w sobotę ${fmtDate(weekTo)}: ${fmt(totals.cashTotalSaturday)} PLN (tygodniówki: ${fmt(totals.cashWeeklyNet ?? 0)} PLN)`,
  ];
  if (totals.isBiweeklyPayoutWeek) {
    lines.push(`Wypłata co 2 tyg. w tym tygodniu: ${fmt(totals.cashBiweeklyPayoutNet ?? 0)} PLN`);
  } else if (totals.nextBiweeklyPayoutDate) {
    lines.push(`Co 2 tyg. narastająco do ${fmtDate(totals.nextBiweeklyPayoutDate)}: ${fmt(totals.cashBiweeklyAccruedNet ?? 0)} PLN`);
  }
  return lines;
}

function weekDayIsosForJobWork(weekFrom: string): { iso: string; header: string }[] {
  const [y, m, d] = weekFrom.split("-").map(Number);
  const mon = new Date(y, m - 1, d);
  return JOB_WORK_DAY_KEYS.map((key, i) => {
    const dt = new Date(mon);
    dt.setDate(mon.getDate() + i);
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
    const [, mo, day] = iso.split("-");
    return { iso, header: `${JOB_WORK_DAY_SHORT[key]}\n${day}.${mo}` };
  });
}

function shortJobAddressLabel(addr: string, max = 18): string {
  const t = addr.trim() || "—";
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

function payrollJobWorkLineKey(line: PayrollJobWorkLine): string {
  return `${line.name}|${line.dateIso}|${line.jobAddress}`;
}

/** Scala zduplikowane wpisy (ten sam pracownik, dzień i adres) przed eksportem PDF. */
export function consolidatePayrollJobWorkLines(lines: PayrollJobWorkLine[]): PayrollJobWorkLine[] {
  const map = new Map<string, PayrollJobWorkLine>();
  for (const line of lines) {
    const key = payrollJobWorkLineKey(line);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...line });
      continue;
    }
    existing.hours += line.hours;
    existing.cost = +(existing.cost + line.cost).toFixed(2);
    if (line.notes && !existing.notes.includes(line.notes)) {
      existing.notes = existing.notes ? `${existing.notes}; ${line.notes}` : line.notes;
    }
  }
  return [...map.values()].sort(
    (a, b) => a.dateIso.localeCompare(b.dateIso) || a.name.localeCompare(b.name, "pl") || a.jobAddress.localeCompare(b.jobAddress, "pl"),
  );
}

function formatJobWorkDayCell(dayLines: PayrollJobWorkLine[]): string {
  if (dayLines.length === 0) return "—";
  const byAddress = new Map<string, { hours: number }>();
  for (const line of dayLines) {
    const addr = line.jobAddress.trim() || "—";
    const prev = byAddress.get(addr);
    if (prev) prev.hours += line.hours;
    else byAddress.set(addr, { hours: line.hours });
  }
  return [...byAddress.entries()]
    .map(([addr, { hours }]) => `${shortJobAddressLabel(addr, 16)}\n${fmtH(hours)}`)
    .join("\n");
}

/** Buduje siatkę tygodniową z płaskiej listy wpisów robót. */
export function buildPayrollJobWorkGrid(lines: PayrollJobWorkLine[], weekFrom: string): PayrollJobWorkGrid | null {
  const consolidated = consolidatePayrollJobWorkLines(lines);
  if (consolidated.length === 0) return null;
  const cols = weekDayIsosForJobWork(weekFrom);
  const dayHeaders = cols.map((c) => c.header);

  const byName = new Map<string, PayrollJobWorkLine[]>();
  for (const line of consolidated) {
    const list = byName.get(line.name) ?? [];
    list.push(line);
    byName.set(line.name, list);
  }

  const rows = [...byName.entries()]
    .map(([name, empLines]) => {
      const dayCells = cols.map((col) => formatJobWorkDayCell(empLines.filter((l) => l.dateIso === col.iso)));
      const weekHours = empLines.reduce((s, l) => s + l.hours, 0);
      const weekCost = empLines.reduce((s, l) => s + l.cost, 0);
      return { name, dayCells, weekHours, weekCost };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pl"));

  return { dayHeaders, rows };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("pl-PL", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtH(n: number) {
  const h = Math.floor(n);
  const m = Math.round((n - h) * 60);
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtDate(iso: string) {
  if (!iso) return "";
  const [y, mo, d] = iso.split("-");
  return `${d}.${mo}.${y}`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** pdfmake ~1 MB — ładuj dopiero przy eksporcie PDF. */
async function loadPdfMake() {
  const pdfMake = (await import("pdfmake/build/pdfmake")).default;
  const pdfFontsModule = await import("pdfmake/build/vfs_fonts");
  pdfMake.vfs = (pdfFontsModule.default ?? pdfFontsModule) as typeof pdfMake.vfs;
  return pdfMake;
}

type PdfDocDef = Parameters<Awaited<ReturnType<typeof loadPdfMake>>["createPdf"]>[0];

const C = {
  navy: "#344254",
  red: "#C0392B",
  lightNavy: "#EDF1F6",
  white: "#FFFFFF",
  lightGray: "#F8F9FB",
  muted: "#6B7A8D",
  green: "#1E7E34",
  gold: "#7B5800",
};

const PW = 841.89; // A4 landscape width in points

let _logoDataUrl: string | null = null;

/** Logo W&G DOM jako data URL (cache w pamięci). */
export async function getCompanyLogoDataUrl(): Promise<string> {
  if (_logoDataUrl) return _logoDataUrl;
  const res = await fetch(logoAsset);
  const blob = await res.blob();
  const b64 = await blobToBase64(blob);
  _logoDataUrl = `data:image/png;base64,${b64}`;
  return _logoDataUrl;
}

function logoBytesFromDataUrl(dataUrl: string): Uint8Array {
  const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1]! : dataUrl;
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function pdfPayrollHeader(logoDataUrl: string, weekFrom: string, weekTo: string) {
  return {
    stack: [
      {
        canvas: [
          { type: "rect" as const, x: 0, y: 0, w: PW, h: 50, color: C.navy },
          { type: "rect" as const, x: 0, y: 50, w: PW, h: 3, color: C.red },
        ],
      },
      {
        columns: [
          {
            width: 98,
            table: {
              body: [[{ image: logoDataUrl, width: 86, margin: [4, 4, 4, 4] as [number, number, number, number], fillColor: C.white }]],
            },
            layout: {
              hLineWidth: () => 0,
              vLineWidth: () => 0,
              paddingLeft: () => 0,
              paddingRight: () => 0,
              paddingTop: () => 0,
              paddingBottom: () => 0,
            },
          },
          {
            text: "LISTA PŁAC",
            fontSize: 20,
            bold: true,
            color: C.white,
            margin: [10, 11, 0, 0] as [number, number, number, number],
            width: "*",
          },
          {
            text: `${fmtDate(weekFrom)} – ${fmtDate(weekTo)}`,
            fontSize: 11,
            color: C.white,
            alignment: "right" as const,
            margin: [0, 14, 0, 0] as [number, number, number, number],
            width: 120,
          },
        ],
        columnGap: 8,
        absolutePosition: { x: 25, y: 8 },
        width: PW - 50,
      },
    ],
  };
}

// ─── HTML email ───────────────────────────────────────────────────────────────

export async function buildPayrollEmailHtml(
  weekFrom: string,
  weekTo: string,
  rows: PayrollCalcRow[],
  totals: PayrollExportTotals,
  introMessage?: string,
): Promise<string> {
  const logoDataUrl = await getCompanyLogoDataUrl();

  const th = (t: string) =>
    `<th style="padding:6px 4px;background:${C.navy};color:${C.white};font-size:13px;text-align:center;font-weight:600;border:none">${escapeHtml(t)}</th>`;

  const td = (t: string, opts: { align?: string; color?: string; bold?: boolean; bg?: string } = {}) =>
    `<td style="padding:5px 4px;font-size:14px;text-align:${opts.align ?? "left"};color:${opts.color ?? C.navy};font-weight:${opts.bold ? "700" : "400"};background:${opts.bg ?? C.white};border-bottom:1px solid #DDE3EA">${t}</td>`;

  const dataRows = rows
    .map((r, i) => {
      const bg = i % 2 === 0 ? C.white : C.lightGray;
      return `<tr>
        ${td(escapeHtml(String(i + 1)), { align: "center", bold: true, bg })}
        ${td(escapeHtml(payrollEmployeeLabel(r)), { bg })}
        ${td(escapeHtml(fmt(r.rateNum)), { align: "right", color: C.muted, bg })}
        ${td(r.weekHours > 0 ? escapeHtml(fmtH(r.weekHours)) : "—", { align: "right", bg })}
        ${td(r.prevSatHours > 0 ? escapeHtml(fmtH(r.prevSatHours)) : "—", { align: "right", color: C.gold, bg })}
        ${td(escapeHtml(fmtH(r.totalHours)), { align: "right", bold: true, bg })}
        ${td(escapeHtml(fmt(r.grossPay)), { align: "right", color: C.muted, bg })}
        ${td(r.totalZaliczka > 0 ? escapeHtml(fmt(r.totalZaliczka)) : "—", { align: "right", bg })}
        ${td(r.totalExtraCosts > 0 ? escapeHtml(fmt(r.totalExtraCosts)) : "—", { align: "right", color: C.green, bg })}
        ${td(escapeHtml(payrollNetDisplayText(r)), { align: "right", bold: true, color: r.leaveStatus ? C.navy : C.red, bg })}
        ${td(escapeHtml(r.emp.settled ? "Rozliczony" : "Oczekuje"), {
          align: "center",
          color: r.emp.settled ? C.green : C.gold,
          bold: r.emp.settled,
          bg,
        })}
      </tr>`;
    })
    .join("");

  const mkSumRow = (
    label: string,
    weekH: number,
    prevH: number,
    totH: number,
    gross: number,
    zal: number,
    extra: number,
    net: number,
    bold = false,
  ) => {
    const bg = C.lightNavy;
    return `<tr style="background:${bg}">
      ${td("", { bg })}
      ${td(escapeHtml(label), { bold: true, bg })}
      ${td("", { bg })}
      ${td(weekH > 0 ? escapeHtml(fmtH(weekH)) : "—", { align: "right", bold, bg })}
      ${td(prevH > 0 ? escapeHtml(fmtH(prevH)) : "—", { align: "right", bold, color: C.gold, bg })}
      ${td(escapeHtml(fmtH(totH)), { align: "right", bold: true, bg })}
      ${td(escapeHtml(fmt(gross)), { align: "right", bold, color: C.muted, bg })}
      ${td(zal > 0 ? escapeHtml(fmt(zal)) : "—", { align: "right", bold, bg })}
      ${td(extra > 0 ? escapeHtml(fmt(extra)) : "—", { align: "right", bold, color: C.green, bg })}
      ${td(net > 0 || bold ? escapeHtml(fmt(net)) : "—", { align: "right", bold: true, color: C.red, bg })}
      ${td("", { bg })}
    </tr>`;
  };

  const sumRows = [
    mkSumRow(
      "Tydzień Pn–So",
      totals.totalWeekHours,
      0,
      totals.totalWeekHours,
      totals.totalWeekGross,
      totals.totalWeekZaliczka,
      0,
      totals.totalWeekGross - totals.totalWeekZaliczka,
    ),
    ...(totals.totalPrevSatHours > 0
      ? [
          mkSumRow(
            PREV_SAT_SHORT,
            0,
            totals.totalPrevSatHours,
            totals.totalPrevSatHours,
            totals.totalPrevSatGross,
            totals.totalPrevSatZaliczka,
            0,
            totals.totalPrevSatGross - totals.totalPrevSatZaliczka,
          ),
        ]
      : []),
    mkSumRow(
      "RAZEM",
      totals.totalWeekHours,
      totals.totalPrevSatHours,
      totals.totalHoursAll,
      totals.totalGross,
      totals.totalZaliczkaSum,
      totals.totalExtraCostsSum,
      totals.totalNet,
      true,
    ),
  ].join("");

  const introBlock =
    introMessage?.trim()
      ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:${C.navy};white-space:pre-wrap">${escapeHtml(introMessage.trim())}</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="pl">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:Calibri,'Segoe UI',Arial,sans-serif;color:${C.navy}">
  <div style="max-width:960px;margin:0 auto;padding:16px">
    <div style="background:${C.navy};padding:14px 20px 12px;border-bottom:3px solid ${C.red}">
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="width:1%;white-space:nowrap;vertical-align:middle;padding-right:14px">
          <div style="display:inline-block;background:#fff;border-radius:6px;padding:4px 10px;line-height:0">
            <img src="${logoDataUrl}" alt="W&amp;G DOM" width="120" style="height:36px;width:auto;max-width:120px;display:block"/>
          </div>
        </td>
        <td style="font-size:22px;font-weight:700;color:${C.white};letter-spacing:0.02em;vertical-align:middle">LISTA PŁAC</td>
        <td align="right" style="font-size:14px;color:${C.white};opacity:0.95;vertical-align:middle;white-space:nowrap">${escapeHtml(fmtDate(weekFrom))} – ${escapeHtml(fmtDate(weekTo))}</td>
      </tr></table>
    </div>
    <div style="background:${C.white};padding:20px;border:1px solid #DDE3EA;border-top:none">
      ${introBlock}
      <p style="margin:0 0 14px;font-size:13px;line-height:1.6;color:${C.navy}">
        <strong>Okres:</strong> ${escapeHtml(fmtDate(weekFrom))} – ${escapeHtml(fmtDate(weekTo))}
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>Pracownicy:</strong> ${totals.employeeCount}
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>Rozliczeni:</strong> ${totals.settledCount}/${totals.employeeCount}
        &nbsp;&nbsp;|&nbsp;&nbsp;
        <strong>Do wypłaty (tydzień):</strong> <span style="color:${C.red};font-weight:700">${escapeHtml(fmt(totals.totalNet))} PLN</span>
        ${totals.cashTotalSaturday != null && totals.hasBiweeklyEmployees ? ` &nbsp;|&nbsp; <strong>Wypłata w sobotę ${escapeHtml(fmtDate(weekTo))}:</strong> <span style="color:${C.red};font-weight:700">${escapeHtml(fmt(totals.cashTotalSaturday))} PLN</span>` : ""}
      </p>
      ${totals.hasBiweeklyEmployees && totals.cashTotalSaturday != null ? `<p style="margin:0 0 14px;font-size:12px;line-height:1.5;color:${C.muted}">${payrollCashSummaryLines(totals, weekTo).map((l) => escapeHtml(l)).join(" · ")}</p>` : ""}
      <div style="overflow-x:auto">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;min-width:720px">
          <thead><tr>
            ${th("Lp.")}${th("Pracownik")}${th("Stawka")}${th("Tydzień")}${th("Sob.pr.")}${th("Razem h")}${th("Brutto")}${th("Zaliczki")}${th("Koszty")}${th("Do wypłaty")}${th("Status")}
          </tr></thead>
          <tbody>${dataRows}${sumRows}</tbody>
        </table>
      </div>
      <p style="margin:20px 0 0;padding:12px 14px;background:${C.lightNavy};border-left:3px solid ${C.red};font-size:13px;line-height:1.5;color:${C.muted}">
        W załącznikach znajdują się pełne dokumenty <strong>PDF</strong> i <strong>Word</strong> z listą płac
        (strona 2: rozpis tygodniowy; karta dodatkowych godzin ze stawką i kwotą; ewent. Sob. poprz.).
      </p>
      <p style="margin:12px 0 0;font-size:13px;color:#8A9BB0">
        W&amp;G DOM — wygenerowano ${escapeHtml(new Date().toLocaleDateString("pl-PL"))}
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export async function generatePayrollPdfBlob(
  weekFrom: string,
  weekTo: string,
  rows: PayrollCalcRow[],
  totals: PayrollExportTotals,
  weeklyGrid: PayrollWeeklyGrid | null,
  extraHourLines: WeekExtraHourLine[],
  prevSatDetails: PrevSatDetailLine[],
  prevSatIso: string,
  jobWorkLines: PayrollJobWorkLine[] = [],
  extraCostLines: WeekExtraCostLine[] = [],
): Promise<Blob> {
  const pdfMake = await loadPdfMake();
  const logoDataUrl = await getCompanyLogoDataUrl();

  const hdrRow = ["Lp.", "Pracownik", "Stawka (PLN/h)", "Tydzień", "Sob.pr.", "Razem h", "Brutto (PLN)", "Zaliczki (PLN)", "Koszty (PLN)", "Do wypłaty (PLN)", "Status"].map((t) => ({
    text: t,
    bold: true,
    color: C.white,
    fillColor: C.navy,
    fontSize: 9,
    alignment: "center" as const,
    margin: [2, 3, 2, 3] as [number, number, number, number],
  }));

  const dataRows = rows.map((r, i) => {
    const bg = i % 2 === 0 ? C.white : C.lightGray;
    return [
      { text: String(i + 1), alignment: "center" as const, fillColor: bg, bold: true, fontSize: 10 },
      { text: payrollEmployeeLabel(r), fillColor: bg, fontSize: r.biweekly ? 9 : 10 },
      { text: `${fmt(r.rateNum)}`, alignment: "right" as const, fillColor: bg, color: C.muted, fontSize: 10 },
      { text: r.weekHours > 0 ? fmtH(r.weekHours) : "—", alignment: "right" as const, fillColor: bg, fontSize: 10 },
      { text: r.prevSatHours > 0 ? fmtH(r.prevSatHours) : "—", alignment: "right" as const, fillColor: bg, color: C.gold, fontSize: 10 },
      { text: fmtH(r.totalHours), alignment: "right" as const, fillColor: bg, bold: true, fontSize: 10 },
      { text: `${fmt(r.grossPay)}`, alignment: "right" as const, fillColor: bg, color: C.muted, fontSize: 10 },
      { text: r.totalZaliczka > 0 ? `${fmt(r.totalZaliczka)}` : "—", alignment: "right" as const, fillColor: bg, fontSize: 10 },
      { text: r.totalExtraCosts > 0 ? `${fmt(r.totalExtraCosts)}` : "—", alignment: "right" as const, fillColor: bg, color: C.green, fontSize: 10 },
      { text: payrollNetDisplayText(r), bold: true, color: r.leaveStatus ? C.navy : C.red, alignment: "right" as const, fillColor: bg, fontSize: 10 },
      {
        text: r.emp.settled ? "Rozliczony" : "Oczekuje",
        alignment: "center" as const,
        color: r.emp.settled ? C.green : C.gold,
        bold: r.emp.settled,
        fillColor: bg,
        fontSize: 9,
      },
    ];
  });

  const mkSum = (label: string, weekH: number, prevH: number, totH: number, gross: number, zal: number, extra: number, net: number, bold = false) => [
    { text: "", fillColor: C.lightNavy },
    { text: label, bold: true, fillColor: C.lightNavy, fontSize: 9 },
    { text: "", fillColor: C.lightNavy },
    { text: weekH > 0 ? fmtH(weekH) : "—", bold, alignment: "right" as const, fillColor: C.lightNavy, fontSize: 10 },
    { text: prevH > 0 ? fmtH(prevH) : "—", bold, alignment: "right" as const, fillColor: C.lightNavy, color: C.gold, fontSize: 10 },
    { text: fmtH(totH), bold: true, alignment: "right" as const, fillColor: C.lightNavy, fontSize: 10 },
    { text: `${fmt(gross)}`, bold, alignment: "right" as const, fillColor: C.lightNavy, color: C.muted, fontSize: 10 },
    { text: zal > 0 ? `${fmt(zal)}` : "—", bold, alignment: "right" as const, fillColor: C.lightNavy, fontSize: 10 },
    { text: extra > 0 ? `${fmt(extra)}` : "—", bold, alignment: "right" as const, fillColor: C.lightNavy, color: C.green, fontSize: 10 },
    { text: net > 0 || bold ? `${fmt(net)}` : "—", bold: true, color: C.red, alignment: "right" as const, fillColor: C.lightNavy, fontSize: 11 },
    { text: "", fillColor: C.lightNavy },
  ];

  const sumRows = [
    mkSum("Tydzień Pn–So", totals.totalWeekHours, 0, totals.totalWeekHours, totals.totalWeekGross, totals.totalWeekZaliczka, 0, totals.totalWeekGross - totals.totalWeekZaliczka),
    ...(totals.totalPrevSatHours > 0
      ? [mkSum(PREV_SAT_SHORT, 0, totals.totalPrevSatHours, totals.totalPrevSatHours, totals.totalPrevSatGross, totals.totalPrevSatZaliczka, 0, totals.totalPrevSatGross - totals.totalPrevSatZaliczka)]
      : []),
    mkSum("RAZEM (tydzień)", totals.totalWeekHours, totals.totalPrevSatHours, totals.totalHoursAll, totals.totalGross, totals.totalZaliczkaSum, totals.totalExtraCostsSum, totals.totalNet, true),
    ...(totals.hasBiweeklyEmployees && totals.cashTotalSaturday != null
      ? [mkSum(`Wypłata w sobotę ${fmtDate(weekTo)}`, 0, 0, 0, 0, 0, 0, totals.cashTotalSaturday, true)]
      : []),
  ];

  const extraHourTotals = payrollExtraHourTotals(extraHourLines);
  const extraHoursGrid = buildPayrollExtraHoursGrid(extraHourLines, weekFrom);
  const extraCostTotal = payrollExtraCostTotals(extraCostLines);

  const pdfTableLayout = {
    hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
    vLineWidth: () => 0,
    hLineColor: () => "#DDE3EA",
    paddingLeft: () => 4,
    paddingRight: () => 4,
    paddingTop: () => 4,
    paddingBottom: () => 4,
  };

  const pdfHdr = (t: string) => ({
    text: t,
    bold: true,
    color: C.white,
    fillColor: C.navy,
    fontSize: 9,
    alignment: "center" as const,
    margin: [1, 3, 1, 3] as [number, number, number, number],
  });

  const pdfDayCell = (text: string, bg: string) => ({
    text,
    fillColor: bg,
    fontSize: 8.5,
    alignment: "center" as const,
    lineHeight: 1.15,
  });

  const dailyDetailPdfBlock =
    weeklyGrid && weeklyGrid.rows.length > 0
      ? [
          {
            stack: [
              {
                text: "Szczegółowa lista płac — rozpis tygodniowy",
                bold: true,
                fontSize: 13,
                color: C.navy,
                margin: [0, 0, 0, 4] as [number, number, number, number],
              },
              {
                text: `Tydzień: ${fmtDate(weekFrom)} – ${fmtDate(weekTo)} · godziny od–do w kolumnach dni`,
                fontSize: 10,
                color: C.muted,
                margin: [0, 0, 0, 10] as [number, number, number, number],
              },
              {
                table: {
                  headerRows: 1,
                  dontBreakRows: true,
                  widths: [80, ...weeklyGrid.dayHeaders.map(() => "*"), 34],
                  body: [
                    [
                      pdfHdr("Pracownik"),
                      ...weeklyGrid.dayHeaders.map((h) => pdfHdr(h)),
                      pdfHdr("Razem"),
                    ],
                    ...weeklyGrid.rows.map((row, i) => {
                      const bg = i % 2 === 0 ? C.white : C.lightGray;
                      return [
                        { text: row.name, fillColor: bg, fontSize: 9.5, alignment: "left" as const },
                        ...row.dayCells.map((cell) => pdfDayCell(cell, bg)),
                        { text: row.weekHours > 0 ? fmtH(row.weekHours) : "—", fillColor: bg, fontSize: 9.5, bold: true, alignment: "right" as const },
                      ];
                    }),
                  ],
                },
                layout: pdfTableLayout,
              },
            ],
            pageBreak: "before" as const,
            unbreakable: false,
          },
        ]
      : [];

  const extraHourAppendixPdfBlock =
    extraHoursGrid && extraHoursGrid.rows.length > 0
      ? [
          {
            stack: [
              {
                text: "Karta dodatkowych godzin",
                bold: true,
                fontSize: 13,
                color: C.navy,
                margin: [0, 0, 0, 4] as [number, number, number, number],
              },
              {
                text: `Tydzień: ${fmtDate(weekFrom)} – ${fmtDate(weekTo)} · bloki dodatkowych godzin w kolumnach dni (od–do, opis, godziny, kwota brutto)`,
                fontSize: 10,
                color: C.muted,
                margin: [0, 0, 0, 10] as [number, number, number, number],
              },
              {
                table: {
                  headerRows: 1,
                  dontBreakRows: true,
                  widths: [72, ...extraHoursGrid.dayHeaders.map(() => "*"), 32, 44],
                  body: [
                    [
                      pdfHdr("Pracownik"),
                      ...extraHoursGrid.dayHeaders.map((h) => pdfHdr(h)),
                      pdfHdr("Razem h"),
                      pdfHdr("Kwota"),
                    ],
                    ...extraHoursGrid.rows.map((row, i) => {
                      const bg = i % 2 === 0 ? C.white : C.lightGray;
                      const nameCell = row.rate > 0
                        ? { text: `${row.name}\n${fmt(row.rate)} PLN/h`, fillColor: bg, fontSize: 9, alignment: "left" as const, lineHeight: 1.15 }
                        : { text: row.name, fillColor: bg, fontSize: 9.5, alignment: "left" as const };
                      return [
                        nameCell,
                        ...row.dayCells.map((cell) => pdfDayCell(cell, bg)),
                        {
                          text: row.weekHours > 0 ? fmtH(row.weekHours) : "—",
                          fillColor: bg,
                          fontSize: 9.5,
                          bold: true,
                          alignment: "right" as const,
                        },
                        {
                          text: row.weekAmount > 0 ? fmt(row.weekAmount) : "—",
                          fillColor: bg,
                          fontSize: 9.5,
                          bold: true,
                          alignment: "right" as const,
                          color: row.weekAmount > 0 ? C.red : C.muted,
                        },
                      ];
                    }),
                    [
                      {
                        text: "Razem dodatkowe godziny",
                        bold: true,
                        colSpan: extraHoursGrid.dayHeaders.length + 1,
                        fillColor: C.lightNavy,
                        fontSize: 9,
                        alignment: "right" as const,
                      },
                      ...Array.from({ length: extraHoursGrid.dayHeaders.length }, () => ({})),
                      {
                        text: fmtH(extraHourTotals.hours),
                        bold: true,
                        fillColor: C.lightNavy,
                        alignment: "right" as const,
                        fontSize: 10,
                      },
                      {
                        text: fmt(extraHourTotals.amount),
                        bold: true,
                        fillColor: C.lightNavy,
                        alignment: "right" as const,
                        fontSize: 10,
                        color: C.red,
                      },
                    ],
                  ],
                },
                layout: pdfTableLayout,
              },
              {
                text: `Suma kosztu dodatkowych godzin w tygodniu: ${fmt(extraHourTotals.amount)} PLN brutto (${fmtH(extraHourTotals.hours)})`,
                fontSize: 10,
                bold: true,
                color: C.navy,
                margin: [0, 8, 0, 0] as [number, number, number, number],
              },
            ],
            pageBreak: "before" as const,
            unbreakable: false,
          },
        ]
      : [];

  const extraCostAppendixPdfBlock =
    extraCostLines.length > 0
      ? [
          {
            stack: [
              {
                text: "Koszty do zwrotu — szczegóły",
                bold: true,
                fontSize: 13,
                color: C.navy,
                margin: [0, 0, 0, 4] as [number, number, number, number],
              },
              {
                text: `Tydzień: ${fmtDate(weekFrom)} – ${fmtDate(weekTo)} · zaakceptowane paragony / wydatki doliczone do kolumny „Koszty” i „Do wypłaty” (brutto − zaliczki + koszty)`,
                fontSize: 10,
                color: C.muted,
                margin: [0, 0, 0, 10] as [number, number, number, number],
              },
              {
                table: {
                  headerRows: 1,
                  dontBreakRows: true,
                  widths: [72, 52, "*", 48],
                  body: [
                    [
                      pdfHdr("Pracownik"),
                      pdfHdr("Stanowisko"),
                      pdfHdr("Opis kosztu"),
                      pdfHdr("Kwota"),
                    ],
                    ...extraCostLines.map((line, i) => {
                      const bg = i % 2 === 0 ? C.white : C.lightGray;
                      return [
                        { text: line.name, fillColor: bg, fontSize: 9.5, alignment: "left" as const },
                        { text: line.position || "—", fillColor: bg, fontSize: 9, color: C.muted, alignment: "left" as const },
                        { text: line.description, fillColor: bg, fontSize: 9, alignment: "left" as const },
                        {
                          text: line.amount > 0 ? fmt(line.amount) : "—",
                          fillColor: bg,
                          fontSize: 9.5,
                          bold: true,
                          alignment: "right" as const,
                          color: line.amount > 0 ? C.green : C.muted,
                        },
                      ];
                    }),
                    [
                      {
                        text: "Razem koszty do zwrotu",
                        bold: true,
                        colSpan: 3,
                        fillColor: C.lightNavy,
                        fontSize: 9,
                        alignment: "right" as const,
                      },
                      {},
                      {},
                      {
                        text: fmt(extraCostTotal),
                        bold: true,
                        fillColor: C.lightNavy,
                        alignment: "right" as const,
                        fontSize: 10,
                        color: C.green,
                      },
                    ],
                  ],
                },
                layout: pdfTableLayout,
              },
              {
                text: `Suma kosztów do zwrotu w tygodniu: +${fmt(extraCostTotal)} PLN (doliczone do wypłaty)`,
                fontSize: 10,
                bold: true,
                color: C.navy,
                margin: [0, 8, 0, 0] as [number, number, number, number],
              },
            ],
            pageBreak: "before" as const,
            unbreakable: false,
          },
        ]
      : [];

  const prevSatAppendixPdfBlock =
    prevSatDetails.length > 0
      ? [
          {
            stack: [
              {
                text: "Sobota poprzedniego tygodnia — szczegóły",
                bold: true,
                fontSize: 13,
                color: C.navy,
                margin: [0, 0, 0, 4] as [number, number, number, number],
              },
              {
                text: `Data: ${fmtDate(prevSatIso)} · wypłata w tygodniu ${fmtDate(weekFrom)} – ${fmtDate(weekTo)}`,
                fontSize: 10,
                color: C.gold,
                margin: [0, 0, 0, 10] as [number, number, number, number],
              },
              {
                table: {
                  headerRows: 1,
                  dontBreakRows: true,
                  widths: [72, 44, 50, 34, 40, 40, "*"],
                  body: [
                    ["Pracownik", "Data", "Od–Do", "Godz.", "Zaliczka", "Brutto", "Opisy / uwagi"].map((t) => ({
                      text: t,
                      bold: true,
                      color: C.white,
                      fillColor: C.navy,
                      fontSize: 9,
                      alignment: "center" as const,
                    })),
                    ...prevSatDetails.map((line, i) => {
                      const bg = i % 2 === 0 ? C.white : C.lightGray;
                      return [
                        { text: line.name, fillColor: bg, fontSize: 10 },
                        { text: line.dateLabel, fillColor: bg, alignment: "center" as const, fontSize: 9, color: C.gold },
                        { text: line.timeRange, fillColor: bg, alignment: "center" as const, fontSize: 9 },
                        { text: line.hours > 0 ? fmtH(line.hours) : "—", fillColor: bg, alignment: "right" as const, fontSize: 10, bold: line.hours > 0 },
                        { text: line.zaliczka > 0 ? fmt(line.zaliczka) : "—", fillColor: bg, alignment: "right" as const, fontSize: 9, color: line.zaliczka > 0 ? C.red : C.muted },
                        { text: line.gross > 0 ? fmt(line.gross) : "—", fillColor: bg, alignment: "right" as const, fontSize: 9, color: C.muted },
                        { text: line.notesText, fillColor: bg, color: C.muted, fontSize: 9, alignment: "left" as const },
                      ];
                    }),
                  ],
                },
                layout: {
                  hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
                  vLineWidth: () => 0,
                  hLineColor: () => "#DDE3EA",
                  paddingLeft: () => 5,
                  paddingRight: () => 5,
                  paddingTop: () => 4,
                  paddingBottom: () => 4,
                },
              },
            ],
            pageBreak: "before" as const,
            unbreakable: false,
          },
        ]
      : [];

  const consolidatedJobWorkLines = consolidatePayrollJobWorkLines(jobWorkLines);
  const jobWorkGrid = buildPayrollJobWorkGrid(consolidatedJobWorkLines, weekFrom);
  const totalJobWorkHours = consolidatedJobWorkLines.reduce((s, l) => s + l.hours, 0);
  const totalJobWorkCost = consolidatedJobWorkLines.reduce((s, l) => s + l.cost, 0);

  const jobWorkAppendixPdfBlock =
    jobWorkGrid && jobWorkGrid.rows.length > 0
      ? [
          {
            stack: [
              {
                text: "Praca na robotach — szczegóły tygodnia",
                bold: true,
                fontSize: 13,
                color: C.navy,
                margin: [0, 0, 0, 4] as [number, number, number, number],
              },
              {
                text: `Tydzień: ${fmtDate(weekFrom)} – ${fmtDate(weekTo)} · siatka tygodniowa — adres robocy i godziny w kolumnach dni (z kart robót)`,
                fontSize: 10,
                color: C.muted,
                margin: [0, 0, 0, 10] as [number, number, number, number],
              },
              {
                table: {
                  headerRows: 1,
                  dontBreakRows: true,
                  widths: [72, ...jobWorkGrid.dayHeaders.map(() => "*"), 34, 40],
                  body: [
                    [
                      pdfHdr("Pracownik"),
                      ...jobWorkGrid.dayHeaders.map((h) => pdfHdr(h)),
                      pdfHdr("Razem"),
                      pdfHdr("Koszt"),
                    ],
                    ...jobWorkGrid.rows.map((row, i) => {
                      const bg = i % 2 === 0 ? C.white : C.lightGray;
                      return [
                        { text: row.name, fillColor: bg, fontSize: 9, alignment: "left" as const },
                        ...row.dayCells.map((cell) => pdfDayCell(cell, bg)),
                        {
                          text: row.weekHours > 0 ? fmtH(row.weekHours) : "—",
                          fillColor: bg,
                          fontSize: 9,
                          bold: true,
                          alignment: "right" as const,
                        },
                        {
                          text: row.weekCost > 0 ? fmt(row.weekCost) : "—",
                          fillColor: bg,
                          fontSize: 8.5,
                          alignment: "right" as const,
                        },
                      ];
                    }),
                    [
                      { text: "Razem", bold: true, colSpan: jobWorkGrid.dayHeaders.length + 1, fillColor: C.lightNavy, fontSize: 9, alignment: "right" as const },
                      ...Array.from({ length: jobWorkGrid.dayHeaders.length }, () => ({})),
                      { text: fmtH(totalJobWorkHours), bold: true, fillColor: C.lightNavy, fontSize: 9, alignment: "right" as const },
                      { text: fmt(totalJobWorkCost), bold: true, fillColor: C.lightNavy, fontSize: 9, alignment: "right" as const },
                    ],
                  ],
                },
                layout: pdfTableLayout,
              },
            ],
            pageBreak: "before" as const,
            unbreakable: false,
          },
        ]
      : [];

  const docDef: PdfDocDef = {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [25, 68, 25, 32],
    header: () => pdfPayrollHeader(logoDataUrl, weekFrom, weekTo),
    footer: (cur: number, total: number) => ({
      stack: [
        { canvas: [{ type: "rect", x: 0, y: 0, w: PW, h: 22, color: C.lightNavy }] },
        {
          columns: [
            { text: `W&G DOM — Lista Płac — wygenerowano ${new Date().toLocaleDateString("pl-PL")}`, fontSize: 9, color: C.navy },
            { text: `Strona ${cur}/${total}`, fontSize: 9, color: C.navy, alignment: "right" },
          ],
          absolutePosition: { x: 25, y: 5 },
          width: PW - 50,
        },
      ],
    }),
    content: [
      {
        columns: [
          { text: [{ text: "Okres: ", bold: true, color: C.navy }, { text: `${fmtDate(weekFrom)} – ${fmtDate(weekTo)}`, color: C.navy }] },
          { text: [{ text: "Pracownicy: ", bold: true, color: C.navy }, { text: String(totals.employeeCount), color: C.navy }] },
          { text: [{ text: "Rozliczeni: ", bold: true, color: C.navy }, { text: `${totals.settledCount}/${totals.employeeCount}`, color: C.navy }] },
          {
            text: [
              { text: totals.hasBiweeklyEmployees && totals.cashTotalSaturday != null ? "Wypłata w sobotę: " : "Do wypłaty: ", bold: true, color: C.navy },
              { text: `${fmt(totals.hasBiweeklyEmployees && totals.cashTotalSaturday != null ? totals.cashTotalSaturday : totals.totalNet)} PLN`, bold: true, color: C.red },
            ],
            alignment: "right",
          },
        ],
        fontSize: 11,
        margin: [0, 0, 0, 6],
      },
      ...(totals.hasBiweeklyEmployees && totals.cashTotalSaturday != null
        ? [{
            text: payrollCashSummaryLines(totals, weekTo).join("  ·  "),
            fontSize: 9,
            color: C.muted,
            margin: [0, 0, 0, 10] as [number, number, number, number],
          }]
        : []),
      ...(totals.totalExtraCostsSum > 0
        ? [{
            text: `Kolumna „Koszty”: +${fmt(totals.totalExtraCostsSum)} PLN — zwrot zaakceptowanych wydatków (szczegóły w załączniku poniżej).`,
            fontSize: 9,
            color: C.green,
            margin: [0, 0, 0, 8] as [number, number, number, number],
          }]
        : []),
      {
        table: {
          headerRows: 1,
          widths: [16, "*", 40, 36, 36, 38, 44, 44, 44, 50, 40],
          body: [hdrRow, ...dataRows, ...sumRows],
        },
        layout: {
          hLineWidth: (i: number, node: { table: { body: unknown[] } }) => (i === 0 || i === node.table.body.length ? 0 : 0.5),
          vLineWidth: () => 0,
          hLineColor: () => "#DDE3EA",
          paddingLeft: () => 5,
          paddingRight: () => 5,
          paddingTop: () => 4,
          paddingBottom: () => 4,
        },
      },
      ...dailyDetailPdfBlock,
      ...extraHourAppendixPdfBlock,
      ...extraCostAppendixPdfBlock,
      ...prevSatAppendixPdfBlock,
      ...jobWorkAppendixPdfBlock,
    ],
    defaultStyle: { font: "Roboto", fontSize: 11, color: C.navy },
  };

  // pdfmake 0.3.x — getBlob() zwraca Promise (stary callback już nie działa)
  return pdfMake.createPdf(docDef).getBlob();
}

// ─── Word ─────────────────────────────────────────────────────────────────────

export async function generatePayrollWordBlob(
  weekFrom: string,
  weekTo: string,
  rows: PayrollCalcRow[],
  totals: PayrollExportTotals,
  weeklyGrid: PayrollWeeklyGrid | null,
  extraHourLines: WeekExtraHourLine[],
  prevSatDetails: PrevSatDetailLine[],
  prevSatIso: string,
  extraCostLines: WeekExtraCostLine[] = [],
): Promise<Blob> {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, ImageRun, WidthType, AlignmentType, BorderStyle, PageBreak, VerticalAlign } = await import("docx");

  const logoDataUrl = await getCompanyLogoDataUrl();
  const logoBytes = logoBytesFromDataUrl(logoDataUrl);
  const extraHourTotals = payrollExtraHourTotals(extraHourLines);
  const extraHoursGrid = buildPayrollExtraHoursGrid(extraHourLines, weekFrom);
  const extraCostTotal = payrollExtraCostTotals(extraCostLines);
  const bNone = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const bThin = { style: BorderStyle.SINGLE, size: 2, color: "DDE3EA" };
  const mkCell = (txt: string, opts: { bold?: boolean; fill?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string; size?: number } = {}) =>
    new TableCell({
      children: [
        new Paragraph({
          children: [new TextRun({ text: txt, bold: opts.bold ?? false, size: opts.size ?? 18, color: opts.color ?? "344254", font: "Calibri" })],
          alignment: opts.align ?? AlignmentType.CENTER,
        }),
      ],
      shading: opts.fill ? { fill: opts.fill, color: opts.fill } : undefined,
      margins: { top: 90, bottom: 90, left: 120, right: 120 },
      borders: { top: bThin, bottom: bThin, left: bNone, right: bNone },
    });
  const mkCellMultiline = (txt: string, opts: { fill?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; color?: string; size?: number } = {}) =>
    new TableCell({
      children: (txt || "—").split("\n").map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line, size: opts.size ?? 16, color: opts.color ?? "6B7A8D", font: "Calibri" })],
            alignment: opts.align ?? AlignmentType.LEFT,
          }),
      ),
      shading: opts.fill ? { fill: opts.fill, color: opts.fill } : undefined,
      margins: { top: 90, bottom: 90, left: 120, right: 120 },
      borders: { top: bThin, bottom: bThin, left: bNone, right: bNone },
    });
  const colHeaders = ["Lp.", "Pracownik", "Stawka", "Tydz.", "Sob.pr.", "Razem h", "Brutto", "Zaliczki", "Koszty", "Do wyplaty", "Status"];
  const mkWordSum = (label: string, weekH: number, prevH: number, totH: number, gross: number, zal: number, extra: number, net: number, bold = false) =>
    new TableRow({
      children: [
        mkCell("", { fill: "EDF1F6" }),
        mkCell(label, { bold: true, fill: "EDF1F6", align: AlignmentType.LEFT, size: bold ? 18 : 16 }),
        mkCell("", { fill: "EDF1F6" }),
        mkCell(weekH > 0 ? fmtH(weekH) : "-", { bold, fill: "EDF1F6", size: 20 }),
        mkCell(prevH > 0 ? fmtH(prevH) : "-", { bold, fill: "EDF1F6", color: prevH > 0 ? "7B5800" : "6B7A8D", size: 20 }),
        mkCell(fmtH(totH), { bold: true, fill: "EDF1F6", size: 20 }),
        mkCell(`${fmt(gross)} PLN`, { bold, fill: "EDF1F6", color: "6B7A8D", size: 20 }),
        mkCell(zal > 0 ? `${fmt(zal)} PLN` : "-", { bold, fill: "EDF1F6", color: "C0392B", size: 20 }),
        mkCell(extra > 0 ? `${fmt(extra)} PLN` : "-", { bold, fill: "EDF1F6", color: extra > 0 ? "1E7E34" : "6B7A8D", size: 20 }),
        mkCell(`${fmt(net)} PLN`, { bold: true, fill: "EDF1F6", color: "C0392B", size: bold ? 22 : 18 }),
        mkCell("", { fill: "EDF1F6" }),
      ],
    });
  const doc = new Document({
    styles: { default: { document: { run: { font: "Calibri" } } } },
    sections: [
      {
        properties: { page: { margin: { top: 800, bottom: 800, left: 1000, right: 1000 } } },
        children: [
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 28, type: WidthType.PERCENTAGE },
                    verticalAlign: VerticalAlign.CENTER,
                    borders: { top: bNone, bottom: bNone, left: bNone, right: bNone },
                    margins: { top: 0, bottom: 120, left: 0, right: 160 },
                    children: [
                      new Paragraph({
                        children: [
                          new ImageRun({
                            data: logoBytes,
                            transformation: { width: 150, height: 44 },
                            type: "png",
                          }),
                        ],
                      }),
                    ],
                  }),
                  new TableCell({
                    verticalAlign: VerticalAlign.CENTER,
                    borders: { top: bNone, bottom: bNone, left: bNone, right: bNone },
                    margins: { top: 0, bottom: 120, left: 0, right: 0 },
                    children: [
                      new Paragraph({
                        children: [new TextRun({ text: "LISTA PŁAC", bold: true, size: 56, color: "C0392B", font: "Calibri" })],
                        alignment: AlignmentType.LEFT,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Okres: ", bold: true, size: 24, color: "344254", font: "Calibri" }),
              new TextRun({ text: `${fmtDate(weekFrom)} - ${fmtDate(weekTo)}   `, size: 24, color: "344254", font: "Calibri" }),
              new TextRun({ text: "Pracownicy: ", bold: true, size: 24, color: "344254", font: "Calibri" }),
              new TextRun({ text: `${totals.employeeCount}   `, size: 24, color: "344254", font: "Calibri" }),
              new TextRun({ text: "Rozliczeni: ", bold: true, size: 24, color: "344254", font: "Calibri" }),
              new TextRun({ text: `${totals.settledCount}/${totals.employeeCount}   `, size: 24, color: "344254", font: "Calibri" }),
              new TextRun({ text: totals.hasBiweeklyEmployees && totals.cashTotalSaturday != null ? "Wyplata w sobote: " : "Do wyplaty: ", bold: true, size: 24, color: "344254", font: "Calibri" }),
              new TextRun({ text: `${fmt(totals.hasBiweeklyEmployees && totals.cashTotalSaturday != null ? totals.cashTotalSaturday : totals.totalNet)} PLN`, bold: true, size: 24, color: "C0392B", font: "Calibri" }),
            ],
            spacing: { after: totals.hasBiweeklyEmployees && totals.cashTotalSaturday != null ? 120 : 280 },
          }),
          ...(totals.hasBiweeklyEmployees && totals.cashTotalSaturday != null
            ? [
                new Paragraph({
                  spacing: { after: 280 },
                  children: [
                    new TextRun({
                      text: payrollCashSummaryLines(totals, weekTo).join("  ·  "),
                      size: 20,
                      color: "6B7A8D",
                      font: "Calibri",
                    }),
                  ],
                }),
              ]
            : []),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: colHeaders.map((h) => mkCell(h, { bold: true, fill: "344254", color: "FFFFFF", size: 20 })),
                tableHeader: true,
              }),
              ...rows.map((r, i) =>
                new TableRow({
                  children: [
                    mkCell(String(i + 1), { bold: true, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 20 }),
                    mkCell(payrollEmployeeLabel(r), { align: AlignmentType.LEFT, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: r.biweekly ? 18 : 20 }),
                    mkCell(`${fmt(r.rateNum)}`, { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: "6B7A8D", size: 20 }),
                    mkCell(r.weekHours > 0 ? fmtH(r.weekHours) : "-", { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 20 }),
                    mkCell(r.prevSatHours > 0 ? fmtH(r.prevSatHours) : "-", { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: r.prevSatHours > 0 ? "7B5800" : "6B7A8D", size: 20 }),
                    mkCell(fmtH(r.totalHours), { bold: true, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 20 }),
                    mkCell(`${fmt(r.grossPay)} PLN`, { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: "6B7A8D", size: 20 }),
                    mkCell(r.totalZaliczka > 0 ? `${fmt(r.totalZaliczka)} PLN` : "-", { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: r.totalZaliczka > 0 ? "C0392B" : "6B7A8D", size: 20 }),
                    mkCell(r.totalExtraCosts > 0 ? `${fmt(r.totalExtraCosts)} PLN` : "-", { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: r.totalExtraCosts > 0 ? "1E7E34" : "6B7A8D", size: 20 }),
                    mkCell(r.leaveStatus ? `${leaveTypeDisplayLabel(r.leaveStatus, false)}` : `${fmt(r.netPay)} PLN`, { bold: true, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: r.leaveStatus ? "344254" : "C0392B", size: 20 }),
                    mkCell(r.emp.settled ? "Rozliczony" : "Oczekuje", { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: r.emp.settled ? "1E7E34" : "7B5800", bold: r.emp.settled, size: 19 }),
                  ],
                }),
              ),
              mkWordSum("Tydzien Pn-So", totals.totalWeekHours, 0, totals.totalWeekHours, totals.totalWeekGross, totals.totalWeekZaliczka, 0, totals.totalWeekGross - totals.totalWeekZaliczka),
              ...(totals.totalPrevSatHours > 0
                ? [mkWordSum(PREV_SAT_SHORT, 0, totals.totalPrevSatHours, totals.totalPrevSatHours, totals.totalPrevSatGross, totals.totalPrevSatZaliczka, 0, totals.totalPrevSatGross - totals.totalPrevSatZaliczka)]
                : []),
              mkWordSum("RAZEM (tydzien)", totals.totalWeekHours, totals.totalPrevSatHours, totals.totalHoursAll, totals.totalGross, totals.totalZaliczkaSum, totals.totalExtraCostsSum, totals.totalNet, true),
              ...(totals.hasBiweeklyEmployees && totals.cashTotalSaturday != null
                ? [mkWordSum(`Wyplata w sobote ${fmtDate(weekTo)}`, 0, 0, 0, 0, 0, 0, totals.cashTotalSaturday, true)]
                : []),
            ],
          }),
          ...(totals.totalExtraCostsSum > 0
            ? [
                new Paragraph({
                  spacing: { before: 120, after: 120 },
                  children: [
                    new TextRun({
                      text: `Kolumna „Koszty”: +${fmt(totals.totalExtraCostsSum)} PLN — zwrot zaakceptowanych wydatków (szczegóły w załączniku).`,
                      size: 20,
                      color: "1E7E34",
                      font: "Calibri",
                    }),
                  ],
                }),
              ]
            : []),
          ...(weeklyGrid && weeklyGrid.rows.length > 0
            ? [
                new Paragraph({ children: [new PageBreak()] }),
                new Paragraph({
                  spacing: { after: 100 },
                  children: [new TextRun({ text: "Szczegółowa lista płac — rozpis tygodniowy", bold: true, size: 28, color: "344254", font: "Calibri" })],
                }),
                new Paragraph({
                  spacing: { after: 200 },
                  children: [
                    new TextRun({
                      text: `Tydzień: ${fmtDate(weekFrom)} – ${fmtDate(weekTo)} · godziny od–do w kolumnach dni`,
                      size: 22,
                      color: "6B7A8D",
                      font: "Calibri",
                    }),
                  ],
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: ["Pracownik", ...weeklyGrid.dayHeaders, "Razem"].map((h) =>
                        mkCell(h.replace("\n", " "), { bold: true, fill: "344254", color: "FFFFFF", size: 17 }),
                      ),
                      tableHeader: true,
                    }),
                    ...weeklyGrid.rows.map((row, i) =>
                      new TableRow({
                        cantSplit: true,
                        children: [
                          mkCell(row.name, { align: AlignmentType.LEFT, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 19 }),
                          ...row.dayCells.map((cell) =>
                            mkCellMultiline(cell, { align: AlignmentType.CENTER, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 16 }),
                          ),
                          mkCell(row.weekHours > 0 ? fmtH(row.weekHours) : "—", { bold: true, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 19 }),
                        ],
                      }),
                    ),
                  ],
                }),
              ]
            : []),
          ...(extraHoursGrid && extraHoursGrid.rows.length > 0
            ? [
                new Paragraph({ children: [new PageBreak()] }),
                new Paragraph({
                  spacing: { after: 100 },
                  children: [new TextRun({ text: "Karta dodatkowych godzin", bold: true, size: 28, color: "344254", font: "Calibri" })],
                }),
                new Paragraph({
                  spacing: { after: 200 },
                  children: [
                    new TextRun({
                      text: `Tydzień: ${fmtDate(weekFrom)} – ${fmtDate(weekTo)} · dodatkowe bloki w kolumnach dni (godziny i kwota brutto)`,
                      size: 22,
                      color: "6B7A8D",
                      font: "Calibri",
                    }),
                  ],
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: ["Pracownik", ...extraHoursGrid.dayHeaders, "Razem h", "Kwota"].map((h) =>
                        mkCell(h.replace("\n", " "), { bold: true, fill: "344254", color: "FFFFFF", size: 17 }),
                      ),
                      tableHeader: true,
                    }),
                    ...extraHoursGrid.rows.map((row, i) =>
                      new TableRow({
                        cantSplit: true,
                        children: [
                          mkCellMultiline(
                            row.rate > 0 ? `${row.name}\n${fmt(row.rate)} PLN/h` : row.name,
                            { align: AlignmentType.LEFT, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 17 },
                          ),
                          ...row.dayCells.map((cell) =>
                            mkCellMultiline(cell, { align: AlignmentType.CENTER, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 16 }),
                          ),
                          mkCell(row.weekHours > 0 ? fmtH(row.weekHours) : "—", { bold: true, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 19 }),
                          mkCell(row.weekAmount > 0 ? `${fmt(row.weekAmount)} PLN` : "—", {
                            bold: true,
                            fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6",
                            color: row.weekAmount > 0 ? "C0392B" : "6B7A8D",
                            size: 19,
                          }),
                        ],
                      }),
                    ),
                    new TableRow({
                      children: [
                        mkCell("Razem dodatkowe godziny", { bold: true, fill: "EDF1F6", align: AlignmentType.RIGHT, size: 16 }),
                        ...extraHoursGrid.dayHeaders.map(() => mkCell("", { fill: "EDF1F6" })),
                        mkCell(fmtH(extraHourTotals.hours), { bold: true, fill: "EDF1F6", size: 18 }),
                        mkCell(`${fmt(extraHourTotals.amount)} PLN`, { bold: true, fill: "EDF1F6", color: "C0392B", size: 18 }),
                      ],
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 200 },
                  children: [
                    new TextRun({
                      text: `Suma kosztu dodatkowych godzin: ${fmt(extraHourTotals.amount)} PLN brutto (${fmtH(extraHourTotals.hours)})`,
                      bold: true,
                      size: 22,
                      color: "344254",
                      font: "Calibri",
                    }),
                  ],
                }),
              ]
            : []),
          ...(extraCostLines.length > 0
            ? [
                new Paragraph({ children: [new PageBreak()] }),
                new Paragraph({
                  spacing: { after: 100 },
                  children: [new TextRun({ text: "Koszty do zwrotu — szczegóły", bold: true, size: 28, color: "344254", font: "Calibri" })],
                }),
                new Paragraph({
                  spacing: { after: 200 },
                  children: [
                    new TextRun({
                      text: `Tydzień: ${fmtDate(weekFrom)} – ${fmtDate(weekTo)} · zaakceptowane wydatki doliczone do kolumny „Koszty” i „Do wypłaty”`,
                      size: 22,
                      color: "6B7A8D",
                      font: "Calibri",
                    }),
                  ],
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: ["Pracownik", "Stanowisko", "Opis kosztu", "Kwota"].map((h) =>
                        mkCell(h, { bold: true, fill: "344254", color: "FFFFFF", size: 18 }),
                      ),
                      tableHeader: true,
                    }),
                    ...extraCostLines.map((line, i) =>
                      new TableRow({
                        cantSplit: true,
                        children: [
                          mkCell(line.name, { align: AlignmentType.LEFT, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 20 }),
                          mkCell(line.position || "—", { align: AlignmentType.LEFT, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: "6B7A8D", size: 18 }),
                          mkCellMultiline(line.description, { align: AlignmentType.LEFT, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 18 }),
                          mkCell(line.amount > 0 ? `${fmt(line.amount)} PLN` : "—", {
                            bold: true,
                            fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6",
                            color: line.amount > 0 ? "1E7E34" : "6B7A8D",
                            size: 20,
                          }),
                        ],
                      }),
                    ),
                    new TableRow({
                      children: [
                        mkCell("Razem koszty do zwrotu", { bold: true, fill: "EDF1F6", align: AlignmentType.RIGHT, size: 16 }),
                        mkCell("", { fill: "EDF1F6" }),
                        mkCell("", { fill: "EDF1F6" }),
                        mkCell(`${fmt(extraCostTotal)} PLN`, { bold: true, fill: "EDF1F6", color: "1E7E34", size: 20 }),
                      ],
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { before: 200 },
                  children: [
                    new TextRun({
                      text: `Suma kosztów do zwrotu: +${fmt(extraCostTotal)} PLN (doliczone do wypłaty)`,
                      bold: true,
                      size: 22,
                      color: "344254",
                      font: "Calibri",
                    }),
                  ],
                }),
              ]
            : []),
          ...(prevSatDetails.length > 0
            ? [
                new Paragraph({ children: [new PageBreak()] }),
                new Paragraph({
                  spacing: { after: 100 },
                  children: [new TextRun({ text: "Sobota poprzedniego tygodnia — szczegóły", bold: true, size: 28, color: "344254", font: "Calibri" })],
                }),
                new Paragraph({
                  spacing: { after: 220 },
                  children: [
                    new TextRun({
                      text: `Data: ${fmtDate(prevSatIso)} · wypłata w tygodniu ${fmtDate(weekFrom)} – ${fmtDate(weekTo)}`,
                      size: 22,
                      color: "7B5800",
                      font: "Calibri",
                    }),
                  ],
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: ["Pracownik", "Data", "Od–Do", "Godz.", "Zaliczka", "Brutto", "Opisy / uwagi"].map((h) =>
                        mkCell(h, { bold: true, fill: "344254", color: "FFFFFF", size: 18 }),
                      ),
                      tableHeader: true,
                    }),
                    ...prevSatDetails.map((line, i) =>
                      new TableRow({
                        children: [
                          mkCell(line.name, { align: AlignmentType.LEFT, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 20 }),
                          mkCell(line.dateLabel, { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: "7B5800", size: 18 }),
                          mkCell(line.timeRange, { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 18 }),
                          mkCell(line.hours > 0 ? fmtH(line.hours) : "—", { bold: line.hours > 0, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 20 }),
                          mkCell(line.zaliczka > 0 ? `${fmt(line.zaliczka)} PLN` : "—", { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: line.zaliczka > 0 ? "C0392B" : "6B7A8D", size: 18 }),
                          mkCell(line.gross > 0 ? `${fmt(line.gross)} PLN` : "—", { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: "6B7A8D", size: 18 }),
                          mkCellMultiline(line.notesText, { align: AlignmentType.LEFT, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: "6B7A8D", size: 18 }),
                        ],
                      }),
                    ),
                  ],
                }),
              ]
            : []),
          new Paragraph({
            spacing: { before: 360 },
            children: [new TextRun({ text: `Wygenerowano: ${new Date().toLocaleDateString("pl-PL")}`, size: 20, color: "8A9BB0", font: "Calibri" })],
          }),
        ],
      },
    ],
  });
  return Packer.toBlob(doc);
}

// ─── Base64 ───────────────────────────────────────────────────────────────────

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== "string") {
        reject(new Error("Nie udało się zakodować załącznika"));
        return;
      }
      const comma = dataUrl.indexOf(",");
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Nie udało się zakodować załącznika"));
    reader.readAsDataURL(blob);
  });
}
