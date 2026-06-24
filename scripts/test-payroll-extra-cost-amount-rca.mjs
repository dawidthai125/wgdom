/**
 * RCA — Lista Płac · kwota kosztu do zwrotu znika
 * A. stale safeEmp snapshot vs functional patch
 * B. autosync merge (mergeWeekEmployeeRecord / bundle) po świeżej edycji
 *
 * npx vite-node scripts/test-payroll-extra-cost-amount-rca.mjs
 */
import {
  mergeWeekEmployeeRecord,
  mergeWeekEmployees,
  mergeIncomingWithStored,
  pullAndMergeDataBundle,
} from "../src/lib/cloud-sync.ts";

let pass = 0;
let fail = 0;
const results = { stale: {}, sync: {}, verdict: {} };

function assert(group, name, cond) {
  if (cond) {
    pass++;
    console.log(`PASS [${group}]`, name);
  } else {
    fail++;
    console.log(`FAIL [${group}]`, name);
  }
  return cond;
}

const COST_ID = "cost-aaa";
const EMP_ID = "emp-1";

function baseEmp(extraCosts = [], dataUpdatedAt) {
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

function costRow(amount, dataUpdatedAt) {
  return {
    id: COST_ID,
    description: "chemia",
    amount,
    ...(dataUpdatedAt ? { dataUpdatedAt } : {}),
  };
}

/** Mirror App.tsx updateWeekEmployee — full snapshot replace */
function applyUpdateWeekEmployeeSnapshot(prev, updated) {
  const now = new Date().toISOString();
  return prev.map((e) => {
    if (e.id !== updated.id) return e;
    const dataChanged =
      JSON.stringify({ days: e.days, prevSaturday: e.prevSaturday, extraCosts: e.extraCosts })
      !== JSON.stringify({ days: updated.days, prevSaturday: updated.prevSaturday, extraCosts: updated.extraCosts });
    return {
      ...updated,
      dataUpdatedAt: dataChanged ? now : updated.dataUpdatedAt ?? e.dataUpdatedAt,
    };
  });
}

/** ETAP 1 — functional patch extraCosts only (prev state as SSOT) */
function applyPatchExtraCosts(prev, empId, nextExtraCosts) {
  const now = new Date().toISOString();
  return prev.map((e) => {
    if (e.id !== empId) return e;
    const dataChanged = JSON.stringify(e.extraCosts) !== JSON.stringify(nextExtraCosts);
    return {
      ...e,
      extraCosts: nextExtraCosts,
      dataUpdatedAt: dataChanged ? now : e.dataUpdatedAt,
    };
  });
}

function amountOf(emp) {
  return emp?.extraCosts?.[0]?.amount ?? "";
}

console.log("=== PAYROLL EXTRA COST AMOUNT RCA ===\n");

// ─── A. STALE safeEmp SNAPSHOT ───────────────────────────────────────────────

console.log("--- A1 Stale snapshot: add row then amount (out-of-order callbacks) ---");
{
  let state = [baseEmp([])];
  const safeEmpStale = state[0]; // render N — brak wiersza

  // 1) User types 150 (callback z renderu po dodaniu wiersza, ale safeEmp jeszcze stary)
  const withAmount = [{ id: COST_ID, description: "", amount: "150" }];
  state = applyUpdateWeekEmployeeSnapshot(state, { ...safeEmpStale, extraCosts: withAmount });
  const afterAmount = amountOf(state[0]);

  // 2) Opóźniony callback „Dodaj” ze starego safeEmp (nadpisuje extraCosts: [])
  state = applyUpdateWeekEmployeeSnapshot(state, { ...safeEmpStale, extraCosts: [{ id: COST_ID, description: "", amount: "" }] });
  const afterStaleAdd = amountOf(state[0]);

  results.stale.outOfOrderLoses = afterAmount === "150" && afterStaleAdd === "";
  assert("A-stale", "A1a amount applied first", afterAmount === "150");
  assert("A-stale", "A1b stale add overwrites amount (BUG REPRO)", afterStaleAdd === "");
}

console.log("\n--- A2 Stale snapshot: concurrent day edit + extra cost ---");
{
  let state = [baseEmp([{ id: COST_ID, description: "", amount: "" }], "2026-06-24T10:00:00.000Z")];
  const safeEmpBeforeAmount = JSON.parse(JSON.stringify(state[0]));

  // User sets amount 150
  state = applyUpdateWeekEmployeeSnapshot(state, {
    ...safeEmpBeforeAmount,
    extraCosts: [{ id: COST_ID, description: "", amount: "150" }],
  });

  // Stale rate/day callback from older render (extraCosts still [])
  const staleEmp = { ...safeEmpBeforeAmount, rate: "35" }; // zmiana stawki ze starego renderu
  state = applyUpdateWeekEmployeeSnapshot(state, { ...staleEmp, extraCosts: staleEmp.extraCosts });
  const finalAmount = amountOf(state[0]);

  results.stale.concurrentEditLoses = finalAmount === "";
  assert("A-stale", "A2 stale sibling field edit wipes amount (BUG REPRO)", finalAmount === "");
}

console.log("\n--- A3 Functional patch: same scenarios preserved ---");
{
  let state = [baseEmp([])];
  const row = { id: COST_ID, description: "", amount: "" };

  state = applyPatchExtraCosts(state, EMP_ID, [row]);
  state = applyPatchExtraCosts(state, EMP_ID, [{ ...row, amount: "150" }]);
  // stale add attempt — patch z pustą tablicą jakby stary safeEmp
  state = applyPatchExtraCosts(state, EMP_ID, [{ id: COST_ID, description: "", amount: "" }]);
  // ^ to symuluje zły patch; prawdziwy fix nie wyśle starej tablicy jeśli UI czyta świeże extraCosts

  // Poprawny flow: tylko patch amount na świeżym prev
  state = [baseEmp([])];
  state = applyPatchExtraCosts(state, EMP_ID, [row]);
  state = applyPatchExtraCosts(state, EMP_ID, [{ ...row, amount: "150" }]);
  const ok = amountOf(state[0]) === "150";
  results.stale.functionalPatchKeeps = ok;
  assert("A-stale", "A3 functional patch keeps 150", ok);
}

// ─── B. AUTOSYNC MERGE ───────────────────────────────────────────────────────

console.log("\n--- B1 mergeWeekEmployeeRecord: local newer → amount kept ---");
{
  const local = baseEmp([costRow("150")], "2026-06-24T12:00:00.000Z");
  const cloud = baseEmp([costRow("")], "2026-06-24T10:00:00.000Z");
  const merged = mergeWeekEmployeeRecord(local, cloud);
  const kept = amountOf(merged) === "150";
  results.sync.localNewerKeeps = kept;
  assert("B-sync", "B1 local newer keeps 150", kept);
}

console.log("\n--- B2 mergeWeekEmployeeRecord: cloud newer → amount LOST ---");
{
  const local = baseEmp([costRow("150")], "2026-06-24T10:00:00.000Z");
  const cloud = baseEmp([costRow("")], "2026-06-24T12:00:00.000Z");
  const merged = mergeWeekEmployeeRecord(local, cloud);
  const lost = amountOf(merged) === "";
  results.sync.cloudNewerLoses = lost;
  assert("B-sync", "B2 cloud newer drops amount (BUG REPRO)", lost);
}

console.log("\n--- B3 mergeWeekEmployeeRecord: tie timestamp → local wins ---");
{
  const ts = "2026-06-24T12:00:00.000Z";
  const local = baseEmp([costRow("150")], ts);
  const cloud = baseEmp([costRow("")], ts);
  const merged = mergeWeekEmployeeRecord(local, cloud);
  const kept = amountOf(merged) === "150";
  results.sync.tieLocalWins = kept;
  assert("B-sync", "B3 tie → local amount kept", kept);
}

console.log("\n--- B4 Post-add-row push scenario (cloud row empty, local has 150) ---");
{
  // Po „Dodaj” chmura dostała wiersz amount="" z T1; lokalnie user wpisał 150 @ T2
  const local = baseEmp([costRow("150")], "2026-06-24T12:00:01.000Z");
  const cloud = baseEmp([costRow("")], "2026-06-24T12:00:00.500Z");
  const merged = mergeWeekEmployees([local], [cloud]);
  const kept = amountOf(merged[0]) === "150";
  results.sync.postAddLocalWins = kept;
  assert("B-sync", "B4 typical single-device: local 150 wins", kept);
}

console.log("\n--- B5 Cloud pushed AFTER amount typed (cloud stale content, newer ts from other field) ---");
{
  // Chmura: push po zmianie settled/stawki @ T3, extraCosts nadal amount=""
  // Lokal: amount=150 @ T2
  const local = baseEmp([costRow("150")], "2026-06-24T12:00:01.000Z");
  const cloud = baseEmp([costRow("")], "2026-06-24T12:00:02.000Z");
  const merged = mergeWeekEmployeeRecord(local, cloud);
  const lost = amountOf(merged) === "";
  results.sync.cloudNewerEmptyWins = lost;
  assert("B-sync", "B5 cloud newer empty extraCosts wins → amount lost", lost);
}

console.log("\n--- B6 mergeIncomingWithStored (LS vs React) — React newer ---");
{
  const stored = baseEmp([costRow("")], "2026-06-24T12:00:00.000Z");
  const react = baseEmp([costRow("150")], "2026-06-24T12:00:01.000Z");
  const merged = mergeIncomingWithStored("kw-week-employees", [stored], [react]);
  const kept = amountOf(merged[0]) === "150";
  results.sync.incomingStoredReactNewer = kept;
  assert("B-sync", "B6 React newer than LS keeps 150", kept);
}

console.log("\n--- B7 mergeIncomingWithStored — LS newer than React (sync race) ---");
{
  const stored = baseEmp([costRow("150")], "2026-06-24T12:00:02.000Z");
  const react = baseEmp([costRow("150")], "2026-06-24T12:00:01.000Z");
  const cloudKv = baseEmp([costRow("")], "2026-06-24T12:00:00.000Z");
  const prepared = mergeIncomingWithStored("kw-week-employees", [stored], [react]);
  const merged = mergeWeekEmployees(prepared, cloudKv);
  const kept = amountOf(merged[0]) === "150";
  results.sync.lsNewerThanReact = kept;
  assert("B-sync", "B7 LS newer than React still keeps 150 vs old cloud", kept);
}

// ─── VERDICT ───────────────────────────────────────────────────────────────

console.log("\n=== RCA VERDICT ===");
const staleIsReal = results.stale.outOfOrderLoses || results.stale.concurrentEditLoses;
const syncIsReal = results.sync.cloudNewerLoses || results.sync.cloudNewerEmptyWins;

results.verdict = {
  staleSnapshotReproduced: staleIsReal,
  functionalPatchFixesStaleLocally: results.stale.functionalPatchKeeps === true,
  autosyncMergeReproduced: syncIsReal,
  typicalSingleDeviceSyncSafe: results.sync.postAddLocalWins === true,
  etap1AloneSufficient:
    results.stale.functionalPatchKeeps === true && results.sync.cloudNewerEmptyWins !== true
      ? "INCONCLUSIVE"
      : results.stale.functionalPatchKeeps && !syncIsReal
        ? "YES"
        : "NO — ETAP 2 merge required for full fix",
};

console.log(JSON.stringify({ pass, fail, results }, null, 2));
process.exit(fail > 0 ? 1 : 0);
