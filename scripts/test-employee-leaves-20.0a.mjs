/**
 * Sprint 20.0A — smoke test nieobecności + overlay payroll.
 * Uruchom: npx vite-node scripts/test-employee-leaves-20.0a.mjs
 */
import {
  leaveDateRangesOverlap,
  leaveCoversPayrollWeek,
  leaveRangeOverlapsArchivedWeeks,
  validateEmployeeLeaveRecord,
  mergeEmployeeLeaves,
} from "../src/lib/employee-leaves.ts";
import { applyLeaveOverlayToCalc } from "../src/lib/payroll-leave-overlay.ts";
import { buildWeekSnapshot, calcWeekEmployee, defaultDay } from "../src/app/app-domain.ts";

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
function defaultDays() {
  return Object.fromEntries(DAYS.map((d) => [d, defaultDay()]));
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

console.log("=== overlap ===");
assert(leaveDateRangesOverlap("2026-06-08", "2026-06-20", "2026-06-15", "2026-06-27"), "ranges overlap");
assert(!leaveDateRangesOverlap("2026-06-08", "2026-06-20", "2026-06-22", "2026-06-27"), "ranges no overlap");
assert(leaveCoversPayrollWeek({ weekStart: "2026-06-08", weekEnd: "2026-06-20" }, "2026-06-08", "2026-06-13"), "urlop week 1");
assert(leaveCoversPayrollWeek({ weekStart: "2026-06-08", weekEnd: "2026-06-20" }, "2026-06-15", "2026-06-20"), "urlop week 2");
assert(!leaveCoversPayrollWeek({ weekStart: "2026-06-08", weekEnd: "2026-06-20" }, "2026-06-22", "2026-06-27"), "urlop not week 3");

console.log("\n=== archived week block ===");
const archive = [{ id: "w1", weekFrom: "2026-06-01", weekTo: "2026-06-06", savedAt: "", employees: [], totalEmployees: 0, totalHours: 0, totalGross: 0, totalZaliczka: 0, totalNet: 0 }];
assert(leaveRangeOverlapsArchivedWeeks("2026-06-08", "2026-06-20", archive) === false, "future leave ok");
assert(leaveRangeOverlapsArchivedWeeks("2026-06-01", "2026-06-06", archive) === true, "archived block");
const bad = validateEmployeeLeaveRecord(
  { id: "l1", employeeId: "e1", leaveType: "vacation", weekStart: "2026-06-01", weekEnd: "2026-06-06" },
  [],
  archive,
);
assert(!bad.ok && bad.error === "archived_week", "validation archived_week");

console.log("\n=== overlap validation ===");
const overlap = validateEmployeeLeaveRecord(
  { id: "l2", employeeId: "e1", leaveType: "vacation", weekStart: "2026-06-08", weekEnd: "2026-06-20" },
  [{ id: "l1", employeeId: "e1", leaveType: "sick", weekStart: "2026-06-15", weekEnd: "2026-06-27", createdAt: "", updatedAt: "" }],
  [],
);
assert(!overlap.ok && overlap.error === "overlap", "overlap blocked");

console.log("\n=== overlay ===");
const emp = {
  id: "we1",
  directoryId: "e1",
  name: "Jan",
  phone: "",
  position: "Murarz",
  rate: "50",
  days: defaultDays(),
  settled: false,
};
emp.days.Pn = { ...defaultDay(), active: true, from: "07:00", to: "16:00" };
const base = calcWeekEmployee(emp);
assert(base.netPay > 0, "base net > 0");
const overlaid = applyLeaveOverlayToCalc(base, "vacation");
assert(overlaid.netPay === 0 && overlaid.grossPay === 0 && overlaid.leaveStatus === "vacation", "overlay zeros pay");
assert(base.netPay > 0, "original hours calc unchanged");

console.log("\n=== snapshot freeze ===");
const leaves = [{ id: "l1", employeeId: "e1", leaveType: "vacation", weekStart: "2026-06-08", weekEnd: "2026-06-20", createdAt: "t", updatedAt: "t" }];
const snap = buildWeekSnapshot("2026-06-08", "2026-06-13", [emp], [], undefined, leaves);
assert(snap.employees[0]?.leaveStatus === "vacation", "snapshot leaveStatus");
assert(snap.employees[0]?.netPay === 0, "snapshot netPay 0");
assert(snap.totalNet === 0, "snapshot totalNet 0");
assert(calcWeekEmployee(emp).netPay > 0, "hours still in weekEmployee");

console.log("\n=== merge ===");
const merged = mergeEmployeeLeaves(
  [{ id: "a", employeeId: "e1", leaveType: "vacation", weekStart: "2026-06-08", weekEnd: "2026-06-13", createdAt: "1", updatedAt: "1" }],
  [{ id: "a", employeeId: "e1", leaveType: "sick", weekStart: "2026-06-08", weekEnd: "2026-06-13", createdAt: "1", updatedAt: "2" }],
);
assert(merged.length === 1 && merged[0].leaveType === "sick", "merge newer updatedAt");

console.log(`\n=== wynik: ${passed} pass, ${failed} fail ===`);
process.exit(failed > 0 ? 1 : 0);
