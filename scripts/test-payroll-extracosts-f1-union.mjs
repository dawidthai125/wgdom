/**
 * PAYROLL F1 — extraCosts union-by-id / per-item LWW (lost-update fix)
 * Owner GO — code/test only. No production writes.
 */
import { mergeExtraCostsById, stampExtraCostsOnEdit, pickExtraCostByLww } from "../src/lib/payroll-extra-costs-merge.ts";
import { mergeWeekEmployeeRecord } from "../src/lib/payroll-week-employee-record-merge.ts";
import {
  applyPayrollFieldIntentsOntoCanonical,
  rebasePayrollFieldIntents,
} from "../src/lib/payroll-field-intent.ts";
import { rebasePayrollExtraCostsIntent } from "../src/lib/payroll-roster-rebase.ts";
import { canSoftRestoreHoursFromPrevRoster } from "../src/lib/payroll-soft-restore.ts";
import { defaultDay, defaultDays } from "../src/app/app-domain.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.error(`FAIL ${name}`);
  }
}

const WF = "2026-09-14";
const WT = "2026-09-19";

function cost(id, desc, amount, updatedAt) {
  return {
    id,
    description: desc,
    amount: String(amount),
    status: "approved",
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function emp(overrides = {}) {
  return {
    id: "e1",
    directoryId: "dir-1",
    name: "Test",
    phone: "",
    position: "",
    rate: "30",
    settled: false,
    days: defaultDays(),
    prevSaturday: defaultDay(),
    extraCosts: [],
    dataUpdatedAt: "2026-09-14T10:00:00.000Z",
    ...overrides,
  };
}

function ids(list) {
  return (list || []).map((c) => c.id).sort().join(",");
}

function descs(list) {
  return (list || []).map((c) => c.description).sort().join(",");
}

// --- T1 local=[] cloud=[X] → [X]
{
  const r = mergeExtraCostsById([], [cost("x", "X", 10, "2026-09-14T12:00:00.000Z")]);
  assert("T1", ids(r) === "x" && descs(r) === "X");
}

// --- T2 local=[X] cloud=[] → [X]
{
  const r = mergeExtraCostsById([cost("x", "X", 10, "2026-09-14T12:00:00.000Z")], []);
  assert("T2", ids(r) === "x");
}

// --- T3 local=[X] cloud=[Y] → [X,Y]
{
  const r = mergeExtraCostsById(
    [cost("x", "X", 10, "2026-09-14T12:00:00.000Z")],
    [cost("y", "Y", 20, "2026-09-14T12:01:00.000Z")],
  );
  assert("T3", ids(r) === "x,y");
}

// --- T4 same id, cloud newer
{
  const older = cost("x", "old", 1, "2026-09-14T10:00:00.000Z");
  const newer = cost("x", "new", 2, "2026-09-14T12:00:00.000Z");
  const r = mergeExtraCostsById([older], [newer]);
  assert("T4", r[0].description === "new" && r[0].amount === "2");
}

// --- T5 same id, local newer
{
  const newer = cost("x", "new", 2, "2026-09-14T12:00:00.000Z");
  const older = cost("x", "old", 1, "2026-09-14T10:00:00.000Z");
  const r = mergeExtraCostsById([newer], [older]);
  assert("T5", r[0].description === "new");
}

// --- T6 concurrent field intent A=[X] B=[Y]
{
  const cloud = [emp({ extraCosts: [] })];
  // Device A pushed X already → cloud has X
  const cloudAfterA = [emp({ extraCosts: [cost("x", "X", 10, "2026-09-14T11:00:00.000Z")] })];
  const beforeB = [emp({ extraCosts: [] })];
  const afterB = [emp({
    extraCosts: [cost("y", "Y", 20, "2026-09-14T11:05:00.000Z")],
    dataUpdatedAt: "2026-09-14T11:05:00.000Z",
  })];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(
    cloudAfterA,
    beforeB,
    afterB,
    [],
    WF,
    WT,
  );
  assert("T6", ids(roster[0].extraCosts) === "x,y");
}

// --- T7 Domain Push simulation: A then B
{
  // A: baseline ok empty→[X]
  const cloud0 = [emp()];
  const afterA = [emp({
    extraCosts: [cost("x", "X", 10, "2026-09-14T11:00:00.000Z")],
    dataUpdatedAt: "2026-09-14T11:00:00.000Z",
  })];
  const rA = applyPayrollFieldIntentsOntoCanonical(cloud0, cloud0, afterA, [], WF, WT);
  assert("T7a", ids(rA.roster[0].extraCosts) === "x");
  // B concurrent from empty baseline vs cloud with X
  const afterB = [emp({
    extraCosts: [cost("y", "Y", 20, "2026-09-14T11:01:00.000Z")],
    dataUpdatedAt: "2026-09-14T11:01:00.000Z",
  })];
  const rB = applyPayrollFieldIntentsOntoCanonical(rA.roster, cloud0, afterB, [], WF, WT);
  assert("T7b", ids(rB.roster[0].extraCosts) === "x,y");
}

// --- T8 hours edit with empty local costs must keep cloud X
{
  const cloud = [emp({
    extraCosts: [cost("x", "X", 10, "2026-09-14T10:00:00.000Z")],
    dataUpdatedAt: "2026-09-14T10:00:00.000Z",
  })];
  const before = [emp({
    extraCosts: [],
    dataUpdatedAt: "2026-09-14T09:00:00.000Z",
  })];
  const after = [{
    ...before[0],
    days: {
      ...before[0].days,
      Pn: { ...before[0].days.Pn, active: true, to: "18:00", updatedAt: "2026-09-14T12:00:00.000Z" },
    },
    dataUpdatedAt: "2026-09-14T12:00:00.000Z",
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("T8", ids(roster[0].extraCosts) === "x");
}

// --- T9 pull: local newer dataUpdatedAt + empty costs vs cloud [X]
{
  const local = emp({
    extraCosts: [],
    dataUpdatedAt: "2026-09-14T15:00:00.000Z",
  });
  const cloud = emp({
    extraCosts: [cost("x", "X", 10, "2026-09-14T10:00:00.000Z")],
    dataUpdatedAt: "2026-09-14T10:00:00.000Z",
  });
  const merged = mergeWeekEmployeeRecord(local, cloud);
  assert("T9", ids(merged.extraCosts) === "x");
}

// --- T10 409 rebase cloud=[Y] intent after=[X] → [X,Y]
{
  const canonical = [emp({ extraCosts: [cost("y", "Y", 20, "2026-09-14T10:00:00.000Z")] })];
  const before = [emp({ extraCosts: [] })];
  const after = [emp({
    extraCosts: [cost("x", "X", 10, "2026-09-14T11:00:00.000Z")],
    dataUpdatedAt: "2026-09-14T11:00:00.000Z",
  })];
  const rebased = rebasePayrollExtraCostsIntent(canonical, before, after);
  assert("T10", ids(rebased[0].extraCosts) === "x,y");
}

// --- T11 multiple
{
  const r = mergeExtraCostsById(
    [cost("x", "X", 1), cost("y", "Y", 2), cost("z", "Z", 3)],
    [cost("a", "A", 4), cost("b", "B", 5), cost("c", "C", 6)],
  );
  assert("T11", ids(r) === "a,b,c,x,y,z" && r.length === 6);
}

// --- T12 legacy without updatedAt remains visible
{
  const legacy = { id: "leg", description: "Legacy", amount: "5", status: "approved" };
  const r = mergeExtraCostsById([], [legacy]);
  assert("T12a", ids(r) === "leg");
  const r2 = mergeExtraCostsById([legacy], [cost("n", "New", 1, "2026-09-14T12:00:00.000Z")]);
  assert("T12b", ids(r2) === "leg,n");
}

// --- stamp on edit
{
  const before = [cost("x", "X", 10, "2026-09-14T10:00:00.000Z")];
  const afterEdit = [{ ...before[0], amount: "99" }];
  const stamped = stampExtraCostsOnEdit(before, afterEdit, "2026-09-14T12:00:00.000Z");
  assert("stamp edit bumps", stamped[0].updatedAt === "2026-09-14T12:00:00.000Z");
  const stampedSame = stampExtraCostsOnEdit(before, before, "2026-09-14T12:00:00.000Z");
  assert("stamp unchanged keeps", stampedSame[0].updatedAt === "2026-09-14T10:00:00.000Z");
}

// --- T13 hours intents still applied (spot)
{
  const cloud = [emp({
    days: {
      ...defaultDays(),
      Pn: { active: true, from: "07:00", to: "11:00", zaliczka: "", updatedAt: "2026-09-14T08:00:00.000Z" },
    },
  })];
  const before = structuredClone(cloud);
  const after = [{
    ...cloud[0],
    days: {
      ...cloud[0].days,
      Pn: { active: true, from: "07:00", to: "16:00", zaliczka: "", updatedAt: "2026-09-14T12:00:00.000Z" },
    },
    dataUpdatedAt: "2026-09-14T12:00:00.000Z",
  }];
  const intents = [{
    weekFrom: WF,
    weekTo: WT,
    employeeId: "e1",
    directoryId: "dir-1",
    slot: "Pn",
    fromHours: 4,
    toHours: 9,
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, intents, WF, WT);
  assert("T13 hours intent", roster[0].days.Pn.to === "16:00");
}

// --- T14 Soft Restore cross-week guard
{
  assert(
    "T14 cross-week blocked",
    canSoftRestoreHoursFromPrevRoster({
      weekFrom: "2026-09-14",
      weekTo: "2026-09-19",
      prevRosterWeekFrom: "2026-09-07",
      prevRosterWeekTo: "2026-09-12",
    }) === false,
  );
  assert(
    "T14 same-week allowed",
    canSoftRestoreHoursFromPrevRoster({
      weekFrom: "2026-09-14",
      weekTo: "2026-09-19",
      prevRosterWeekFrom: "2026-09-14",
      prevRosterWeekTo: "2026-09-19",
    }) === true,
  );
}

// --- T15 admin rebase field intents concurrent costs
{
  const cloud = [emp({ extraCosts: [cost("y", "Y", 2, "2026-09-14T10:00:00.000Z")] })];
  const before = [emp({ extraCosts: [] })];
  const after = [emp({
    extraCosts: [cost("x", "X", 1, "2026-09-14T11:00:00.000Z")],
    dataUpdatedAt: "2026-09-14T11:00:00.000Z",
  })];
  const rebased = rebasePayrollFieldIntents(cloud, before, after, [], WF, WT);
  assert("T15", ids(rebased[0].extraCosts) === "x,y");
}

// pickExtraCostByLww explicit clock wins over legacy
{
  const withClock = cost("x", "clock", 1, "2026-09-14T12:00:00.000Z");
  const legacy = { id: "x", description: "leg", amount: "9", status: "approved" };
  assert("pick clock wins", pickExtraCostByLww(withClock, legacy).description === "clock");
}

console.log(`\n=== F1 extraCosts RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
