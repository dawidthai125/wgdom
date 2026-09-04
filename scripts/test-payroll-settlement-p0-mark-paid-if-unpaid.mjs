/**
 * P0 SETTLEMENT SAFETY — markPaidIfUnpaid / ALREADY_SETTLED / idempotency.
 * Run: npx vite-node scripts/test-payroll-settlement-p0-mark-paid-if-unpaid.mjs
 */
import {
  PAYROLL_ALREADY_SETTLED_CODE,
  applySettlementMarkPaidIfUnpaidGuard,
  createSettlementIdempotencyKey,
  isUsableSettlementIdempotencyKey,
  parseSettlementIdempotencyRecord,
  settlementIdempotencyKvKey,
} from "../src/lib/payroll-settlement-mark-paid-if-unpaid.ts";
import {
  clearSettlementCloudAckForTests,
  markSettlementCloudPending,
  markSettlementCloudAlreadySettled,
  resolveSettlementIdempotencyKeysForTargets,
  listUnresolvedSettlementCloudAcks,
  hasUnresolvedSettlementCloudAck,
} from "../src/lib/payroll-settlement-cloud-ack.ts";
import { applySettlementFieldIntent } from "../src/lib/payroll-settlement.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log(`PASS ${name}`);
  } else {
    fail += 1;
    console.log(`FAIL ${name}`);
  }
}

function emp(over = {}) {
  return {
    id: "e1",
    directoryId: "dir-1",
    name: "Stanislaw",
    settled: false,
    rate: "28",
    days: {},
    ...over,
  };
}

function meta(at, amount = 1000) {
  return {
    settledAt: at,
    settledByUserId: "admin-a",
    settledByName: "Admin A",
    paymentMethod: "cash",
    amount,
  };
}

clearSettlementCloudAckForTests();

// ─── T1: single UNSETTLED → SETTLED ─────────────────────────────────────────
{
  const prev = [emp()];
  const next = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-09-04T22:00:00.000Z",
      payrollSettlement: meta("2026-09-04T22:00:00.000Z"),
    }),
  ];
  const r = applySettlementMarkPaidIfUnpaidGuard(prev, next, {
    settlementIntent: true,
    settlementTargetEmpIds: ["e1"],
  });
  assert("T1 action allow", r.action === "allow");
  assert("T1 firstSettleCount 1", r.firstSettleCount === 1);
  assert("T1 settled true", r.roster[0].settled === true);
}

// ─── T2: second settlement → ALREADY_SETTLED ────────────────────────────────
{
  const prev = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-09-04T22:00:00.000Z",
      payrollSettlement: meta("2026-09-04T22:00:00.000Z", 1000),
    }),
  ];
  const next = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-09-04T22:05:00.000Z",
      payrollSettlement: meta("2026-09-04T22:05:00.000Z", 999),
    }),
  ];
  const r = applySettlementMarkPaidIfUnpaidGuard(prev, next, {
    settlementIntent: true,
    settlementTargetEmpIds: ["e1"],
  });
  assert("T2 already_settled", r.action === "already_settled");
  assert("T2 keep amount 1000", r.roster[0].payrollSettlement?.amount === 1000);
  assert("T2 keep clock", r.roster[0].settledUpdatedAt === "2026-09-04T22:00:00.000Z");
  assert("T2 code constant", PAYROLL_ALREADY_SETTLED_CODE === "payroll_already_settled");
}

// ─── T3: concurrent A+B (sequential guard) — one allow one already ──────────
{
  const unsettled = [emp()];
  const aNext = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-09-04T22:00:00.000Z",
      payrollSettlement: meta("2026-09-04T22:00:00.000Z", 1000),
    }),
  ];
  const a = applySettlementMarkPaidIfUnpaidGuard(unsettled, aNext, {
    settlementIntent: true,
    settlementTargetEmpIds: ["e1"],
  });
  assert("T3 A SUCCESS", a.action === "allow" && a.firstSettleCount === 1);

  const cloudAfterA = a.roster;
  const bNext = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-09-04T22:01:00.000Z",
      payrollSettlement: meta("2026-09-04T22:01:00.000Z", 1000),
    }),
  ];
  const b = applySettlementMarkPaidIfUnpaidGuard(cloudAfterA, bNext, {
    settlementIntent: true,
    settlementTargetEmpIds: ["e1"],
  });
  assert("T3 B ALREADY_SETTLED", b.action === "already_settled");
}

// ─── T4: same idempotency key usable / parse ────────────────────────────────
{
  const k1 = createSettlementIdempotencyKey();
  const k2 = createSettlementIdempotencyKey();
  assert("T4 keys usable", isUsableSettlementIdempotencyKey(k1) && isUsableSettlementIdempotencyKey(k2));
  assert("T4 keys distinct", k1 !== k2);
  assert("T4 kv prefix", settlementIdempotencyKvKey(k1).startsWith("kw-payroll-settlement-idem:"));
  const rec = parseSettlementIdempotencyRecord({
    result: "success",
    empId: "e1",
    createdAt: Date.now(),
    serverRevision: 10,
  });
  assert("T4 parse success", rec?.result === "success" && rec.serverRevision === 10);
  const stale = parseSettlementIdempotencyRecord({
    result: "success",
    createdAt: Date.now() - 8 * 24 * 60 * 60 * 1000,
  });
  assert("T4 expired null", stale === null);
}

// ─── T5: different keys — second against settled → already ──────────────────
{
  const prev = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-09-04T22:00:00.000Z",
      payrollSettlement: meta("2026-09-04T22:00:00.000Z"),
    }),
  ];
  const next = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-09-04T23:00:00.000Z",
      payrollSettlement: meta("2026-09-04T23:00:00.000Z", 50),
    }),
  ];
  const r = applySettlementMarkPaidIfUnpaidGuard(prev, next, {
    settlementIntent: true,
    settlementTargetEmpIds: ["e1"],
  });
  assert("T5 different key still ALREADY", r.action === "already_settled");
}

// ─── T6: old client silent keep-prev (no intent) ────────────────────────────
{
  const prev = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-09-04T22:00:00.000Z",
      payrollSettlement: meta("2026-09-04T22:00:00.000Z", 1000),
    }),
  ];
  const next = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-09-04T23:00:00.000Z",
      payrollSettlement: meta("2026-09-04T23:00:00.000Z", 50),
    }),
  ];
  const r = applySettlementMarkPaidIfUnpaidGuard(prev, next, {
    settlementIntent: false,
  });
  assert("T6 old client allow (silent)", r.action === "allow");
  assert("T6 old client keep meta", r.roster[0].payrollSettlement?.amount === 1000);
  assert("T6 preserved count", r.preservedAlreadySettledCount === 1);
}

// ─── T7: ACK idempotency key reuse ──────────────────────────────────────────
{
  clearSettlementCloudAckForTests();
  const key = createSettlementIdempotencyKey();
  markSettlementCloudPending([
    {
      empId: "e1",
      settled: true,
      settledUpdatedAt: "2026-09-04T22:00:00.000Z",
      beforeSettled: false,
      weekFrom: "2026-08-31",
      weekTo: "2026-09-05",
      settlementIdempotencyKey: key,
    },
  ]);
  const again = resolveSettlementIdempotencyKeysForTargets(
    ["e1"],
    "2026-08-31",
    "2026-09-05",
    () => "SHOULD-NOT-CREATE",
  );
  assert("T7 reuse same key", again.key === key);
}

// ─── T8: already-settled marks ACK terminal failure ─────────────────────────
{
  clearSettlementCloudAckForTests();
  markSettlementCloudPending([
    {
      empId: "e1",
      settled: true,
      settledUpdatedAt: "2026-09-04T22:00:00.000Z",
      beforeSettled: false,
      weekFrom: "W1",
      weekTo: "W2",
      settlementIdempotencyKey: createSettlementIdempotencyKey(),
    },
  ]);
  markSettlementCloudAlreadySettled("W1", "W2");
  const u = listUnresolvedSettlementCloudAcks();
  assert("T8 failure status", u[0]?.status === "failure" && u[0]?.lastError === "already_settled");
  assert("T8 still unresolved until cleared", hasUnresolvedSettlementCloudAck() === true);
}

// ─── T9: hours adjacent — already settled preserved; unsettled settle ok ────
{
  const prev = [
    emp({
      id: "paid",
      settled: true,
      settledUpdatedAt: "2026-09-04T20:00:00.000Z",
      payrollSettlement: meta("2026-09-04T20:00:00.000Z", 800),
    }),
    emp({ id: "open", directoryId: "dir-2", name: "Open", settled: false }),
  ];
  const next = [
    emp({
      id: "paid",
      settled: true,
      settledUpdatedAt: "2026-09-04T23:00:00.000Z",
      payrollSettlement: meta("2026-09-04T23:00:00.000Z", 1),
      days: { Pt: { active: true, from: "07:00", to: "16:00", updatedAt: "2026-09-04T23:00:00.000Z" } },
    }),
    emp({
      id: "open",
      directoryId: "dir-2",
      name: "Open",
      settled: true,
      settledUpdatedAt: "2026-09-04T23:00:00.000Z",
      payrollSettlement: meta("2026-09-04T23:00:00.000Z", 500),
    }),
  ];
  const r = applySettlementMarkPaidIfUnpaidGuard(prev, next, {
    settlementIntent: true,
    settlementTargetEmpIds: ["open"],
  });
  assert("T9 allow (only open settle)", r.action === "allow");
  assert("T9 paid meta preserved", r.roster.find((e) => e.id === "paid")?.payrollSettlement?.amount === 800);
  assert("T9 open settled", r.roster.find((e) => e.id === "open")?.settled === true);
  assert("T9 firstSettle 1", r.firstSettleCount === 1);
}

// ─── T10: field-intent still keeps cloud when already settled ───────────────
{
  const cloud = emp({
    settled: true,
    settledUpdatedAt: "2026-09-04T22:00:00.000Z",
    payrollSettlement: meta("2026-09-04T22:00:00.000Z", 1000),
  });
  const before = emp({ settled: false });
  const after = emp({
    settled: true,
    settledUpdatedAt: "2026-09-04T23:00:00.000Z",
    payrollSettlement: meta("2026-09-04T23:00:00.000Z", 50),
  });
  const applied = applySettlementFieldIntent(cloud, before, after);
  assert("T10 field-intent keep cloud", applied.settled === true && applied.payrollSettlement?.amount === 1000);
}

// Unsettle out of P0 — guard does not block true→false
{
  const prev = [
    emp({
      settled: true,
      settledUpdatedAt: "2026-09-04T22:00:00.000Z",
      payrollSettlement: meta("2026-09-04T22:00:00.000Z"),
    }),
  ];
  const next = [emp({ settled: false, settledUpdatedAt: "2026-09-04T23:00:00.000Z" })];
  const r = applySettlementMarkPaidIfUnpaidGuard(prev, next, { settlementIntent: false });
  assert("unsettle path allow", r.action === "allow" && r.roster[0].settled === false);
}

clearSettlementCloudAckForTests();
console.log(`\nP0 markPaidIfUnpaid: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
