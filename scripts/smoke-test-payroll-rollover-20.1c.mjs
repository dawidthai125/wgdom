/**
 * Sprint 20.1C — payroll rollover (saturday cash blockers)
 * Uruchom: npx vite-node scripts/smoke-test-payroll-rollover-20.1c.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import {
  calcEmployeeSaturdayCash,
  blocksPayrollRollover,
  hasPayrollRolloverBlockers,
} from "../src/lib/payroll-rollover.ts";
import { computePayrollCashSplitWithCarry } from "../src/lib/payroll-carry-forward.ts";
import { buildPayrollCarryForwardRecord } from "../src/lib/payroll-carry-forward.ts";
import { nextPayrollWeekRange } from "../src/lib/payroll-cycle.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const W1 = { from: "2026-06-01", to: "2026-06-06" };
const W2 = nextPayrollWeekRange(W1);

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

function blockers(names, weekEmployees, directory, options = {}) {
  return weekEmployees
    .filter((e) => blocksPayrollRollover(e, W1.from, W1.to, directory, options))
    .map((e) => e.name);
}

// T1 — RCA prod: tylko Marcin blokuje
function testT1() {
  log("\n═══ T1 — RCA (Marcin blokuje, reszta nie) ═══");
  const { weekEmployees, directory } = rosterRca();
  const blocked = blockers("x", weekEmployees, directory);
  const hasBlock = hasPayrollRolloverBlockers(weekEmployees, W1.from, W1.to, directory);
  log(`  blockers: ${blocked.join(", ") || "(brak)"}`);
  log(`  hasPayrollRolloverBlockers=${hasBlock}`);
  R.T1 = blocked.length === 1 && blocked[0] === "Marcin" && hasBlock ? "PASS" : "FAIL";
  log(`T1: ${R.T1}`);
}

// T2 — wszyscy rozliczeni → brak blokady
function testT2() {
  log("\n═══ T2 — wszyscy settled ═══");
  const { weekEmployees, directory } = rosterRca();
  const settled = weekEmployees.map((e) => ({ ...e, settled: true }));
  R.T2 = !hasPayrollRolloverBlockers(settled, W1.from, W1.to, directory) ? "PASS" : "FAIL";
  log(`T2: ${R.T2}`);
}

// T3 — biweekly payout week, net > 0, !settled → blokuje
function testT3() {
  log("\n═══ T3 — biweekly payout week blokuje ═══");
  const dir = ukDirectory("dir-uk-pay", "UK Payout");
  const emp = makeEmp("we-uk-pay", "dir-uk-pay", "UK Payout", "40");
  const directory = [dir];
  const payoutWeek = { from: "2026-06-08", to: "2026-06-13" };
  const cash = calcEmployeeSaturdayCash(emp, payoutWeek.from, payoutWeek.to, directory);
  const blocks = blocksPayrollRollover(emp, payoutWeek.from, payoutWeek.to, directory);
  log(`  saturdayCash=${cash} blocks=${blocks}`);
  R.T3 = cash > 0 && blocks ? "PASS" : "FAIL";
  log(`T3: ${R.T3}`);
}

// T4 — biweekly accrual → nie blokuje
function testT4() {
  log("\n═══ T4 — biweekly accrual nie blokuje ═══");
  const dir = ukDirectory("dir-uk-acc", "UK Accrual");
  const emp = makeEmp("we-uk-acc", "dir-uk-acc", "UK Accrual", "40");
  const blocks = blocksPayrollRollover(emp, W1.from, W1.to, [dir]);
  const cash = calcEmployeeSaturdayCash(emp, W1.from, W1.to, [dir]);
  log(`  saturdayCash=${cash} blocks=${blocks}`);
  R.T4 = cash === 0 && !blocks ? "PASS" : "FAIL";
  log(`T4: ${R.T4}`);
}

// T5 — PRZENIESIONO → nie blokuje
function testT5() {
  log("\n═══ T5 — PRZENIESIONO nie blokuje ═══");
  const dir = makeDir("dir-k", "Kamil");
  const emp = makeEmp("we-k", "dir-k", "Kamil", "30", {
    payrollCarryForward: buildPayrollCarryForwardRecord(1050, W1.from, W1.to),
  });
  const cash = calcEmployeeSaturdayCash(emp, W1.from, W1.to, [dir]);
  const blocks = blocksPayrollRollover(emp, W1.from, W1.to, [dir]);
  log(`  saturdayCash=${cash} blocks=${blocks}`);
  R.T5 = cash === 0 && !blocks ? "PASS" : "FAIL";
  log(`T5: ${R.T5}`);
}

// T6 — urlop → nie blokuje
function testT6() {
  log("\n═══ T6 — urlop nie blokuje ═══");
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
  const cash = calcEmployeeSaturdayCash(emp, W1.from, W1.to, [dir], { employeeLeaves: leaves });
  const blocks = blocksPayrollRollover(emp, W1.from, W1.to, [dir], { employeeLeaves: leaves });
  log(`  saturdayCash=${cash} blocks=${blocks}`);
  R.T6 = cash === 0 && !blocks ? "PASS" : "FAIL";
  log(`T6: ${R.T6}`);
}

// T7 — tygodniówka net 0 → nie blokuje
function testT7() {
  log("\n═══ T7 — net 0 nie blokuje ═══");
  const dir = makeDir("dir-zero", "Zero");
  const d = defaultDay();
  const emp = makeEmp("we-zero", "dir-zero", "Zero", "50", {
    days: Object.fromEntries(DAYS.map((k) => [k, { ...d, active: false }])),
  });
  const cash = calcEmployeeSaturdayCash(emp, W1.from, W1.to, [dir]);
  const blocks = blocksPayrollRollover(emp, W1.from, W1.to, [dir]);
  log(`  saturdayCash=${cash} blocks=${blocks}`);
  R.T7 = cash === 0 && !blocks ? "PASS" : "FAIL";
  log(`T7: ${R.T7}`);
}

// T8 — suma saturdayCash ≈ totalSaturdayCash
function testT8() {
  log("\n═══ T8 — suma saturdayCash vs cash split ═══");
  const { weekEmployees, directory } = rosterRca();
  const sum = weekEmployees.reduce(
    (s, e) => s + calcEmployeeSaturdayCash(e, W1.from, W1.to, directory),
    0,
  );
  const split = computePayrollCashSplitWithCarry(weekEmployees, directory, W1.from, W1.to, []);
  const diff = Math.abs(+sum.toFixed(2) - split.totalSaturdayCash);
  log(`  sum=${+sum.toFixed(2)} totalSaturdayCash=${split.totalSaturdayCash} diff=${diff}`);
  R.T8 = diff < 0.02 ? "PASS" : "FAIL";
  log(`T8: ${R.T8}`);
}

// T9 — stara reguła !settled vs nowa (RCA: 5 vs 1)
function testT9() {
  log("\n═══ T9 — RCA: stara reguła 5 blockerów, nowa 1 ═══");
  const { weekEmployees, directory } = rosterRca();
  const oldCount = weekEmployees.filter((e) => !e.settled).length;
  const newCount = weekEmployees.filter((e) =>
    blocksPayrollRollover(e, W1.from, W1.to, directory),
  ).length;
  log(`  old(!settled)=${oldCount} new(saturdayCash)=${newCount}`);
  R.T9 = oldCount === 5 && newCount === 1 ? "PASS" : "FAIL";
  log(`T9: ${R.T9}`);
}

testT1();
testT2();
testT3();
testT4();
testT5();
testT6();
testT7();
testT8();
testT9();

const all = Object.values(R);
const failed = Object.entries(R).filter(([, v]) => v !== "PASS");
log("\n═══ PODSUMOWANIE 20.1C ═══");
for (const [k, v] of Object.entries(R)) log(`  ${k}: ${v}`);
if (failed.length) {
  console.error(`\nFAIL: ${failed.map(([k]) => k).join(", ")}`);
  process.exit(1);
}
log(`\nALL PASS (${all.length}/${all.length})`);
