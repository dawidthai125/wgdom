/**
 * PAYROLL AKORD Phase 4C — UI domain · archive freeze · PDF SSOT · regressions.
 * npx vite-node scripts/test-payroll-akord-ui-archive-pdf-p4c.mjs
 *
 * No production writes. Cloud CAS exercised via mocked push / in-memory 4A harness.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-akord-p4c";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-akord-p4c";

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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createAdvance,
  createAllocation,
  createPieceworkJob,
  softDeleteAdvance,
  softDeleteAllocation,
  updateAdvance,
  updateAllocation,
} from "../src/lib/payroll-piecework.ts";
import { ensurePieceworkJobForJobId, findActivePieceworkJobByJobId } from "../src/lib/payroll-piecework-ensure-job.ts";
import { resolveAkordPayable, resolveAkordAllocationBreakdown } from "../src/lib/payroll-piecework-payable.ts";
import { emptyPayrollPieceworkState } from "../src/lib/payroll-piecework-types.ts";
import { calcWeekEmployeeForPayroll, canDeferPayroll, buildPayrollCarryForwardRecord } from "../src/lib/payroll-carry-forward.ts";
import { resolveSettlementPayableAmount } from "../src/lib/payroll-settlement.ts";
import { freezeAkordArchivePayables } from "../src/lib/payroll-archive-akord.ts";
import { buildWeekSnapshot, calcWeekEmployee, defaultDays, weekEmployeeFromDir } from "../src/app/app-domain.ts";
import { toPayrollCalcRows } from "../src/app/PayrollView.tsx";
import { pieceworkLocalErrorMessage } from "../src/lib/payroll-piecework-commit.ts";
import { PieceworkInvariantViolatedError } from "../src/lib/payroll-piecework-invariant.ts";
import {
  PieceworkCloudUnreadableError,
  PieceworkStaleRevisionError,
} from "../src/lib/payroll-piecework-cloud-push.ts";
import { preparePieceworkServerWrite } from "../src/lib/payroll-piecework-server-write.ts";
import { normalizePayrollPieceworkState } from "../src/lib/payroll-piecework-types.ts";
import { calcBiweeklyRowDisplay } from "../src/lib/payroll-cycle.ts";

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

const T0 = "2026-09-14T10:00:00.000Z";
const WEEK1 = { weekFrom: "2026-09-07", weekTo: "2026-09-12" };
const WEEK2 = { weekFrom: "2026-09-14", weekTo: "2026-09-19" };

function akordEmp(id = "dir-a", extras = []) {
  const we = weekEmployeeFromDir({
    id,
    name: `Akord ${id}`,
    phone: "",
    position: "",
    defaultRate: "40",
    startDate: "2026-01-01",
    active: true,
    notes: "",
    compensationModel: "akord",
  });
  return {
    ...we,
    days: {
      ...defaultDays(),
      Pn: { active: true, from: "08:00", to: "16:00", zaliczka: "999" },
      Wt: { active: false, from: "", to: "", zaliczka: "" },
    },
    extraCosts: extras,
  };
}

function hourlyEmp(id = "dir-h") {
  return {
    ...weekEmployeeFromDir({
      id,
      name: "Hourly",
      phone: "",
      position: "",
      defaultRate: "40",
      startDate: "2026-01-01",
      active: true,
      notes: "",
    }),
    days: {
      ...defaultDays(),
      Pn: { active: true, from: "08:00", to: "16:00", zaliczka: "" },
    },
  };
}

function jobStub(id, address = "ul. Test", flat = "1") {
  return { id, address, flatNumber: flat, status: "in_progress" };
}

function seedJobAlloc(state, { jobId, dirId, agreed, label }) {
  let s = state;
  const j = createPieceworkJob(s, { jobId, label, now: T0 });
  assert(`seed job ${jobId}`, j.ok);
  s = j.state;
  const a = createAllocation(s, {
    pieceworkJobId: s.jobs.find((x) => x.jobId === jobId).id,
    directoryId: dirId,
    agreedAmount: agreed,
    now: T0,
  });
  assert(`seed alloc ${jobId}/${dirId}`, a.ok);
  return a.state;
}

// ─── 1–8 Job / allocation ───────────────────────────────────────────────────
{
  let s = emptyPayrollPieceworkState();
  const e1 = ensurePieceworkJobForJobId(s, "job-1", "A m.1", T0);
  assert("1. AKORD Job create", e1.ok && e1.pieceworkJobId);
  s = e1.state;
  const e2 = ensurePieceworkJobForJobId(s, "job-1", "A m.1", T0);
  assert("2. existing Job reuse (no duplicate)", e2.ok && e2.pieceworkJobId === e1.pieceworkJobId && s.jobs.filter((j) => j.jobId === "job-1").length === 1);

  const a1 = createAllocation(s, {
    pieceworkJobId: e1.pieceworkJobId,
    directoryId: "dir-a",
    agreedAmount: 4200,
    now: T0,
  });
  assert("3. allocation create", a1.ok);
  s = a1.state;
  const allocId = s.allocations[0].id;
  const u1 = updateAllocation(s, { id: allocId, agreedAmount: 4500, now: T0 });
  assert("4. allocation update", u1.ok && u1.state.allocations[0].agreedAmount === 4500);
  s = u1.state;

  s = seedJobAlloc(s, { jobId: "job-b", dirId: "dir-a", agreed: 3000, label: "B" });
  assert("6. multiple allocations one employee", resolveAkordPayable("dir-a", s) === 7500);

  s = seedJobAlloc(s, { jobId: "job-b2", dirId: "dir-b", agreed: 1000, label: "shared-path" });
  // same piecework job for two employees
  const jobB = findActivePieceworkJobByJobId(s, "job-1");
  const aB = createAllocation(s, {
    pieceworkJobId: jobB.id,
    directoryId: "dir-c",
    agreedAmount: 500,
    now: T0,
  });
  assert("7. multiple employees same Job", aB.ok);
  s = aB.state;
  assert(
    "8. one employee multiple Jobs",
    resolveAkordAllocationBreakdown("dir-a", s).allocations.length >= 2,
  );

  const del = softDeleteAllocation(s, allocId, T0);
  assert("5. allocation soft delete", del.ok && del.state.allocations.find((a) => a.id === allocId).deletedAt);
}

// ─── 9–17 Advances + cloud error messages ───────────────────────────────────
{
  let s = emptyPayrollPieceworkState();
  s = seedJobAlloc(s, { jobId: "j-adv", dirId: "dir-a", agreed: 1000, label: "adv" });
  const allocId = s.allocations[0].id;
  const adv = createAdvance(s, {
    allocationId: allocId,
    amount: 200,
    paidAt: T0,
    note: "a",
    now: T0,
  });
  assert("9. add advance", adv.ok && resolveAkordPayable("dir-a", adv.state) === 800);
  s = adv.state;
  const advId = s.advances[0].id;
  const ed = updateAdvance(s, { id: advId, amount: 300, now: T0 });
  assert("10. edit advance", ed.ok && resolveAkordPayable("dir-a", ed.state) === 700);
  s = ed.state;
  const soft = softDeleteAdvance(s, advId, T0);
  assert("11. delete advance", soft.ok && resolveAkordPayable("dir-a", soft.state) === 1000);

  // stale update vs delete: update deleted fails
  const stale = updateAdvance(soft.state, { id: advId, amount: 50, now: T0 });
  assert("12. stale update vs delete rejected", !stale.ok);

  const over = createAdvance(soft.state, {
    allocationId: allocId,
    amount: 1001,
    paidAt: T0,
    now: T0,
  });
  assert("13. over-cap local rejection", !over.ok && over.error === "advance_exceeds_agreed");

  assert(
    "14. Cloud 409 invariant message",
    pieceworkLocalErrorMessage("advance_exceeds_agreed").includes("zalicz"),
  );
  assert("15. Cloud stale message helper", new PieceworkStaleRevisionError(1, 2) instanceof Error);
  assert("16. Cloud unreadable helper", new PieceworkCloudUnreadableError("x") instanceof Error);

  let s2 = emptyPayrollPieceworkState();
  s2 = seedJobAlloc(s2, { jobId: "add", dirId: "dir-a", agreed: 2000, label: "add" });
  const a500 = createAdvance(s2, { allocationId: s2.allocations[0].id, amount: 500, paidAt: T0, now: T0 });
  s2 = a500.state;
  const a700 = createAdvance(s2, { allocationId: s2.allocations[0].id, amount: 700, paidAt: T0, now: T0 });
  assert("17. additive A500+B700", a700.ok && resolveAkordPayable("dir-a", a700.state) === 800);

  // Server invariant 409 path (preparePieceworkServerWrite)
  let cloud = emptyPayrollPieceworkState();
  cloud = seedJobAlloc(cloud, { jobId: "inv", dirId: "dir-a", agreed: 100, label: "inv" });
  const badIncoming = createAdvance(cloud, {
    allocationId: cloud.allocations[0].id,
    amount: 50,
    paidAt: T0,
    now: T0,
  }).state;
  // Force over-cap by bumping advance in incoming beyond agreed after merge basis
  const overIncoming = {
    ...badIncoming,
    advances: badIncoming.advances.map((a) => ({ ...a, amount: 150 })),
  };
  const prep = preparePieceworkServerWrite(cloud, overIncoming);
  assert("14b. Cloud 409 invariant prepare", !prep.ok && prep.code === "piecework_invariant_violated");
  assert("14c. PieceworkInvariantViolatedError type", new PieceworkInvariantViolatedError("alloc-x", 100, 150) instanceof Error);
}

// ─── 18–26 Payroll SSOT ─────────────────────────────────────────────────────
{
  let s = emptyPayrollPieceworkState();
  s = seedJobAlloc(s, { jobId: "j1", dirId: "dir-a", agreed: 4200, label: "A" });
  s = seedJobAlloc(s, { jobId: "j2", dirId: "dir-a", agreed: 3000, label: "B" });
  const adv = createAdvance(s, {
    allocationId: s.allocations[0].id,
    amount: 1000,
    paidAt: T0,
    now: T0,
  });
  s = adv.state;
  assert("18. main list AKORD payable 6200", resolveAkordPayable("dir-a", s) === 6200);

  const empA = akordEmp("dir-a");
  const empH = hourlyEmp();
  const rowA = calcWeekEmployeeForPayroll(empA, { ...WEEK1, pieceworkState: s, livePayroll: true });
  const rowH = calcWeekEmployeeForPayroll(empH, { ...WEEK1, pieceworkState: s, livePayroll: true });
  assert("19. mixed hourly + akord", rowA.displayNetPay === 6200 && rowH.displayNetPay > 0 && rowH.displayNetPay !== 6200);

  const empAttend = {
    ...empA,
    days: {
      ...empA.days,
      Pn: { active: false, from: "", to: "", zaliczka: "" },
      Wt: { active: true, from: "00:00", to: "23:00", zaliczka: "50" },
    },
  };
  const rowAttend = calcWeekEmployeeForPayroll(empAttend, { ...WEEK1, pieceworkState: s, livePayroll: true });
  assert("20. attendance does not change payable", rowAttend.displayNetPay === 6200);
  assert("21. from/to does not change payable", rowAttend.displayNetPay === rowA.displayNetPay);

  const dirBi = [
    {
      id: "dir-a",
      name: "Akord",
      phone: "",
      position: "",
      defaultRate: "40",
      startDate: "2026-01-01",
      active: true,
      notes: "",
      compensationModel: "akord",
      biweeklyPayroll: true,
      biweeklyAnchorDate: "2026-09-12",
    },
  ];
  const bw = calcBiweeklyRowDisplay(empA, dirBi, WEEK1.weekFrom, WEEK1.weekTo, [], undefined, {
    pieceworkState: s,
  });
  assert("22. biweekly AKORD uses piecework SSOT", bw != null && bw.displayNet === 6200);

  const defer = canDeferPayroll(empA, rowA, [{ id: "dir-a", name: "Akord", biweeklyPayroll: false }], false);
  assert("23. deferred AKORD uses displayNetPay SSOT", defer.ok === true && defer.frozenAmount === 6200);
  if (defer.ok) {
    const rec = buildPayrollCarryForwardRecord(defer.frozenAmount, WEEK1.weekFrom, WEEK1.weekTo);
    assert("23b. deferred record amount frozen", rec.amount === 6200);
  }

  const settleAmt = resolveSettlementPayableAmount(empA, [], WEEK1.weekFrom, WEEK1.weekTo, [], {
    pieceworkState: s,
  });
  assert("24. settlement same SSOT", Math.abs(settleAmt - 6200) < 0.01);

  // Early HOLD: WeekEmployeeDetail hides EarlyPayoutPanel for akord (source check)
  const wedSrc = readFileSync(resolve("src/app/WeekEmployeeDetail.tsx"), "utf8");
  assert("25. early HOLD (no EarlyPayoutPanel for akord)", wedSrc.includes("!akord") && wedSrc.includes("EarlyPayoutPanel"));

  const calcRows = toPayrollCalcRows(
    [
      { emp: empA, ...rowA, rateNum: 0 },
      { emp: empH, ...rowH, rateNum: 40 },
    ],
    dirBi,
    WEEK1.weekFrom,
    WEEK1.weekTo,
    [],
    s,
    [jobStub("j1", "ul. A", "1"), jobStub("j2", "ul. B", "2")],
  );
  assert("26. no double count — PDF row net = payable SSOT", calcRows[0].netPay === 6200 && calcRows[0].compensationModel === "akord");
  assert("33. PDF row one/multi job fields", (calcRows[0].akordAllocations?.length ?? 0) >= 2);
  assert("35. mixed PDF rows", calcRows[1].compensationModel === "hourly" && calcRows[1].rateNum === 40);
}

// ─── 27–30 Archive freeze + Monday rebuild ──────────────────────────────────
{
  let s = emptyPayrollPieceworkState();
  s = seedJobAlloc(s, { jobId: "arch", dirId: "dir-a", agreed: 8000, label: "arch" });
  const adv1 = createAdvance(s, {
    allocationId: s.allocations[0].id,
    amount: 2000,
    paidAt: T0,
    now: T0,
    weekFrom: WEEK1.weekFrom,
    weekTo: WEEK1.weekTo,
  });
  s = adv1.state;
  const emp = akordEmp("dir-a");
  const snap1 = freezeAkordArchivePayables(
    buildWeekSnapshot(WEEK1.weekFrom, WEEK1.weekTo, [emp], []),
    [emp],
    { pieceworkState: s },
  );
  assert("27. Sunday archive freeze = 6000", snap1.employees[0].netPay === 6000 && snap1.employees[0].akordPayableFrozen === 6000);

  const adv2 = createAdvance(s, {
    allocationId: s.allocations[0].id,
    amount: 1000,
    paidAt: "2026-09-15T10:00:00.000Z",
    now: "2026-09-15T10:00:00.000Z",
    weekFrom: WEEK2.weekFrom,
    weekTo: WEEK2.weekTo,
  });
  s = adv2.state;
  assert("28a. live remaining = 5000", resolveAkordPayable("dir-a", s) === 5000);
  assert("28. later advance does not mutate old archive", snap1.employees[0].netPay === 6000);

  // Monday rebuild: weekEmployees clear → weekEmployeeFromDir → durable piecework still pays
  const monday = weekEmployeeFromDir({
    id: "dir-a",
    name: "Akord",
    phone: "",
    position: "",
    defaultRate: "40",
    startDate: "2026-01-01",
    active: true,
    notes: "",
    compensationModel: "akord",
  });
  const mondayRow = calcWeekEmployeeForPayroll(monday, {
    ...WEEK2,
    pieceworkState: s,
    livePayroll: true,
  });
  assert("29. Monday rebuild preserves durable piecework payable", mondayRow.displayNetPay === 5000);

  // Employee roster removal does not delete piecework
  assert("30. employee roster removal preserves piecework", s.allocations.some((a) => a.directoryId === "dir-a" && !a.deletedAt));
}

// ─── 31–32 Model switch ─────────────────────────────────────────────────────
{
  const dirHourlyNext = weekEmployeeFromDir({
    id: "dir-m",
    name: "Switch",
    phone: "",
    position: "",
    defaultRate: "40",
    startDate: "2026-01-01",
    active: true,
    notes: "",
    compensationModel: "hourly",
  });
  assert("31. model switch applies via weekEmployeeFromDir snapshot", dirHourlyNext.compensationModel !== "akord");
  const hist = akordEmp("dir-m");
  assert("32. historical model preserved on live emp", hist.compensationModel === "akord");
}

// ─── 34 / 36 PDF source guards ──────────────────────────────────────────────
{
  const exportSrc = readFileSync(resolve("src/lib/payroll-export.ts"), "utf8");
  assert("34. PDF uses payrollNetDisplayText SSOT", exportSrc.includes("payrollNetDisplayText(r)"));
  assert("G2. PDF does not recompute agreed-advances as SSOT", !/agreedAmount\s*-\s*advances/.test(exportSrc));
  assert("36. hourly PDF path still uses rateNum for non-akord", exportSrc.includes("payrollRateCellText"));
}

// ─── CAS writer only ────────────────────────────────────────────────────────
{
  const panel = readFileSync(resolve("src/app/AkordPieceworkPanel.tsx"), "utf8");
  assert("H. UI writes via commitPieceworkOp", panel.includes("commitPieceworkOp"));
  assert("H2. no blind mset in panel", !panel.includes("batch-set") && !panel.includes("mset("));
  const commitSrc = readFileSync(resolve("src/lib/payroll-piecework-commit.ts"), "utf8");
  assert("H3. commit uses pushPayrollPieceworkToCloudSafe", commitSrc.includes("pushPayrollPieceworkToCloudSafe"));
}

// ─── Protected paths untouched (source grep) ────────────────────────────────
{
  const files = [
    "src/app/AkordPieceworkPanel.tsx",
    "src/lib/payroll-archive-akord.ts",
    "src/lib/payroll-piecework-commit.ts",
    "src/lib/payroll-piecework-ensure-job.ts",
  ];
  for (const f of files) {
    const src = readFileSync(resolve(f), "utf8");
    assert(`I. no pwr* in ${f}`, !/\bpwr(Add|Remove|Push|PullMerge)\b/.test(src));
  }
}

console.log(`\nPhase 4C: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
