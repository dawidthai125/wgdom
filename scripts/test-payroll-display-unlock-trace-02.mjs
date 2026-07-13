/**
 * PAYROLL-DISPLAY-UNLOCK-TRACE-02 — smoke findFirstDisplayUnlock (vite-node, bez przeglądarki).
 * Run: npx vite-node scripts/test-payroll-display-unlock-trace-02.mjs
 */
import {
  logPayrollDisplayTrace,
  payrollDisplayTraceExport,
  payrollDisplayTraceFindFirstDisplayUnlock,
  setPayrollDisplayRuntimeTraceEnabled,
} from "../src/lib/payroll-display-runtime-trace.ts";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

setPayrollDisplayRuntimeTraceEnabled(true);

const base = {
  weekEmployeesLength: 14,
  productionWeekEmployeesLength: 14,
  weekFrom: "2026-07-07",
  weekTo: "2026-07-12",
  currentWeekFrom: "2026-07-07",
  currentWeekTo: "2026-07-12",
  hasRolloverBlockers: false,
};

logPayrollDisplayTrace({
  ...base,
  caller: "resolvePayrollDisplayEmployees",
  reason: "closed_week_no_archive_collapse",
  displayEmployeesLength: 0,
  isClosedWeek: true,
  archivedForWeekLength: 0,
  savedWeeksLength: 0,
});

logPayrollDisplayTrace({
  ...base,
  caller: "PayrollView",
  reason: "pre_table_render",
  displayEmployeesLength: 0,
  isClosedWeek: true,
  archivedForWeekLength: 0,
  savedWeeksLength: 0,
});

logPayrollDisplayTrace({
  ...base,
  caller: "resolvePayrollDisplayEmployees",
  reason: "operational_week_live_roster",
  displayEmployeesLength: 14,
  isClosedWeek: false,
  archivedForWeekLength: 0,
  savedWeeksLength: 2,
  weekFrom: "2026-07-07",
  weekTo: "2026-07-12",
});

const unlock = payrollDisplayTraceFindFirstDisplayUnlock();
assert(unlock != null, "findFirstDisplayUnlock should find 0→14 transition");
assert(unlock.displayEmployeesLength === 14, "unlock display length");
assert(unlock.previousEvent.displayEmployeesLength === 0, "previous display 0");
assert(unlock.reason === "operational_week_live_roster", "unlock reason");
assert(unlock.diff.isClosedWeek === false, "isClosedWeek flipped to false");
assert(unlock.diff.savedWeeksLength === 2, "savedWeeks delta");

const exported = payrollDisplayTraceExport();
assert(exported.firstDisplayUnlock != null, "export includes firstDisplayUnlock");
assert(exported.events.length === 3, "three events recorded");
assert(
  exported.firstDisplayUnlock.currentSeq === unlock.currentSeq,
  "export firstDisplayUnlock matches finder",
);

console.log("PASS PAYROLL-DISPLAY-UNLOCK-TRACE-02", {
  unlockReason: unlock.reason,
  sameReactCommit: unlock.sameReactCommit,
  diff: unlock.diff,
});
