/**
 * PAYROLL — manualPayrollAdjustment + leave payable contract (R1–R22).
 * Run: npx vite-node scripts/test-payroll-manual-adjustment.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-manual-adj";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-manual-adj";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: (k) => { delete lsStore[k]; },
  clear: () => { for (const k of Object.keys(lsStore)) delete lsStore[k]; },
};

const WF = "2026-08-24";
const WT = "2026-08-29";
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

let pass = 0;
let fail = 0;
function assert(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
  }
}

function defaultDay(active = false, to = "16:00") {
  return { active, from: "07:00", to, zaliczka: "" };
}

function makeEmp(id, name, opts = {}) {
  const hoursTo = opts.hoursTo ?? "16:00";
  const rate = opts.rate ?? "30";
  return {
    id,
    directoryId: `dir-${id}`,
    name,
    phone: "",
    position: "Pracownik",
    rate,
    rateUpdatedAt: "2026-08-20T10:00:00.000Z",
    days: Object.fromEntries(
      DAYS.map((d) => [d, { ...defaultDay(opts.activeDays !== false, hoursTo) }]),
    ),
    prevSaturday: defaultDay(false),
    extraCosts: opts.extraCosts ?? [],
    payrollManualAdjustment: opts.adj,
    settled: false,
    dataUpdatedAt: "2026-08-20T10:00:00.000Z",
  };
}

function zeroDays(emp) {
  return {
    ...emp,
    days: Object.fromEntries(DAYS.map((d) => [d, defaultDay(false)])),
  };
}

const {
  calcWeekEmployee,
  buildWeekSnapshot,
  normalizePayrollManualAdjustment,
  manualAdjustmentAmount,
} = await import("../src/app/app-domain.ts");
const {
  calcWeekEmployeeWithLeave,
  applyLeaveOverlayToCalc,
} = await import("../src/lib/payroll-leave-overlay.ts");
const {
  calcWeekEmployeeForPayroll,
  canDeferPayroll,
  calcWeeklyNetWithCarry,
} = await import("../src/lib/payroll-carry-forward.ts");
const {
  applyPayrollFieldIntentsOntoCanonical,
  rebasePayrollFieldIntents,
} = await import("../src/lib/payroll-field-intent.ts");
const { payrollNetDisplayText } = await import("../src/lib/payroll-export.ts");
const { computeSimulatedTotals, PAYROLL_SIMULATION_INITIAL } = await import("../src/lib/payroll-payout-simulation.ts");
const { computePayrollCashSplit } = await import("../src/lib/payroll-cycle.ts");
const { sanitizeStaleRosterMembership } = await import("../src/lib/payroll-stale-roster-membership.ts");

console.log("=== PAYROLL MANUAL ADJUSTMENT ===\n");

const leavesVacation = [{
  id: "lv1",
  employeeId: "dir-a1",
  leaveType: "vacation",
  weekStart: WF,
  weekTo: WT,
  weekEnd: WT,
  createdAt: "t",
  updatedAt: "t",
}];

// R1
{
  const emp = {
    ...zeroDays(makeEmp("a1", "Adam", { rate: "30" })),
    payrollManualAdjustment: { amount: 1000, description: "urlop", kind: "vacation", updatedAt: "2026-08-28T12:00:00.000Z" },
  };
  const row = calcWeekEmployeeForPayroll(emp, {
    weekFrom: WF, weekTo: WT, employeeLeaves: leavesVacation, livePayroll: true,
  });
  assert("R1 leaveStatus vacation", row.leaveStatus === "vacation");
  assert("R1 gross labor 0", row.grossPay === 0);
  assert("R1 payable 1000", Math.abs(row.displayNetPay - 1000) < 0.01, String(row.displayNetPay));
}

// R2 vacation + hours + adj
{
  const emp = {
    ...makeEmp("a1", "Adam", { rate: "30", hoursTo: "16:00" }), // 9h/day
    payrollManualAdjustment: { amount: 1000, description: "urlop", kind: "vacation", updatedAt: "t" },
  };
  const base = calcWeekEmployee(emp);
  assert("R2 base labor > 0", base.grossPay > 0);
  const row = calcWeekEmployeeForPayroll(emp, {
    weekFrom: WF, weekTo: WT, employeeLeaves: leavesVacation, livePayroll: true,
  });
  assert("R2 labor 0", row.grossPay === 0);
  assert("R2 payable 1000", Math.abs(row.displayNetPay - 1000) < 0.01, String(row.displayNetPay));
}

// R3 no leave + adjustment
{
  const emp = {
    ...makeEmp("a1", "Adam", { rate: "30", hoursTo: "11:00" }), // 4h * 6 = 24h * 30 = 720
    payrollManualAdjustment: { amount: 100, description: "bonus", kind: "other", updatedAt: "t" },
  };
  const row = calcWeekEmployeeForPayroll(emp, {
    weekFrom: WF, weekTo: WT, employeeLeaves: [], livePayroll: true,
  });
  assert("R3 no leave", !row.leaveStatus);
  assert("R3 includes labor+adj", row.displayNetPay > 100 && Math.abs(row.displayNetPay - (row.grossPay + 100)) < 0.1);
}

// R4 vacation + extras 200
{
  const emp = {
    ...zeroDays(makeEmp("a1", "Adam")),
    extraCosts: [{ id: "c1", description: "chemia", amount: "200", status: "approved" }],
  };
  const row = calcWeekEmployeeForPayroll(emp, {
    weekFrom: WF, weekTo: WT, employeeLeaves: leavesVacation, livePayroll: true,
  });
  assert("R4 payable 200", Math.abs(row.displayNetPay - 200) < 0.01, String(row.displayNetPay));
}

// R5 vacation + adj 1000 + extras 200
{
  const emp = {
    ...zeroDays(makeEmp("a1", "Adam")),
    extraCosts: [{ id: "c1", description: "chemia", amount: "200", status: "approved" }],
    payrollManualAdjustment: { amount: 1000, description: "urlop", kind: "vacation", updatedAt: "t" },
  };
  const row = calcWeekEmployeeForPayroll(emp, {
    weekFrom: WF, weekTo: WT, employeeLeaves: leavesVacation, livePayroll: true,
  });
  assert("R5 payable 1200", Math.abs(row.displayNetPay - 1200) < 0.01, String(row.displayNetPay));
}

// R6 sick
{
  const leaves = [{ ...leavesVacation[0], leaveType: "sick" }];
  const emp = {
    ...zeroDays(makeEmp("a1", "Adam")),
    payrollManualAdjustment: { amount: 500, description: "chorobowe", kind: "sick", updatedAt: "t" },
  };
  const row = calcWeekEmployeeForPayroll(emp, {
    weekFrom: WF, weekTo: WT, employeeLeaves: leaves, livePayroll: true,
  });
  assert("R6 sick payable 500", row.leaveStatus === "sick" && Math.abs(row.displayNetPay - 500) < 0.01);
}

// R7 unpaid
{
  const leaves = [{ ...leavesVacation[0], leaveType: "unpaid" }];
  const emp = {
    ...zeroDays(makeEmp("a1", "Adam")),
    payrollManualAdjustment: { amount: 300, description: "wyjatek", kind: "unpaid", updatedAt: "t" },
  };
  const row = calcWeekEmployeeForPayroll(emp, {
    weekFrom: WF, weekTo: WT, employeeLeaves: leaves, livePayroll: true,
  });
  assert("R7 unpaid payable 300", row.leaveStatus === "unpaid" && Math.abs(row.displayNetPay - 300) < 0.01);
}

// R8 amount 0
{
  assert("R8 normalize 0 => undefined", normalizePayrollManualAdjustment({ amount: 0, description: "x", updatedAt: "t" }) === undefined);
  assert("R8 manualAdjustmentAmount 0", manualAdjustmentAmount({ payrollManualAdjustment: { amount: 0, description: "x", updatedAt: "t" } }) === 0);
}

// R9 description required
{
  assert(
    "R9 no desc => undefined",
    normalizePayrollManualAdjustment({ amount: 100, description: "  ", updatedAt: "t" }) === undefined,
  );
  assert(
    "R9 with desc ok",
    normalizePayrollManualAdjustment({ amount: 100, description: "urlop", kind: "vacation", updatedAt: "t" })?.amount === 100,
  );
}

// R10 stale without adj intent
{
  const cloud = [makeEmp("a1", "Adam", {
    adj: { amount: 1000, description: "cloud", kind: "vacation", updatedAt: "2026-08-28T10:00:00.000Z" },
  })];
  const before = [makeEmp("a1", "Adam", {
    adj: { amount: 1000, description: "cloud", kind: "vacation", updatedAt: "2026-08-28T10:00:00.000Z" },
  })];
  const after = [{
    ...before[0],
    rate: "99",
    rateUpdatedAt: "2026-08-28T19:00:00.000Z",
    payrollManualAdjustment: { amount: 1, description: "stale", kind: "other", updatedAt: "2026-08-01T00:00:00.000Z" },
  }];
  // rate intent: before rate matches cloud? before rate 30, cloud 30, after 99 — rate applies
  // adj: before was 1000@t10, after stale 1 — but before matches cloud so adjEdited — wait before adj equals cloud, after differs → adjEdited && baselineOk → would apply stale 1!
  // For R10 we need: user did NOT change adj — before.adj === after.adj (stale same), only other field
  const after2 = [{
    ...before[0],
    rate: "99",
    rateUpdatedAt: "2026-08-28T19:00:00.000Z",
    // adj unchanged from before (but before is stale vs... wait before matches cloud)
  }];
  // Actually R10: stale client without adjustment intent — after.adj same as before.adj which equals cloud
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after2, [], WF, WT);
  assert("R10 cloud adj preserved", roster[0]?.payrollManualAdjustment?.amount === 1000);
  assert("R10 rate changed", roster[0]?.rate === "99");
}

// R11 only adjustment changes
{
  const cloud = [makeEmp("a1", "Adam", {
    hoursTo: "11:00",
    adj: { amount: 100, description: "old", kind: "other", updatedAt: "t1" },
  })];
  const before = structuredClone(cloud);
  const after = [{
    ...before[0],
    payrollManualAdjustment: { amount: 1000, description: "urlop", kind: "vacation", updatedAt: "t2" },
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R11 adj 1000", roster[0]?.payrollManualAdjustment?.amount === 1000);
  assert("R11 hours cloud", calcWeekEmployee(roster[0]).weekHours === calcWeekEmployee(cloud[0]).weekHours);
}

// R12 409 rebase
{
  const canonical = [makeEmp("a1", "Adam", { hoursTo: "11:00", rate: "50" })];
  const before = [makeEmp("a1", "Adam", { hoursTo: "16:00", rate: "30" })]; // stale
  const after = [{
    ...before[0],
    payrollManualAdjustment: { amount: 1000, description: "urlop", kind: "vacation", updatedAt: "t2" },
  }];
  // before adj undefined, cloud undefined — baseline ok; adj edited → apply 1000
  // hours: before 9h cloud 4h — no hours intent → keep cloud hours
  const rebased = rebasePayrollFieldIntents(canonical, before, after, [], WF, WT);
  assert("R12 adj applied", rebased[0]?.payrollManualAdjustment?.amount === 1000);
  assert("R12 rate cloud", rebased[0]?.rate === "50");
  assert("R12 hours cloud", Math.abs(calcWeekEmployee(rebased[0]).weekHours - calcWeekEmployee(canonical[0]).weekHours) < 0.1);
}

// R13 CAS-match style (same as field apply)
{
  const cloud = [makeEmp("a1", "Adam", { rate: "40" })];
  const before = structuredClone(cloud);
  const after = [{
    ...before[0],
    payrollManualAdjustment: { amount: 750, description: "korekta", kind: "correction", updatedAt: "t" },
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R13 only adj", roster[0]?.payrollManualAdjustment?.amount === 750 && roster[0]?.rate === "40");
}

// R14 hours-down P0 still via field/guard path — unit: unauthorized hours down not applied without intent
{
  const cloud = [makeEmp("a1", "Adam", { hoursTo: "16:00" })]; // 9h
  const before = [makeEmp("a1", "Adam", { hoursTo: "11:00" })]; // stale 4h baseline ≠ cloud
  const after = [{
    ...before[0],
    payrollManualAdjustment: { amount: 100, description: "x", kind: "other", updatedAt: "t" },
  }];
  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R14 hours stay cloud (no false hours-down)", Math.abs(calcWeekEmployee(roster[0]).weekHours - calcWeekEmployee(cloud[0]).weekHours) < 0.1);
}

// R15 membership
{
  const cloud = [makeEmp("z", "Z")];
  const staleX = makeEmp("x", "X");
  const before = [cloud[0], staleX];
  const after = [
    cloud[0],
    { ...staleX, payrollManualAdjustment: { amount: 999, description: "ghost", kind: "other", updatedAt: "t" } },
  ];
  const field = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert("R15 no resurrect X", !field.roster.some((e) => e.id === "x"));
  const mem = sanitizeStaleRosterMembership(cloud, after, before);
  assert("R15 membership drop X", !mem.roster.some((e) => e.id === "x"));
}

// R17 totals
{
  const emp = {
    ...zeroDays(makeEmp("a1", "Adam")),
    payrollManualAdjustment: { amount: 1000, description: "urlop", kind: "vacation", updatedAt: "t" },
  };
  const row = {
    emp,
    ...calcWeekEmployeeForPayroll(emp, { weekFrom: WF, weekTo: WT, employeeLeaves: leavesVacation, livePayroll: true }),
  };
  const totals = computeSimulatedTotals([row], new Map(), PAYROLL_SIMULATION_INITIAL);
  assert("R17 totalNet 1000", Math.abs(totals.totalNet - 1000) < 0.01, String(totals.totalNet));
}

// R18 cash split
{
  const emp = {
    ...zeroDays(makeEmp("a1", "Adam")),
    payrollManualAdjustment: { amount: 1000, description: "urlop", kind: "vacation", updatedAt: "t" },
  };
  const net = calcWeeklyNetWithCarry(emp, WF, WT, { employeeLeaves: leavesVacation });
  assert("R18 cash weekly includes adj", Math.abs(net - 1000) < 0.01, String(net));
  const split = computePayrollCashSplit(
    [emp],
    [{ id: "dir-a1", name: "Adam", biweeklyPayroll: false }],
    WF,
    WT,
    [],
    (e) => calcWeeklyNetWithCarry(e, WF, WT, { employeeLeaves: leavesVacation }),
    () => 0,
  );
  assert("R18 saturday cash 1000", Math.abs(split.totalSaturdayCash - 1000) < 0.01, String(split.totalSaturdayCash));
}

// R19 snapshot
{
  const emp = {
    ...zeroDays(makeEmp("a1", "Adam")),
    payrollManualAdjustment: { amount: 1000, description: "urlop", kind: "vacation", updatedAt: "t" },
  };
  const snap = buildWeekSnapshot(WF, WT, [emp], [], undefined, leavesVacation);
  assert("R19 snap netPay 1000", Math.abs(snap.employees[0].netPay - 1000) < 0.01);
  assert("R19 snap leave", snap.employees[0].leaveStatus === "vacation");
  assert("R19 snap totalManualAdjustment", snap.employees[0].totalManualAdjustment === 1000);
}

// R20 export text
{
  const text = payrollNetDisplayText({
    netPay: 1000,
    leaveStatus: "vacation",
  });
  assert("R20 export shows amount not only label", text.includes("1") && /1000|1[\s\u00a0]?000/.test(text.replace(/\s/g, " ")), text);
}

// R21 defer still blocked on leave
{
  const emp = {
    ...zeroDays(makeEmp("a1", "Adam")),
    payrollManualAdjustment: { amount: 1000, description: "urlop", kind: "vacation", updatedAt: "t" },
  };
  const row = calcWeekEmployeeForPayroll(emp, {
    weekFrom: WF, weekTo: WT, employeeLeaves: leavesVacation, livePayroll: true,
  });
  const defer = canDeferPayroll(emp, { ...row, emp }, [{ id: "dir-a1", name: "Adam" }], false);
  assert("R21 defer blocked leave_active", defer.ok === false && defer.reason === "leave_active");
}

// R22 old record without field — leave with hours only still 0
{
  const emp = makeEmp("a1", "Adam", { hoursTo: "16:00" });
  delete emp.payrollManualAdjustment;
  const row = calcWeekEmployeeForPayroll(emp, {
    weekFrom: WF, weekTo: WT, employeeLeaves: leavesVacation, livePayroll: true,
  });
  assert("R22 leave labor 0", row.grossPay === 0);
  assert("R22 leave payable 0 without adj/extras", Math.abs(row.displayNetPay) < 0.01);
  const base = applyLeaveOverlayToCalc(calcWeekEmployee(emp), "vacation");
  assert("R22 overlay net 0", base.netPay === 0 && base.grossPay === 0);
}

console.log(`\n=== MANUAL ADJ RESULT ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
