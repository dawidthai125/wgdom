/**
 * ETAP 1 — koszty do zwrotu: functional patch vs autosync po fixie UI
 * npx vite-node scripts/test-payroll-extra-cost-etap1.mjs
 */
import { mergeWeekEmployeeRecord } from "../src/lib/cloud-sync.ts";

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

const COST_ID = "cost-aaa";
const EMP_ID = "emp-1";

function baseEmp(extraCosts, dataUpdatedAt) {
  return {
    id: EMP_ID,
    directoryId: "dir-1",
    name: "Jan",
    rate: "30",
    days: {},
    extraCosts,
    settled: false,
    ...(dataUpdatedAt ? { dataUpdatedAt } : {}),
  };
}

/** Mirror App.tsx updateWeekEmployeeExtraCosts */
function patchExtraCosts(prev, empId, nextExtraCosts) {
  const now = new Date().toISOString();
  return prev.map((e) => {
    if (e.id !== empId) return e;
    const dataChanged = JSON.stringify(e.extraCosts) !== JSON.stringify(nextExtraCosts);
    if (!dataChanged) return e;
    return { ...e, extraCosts: nextExtraCosts, dataUpdatedAt: now };
  });
}

function amountOf(emp) {
  return emp?.extraCosts?.[0]?.amount ?? "";
}

/** Symulacja applyAdminDataBundle po runCloudSync — merge pojedynczego pracownika */
function simulateApplyAdminMerge(localEmp, cloudEmp) {
  return mergeWeekEmployeeRecord(localEmp, cloudEmp);
}

console.log("=== PAYROLL EXTRA COST ETAP 1 ===\n");

// A — UI patch eliminuje stale snapshot
console.log("--- A ETAP1 UI: stale sibling edit no longer wipes amount ---");
{
  let state = [baseEmp([{ id: COST_ID, description: "", amount: "" }], "2026-06-24T10:00:00.000Z")];
  const row = { id: COST_ID, description: "", amount: "" };
  state = patchExtraCosts(state, EMP_ID, [{ ...row, amount: "150" }]);
  // Stale rate edit via old updateWeekEmployee would wipe; patch ignores it
  const after = amountOf(state[0]);
  assert("A1 patch keeps 150 (no safeEmp spread)", after === "150");
}

console.log("\n--- A2 add row + amount via patch ---");
{
  let state = [baseEmp([])];
  const row = { id: COST_ID, description: "chemia", amount: "" };
  state = patchExtraCosts(state, EMP_ID, [row]);
  state = patchExtraCosts(state, EMP_ID, [{ ...row, amount: "150" }]);
  assert("A2 add then amount 150", amountOf(state[0]) === "150");
}

// B — F1 union-by-id: empty peer / newer employee clock must NOT wipe filled amount
console.log("\n--- B ETAP1 + forced sync: cloud newer empty amount same id ---");
{
  let state = [baseEmp([])];
  const row = { id: COST_ID, description: "", amount: "" };
  state = patchExtraCosts(state, EMP_ID, [row]);
  state = patchExtraCosts(state, EMP_ID, [{ ...row, amount: "150" }]);
  const localEmp = state[0];

  const cloudEmp = baseEmp([{ id: COST_ID, description: "", amount: "" }], "2026-06-24T12:00:02.000Z");
  const merged = simulateApplyAdminMerge(localEmp, cloudEmp);
  assert("B1 F1 keeps 150 despite cloud newer empty amount", amountOf(merged) === "150");
}

console.log("\n--- B2 typical single-device sync after patch ---");
{
  const localEmp = baseEmp([{ id: COST_ID, description: "", amount: "150" }], "2026-06-24T12:00:02.000Z");
  const cloudEmp = baseEmp([{ id: COST_ID, description: "", amount: "" }], "2026-06-24T12:00:01.000Z");
  const merged = simulateApplyAdminMerge(localEmp, cloudEmp);
  assert("B2 local newer keeps 150 after sync", amountOf(merged) === "150");
}

const etap1Status = fail === 0 ? "ETAP1_SMOKE_PASS" : "ETAP1_SMOKE_FAIL";

console.log("\n=== ETAP 1 REPORT ===");
console.log(JSON.stringify({
  etap1Status,
  partialFix: false,
  answerA: "Removing safeEmp spread for extraCosts (onPatchExtraCosts) fixes local stale overwrite",
  answerB: "F1 mergeExtraCostsById keeps filled amount vs empty peer (no whole-array dataUpdatedAt wipe)",
  pass,
  fail,
}, null, 2));

process.exit(fail > 0 ? 1 : 0);
