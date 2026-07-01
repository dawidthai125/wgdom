/**
 * Payroll P0 — mergeWeekEmployeesForWeekRange asymmetry (local vs cloud empty).
 * npx vite-node scripts/test-payroll-week-employee-merge-asymmetry.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import {
  mergeWeekEmployees,
  mergeWeekEmployeesForWeekRange,
} from "../src/lib/cloud-sync.ts";

const WEEK = { from: "2026-06-23", to: "2026-06-28" };
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

function defaultDays() {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [
      k,
      k === "So" ? d : { ...d, active: true, from: "07:00", to: "16:00" },
    ]),
  );
}

function makeEmp(id, name) {
  return {
    id,
    directoryId: `dir-${id}`,
    name,
    phone: "+48 500 000 001",
    position: "Pracownik",
    rate: "50",
    days: defaultDays(),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
}

function mergeForWeek(localEmps, cloudEmps, archive = []) {
  return mergeWeekEmployeesForWeekRange(
    WEEK.from,
    WEEK.to,
    WEEK.from,
    WEEK.to,
    localEmps,
    WEEK.from,
    WEEK.to,
    cloudEmps,
    archive,
  );
}

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

function empIds(list) {
  return (Array.isArray(list) ? list : []).map((e) => e.id).sort();
}

function dirKeys(list) {
  return (Array.isArray(list) ? list : [])
    .map((e) => e.directoryId)
    .filter(Boolean)
    .sort();
}

const localFull = [makeEmp("e1", "Jan Kowalski"), makeEmp("e2", "Anna Nowak")];
const cloudFull = [makeEmp("c1", "Cloud Worker")];

console.log("=== PAYROLL WEEK EMPLOYEE MERGE ASYMMETRY ===\n");

// T1 — local pełny, cloud pusty → local
console.log("T1 local full, cloud empty");
{
  const merged = mergeForWeek(localFull, []);
  assert("T1 length", merged.length === 2);
  assert("T1 ids", JSON.stringify(empIds(merged)) === JSON.stringify(["e1", "e2"]));
}

// T2 — local pusty, cloud pełny → cloud
console.log("\nT2 local empty, cloud full");
{
  const merged = mergeForWeek([], cloudFull);
  assert("T2 length", merged.length === 1);
  assert("T2 ids", JSON.stringify(empIds(merged)) === JSON.stringify(["c1"]));
}

// T3 — oba pełne → mergeWeekEmployees (union by id)
console.log("\nT3 both full → mergeWeekEmployees");
{
  const merged = mergeForWeek(localFull, cloudFull);
  const expected = mergeWeekEmployees(localFull, cloudFull);
  assert("T3 same as mergeWeekEmployees", JSON.stringify(empIds(merged)) === JSON.stringify(empIds(expected)));
  assert("T3 non-empty", merged.length > 0);
}

// T4 — oba puste → []
console.log("\nT4 both empty");
{
  const merged = mergeForWeek([], []);
  assert("T4 empty", merged.length === 0);
}

// T5 — hasArchivedWeek=true → asymmetry branch skipped, mergeWeekEmployees
console.log("\nT5 hasArchivedWeek=true (no asymmetry shortcut)");
{
  const archive = [
    {
      id: "arch-1",
      weekFrom: WEEK.from,
      weekTo: WEEK.to,
      weekEmployees: [makeEmp("arch-e1", "Archived")],
    },
  ];
  const mergedEmptyLocal = mergeForWeek([], cloudFull, archive);
  const expectedEmptyLocal = mergeWeekEmployees([], cloudFull);
  assert("T5 local empty uses mergeWeekEmployees", JSON.stringify(empIds(mergedEmptyLocal)) === JSON.stringify(empIds(expectedEmptyLocal)));

  const mergedFullLocal = mergeForWeek(localFull, [], archive);
  const expectedFullLocal = mergeWeekEmployees(localFull, []);
  assert("T5 local full uses mergeWeekEmployees", JSON.stringify(empIds(mergedFullLocal)) === JSON.stringify(empIds(expectedFullLocal)));
}

// T6 — local +1 directoryId vs pełny cloud → union (nie subset UUID)
console.log("\nT6 local +1 directoryId vs full cloud");
{
  const localPlus = [
    ...localFull,
    makeEmp("e3", "Piotr Zielinski"),
  ];
  const merged = mergeWeekEmployees(localPlus, cloudFull);
  assert("T6 length 4 (union local+cloud)", merged.length === 4);
  assert("T6 has dir-e3", dirKeys(merged).includes("dir-e3"));
  assert("T6 has cloud dir-c1", dirKeys(merged).includes("dir-c1"));
}

// T7 — concurrent device adds (union po directoryId)
console.log("\nT7 two-device X + Y");
{
  const base = [makeEmp("b1", "Base One"), makeEmp("b2", "Base Two")];
  const cloudStale = base.map((e) => ({ ...e }));
  const localA = [...base, makeEmp("a-x", "Worker X")];
  const localB = [...base, makeEmp("b-y", "Worker Y")];
  const afterA = mergeWeekEmployees(localA, cloudStale);
  const final = mergeWeekEmployees(localB, afterA);
  assert("T7 count 4", final.length === 4);
  assert("T7 dir-X", dirKeys(final).includes("dir-a-x"));
  assert("T7 dir-Y", dirKeys(final).includes("dir-b-y"));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
