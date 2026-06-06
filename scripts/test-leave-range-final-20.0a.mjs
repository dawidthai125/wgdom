/**
 * Sprint 20.0A — Final Leave Range Verification
 * Uruchom: npx vite-node scripts/test-leave-range-final-20.0a.mjs
 */
import { calcWeekEmployeeWithLeave } from "../src/lib/payroll-leave-overlay.ts";
import { defaultDay } from "../src/app/app-domain.ts";
import { fmtDate } from "../src/app/app-domain.ts";
import {
  leaveCoversPayrollWeek,
  listSelectablePayrollWeeks,
  mergeEmployeeLeaves,
  validateEmployeeLeaveRecord,
} from "../src/lib/employee-leaves.ts";
import { listPayrollWeekRanges } from "../src/lib/payroll-cycle.ts";

const NOW = new Date(2026, 5, 1, 12, 0, 0);
const DIR_ID = "emp-range-test";
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

function makeEmp() {
  const d = defaultDay();
  const days = Object.fromEntries(
    DAYS.map((k) => [k, k === "So" ? d : { ...d, active: true, from: "07:00", to: "16:00" }]),
  );
  return {
    id: "we-range",
    directoryId: DIR_ID,
    name: "Test Range",
    phone: "",
    position: "Murarz",
    rate: "50",
    days,
    settled: false,
  };
}

/** Symulacja EmployeeLeavesSection.saveForm — picker value = weekFrom obu selectów. */
function buildLeaveFromPicker(
  id,
  leaveType,
  fromPickerWeekFrom,
  toPickerWeekFrom,
  weekOptions,
) {
  const startOpt = weekOptions.find((w) => w.weekFrom === fromPickerWeekFrom);
  const endOpt = weekOptions.find((w) => w.weekFrom === toPickerWeekFrom);
  if (!startOpt || !endOpt) throw new Error(`Brak opcji pickera: ${fromPickerWeekFrom} / ${toPickerWeekFrom}`);
  return {
    id,
    employeeId: DIR_ID,
    leaveType,
    weekStart: startOpt.weekFrom,
    weekEnd: endOpt.weekTo,
    notes: "",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
  };
}

function weeksCoveredByLeave(leave, allWeeks) {
  return allWeeks.filter(({ from, to }) => leaveCoversPayrollWeek(leave, from, to));
}

function weekLabel(from, to) {
  return `${fmtDate(from)} – ${fmtDate(to)}`;
}

const weekOptions = listSelectablePayrollWeeks([], 12, NOW);
const allPayrollWeeks = listPayrollWeekRanges({ from: "2026-06-01", to: "2026-06-06" }, 60);
const emp = makeEmp();

const EXPECTED_WEEKS = [
  ["2026-06-08", "2026-06-13"],
  ["2026-06-15", "2026-06-20"],
  ["2026-06-22", "2026-06-27"],
  ["2026-06-29", "2026-07-04"],
  ["2026-07-06", "2026-07-11"],
  ["2026-07-13", "2026-07-18"],
  ["2026-07-20", "2026-07-25"],
];

const results = {};
let fail = 0;
const failMsg = (step, msg) => {
  console.log(`  ✗ ${msg}`);
  results[step] = "FAIL";
  fail += 1;
};
const passStep = (step) => {
  if (results[step] !== "FAIL") results[step] = "PASS";
};

console.log("Sprint 20.0A — Final Leave Range Verification\n");

// ─── KROK 1 ───────────────────────────────────────────────────────────────────
console.log("═══ KROK 1 — Zapisany rekord ═══");
const leave = buildLeaveFromPicker(
  "leave-range-1",
  "vacation",
  "2026-06-08",
  "2026-07-20",
  weekOptions,
);
console.log(`  weekStart: ${leave.weekStart} (${fmtDate(leave.weekStart)})`);
console.log(`  weekEnd:   ${leave.weekEnd} (${fmtDate(leave.weekEnd)})`);
console.log(`  leaveType: ${leave.leaveType}`);
const v1 = validateEmployeeLeaveRecord(leave, [], []);
const step1ok =
  leave.weekStart === "2026-06-08" &&
  leave.weekEnd === "2026-07-25" &&
  leave.leaveType === "vacation" &&
  v1.ok;
console.log(`  walidacja: ${v1.ok ? "ok" : v1.message}`);
results.krok1 = step1ok ? "PASS" : "FAIL";
if (!step1ok) fail += 1;

// ─── KROK 2 ───────────────────────────────────────────────────────────────────
console.log("\n═══ KROK 2 — Tygodnie objęte urlopem ═══");
let leaves = [leave];
const covered = weeksCoveredByLeave(leave, allPayrollWeeks);
covered.forEach(({ from, to }, i) => {
  console.log(`  ${i + 1}. ${weekLabel(from, to)}  [${from} → ${to}]`);
});
const coveredKeys = covered.map((w) => `${w.from}|${w.to}`);
const expectedOk = EXPECTED_WEEKS.every(([f, t]) => coveredKeys.includes(`${f}|${t}`));
const countOk = covered.length === EXPECTED_WEEKS.length;
console.log(`  Liczba tygodni: ${covered.length} (oczekiwane: ${EXPECTED_WEEKS.length})`);
results.krok2 = expectedOk && countOk ? "PASS" : "FAIL";
if (!expectedOk || !countOk) fail += 1;

// ─── KROK 3 ───────────────────────────────────────────────────────────────────
console.log("\n═══ KROK 3 — Overlay payroll per tydzień ═══");
let krok3ok = true;
for (const { from, to } of covered) {
  const calc = calcWeekEmployeeWithLeave(emp, {
    weekFrom: from,
    weekTo: to,
    employeeLeaves: leaves,
    livePayroll: true,
  });
  const ok = calc.leaveStatus === "vacation" && calc.netPay === 0 && calc.grossPay === 0;
  console.log(
    `  ${weekLabel(from, to)} | leaveStatus=${calc.leaveStatus ?? "—"} | netPay=${calc.netPay} | grossPay=${calc.grossPay} ${ok ? "✓" : "✗"}`,
  );
  if (!ok) krok3ok = false;
}
results.krok3 = krok3ok ? "PASS" : "FAIL";
if (!krok3ok) fail += 1;

// ─── KROK 4 ───────────────────────────────────────────────────────────────────
console.log("\n═══ KROK 4 — Tydzień po urlopie (27.07 – 01.08) ═══");
const afterFrom = "2026-07-27";
const afterTo = "2026-08-01";
const afterCalc = calcWeekEmployeeWithLeave(emp, {
  weekFrom: afterFrom,
  weekTo: afterTo,
  employeeLeaves: leaves,
  livePayroll: true,
});
console.log(`  ${weekLabel(afterFrom, afterTo)}`);
console.log(`  leaveStatus: ${afterCalc.leaveStatus ?? "null"}`);
console.log(`  netPay: ${afterCalc.netPay} (oczekiwane > 0)`);
console.log(`  grossPay: ${afterCalc.grossPay}`);
const krok4ok = !afterCalc.leaveStatus && afterCalc.netPay > 0 && afterCalc.grossPay > 0;
results.krok4 = krok4ok ? "PASS" : "FAIL";
if (!krok4ok) fail += 1;

// ─── KROK 5 ───────────────────────────────────────────────────────────────────
console.log("\n═══ KROK 5 — Edycja: skrócenie Do → 29.06 – 04.07 ═══");
const edited = buildLeaveFromPicker("leave-range-1", "vacation", "2026-06-08", "2026-06-29", weekOptions);
edited.updatedAt = "2026-06-02T10:00:00Z";
leaves = [edited];
const coveredAfterEdit = weeksCoveredByLeave(edited, allPayrollWeeks);
console.log(`  Nowy weekEnd: ${edited.weekEnd} (${fmtDate(edited.weekEnd)})`);
console.log(`  Tygodni objętych: ${coveredAfterEdit.length} (było ${covered.length})`);
coveredAfterEdit.forEach(({ from, to }, i) => {
  console.log(`  ${i + 1}. ${weekLabel(from, to)}`);
});
const EXPECTED_SHORT = [
  ["2026-06-08", "2026-06-13"],
  ["2026-06-15", "2026-06-20"],
  ["2026-06-22", "2026-06-27"],
  ["2026-06-29", "2026-07-04"],
];
const shortKeys = coveredAfterEdit.map((w) => `${w.from}|${w.to}`);
const krok5ok =
  edited.weekEnd === "2026-07-04" &&
  coveredAfterEdit.length === 4 &&
  coveredAfterEdit.length < covered.length &&
  EXPECTED_SHORT.every(([f, t]) => shortKeys.includes(`${f}|${t}`));
// Tydzień 20.07 nie powinien być objęty
const jul20Covered = leaveCoversPayrollWeek(edited, "2026-07-20", "2026-07-25");
console.log(`  20.07–25.07 nadal objęty: ${jul20Covered} (oczekiwane: false)`);
results.krok5 = krok5ok && !jul20Covered ? "PASS" : "FAIL";
if (!krok5ok || jul20Covered) fail += 1;

// ─── KROK 6 ───────────────────────────────────────────────────────────────────
console.log("\n═══ KROK 6 — Usunięcie + sync/reload ═══");
const deletedId = edited.id;
const tombstones = [deletedId];
const localAfterDelete = [];
const cloudStillHas = [edited];
const mergeAfterDelete = mergeEmployeeLeaves(localAfterDelete, cloudStillHas, tombstones);
const mergeReload = mergeEmployeeLeaves(localAfterDelete, cloudStillHas, tombstones);
console.log(`  local po delete: ${localAfterDelete.length} wpisów`);
console.log(`  merge po sync: ${mergeAfterDelete.length} wpisów`);
console.log(`  merge po reload: ${mergeReload.length} wpisów`);
console.log(`  tombstone: ${tombstones.includes(deletedId)}`);
const krok6ok =
  localAfterDelete.length === 0 &&
  mergeAfterDelete.length === 0 &&
  mergeReload.length === 0 &&
  !mergeAfterDelete.some((l) => l.id === deletedId);
results.krok6 = krok6ok ? "PASS" : "FAIL";
if (!krok6ok) fail += 1;

console.log("\n═══ RAPORT PASS / FAIL ═══");
for (const [k, v] of Object.entries(results)) {
  console.log(`  ${k}: ${v}`);
}
console.log(`\nWYNIK: ${fail === 0 ? "PASS" : "FAIL"} (${fail} błędów)`);
process.exit(fail ? 1 : 0);
