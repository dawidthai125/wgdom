/**
 * PAYROLL — biweekly early / partial payout (R1–R28).
 * Run: npx vite-node scripts/test-payroll-early-payout-biweekly.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-early-payout";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-early-payout";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: (k) => { delete lsStore[k]; },
  clear: () => { for (const k of Object.keys(lsStore)) delete lsStore[k]; },
};

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const ANCHOR = "2026-05-30";
/** W1 accrual of period ending payout Sat 2026-08-22 */
const W1F = "2026-08-10";
const W1T = "2026-08-15";
/** W2 payout week */
const W2F = "2026-08-17";
const W2T = "2026-08-22";
const PERIOD_KEY = "2026-08-22";

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

function defaultDay(active = false, to = "13:00") {
  return { active, from: "07:00", to, zaliczka: "" };
}

/** 6×6h × 50 PLN = 1800 net (no zaliczki/extras). */
function makeEmp(id, name, opts = {}) {
  const hoursTo = opts.hoursTo ?? "13:00";
  const rate = opts.rate ?? "50";
  return {
    id,
    directoryId: opts.directoryId ?? `dir-${id}`,
    name,
    phone: "",
    position: "Pracownik",
    rate,
    rateUpdatedAt: "2026-08-01T10:00:00.000Z",
    days: Object.fromEntries(
      DAYS.map((d) => [d, { ...defaultDay(opts.activeDays !== false, hoursTo) }]),
    ),
    prevSaturday: defaultDay(false),
    extraCosts: opts.extraCosts ?? [],
    payrollManualAdjustment: opts.adj,
    payrollEarlyPayouts: opts.early,
    settled: false,
    dataUpdatedAt: opts.dataUpdatedAt ?? "2026-08-01T10:00:00.000Z",
  };
}

function dirEntry(id, biweekly = true) {
  return {
    id: `dir-${id}`,
    name: id,
    phone: "",
    position: "Pracownik",
    rate: "50",
    active: true,
    ...(biweekly
      ? { biweeklyPayroll: true, biweeklyAnchorDate: ANCHOR }
      : { biweeklyPayroll: false }),
  };
}

const { calcWeekEmployee, buildWeekSnapshot } = await import("../src/app/app-domain.ts");
const {
  calcBiweeklyRowDisplay,
  computePayrollCashSplit,
  isBiweeklyPayrollEmployee,
  nextBiweeklyPayoutSaturday,
  biweeklyMissingPrevWeekArchive,
  getBiweeklyPeriodKey,
  weekRangeFromSaturday,
  previousWeekRange,
} = await import("../src/lib/payroll-cycle.ts");
const {
  createEarlyPayoutTransaction,
  validateNewEarlyPayoutAmount,
  validateEarlyPayoutListWrite,
  getBiweeklyRemainingPayable,
  softDeleteEarlyPayout,
  applyEarlyPayoutFieldIntent,
  canChangeBiweeklyAnchor,
  canModifyEarlyPayoutsForWeek,
  getEarlyPaidForPeriod,
} = await import("../src/lib/payroll-early-payout.ts");
const { applyPayrollFieldIntentsOntoCanonical } = await import("../src/lib/payroll-field-intent.ts");
const { calcWeekNetNoPrevSat } = await import("../src/lib/payroll-cycle.ts");

console.log("=== PAYROLL EARLY PAYOUT BIWEEKLY R1–R28 ===\n");

const dirBw = [dirEntry("bw")];
const dirWeek = [dirEntry("wk", false)];

// Sanity earned = 1800
{
  const emp = makeEmp("bw", "bw");
  const net = calcWeekNetNoPrevSat(emp).netPay;
  assert("SANITY earned 1800", Math.abs(net - 1800) < 0.01, String(net));
}

// R1 weekly — early payout unavailable (no biweekly period key / UI gate)
{
  const emp = makeEmp("wk", "wk");
  const pk = getBiweeklyPeriodKey(emp, dirWeek, W1T);
  assert("R1 weekly no periodKey", pk == null);
  assert("R1 weekly not biweekly", !isBiweeklyPayrollEmployee(emp, dirWeek));
  const row = calcBiweeklyRowDisplay(emp, dirWeek, W1F, W1T, []);
  assert("R1 weekly no biweekly row", row == null);
}

// R2 biweekly W1: 1800 earned, early 1500, remaining 300
{
  const tx = createEarlyPayoutTransaction({
    id: "ep1",
    amount: 1500,
    method: "transfer",
    paidAt: "2026-08-12",
    periodKey: PERIOD_KEY,
    nowIso: "2026-08-12T10:00:00.000Z",
  });
  const emp = makeEmp("bw", "bw", { early: [tx] });
  const rem = getBiweeklyRemainingPayable(emp, dirBw, W1F, W1T, []);
  assert("R2 periodKey", rem.periodKey === PERIOD_KEY, rem.periodKey);
  assert("R2 earned 1800", Math.abs(rem.earnedSoFar - 1800) < 0.01, String(rem.earnedSoFar));
  assert("R2 early 1500", Math.abs(rem.earlyPaid - 1500) < 0.01);
  assert("R2 remaining 300", Math.abs(rem.remaining - 300) < 0.01, String(rem.remaining));
  const row = calcBiweeklyRowDisplay(emp, dirBw, W1F, W1T, []);
  assert("R2 W1 not payout week", row && !row.isPayoutWeek);
  assert("R2 W1 displayNet 300", row && Math.abs(row.displayNet - 300) < 0.01, String(row?.displayNet));
}

// R3 biweekly W2: W1 1800 + W2 1800 − early 1500 = 2100
{
  const tx = createEarlyPayoutTransaction({
    id: "ep1",
    amount: 1500,
    method: "transfer",
    paidAt: "2026-08-12",
    periodKey: PERIOD_KEY,
    nowIso: "2026-08-12T10:00:00.000Z",
  });
  const w1Emp = makeEmp("bw", "bw", { early: [tx] });
  const archive = [
    {
      id: "snap-w1",
      weekFrom: W1F,
      weekTo: W1T,
      savedAt: "2026-08-15T20:00:00.000Z",
      employees: [],
      totalEmployees: 1,
      totalHours: 0,
      totalGross: 0,
      totalZaliczka: 0,
      totalNet: 0,
      weekEmployees: [w1Emp],
    },
  ];
  const w2Emp = makeEmp("bw", "bw", { early: [tx] });
  const rem = getBiweeklyRemainingPayable(w2Emp, dirBw, W2F, W2T, archive);
  assert("R3 period payable 3600", Math.abs(rem.periodPayable - 3600) < 0.01, String(rem.periodPayable));
  assert("R3 payout remaining 2100", Math.abs(rem.remaining - 2100) < 0.01, String(rem.remaining));
  const row = calcBiweeklyRowDisplay(w2Emp, dirBw, W2F, W2T, archive);
  assert("R3 W2 payout week", row && row.isPayoutWeek);
  assert("R3 displayNet 2100", row && Math.abs(row.displayNet - 2100) < 0.01, String(row?.displayNet));
}

// R4 cycle unchanged — early does not change anchor / next payout
{
  const emp = makeEmp("bw", "bw");
  const before = nextBiweeklyPayoutSaturday(W1T, ANCHOR);
  const tx = createEarlyPayoutTransaction({
    amount: 100,
    method: "cash",
    paidAt: "2026-08-11",
    periodKey: PERIOD_KEY,
  });
  const withEarly = { ...emp, payrollEarlyPayouts: [tx] };
  const after = nextBiweeklyPayoutSaturday(W1T, ANCHOR);
  assert("R4 anchor periodKey stable", before === PERIOD_KEY && after === PERIOD_KEY);
  assert(
    "R4 getBiweeklyPeriodKey unchanged",
    getBiweeklyPeriodKey(withEarly, dirBw, W1T) === before,
  );
}

// R5 multiple early 500+300=800
{
  const txs = [
    createEarlyPayoutTransaction({ id: "a", amount: 500, method: "transfer", paidAt: "2026-08-11", periodKey: PERIOD_KEY }),
    createEarlyPayoutTransaction({ id: "b", amount: 300, method: "cash", paidAt: "2026-08-12", periodKey: PERIOD_KEY }),
  ];
  const emp = makeEmp("bw", "bw", { early: txs });
  const rem = getBiweeklyRemainingPayable(emp, dirBw, W1F, W1T, []);
  assert("R5 early total 800", Math.abs(rem.earlyPaid - 800) < 0.01);
  assert("R5 remaining 1000", Math.abs(rem.remaining - 1000) < 0.01);
}

// R6 overpayment reject
{
  const v = validateNewEarlyPayoutAmount(301, 300);
  assert("R6 overpayment blocked", !v.ok && v.reason === "overpayment");
  const ok = validateNewEarlyPayoutAmount(300, 300);
  assert("R6 exact remaining OK", ok.ok);
}

// R7 W1 cannot pay future W2 earnings (remaining capped at W1 earned)
{
  const emp = makeEmp("bw", "bw");
  const rem = getBiweeklyRemainingPayable(emp, dirBw, W1F, W1T, []);
  assert("R7 remaining = W1 only 1800", Math.abs(rem.remaining - 1800) < 0.01);
  const over = validateNewEarlyPayoutAmount(1800.01, rem.remaining);
  assert("R7 block > W1 earned", !over.ok);
}

// R8 cash early counted in W1 cash accounting
{
  const tx = createEarlyPayoutTransaction({
    id: "cash1",
    amount: 400,
    method: "cash",
    paidAt: "2026-08-12",
    periodKey: PERIOD_KEY,
  });
  const emp = makeEmp("bw", "bw", { early: [tx] });
  const split = computePayrollCashSplit(
    [emp],
    dirBw,
    W1F,
    W1T,
    [],
    (e) => calcWeekNetNoPrevSat(e).netPay,
  );
  assert("R8 earlyCashNet 400", Math.abs(split.earlyCashNet - 400) < 0.01, String(split.earlyCashNet));
  assert("R8 W1 biweeklyPayoutNet 0", Math.abs(split.biweeklyPayoutNet) < 0.01);
  assert("R8 totalSaturdayCash includes early cash", Math.abs(split.totalSaturdayCash - 400) < 0.01);
}

// R9 transfer not counted as cash
{
  const tx = createEarlyPayoutTransaction({
    id: "tr1",
    amount: 400,
    method: "transfer",
    paidAt: "2026-08-12",
    periodKey: PERIOD_KEY,
  });
  const emp = makeEmp("bw", "bw", { early: [tx] });
  const split = computePayrollCashSplit(
    [emp],
    dirBw,
    W1F,
    W1T,
    [],
    (e) => calcWeekNetNoPrevSat(e).netPay,
  );
  assert("R9 earlyCashNet 0", Math.abs(split.earlyCashNet) < 0.01);
}

// R10 deleted excluded
{
  const active = createEarlyPayoutTransaction({
    id: "d1",
    amount: 500,
    method: "transfer",
    paidAt: "2026-08-11",
    periodKey: PERIOD_KEY,
  });
  const deleted = softDeleteEarlyPayout([active], "d1", "2026-08-12T12:00:00.000Z");
  const emp = makeEmp("bw", "bw", { early: deleted });
  const rem = getBiweeklyRemainingPayable(emp, dirBw, W1F, W1T, []);
  assert("R10 deleted excluded", Math.abs(rem.earlyPaid) < 0.01);
  assert("R10 remaining full 1800", Math.abs(rem.remaining - 1800) < 0.01);
}

// R11 concurrent ADD — two IDs survive
{
  const cloud = [];
  const before = [];
  const afterA = [
    createEarlyPayoutTransaction({ id: "c1", amount: 100, method: "cash", paidAt: "2026-08-11", periodKey: PERIOD_KEY }),
  ];
  const afterB = [
    createEarlyPayoutTransaction({ id: "c2", amount: 200, method: "transfer", paidAt: "2026-08-11", periodKey: PERIOD_KEY }),
  ];
  const m1 = applyEarlyPayoutFieldIntent(cloud, before, afterA);
  const m2 = applyEarlyPayoutFieldIntent(m1.list, before, afterB);
  assert("R11 both IDs", m2.list.some((t) => t.id === "c1") && m2.list.some((t) => t.id === "c2"));
  assert("R11 total 300", Math.abs(m2.list.reduce((s, t) => s + t.amount, 0) - 300) < 0.01);
}

// R12 stale client — no early intent => preserve cloud txs
{
  const cloudTx = createEarlyPayoutTransaction({
    id: "cloud-ep",
    amount: 700,
    method: "transfer",
    paidAt: "2026-08-11",
    periodKey: PERIOD_KEY,
    nowIso: "2026-08-11T10:00:00.000Z",
  });
  const cloud = [makeEmp("bw", "bw", { early: [cloudTx], hoursTo: "11:00" })];
  const stale = makeEmp("bw", "bw", { hoursTo: "16:00", dataUpdatedAt: "2026-08-28T18:00:00.000Z" });
  const before = [stale];
  const after = [{
    ...stale,
    extraCosts: [{ id: "x1", description: "paragon", amount: "10", status: "pending" }],
    dataUpdatedAt: "2026-08-28T19:00:00.000Z",
  }];
  const applied = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], W1F, W1T);
  const ep = applied.roster[0]?.payrollEarlyPayouts ?? [];
  assert("R12 cloud early preserved", ep.some((t) => t.id === "cloud-ep" && t.amount === 700));
}

// R13 CAS-match — only intended ADD applied
{
  const cloudTx = createEarlyPayoutTransaction({
    id: "keep",
    amount: 100,
    method: "cash",
    paidAt: "2026-08-11",
    periodKey: PERIOD_KEY,
    nowIso: "2026-08-11T10:00:00.000Z",
  });
  const cloud = [makeEmp("bw", "bw", { early: [cloudTx] })];
  const before = [makeEmp("bw", "bw", { early: [cloudTx] })];
  const newTx = createEarlyPayoutTransaction({
    id: "new",
    amount: 50,
    method: "transfer",
    paidAt: "2026-08-12",
    periodKey: PERIOD_KEY,
  });
  const after = [makeEmp("bw", "bw", { early: [cloudTx, newTx] })];
  const applied = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], W1F, W1T);
  const ids = (applied.roster[0]?.payrollEarlyPayouts ?? []).map((t) => t.id).sort();
  assert("R13 intended ADD", ids.join(",") === "keep,new", ids.join(","));
}

// R14 CAS-409 rebase — canonical + intended
{
  const cloudOnly = createEarlyPayoutTransaction({
    id: "cloud-only",
    amount: 80,
    method: "cash",
    paidAt: "2026-08-11",
    periodKey: PERIOD_KEY,
  });
  const localAdd = createEarlyPayoutTransaction({
    id: "local-add",
    amount: 20,
    method: "transfer",
    paidAt: "2026-08-12",
    periodKey: PERIOD_KEY,
  });
  const cloud = [makeEmp("bw", "bw", { early: [cloudOnly] })];
  const before = [makeEmp("bw", "bw", { early: [] })];
  const after = [makeEmp("bw", "bw", { early: [localAdd] })];
  const applied = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], W1F, W1T);
  const ids = new Set((applied.roster[0]?.payrollEarlyPayouts ?? []).map((t) => t.id));
  assert("R14 keeps cloud + local ADD", ids.has("cloud-only") && ids.has("local-add"));
}

// R15 no resurrection after delete
{
  const live = createEarlyPayoutTransaction({
    id: "gone",
    amount: 100,
    method: "cash",
    paidAt: "2026-08-11",
    periodKey: PERIOD_KEY,
    nowIso: "2026-08-11T10:00:00.000Z",
  });
  const tomb = { ...live, deletedAt: "2026-08-12T10:00:00.000Z", updatedAt: "2026-08-12T10:00:00.000Z" };
  const m = applyEarlyPayoutFieldIntent([tomb], [tomb], [live]);
  assert("R15 no resurrect", m.list.every((t) => t.id !== "gone" || t.deletedAt));
}

// R16 W2 normal payout subtracts early once
{
  const tx = createEarlyPayoutTransaction({
    id: "once",
    amount: 1500,
    method: "transfer",
    paidAt: "2026-08-12",
    periodKey: PERIOD_KEY,
  });
  const w1 = makeEmp("bw", "bw", { early: [tx] });
  const archive = [{
    id: "a",
    weekFrom: W1F,
    weekTo: W1T,
    savedAt: "x",
    employees: [],
    totalEmployees: 1,
    totalHours: 0,
    totalGross: 0,
    totalZaliczka: 0,
    totalNet: 0,
    weekEmployees: [w1],
  }];
  const w2 = makeEmp("bw", "bw", { early: [tx] });
  const row = calcBiweeklyRowDisplay(w2, dirBw, W2F, W2T, archive);
  assert("R16 subtract once", row && Math.abs(row.displayNetBeforeEarly - 3600) < 0.01
    && Math.abs(row.earlyPaid - 1500) < 0.01
    && Math.abs(row.displayNet - 2100) < 0.01);
}

// R17 no early — unchanged biweekly
{
  const w1 = makeEmp("bw", "bw");
  const archive = [{
    id: "a",
    weekFrom: W1F,
    weekTo: W1T,
    savedAt: "x",
    employees: [],
    totalEmployees: 1,
    totalHours: 0,
    totalGross: 0,
    totalZaliczka: 0,
    totalNet: 0,
    weekEmployees: [w1],
  }];
  const w2 = makeEmp("bw", "bw");
  const row = calcBiweeklyRowDisplay(w2, dirBw, W2F, W2T, archive);
  assert("R17 full 3600", row && Math.abs(row.displayNet - 3600) < 0.01 && Math.abs(row.earlyPaid) < 0.01);
}

// R18 leave + manual adjustment included in earned
{
  const emp = makeEmp("bw", "bw", {
    activeDays: false,
    adj: { amount: 1000, description: "urlopowe", kind: "vacation", updatedAt: "2026-08-10T10:00:00.000Z" },
    extraCosts: [{ id: "e1", description: "paragon", amount: "200", status: "approved" }],
  });
  // labor 0 + extras 200 + adj 1000 = 1200
  const rem = getBiweeklyRemainingPayable(emp, dirBw, W1F, W1T, []);
  assert("R18 earned includes adj+extras", Math.abs(rem.earnedSoFar - 1200) < 0.01, String(rem.earnedSoFar));
}

// R19 P0 hours-down regression (stale high hours, edit early → keep cloud low hours)
{
  const cloud = [makeEmp("bw", "bw", { hoursTo: "11:00" })]; // 4h/day
  const stale = makeEmp("bw", "bw", { hoursTo: "16:00", dataUpdatedAt: "2026-08-28T18:00:00.000Z" });
  const before = [stale];
  const tx = createEarlyPayoutTransaction({
    id: "ep-r19",
    amount: 50,
    method: "transfer",
    paidAt: "2026-08-12",
    periodKey: PERIOD_KEY,
  });
  const after = [{ ...stale, payrollEarlyPayouts: [tx] }];
  const applied = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], W1F, W1T);
  const h = calcWeekEmployee(applied.roster[0]).weekHours;
  const cloudH = calcWeekEmployee(cloud[0]).weekHours;
  assert("R19 hours stay cloud", Math.abs(h - cloudH) < 0.01, `${h} vs ${cloudH}`);
}

// R20 P1 membership — stale ghost without before does not replace
{
  const cloud = [makeEmp("bw", "bw")];
  const after = [makeEmp("ghost", "Ghost")];
  const applied = applyPayrollFieldIntentsOntoCanonical(cloud, undefined, after, [], W1F, W1T);
  assert("R20 keep cloud membership", applied.roster.length === 1 && applied.roster[0].name === "bw");
}

// R21 P2 field-intent regression — rate intent without early still works
{
  const cloud = [makeEmp("bw", "bw", { rate: "50" })];
  const before = [makeEmp("bw", "bw", { rate: "50" })];
  const after = [makeEmp("bw", "bw", {
    rate: "60",
    dataUpdatedAt: "2026-08-20T12:00:00.000Z",
  })];
  // rateUpdatedAt bump for intent
  after[0].rateUpdatedAt = "2026-08-20T12:00:00.000Z";
  before[0].rateUpdatedAt = "2026-08-01T10:00:00.000Z";
  cloud[0].rateUpdatedAt = "2026-08-01T10:00:00.000Z";
  const applied = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], W1F, W1T);
  assert("R21 rate intent applied", applied.roster[0].rate === "60");
}

// R22 missing W1 archive behavior preserved
{
  const w2 = makeEmp("bw", "bw");
  const miss = biweeklyMissingPrevWeekArchive([w2], dirBw, W2F, W2T, []);
  assert("R22 missing archive", miss.missing === true);
}

// R23 closed period — modification blocked
{
  const gate = canModifyEarlyPayoutsForWeek(true, PERIOD_KEY, W2T);
  assert("R23 closed week block", !gate.ok && gate.reason === "closed_week");
  const open = canModifyEarlyPayoutsForWeek(false, PERIOD_KEY, W2T);
  assert("R23 open week OK", open.ok);
}

// R24 anchor change with active early blocked
{
  const tx = createEarlyPayoutTransaction({
    id: "anc",
    amount: 100,
    method: "cash",
    paidAt: "2026-08-12",
    periodKey: PERIOD_KEY,
  });
  const emp = makeEmp("bw", "bw", { early: [tx], directoryId: "dir-bw" });
  const gate = canChangeBiweeklyAnchor("dir-bw", [emp], dirBw, W1F, W1T, []);
  assert("R24 anchor blocked", !gate.ok && gate.reason === "active_early_payouts");
}

// R25 anchor change with no active early OK
{
  const emp = makeEmp("bw", "bw", { directoryId: "dir-bw" });
  const gate = canChangeBiweeklyAnchor("dir-bw", [emp], dirBw, W1F, W1T, []);
  assert("R25 anchor allowed", gate.ok);
}

// R26 cash + transfer totals separated
{
  const txs = [
    createEarlyPayoutTransaction({ id: "c", amount: 400, method: "cash", paidAt: "2026-08-11", periodKey: PERIOD_KEY }),
    createEarlyPayoutTransaction({ id: "t", amount: 600, method: "transfer", paidAt: "2026-08-12", periodKey: PERIOD_KEY }),
  ];
  const emp = makeEmp("bw", "bw", { early: txs });
  const early = getEarlyPaidForPeriod(emp, dirBw, W1F, W1T, [], PERIOD_KEY);
  assert("R26 cash 400", Math.abs(early.cash - 400) < 0.01);
  assert("R26 transfer 600", Math.abs(early.transfer - 600) < 0.01);
  assert("R26 total 1000", Math.abs(early.total - 1000) < 0.01);
}

// R27 earlyPaid + normalPayout == periodPayable
{
  const tx = createEarlyPayoutTransaction({
    id: "full",
    amount: 1500,
    method: "transfer",
    paidAt: "2026-08-12",
    periodKey: PERIOD_KEY,
  });
  const w1 = makeEmp("bw", "bw", { early: [tx] });
  const archive = [{
    id: "a",
    weekFrom: W1F,
    weekTo: W1T,
    savedAt: "x",
    employees: [],
    totalEmployees: 1,
    totalHours: 0,
    totalGross: 0,
    totalZaliczka: 0,
    totalNet: 0,
    weekEmployees: [w1],
  }];
  const w2 = makeEmp("bw", "bw", { early: [tx] });
  const rem = getBiweeklyRemainingPayable(w2, dirBw, W2F, W2T, archive);
  assert(
    "R27 early+remaining == period",
    Math.abs(rem.earlyPaid + rem.remaining - rem.periodPayable) < 0.01,
    `${rem.earlyPaid}+${rem.remaining} vs ${rem.periodPayable}`,
  );
}

// R28 zero remaining — no negative
{
  const tx = createEarlyPayoutTransaction({
    id: "all",
    amount: 1800,
    method: "transfer",
    paidAt: "2026-08-12",
    periodKey: PERIOD_KEY,
  });
  const emp = makeEmp("bw", "bw", { early: [tx] });
  const rem = getBiweeklyRemainingPayable(emp, dirBw, W1F, W1T, []);
  assert("R28 remaining 0", Math.abs(rem.remaining) < 0.01);
  const row = calcBiweeklyRowDisplay(emp, dirBw, W1F, W1T, []);
  assert("R28 displayNet >= 0", row && row.displayNet >= 0);
}

// R29 write-path overpayment — domain gate (not UI-only)
{
  const emp = makeEmp("bw", "bw");
  const over = [
    createEarlyPayoutTransaction({
      id: "over",
      amount: 1800.01,
      method: "transfer",
      paidAt: "2026-08-12",
      periodKey: PERIOD_KEY,
    }),
  ];
  const gate = validateEarlyPayoutListWrite(emp, dirBw, W1F, W1T, [], over);
  assert("R29 write-path overpayment BLOCK", !gate.ok && gate.reason === "overpayment");
  const okList = [
    createEarlyPayoutTransaction({
      id: "ok1500",
      amount: 1500,
      method: "transfer",
      paidAt: "2026-08-12",
      periodKey: PERIOD_KEY,
    }),
  ];
  const ok = validateEarlyPayoutListWrite(emp, dirBw, W1F, W1T, [], okList);
  assert("R29 write-path exact-under OK", ok.ok);
  const softDel = softDeleteEarlyPayout(okList, "ok1500");
  const delOk = validateEarlyPayoutListWrite(
    { ...emp, payrollEarlyPayouts: okList },
    dirBw,
    W1F,
    W1T,
    [],
    softDel,
  );
  assert("R29 soft-delete write OK", delOk.ok);
}

// R30 period isolation A → B (real periodKey from anchor)
{
  const periodAKey = getBiweeklyPeriodKey(makeEmp("bw", "bw"), dirBw, W2T);
  assert("R30 period A key", periodAKey === PERIOD_KEY, String(periodAKey));

  const periodBKey = nextBiweeklyPayoutSaturday("2026-08-29", ANCHOR);
  assert("R30 period B key differs", periodBKey && periodBKey !== periodAKey, String(periodBKey));
  const bW2 = weekRangeFromSaturday(periodBKey);
  const bW1 = previousWeekRange(bW2.from);
  assert("R30 B ranges", bW1.to < bW2.from && bW2.to === periodBKey);

  const earlyA = createEarlyPayoutTransaction({
    id: "iso-a",
    amount: 1500,
    method: "transfer",
    paidAt: "2026-08-12",
    periodKey: periodAKey,
  });
  const aW1 = makeEmp("bw", "bw", { early: [earlyA] });
  const aArchive = [{
    id: "iso-a-w1",
    weekFrom: W1F,
    weekTo: W1T,
    savedAt: "x",
    employees: [],
    totalEmployees: 1,
    totalHours: 0,
    totalGross: 0,
    totalZaliczka: 0,
    totalNet: 0,
    weekEmployees: [aW1],
  }];
  const aW2 = makeEmp("bw", "bw", { early: [earlyA] });
  const aRem = getBiweeklyRemainingPayable(aW2, dirBw, W2F, W2T, aArchive);
  assert("R30 period A payout 2100", Math.abs(aRem.remaining - 2100) < 0.01, String(aRem.remaining));

  // Next period: same emp still carries Period A txs on object, but B must ignore them
  const bW1Emp = makeEmp("bw", "bw", { early: [earlyA] });
  const bArchive = [
    ...aArchive,
    {
      id: "iso-a-w2",
      weekFrom: W2F,
      weekTo: W2T,
      savedAt: "y",
      employees: [],
      totalEmployees: 1,
      totalHours: 0,
      totalGross: 0,
      totalZaliczka: 0,
      totalNet: 0,
      weekEmployees: [aW2],
    },
    {
      id: "iso-b-w1",
      weekFrom: bW1.from,
      weekTo: bW1.to,
      savedAt: "z",
      employees: [],
      totalEmployees: 1,
      totalHours: 0,
      totalGross: 0,
      totalZaliczka: 0,
      totalNet: 0,
      weekEmployees: [bW1Emp],
    },
  ];
  const bW2Emp = makeEmp("bw", "bw", { early: [earlyA] });
  assert(
    "R30 B periodKey",
    getBiweeklyPeriodKey(bW2Emp, dirBw, bW2.to) === periodBKey,
  );
  const bRem = getBiweeklyRemainingPayable(bW2Emp, dirBw, bW2.from, bW2.to, bArchive);
  assert("R30 period B early ignored", Math.abs(bRem.earlyPaid) < 0.01, String(bRem.earlyPaid));
  assert("R30 period B payout 3600", Math.abs(bRem.remaining - 3600) < 0.01, String(bRem.remaining));
  const bRow = calcBiweeklyRowDisplay(bW2Emp, dirBw, bW2.from, bW2.to, bArchive);
  assert("R30 B displayNet 3600", bRow && Math.abs(bRow.displayNet - 3600) < 0.01, String(bRow?.displayNet));
}

// Snapshot freezes early list
{
  const tx = createEarlyPayoutTransaction({
    id: "snap",
    amount: 250,
    method: "cash",
    paidAt: "2026-08-12",
    periodKey: PERIOD_KEY,
  });
  const emp = makeEmp("bw", "bw", { early: [tx] });
  const snap = buildWeekSnapshot(W1F, W1T, [emp], []);
  assert("SNAP weekEmployees has early", (snap.weekEmployees?.[0]?.payrollEarlyPayouts ?? []).length === 1);
  assert("SNAP earlyPaidTotal", snap.employees[0].earlyPaidTotal === 250);
}

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
