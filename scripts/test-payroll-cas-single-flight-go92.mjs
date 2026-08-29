/**
 * GO9.2 — SINGLE-FLIGHT payroll CAS (sibling writers must not share expectedRevision).
 * Run: npx vite-node scripts/test-payroll-cas-single-flight-go92.mjs
 *
 * Local / mock only — no production writes.
 */
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

const {
  enqueueKwWeekEmployeesWrite,
  getKwWeekEmployeesWriteQueueState,
  cloudSyncMutationGuard,
} = await import("../src/lib/cloud-sync-mutation-guard.ts");
const {
  applySettlementFieldIntent,
  buildPayrollSettlement,
} = await import("../src/lib/payroll-settlement.ts");
const {
  clearSettlementCloudAckForTests,
  extractSettlementCloudIntents,
  finalizeSettlementCloudAckAfterPush,
  markSettlementCloudPending,
} = await import("../src/lib/payroll-settlement-cloud-ack.ts");
const {
  mayPersistPayrollRosterUnderWeekKeys,
  BLOCK_HISTORICAL_CLONE,
  BLOCK_TOMBSTONE_RECREATE,
} = await import("../src/lib/payroll-week-roster-binding.ts");
const { weekEmployeeMergeKey } = await import("../src/lib/payroll-week-employee-merge.ts");
const { getPayrollWeekRange } = await import("../src/lib/payroll-cycle.ts");
const { defaultDay } = await import("../src/app/app-domain.ts");
const {
  writePayrollWeekMetaToLs,
  normalizePayrollWeekMeta,
  getExpectedPayrollRevision,
} = await import("../src/lib/payroll-week-meta.ts");

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function resetAll() {
  cloudSyncMutationGuard.reset();
  cloudSyncMutationGuard.resetWriteChainForTests();
  clearSettlementCloudAckForTests();
  for (const k of Object.keys(lsStore)) delete lsStore[k];
}

const WF = "2026-08-24";
const WT = "2026-08-29";

function emp(partial = {}) {
  return {
    id: "e1",
    name: "Adam",
    rate: 30,
    days: {},
    settled: false,
    ...partial,
  };
}

function transferMeta(at, amount = 1874.88) {
  return buildPayrollSettlement({
    settledByUserId: "dawid",
    settledByName: "Dawid",
    paymentMethod: "transfer",
    amount,
    settledAt: at,
  });
}

function setRev(rev) {
  localStorage.setItem("kw-weekFrom", JSON.stringify(WF));
  localStorage.setItem("kw-weekTo", JSON.stringify(WT));
  writePayrollWeekMetaToLs(
    normalizePayrollWeekMeta(
      { rosterRevision: rev, weekFrom: WF, weekTo: WT, updatedAt: Date.now() },
      WF,
      WT,
    ),
  );
}

resetAll();

// ─── T2 CORE: sibling B must NOT start while A awaits ─────────────────────
{
  resetAll();
  setRev(104);
  const order = [];
  let releaseA;
  const gateA = new Promise((resolve) => {
    releaseA = resolve;
  });
  let aStarted = false;

  const a = enqueueKwWeekEmployeesWrite(async () => {
    aStarted = true;
    order.push("A-start");
    await gateA;
    order.push("A-finish");
    return "A";
  });

  for (let i = 0; i < 50 && !aStarted; i++) await sleep(5);
  assert("T2 A started", aStarted === true);
  assert("T2 depth during A", getKwWeekEmployeesWriteQueueState().depth === 1);

  const b = enqueueKwWeekEmployeesWrite(async () => {
    order.push("B-start");
    order.push(`B-rev:${getExpectedPayrollRevision()}`);
    order.push("B-finish");
    return "B";
  });

  await sleep(30);
  assert("T2 B NOT started while A awaits", !order.includes("B-start"));
  assert("T2 pending includes B waiter", getKwWeekEmployeesWriteQueueState().pending >= 1);

  setRev(105);
  releaseA();
  await Promise.all([a, b]);

  assert(
    "T2 order A then B",
    JSON.stringify(order) === JSON.stringify(["A-start", "A-finish", "B-start", "B-rev:105", "B-finish"]),
  );
  assert("T2 B saw fresh revision 105", order.includes("B-rev:105"));
  assert("T2 idle after", getKwWeekEmployeesWriteQueueState().depth === 0);
}

// ─── HAR REGRESSION: same expectedRevision cannot be used by overlapping writers ─
{
  resetAll();
  setRev(104);
  const snapshots = [];
  let releaseA;
  const gateA = new Promise((r) => {
    releaseA = r;
  });

  const a = enqueueKwWeekEmployeesWrite(async () => {
    const exp = getExpectedPayrollRevision();
    snapshots.push({ who: "A", exp, t: "start" });
    await gateA;
    setRev(105);
    snapshots.push({ who: "A", exp, t: "done" });
  });

  await sleep(10);
  const b = enqueueKwWeekEmployeesWrite(async () => {
    const exp = getExpectedPayrollRevision();
    snapshots.push({ who: "B", exp, t: "start" });
  });

  await sleep(20);
  assert("HAR B not started before A done", snapshots.filter((s) => s.who === "B").length === 0);
  releaseA();
  await Promise.all([a, b]);

  const aStart = snapshots.find((s) => s.who === "A" && s.t === "start");
  const bStart = snapshots.find((s) => s.who === "B" && s.t === "start");
  assert("HAR A expected 104", aStart?.exp === 104);
  assert("HAR B expected 105 (fresh after A)", bStart?.exp === 105);
  assert("HAR no shared expectedRevision on start", aStart.exp !== bStart.exp);
}

// ─── T9: bootstrap-style enqueue + domain enqueue — serial, fresh rev ───────
{
  resetAll();
  setRev(103);
  const log = [];
  let releaseBoot;
  const gateBoot = new Promise((r) => {
    releaseBoot = r;
  });

  const boot = enqueueKwWeekEmployeesWrite(async () => {
    log.push({ who: "boot", exp: getExpectedPayrollRevision() });
    await gateBoot;
    setRev(104);
  });

  await sleep(5);
  cloudSyncMutationGuard.reset();
  assert(
    "T9 reset preserves in-flight chain (depth stays)",
    getKwWeekEmployeesWriteQueueState().depth === 1,
  );

  const domain = enqueueKwWeekEmployeesWrite(async () => {
    log.push({ who: "domain", exp: getExpectedPayrollRevision() });
  });

  await sleep(15);
  assert("T9 domain waits for boot", log.length === 1 && log[0].who === "boot");
  releaseBoot();
  await Promise.all([boot, domain]);
  assert("T9 boot exp 103", log[0].exp === 103);
  assert("T9 domain exp 104", log[1]?.who === "domain" && log[1].exp === 104);
}

// ─── T1 / T5 / T8: settlement intent + GO4 (GO8.1 frozen) ───────────────────
{
  resetAll();
  const settleAt = "2026-08-29T19:59:15.325Z";
  const after = emp({
    id: "krzysztof",
    name: "Krzysztof",
    settled: true,
    settledUpdatedAt: settleAt,
    payrollSettlement: transferMeta(settleAt, 1874.88),
  });
  const cloud = emp({
    id: "krzysztof",
    name: "Krzysztof",
    settled: false,
  });
  const before = [after];
  const applied = applySettlementFieldIntent(cloud, before[0], after);
  assert("T1/T5 GO8.1 retain settlement", applied.settled === true && applied.payrollSettlement?.amount === 1874.88);

  clearSettlementCloudAckForTests();
  markSettlementCloudPending(
    extractSettlementCloudIntents(
      [emp({ id: "krzysztof", settled: false })],
      [after],
      WF,
      WT,
    ),
  );
  const ackOk = finalizeSettlementCloudAckAfterPush({
    weekFrom: WF,
    weekTo: WT,
    intentBefore: [emp({ id: "krzysztof", settled: false })],
    intentAfter: [after],
    outgoingRoster: [
      {
        ...cloud,
        settled: applied.settled,
        settledUpdatedAt: applied.settledUpdatedAt,
        payrollSettlement: applied.payrollSettlement,
      },
    ],
  });
  assert("T1 GO4 SUCCESS with settlement outgoing", ackOk.ok === true);

  clearSettlementCloudAckForTests();
  markSettlementCloudPending(
    extractSettlementCloudIntents(
      [emp({ id: "krzysztof", settled: false })],
      [after],
      WF,
      WT,
    ),
  );
  const ackFail = finalizeSettlementCloudAckAfterPush({
    weekFrom: WF,
    weekTo: WT,
    intentBefore: [emp({ id: "krzysztof", settled: false })],
    intentAfter: [after],
    outgoingRoster: [emp({ id: "krzysztof", settled: false })],
  });
  assert("T8 GO4 FAIL without settlement outgoing", ackFail.ok === false);
}

// ─── T6: Cloud already settled — do not overwrite ───────────────────────────
{
  const cloud = emp({
    settled: true,
    settledUpdatedAt: "2026-08-29T20:00:00.000Z",
    payrollSettlement: transferMeta("2026-08-29T20:00:00.000Z", 2000),
  });
  const local = emp({
    settled: true,
    settledUpdatedAt: "2026-08-29T18:00:00.000Z",
    payrollSettlement: transferMeta("2026-08-29T18:00:00.000Z", 1874.88),
  });
  const applied = applySettlementFieldIntent(cloud, local, local);
  assert(
    "T6 keep Cloud settlement",
    applied.settledUpdatedAt === cloud.settledUpdatedAt && applied.payrollSettlement?.amount === 2000,
  );
}

// ─── T3: settle queued after pending edit — serial + settlement ─────────────
{
  resetAll();
  setRev(104);
  const events = [];
  let releaseEdit;
  const gateEdit = new Promise((r) => {
    releaseEdit = r;
  });

  const edit = enqueueKwWeekEmployeesWrite(async () => {
    events.push({ who: "edit", exp: getExpectedPayrollRevision(), settled: false });
    await gateEdit;
    setRev(105);
  });

  await sleep(5);
  const settle = enqueueKwWeekEmployeesWrite(async () => {
    const exp = getExpectedPayrollRevision();
    const cloud = emp({ settled: false });
    const after = emp({
      settled: true,
      settledUpdatedAt: "2026-08-29T19:59:15.325Z",
      payrollSettlement: transferMeta("2026-08-29T19:59:15.325Z", 1874.88),
    });
    const applied = applySettlementFieldIntent(cloud, after, after);
    events.push({
      who: "settle",
      exp,
      settled: applied.settled === true,
      amount: applied.payrollSettlement?.amount,
    });
  });

  await sleep(15);
  assert("T3 settle waits for edit", events.length === 1);
  releaseEdit();
  await Promise.all([edit, settle]);
  assert("T3 settle uses rev 105", events[1]?.exp === 105);
  assert("T3 settle keeps intent", events[1]?.settled === true && events[1]?.amount === 1874.88);
}

// ─── T4: external 409 path — rebase preserves settlement (unit-level) ───────
{
  const cloudUnsettled = emp({ settled: false, name: "Cloud" });
  const before = [emp({ settled: false })];
  const after = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-08-29T19:59:15.325Z",
      payrollSettlement: transferMeta("2026-08-29T19:59:15.325Z", 1874.88),
    }),
  ];
  const applied = applySettlementFieldIntent(cloudUnsettled, before[0], after[0]);
  assert("T4 rebase retains settlement on unsettled cloud", applied.settled === true);
  assert("T4 amount 1874.88", applied.payrollSettlement?.amount === 1874.88);
}

// ─── T7: GO6.1 fence regression (smoke) ─────────────────────────────────────
{
  const fenceWeek = getPayrollWeekRange(new Date("2026-08-24T10:00:00"));
  const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
  const makeFenceEmp = (id, withHours = true, extras = {}) => ({
    id,
    directoryId: `dir-${id}`,
    name: `Worker ${id}`,
    rate: "50",
    days: Object.fromEntries(
      DAYS.map((k) => [
        k,
        k === "So" || !withHours
          ? defaultDay()
          : { ...defaultDay(), active: true, from: "07:00", to: "16:00" },
      ]),
    ),
    settled: false,
    ...extras,
  });
  const gate = (roster, archive, cloudRoster, tombs) =>
    mayPersistPayrollRosterUnderWeekKeys({
      weekFrom: fenceWeek.from,
      weekTo: fenceWeek.to,
      roster,
      archive,
      currentFrom: fenceWeek.from,
      currentTo: fenceWeek.to,
      cloudRoster,
      tombstonedMergeKeys: tombs,
    });

  const live = [makeFenceEmp("k", true, { name: "Krzysztof", directoryId: "dir-k" })];
  const cloud = [makeFenceEmp("k", true, { name: "Krzysztof", directoryId: "dir-k" })];
  assert("T7 legal membership ALLOW", gate(live, [], cloud).allow === true);

  const hist = Array.from({ length: 4 }, (_, i) => makeFenceEmp(`c-${i}`, true));
  const gClone = gate(
    hist.map((e) => ({ ...e })),
    [{ weekFrom: "2026-07-13", weekTo: "2026-07-18", weekEmployees: hist }],
    [makeFenceEmp("other", true)],
  );
  assert("T7 historical clone BLOCK", gClone.allow === false && gClone.reason === BLOCK_HISTORICAL_CLONE);

  const tombLive = [makeFenceEmp("tomb", true)];
  const gTomb = gate(tombLive, [], [], new Set([weekEmployeeMergeKey(tombLive[0])]));
  assert("T7 tombstone BLOCK", gTomb.allow === false && gTomb.reason === BLOCK_TOMBSTONE_RECREATE);
}

// ─── active writers <= 1 invariant under burst ──────────────────────────────
{
  resetAll();
  let maxDepth = 0;
  const jobs = [];
  for (let i = 0; i < 5; i++) {
    jobs.push(
      enqueueKwWeekEmployeesWrite(async () => {
        maxDepth = Math.max(maxDepth, getKwWeekEmployeesWriteQueueState().depth);
        await sleep(20);
      }),
    );
  }
  await Promise.all(jobs);
  assert("activePayrollCasWriters <= 1", maxDepth === 1);
}

console.log(`\nGO9.2 single-flight: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
