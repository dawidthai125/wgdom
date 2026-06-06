/**
 * Sprint 20.4C.1 — Dashboard KPI card
 * Uruchom: npx vite-node scripts/smoke-test-recoverable-charges-dashboard-20.4c1.mjs
 */
import {
  applySettlement,
  defaultRecoverableCharge,
  computeRecoverableChargesReportingStats,
  recoverableChargesDashboardCardStats,
  sumAgingAmountRemaining,
} from "../src/lib/recoverable-charges.ts";

const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

function charge(id, amount, createdAt, status = "open") {
  const c = defaultRecoverableCharge("Admin");
  c.id = id;
  c.amount = amount;
  c.createdAt = createdAt;
  c.updatedAt = createdAt;
  c.title = `Pozycja ${id}`;
  c.description = "Test";
  c.status = status;
  return c;
}

const NOW = new Date("2026-06-06T12:00:00.000Z");

log("=== Sprint 20.4C.1 — Dashboard KPI card smoke ===\n");

// Empty
const empty = recoverableChargesDashboardCardStats([], NOW);
assert("empty-is-empty", empty.isEmpty);
assert("empty-no-alarm", !empty.isAlarm);
assert("empty-oldest-null", empty.oldestUnsettledDays === null);

// 4 KPI — open + partial
const open = charge("o1", 5000, "2026-05-01T10:00:00.000Z");
const partial = applySettlement(
  charge("p1", 3000, "2026-04-01T10:00:00.000Z"),
  { amount: 1000, settledBy: "Dawid", settledAt: "2026-05-10T10:00:00.000Z" },
);
const settled = applySettlement(
  charge("s1", 800, "2026-01-01T10:00:00.000Z"),
  { amount: 800, settledBy: "Dawid", settledAt: "2026-02-01T10:00:00.000Z" },
);
const stats = recoverableChargesDashboardCardStats([open, partial, settled], NOW);
assert("to-recover", stats.toRecoverSum === 7000, String(stats.toRecoverSum));
assert("unsettled-count", stats.unsettledCount === 2, String(stats.unsettledCount));
assert("partial-count", stats.partialCount === 1, String(stats.partialCount));
assert("recovered", stats.recoveredSum === 1800, String(stats.recoveredSum));

// Oldest — open from 2026-04-01 partial remaining vs open 2026-05-01 → partial older (67 days from June 6)
assert("oldest-days", stats.oldestUnsettledDays === 66, String(stats.oldestUnsettledDays));

// Alarm — 5000 remaining (kwota); wiek partial 66 dni < 90
assert("alarm-high", stats.isAlarm);

// 66 dni bez dużej kwoty — brak alarmu (próg 90 dni od 20.4C.2B)
const midOnly = recoverableChargesDashboardCardStats(
  [charge("m1", 500, "2026-04-01T10:00:00.000Z")],
  NOW,
);
assert("no-alarm-66-days", !midOnly.isAlarm, String(midOnly.oldestUnsettledDays));

// No alarm — small recent
const small = recoverableChargesDashboardCardStats(
  [charge("n1", 500, "2026-06-01T10:00:00.000Z")],
  NOW,
);
assert("no-alarm-small", !small.isAlarm);
assert("small-oldest", small.oldestUnsettledDays === 5, String(small.oldestUnsettledDays));

// All settled → empty recovery state
const allSettled = recoverableChargesDashboardCardStats([settled], NOW);
assert("all-settled-empty", allSettled.isEmpty);

// Aging sum = Do odzyskania (20.4C.2A)
const reporting = computeRecoverableChargesReportingStats([open, partial, settled], NOW);
const agingSum = sumAgingAmountRemaining(reporting.aging);
assert("aging-sum-equals-toRecover", agingSum === stats.toRecoverSum, `${agingSum} vs ${stats.toRecoverSum}`);

const passCount = Object.values(results).filter((v) => v === "PASS").length;
log(`\n=== SUMMARY: ${passCount} PASS, ${Object.values(results).filter((v) => v === "FAIL").length} FAIL ===`);
if (Object.values(results).some((v) => v === "FAIL")) process.exit(1);
