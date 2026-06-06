/**
 * Sprint 20.1B — saved ≠ closed workflow smoke
 * Uruchom: npx vite-node scripts/smoke-test-payroll-carry-forward-20.1b.mjs
 * Wymaga: npm run build (logo w dist/assets)
 */
import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import JSZip from "jszip";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const distAssets = join(__dir, "..", "dist", "assets");
const logoFile = readdirSync(distAssets).find((n) => n.includes("logo-wg-new"));
if (!logoFile) throw new Error("Brak logo w dist/assets — uruchom npm run build");
const logoBuf = readFileSync(join(distAssets, logoFile));
const origFetch = globalThis.fetch;
globalThis.fetch = async (input) => {
  const s = String(input);
  if (s.includes("logo-wg") || s.includes(".png") || s.startsWith("/src/imports/")) {
    return new Response(logoBuf, { status: 200, headers: { "Content-Type": "image/png" } });
  }
  return origFetch(input);
};
globalThis.FileReader = class FileReader {
  result = "";
  onload = null;
  onloadend = null;
  onerror = null;
  readAsDataURL(blob) {
    Promise.resolve(blob.arrayBuffer())
      .then((buf) => {
        this.result = `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
        this.onload?.({ target: this });
        this.onloadend?.({ target: this });
      })
      .catch((err) => this.onerror?.(err));
  }
};

import { defaultDay, buildWeekSnapshot } from "../src/app/app-domain.ts";
import { toPayrollCalcRows } from "../src/app/PayrollView.tsx";
import {
  calcWeekEmployeeForPayroll,
  canDeferPayroll,
  buildPayrollCarryForwardRecord,
  computePayrollCashSplitWithCarry,
} from "../src/lib/payroll-carry-forward.ts";
import { calcWeekEmployee } from "../src/app/app-domain.ts";
import { computePayrollCashSplit } from "../src/lib/payroll-cycle.ts";
import {
  generatePayrollPdfBlob,
  payrollNetDisplayText,
} from "../src/lib/payroll-export.ts";
import {
  isPayrollWeekClosed,
  isPayrollWeekSaved,
  nextPayrollWeekRange,
} from "../src/lib/payroll-cycle.ts";
import { validateEmployeeLeaveRecord } from "../src/lib/employee-leaves.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const W1 = { from: "2026-06-01", to: "2026-06-06" };
const W2 = nextPayrollWeekRange(W1);
/** Piątek W1 — tydzień operacyjny (nie zamknięty) */
const ACTIVE_NOW = new Date("2026-06-05T14:00:00");
/** Środa W2 — W1 historyczny (zamknięty) */
const AFTER_ROLLOVER_NOW = new Date("2026-06-10T14:00:00");

const R = {};

function log(m) {
  console.log(m);
}

function defaultDays(h = 8) {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [k, k === "So" ? d : { ...d, active: true, from: "07:00", to: h === 8 ? "16:00" : h === 7 ? "14:00" : "12:00" }]),
  );
}

function makeKamil() {
  const dirId = "dir-20.1b-kamil";
  const directory = [makeDir(dirId, "Kamil Elektryk")];
  const emp = makeEmp("we-kamil", dirId, "Kamil Elektryk", "30");
  emp.days = defaultDays(7);
  return { directory, emp, dirId };
}

function makeEmp(id, dirId, name, rate = "50") {
  return {
    id,
    directoryId: dirId,
    name,
    phone: "+48 500 000 001",
    position: "Murarz",
    rate,
    days: defaultDays(),
    settled: false,
  };
}

function makeDir(id, name) {
  return { id, name, phone: "+48 500 000 001", position: "Murarz", defaultRate: "50", startDate: "2026-01-01", active: true, notes: "" };
}

function rowFor(emp, directory, weekFrom, weekTo, savedWeeks = [], closed = false) {
  const calc = calcWeekEmployeeForPayroll(emp, {
    weekFrom,
    weekTo,
    savedWeeks,
    livePayroll: !closed,
    archivedSnapshot: closed ? savedWeeks.find((w) => w.weekFrom === weekFrom && w.weekTo === weekTo) : undefined,
  });
  return toPayrollCalcRows([{ emp, ...calc }], directory, weekFrom, weekTo, savedWeeks)[0];
}

async function pdfText(blob) {
  const buf = new Uint8Array(await blob.arrayBuffer());
  const pdf = await getDocument({ data: buf }).promise;
  let t = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const c = await page.getTextContent();
    t += c.items.map((it) => ("str" in it ? it.str : "")).join(" ") + " ";
  }
  return t;
}

function totals(rows) {
  return {
    totalWeekHours: rows.reduce((s, r) => s + r.weekHours, 0),
    totalPrevSatHours: rows.reduce((s, r) => s + r.prevSatHours, 0),
    totalHoursAll: rows.reduce((s, r) => s + r.totalHours, 0),
    totalWeekGross: rows.reduce((s, r) => s + r.weekGross, 0),
    totalPrevSatGross: rows.reduce((s, r) => s + r.prevSatGross, 0),
    totalGross: rows.reduce((s, r) => s + r.grossPay, 0),
    totalWeekZaliczka: rows.reduce((s, r) => s + r.weekZaliczka, 0),
    totalPrevSatZaliczka: rows.reduce((s, r) => s + r.prevSatZaliczka, 0),
    totalZaliczkaSum: rows.reduce((s, r) => s + r.totalZaliczka, 0),
    totalExtraCostsSum: rows.reduce((s, r) => s + r.totalExtraCosts, 0),
    totalNet: rows.reduce((s, r) => s + r.netPay, 0),
    settledCount: rows.filter((r) => r.emp.settled).length,
    employeeCount: rows.length,
  };
}

function deferOnActive(emp, directory, savedWeeks, now = ACTIVE_NOW) {
  const closed = isPayrollWeekClosed(W1.from, W1.to, now);
  const row = rowFor(emp, directory, W1.from, W1.to, savedWeeks, closed);
  const check = canDeferPayroll(emp, { ...row, emp, displayNetPay: row.netPay || row.displayNetPay }, directory, closed);
  if (!check.ok) return { ok: false, check, row };
  const carry = buildPayrollCarryForwardRecord(check.frozenAmount ?? 0, W1.from, W1.to);
  const empDeferred = { ...emp, payrollCarryForward: carry };
  const snap = buildWeekSnapshot(W1.from, W1.to, [empDeferred], [], undefined, [], savedWeeks);
  return { ok: true, empDeferred, snap, row: rowFor(empDeferred, directory, W1.from, W1.to, [snap], false) };
}

// A — active → save → defer
function testA() {
  log("\n═══ A — active → save → defer ═══");
  const { directory, emp } = makeKamil();
  const snapBefore = buildWeekSnapshot(W1.from, W1.to, [emp], [], undefined, [], []);
  const saved = isPayrollWeekSaved([snapBefore], W1.from, W1.to);
  const closed = isPayrollWeekClosed(W1.from, W1.to, ACTIVE_NOW);
  const result = deferOnActive(emp, directory, [snapBefore]);
  log(`  saved=${saved} closed=${closed} defer=${result.ok} net=${result.row?.netPay}`);
  R.A = saved && !closed && result.ok && result.row.carryForwardOut === 1050 ? "PASS" : "FAIL";
  log(`A: ${R.A}`);
  return { directory, ...result };
}

// B — save → refresh → defer still allowed (before first defer)
function testB() {
  log("\n═══ B — save → refresh → defer allowed ═══");
  const { directory, emp } = makeKamil();
  const snap = buildWeekSnapshot(W1.from, W1.to, [emp], [], undefined, [], []);
  const reloadedSnap = JSON.parse(JSON.stringify(snap));
  const reloadedEmp = JSON.parse(JSON.stringify(emp));
  const closed = isPayrollWeekClosed(W1.from, W1.to, ACTIVE_NOW);
  const row = rowFor(reloadedEmp, directory, W1.from, W1.to, [reloadedSnap], closed);
  const check = canDeferPayroll(reloadedEmp, { ...row, emp: reloadedEmp, displayNetPay: row.netPay }, directory, closed);
  log(`  saved=${isPayrollWeekSaved([reloadedSnap], W1.from, W1.to)} defer.ok=${check.ok}`);
  R.B = check.ok && check.frozenAmount === 1050 ? "PASS" : "FAIL";
  log(`B: ${R.B}`);
}

// C — save → defer → PDF (live)
async function testC(ctx) {
  log("\n═══ C — save → defer → PDF ═══");
  const { directory, snap, row } = ctx;
  const calcRows = toPayrollCalcRows(
    [{ emp: snap.weekEmployees[0], ...calcWeekEmployeeForPayroll(snap.weekEmployees[0], { weekFrom: W1.from, weekTo: W1.to, savedWeeks: [snap], livePayroll: true }) }],
    directory,
    W1.from,
    W1.to,
    [snap],
  );
  const pdf = await generatePayrollPdfBlob(W1.from, W1.to, calcRows, totals(calcRows), null, [], [], "", [], []);
  const text = await pdfText(pdf);
  const okText = payrollNetDisplayText(calcRows[0]).includes("PRZENIESIONO");
  const okPdf = text.includes("PRZENIESIONO") || text.replace(/\s+/g, "").includes("PRZENIESIONO");
  log(`  row: ${payrollNetDisplayText(calcRows[0])} PDF: ${okPdf}`);
  R.C = okText && okPdf && row.carryForwardOut === 1050 ? "PASS" : "FAIL";
  log(`C: ${R.C}`);
  return ctx;
}

// D — save → defer → rollover → carry in W2
function testD(ctx) {
  log("\n═══ D — rollover → carry in W2 ═══");
  const { directory, snap } = ctx;
  const closedW1 = isPayrollWeekClosed(W1.from, W1.to, AFTER_ROLLOVER_NOW);
  const empW2 = makeEmp("we-w2", snap.weekEmployees[0].directoryId, snap.weekEmployees[0].name, "30");
  empW2.days = defaultDays(7);
  const rowW2 = rowFor(empW2, directory, W2.from, W2.to, [snap], false);
  log(`  W1 closed after rollover: ${closedW1}`);
  log(`  W2 net=${rowW2.netPay} carryIn=${rowW2.carryForwardIn}`);
  R.D = closedW1 && rowW2.netPay === 2100 && rowW2.carryForwardIn === 1050 ? "PASS" : "FAIL";
  log(`D: ${R.D}`);
}

// E — historical week defer blocked
function testE(ctx) {
  log("\n═══ E — historical week defer blocked ═══");
  const { directory, snap } = ctx;
  const emp = snap.weekEmployees[0];
  const closed = isPayrollWeekClosed(W1.from, W1.to, AFTER_ROLLOVER_NOW);
  const row = rowFor(emp, directory, W1.from, W1.to, [snap], closed);
  const check = canDeferPayroll(emp, { ...row, emp }, directory, closed);
  log(`  closed=${closed} reason=${check.reason}`);
  R.E = closed && !check.ok && check.reason === "closed_week" ? "PASS" : "FAIL";
  log(`E: ${R.E}`);
}

// G — sidebar / dashboard cash split excludes deferred Kamil (20.1B.1)
function testG(ctx) {
  log("\n═══ G — sidebar totalSaturdayCash (20.1B.1) ═══");
  const { directory, snap } = ctx;
  const emp = snap.weekEmployees[0];
  const oldSplit = computePayrollCashSplit(
    [emp],
    directory,
    W1.from,
    W1.to,
    [snap],
    (e) => calcWeekEmployee(e).netPay,
  );
  const newSplit = computePayrollCashSplitWithCarry([emp], directory, W1.from, W1.to, [snap]);
  log(`  Kamil defer carryOut=${ctx.row?.carryForwardOut ?? "?"}`);
  log(`  old totalSaturdayCash=${oldSplit.totalSaturdayCash} (bug: includes defer)`);
  log(`  new totalSaturdayCash=${newSplit.totalSaturdayCash} (expect 0)`);
  R.G =
    newSplit.totalSaturdayCash === 0 &&
    oldSplit.totalSaturdayCash === 1050 &&
    emp.payrollCarryForward?.amount === 1050
      ? "PASS"
      : "FAIL";
  log(`G: ${R.G}`);
}

// F — leaves regression (archived_week on saved week unchanged)
function testF() {
  log("\n═══ F — leaves 20.0A regression ═══");
  const snap = buildWeekSnapshot(W1.from, W1.to, [makeEmp("we-l", "d1", "Jan")], [], undefined, [], []);
  const leave = {
    id: "lv1",
    employeeId: "d1",
    leaveType: "vacation",
    weekStart: W1.from,
    weekEnd: W1.to,
  };
  const v = validateEmployeeLeaveRecord(leave, [], [snap]);
  log(`  leave on saved week: ${v.error}`);
  const savedNotClosed = isPayrollWeekSaved([snap], W1.from, W1.to) && !isPayrollWeekClosed(W1.from, W1.to, ACTIVE_NOW);
  R.F = v.error === "archived_week" && savedNotClosed ? "PASS" : "FAIL";
  log(`F: ${R.F}`);
}

async function main() {
  log("Sprint 20.1B — saved ≠ closed smoke");
  log(`W1=${W1.from}–${W1.to} W2=${W2.from}–${W2.to}`);
  const ctxA = testA();
  testB();
  const ctxC = await testC(ctxA);
  testG(ctxC);
  testD(ctxA);
  testE(ctxA);
  testF();
  log("\n═══ RAPORT 20.1B ═══");
  for (const [k, v] of Object.entries(R)) log(`  ${k}: ${v}`);
  const ok = Object.values(R).every((v) => v === "PASS");
  log(`\nWYNIK: ${ok ? "PASS" : "FAIL"}`);
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
