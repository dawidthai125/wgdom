/**
 * PAYROLL 2.66.126 — freshness payload hardening (H1–H16).
 * npx vite-node scripts/test-payroll-freshness-payload-hardening.mjs
 */
import { applySettlementFieldIntent } from "../src/lib/payroll-settlement.ts";
import { applyEarlyPayoutFieldIntent } from "../src/lib/payroll-early-payout.ts";
import { sanitizeStaleRosterMembership } from "../src/lib/payroll-stale-roster-membership.ts";
import { rebasePayrollFieldIntents, p2SlotHoursForTest as slotH } from "../src/lib/payroll-field-intent.ts";
import { rebuildPayrollOutgoingAfterFreshness } from "../src/lib/cloud-sync.ts";
import {
  resetCloudFreshnessGateForTests,
  registerCloudFreshnessReconcile,
  markCloudFreshnessUnknown,
  ensureCloudFreshBeforeWrite,
  getCloudFreshnessState,
} from "../src/lib/cloud-freshness-gate.ts";

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

function day(to = "17:00") {
  return { active: true, from: "07:00", to, zaliczka: "" };
}
function idle() {
  return { active: false, from: "", to: "", zaliczka: "" };
}
function makeEmp(id, name, opts = {}) {
  const to = opts.hoursTo ?? "17:00";
  const days = {};
  for (const d of DAYS) {
    if (opts.pnOnly) {
      days[d] = d === "Pn" ? day(to) : idle();
    } else {
      days[d] = day(to);
    }
  }
  return {
    id,
    name,
    directoryId: opts.directoryId ?? `dir-${id}`,
    rate: opts.rate ?? "100",
    rateUpdatedAt: opts.rateUpdatedAt,
    days: opts.days ?? days,
    settled: opts.settled ?? false,
    settledUpdatedAt: opts.settledUpdatedAt,
    payrollSettlement: opts.payrollSettlement,
    payrollManualAdjustment: opts.payrollManualAdjustment,
    payrollEarlyPayouts: opts.payrollEarlyPayouts,
    extraCosts: opts.extraCosts ?? [],
    dataUpdatedAt: opts.dataUpdatedAt,
  };
}

/** Production rebuild path (same as pushWeekEmployeesToCloudUnchecked post-ensure). */
function hardenedOutgoing(cloud, before, after, hoursIntents = []) {
  return rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: after,
    intentBefore: before,
    hoursIntents,
    weekFrom: WF,
    weekTo: WT,
    tombstoned: new Set(),
  }).roster;
}

console.log("=== FRESHNESS PAYLOAD HARDENING H1–H16 ===\n");

// H1: stale 100h / Cloud 120h / no intent → Cloud preserved (fail-loud BLOCK or heal)
{
  const cloud = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00", rate: "100" })];
  const stale = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "17:00", rate: "80" })];
  const rebuilt = rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: stale,
    intentBefore: stale,
    hoursIntents: [],
    weekFrom: WF,
    weekTo: WT,
  });
  // Silent hours-down → fail-loud (hours kept for guard BLOCK); non-hours = Cloud.
  // Either way Cloud hours are not overwritten by a successful silent write of A.
  assert(
    "H1 no silent write of stale hours as success",
    rebuilt.mode === "silent_down_fail_loud"
      || Math.abs(slotH(rebuilt.roster[0], "Pn") - 12) < 0.1,
    rebuilt.mode,
  );
  assert("H1 rate from Cloud not A", String(rebuilt.roster[0].rate) === "100");
}

// H2: stale intent 100→105 while Cloud 120 → Cloud 120
{
  const cloud = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00" })];
  const before = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "17:00" })];
  const after = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "18:00" })];
  const intents = [{ weekFrom: WF, weekTo: WT, employeeId: "e1", slot: "Pn", fromHours: 10, toHours: 11 }];
  const out = hardenedOutgoing(cloud, before, after, intents);
  assert("H2 stale intent rejected → Cloud 12h", Math.abs(slotH(out[0], "Pn") - 12) < 0.1, String(slotH(out[0], "Pn")));
}

// H3: Cloud 120 / legitimate 120→125 → 125
{
  const cloud = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00" })];
  const before = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00" })];
  const after = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "20:00" })];
  const intents = [{ weekFrom: WF, weekTo: WT, employeeId: "e1", slot: "Pn", fromHours: 12, toHours: 13 }];
  const out = hardenedOutgoing(cloud, before, after, intents);
  assert("H3 legitimate 12→13", Math.abs(slotH(out[0], "Pn") - 13) < 0.1, String(slotH(out[0], "Pn")));
}

// H4: stale full roster A → after freshness rebuild MUST NOT be blindly A
{
  const cloud = [makeEmp("e1", "A", {
    pnOnly: true,
    hoursTo: "19:00",
    rate: "100",
    extraCosts: [{ id: "c0", description: "CLOUD", amount: "5", status: "approved" }],
  })];
  const staleA = [makeEmp("e1", "A", {
    pnOnly: true,
    hoursTo: "17:00",
    rate: "80",
    extraCosts: [{ id: "x", description: "A", amount: "1", status: "pending" }],
  })];
  const rebuilt = rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: staleA,
    intentBefore: staleA,
    hoursIntents: [],
    weekFrom: WF,
    weekTo: WT,
  });
  assert("H4 not blind A rate", String(rebuilt.roster[0].rate) === "100");
  assert("H4 not blind A extraCosts", (rebuilt.roster[0].extraCosts || [])[0]?.description === "CLOUD");
  assert(
    "H4 hours: Cloud or fail-loud (never successful silent A)",
    rebuilt.mode === "silent_down_fail_loud"
      || Math.abs(slotH(rebuilt.roster[0], "Pn") - 12) < 0.1,
    rebuilt.mode,
  );
}

// H5: extraCosts before == Cloud → after accepted
{
  const costs = [{ id: "c1", description: "X", amount: "10", status: "pending" }];
  const cloud = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00", extraCosts: [] })];
  const before = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00", extraCosts: [] })];
  const after = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00", extraCosts: costs })];
  const out = hardenedOutgoing(cloud, before, after, []);
  assert("H5 extraCosts accepted", (out[0].extraCosts || [])[0]?.description === "X");
}

// H6: extraCosts before != Cloud → Cloud wins
{
  const cloud = [makeEmp("e1", "A", {
    pnOnly: true,
    hoursTo: "19:00",
    extraCosts: [{ id: "c0", description: "CLOUD", amount: "5", status: "approved" }],
  })];
  const before = [makeEmp("e1", "A", {
    pnOnly: true,
    hoursTo: "17:00",
    extraCosts: [{ id: "old", description: "STALE", amount: "1", status: "pending" }],
  })];
  const after = [makeEmp("e1", "A", {
    pnOnly: true,
    hoursTo: "17:00",
    extraCosts: [{ id: "new", description: "LOCAL", amount: "9", status: "pending" }],
  })];
  const out = hardenedOutgoing(cloud, before, after, []);
  assert("H6 extraCosts Cloud wins", (out[0].extraCosts || [])[0]?.description === "CLOUD");
}

// H7: extraCosts no local intent → Cloud wins
{
  const cloudCosts = [{ id: "c0", description: "CLOUD", amount: "5", status: "approved" }];
  const cloud = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00", extraCosts: cloudCosts })];
  const local = [makeEmp("e1", "A", {
    pnOnly: true,
    hoursTo: "19:00",
    extraCosts: [{ id: "stale", description: "STALE", amount: "1", status: "pending" }],
  })];
  const out = hardenedOutgoing(cloud, local, local, []);
  assert("H7 no-intent extraCosts → Cloud", (out[0].extraCosts || [])[0]?.description === "CLOUD");
}

// H8: settlement stale baseline → Cloud wins
{
  const cloudMeta = {
    settledAt: "2026-08-28T12:00:00.000Z",
    settledByUserId: "stan",
    settledByName: "Stanislaw",
    paymentMethod: "transfer",
    amount: 2100,
  };
  const cloud = {
    settled: true,
    settledUpdatedAt: "2026-08-28T12:00:00.000Z",
    payrollSettlement: cloudMeta,
  };
  const before = { settled: false, settledUpdatedAt: "2026-08-20T10:00:00.000Z", payrollSettlement: undefined };
  const after = { settled: false, settledUpdatedAt: "2026-08-29T10:00:00.000Z", payrollSettlement: undefined };
  const s = applySettlementFieldIntent(cloud, before, after);
  assert("H8 settlement Cloud wins", s.settled === true && s.payrollSettlement?.settledByName === "Stanislaw");
}

// H9: early payout stale baseline → Cloud wins
{
  const cloudTx = [{
    id: "ep1",
    amount: 1500,
    method: "cash",
    paidAt: "2026-08-22",
    periodKey: "2026-08-22",
    updatedAt: "2026-08-22T10:00:00.000Z",
  }];
  const ep = applyEarlyPayoutFieldIntent(cloudTx, [], []);
  assert("H9 early Cloud preserved", ep.list.some((t) => t.id === "ep1" && !t.deletedAt));
}

// H10: manual adjustment stale baseline → Cloud wins
{
  const cloud = [makeEmp("e1", "A", {
    pnOnly: true,
    hoursTo: "19:00",
    payrollManualAdjustment: { amount: 1000, description: "urlop", kind: "leave_pay", updatedAt: "2026-08-28T10:00:00.000Z" },
  })];
  const before = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00" })];
  const after = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00" })];
  const out = hardenedOutgoing(cloud, before, after, []);
  assert("H10 MA Cloud wins", out[0].payrollManualAdjustment?.amount === 1000);
}

// H11: hours legitimate 120→125 → 125
{
  const cloud = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00" })];
  const before = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00" })];
  const after = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "20:00" })];
  const intents = [{ weekFrom: WF, weekTo: WT, employeeId: "e1", slot: "Pn", fromHours: 12, toHours: 13 }];
  const out = hardenedOutgoing(cloud, before, after, intents);
  assert("H11 hours 125-equivalent accepted", Math.abs(slotH(out[0], "Pn") - 13) < 0.1);
}

// H12: hours stale 100 vs 120 → Cloud preserved (BLOCK or heal)
{
  const cloud = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00", rate: "100" })];
  const stale = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "17:00", rate: "80" })];
  const rebuilt = rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: stale,
    intentBefore: stale,
    hoursIntents: [],
    weekFrom: WF,
    weekTo: WT,
  });
  assert(
    "H12 stale hours not successfully written",
    rebuilt.mode === "silent_down_fail_loud"
      || Math.abs(slotH(rebuilt.roster[0], "Pn") - 12) < 0.1,
    rebuilt.mode,
  );
  assert("H12 rate Cloud", String(rebuilt.roster[0].rate) === "100");
}

// H13: CAS 409 rebase remains correct
{
  const canonical = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00", rate: "100" })];
  const before = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00", rate: "100" })];
  const after = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "20:00", rate: "100" })];
  const intents = [{ weekFrom: WF, weekTo: WT, employeeId: "e1", slot: "Pn", fromHours: 12, toHours: 13 }];
  const rebased = rebasePayrollFieldIntents(canonical, before, after, intents, WF, WT);
  assert("H13 rebase keeps legitimate hours", Math.abs(slotH(rebased[0], "Pn") - 13) < 0.1);
  assert("H13 rebase keeps Cloud rate", String(rebased[0].rate) === "100");
}

// H14: membership stale → tombstone/membership rules preserved
{
  const cloud = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00" })];
  const ghost = makeEmp("ghost", "Ghost", { pnOnly: true, hoursTo: "17:00" });
  const before = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00" }), ghost];
  const after = [makeEmp("e1", "A", { pnOnly: true, hoursTo: "19:00" }), { ...ghost }];
  const mem = sanitizeStaleRosterMembership(cloud, after, before, new Set());
  assert("H14 ghost dropped", mem.roster.length === 1 && mem.roster[0].id === "e1", `len=${mem.roster.length}`);
}

// H15: resume + immediate edit → freshness first → legitimate intent; stale unrelated cannot overwrite
{
  resetCloudFreshnessGateForTests();
  let pulled = false;
  registerCloudFreshnessReconcile(async () => { pulled = true; });
  markCloudFreshnessUnknown("resume_visibility");
  await ensureCloudFreshBeforeWrite({ reason: "resume_visibility", force: true });
  assert("H15 freshness pull first", pulled && getCloudFreshnessState() === "fresh");
  const cloud = [makeEmp("e1", "A", {
    pnOnly: true,
    hoursTo: "19:00",
    rate: "100",
    extraCosts: [{ id: "c0", description: "CLOUD", amount: "5", status: "approved" }],
  })];
  const before = [makeEmp("e1", "A", {
    pnOnly: true,
    hoursTo: "19:00",
    rate: "100",
    extraCosts: [{ id: "stale", description: "STALE", amount: "1", status: "pending" }],
  })];
  const after = [makeEmp("e1", "A", {
    pnOnly: true,
    hoursTo: "20:00",
    rate: "100",
    extraCosts: [{ id: "stale", description: "STALE", amount: "1", status: "pending" }],
  })];
  const intents = [{ weekFrom: WF, weekTo: WT, employeeId: "e1", slot: "Pn", fromHours: 12, toHours: 13 }];
  const out = hardenedOutgoing(cloud, before, after, intents);
  assert("H15 legitimate hours kept", Math.abs(slotH(out[0], "Pn") - 13) < 0.1);
  assert("H15 stale extraCosts rejected", (out[0].extraCosts || [])[0]?.description === "CLOUD");
}

// H16: write path receives stale closed-over roster → payload = Cloud ⊕ verified intents (not blind A)
{
  const cloudB = [makeEmp("e1", "A", {
    pnOnly: true,
    hoursTo: "19:00",
    rate: "120",
    extraCosts: [{ id: "c0", description: "CLOUD", amount: "5", status: "approved" }],
  })];
  const staleA = [makeEmp("e1", "A", {
    pnOnly: true,
    hoursTo: "17:00",
    rate: "80",
    extraCosts: [{ id: "x", description: "A", amount: "1", status: "pending" }],
  })];
  const rebuilt = rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloudB,
    intentAfter: staleA,
    intentBefore: staleA,
    hoursIntents: [],
    weekFrom: WF,
    weekTo: WT,
  });
  assert("H16 rate from Cloud B", String(rebuilt.roster[0].rate) === "120");
  assert("H16 extraCosts from Cloud B", (rebuilt.roster[0].extraCosts || [])[0]?.description === "CLOUD");
  assert(
    "H16 not blind successful write of A",
    rebuilt.mode === "silent_down_fail_loud"
      || Math.abs(slotH(rebuilt.roster[0], "Pn") - 12) < 0.1,
    rebuilt.mode,
  );
}

console.log(`\n=== RESULT ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
