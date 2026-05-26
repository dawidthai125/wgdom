/** Lista płac — eksport PDF/Word i HTML email (wydzielone z PayrollView). */

import logoAsset from "@/imports/logo-wg-new-poziom.eb09de3e.png";

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
}

export interface WeekExtraHourLine {
  name: string;
  position: string;
  day: string;
  baseShift: string;
  extraRange: string;
  hours: number;
  reason: string;
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
        ${td(escapeHtml(r.emp.name || "—"), { bg })}
        ${td(escapeHtml(fmt(r.rateNum)), { align: "right", color: C.muted, bg })}
        ${td(r.weekHours > 0 ? escapeHtml(fmtH(r.weekHours)) : "—", { align: "right", bg })}
        ${td(r.prevSatHours > 0 ? escapeHtml(fmtH(r.prevSatHours)) : "—", { align: "right", color: C.gold, bg })}
        ${td(escapeHtml(fmtH(r.totalHours)), { align: "right", bold: true, bg })}
        ${td(escapeHtml(fmt(r.grossPay)), { align: "right", color: C.muted, bg })}
        ${td(r.totalZaliczka > 0 ? escapeHtml(fmt(r.totalZaliczka)) : "—", { align: "right", bg })}
        ${td(r.totalExtraCosts > 0 ? escapeHtml(fmt(r.totalExtraCosts)) : "—", { align: "right", color: C.green, bg })}
        ${td(escapeHtml(fmt(r.netPay)), { align: "right", bold: true, color: C.red, bg })}
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
        <strong>Do wypłaty:</strong> <span style="color:${C.red};font-weight:700">${escapeHtml(fmt(totals.totalNet))} PLN</span>
      </p>
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
        (strona 2: tabela tygodniowa od–do; ewentualne dodatkowe godziny i Sob. poprz.).
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
      { text: r.emp.name || "—", fillColor: bg, fontSize: 10 },
      { text: `${fmt(r.rateNum)}`, alignment: "right" as const, fillColor: bg, color: C.muted, fontSize: 10 },
      { text: r.weekHours > 0 ? fmtH(r.weekHours) : "—", alignment: "right" as const, fillColor: bg, fontSize: 10 },
      { text: r.prevSatHours > 0 ? fmtH(r.prevSatHours) : "—", alignment: "right" as const, fillColor: bg, color: C.gold, fontSize: 10 },
      { text: fmtH(r.totalHours), alignment: "right" as const, fillColor: bg, bold: true, fontSize: 10 },
      { text: `${fmt(r.grossPay)}`, alignment: "right" as const, fillColor: bg, color: C.muted, fontSize: 10 },
      { text: r.totalZaliczka > 0 ? `${fmt(r.totalZaliczka)}` : "—", alignment: "right" as const, fillColor: bg, fontSize: 10 },
      { text: r.totalExtraCosts > 0 ? `${fmt(r.totalExtraCosts)}` : "—", alignment: "right" as const, fillColor: bg, color: C.green, fontSize: 10 },
      { text: `${fmt(r.netPay)}`, bold: true, color: C.red, alignment: "right" as const, fillColor: bg, fontSize: 10 },
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
    mkSum("RAZEM", totals.totalWeekHours, totals.totalPrevSatHours, totals.totalHoursAll, totals.totalGross, totals.totalZaliczkaSum, totals.totalExtraCostsSum, totals.totalNet, true),
  ];

  const totalExtraHourSum = extraHourLines.reduce((s, l) => s + l.hours, 0);

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
    extraHourLines.length > 0
      ? [
          {
            stack: [
              {
                text: "Dodatkowe godziny w tygodniu Pn–So",
                bold: true,
                fontSize: 13,
                color: C.navy,
                margin: [0, 0, 0, 4] as [number, number, number, number],
              },
              {
                text: `Tydzień: ${fmtDate(weekFrom)} – ${fmtDate(weekTo)} · godziny ponad standardową zmianę dzienną`,
                fontSize: 10,
                color: C.muted,
                margin: [0, 0, 0, 4] as [number, number, number, number],
              },
              {
                text: "Kolumna „Powód / opis” — uzasadnienie dodatkowej pracy (np. dogrywka, transport, inna robot).",
                fontSize: 9,
                color: C.gold,
                margin: [0, 0, 0, 10] as [number, number, number, number],
              },
              {
                table: {
                  headerRows: 1,
                  dontBreakRows: true,
                  widths: [68, 34, 50, 50, 32, "*"],
                  body: [
                    ["Pracownik", "Dzień", "Zmiana podst.", "Dodatkowo", "Godz.", "Powód / opis"].map((t) => ({
                      text: t,
                      bold: true,
                      color: C.white,
                      fillColor: C.navy,
                      fontSize: 9,
                      alignment: "center" as const,
                    })),
                    ...extraHourLines.map((line, i) => {
                      const bg = i % 2 === 0 ? C.white : C.lightGray;
                      return [
                        { text: line.name, fillColor: bg, fontSize: 10 },
                        { text: line.day, fillColor: bg, alignment: "center" as const, fontSize: 9 },
                        { text: line.baseShift, fillColor: bg, alignment: "center" as const, fontSize: 9, color: C.muted },
                        { text: line.extraRange, fillColor: bg, alignment: "center" as const, fontSize: 9 },
                        { text: line.hours > 0 ? fmtH(line.hours) : "—", fillColor: bg, alignment: "right" as const, fontSize: 10, bold: line.hours > 0 },
                        { text: line.reason, fillColor: bg, color: C.muted, fontSize: 9, alignment: "left" as const },
                      ];
                    }),
                    [
                      { text: "", fillColor: C.lightNavy },
                      { text: "Razem dodatkowe", bold: true, colSpan: 3, fillColor: C.lightNavy, fontSize: 9, alignment: "right" as const },
                      {},
                      {},
                      { text: fmtH(totalExtraHourSum), bold: true, fillColor: C.lightNavy, alignment: "right" as const, fontSize: 10 },
                      { text: "", fillColor: C.lightNavy },
                    ],
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
          { text: [{ text: "Do wypłaty: ", bold: true, color: C.navy }, { text: `${fmt(totals.totalNet)} PLN`, bold: true, color: C.red }], alignment: "right" },
        ],
        fontSize: 11,
        margin: [0, 0, 0, 14],
      },
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
): Promise<Blob> {
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, ImageRun, WidthType, AlignmentType, BorderStyle, PageBreak, VerticalAlign } = await import("docx");

  const logoDataUrl = await getCompanyLogoDataUrl();
  const logoBytes = logoBytesFromDataUrl(logoDataUrl);
  const totalExtraHourSum = extraHourLines.reduce((s, l) => s + l.hours, 0);
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
              new TextRun({ text: "Do wyplaty: ", bold: true, size: 24, color: "344254", font: "Calibri" }),
              new TextRun({ text: `${fmt(totals.totalNet)} PLN`, bold: true, size: 24, color: "C0392B", font: "Calibri" }),
            ],
            spacing: { after: 280 },
          }),
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
                    mkCell(r.emp.name || "-", { align: AlignmentType.LEFT, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 20 }),
                    mkCell(`${fmt(r.rateNum)}`, { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: "6B7A8D", size: 20 }),
                    mkCell(r.weekHours > 0 ? fmtH(r.weekHours) : "-", { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 20 }),
                    mkCell(r.prevSatHours > 0 ? fmtH(r.prevSatHours) : "-", { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: r.prevSatHours > 0 ? "7B5800" : "6B7A8D", size: 20 }),
                    mkCell(fmtH(r.totalHours), { bold: true, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 20 }),
                    mkCell(`${fmt(r.grossPay)} PLN`, { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: "6B7A8D", size: 20 }),
                    mkCell(r.totalZaliczka > 0 ? `${fmt(r.totalZaliczka)} PLN` : "-", { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: r.totalZaliczka > 0 ? "C0392B" : "6B7A8D", size: 20 }),
                    mkCell(r.totalExtraCosts > 0 ? `${fmt(r.totalExtraCosts)} PLN` : "-", { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: r.totalExtraCosts > 0 ? "1E7E34" : "6B7A8D", size: 20 }),
                    mkCell(`${fmt(r.netPay)} PLN`, { bold: true, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: "C0392B", size: 20 }),
                    mkCell(r.emp.settled ? "Rozliczony" : "Oczekuje", { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: r.emp.settled ? "1E7E34" : "7B5800", bold: r.emp.settled, size: 19 }),
                  ],
                }),
              ),
              mkWordSum("Tydzien Pn-So", totals.totalWeekHours, 0, totals.totalWeekHours, totals.totalWeekGross, totals.totalWeekZaliczka, 0, totals.totalWeekGross - totals.totalWeekZaliczka),
              ...(totals.totalPrevSatHours > 0
                ? [mkWordSum(PREV_SAT_SHORT, 0, totals.totalPrevSatHours, totals.totalPrevSatHours, totals.totalPrevSatGross, totals.totalPrevSatZaliczka, 0, totals.totalPrevSatGross - totals.totalPrevSatZaliczka)]
                : []),
              mkWordSum("RAZEM", totals.totalWeekHours, totals.totalPrevSatHours, totals.totalHoursAll, totals.totalGross, totals.totalZaliczkaSum, totals.totalExtraCostsSum, totals.totalNet, true),
            ],
          }),
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
          ...(extraHourLines.length > 0
            ? [
                new Paragraph({ children: [new PageBreak()] }),
                new Paragraph({
                  spacing: { after: 100 },
                  children: [new TextRun({ text: "Dodatkowe godziny w tygodniu Pn–So", bold: true, size: 28, color: "344254", font: "Calibri" })],
                }),
                new Paragraph({
                  spacing: { after: 80 },
                  children: [
                    new TextRun({
                      text: `Tydzień: ${fmtDate(weekFrom)} – ${fmtDate(weekTo)} · godziny ponad standardową zmianę dzienną`,
                      size: 22,
                      color: "6B7A8D",
                      font: "Calibri",
                    }),
                  ],
                }),
                new Paragraph({
                  spacing: { after: 200 },
                  children: [
                    new TextRun({
                      text: "Kolumna „Powód / opis” — uzasadnienie dodatkowej pracy (np. dogrywka, transport, inna robot).",
                      size: 20,
                      color: "7B5800",
                      font: "Calibri",
                    }),
                  ],
                }),
                new Table({
                  width: { size: 100, type: WidthType.PERCENTAGE },
                  rows: [
                    new TableRow({
                      children: ["Pracownik", "Dzień", "Zmiana podst.", "Dodatkowo", "Godz.", "Powód / opis"].map((h) =>
                        mkCell(h, { bold: true, fill: "344254", color: "FFFFFF", size: 18 }),
                      ),
                      tableHeader: true,
                    }),
                    ...extraHourLines.map((line, i) =>
                      new TableRow({
                        children: [
                          mkCell(line.name, { align: AlignmentType.LEFT, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 20 }),
                          mkCell(line.day, { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 18 }),
                          mkCell(line.baseShift, { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: "6B7A8D", size: 18 }),
                          mkCell(line.extraRange, { fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 18 }),
                          mkCell(line.hours > 0 ? fmtH(line.hours) : "—", { bold: line.hours > 0, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", size: 20 }),
                          mkCellMultiline(line.reason, { align: AlignmentType.LEFT, fill: i % 2 === 0 ? "FFFFFF" : "EDF1F6", color: "6B7A8D", size: 18 }),
                        ],
                      }),
                    ),
                    new TableRow({
                      children: [
                        mkCell("", { fill: "EDF1F6" }),
                        mkCell("Razem dodatkowe", { bold: true, fill: "EDF1F6", align: AlignmentType.RIGHT, size: 18 }),
                        mkCell("", { fill: "EDF1F6" }),
                        mkCell("", { fill: "EDF1F6" }),
                        mkCell(fmtH(totalExtraHourSum), { bold: true, fill: "EDF1F6", size: 20 }),
                        mkCell("", { fill: "EDF1F6" }),
                      ],
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
