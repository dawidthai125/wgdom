/**
 * PAYROLL GO3 — settlement local→cloud ack + debounce/flush fail-loud.
 * Run: npx vite-node scripts/test-payroll-settlement-cloud-ack.mjs
 *
 * Matrix A–L (local/mock only — no production writes).
 */
import { applyWriteTimestamps } from "../src/app/app-domain.ts";
import {
  bindPayrollDomainPushHandler,
  cancelPayrollDomainPush,
  cancelPayrollDomainPushPreservingSettlement,
  flushPayrollDomainPush,
  flushPayrollDomainPushOnBackground,
  hasPendingPayrollDomainPush,
  schedulePayrollDomainPush,
  unbindPayrollDomainPushHandler,
  __testPeekPayrollDomainPushPending,
  PAYROLL_DOMAIN_PUSH_DEBOUNCE_MS,
} from "../src/lib/payroll-domain-sync.ts";
import {
  buildSettlementRetryRosterBefore,
  clearSettlementCloudAckForTests,
  extractSettlementCloudIntents,
  hasUnresolvedSettlementCloudAck,
  listSettlementCloudAck,
  listUnresolvedSettlementCloudAcks,
  markSettlementCloudFailure,
  markSettlementCloudPending,
  markSettlementCloudPushAttempt,
  markSettlementCloudSuccess,
  rosterHasSettlementFieldChange,
  settlementCloudAckSummary,
} from "../src/lib/payroll-settlement-cloud-ack.ts";
import {
  applySettlementFieldIntent,
  buildPayrollSettlement,
} from "../src/lib/payroll-settlement.ts";
import {
  pickPayrollSettledByTimestamps,
  mergeWeekEmployeeRecord,
} from "../src/lib/payroll-week-employee-record-merge.ts";
import {
  publishBootstrapPayrollHandoff,
  signalBootstrapPayrollLateRehydrate,
  subscribeBootstrapPayrollLateRehydrate,
  clearBootstrapPayrollHandoffForTests,
} from "../src/lib/cloud-bootstrap.ts";

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

function emp(partial) {
  return {
    id: "e1",
    name: "Adam",
    rate: 30,
    days: {},
    settled: false,
    ...partial,
  };
}

function meta(at = "2026-08-28T22:45:00.000Z") {
  return buildPayrollSettlement({
    settledByUserId: "dawid",
    settledByName: "Dawid",
    paymentMethod: "cash",
    amount: 100,
    settledAt: at,
  });
}

clearSettlementCloudAckForTests();
cancelPayrollDomainPush();
unbindPayrollDomainPushHandler();

// --- A: settlement success path (ledger pending → attempt → success) ---
{
  clearSettlementCloudAckForTests();
  const before = [emp({ settled: false })];
  const after = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-08-28T22:45:00.000Z",
      payrollSettlement: meta(),
    }),
  ];
  assert("A rosterHasSettlementFieldChange", rosterHasSettlementFieldChange(before, after));
  const intents = extractSettlementCloudIntents(before, after, "2026-08-24", "2026-08-29");
  markSettlementCloudPending(intents);
  assert("A pending registered", hasUnresolvedSettlementCloudAck());
  markSettlementCloudPushAttempt("2026-08-24", "2026-08-29");
  assert("A attempts bumped", listUnresolvedSettlementCloudAcks()[0].attempts === 1);
  markSettlementCloudSuccess("2026-08-24", "2026-08-29");
  assert("A success clears unresolved", !hasUnresolvedSettlementCloudAck());
  assert("A success summary unresolved=0", settlementCloudAckSummary().unresolved === 0);
}

// --- B: network failure → failure state + retry possible ---
{
  clearSettlementCloudAckForTests();
  const before = [emp({ settled: false })];
  const after = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-08-28T22:45:00.000Z",
      payrollSettlement: meta(),
    }),
  ];
  markSettlementCloudPending(extractSettlementCloudIntents(before, after, "W1", "W2"));
  markSettlementCloudPushAttempt("W1", "W2");
  markSettlementCloudFailure("W1", "W2", "network_failure");
  const u = listUnresolvedSettlementCloudAcks()[0];
  assert("B status=failure", u?.status === "failure");
  assert("B lastError set", u?.lastError === "network_failure");
  assert("B retryable", hasUnresolvedSettlementCloudAck());
  const retryBefore = buildSettlementRetryRosterBefore(after, "W1", "W2");
  assert("B retry before unsettled", retryBefore[0].settled === false);
  assert("B retry after still settled", after[0].settled === true);
  const again = applySettlementFieldIntent(retryBefore[0], retryBefore[0], after[0]);
  assert("B retry intent applies settled", again.settled === true && again.changed === true);
}

// --- C: CAS 409 class → failure, no silent success ---
{
  clearSettlementCloudAckForTests();
  markSettlementCloudPending(
    extractSettlementCloudIntents(
      [emp({ settled: false })],
      [emp({ settled: true, settledUpdatedAt: "t1", payrollSettlement: meta() })],
      "W1",
      "W2",
    ),
  );
  markSettlementCloudFailure("W1", "W2", "PayrollStaleRevisionError");
  assert("C failure not success", listUnresolvedSettlementCloudAcks()[0].status === "failure");
  assert("C not treated as cloud ok", settlementCloudAckSummary().success === 0);
}

// --- D: guard rejection → failure ---
{
  clearSettlementCloudAckForTests();
  markSettlementCloudPending(
    extractSettlementCloudIntents(
      [emp({ settled: false })],
      [emp({ settled: true, settledUpdatedAt: "t1", payrollSettlement: meta() })],
      "W1",
      "W2",
    ),
  );
  markSettlementCloudFailure("W1", "W2", "PAYROLL_GUARD_BLOCKED");
  assert("D guard → failure", listUnresolvedSettlementCloudAcks()[0].status === "failure");
}

// --- E: debounce cancel vs preserve settlement / background flush ---
{
  clearSettlementCloudAckForTests();
  let flushed = 0;
  let lastOpts = null;
  bindPayrollDomainPushHandler((_roster, options) => {
    flushed += 1;
    lastOpts = options;
  });
  const before = [emp({ settled: false })];
  const after = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-08-28T22:45:00.000Z",
      payrollSettlement: meta(),
    }),
  ];
  markSettlementCloudPending(extractSettlementCloudIntents(before, after, "W1", "W2"));
  schedulePayrollDomainPush(after, { settlementCloudAck: true }, before);
  assert("E pending after schedule", hasPendingPayrollDomainPush());
  assert("E peek settlement ack", __testPeekPayrollDomainPushPending().settlementCloudAck === true);

  // Legacy cancel would drop — preservingSettlement must flush instead
  cancelPayrollDomainPushPreservingSettlement();
  assert("E preserve flushes", flushed === 1);
  assert("E options kept settlementCloudAck", lastOpts?.settlementCloudAck === true);
  assert("E no pending after flush", !hasPendingPayrollDomainPush());

  // Re-schedule + background flush (pagehide)
  schedulePayrollDomainPush(after, { settlementCloudAck: true }, before);
  assert("E2 pending again", hasPendingPayrollDomainPush());
  const didFlush = flushPayrollDomainPushOnBackground();
  assert("E2 background flush true", didFlush === true);
  assert("E2 flushed count", flushed === 2);

  // Non-settlement cancel still drops without flush
  schedulePayrollDomainPush(after, undefined, before);
  cancelPayrollDomainPushPreservingSettlement();
  assert("E3 non-settlement cancel drops", !hasPendingPayrollDomainPush());
  assert("E3 no extra flush", flushed === 2);

  // Plain cancel after settlement schedule → detectable pending ack remains
  schedulePayrollDomainPush(after, { settlementCloudAck: true }, before);
  cancelPayrollDomainPush(); // simulate old bug path
  assert("E4 cancel drops timer", !hasPendingPayrollDomainPush());
  assert("E4 ack still unresolved (detectable)", hasUnresolvedSettlementCloudAck());

  unbindPayrollDomainPushHandler();
}

// --- F: retry success after failure ---
{
  clearSettlementCloudAckForTests();
  const before = [emp({ settled: false })];
  const after = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-08-28T22:45:00.000Z",
      payrollSettlement: meta(),
    }),
  ];
  markSettlementCloudPending(extractSettlementCloudIntents(before, after, "W1", "W2"));
  markSettlementCloudFailure("W1", "W2", "network");
  markSettlementCloudPushAttempt("W1", "W2");
  const cloud = emp({ settled: false });
  const retryBefore = buildSettlementRetryRosterBefore(after, "W1", "W2");
  const applied = applySettlementFieldIntent(cloud, retryBefore[0], after[0]);
  assert("F retry applies to cloud false", applied.settled === true);
  assert("F atomic meta", !!applied.payrollSettlement && applied.settledUpdatedAt === after[0].settledUpdatedAt);
  markSettlementCloudSuccess("W1", "W2");
  assert("F success clears", !hasUnresolvedSettlementCloudAck());
}

// --- G: idempotent retry twice ---
{
  clearSettlementCloudAckForTests();
  const cloud = emp({
    settled: true,
    settledUpdatedAt: "2026-08-28T22:45:00.000Z",
    payrollSettlement: meta(),
  });
  const after = { ...cloud };
  const before = emp({ settled: false });
  // First intent already applied on cloud — baseline mismatch → keep cloud (no corruption)
  const r1 = applySettlementFieldIntent(cloud, before, after);
  assert("G1 stale baseline keeps cloud settled", r1.settled === true);
  const r2 = applySettlementFieldIntent(cloud, before, after);
  assert("G2 second retry still settled", r2.settled === true);
  assert(
    "G3 meta stable",
    JSON.stringify(r1.payrollSettlement) === JSON.stringify(r2.payrollSettlement),
  );
}

// --- H: conscious unsettle ---
{
  const cloud = emp({
    settled: true,
    settledUpdatedAt: "2026-08-28T20:00:00.000Z",
    payrollSettlement: meta("2026-08-28T20:00:00.000Z"),
    dataUpdatedAt: "2026-08-28T18:00:00.000Z",
  });
  const before = { ...cloud };
  const after = {
    ...cloud,
    settled: false,
    settledUpdatedAt: "2026-08-28T22:50:00.000Z",
  };
  const applied = applySettlementFieldIntent(cloud, before, after);
  assert("H unsettle applies", applied.settled === false);
  assert("H newer sAt", applied.settledUpdatedAt === "2026-08-28T22:50:00.000Z");
  // LWW pick: local false with newer sAt wins
  const picked = pickPayrollSettledByTimestamps(after, cloud);
  assert("H LWW local false wins", picked === false);
}

// --- I: spurious protection (sAt≈dAt local false must NOT erase cloud true) ---
{
  const local = emp({
    settled: false,
    settledUpdatedAt: "2026-08-28T22:00:00.000Z",
    dataUpdatedAt: "2026-08-28T22:00:00.000Z",
  });
  const cloud = emp({
    settled: true,
    settledUpdatedAt: "2026-08-27T10:00:00.000Z",
    payrollSettlement: meta("2026-08-27T10:00:00.000Z"),
    dataUpdatedAt: "2026-08-27T09:00:00.000Z",
  });
  const picked = pickPayrollSettledByTimestamps(local, cloud);
  assert("I spurious keeps cloud true", picked === true);
  const merged = mergeWeekEmployeeRecord(local, cloud);
  assert("I merge keeps settled", merged.settled === true);
}

// --- J: TIMEOUT late rehydrate still works ---
{
  clearBootstrapPayrollHandoffForTests();
  let fired = 0;
  const unsub = subscribeBootstrapPayrollLateRehydrate(() => {
    fired += 1;
  });
  const handoff = {
    weekEmployees: [emp({ settled: true, settledUpdatedAt: "t" })],
    weekFrom: "2026-08-24",
    weekTo: "2026-08-29",
  };
  publishBootstrapPayrollHandoff(handoff);
  signalBootstrapPayrollLateRehydrate(handoff);
  assert("J late rehydrate signaled", fired === 1);
  unsub();
  clearBootstrapPayrollHandoffForTests();
}

// --- K: settlement-only write timestamps ---
{
  const prev = [
    emp({
      settled: false,
      dataUpdatedAt: "2026-08-28T10:00:00.000Z",
      rate: 30,
    }),
  ];
  const next = [
    emp({
      settled: true,
      settledUpdatedAt: "PLACEHOLDER",
      payrollSettlement: meta(),
      dataUpdatedAt: "2026-08-28T10:00:00.000Z",
      rate: 30,
    }),
  ];
  const stamped = applyWriteTimestamps("kw-week-employees", prev, next);
  const row = stamped[0];
  assert("K settled true", row.settled === true);
  assert("K sAt bumped", typeof row.settledUpdatedAt === "string" && row.settledUpdatedAt.length > 10);
  assert("K dAt unchanged", row.dataUpdatedAt === "2026-08-28T10:00:00.000Z");
}

// --- L: settlement + data write may bump dataUpdatedAt ---
{
  const prev = [
    emp({
      settled: false,
      dataUpdatedAt: "2026-08-28T10:00:00.000Z",
      days: { Pn: { active: true, from: "07:00", to: "15:00" } },
    }),
  ];
  const next = [
    emp({
      settled: true,
      settledUpdatedAt: "PLACEHOLDER",
      payrollSettlement: meta(),
      dataUpdatedAt: "2026-08-28T10:00:00.000Z",
      days: { Pn: { active: true, from: "07:00", to: "16:00" } },
    }),
  ];
  const stamped = applyWriteTimestamps("kw-week-employees", prev, next);
  const row = stamped[0];
  assert("L sAt present", !!row.settledUpdatedAt);
  assert("L dAt bumped", row.dataUpdatedAt !== "2026-08-28T10:00:00.000Z");
}

// Sticky settlementCloudAck across debounce merges
{
  let flushedOpts = null;
  bindPayrollDomainPushHandler((_r, options) => {
    flushedOpts = options;
  });
  schedulePayrollDomainPush([emp()], { settlementCloudAck: true });
  schedulePayrollDomainPush([emp({ rate: 40 })], { hoursIntents: [] });
  flushPayrollDomainPush();
  assert("sticky settlementCloudAck across merge", flushedOpts?.settlementCloudAck === true);
  unbindPayrollDomainPushHandler();
}

// Debounce eventually flushes (A success path timing)
{
  let n = 0;
  bindPayrollDomainPushHandler(() => {
    n += 1;
  });
  schedulePayrollDomainPush([emp({ settled: true, settledUpdatedAt: "t" })], {
    settlementCloudAck: true,
  });
  await sleep(PAYROLL_DOMAIN_PUSH_DEBOUNCE_MS + 50);
  assert("debounce auto-flush", n === 1);
  unbindPayrollDomainPushHandler();
}

clearSettlementCloudAckForTests();

console.log(`\nGO3 settlement cloud ack: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
