/**
 * PAYROLL AKORD Phase 3 — attendance (Był/Nie był), no hours×rate.
 * npx vite-node scripts/test-payroll-akord-attendance-p3.mjs
 *
 * ZERO production writes. Does not touch PWRB / CAS / settlement / rollover.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-akord-p3";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-akord-p3";

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

import {
  isAkordWeekEmployee,
  normalizePayrollCompensationModel,
  weekEmployeeCompensationModel,
} from "../src/lib/payroll-compensation-model.ts";
import {
  calcWeekEmployee,
  defaultDays,
  formatPayrollDayCell,
  payrollDayHours,
  payrollWeekExtraHourLines,
  weekEmployeeFromDir,
} from "../src/app/app-domain.ts";
import { calcWeekNetNoPrevSat } from "../src/lib/payroll-cycle.ts";
import {
  createAllocation,
  createPieceworkJob,
  emptyPayrollPieceworkState,
  remainingForAllocation,
} from "../src/lib/payroll-piecework.ts";

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

function dir(overrides = {}) {
  return {
    id: "dir-1",
    name: "Piotrek",
    phone: "+48 500 000 001",
    position: "Murarz",
    defaultRate: "42",
    startDate: "2026-01-01",
    active: true,
    notes: "",
    ...overrides,
  };
}

function day(active, from = "", to = "") {
  return { active, from, to, zaliczka: "" };
}

// --- A. Model ---
assert("A missing → hourly", normalizePayrollCompensationModel(undefined) === "hourly");
assert("A akord → akord", normalizePayrollCompensationModel("akord") === "akord");

// --- B. Weekly snapshot ---
const fromHourly = weekEmployeeFromDir(dir());
assert("B fromDir hourly", weekEmployeeCompensationModel(fromHourly) === "hourly");
assert("B fromDir hourly omits field", fromHourly.compensationModel === undefined);

const fromAkord = weekEmployeeFromDir(dir({ id: "dir-ak", name: "Kola", compensationModel: "akord" }));
assert("B fromDir akord", fromAkord.compensationModel === "akord");
assert("B isAkord", isAkordWeekEmployee(fromAkord) === true);

// --- C. Model change — historical week immutable ---
const week1Hourly = weekEmployeeFromDir(dir({ id: "dir-sw", name: "Switch" }));
const dirNowAkord = dir({ id: "dir-sw", name: "Switch", compensationModel: "akord" });
assert("C week1 stays hourly after Kadry→akord", weekEmployeeCompensationModel(week1Hourly) === "hourly");
const week2Akord = weekEmployeeFromDir(dirNowAkord);
assert("C week2 fromDir may be akord", week2Akord.compensationModel === "akord");

const week1Akord = weekEmployeeFromDir(dir({ id: "dir-sw2", name: "Switch2", compensationModel: "akord" }));
const dirNowHourly = dir({ id: "dir-sw2", name: "Switch2", compensationModel: "hourly" });
assert("C week1 stays akord after Kadry→hourly", week1Akord.compensationModel === "akord");
assert("C week2 fromDir may be hourly", weekEmployeeFromDir(dirNowHourly).compensationModel === undefined);

// --- D. Attendance pattern preserved ---
const attendance = {
  ...fromAkord,
  days: {
    ...defaultDays(),
    Pn: day(true),
    Wt: day(false),
    Sr: day(true),
    Cz: day(true),
    Pt: day(false),
    So: day(true),
  },
};
assert("D Mon true", attendance.days.Pn.active === true);
assert("D Tue false", attendance.days.Wt.active === false);
assert("D Wed true", attendance.days.Sr.active === true);
assert("D Thu true", attendance.days.Cz.active === true);
assert("D Fri false", attendance.days.Pt.active === false);
assert("D Sat true", attendance.days.So.active === true);
assert("D cell Był", formatPayrollDayCell(attendance.days.Pn, attendance) === "Był");
assert("D cell absent", formatPayrollDayCell(attendance.days.Wt, attendance) === "—");

// --- E. No hours required ---
assert("E active without from/to", attendance.days.Pn.active === true && !attendance.days.Pn.from && !attendance.days.Pn.to);
assert("E payrollDayHours 0", payrollDayHours(attendance, attendance.days.Pn) === 0);
const calcAkord = calcWeekEmployee(attendance);
assert("E weekHours 0", calcAkord.weekHours === 0);
assert("E grossPay 0", calcAkord.grossPay === 0);
assert("E totalZaliczka 0", calcAkord.totalZaliczka === 0);

const cycleAkord = calcWeekNetNoPrevSat(attendance);
assert("E cycle weekHours 0", cycleAkord.weekHours === 0);
assert("E cycle grossPay 0", cycleAkord.grossPay === 0);

// --- F. No amount calculation from attendance ---
// Piecework agreedAmount is independent; attendance must not invent a split.
let pw = emptyPayrollPieceworkState();
const jobA = createPieceworkJob(pw, { jobId: "job-a", label: "Job A", id: "pw-a", now: "2026-09-14T10:00:00.000Z" });
pw = jobA.state;
const jobB = createPieceworkJob(pw, { jobId: "job-b", label: "Job B", id: "pw-b", now: "2026-09-14T10:00:00.000Z" });
pw = jobB.state;
const allocA = createAllocation(pw, {
  id: "alloc-a",
  pieceworkJobId: "pw-a",
  directoryId: "dir-ak",
  agreedAmount: 4200,
  now: "2026-09-14T10:00:00.000Z",
});
assert("F alloc A ok", allocA.ok === true);
pw = allocA.state;
const allocB = createAllocation(pw, {
  id: "alloc-b",
  pieceworkJobId: "pw-b",
  directoryId: "dir-ak",
  agreedAmount: 2500,
  now: "2026-09-14T10:00:00.000Z",
});
assert("F alloc B ok", allocB.ok === true);
pw = allocB.state;
assert("F agreedAmount A stays 4200", pw.allocations.find((a) => a.id === "alloc-a").agreedAmount === 4200);
assert("F agreedAmount B stays 2500", pw.allocations.find((a) => a.id === "alloc-b").agreedAmount === 2500);
assert(
  "F remaining A full",
  remainingForAllocation(pw.allocations.find((a) => a.id === "alloc-a"), pw.advances) === 4200,
);
assert("F calc ignores attendance for amount", calcAkord.grossPay === 0 && calcAkord.netPay === 0);

// --- G. Hourly regression ---
const hourlyEmp = {
  ...fromHourly,
  rate: "50",
  days: {
    ...defaultDays(),
    Pn: { active: true, from: "08:00", to: "16:00", zaliczka: "" },
  },
};
const calcH = calcWeekEmployee(hourlyEmp);
assert("G active", hourlyEmp.days.Pn.active === true);
assert("G from", hourlyEmp.days.Pn.from === "08:00");
assert("G to", hourlyEmp.days.Pn.to === "16:00");
assert("G weekHours 8", calcH.weekHours === 8);
assert("G rate", calcH.rateNum === 50);
assert("G gross 400", calcH.grossPay === 400);
assert("G cell shows range", formatPayrollDayCell(hourlyEmp.days.Pn, hourlyEmp).includes("08:00–16:00"));
assert("G payrollDayHours 8", payrollDayHours(hourlyEmp, hourlyEmp.days.Pn) === 8);

// --- H. Mixed list ---
const piotrek = {
  ...weekEmployeeFromDir(dir({ id: "d-p", name: "Piotrek" })),
  rate: "40",
  days: { ...defaultDays(), Pn: { active: true, from: "07:00", to: "15:00", zaliczka: "" } },
};
const kola = {
  ...weekEmployeeFromDir(dir({ id: "d-k", name: "Kola", compensationModel: "akord" })),
  days: { ...defaultDays(), Pn: day(true), Wt: day(true) },
};
const lukasz = {
  ...weekEmployeeFromDir(dir({ id: "d-l", name: "Łukasz" })),
  rate: "45",
  days: { ...defaultDays(), Sr: { active: true, from: "08:00", to: "16:00", zaliczka: "" } },
};
const marek = {
  ...weekEmployeeFromDir(dir({ id: "d-m", name: "Marek", compensationModel: "akord" })),
  days: { ...defaultDays(), So: day(true) },
};
const mixed = [piotrek, kola, lukasz, marek];
assert("H list length 4", mixed.length === 4);
assert("H models", [weekEmployeeCompensationModel(piotrek), weekEmployeeCompensationModel(kola), weekEmployeeCompensationModel(lukasz), weekEmployeeCompensationModel(marek)].join(",") === "hourly,akord,hourly,akord");
assert("H hourly hours", calcWeekEmployee(piotrek).weekHours === 8 && calcWeekEmployee(lukasz).weekHours === 8);
assert("H akord hours 0", calcWeekEmployee(kola).weekHours === 0 && calcWeekEmployee(marek).weekHours === 0);
assert("H extra lines skip akord", payrollWeekExtraHourLines(mixed).every((line) => line.name !== "Kola" && line.name !== "Marek"));

// --- I. Phase 2 domain untouched by attendance ---
assert("I piecework still has 2 allocs", pw.allocations.filter((a) => !a.deletedAt).length === 2);
assert("I piecework still has 2 jobs", pw.jobs.filter((j) => !j.deletedAt).length === 2);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
