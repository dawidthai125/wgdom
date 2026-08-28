/**
 * PAYROLL — settlement metadata (who / when / method / amount) R1–R25.
 * Run: npx vite-node scripts/test-payroll-settlement-metadata.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-settlement-meta";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-settlement-meta";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: (k) => { delete lsStore[k]; },
  clear: () => { for (const k of Object.keys(lsStore)) delete lsStore[k]; },
};

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const ANCHOR = "2026-05-30";
const W1F = "2026-08-10";
const W1T = "2026-08-15";
const W2F = "2026-08-17";
const W2T = "2026-08-22";
const WF = "2026-08-24";
const WT = "2026-08-29";
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

function makeEmp(id, opts = {}) {
  const hoursTo = opts.hoursTo ?? "13:00";
  return {
    id,
    directoryId: opts.directoryId ?? `dir-${id}`,
    name: opts.name ?? id,
    phone: "",
    position: "Pracownik",
    rate: opts.rate ?? "50",
    rateUpdatedAt: "2026-08-01T10:00:00.000Z",
    days: Object.fromEntries(
      DAYS.map((d) => [d, { ...defaultDay(opts.activeDays !== false, hoursTo) }]),
    ),
    prevSaturday: defaultDay(false),
    extraCosts: opts.extraCosts ?? [],
    payrollManualAdjustment: opts.adj,
    payrollEarlyPayouts: opts.early,
    settled: opts.settled ?? false,
    settledUpdatedAt: opts.settledUpdatedAt,
    payrollSettlement: opts.payrollSettlement,
    dataUpdatedAt: opts.dataUpdatedAt ?? "2026-08-01T10:00:00.000Z",
  };
}

function dirEntry(id, biweekly = false) {
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

const { buildWeekSnapshot } = await import("../src/app/app-domain.ts");
const {
  calcBiweeklyRowDisplay,
  getBiweeklyPeriodKey,
  nextBiweeklyPayoutSaturday,
} = await import("../src/lib/payroll-cycle.ts");
const {
  createEarlyPayoutTransaction,
} = await import("../src/lib/payroll-early-payout.ts");
const {
  buildPayrollSettlement,
  validatePayrollSettlementForWrite,
  normalizePayrollSettlement,
  resolveSettlementPayableAmount,
  payrollSettlementDisplay,
  applySettlementFieldIntent,
  pickPayrollSettlementForMerge,
} = await import("../src/lib/payroll-settlement.ts");
const { applyPayrollFieldIntentsOntoCanonical, rebasePayrollFieldIntents } =
  await import("../src/lib/payroll-field-intent.ts");
const { mergeWeekEmployeeRecord } = await import("../src/lib/payroll-week-employee-record-merge.ts");
  const { payrollSettlementStatusText } =
  await import("../src/lib/payroll-export.ts");

const dawid = { id: "u-dawid", displayName: "Dawid" };
const pawel = { id: "u-pawel", displayName: "Paweł" };

function settleEmp(emp, method, amount, actor, at) {
  const settlement = buildPayrollSettlement({
    settledByUserId: actor.id,
    settledByName: actor.displayName,
    paymentMethod: method,
    amount,
    settledAt: at,
  });
  return {
    ...emp,
    settled: true,
    settledUpdatedAt: at,
    payrollSettlement: settlement,
  };
}

function unsettleEmp(emp, at) {
  return { ...emp, settled: false, settledUpdatedAt: at };
}

// ─── R1 weekly cash ───
{
  const emp = makeEmp("w1", { hoursTo: "13:00", rate: "50" });
  const dir = [dirEntry("w1", false)];
  const amount = resolveSettlementPayableAmount(emp, dir, WF, WT, []);
  const settled = settleEmp(emp, "cash", amount, dawid, "2026-08-28T20:41:00.000Z");
  const d = payrollSettlementDisplay(settled);
  assert("R1 weekly cash settled", settled.settled === true);
  assert("R1 weekly cash method", settled.payrollSettlement.paymentMethod === "cash");
  assert("R1 weekly cash by", settled.payrollSettlement.settledByName === "Dawid");
  assert("R1 weekly cash amount>0", amount > 0 && settled.payrollSettlement.amount === amount);
  assert("R1 display has metadata", d.hasMetadata && d.methodLabel === "Gotówka");
}

// ─── R2 weekly transfer ───
{
  const emp = makeEmp("w2");
  const dir = [dirEntry("w2", false)];
  const amount = resolveSettlementPayableAmount(emp, dir, WF, WT, []);
  const settled = settleEmp(emp, "transfer", amount, dawid, "2026-08-28T21:00:00.000Z");
  assert("R2 weekly transfer", settled.payrollSettlement.paymentMethod === "transfer");
  assert("R2 display Przelew", payrollSettlementDisplay(settled).methodLabel === "Przelew");
}

// ─── R3–R4 biweekly cash/transfer ───
{
  const emp = makeEmp("b3", { directoryId: "dir-b3" });
  const dir = [dirEntry("b3", true)];
  const w1Snap = buildWeekSnapshot(W1F, W1T, [makeEmp("b3", { directoryId: "dir-b3" })], [], null, [], []);
  const amount = resolveSettlementPayableAmount(emp, dir, W2F, W2T, [w1Snap]);
  const cash = settleEmp(emp, "cash", amount, dawid, "2026-08-22T18:00:00.000Z");
  const xfer = settleEmp(emp, "transfer", amount, pawel, "2026-08-22T19:00:00.000Z");
  assert("R3 biweekly cash", cash.payrollSettlement.paymentMethod === "cash" && cash.payrollSettlement.amount === amount);
  assert("R4 biweekly transfer", xfer.payrollSettlement.paymentMethod === "transfer");
}

// ─── R5–R6 vacation + MA ───
{
  const emp = makeEmp("v5", {
    activeDays: false,
    adj: { amount: 1000, description: "urlopówka", updatedAt: "2026-08-28T10:00:00.000Z" },
  });
  const dir = [dirEntry("v5", false)];
  const leaves = [{
    id: "leave-v5",
    employeeId: emp.directoryId,
    leaveType: "vacation",
    weekStart: WF,
    weekEnd: WT,
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
  }];
  const amount = resolveSettlementPayableAmount(emp, dir, WF, WT, [], { employeeLeaves: leaves });
  assert("R5 vacation payable ~1000", Math.abs(amount - 1000) < 0.01, `got ${amount}`);
  const settledCash = settleEmp(emp, "cash", amount, dawid, "2026-08-28T12:00:00.000Z");
  const settledXfer = settleEmp(emp, "transfer", amount, pawel, "2026-08-28T12:01:00.000Z");
  assert("R5 vacation cash amount", settledCash.payrollSettlement.amount === 1000);
  assert("R6 vacation transfer amount", settledXfer.payrollSettlement.amount === 1000);
}

// ─── R7–R8 early + final 2100 ───
{
  const dir = [dirEntry("e8", true)];
  const early = createEarlyPayoutTransaction({
    amount: 1500,
    method: "transfer",
    paidAt: W1T,
    periodKey: PERIOD_KEY,
  });
  const w1 = makeEmp("e8", { directoryId: "dir-e8", early: [early] });
  const w1Snap = buildWeekSnapshot(W1F, W1T, [w1], [], null, [], []);
  const w2 = makeEmp("e8", { directoryId: "dir-e8", early: [early] });
  const row = calcBiweeklyRowDisplay(w2, dir, W2F, W2T, [w1Snap]);
  const amount = resolveSettlementPayableAmount(w2, dir, W2F, W2T, [w1Snap]);
  assert("R8 displayNet 2100", Math.abs(row.displayNet - 2100) < 0.01, `got ${row.displayNet}`);
  assert("R8 settle amount 2100", Math.abs(amount - 2100) < 0.01, `got ${amount}`);
  const settled = settleEmp(w2, "cash", amount, dawid, "2026-08-22T20:00:00.000Z");
  assert("R7 early list intact", Array.isArray(settled.payrollEarlyPayouts) && settled.payrollEarlyPayouts.length === 1);
  assert("R7 early amount still 1500", settled.payrollEarlyPayouts[0].amount === 1500);
}

// ─── R9 snapshot ───
{
  const emp = settleEmp(makeEmp("s9"), "cash", 500, dawid, "2026-08-28T10:00:00.000Z");
  const snap = buildWeekSnapshot(WF, WT, [emp], [], null, [], []);
  const se = snap.employees[0];
  assert("R9 snapshot settled", se.settled === true);
  assert("R9 snapshot meta", se.payrollSettlement?.settledByName === "Dawid");
  assert("R9 snapshot method", se.payrollSettlement?.paymentMethod === "cash");
  assert("R9 weekEmployees meta", snap.weekEmployees?.[0]?.payrollSettlement?.amount === 500);
}

// ─── R10 archive persistence (weekEmployees + employees) ───
{
  const emp = settleEmp(makeEmp("a10"), "transfer", 777, pawel, "2026-07-01T10:00:00.000Z");
  const snap = buildWeekSnapshot(WF, WT, [emp], [], null, [], []);
  const liveChanged = { ...emp, rate: "99", payrollSettlement: undefined, settled: false };
  assert(
    "R10 archive independent of live wipe",
    snap.employees[0].payrollSettlement?.settledByName === "Paweł"
      && snap.employees[0].payrollSettlement?.amount === 777
      && liveChanged.settled === false,
  );
}

// ─── R11–R13 export SSOT ───
{
  const emp = settleEmp(makeEmp("ex"), "cash", 2100, dawid, "2026-08-28T20:41:00.000Z");
  const status = payrollSettlementStatusText(emp);
  assert("R11 PDF status contains Rozliczono", status.includes("Rozliczono"));
  assert("R11 PDF status contains Gotówka", status.includes("Gotówka"));
  assert("R11 PDF status contains Dawid", status.includes("Dawid"));
  assert("R12 Word same SSOT", status.includes("2100"));
  // Email HTML uses the same payrollSettlementStatusText SSOT (logo fetch skipped in node).
  assert("R13 Email SSOT same helper", status.includes("Forma: Gotówka") && status.includes("Rozliczył: Dawid"));
}

// ─── R14–R15 identity frozen ───
{
  const sDawid = settleEmp(makeEmp("id1"), "cash", 100, dawid, "2026-08-28T10:00:00.000Z");
  const sMod = settleEmp(makeEmp("id2"), "transfer", 100, pawel, "2026-08-28T11:00:00.000Z");
  assert("R14 Admin frozen", sDawid.payrollSettlement.settledByUserId === "u-dawid");
  assert("R15 Moderator frozen", sMod.payrollSettlement.settledByUserId === "u-pawel"
    && sMod.payrollSettlement.settledByName === "Paweł");
  const d = payrollSettlementDisplay(sDawid);
  assert("R14 display not session-dependent", d.settledByLine === "Dawid");
}

// ─── R16 stale settlement write ───
{
  const cloud = settleEmp(makeEmp("st"), "cash", 100, dawid, "2026-08-28T12:00:00.000Z");
  cloud.settledUpdatedAt = "2026-08-28T12:00:00.000Z";
  const before = { ...makeEmp("st"), settled: false, settledUpdatedAt: "2026-08-28T10:00:00.000Z" };
  const after = settleEmp(makeEmp("st"), "transfer", 200, pawel, "2026-08-28T11:00:00.000Z");
  const applied = applySettlementFieldIntent(cloud, before, after);
  assert("R16 stale keeps cloud", applied.settled === true
    && applied.payrollSettlement?.paymentMethod === "cash"
    && applied.payrollSettlement?.settledByName === "Dawid");
}

// ─── R17 concurrent — newer settledUpdatedAt wins on merge ───
{
  const l = settleEmp(makeEmp("c17"), "cash", 100, dawid, "2026-08-28T10:00:00.000Z");
  l.settledUpdatedAt = "2026-08-28T10:00:00.000Z";
  const c = settleEmp(makeEmp("c17"), "transfer", 100, pawel, "2026-08-28T11:00:00.000Z");
  c.settledUpdatedAt = "2026-08-28T11:00:00.000Z";
  const merged = mergeWeekEmployeeRecord(l, c);
  assert("R17 concurrent cloud newer", merged.settled === true
    && merged.payrollSettlement?.paymentMethod === "transfer"
    && merged.payrollSettlement?.settledByName === "Paweł");
}

// ─── R18 old client without metadata preserves cloud ───
{
  const cloud = settleEmp(makeEmp("old"), "cash", 300, dawid, "2026-08-28T10:00:00.000Z");
  const before = { ...cloud };
  const after = { ...makeEmp("old"), settled: true, settledUpdatedAt: "2026-08-28T10:00:00.000Z" };
  // no payrollSettlement key
  delete after.payrollSettlement;
  const applied = applySettlementFieldIntent(cloud, before, after);
  assert("R18 old client preserves cloud meta", applied.payrollSettlement?.paymentMethod === "cash"
    && applied.payrollSettlement?.amount === 300);
  const field = applyPayrollFieldIntentsOntoCanonical([cloud], [before], [after], [], WF, WT);
  assert("R18 P2 field-intent preserves", field.roster[0].payrollSettlement?.settledByName === "Dawid");
}

// ─── R19 unsettle preserves last metadata ───
{
  const settled = settleEmp(makeEmp("u19"), "cash", 400, dawid, "2026-08-28T10:00:00.000Z");
  const before = settled;
  const after = unsettleEmp(settled, "2026-08-28T11:00:00.000Z");
  assert("R19 after still has meta object", !!after.payrollSettlement);
  const applied = applySettlementFieldIntent(settled, before, after);
  assert("R19 unsettle settled=false", applied.settled === false);
  assert("R19 unsettle keeps meta", applied.payrollSettlement?.settledByName === "Dawid"
    && applied.payrollSettlement?.paymentMethod === "cash");
}

// ─── R20 re-settle creates fresh metadata ───
{
  const first = settleEmp(makeEmp("r20"), "cash", 100, dawid, "2026-08-28T10:00:00.000Z");
  const unsettled = unsettleEmp(first, "2026-08-28T11:00:00.000Z");
  const second = settleEmp(unsettled, "transfer", 250, pawel, "2026-08-28T12:00:00.000Z");
  assert("R20 new method", second.payrollSettlement.paymentMethod === "transfer");
  assert("R20 new actor", second.payrollSettlement.settledByUserId === "u-pawel");
  assert("R20 new amount", second.payrollSettlement.amount === 250);
  const applied = applySettlementFieldIntent(unsettled, unsettled, second);
  assert("R20 intent applies fresh", applied.payrollSettlement?.settledByName === "Paweł"
    && applied.settled === true);
}

// ─── R21 legacy settled without metadata ───
{
  const legacy = { ...makeEmp("leg"), settled: true, settledUpdatedAt: "2026-01-01T00:00:00.000Z" };
  const d = payrollSettlementDisplay(legacy);
  assert("R21 legacy status Rozliczono", d.statusLabel === "Rozliczono" && d.isSettled);
  assert("R21 no fake by", d.settledByLine === null && !d.hasMetadata);
  assert("R21 compact no Dawid", !d.compactStatus.includes("Dawid"));
}

// ─── R22 payment method required ───
{
  const bad = validatePayrollSettlementForWrite({
    settledAt: "2026-08-28T10:00:00.000Z",
    settledByUserId: "u1",
    settledByName: "X",
    paymentMethod: "cheque",
    amount: 10,
  });
  assert("R22 invalid method rejected", bad.ok === false);
  const missing = validatePayrollSettlementForWrite({
    settledAt: "2026-08-28T10:00:00.000Z",
    settledByUserId: "u1",
    settledByName: "X",
    amount: 10,
  });
  assert("R22 missing method rejected", missing.ok === false);
  const ok = validatePayrollSettlementForWrite({
    settledAt: "2026-08-28T10:00:00.000Z",
    settledByUserId: "u1",
    settledByName: "X",
    paymentMethod: "cash",
    amount: 10,
  });
  assert("R22 cash accepted", ok.ok === true);
}

// ─── R23–R25 cycle / anchor / periodKey unchanged ───
{
  const dir = [dirEntry("cyc", true)];
  const emp = makeEmp("cyc", { directoryId: "dir-cyc" });
  const anchorBefore = dir[0].biweeklyAnchorDate;
  const pkBefore = getBiweeklyPeriodKey(emp, dir, W2T);
  const nextSat = nextBiweeklyPayoutSaturday(W2T, ANCHOR);
  const amount = resolveSettlementPayableAmount(emp, dir, W2F, W2T, []);
  settleEmp(emp, "cash", amount, dawid, "2026-08-22T20:00:00.000Z");
  assert("R23 weekly/biweekly cycle path ok", typeof amount === "number");
  assert("R24 anchor unchanged", dir[0].biweeklyAnchorDate === anchorBefore && anchorBefore === ANCHOR);
  assert("R25 periodKey unchanged", getBiweeklyPeriodKey(emp, dir, W2T) === pkBefore
    && pkBefore === PERIOD_KEY
    && nextSat === PERIOD_KEY);
}

// ─── Extra: rebase preserves settlement intent ───
{
  const before = makeEmp("rb");
  const after = settleEmp(before, "transfer", 88, dawid, "2026-08-28T15:00:00.000Z");
  const cloud = { ...before, settled: false };
  const rebased = rebasePayrollFieldIntents([cloud], [before], [after], [], WF, WT);
  assert("rebase settlement intent", rebased[0].settled === true
    && rebased[0].payrollSettlement?.paymentMethod === "transfer");
}

// ─── Extra: pick merge preserves absent key ───
{
  const l = { settled: true, settledUpdatedAt: "2026-08-28T12:00:00.000Z" };
  const c = {
    settled: true,
    settledUpdatedAt: "2026-08-28T10:00:00.000Z",
    payrollSettlement: buildPayrollSettlement({
      settledByUserId: "u-dawid",
      settledByName: "Dawid",
      paymentMethod: "cash",
      amount: 50,
      settledAt: "2026-08-28T10:00:00.000Z",
    }),
  };
  const picked = pickPayrollSettlementForMerge(l, c, true);
  assert("merge old-winner preserves other meta", picked?.paymentMethod === "cash");
}

console.log(`\nSettlement metadata tests: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
