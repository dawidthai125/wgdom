/**
 * ETAP 1 — godziny listy płac: functional patch (A2/A3/A4 z RCA)
 * npx vite-node scripts/test-payroll-hours-etap1.mjs
 */
import { defaultDay, defaultDays } from "../src/app/app-domain.ts";

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
  return cond;
}

const EMP_A = "emp-a";
const EMP_B = "emp-b";

function baseEmp(id, days = defaultDays(), dataUpdatedAt) {
  return {
    id,
    directoryId: `dir-${id}`,
    name: id,
    rate: "30",
    days,
    extraCosts: [],
    settled: false,
    ...(dataUpdatedAt ? { dataUpdatedAt } : {}),
  };
}

function srHours(from = "07:00", to = "16:00") {
  return { ...defaultDay(), active: true, from, to };
}

function srOf(emp) {
  return emp?.days?.Sr;
}

/** Mirror App.tsx updateWeekEmployeeDay */
function patchDay(prev, empId, key, nextDay) {
  const now = new Date().toISOString();
  return prev.map((e) => {
    if (e.id !== empId) return e;
    const days = { ...e.days, [key]: nextDay };
    const dataChanged = JSON.stringify(e.days) !== JSON.stringify(days);
    if (!dataChanged) return e;
    return { ...e, days, dataUpdatedAt: now };
  });
}

/** Mirror App.tsx updateWeekEmployeeRate */
function patchRate(prev, empId, rate) {
  const now = new Date().toISOString();
  return prev.map((e) => {
    if (e.id !== empId) return e;
    if (e.rate === rate) return e;
    return { ...e, rate, rateUpdatedAt: now };
  });
}

/** Mirror App.tsx updateWeekEmployeePrevSaturday */
function patchPrevSaturday(prev, empId, nextPrevSaturday) {
  const prevSaturday = { ...nextPrevSaturday, extraHours: undefined };
  const now = new Date().toISOString();
  return prev.map((e) => {
    if (e.id !== empId) return e;
    const dataChanged = JSON.stringify(e.prevSaturday) !== JSON.stringify(prevSaturday);
    if (!dataChanged) return e;
    return { ...e, prevSaturday, dataUpdatedAt: now };
  });
}

/** OLD anti-pattern — full snapshot replace */
function applySnapshot(prev, updated) {
  return prev.map((e) => (e.id === updated.id ? { ...updated } : e));
}

console.log("=== PAYROLL HOURS ETAP 1 ===\n");

console.log("--- A2 stale rate no longer wipes Sr ---");
{
  let state = [baseEmp(EMP_A)];
  state = patchDay(state, EMP_A, "Sr", srHours());
  state = patchRate(state, EMP_A, "35");
  assert("A2 Sr 07-16 kept after rate patch", srOf(state[0])?.from === "07:00" && srOf(state[0])?.to === "16:00");
}

console.log("\n--- A3 stale prevSaturday no longer wipes Sr ---");
{
  let state = [baseEmp(EMP_A)];
  state = patchDay(state, EMP_A, "Sr", srHours());
  const ps = { ...defaultDay(), active: true, from: "08:00", to: "14:00", notes: [] };
  state = patchPrevSaturday(state, EMP_A, ps);
  assert("A3 Sr kept after prevSaturday patch", srOf(state[0])?.from === "07:00");
}

console.log("\n--- A4 employee switch A→B→A keeps Sr ---");
{
  let state = [baseEmp(EMP_A), baseEmp(EMP_B)];
  state = patchDay(state, EMP_A, "Sr", { ...defaultDay(), active: true });
  state = patchDay(state, EMP_A, "Sr", { ...defaultDay(), active: true, from: "07:00" });
  state = patchDay(state, EMP_A, "Sr", srHours());
  const afterB = state.find((e) => e.id === EMP_B);
  const afterReturnA = state.find((e) => e.id === EMP_A);
  assert("A4a B untouched", afterB && srOf(afterB)?.active !== true);
  assert("A4b A Sr 07-16 after switch read", srOf(afterReturnA)?.from === "07:00" && srOf(afterReturnA)?.to === "16:00");
}

console.log("\n--- A4 regression: old snapshot rate still wipes (boundary) ---");
{
  let state = [baseEmp(EMP_A)];
  state = patchDay(state, EMP_A, "Sr", srHours());
  const stale = JSON.parse(JSON.stringify(baseEmp(EMP_A)));
  state = applySnapshot(state, { ...stale, rate: "35" });
  const lost = srOf(state[0])?.active !== true;
  assert("A4c old snapshot pattern still loses Sr (why we removed onChange)", lost);
}

console.log("\n=== ETAP 1 REPORT ===");
console.log(JSON.stringify({
  etap1Status: fail === 0 ? "ETAP1_SMOKE_PASS" : "ETAP1_SMOKE_FAIL",
  pass,
  fail,
}, null, 2));

process.exit(fail > 0 ? 1 : 0);
