/**
 * PAYROLL Phase 2 — payrollCarryForward field-intent / 409 rebase.
 * npx vite-node scripts/test-payroll-carry-forward.mjs
 *
 * Does not duplicate 20.1A/B payout smoke — those remain the payout SSOT tests.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-carry-p2";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-carry-p2";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    for (const k of Object.keys(lsStore)) delete lsStore[k];
  },
};

import { defaultDay, defaultDays } from "../src/app/app-domain.ts";
import {
  applyPayrollFieldIntentsOntoCanonical,
  rebasePayrollFieldIntents,
} from "../src/lib/payroll-field-intent.ts";
import {
  isPayrollExtraCostsOnlyIntent,
  rebasePayrollExtraCostsIntent,
} from "../src/lib/payroll-roster-rebase.ts";
import { mergeWeekEmployeeRecord, pickPayrollManualAdjustment } from "../src/lib/payroll-week-employee-record-merge.ts";
import { mergeExtraCostsById } from "../src/lib/payroll-extra-costs-merge.ts";
import {
  buildPayrollCarryForwardRecord,
  calcWeekEmployeeForPayroll,
  canDeferPayroll,
} from "../src/lib/payroll-carry-forward.ts";
import { isBiweeklyPayrollEmployee } from "../src/lib/payroll-cycle.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.error("FAIL", name);
  }
}

const WF = "2026-09-14";
const WT = "2026-09-19";
const TARGET_FROM = "2026-09-21";
const TARGET_TO = "2026-09-26";

function carry(amount, createdAt, targetFrom = TARGET_FROM, targetTo = TARGET_TO) {
  return {
    amount,
    targetWeekFrom: targetFrom,
    targetWeekTo: targetTo,
    createdAt,
  };
}

function emp(overrides = {}) {
  return {
    id: "e1",
    directoryId: "dir-1",
    name: "Adam",
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

function cost(id, desc, amount) {
  return {
    id,
    description: desc,
    amount: String(amount),
    status: "approved",
    updatedAt: "2026-09-14T11:00:00.000Z",
  };
}

const CF_LOCAL = carry(1050, "2026-09-14T12:00:00.000Z");
const CF_CLOUD = carry(800, "2026-09-14T09:00:00.000Z");

function pnHours(e) {
  const d = e.days?.Pn;
  if (!d?.active) return 0;
  const [fh, fm] = String(d.from || "0").split(":").map(Number);
  const [th, tm] = String(d.to || "0").split(":").map(Number);
  return (th + tm / 60) - (fh + fm / 60);
}

// T1 — local carry set, baseline OK → after persists
{
  const cloud = [emp()];
  const before = [emp()];
  const after = [emp({ payrollCarryForward: CF_LOCAL })];
  const { roster, changed } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("T1 local carry persists", roster[0].payrollCarryForward?.amount === 1050);
  assert("T1 changed", changed === true);
  assert("T1 not extraCosts-only", isPayrollExtraCostsOnlyIntent(before, after) === false);
}

// T2 — unrelated cloud hours vs local carry (baseline hours mismatch; carry baseline OK)
{
  const cloudDays = defaultDays();
  cloudDays.Pn = { ...defaultDay(), active: true, from: "07:00", to: "11:00" };
  const localDays = defaultDays();
  const cloud = [emp({ days: cloudDays })];
  const before = [emp({ days: localDays })];
  const after = [emp({ days: localDays, payrollCarryForward: CF_LOCAL })];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("T2 carry preserved", roster[0].payrollCarryForward?.amount === 1050);
  assert("T2 hours stay cloud", Math.abs(pnHours(roster[0]) - 4) < 0.01);
}

// T3 — 409 rebase: carry change is NOT extraCosts-only; field rebase applies carry
{
  const cloud = [emp()];
  const before = [emp()];
  const after = [emp({ payrollCarryForward: CF_LOCAL, dataUpdatedAt: "2026-09-14T12:00:00.000Z" })];
  assert("T3 extraCosts-only false", isPayrollExtraCostsOnlyIntent(before, after) === false);
  const extraPath = rebasePayrollExtraCostsIntent(cloud, before, after);
  assert("T3 extraCosts path would DROP carry (why we must not use it)", extraPath[0].payrollCarryForward == null);
  const rebased = rebasePayrollFieldIntents(cloud, before, after, [], WF, WT);
  assert("T3 field rebase keeps carry", rebased[0].payrollCarryForward?.amount === 1050);
}

// T4 — extraCosts-only unchanged; carry not touched
{
  const cloud = [emp({ extraCosts: [] })];
  const before = [emp({ extraCosts: [] })];
  const after = [emp({ extraCosts: [cost("c1", "Parking", 20)], dataUpdatedAt: "2026-09-14T13:00:00.000Z" })];
  assert("T4 extraCosts-only true", isPayrollExtraCostsOnlyIntent(before, after) === true);
  const rebased = rebasePayrollExtraCostsIntent(cloud, before, after);
  assert("T4 costs applied", (rebased[0].extraCosts || []).length === 1);
  assert("T4 carry still absent", rebased[0].payrollCarryForward == null);
}

// T5 — carry + extraCosts: both independent
{
  const cloud = [emp({ extraCosts: [cost("x", "X", 10)] })];
  const before = [emp({ extraCosts: [cost("x", "X", 10)] })];
  const after = [emp({
    extraCosts: [cost("x", "X", 10), cost("y", "Y", 5)],
    payrollCarryForward: CF_LOCAL,
  })];
  assert("T5 not extraCosts-only", isPayrollExtraCostsOnlyIntent(before, after) === false);
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("T5 carry applied", roster[0].payrollCarryForward?.amount === 1050);
  assert("T5 extraCosts union/after", (roster[0].extraCosts || []).map((c) => c.id).sort().join(",") === "x,y");
}

// T6 — Cloud carry conflict → Cloud wins
{
  const cloud = [emp({ payrollCarryForward: CF_CLOUD })];
  const before = [emp()]; // stale — never saw cloud carry
  const after = [emp({ payrollCarryForward: CF_LOCAL })];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("T6 cloud wins amount", roster[0].payrollCarryForward?.amount === 800);
  assert("T6 cloud wins createdAt", roster[0].payrollCarryForward?.createdAt === CF_CLOUD.createdAt);
}

// T7 — local newer with valid baseline
{
  const cloud = [emp()];
  const before = [emp()];
  const after = [emp({ payrollCarryForward: CF_LOCAL })];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("T7 local intent reaches roster", roster[0].payrollCarryForward?.amount === 1050);
}

// T8 / T9 / T10 — identity fields preserved
{
  const cloud = [emp()];
  const before = [emp()];
  const after = [emp({ payrollCarryForward: CF_LOCAL })];
  const cf = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT).roster[0].payrollCarryForward;
  assert("T8 targetWeekFrom", cf?.targetWeekFrom === TARGET_FROM);
  assert("T8 targetWeekTo", cf?.targetWeekTo === TARGET_TO);
  assert("T9 amount exact", cf?.amount === 1050);
  assert("T10 createdAt exact", cf?.createdAt === CF_LOCAL.createdAt);
}

// T11 — biweekly payout / defer gate unchanged
{
  const weekly = emp({
    days: {
      ...defaultDays(),
      Pn: { ...defaultDay(), active: true, from: "07:00", to: "16:00" },
    },
  });
  const row = calcWeekEmployeeForPayroll(weekly, { weekFrom: WF, weekTo: WT, livePayroll: true });
  const deferred = { ...weekly, payrollCarryForward: CF_LOCAL };
  const rowDef = calcWeekEmployeeForPayroll(deferred, { weekFrom: WF, weekTo: WT, livePayroll: true });
  assert("T11 defer zeros displayNet", rowDef.displayNetPay === 0 && rowDef.carryForwardOut === 1050);
  assert("T11 without defer net positive", row.displayNetPay > 0);

  const biweeklyDir = [{ id: "dir-1", biweeklyPayroll: true, biweeklyAnchorDate: "2026-09-12" }];
  assert("T11 is biweekly", isBiweeklyPayrollEmployee(weekly, biweeklyDir) === true);
  const gate = canDeferPayroll(weekly, row, biweeklyDir, false);
  assert("T11 biweekly_blocked", gate.ok === false && gate.reason === "biweekly_blocked");

  const built = buildPayrollCarryForwardRecord(1050, WF, WT);
  assert("T11 builder target next week", built.targetWeekFrom === TARGET_FROM && built.targetWeekTo === TARGET_TO);
}

// T12 — Phase 1 MA picker unchanged
{
  const local = emp({
    payrollManualAdjustment: { amount: 100, description: "urlop", updatedAt: "2026-09-14T08:00:00.000Z" },
    dataUpdatedAt: "2026-09-14T08:00:00.000Z",
  });
  const cloudHours = emp({
    days: { ...defaultDays(), Pn: { ...defaultDay(), active: true, from: "07:00", to: "16:00", updatedAt: "2026-09-14T15:00:00.000Z" } },
    dataUpdatedAt: "2026-09-14T15:00:00.000Z",
  });
  const picked = pickPayrollManualAdjustment(local, cloudHours);
  assert("T12 MA survives hours-newer cloud", picked?.amount === 100);
  const merged = mergeWeekEmployeeRecord(local, cloudHours);
  assert("T12 merge keeps MA", merged.payrollManualAdjustment?.amount === 100);
}

// T13 — F1 extraCosts union unchanged
{
  const r = mergeExtraCostsById(
    [cost("a", "A", 1)],
    [cost("b", "B", 2)],
  );
  assert("T13 union a,b", r.map((c) => c.id).sort().join(",") === "a,b");
}

// T14 — carry merge/intent does not change hours
{
  const days9 = { ...defaultDays(), Pn: { ...defaultDay(), active: true, from: "07:00", to: "16:00" } };
  const cloud = [emp({ days: days9 })];
  const before = [emp({ days: days9 })];
  const after = [emp({ days: days9, payrollCarryForward: CF_LOCAL })];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("T14 hours unchanged", Math.abs(pnHours(roster[0]) - 9) < 0.01);
  assert("T14 Pn still active", roster[0].days.Pn.active === true);
}

console.log(`\n=== PHASE2 CARRY FORWARD RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
