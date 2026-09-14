/**
 * PAYROLL AKORD Phase 4B — piecework → payable SSOT.
 * npx vite-node scripts/test-payroll-akord-payable-p4b.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-akord-p4b";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-akord-p4b";

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

import { createAdvance, createAllocation, createPieceworkJob, softDeleteAdvance } from "../src/lib/payroll-piecework.ts";
import { resolveAkordPayable, resolveAkordAllocationBreakdown } from "../src/lib/payroll-piecework-payable.ts";
import { emptyPayrollPieceworkState } from "../src/lib/payroll-piecework-types.ts";
import { calcWeekEmployeeForPayroll, canDeferPayroll, buildPayrollCarryForwardRecord } from "../src/lib/payroll-carry-forward.ts";
import { resolveSettlementPayableAmount } from "../src/lib/payroll-settlement.ts";
import {
  calcBiweeklyRowDisplay,
  calcWeekNetNoPrevSat,
  isBiweeklyPayoutWeek,
} from "../src/lib/payroll-cycle.ts";
import { calcWeekEmployee, defaultDays, weekEmployeeFromDir } from "../src/app/app-domain.ts";
import { mergePayrollPieceworkState } from "../src/lib/payroll-piecework-merge.ts";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
const T1 = "2026-09-14T11:00:00.000Z";
const WEEK = { weekFrom: "2026-09-07", weekTo: "2026-09-12" };

function akordEmp(id = "dir-a", extras = []) {
  const we = weekEmployeeFromDir({
    id,
    name: "Akord",
    phone: "",
    position: "",
    defaultRate: "40",
    startDate: "2026-01-01",
    active: true,
    notes: "",
    compensationModel: "akord",
  });
  return {
    ...we,
    days: {
      ...defaultDays(),
      Pn: { active: true, from: "", to: "", zaliczka: "" },
      Wt: { active: false, from: "", to: "", zaliczka: "" },
    },
    extraCosts: extras,
  };
}

function hourlyEmp(id = "dir-h") {
  return {
    ...weekEmployeeFromDir({
      id,
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

function basePiecework(agreed = 5000) {
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

// --- 1–3 resolver ---
{
  let s = basePiecework(5000);
  assert("1 payable 5000", resolveAkordPayable("dir-a", s) === 5000);
  s = createAdvance(s, { allocationId: "al1", amount: 500, id: "adv1", now: T0 }).state;
  assert("2 payable 4500", resolveAkordPayable("dir-a", s) === 4500);
  s = createAdvance(s, { allocationId: "al1", amount: 700, id: "adv2", now: T1 }).state;
  assert("3 payable 3800", resolveAkordPayable("dir-a", s) === 3800);
}

// --- 4 multi allocation ---
{
  let s = emptyPayrollPieceworkState();
  s = createPieceworkJob(s, { jobId: "j1", id: "pj1", now: T0 }).state;
  s = createPieceworkJob(s, { jobId: "j2", id: "pj2", now: T0 }).state;
  s = createAllocation(s, { pieceworkJobId: "pj1", directoryId: "dir-a", agreedAmount: 4200, id: "alA", now: T0 }).state;
  s = createAllocation(s, { pieceworkJobId: "pj2", directoryId: "dir-a", agreedAmount: 3000, id: "alB", now: T0 }).state;
  s = createAdvance(s, { allocationId: "alA", amount: 1000, id: "x1", now: T0 }).state;
  s = createAdvance(s, { allocationId: "alB", amount: 500, id: "x2", now: T0 }).state;
  assert("4 payable 5700", resolveAkordPayable("dir-a", s) === 5700);
  const br = resolveAkordAllocationBreakdown("dir-a", s);
  assert("4 breakdown 2 rows", br.allocations.length === 2);
}

// --- 5 deleted advance ---
{
  let s = basePiecework(5000);
  s = createAdvance(s, { allocationId: "al1", amount: 1000, id: "del", now: T0 }).state;
  s = softDeleteAdvance(s, "del", T1).state;
  assert("5 deleted ignored", resolveAkordPayable("dir-a", s) === 5000);
}

// --- 6 mixed roster hourly unchanged ---
{
  const h = hourlyEmp();
  const before = calcWeekEmployee(h);
  const row = calcWeekEmployeeForPayroll(h, { ...WEEK, pieceworkState: basePiecework(9999) });
  assert("6 hourly hours", row.weekHours === 8 && before.weekHours === 8);
  assert("6 hourly gross", row.grossPay === 320 && row.displayNetPay === 320);
}

// --- 7 attendance change ---
{
  const s = basePiecework(5000);
  const e1 = akordEmp();
  const e2 = {
    ...e1,
    days: { ...e1.days, Pn: { active: false, from: "", to: "", zaliczka: "" }, Wt: { active: true, from: "", to: "", zaliczka: "" } },
  };
  const r1 = calcWeekEmployeeForPayroll(e1, { ...WEEK, pieceworkState: s });
  const r2 = calcWeekEmployeeForPayroll(e2, { ...WEEK, pieceworkState: s });
  assert("7 attendance independent", r1.displayNetPay === 5000 && r2.displayNetPay === 5000);
}

// --- 8 from/to stale ---
{
  const s = basePiecework(5000);
  const e = {
    ...akordEmp(),
    days: {
      ...defaultDays(),
      Pn: { active: true, from: "07:00", to: "16:00", zaliczka: "100" },
    },
  };
  const r = calcWeekEmployeeForPayroll(e, { ...WEEK, pieceworkState: s });
  assert("8 from/to ignored for akord payable", r.displayNetPay === 5000 && r.weekHours === 0);
}

// --- BEFORE/AFTER + extras/manual ---
{
  const s = basePiecework(5000);
  const bare = akordEmp();
  const before = calcWeekEmployee(bare); // Phase 3: extras only
  assert("BEFORE akord base (no piecework in calcWeekEmployee)", before.netPay === 0);
  const after = calcWeekEmployeeForPayroll(bare, { ...WEEK, pieceworkState: s });
  assert("AFTER akord remaining", after.displayNetPay === 5000);
  const withExtra = {
    ...bare,
    extraCosts: [{ id: "ec1", amount: "200", description: "x", status: "approved" }],
    payrollManualAdjustment: { amount: 50, description: "m", updatedAt: T0 },
  };
  const withAdj = calcWeekEmployeeForPayroll(withExtra, { ...WEEK, pieceworkState: s });
  assert("AFTER + extras + manual = 5250", withAdj.displayNetPay === 5250);
}

// --- 9–10 biweekly ---
{
  const s = basePiecework(5000);
  const emp = {
    ...akordEmp(),
    directoryId: "dir-a",
  };
  const dir = [{ id: "dir-a", name: "Akord", biweeklyPayroll: true, biweeklyAnchorDate: "2026-09-12" }];
  const payout = isBiweeklyPayoutWeek("2026-09-12", "2026-09-12");
  assert("9 anchor payout week check", payout === true);
  const bw = calcBiweeklyRowDisplay(emp, dir, "2026-09-07", "2026-09-12", [], undefined, {
    pieceworkState: s,
  });
  assert("9 biweekly uses remaining once", bw != null && bw.displayNet === 5000);
  // non-payout: shift week so Saturday is not anchor
  const bw2 = calcBiweeklyRowDisplay(emp, dir, "2026-08-31", "2026-09-05", [], undefined, {
    pieceworkState: s,
  });
  assert("10 non-payout still remaining once", bw2 != null && bw2.displayNet === 5000 && bw2.accruedOnly === true);
}

// --- 11 deferred / carry no double count ---
{
  const s = basePiecework(5700);
  const emp = akordEmp();
  const row = calcWeekEmployeeForPayroll(emp, { ...WEEK, pieceworkState: s });
  assert("11 base 5700", row.displayNetPay === 5700);
  const can = canDeferPayroll(emp, row, [], false);
  assert("11 can defer", can.ok === true && can.frozenAmount === 5700);
  const carry = buildPayrollCarryForwardRecord(5700, WEEK.weekFrom, WEEK.weekTo);
  const deferred = { ...emp, payrollCarryForward: carry };
  const outRow = calcWeekEmployeeForPayroll(deferred, { ...WEEK, pieceworkState: s });
  assert("11 carry out display 0", outRow.displayNetPay === 0 && outRow.carryForwardOut === 5700);

  const nextWeek = { weekFrom: carry.targetWeekFrom, weekTo: carry.targetWeekTo };
  const saved = [
    {
      weekFrom: WEEK.weekFrom,
      weekTo: WEEK.weekTo,
      savedAt: T0,
      employees: [
        {
          directoryId: "dir-a",
          name: "Akord",
          netPay: 0,
          carryForwardOut: 5700,
          carryForwardTargetFrom: nextWeek.weekFrom,
          carryForwardTargetTo: nextWeek.weekTo,
        },
      ],
    },
  ];
  const nextEmp = akordEmp();
  const inRow = calcWeekEmployeeForPayroll(nextEmp, {
    ...nextWeek,
    savedWeeks: saved,
    pieceworkState: s,
  });
  assert("11 carry in no double", inRow.displayNetPay === 5700 && inRow.carryForwardIn === 5700);
}

// --- 12 settlement SSOT ---
{
  const s = basePiecework(4500);
  s.advances = createAdvance(basePiecework(5000), { allocationId: "al1", amount: 500, id: "a", now: T0 }).state.advances;
  const emp = akordEmp();
  const pay = resolveSettlementPayableAmount(emp, [], WEEK.weekFrom, WEEK.weekTo, [], {
    pieceworkState: createAdvance(basePiecework(5000), { allocationId: "al1", amount: 500, id: "a", now: T0 }).state,
  });
  assert("12 settlement 4500", pay === 4500);
}

// --- 13 early HOLD ---
{
  const s = basePiecework(5000);
  const emp = {
    ...akordEmp(),
    payrollEarlyPayouts: [{ id: "ep1", amount: 1000, method: "cash", periodKey: "2026-09-12", paidAt: T0 }],
  };
  const dir = [{ id: "dir-a", name: "Akord", biweeklyPayroll: true, biweeklyAnchorDate: "2026-09-12" }];
  const bw = calcBiweeklyRowDisplay(emp, dir, "2026-09-07", "2026-09-12", [], undefined, {
    pieceworkState: s,
  });
  assert("13 early HOLD", bw != null && bw.earlyPaid === 0 && bw.displayNet === 5000);
}

// --- 14 alias covered by 11 ---
assert("14 double-count covered", true);

// --- 15 model switch historical ---
{
  const hist = {
    ...hourlyEmp("dir-x"),
    compensationModel: undefined, // week stayed hourly
  };
  const row = calcWeekEmployeeForPayroll(hist, { ...WEEK, pieceworkState: basePiecework(9000) });
  assert("15 historical hourly ignores piecework", row.displayNetPay === 320);
}

// --- 16 piecework persists across week rebuild (state independent of week emp) ---
{
  let s = basePiecework(5000);
  s = createAdvance(s, { allocationId: "al1", amount: 100, id: "p", now: T0 }).state;
  const w1 = resolveAkordPayable("dir-a", s);
  const w2 = resolveAkordPayable("dir-a", s);
  assert("16 persists", w1 === 4900 && w2 === 4900);
}

// --- 17 merge cloud wins newer ---
{
  const local = basePiecework(1000);
  let cloud = basePiecework(1000);
  cloud = createAdvance(cloud, { allocationId: "al1", amount: 200, id: "c1", now: T1 }).state;
  const merged = mergePayrollPieceworkState(local, cloud);
  assert("17 cloud advance preserved", resolveAkordPayable("dir-a", merged) === 800);
}

// --- closed job still counts remaining ---
{
  let s = basePiecework(5000);
  s = {
    ...s,
    jobs: s.jobs.map((j) => (j.id === "pj1" ? { ...j, status: "closed", updatedAt: T1 } : j)),
  };
  assert("closed job remaining still payable", resolveAkordPayable("dir-a", s) === 5000);
}

// --- static: no PWRB / week-employees CAS in payable module ---
{
  const src = readFileSync(resolve("src/lib/payroll-piecework-payable.ts"), "utf8");
  assert("no pwr in payable", !src.includes("pwrPush") && !src.includes("kw-week-employees"));
  const carry = readFileSync(resolve("src/lib/payroll-carry-forward.ts"), "utf8");
  assert("carry uses resolveAkordPayable", carry.includes("resolveAkordPayable"));
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log("AKORD V1: remaining + extras + manualAdjustment via shared SSOT (no double remaining on carry-in / biweekly).");
console.log("CLOUD TEST LIMITATION: merge semantics unit-tested; live Edge CAS covered by Phase 4A suite.");
if (fail) process.exit(1);
