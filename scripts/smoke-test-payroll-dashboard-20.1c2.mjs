/**
 * Sprint 20.1C.2 — dashboard payroll alerts = blocksPayrollRollover semantics
 * Uruchom: npx vite-node scripts/smoke-test-payroll-dashboard-20.1c2.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import { buildPayrollCarryForwardRecord } from "../src/lib/payroll-carry-forward.ts";
import { countPayrollDashboardBlockers } from "../src/lib/payroll-rollover.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const W1 = { from: "2026-06-01", to: "2026-06-06" };
const PAYOUT_WEEK = { from: "2026-06-08", to: "2026-06-13" };

const R = {};

function log(m) {
  console.log(m);
}

function defaultDays(h = 8) {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [
      k,
      k === "So" ? d : { ...d, active: true, from: "07:00", to: h === 8 ? "16:00" : "15:00" },
    ]),
  );
}

function makeDir(id, name, extra = {}) {
  return {
    id,
    name,
    phone: "+48 500 000 001",
    position: "Pracownik",
    defaultRate: "50",
    startDate: "2026-01-01",
    active: true,
    notes: "",
    ...extra,
  };
}

function makeEmp(id, dirId, name, rate = "50", extra = {}) {
  return {
    id,
    directoryId: dirId,
    name,
    phone: "+48 500 000 001",
    position: "Pracownik",
    rate,
    days: defaultDays(),
    settled: false,
    ...extra,
  };
}

function ukDirectory(id, name) {
  return makeDir(id, name, {
    biweeklyPayroll: true,
    biweeklyAnchorDate: "2026-05-30",
    position: "UK",
  });
}

function rosterRca() {
  const marcin = makeEmp("we-marcin", "dir-marcin", "Marcin", "45", { position: "Mistrz Hydrauliki" });
  const kamil = makeEmp("we-kamil", "dir-kamil", "Kamil Elektryk", "30", {
    position: "Elektryk",
    payrollCarryForward: buildPayrollCarryForwardRecord(1050, W1.from, W1.to),
  });
  const piotrek = makeEmp("we-piotrek", "dir-piotrek", "Piotrek Ukraina", "35");
  const michal = makeEmp("we-michal", "dir-michal", "Michal Ukraina", "40");
  const kola = makeEmp("we-kola", "dir-kola", "Kola Ukraina", "38");
  const directory = [
    makeDir("dir-marcin", "Marcin", { position: "Mistrz Hydrauliki", defaultRate: "45" }),
    makeDir("dir-kamil", "Kamil Elektryk", { position: "Elektryk", defaultRate: "30" }),
    ukDirectory("dir-piotrek", "Piotrek Ukraina"),
    ukDirectory("dir-michal", "Michal Ukraina"),
    ukDirectory("dir-kola", "Kola Ukraina"),
  ];
  return { weekEmployees: [piotrek, michal, kola, kamil, marcin], directory };
}

function dashboardBlockers(weekEmployees, directory, weekFrom, weekTo, options = {}) {
  return countPayrollDashboardBlockers(weekEmployees, weekFrom, weekTo, directory, options);
}

// T1 — Marcin + Kamil + 3× Ukraina → 1 blocker (Marcin)
function testT1() {
  log("\n═══ T1 — RCA prod (dashboard blockers = 1) ═══");
  const { weekEmployees, directory } = rosterRca();
  const n = dashboardBlockers(weekEmployees, directory, W1.from, W1.to);
  log(`  dashboard blockers: ${n}`);
  R.T1 = n === 1 ? "PASS" : "FAIL";
  log(`T1: ${R.T1}`);
}

// T2 — wszyscy settled → 0
function testT2() {
  log("\n═══ T2 — wszyscy settled (dashboard blockers = 0) ═══");
  const { weekEmployees, directory } = rosterRca();
  const settled = weekEmployees.map((e) => ({ ...e, settled: true }));
  const n = dashboardBlockers(settled, directory, W1.from, W1.to);
  log(`  dashboard blockers: ${n}`);
  R.T2 = n === 0 ? "PASS" : "FAIL";
  log(`T2: ${R.T2}`);
}

// T3 — biweekly payout week → 1
function testT3() {
  log("\n═══ T3 — biweekly payout week (dashboard blockers = 1) ═══");
  const dir = ukDirectory("dir-uk-pay", "UK Payout");
  const emp = makeEmp("we-uk-pay", "dir-uk-pay", "UK Payout", "40");
  const n = dashboardBlockers([emp], [dir], PAYOUT_WEEK.from, PAYOUT_WEEK.to);
  log(`  dashboard blockers: ${n}`);
  R.T3 = n === 1 ? "PASS" : "FAIL";
  log(`T3: ${R.T3}`);
}

// T4 — PRZENIESIONO → 0
function testT4() {
  log("\n═══ T4 — PRZENIESIONO (dashboard blockers = 0) ═══");
  const dir = makeDir("dir-k", "Kamil");
  const emp = makeEmp("we-k", "dir-k", "Kamil", "30", {
    payrollCarryForward: buildPayrollCarryForwardRecord(1050, W1.from, W1.to),
  });
  const n = dashboardBlockers([emp], [dir], W1.from, W1.to);
  log(`  dashboard blockers: ${n}`);
  R.T4 = n === 0 ? "PASS" : "FAIL";
  log(`T4: ${R.T4}`);
}

// T5 — urlop → 0
function testT5() {
  log("\n═══ T5 — urlop (dashboard blockers = 0) ═══");
  const dir = makeDir("dir-leave", "Jan");
  const emp = makeEmp("we-leave", "dir-leave", "Jan", "50");
  const leaves = [
    {
      id: "leave-1",
      employeeId: "dir-leave",
      leaveType: "vacation",
      weekStart: W1.from,
      weekEnd: W1.to,
      note: "",
      createdAt: "2026-06-01T00:00:00Z",
    },
  ];
  const n = dashboardBlockers([emp], [dir], W1.from, W1.to, { employeeLeaves: leaves });
  log(`  dashboard blockers: ${n}`);
  R.T5 = n === 0 ? "PASS" : "FAIL";
  log(`T5: ${R.T5}`);
}

testT1();
testT2();
testT3();
testT4();
testT5();

const all = Object.values(R);
const pass = all.filter((x) => x === "PASS").length;
log(`\n═══ PODSUMOWANIE 20.1C.2 dashboard: ${pass}/${all.length} PASS ═══`);
if (pass !== all.length) process.exit(1);
