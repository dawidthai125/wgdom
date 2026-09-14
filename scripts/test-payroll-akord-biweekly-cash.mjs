/**
 * PAYROLL AKORD — biweekly cash / Saturday payout (pieceworkState propagation).
 * IN-MEMORY — exercises computePayrollCashSplit + calcBiweeklyRowDisplay.
 * npx vite-node scripts/test-payroll-akord-biweekly-cash.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-akord-bw-cash";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-akord-bw-cash";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    for (const k of Object.keys(lsStore)) delete lsStore[k];
  },
};

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createAdvance,
  createAllocation,
  createPieceworkJob,
} from "../src/lib/payroll-piecework.ts";
import { emptyPayrollPieceworkState } from "../src/lib/payroll-piecework-types.ts";
import {
  resolveAkordPayable,
  resolveAkordWeekAdvances,
} from "../src/lib/payroll-piecework-payable.ts";
import { calcWeekEmployeeForPayroll } from "../src/lib/payroll-carry-forward.ts";
import {
  calcBiweeklyRowDisplay,
  computePayrollCashSplit,
} from "../src/lib/payroll-cycle.ts";
import { resolveSettlementPayableAmount } from "../src/lib/payroll-settlement.ts";
import { calcBiweeklyWeekNetWithLeave } from "../src/lib/payroll-leave-overlay.ts";
import { defaultDays, weekEmployeeFromDir } from "../src/app/app-domain.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name);
  }
}

const T0 = "2026-09-14T10:00:00.000Z";
/** Anchor Sat → W2 is payout week; W1/W3 are non-payout. */
const ANCHOR = "2026-09-19";
const W1 = { weekFrom: "2026-09-07", weekTo: "2026-09-12" };
const W2 = { weekFrom: "2026-09-14", weekTo: "2026-09-19" };
const W3 = { weekFrom: "2026-09-21", weekTo: "2026-09-26" };

function akordEmp() {
  return {
    ...weekEmployeeFromDir({
      id: "dir-a",
      name: "Akord",
      phone: "",
      position: "",
      defaultRate: "40",
      startDate: "2026-01-01",
      active: true,
      notes: "",
      compensationModel: "akord",
    }),
    days: {
      ...defaultDays(),
      Pn: { active: true, from: "", to: "", zaliczka: "" },
    },
  };
}

function hourlyEmp() {
  return {
    ...weekEmployeeFromDir({
      id: "dir-h",
      name: "Hourly",
      phone: "",
      position: "",
      defaultRate: "40",
      startDate: "2026-01-01",
      active: true,
      notes: "",
    }),
    days: {
      ...defaultDays(),
      Pn: { active: true, from: "08:00", to: "16:00", zaliczka: "" },
    },
  };
}

function seed(agreed = 1500) {
  let s = emptyPayrollPieceworkState();
  s = createPieceworkJob(s, { jobId: "job-1", id: "pj1", now: T0 }).state;
  s = createAllocation(s, {
    pieceworkJobId: "pj1",
    directoryId: "dir-a",
    agreedAmount: agreed,
    id: "al1",
    now: T0,
  }).state;
  return s;
}

function addAdv(s, amount, week, id) {
  return createAdvance(s, {
    allocationId: "al1",
    amount,
    id,
    now: T0,
    paidAt: `${week.weekFrom}T12:00:00.000Z`,
    weekFrom: week.weekFrom,
    weekTo: week.weekTo,
  }).state;
}

const dirBi = [{ id: "dir-a", name: "Akord", biweeklyPayroll: true, biweeklyAnchorDate: ANCHOR }];

function cashSplit(emps, week, pieceworkState) {
  return computePayrollCashSplit(
    emps,
    dirBi,
    week.weekFrom,
    week.weekTo,
    [],
    () => 0,
    (e, from, to) => calcBiweeklyWeekNetWithLeave(e, from, to, {}),
    { pieceworkState },
  );
}

function rowDisplay(emp, week, pieceworkState) {
  return calcBiweeklyRowDisplay(emp, dirBi, week.weekFrom, week.weekTo, [], undefined, {
    pieceworkState,
  });
}

// --- STATIC: computePayrollCashSplit must accept / forward pieceworkState ---
{
  const src = readFileSync(resolve("src/lib/payroll-cycle.ts"), "utf8");
  assert(
    "STATIC cash split forwards pieceworkState",
    src.includes("computePayrollCashSplit") &&
      /calcBiweeklyRowDisplay\([\s\S]*?pieceworkState:\s*options\?\.pieceworkState/.test(src),
  );
  const pv = readFileSync(resolve("src/app/PayrollView.tsx"), "utf8");
  assert(
    "STATIC PayrollView passes piecework to cash split",
    pv.includes("computePayrollCashSplit(") && pv.includes("{ pieceworkState: payrollPiecework }"),
  );
}

// --- SCENARIO A ---
{
  const e = akordEmp();
  const s = addAdv(seed(1500), 500, W1, "a");
  const r1 = rowDisplay(e, W1, s);
  const c1 = cashSplit([e], W1, s);
  const r2 = rowDisplay(e, W2, s);
  const c2 = cashSplit([e], W2, s);
  assert("A W1 accrued display 500", r1?.isPayoutWeek === false && r1?.displayNet === 500);
  assert("A W1 Saturday cash 0", c1.biweeklyPayoutNet === 0 && c1.totalSaturdayCash === 0);
  assert("A W1 accrued net tracked", c1.biweeklyAccruedNet === 500);
  assert("A W2 payout display 500", r2?.isPayoutWeek === true && r2?.displayNet === 500 && r2?.prevWeekNet === 500);
  assert("A W2 Saturday cash 500", c2.biweeklyPayoutNet === 500 && c2.totalSaturdayCash === 500);
  assert("A row == cash W2", r2.displayNet === c2.biweeklyPayoutNet);
  assert("A remaining not cash", resolveAkordPayable("dir-a", s) === 1000 && c2.totalSaturdayCash === 500);
  const settle = resolveSettlementPayableAmount(e, dirBi, W2.weekFrom, W2.weekTo, [], { pieceworkState: s });
  assert("A settlement == cash", settle === 500 && settle === c2.biweeklyPayoutNet);
}

// --- SCENARIO B ---
{
  const e = akordEmp();
  let s = addAdv(seed(1500), 500, W1, "b1");
  s = addAdv(s, 200, W2, "b2");
  const r2 = rowDisplay(e, W2, s);
  const c2 = cashSplit([e], W2, s);
  assert("B W2 display 700", r2?.displayNet === 700 && r2?.thisWeekNet === 200 && r2?.prevWeekNet === 500);
  assert("B W2 Saturday cash 700", c2.biweeklyPayoutNet === 700 && c2.totalSaturdayCash === 700);
  assert("B not 1200/1000/1400", c2.totalSaturdayCash !== 1200 && c2.totalSaturdayCash !== 1000 && c2.totalSaturdayCash !== 1400);
  assert("B remaining 800 != cash", resolveAkordPayable("dir-a", s) === 800 && c2.totalSaturdayCash === 700);
}

// --- SCENARIO C ---
{
  const e = akordEmp();
  const s = addAdv(seed(1500), 500, W1, "c");
  const c2 = cashSplit([e], W2, s);
  const r3 = rowDisplay(e, W3, s);
  const c3 = cashSplit([e], W3, s);
  assert("C W2 payout cash 500", c2.totalSaturdayCash === 500);
  assert("C W3 non-payout display 0", r3?.isPayoutWeek === false && r3?.displayNet === 0);
  assert("C W3 Saturday cash 0", c3.biweeklyPayoutNet === 0 && c3.totalSaturdayCash === 0);
}

// --- SCENARIO D ---
{
  const e = akordEmp();
  let s = addAdv(seed(1500), 500, W1, "d1");
  s = addAdv(s, 200, W2, "d2");
  s = addAdv(s, 100, W3, "d3");
  const c2 = cashSplit([e], W2, s);
  const r3 = rowDisplay(e, W3, s);
  const c3 = cashSplit([e], W3, s);
  assert("D W2 cash 700", c2.totalSaturdayCash === 700);
  assert("D W3 display only 100", r3?.displayNet === 100 && r3?.isPayoutWeek === false);
  assert("D W3 cash 0 (accrued only)", c3.biweeklyPayoutNet === 0 && c3.biweeklyAccruedNet === 100);
  assert("D weekAdvances W3 = 100", resolveAkordWeekAdvances("dir-a", s, W3.weekFrom, W3.weekTo) === 100);
}

// --- Without pieceworkState → still 0 (documents prior bug path) ---
{
  const e = akordEmp();
  const s = addAdv(seed(1500), 500, W1, "gap");
  const row = rowDisplay(e, W2, s);
  const cashBroken = computePayrollCashSplit(
    [e],
    dirBi,
    W2.weekFrom,
    W2.weekTo,
    [],
    () => 0,
    (em, f, t) => calcBiweeklyWeekNetWithLeave(em, f, t, {}),
  );
  assert("control: row with piecework = 500", row?.displayNet === 500);
  assert("control: cash WITHOUT piecework = 0 (old bug)", cashBroken.biweeklyPayoutNet === 0);
  const cashFixed = cashSplit([e], W2, s);
  assert("control: cash WITH piecework = 500", cashFixed.biweeklyPayoutNet === 500);
}

// --- HOURLY regression (biweekly cash path untouched for hours) ---
{
  const h = hourlyEmp();
  const dirH = [{ id: "dir-h", name: "Hourly", biweeklyPayroll: false }];
  const weekly = calcWeekEmployeeForPayroll(h, { ...W1, pieceworkState: seed(9999) });
  assert("hourly weekly 320", weekly.displayNetPay === 320 && weekly.weekHours === 8);
  const cashH = computePayrollCashSplit(
    [h],
    dirH,
    W1.weekFrom,
    W1.weekTo,
    [],
    () => weekly.displayNetPay,
    undefined,
    { pieceworkState: seed(9999) },
  );
  assert("hourly Saturday cash 320", cashH.weeklyNet === 320 && cashH.totalSaturdayCash === 320);
}

// --- PDF cash uses same computePayrollCashSplit (source) ---
{
  const pv = readFileSync(resolve("src/app/PayrollView.tsx"), "utf8");
  assert(
    "PDF cashTotalSaturday from cashSplit",
    pv.includes("cashTotalSaturday: cashSplit.totalSaturdayCash"),
  );
}

console.log(`\nBiweekly cash: ${pass} PASS / ${fail} FAIL`);
console.log("CLASSIFICATION: IN-MEMORY (scenarios A–D, cash split) · STATIC (wire checks)");
if (fail) process.exit(1);
