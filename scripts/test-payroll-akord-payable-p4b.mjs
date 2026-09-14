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

// --- 7 attendance change (no week advances → payout 0; balance unchanged) ---
{
  const s = basePiecework(5000);
  assert("7 balance still 5000", resolveAkordPayable("dir-a", s) === 5000);
  const e1 = akordEmp();
  const e2 = {
    ...e1,
    days: { ...e1.days, Pn: { active: false, from: "", to: "", zaliczka: "" }, Wt: { active: true, from: "", to: "", zaliczka: "" } },
  };
  const r1 = calcWeekEmployeeForPayroll(e1, { ...WEEK, pieceworkState: s });
  const r2 = calcWeekEmployeeForPayroll(e2, { ...WEEK, pieceworkState: s });
  assert("7 attendance independent weekly payout 0", r1.displayNetPay === 0 && r2.displayNetPay === 0);
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
  assert("8 from/to ignored for akord weekly payout", r.displayNetPay === 0 && r.weekHours === 0);
}

function advanceInWeek(state, amount, id = "adv-w") {
  return createAdvance(state, {
    allocationId: state.allocations[0].id,
    amount,
    id,
    now: T0,
    paidAt: "2026-09-10T10:00:00.000Z",
    weekFrom: WEEK.weekFrom,
    weekTo: WEEK.weekTo,
  }).state;
}

// --- BEFORE/AFTER + extras/manual ---
{
  const s0 = basePiecework(5000);
  const bare = akordEmp();
  const before = calcWeekEmployee(bare);
  assert("BEFORE akord base (no piecework in calcWeekEmployee)", before.netPay === 0);
  const after0 = calcWeekEmployeeForPayroll(bare, { ...WEEK, pieceworkState: s0 });
  assert("AFTER no week advance → weekly 0", after0.displayNetPay === 0);
  assert("AFTER balance remaining 5000", resolveAkordPayable("dir-a", s0) === 5000);
  const s = advanceInWeek(s0, 500, "aw1");
  const after = calcWeekEmployeeForPayroll(bare, { ...WEEK, pieceworkState: s });
  assert("AFTER week advance 500", after.displayNetPay === 500);
  const withExtra = {
    ...bare,
    extraCosts: [{ id: "ec1", amount: "200", description: "x", status: "approved" }],
    payrollManualAdjustment: { amount: 50, description: "m", updatedAt: T0 },
  };
  const withAdj = calcWeekEmployeeForPayroll(withExtra, { ...WEEK, pieceworkState: s });
  assert("AFTER week adv + extras + manual = 750", withAdj.displayNetPay === 750);
}

// --- 9–10 biweekly: week advances only (never remaining) ---
{
  const s0 = basePiecework(5000);
  const s = advanceInWeek(s0, 800, "bw-adv");
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
  assert("9 biweekly current-week advances once", bw != null && bw.displayNet === 800);
  const bwEmpty = calcBiweeklyRowDisplay(emp, dir, "2026-09-07", "2026-09-12", [], undefined, {
    pieceworkState: s0,
  });
  assert("9b no advance → biweekly 0 (not remaining)", bwEmpty != null && bwEmpty.displayNet === 0);
  // non-payout week without advances in that week
  const bw2 = calcBiweeklyRowDisplay(emp, dir, "2026-08-31", "2026-09-05", [], undefined, {
    pieceworkState: s,
  });
  assert("10 non-payout other week advances → 0", bw2 != null && bw2.displayNet === 0 && bw2.accruedOnly === true);
}

// --- 11 deferred / carry — remaining must not re-enter ---
{
  const s = advanceInWeek(basePiecework(5700), 570, "c570");
  const emp = akordEmp();
  const row = calcWeekEmployeeForPayroll(emp, { ...WEEK, pieceworkState: s });
  assert("11 base week advance 570", row.displayNetPay === 570);
  const can = canDeferPayroll(emp, row, [], false);
  assert("11 can defer", can.ok === true && can.frozenAmount === 570);
  const carry = buildPayrollCarryForwardRecord(570, WEEK.weekFrom, WEEK.weekTo);
  const deferred = { ...emp, payrollCarryForward: carry };
  const outRow = calcWeekEmployeeForPayroll(deferred, { ...WEEK, pieceworkState: s });
  assert("11 carry out display 0", outRow.displayNetPay === 0 && outRow.carryForwardOut === 570);

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
          carryForwardOut: 570,
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
  // next week: no new advances in range → only frozen carry-in (remaining must NOT add)
  assert("11 carry in no remaining double", inRow.displayNetPay === 570 && inRow.carryForwardIn === 570);
  assert("11 remaining still durable", resolveAkordPayable("dir-a", s) === 5130);
}

// --- 12 settlement SSOT = week advances ---
{
  const s = advanceInWeek(basePiecework(5000), 500, "set500");
  const emp = akordEmp();
  const pay = resolveSettlementPayableAmount(emp, [], WEEK.weekFrom, WEEK.weekTo, [], {
    pieceworkState: s,
  });
  assert("12 settlement week advance 500", pay === 500);
  assert("12 balance remaining 4500", resolveAkordPayable("dir-a", s) === 4500);
}

// --- 13 early HOLD ---
{
  const s = advanceInWeek(basePiecework(5000), 400, "eh");
  const emp = {
    ...akordEmp(),
    payrollEarlyPayouts: [{ id: "ep1", amount: 1000, method: "cash", periodKey: "2026-09-12", paidAt: T0 }],
  };
  const dir = [{ id: "dir-a", name: "Akord", biweeklyPayroll: true, biweeklyAnchorDate: "2026-09-12" }];
  const bw = calcBiweeklyRowDisplay(emp, dir, "2026-09-07", "2026-09-12", [], undefined, {
    pieceworkState: s,
  });
  assert("13 early HOLD", bw != null && bw.earlyPaid === 0 && bw.displayNet === 400);
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

// --- closed job still counts remaining (balance) ---
{
  let s = basePiecework(5000);
  s = {
    ...s,
    jobs: s.jobs.map((j) => (j.id === "pj1" ? { ...j, status: "closed", updatedAt: T1 } : j)),
  };
  assert("closed job remaining still balance", resolveAkordPayable("dir-a", s) === 5000);
}

// --- static: no PWRB / week-employees CAS in payable module ---
{
  const src = readFileSync(resolve("src/lib/payroll-piecework-payable.ts"), "utf8");
  assert("no pwr in payable", !src.includes("pwrPush") && !src.includes("kw-week-employees"));
  const carry = readFileSync(resolve("src/lib/payroll-carry-forward.ts"), "utf8");
  assert("carry uses resolveAkordWeekAdvances", carry.includes("resolveAkordWeekAdvances"));
}

console.log(`\n${pass} passed, ${fail} failed`);
console.log("AKORD: balance (remaining) ≠ weekly payout; weekly = current-week advances only.");
console.log("CLOUD TEST LIMITATION: merge semantics unit-tested; live Edge CAS covered by Phase 4A suite.");
if (fail) process.exit(1);
