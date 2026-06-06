/**
 * Sprint 20.0A — Biweekly Leave Fix verification
 * Uruchom: npx vite-node scripts/test-biweekly-leave-fix-20.0a.mjs
 */
import { calcWeekEmployee } from "../src/app/app-domain.ts";
import { defaultDay } from "../src/app/app-domain.ts";
import {
  calcBiweeklyWeekNetWithLeave,
  calcWeekEmployeeWithLeave,
} from "../src/lib/payroll-leave-overlay.ts";
import {
  calcBiweeklyRowDisplay,
  calcWeekNetNoPrevSat,
  computePayrollCashSplit,
  isBiweeklyPayrollEmployee,
} from "../src/lib/payroll-cycle.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const W1 = { from: "2026-06-08", to: "2026-06-13" };
const W0 = { from: "2026-06-01", to: "2026-06-06" };

function defaultDays() {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [
      k,
      k === "So" ? d : { ...d, active: true, from: "07:00", to: "16:00" },
    ]),
  );
}

function makeEmp(id, dirId, name) {
  return {
    id,
    directoryId: dirId,
    name,
    phone: "+48 500 000 001",
    position: "Murarz",
    rate: "50",
    days: defaultDays(),
    settled: false,
  };
}

function makeDir(id, name, biweekly = false) {
  return {
    id,
    name,
    phone: "+48 500 000 001",
    position: "Murarz",
    defaultRate: "50",
    startDate: "2026-01-01",
    active: true,
    notes: "",
    ...(biweekly ? { biweeklyPayroll: true, biweeklyAnchorDate: "2026-05-30" } : {}),
  };
}

function makeCalcBiweeklyWeekNet(leaves, savedWeeks = []) {
  return (e, from, to) =>
    calcBiweeklyWeekNetWithLeave(e, from, to, { employeeLeaves: leaves, savedWeeks });
}

function makeCalcWeeklyNet(leaves) {
  return (e) =>
    calcWeekEmployeeWithLeave(e, {
      weekFrom: W1.from,
      weekTo: W1.to,
      employeeLeaves: leaves,
      livePayroll: true,
    }).netPay;
}

const results = {};

// ─── TEST 5 — BIWEEKLY + URLOP ───────────────────────────────────────────────
console.log("\n═══ TEST 5 — BIWEEKLY + URLOP ═══");
{
  const dirId = "dir-biw-leave";
  const emp = makeEmp("we-biw-leave", dirId, "Uk Biweekly Urlop");
  const directory = [makeDir(dirId, "Uk Biweekly Urlop", true)];
  const leaves = [
    {
      id: "lv-biw",
      employeeId: dirId,
      leaveType: "vacation",
      weekStart: W1.from,
      weekEnd: W1.to,
      createdAt: "t",
      updatedAt: "t",
    },
  ];
  const calc = calcWeekEmployeeWithLeave(emp, {
    weekFrom: W1.from,
    weekTo: W1.to,
    employeeLeaves: leaves,
    livePayroll: true,
  });
  const cashSplit = computePayrollCashSplit(
    [emp],
    directory,
    W1.from,
    W1.to,
    [],
    makeCalcWeeklyNet(leaves),
    makeCalcBiweeklyWeekNet(leaves),
  );
  const bw = calcBiweeklyRowDisplay(
    emp,
    directory,
    W1.from,
    W1.to,
    [],
    makeCalcBiweeklyWeekNet(leaves),
  );

  console.log(`  netPay: ${calc.netPay}, leaveStatus: ${calc.leaveStatus}`);
  console.log(`  biweekly displayNet: ${bw?.displayNet}, thisWeekNet: ${bw?.thisWeekNet}`);
  console.log(`  cashSplit.totalSaturdayCash: ${cashSplit.totalSaturdayCash}`);
  console.log(`  cashSplit.biweeklyPayoutNet: ${cashSplit.biweeklyPayoutNet}`);

  const ok =
    calc.netPay === 0 &&
    calc.leaveStatus === "vacation" &&
    bw?.displayNet === 0 &&
    bw?.thisWeekNet === 0 &&
    cashSplit.totalSaturdayCash === 0 &&
    cashSplit.biweeklyPayoutNet === 0 &&
    cashSplit.weeklyNet === 0;
  results.test5 = ok ? "PASS" : "FAIL";
  console.log(`  TEST 5: ${results.test5}`);
}

// sick + unpaid variants
for (const leaveType of ["sick", "unpaid"]) {
  const dirId = `dir-${leaveType}`;
  const emp = makeEmp(`we-${leaveType}`, dirId, `Test ${leaveType}`);
  const directory = [makeDir(dirId, `Test ${leaveType}`, true)];
  const leaves = [
    {
      id: `lv-${leaveType}`,
      employeeId: dirId,
      leaveType,
      weekStart: W1.from,
      weekEnd: W1.to,
      createdAt: "t",
      updatedAt: "t",
    },
  ];
  const split = computePayrollCashSplit(
    [emp],
    directory,
    W1.from,
    W1.to,
    [],
    makeCalcWeeklyNet(leaves),
    makeCalcBiweeklyWeekNet(leaves),
  );
  const pass = split.totalSaturdayCash === 0 && split.biweeklyPayoutNet === 0;
  console.log(`  leaveType=${leaveType}: totalSaturdayCash=${split.totalSaturdayCash} → ${pass ? "PASS" : "FAIL"}`);
  if (!pass) results.test5 = "FAIL";
}

// ─── REGRESJA: weekly bez urlopu ─────────────────────────────────────────────
console.log("\n═══ REGRESJA — WEEKLY BEZ URLOPU ═══");
{
  const dirId = "dir-weekly";
  const emp = makeEmp("we-weekly", dirId, "Jan Tygodniowka");
  const directory = [makeDir(dirId, "Jan Tygodniowka", false)];
  const expectedNet = calcWeekEmployee(emp).netPay;
  const cashSplit = computePayrollCashSplit(
    [emp],
    directory,
    W1.from,
    W1.to,
    [],
    () => calcWeekEmployee(emp).netPay,
  );
  console.log(`  expected netPay: ${expectedNet}`);
  console.log(`  cashSplit.weeklyNet: ${cashSplit.weeklyNet}`);
  console.log(`  cashSplit.totalSaturdayCash: ${cashSplit.totalSaturdayCash}`);
  const ok =
    expectedNet > 0 &&
    cashSplit.weeklyNet === expectedNet &&
    cashSplit.totalSaturdayCash === expectedNet &&
    cashSplit.biweeklyPayoutNet === 0;
  results.regWeekly = ok ? "PASS" : "FAIL";
  console.log(`  REG WEEKLY: ${results.regWeekly}`);
}

// ─── REGRESJA: biweekly bez urlopu (tydzień wypłaty) ─────────────────────────
console.log("\n═══ REGRESJA — BIWEEKLY BEZ URLOPU (wypłata) ═══");
{
  const dirId = "dir-biw-ok";
  const emp = makeEmp("we-biw-ok", dirId, "Piotr Co2Tyg");
  const directory = [makeDir(dirId, "Piotr Co2Tyg", true)];
  const weekNet = calcWeekNetNoPrevSat(emp).netPay;
  const cashSplit = computePayrollCashSplit(
    [emp],
    directory,
    W1.from,
    W1.to,
    [],
    () => calcWeekEmployee(emp).netPay,
    (e, from, to) => calcBiweeklyWeekNetWithLeave(e, from, to, { employeeLeaves: [], savedWeeks: [] }),
  );
  const bw = calcBiweeklyRowDisplay(
    emp,
    directory,
    W1.from,
    W1.to,
    [],
    (e, from, to) => calcBiweeklyWeekNetWithLeave(e, from, to, { employeeLeaves: [], savedWeeks: [] }),
  );
  console.log(`  weekNet (Pn–So): ${weekNet}`);
  console.log(`  biweekly displayNet: ${bw?.displayNet} (payout week, brak arch. poprz.)`);
  console.log(`  cashSplit.biweeklyPayoutNet: ${cashSplit.biweeklyPayoutNet}`);
  console.log(`  cashSplit.totalSaturdayCash: ${cashSplit.totalSaturdayCash}`);
  const ok =
    weekNet > 0 &&
    bw?.isPayoutWeek === true &&
    bw?.displayNet === weekNet &&
    cashSplit.biweeklyPayoutNet === weekNet &&
    cashSplit.totalSaturdayCash === weekNet;
  results.regBiweekly = ok ? "PASS" : "FAIL";
  console.log(`  REG BIWEEKLY: ${results.regBiweekly}`);
}

// ─── REGRESJA: biweekly bez urlopu (tydzień narastający) ─────────────────────
console.log("\n═══ REGRESJA — BIWEEKLY BEZ URLOPU (narastający) ═══");
{
  const dirId = "dir-biw-acc";
  const emp = makeEmp("we-biw-acc", dirId, "Anna Co2Tyg");
  const directory = [makeDir(dirId, "Anna Co2Tyg", true)];
  // anchor 2026-05-30 → wypłata 2026-06-13; tydzień 2026-06-01–06 to narastający
  const weekNet = calcWeekNetNoPrevSat(emp).netPay;
  const cashSplit = computePayrollCashSplit(
    [emp],
    directory,
    W0.from,
    W0.to,
    [],
    () => calcWeekEmployee(emp).netPay,
    (e, from, to) => calcBiweeklyWeekNetWithLeave(e, from, to, { employeeLeaves: [], savedWeeks: [] }),
  );
  console.log(`  weekNet: ${weekNet}`);
  console.log(`  cashSplit.biweeklyAccruedNet: ${cashSplit.biweeklyAccruedNet}`);
  console.log(`  cashSplit.totalSaturdayCash: ${cashSplit.totalSaturdayCash} (brak wypłaty w sob.)`);
  const ok =
    weekNet > 0 &&
    cashSplit.biweeklyAccruedNet === weekNet &&
    cashSplit.totalSaturdayCash === 0 &&
    cashSplit.biweeklyPayoutNet === 0;
  results.regBiweeklyAcc = ok ? "PASS" : "FAIL";
  console.log(`  REG BIWEEKLY ACCRUED: ${results.regBiweeklyAcc}`);
}

console.log("\n═══ RAPORT ═══");
for (const [k, v] of Object.entries(results)) {
  console.log(`  ${k}: ${v}`);
}
const anyFail = Object.values(results).some((v) => v === "FAIL");
process.exit(anyFail ? 1 : 0);
