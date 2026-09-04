/**
 * PAYROLL GO8.2 — passive local settlement must not ride an unrelated write.
 * Run: npx vite-node scripts/test-payroll-passive-settlement-ack-safety.mjs
 *
 * Local / mock only — no production writes.
 *
 * Contract:
 *   edited === true  (explicit settle / unsettle / GO3 retry) → GO8.1 unchanged
 *   edited === false (passive LS state) + unresolved cloud ACK → keep Cloud state
 *   edited === false + no unresolved ACK                      → GO8.1 unchanged
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-go82";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-go82";

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

const WF = "2026-08-31";
const WT = "2026-09-05";
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const DAM_DIR = "6bafc80e-ee8c-4183-8e74-8750b7667d59";
const KAMIL_AT = "2026-09-04T14:39:20.689Z";

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

const {
  rebuildPayrollOutgoingAfterFreshness,
} = await import("../src/lib/cloud-sync.ts");
const {
  applyPayrollFieldIntentsOntoCanonical,
  rebasePayrollFieldIntents,
} = await import("../src/lib/payroll-field-intent.ts");
const {
  applySettlementFieldIntent,
  buildPayrollSettlement,
} = await import("../src/lib/payroll-settlement.ts");
const {
  buildSettlementRetryRosterBefore,
  clearSettlementCloudAckForTests,
  extractSettlementCloudIntents,
  listUnresolvedSettlementCloudAcks,
  markSettlementCloudPending,
  markSettlementCloudSuccess,
  resolveUnresolvedSettlementAckEmpIds,
} = await import("../src/lib/payroll-settlement-cloud-ack.ts");
const {
  rememberPayrollPendingAdds,
  resetPayrollPendingAddIntentsForTests,
} = await import("../src/lib/payroll-pending-add-intent.ts");
const { listUnauthorizedHoursDownSlots, slotHours } = await import(
  "../src/lib/payroll-hours-intent.ts"
);

// ─── fixtures ───────────────────────────────────────────────────────────────

function day(active = true, to = "16:00") {
  return { active, from: "07:00", to, zaliczka: "" };
}

function makeEmp(id, name, opts = {}) {
  return {
    id,
    directoryId: opts.directoryId ?? `dir-${id}`,
    name,
    phone: "",
    position: "Pracownik",
    rate: opts.rate ?? "28",
    days: Object.fromEntries(
      DAYS.map((d) => [d, { ...day(d !== "So", opts.hoursTo ?? "16:00") }]),
    ),
    prevSaturday: day(false),
    extraCosts: [],
    settled: opts.settled ?? false,
    dataUpdatedAt: "2026-09-04T07:00:00.000Z",
  };
}

function settlementMeta(amount, at) {
  return buildPayrollSettlement({
    settledByUserId: "u-dawid",
    settledByName: "Dawid",
    paymentMethod: "transfer",
    amount,
    settledAt: at,
  });
}

function withSaturday(emp, to) {
  return { ...emp, days: { ...emp.days, So: day(true, to) } };
}

function settledEmp(emp, amount, at) {
  return {
    ...emp,
    settled: true,
    settledUpdatedAt: at,
    payrollSettlement: settlementMeta(amount, at),
  };
}

/** Cloud: 15 employees, 10 settled, Kamil unsettled, Krzysztof Saturday 17:00. */
function cloud15() {
  const list = [];
  for (let i = 1; i <= 13; i += 1) {
    const base = makeEmp(`e${i}`, `Emp ${i}`);
    list.push(
      i <= 10
        ? settledEmp(base, 100 + i, `2026-09-03T10:0${i % 10}:00.000Z`)
        : base,
    );
  }
  list.push(makeEmp("kamil", "Kamil Elektryk", { directoryId: "dir-4", rate: "35" }));
  list.push(withSaturday(makeEmp("krzysztof", "Krzysztof"), "17:00"));
  return list;
}

/** Local: same 15, Kamil settled 1575 (unconfirmed), Krzysztof Saturday 16:00. */
function local15() {
  return cloud15().map((emp) => {
    if (emp.id === "kamil") return settledEmp(emp, 1575, KAMIL_AT);
    if (emp.id === "krzysztof") return withSaturday(emp, "16:00");
    return emp;
  });
}

function damianek() {
  return makeEmp("dam-new", "Damianek", { directoryId: DAM_DIR, hoursTo: "07:00" });
}

function markKamilPending(after) {
  const cloudLike = cloud15();
  markSettlementCloudPending(extractSettlementCloudIntents(cloudLike, after, WF, WT));
}

function reset() {
  clearSettlementCloudAckForTests();
  resetPayrollPendingAddIntentsForTests();
  for (const k of Object.keys(lsStore)) delete lsStore[k];
}

function rebuild(cloud, before, after, tombstoned) {
  return rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: after,
    intentBefore: before,
    weekFrom: WF,
    weekTo: WT,
    tombstoned,
  });
}

const byId = (roster, id) => roster.find((e) => String(e.id) === id);

console.log("\n=== GO8.2 passive settlement / unresolved ACK ===\n");

// ─── ledger resolver contract ───────────────────────────────────────────────
{
  reset();
  const after = local15();
  markKamilPending(after);
  const ids = resolveUnresolvedSettlementAckEmpIds(undefined, WF, WT);
  assert("L1 resolver returns unresolved empId", ids.has("kamil"), [...ids].join(","));
  assert("L1 resolver scoped to one employee", ids.size === 1, String(ids.size));
  assert(
    "L2 resolver filters other week",
    resolveUnresolvedSettlementAckEmpIds(undefined, "2026-09-07", "2026-09-12").size === 0,
  );
  assert(
    "L3 resolver unfiltered when no week bounds",
    resolveUnresolvedSettlementAckEmpIds(undefined, "", "").has("kamil"),
  );
  assert(
    "L4 explicit ids union with ledger",
    resolveUnresolvedSettlementAckEmpIds(new Set(["extra"]), WF, WT).has("extra"),
  );
  markSettlementCloudSuccess(WF, WT);
  assert(
    "L5 success clears unresolved",
    resolveUnresolvedSettlementAckEmpIds(undefined, WF, WT).size === 0,
  );
}

// ─── pure function contract (options are opt-in; default = GO8.1) ───────────
{
  reset();
  const cloudKamil = byId(cloud15(), "kamil");
  const localKamil = byId(local15(), "kamil");

  const passive = applySettlementFieldIntent(cloudKamil, localKamil, localKamil);
  assert("U1 no options → GO8.1 retain (unchanged default)", passive.settled === true);

  const gated = applySettlementFieldIntent(cloudKamil, localKamil, localKamil, {
    unresolvedCloudAck: true,
  });
  assert("U2 passive + unresolved ACK → cloud state", gated.settled === false);
  assert("U2 payrollSettlement dropped", gated.payrollSettlement == null);
  assert("U2 changed=false (nothing to write)", gated.changed === false);

  const retryBefore = { ...cloudKamil };
  const explicit = applySettlementFieldIntent(cloudKamil, retryBefore, localKamil, {
    unresolvedCloudAck: true,
  });
  assert("U3 explicit edit + unresolved ACK → still applied", explicit.settled === true);
  assert("U3 amount preserved", explicit.payrollSettlement?.amount === 1575);
}

// ─── A1: pending ACK + unrelated membership ADD ─────────────────────────────
{
  reset();
  const cloud = cloud15();
  const before = local15().map((e) => (e.id === "krzysztof" ? withSaturday(e, "17:00") : e));
  const dam = damianek();
  const after = [...before, dam];
  markKamilPending(before);
  rememberPayrollPendingAdds([dam]);

  const { roster } = rebuild(cloud, before, after, new Set());
  const kamil = byId(roster, "kamil");
  assert("A1 roster 16", roster.length === 16, String(roster.length));
  assert("A1 Damianek present", !!byId(roster, "dam-new"));
  assert("A1 Damianek unsettled", byId(roster, "dam-new")?.settled !== true);
  assert("A1 Kamil NOT settled in outgoing", kamil?.settled === false);
  assert("A1 Kamil settlement metadata dropped", kamil?.payrollSettlement == null);
  assert("A1 no 1575 in CAS payload", !JSON.stringify(roster).includes("1575"));
  assert(
    "A1 Kamil ACK still pending",
    listUnresolvedSettlementCloudAcks().some((e) => e.empId === "kamil"),
  );
}

// ─── A2: pending ACK + unrelated hours edit of another employee ─────────────
{
  reset();
  const cloud = cloud15();
  const before = local15().map((e) => (e.id === "krzysztof" ? withSaturday(e, "17:00") : e));
  const after = before.map((e) =>
    e.id === "e12" ? { ...e, days: { ...e.days, Pn: day(true, "18:00") } } : e,
  );
  markKamilPending(before);
  const hoursIntents = [
    {
      employeeId: "e12",
      directoryId: "dir-e12",
      slot: "Pn",
      fromHours: slotHours(byId(cloud, "e12"), "Pn"),
      toHours: slotHours(byId(after, "e12"), "Pn"),
      weekFrom: WF,
      weekTo: WT,
    },
  ];

  const { roster } = applyPayrollFieldIntentsOntoCanonical(
    cloud,
    before,
    after,
    hoursIntents,
    WF,
    WT,
  );
  assert("A2 Kamil NOT settled", byId(roster, "kamil")?.settled === false);
  assert("A2 Kamil settlement null", byId(roster, "kamil")?.payrollSettlement == null);
  assert(
    "A2 unrelated hours edit applied",
    slotHours(byId(roster, "e12"), "Pn") > slotHours(byId(cloud, "e12"), "Pn"),
  );
}

// ─── A3: pending ACK + explicit Kamil re-settle ─────────────────────────────
{
  reset();
  const cloud = cloud15();
  const before = local15();
  const reAt = "2026-09-04T15:10:00.000Z";
  const after = before.map((e) => (e.id === "kamil" ? settledEmp(e, 1575, reAt) : e));
  markKamilPending(before);

  const { roster } = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  const kamil = byId(roster, "kamil");
  assert("A3 explicit re-settle applied", kamil?.settled === true);
  assert("A3 amount 1575 persisted", kamil?.payrollSettlement?.amount === 1575);
  assert("A3 fresh clock persisted", kamil?.settledUpdatedAt === reAt);
}

// ─── A4: pending ACK + GO3 buildSettlementRetryRosterBefore ─────────────────
{
  reset();
  const cloud = cloud15();
  const after = local15();
  markKamilPending(after);

  const retryBefore = buildSettlementRetryRosterBefore(after, WF, WT);
  assert(
    "A4 synthesized before is unsettled for Kamil",
    byId(retryBefore, "kamil")?.settled === false,
  );

  const { roster } = applyPayrollFieldIntentsOntoCanonical(
    cloud,
    retryBefore,
    after,
    [],
    WF,
    WT,
  );
  const kamil = byId(roster, "kamil");
  assert("A4 GO3 retry still lands", kamil?.settled === true);
  assert("A4 retry amount 1575", kamil?.payrollSettlement?.amount === 1575);
  assert("A4 retry clock", kamil?.settledUpdatedAt === KAMIL_AT);

  const rebased = rebasePayrollFieldIntents(cloud, retryBefore, after, [], WF, WT);
  assert("A4 rebase (409) retry still lands", byId(rebased, "kamil")?.settled === true);
}

// ─── A5: no ACK + before===after + LS ahead → GO8.1 unchanged ───────────────
{
  reset();
  const cloud = cloud15();
  const roster = local15();
  const { roster: out } = applyPayrollFieldIntentsOntoCanonical(
    cloud,
    roster,
    roster,
    [],
    WF,
    WT,
  );
  const kamil = byId(out, "kamil");
  assert("A5 GO8.1 retain without ACK", kamil?.settled === true);
  assert("A5 GO8.1 amount retained", kamil?.payrollSettlement?.amount === 1575);
}

// ─── A6: resolved ACK + unrelated write → no block ──────────────────────────
{
  reset();
  const cloud = cloud15();
  const before = local15();
  markKamilPending(before);
  markSettlementCloudSuccess(WF, WT);
  assert("A6 ledger resolved", listUnresolvedSettlementCloudAcks().length === 0);

  const dam = damianek();
  rememberPayrollPendingAdds([dam]);
  const { roster } = applyPayrollFieldIntentsOntoCanonical(
    cloud,
    before,
    [...before, dam],
    [],
    WF,
    WT,
  );
  assert("A6 GO8.1 not blocked after success", byId(roster, "kamil")?.settled === true);
  assert("A6 ADD still lands", !!byId(roster, "dam-new"));
}

// ─── A7: full production scenario ───────────────────────────────────────────
{
  reset();
  const cloud = cloud15();
  const before = local15(); // Krzysztof Saturday 16:00, Kamil settled 1575
  const dam = damianek();
  const after = [...before, dam];
  markKamilPending(before);
  rememberPayrollPendingAdds([dam]);

  const cloudSettledCount = cloud.filter((e) => e.settled === true).length;
  const localSettledCount = before.filter((e) => e.settled === true).length;
  assert("A7 fixture cloud 15 / 10 settled", cloud.length === 15 && cloudSettledCount === 10);
  assert("A7 fixture local 15 / 11 settled", before.length === 15 && localSettledCount === 11);
  assert(
    "A7 fixture Krzysztof local < cloud",
    slotHours(byId(before, "krzysztof"), "So") < slotHours(byId(cloud, "krzysztof"), "So"),
  );

  const { roster, mode } = rebuild(cloud, before, after, new Set());
  const kamil = byId(roster, "kamil");
  const krzysztof = byId(roster, "krzysztof");

  assert("A7 roster 15 → 16", roster.length === 16, String(roster.length));
  assert("A7 Damianek present", !!byId(roster, "dam-new"));
  assert("A7 Damianek settlement false/null", byId(roster, "dam-new")?.settled !== true
    && byId(roster, "dam-new")?.payrollSettlement == null);
  assert("A7 Kamil unsettled in outgoing", kamil?.settled === false);
  assert("A7 Kamil settlement null", kamil?.payrollSettlement == null);
  assert("A7 CAS payload has no Kamil settlement", !JSON.stringify(roster).includes("1575"));
  assert(
    "A7 Kamil ACK remains pending",
    listUnresolvedSettlementCloudAcks().some((e) => e.empId === "kamil" && e.status === "pending"),
  );
  assert(
    "A7 Krzysztof Saturday stays cloud value",
    slotHours(krzysztof, "So") === slotHours(byId(cloud, "krzysztof"), "So"),
  );
  assert(
    "A7 outgoing settled count = cloud 10",
    roster.filter((e) => e.settled === true).length === 10,
    String(roster.filter((e) => e.settled === true).length),
  );
  assert("A7 mode canonical_intent (ADD not fail-loud)", mode === "canonical_intent", mode);
  assert(
    "A7 Guard would not block — no unauthorized hours-down",
    listUnauthorizedHoursDownSlots(cloud, roster, [], WF, WT).length === 0,
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
