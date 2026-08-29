/**
 * PAYROLL — settlement vs data timestamps + spurious guard + TIMEOUT rehydrate.
 * Run: npx vite-node scripts/test-payroll-settled-cross-device-fix.mjs
 *
 * Contract:
 * - settledUpdatedAt = settlement clock
 * - dataUpdatedAt = payroll data clock (days/prevSat/extraCosts) — NOT settlement-only
 * - conscious unsettle after applyWriteTimestamps has sAt≠dAt → LWW local false
 * - spurious (sAt≈dAt) still protected by symmetric guard
 */
import { applyWriteTimestamps } from "../src/app/app-domain.ts";
import {
  pickPayrollSettledByTimestamps,
  mergeWeekEmployeeRecord,
} from "../src/lib/payroll-week-employee-record-merge.ts";
import {
  publishBootstrapPayrollHandoff,
  signalBootstrapPayrollLateRehydrate,
  subscribeBootstrapPayrollLateRehydrate,
  clearBootstrapPayrollHandoffForTests,
  peekBootstrapPayrollHandoff,
} from "../src/lib/cloud-bootstrap.ts";
import {
  BOOTSTRAP_OFFLINE_TIMEOUT_MS,
  isCloudBootstrapReady,
  resolveBootstrapPhaseOpen,
} from "../src/lib/cloud-loader-bootstrap-gate.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.error("FAIL", name);
  }
}

const NEW = "2026-08-29T10:00:00.000Z";
const OLD = "2026-08-28T10:00:00.000Z";
const GENUINE_DATA = "2026-08-29T09:00:00.000Z";
const T = "2026-08-29T12:00:00.000Z";
const T_MINUS_5S = "2026-08-29T11:59:55.000Z";

function baseEmp(over = {}) {
  return {
    id: "e1",
    name: "Jan",
    rate: "30",
    settled: true,
    settledUpdatedAt: OLD,
    dataUpdatedAt: OLD,
    days: { Pn: { active: true, from: "07:00", to: "16:00" } },
    prevSaturday: undefined,
    extraCosts: [],
    ...over,
  };
}

// --- SETTLEMENT LWW ---

// 1 conscious unsettle path via applyWriteTimestamps + older cloud true
{
  const prev = [baseEmp({ settled: true, settledUpdatedAt: OLD, dataUpdatedAt: OLD })];
  // Mirror unsettleEmployee: flip settled; applyWriteTimestamps owns clocks
  const nextIn = [{ ...prev[0], settled: false }];
  const afterTs = applyWriteTimestamps("kw-week-employees", prev, nextIn);
  const local = afterTs[0];
  assert("1 settlement-only: dataUpdatedAt NOT bumped", local.dataUpdatedAt === OLD);
  assert("1 settlement-only: settledUpdatedAt bumped", local.settledUpdatedAt !== OLD && !!local.settledUpdatedAt);
  assert("1 settled=false", local.settled === false);

  const cloudAt = new Date(Date.parse(local.settledUpdatedAt) - 5000).toISOString();
  const cloud = baseEmp({
    settled: true,
    settledUpdatedAt: cloudAt,
    dataUpdatedAt: OLD,
  });
  const merged = mergeWeekEmployeeRecord(local, cloud);
  assert("1 conscious unsettle wins over older cloud true", merged.settled === false);
}

// 2 conscious settle
{
  const prev = [baseEmp({ settled: false, settledUpdatedAt: OLD, dataUpdatedAt: OLD })];
  const nextIn = [{ ...prev[0], settled: true }];
  const local = applyWriteTimestamps("kw-week-employees", prev, nextIn)[0];
  assert("2 settle: dataUpdatedAt NOT bumped", local.dataUpdatedAt === OLD);
  const cloudAt = new Date(Date.parse(local.settledUpdatedAt) - 5000).toISOString();
  const cloud = baseEmp({ settled: false, settledUpdatedAt: cloudAt, dataUpdatedAt: OLD });
  assert("2 conscious settle wins LWW", mergeWeekEmployeeRecord(local, cloud).settled === true);
}

// 3 spurious local unsettle (sAt≈dAt) → cloud true
{
  const settled = pickPayrollSettledByTimestamps(
    { settled: false, settledUpdatedAt: NEW, dataUpdatedAt: NEW },
    { settled: true, settledUpdatedAt: OLD, dataUpdatedAt: OLD },
  );
  assert("3 spurious local unsettle → cloud true", settled === true);
}

// 4 genuine local unsettle sAt≠dAt → local false
{
  assert(
    "4 genuine sAt≠dAt → local false",
    pickPayrollSettledByTimestamps(
      { settled: false, settledUpdatedAt: NEW, dataUpdatedAt: GENUINE_DATA },
      { settled: true, settledUpdatedAt: OLD, dataUpdatedAt: OLD },
    ) === false,
  );
}

// 5 tie → local (PR-PAY-S5)
{
  assert(
    "5 tie → local false",
    pickPayrollSettledByTimestamps(
      { settled: false, settledUpdatedAt: NEW, dataUpdatedAt: GENUINE_DATA },
      { settled: true, settledUpdatedAt: NEW, dataUpdatedAt: OLD },
    ) === false,
  );
}

// 6 no timestamps → OR
{
  assert(
    "6 no ts → OR true",
    pickPayrollSettledByTimestamps({ settled: false }, { settled: true }) === true,
  );
}

// 7 local true / cloud false
{
  assert(
    "7 local true wins",
    pickPayrollSettledByTimestamps(
      { settled: true, settledUpdatedAt: NEW, dataUpdatedAt: OLD },
      { settled: false, settledUpdatedAt: OLD, dataUpdatedAt: OLD },
    ) === true,
  );
}

// 8 cloud newer spurious false + local true → protect settled
{
  assert(
    "8 cloud spurious unsettle → keep local true",
    pickPayrollSettledByTimestamps(
      { settled: true, settledUpdatedAt: OLD, dataUpdatedAt: "2026-08-27T10:00:00.000Z" },
      { settled: false, settledUpdatedAt: NEW, dataUpdatedAt: NEW },
    ) === true,
  );
}

// --- DATA TIMESTAMP ---

// 9 already covered in 1/2 — settlement-only no data bump
// 10 actual payroll-data change bumps dataUpdatedAt
{
  const prev = [baseEmp()];
  const nextIn = [
    {
      ...prev[0],
      days: { Pn: { active: true, from: "07:00", to: "15:00" } },
    },
  ];
  const local = applyWriteTimestamps("kw-week-employees", prev, nextIn)[0];
  assert("10 data edit bumps dataUpdatedAt", local.dataUpdatedAt !== OLD && !!local.dataUpdatedAt);
  assert("10 data edit does not bump settledUpdatedAt", local.settledUpdatedAt === OLD);
}

// 11 settlement + data in same write → dataUpdatedAt bumps from data only
{
  const prev = [baseEmp({ settled: true })];
  const nextIn = [
    {
      ...prev[0],
      settled: false,
      settledUpdatedAt: T,
      days: { Pn: { active: true, from: "08:00", to: "16:00" } },
    },
  ];
  const local = applyWriteTimestamps("kw-week-employees", prev, nextIn)[0];
  assert("11 combo: settled=false", local.settled === false);
  assert("11 combo: dataUpdatedAt bumped", local.dataUpdatedAt !== OLD);
  assert("11 combo: settledUpdatedAt bumped", local.settledUpdatedAt !== OLD);
}

// --- TIMEOUT ---

// 12 TIMEOUT + late rehydrate
{
  clearBootstrapPayrollHandoffForTests();
  let applied = null;
  const unsub = subscribeBootstrapPayrollLateRehydrate((h) => {
    applied = h;
  });
  let phase = resolveBootstrapPhaseOpen("PENDING", "TIMEOUT");
  assert("12 phase TIMEOUT", phase === "TIMEOUT");
  assert("12 ready", isCloudBootstrapReady(phase) === true);
  const merged = [
    { id: "e1", name: "Adam", settled: true, settledUpdatedAt: NEW },
    { id: "e2", name: "Marcin", settled: true, settledUpdatedAt: NEW },
  ];
  publishBootstrapPayrollHandoff({
    weekEmployees: merged,
    weekFrom: "2026-08-24",
    weekTo: "2026-08-29",
  });
  signalBootstrapPayrollLateRehydrate({
    weekEmployees: merged,
    weekFrom: "2026-08-24",
    weekTo: "2026-08-29",
  });
  assert("12 React payload == merged roster", applied?.weekEmployees?.length === 2);
  assert("12 Adam settled true", applied.weekEmployees[0].settled === true);
  assert("12 handoff peek", peekBootstrapPayrollHandoff()?.weekEmployees?.length === 2);
  unsub();
  clearBootstrapPayrollHandoffForTests();
}

// 13 SUCCESS before mount semantics
{
  clearBootstrapPayrollHandoffForTests();
  let phase = resolveBootstrapPhaseOpen("PENDING", "SUCCESS");
  assert("13 SUCCESS", phase === "SUCCESS");
  assert("13 TIMEOUT cannot overwrite", resolveBootstrapPhaseOpen(phase, "TIMEOUT") === "SUCCESS");
  assert("13 offline ms", BOOTSTRAP_OFFLINE_TIMEOUT_MS === 15_000);
}

// 14 late rehydrate no timestamp rewrite
{
  clearBootstrapPayrollHandoffForTests();
  const roster = [{ id: "h1", settled: true, settledUpdatedAt: OLD, dataUpdatedAt: OLD }];
  let got = null;
  const unsub = subscribeBootstrapPayrollLateRehydrate((h) => {
    got = h.weekEmployees[0];
  });
  signalBootstrapPayrollLateRehydrate({
    weekEmployees: roster,
    weekFrom: "2026-08-24",
    weekTo: "2026-08-29",
  });
  assert("14 settledUpdatedAt unchanged", got?.settledUpdatedAt === OLD);
  assert("14 dataUpdatedAt unchanged", got?.dataUpdatedAt === OLD);
  unsub();
  clearBootstrapPayrollHandoffForTests();
}

// pending after subscribe race
{
  clearBootstrapPayrollHandoffForTests();
  signalBootstrapPayrollLateRehydrate({
    weekEmployees: [{ id: "p1", settled: true }],
    weekFrom: "2026-08-24",
    weekTo: "2026-08-29",
  });
  let got = null;
  const unsub = subscribeBootstrapPayrollLateRehydrate((h) => {
    got = h;
  });
  await new Promise((r) => queueMicrotask(r));
  assert("14b pending delivered after subscribe", got?.weekEmployees?.[0]?.id === "p1");
  unsub();
  clearBootstrapPayrollHandoffForTests();
}

console.log(`\nsettled-cross-device-fix: ${pass} PASS / ${fail} FAIL`);
process.exit(fail ? 1 : 0);
