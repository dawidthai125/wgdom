/**
 * PAYROLL-SIM-01 — payroll payout simulation pure functions.
 * Run: npx vite-node scripts/test-payroll-payout-simulation.mjs
 */
import {
  PAYROLL_SIMULATION_INITIAL,
  resetPayrollSimulationState,
  isEmployeeExcluded,
  filterRowsForSimulation,
  filterEmployeesForSimulation,
  computeSimulatedTotals,
} from "../src/lib/payroll-payout-simulation.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

const biweeklyRowMap = new Map();

function row(id, netPay, weekGross = netPay, weekHours = 40) {
  return {
    emp: { id },
    weekHours,
    prevSatHours: 0,
    totalHours: weekHours,
    weekGross,
    prevSatGross: 0,
    grossPay: weekGross,
    weekZaliczka: 0,
    prevSatZaliczka: 0,
    totalZaliczka: 0,
    totalExtraCosts: 0,
    displayNetPay: netPay,
  };
}

const rows = [row("e1", 1000), row("e2", 2000), row("e3", 500)];

// T1 — brak wykluczeń (disabled)
const t1 = computeSimulatedTotals(rows, biweeklyRowMap, PAYROLL_SIMULATION_INITIAL);
assert("T1 no exclusions totalNet", t1.totalNet === 3500);
assert("T1 filter rows passthrough", filterRowsForSimulation(rows, PAYROLL_SIMULATION_INITIAL).length === 3);
assert("T1 not excluded when disabled", !isEmployeeExcluded("e1", PAYROLL_SIMULATION_INITIAL));

// T2 — jedno wykluczenie
const t2state = { enabled: true, excludedEmployeeIds: ["e2"] };
const t2 = computeSimulatedTotals(rows, biweeklyRowMap, t2state);
assert("T2 single exclude totalNet", t2.totalNet === 1500);
assert("T2 isEmployeeExcluded", isEmployeeExcluded("e2", t2state));
assert("T2 filter rows", filterRowsForSimulation(rows, t2state).length === 2);

// T3 — wiele wykluczeń
const t3state = { enabled: true, excludedEmployeeIds: ["e1", "e3"] };
const t3 = computeSimulatedTotals(rows, biweeklyRowMap, t3state);
assert("T3 multi exclude totalNet", t3.totalNet === 2000);

// T4 — wszystkie wykluczone
const t4state = { enabled: true, excludedEmployeeIds: ["e1", "e2", "e3"] };
const t4 = computeSimulatedTotals(rows, biweeklyRowMap, t4state);
assert("T4 all excluded totalNet zero", t4.totalNet === 0);
assert("T4 all excluded filter empty", filterRowsForSimulation(rows, t4state).length === 0);

// T5 — filterEmployeesForSimulation
const employees = [{ id: "e1" }, { id: "e2" }, { id: "e3" }];
assert(
  "T5 filter employees",
  filterEmployeesForSimulation(employees, t2state).map((e) => e.id).join() === "e1,e3",
);

// T6 — reset tygodnia
const reset = resetPayrollSimulationState();
assert("T6 reset enabled false", reset.enabled === false);
assert("T6 reset excluded empty", reset.excludedEmployeeIds.length === 0);
assert(
  "T6 reset matches initial",
  JSON.stringify(reset) === JSON.stringify(PAYROLL_SIMULATION_INITIAL),
);

// T7 — enabled bez wykluczeń = pełne sumy
const t7state = { enabled: true, excludedEmployeeIds: [] };
const t7 = computeSimulatedTotals(rows, biweeklyRowMap, t7state);
assert("T7 enabled empty exclude full total", t7.totalNet === 3500);

console.log(`\n${pass} PASS / ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
