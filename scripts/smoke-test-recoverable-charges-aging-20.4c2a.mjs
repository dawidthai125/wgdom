/**
 * Sprint 20.4C.2A — Aging recoverable charges
 * Uruchom: npx vite-node scripts/smoke-test-recoverable-charges-aging-20.4c2a.mjs
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

log("=== Sprint 20.4C.2A — Aging smoke ===\n");

// A — 0–30 dni (10 days ago)
const bucket0_30 = charge("a1", 2100, "2026-05-27T10:00:00.000Z");
// B — 31–60 dni (45 days ago)
const bucket31_60 = charge("b1", 1800, "2026-04-22T10:00:00.000Z");
// C — 61–90 dni (75 days ago)
const bucket61_90 = charge("c1", 900, "2026-03-23T10:00:00.000Z");
// D — 90+ dni (120 days ago)
const bucket90_plus = charge("d1", 4200, "2026-02-07T10:00:00.000Z");
// F — settled excluded (very old but fully settled)
const settled = applySettlement(
  charge("s1", 5000, "2025-01-01T10:00:00.000Z"),
  { amount: 5000, settledBy: "Dawid", settledAt: "2026-01-01T10:00:00.000Z" },
);

const charges = [bucket0_30, bucket31_60, bucket61_90, bucket90_plus, settled];
const stats = computeRecoverableChargesReportingStats(charges, NOW);
const dashboard = recoverableChargesDashboardCardStats(charges, NOW);

const byKey = Object.fromEntries(stats.aging.map((b) => [b.key, b]));

assert("A-0-30-count", byKey["0_30"].count === 1, String(byKey["0_30"].count));
assert("A-0-30-sum", byKey["0_30"].amountRemainingSum === 2100, String(byKey["0_30"].amountRemainingSum));

assert("B-31-60-count", byKey["31_60"].count === 1, String(byKey["31_60"].count));
assert("B-31-60-sum", byKey["31_60"].amountRemainingSum === 1800, String(byKey["31_60"].amountRemainingSum));

assert("C-61-90-count", byKey["61_90"].count === 1, String(byKey["61_90"].count));
assert("C-61-90-sum", byKey["61_90"].amountRemainingSum === 900, String(byKey["61_90"].amountRemainingSum));

assert("D-90-plus-count", byKey["90_plus"].count === 1, String(byKey["90_plus"].count));
assert("D-90-plus-sum", byKey["90_plus"].amountRemainingSum === 4200, String(byKey["90_plus"].amountRemainingSum));

const agingTotal = sumAgingAmountRemaining(stats.aging);
const expectedTotal = 2100 + 1800 + 900 + 4200;
assert("E-aging-sum", agingTotal === expectedTotal, `${agingTotal} vs ${expectedTotal}`);
assert("E-aging-equals-toRecover", agingTotal === stats.toRecoverSum, `${agingTotal} vs ${stats.toRecoverSum}`);
assert("E-dashboard-toRecover", dashboard.toRecoverSum === stats.toRecoverSum, `${dashboard.toRecoverSum} vs ${stats.toRecoverSum}`);
assert("E-dashboard-aging-match", agingTotal === dashboard.toRecoverSum, `${agingTotal} vs ${dashboard.toRecoverSum}`);

assert("F-settled-excluded", stats.unsettledCount === 4, String(stats.unsettledCount));
assert("F-settled-not-in-buckets", agingTotal === expectedTotal);

// Partial in bucket — remaining only
const partial = applySettlement(
  charge("p1", 1000, "2026-05-27T10:00:00.000Z"),
  { amount: 400, settledBy: "Dawid", settledAt: "2026-05-28T10:00:00.000Z" },
);
const partialStats = computeRecoverableChargesReportingStats([partial], NOW);
assert("partial-in-aging", partialStats.aging.find((b) => b.key === "0_30").amountRemainingSum === 600);
assert("partial-counted", partialStats.unsettledCount === 1);

const passCount = Object.values(results).filter((v) => v === "PASS").length;
log(`\n=== SUMMARY: ${passCount} PASS, ${Object.values(results).filter((v) => v === "FAIL").length} FAIL ===`);
if (Object.values(results).some((v) => v === "FAIL")) process.exit(1);
