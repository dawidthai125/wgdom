/**
 * Sprint 20.5A.1 — Roboty ↔ Do rozliczenia (read-only)
 * Uruchom: npx vite-node scripts/smoke-test-recoverable-charges-jobs-20.5a1.mjs
 */
import {
  applySettlement,
  defaultRecoverableCharge,
  deriveChargeAmounts,
  getRecoverableChargeJobStats,
  getRecoverableChargesForJob,
  getRecoverableChargesRecoveredOnJob,
  JOB_RECOVERABLE_CHARGES_LIST_LIMIT,
  computeRecoverableChargesAlerts,
  recoverableChargesDashboardCardStats,
  normalizeRecoverableCharges,
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

function charge(id, amount, createdAt, extra = {}) {
  const c = defaultRecoverableCharge("Admin");
  c.id = id;
  c.amount = amount;
  c.createdAt = createdAt;
  c.updatedAt = createdAt;
  c.title = extra.title ?? `Pozycja ${id}`;
  c.description = extra.description ?? "Test";
  c.sourceType = extra.sourceType ?? "job";
  c.sourceJobId = extra.sourceJobId ?? "";
  c.status = extra.status ?? "open";
  return c;
}

const NOW = new Date("2026-06-06T12:00:00.000Z");
const JOB_A = "job-source-a";
const JOB_B = "job-target-b";

log("=== Sprint 20.5A.1 — Jobs ↔ Recoverable Charges smoke ===\n");

// Source charges on JOB_A (6 items for limit test)
const sourceCharges = [];
for (let i = 1; i <= 6; i++) {
  sourceCharges.push(
    charge(`src-${i}`, 1000 + i * 100, `2026-0${Math.min(i, 5)}-0${i}T10:00:00.000Z`, {
      title: `Źródło ${i}`,
      sourceJobId: JOB_A,
    }),
  );
}

// Partial on JOB_A with alert (high amount + old)
const partialAlert = applySettlement(
  charge("src-alert", 5000, "2025-01-01T10:00:00.000Z", {
    title: "Alert kwota+wiek",
    sourceJobId: JOB_A,
  }),
  { amount: 500, settledBy: "Dawid", settledAt: "2026-01-01T10:00:00.000Z" },
);

// Settlement recovered ON JOB_B (target)
const recoveredOnB = applySettlement(
  charge("rec-b", 3000, "2026-03-01T10:00:00.000Z", {
    title: "Rozliczenie na B",
    sourceJobId: "job-other",
  }),
  {
    amount: 1200,
    settledBy: "Dawid",
    settledAt: "2026-05-15T10:00:00.000Z",
    targetJobId: JOB_B,
    targetJobLabel: "Robota B",
  },
);

const recoveredOnB2 = applySettlement(recoveredOnB, {
  amount: 300,
  settledBy: "Dawid",
  settledAt: "2026-06-01T10:00:00.000Z",
  targetJobId: JOB_B,
});

const all = [...sourceCharges, partialAlert, recoveredOnB2];

// A — sourceJobId visible on job
const forJobA = getRecoverableChargesForJob(all, JOB_A);
assert("A-source-count", forJobA.length === 7, String(forJobA.length));
const sortedDesc = forJobA.every(
  (c, i, arr) => i === 0 || arr[i - 1].updatedAt >= c.updatedAt,
);
assert("A-source-sorted", sortedDesc);
assert("A-stats-charge-count", getRecoverableChargeJobStats(all, JOB_A, NOW).chargeCount === 7);

// B — targetJobId visible in recovered section
const recoveredB = getRecoverableChargesRecoveredOnJob(all, JOB_B);
assert("B-recovered-count", recoveredB.length === 1, String(recoveredB.length));
assert("B-recovered-amount", recoveredB[0].recoveredAmount === 1500, String(recoveredB[0].recoveredAmount));
assert("B-recovered-last", recoveredB[0].lastSettledAt === "2026-06-01T10:00:00.000Z");

const statsB = getRecoverableChargeJobStats(all, JOB_B, NOW);
assert("B-stats-recovered-count", statsB.recoveredCount === 1);
assert("B-stats-no-source", statsB.chargeCount === 0);

// C — alertCount
const statsA = getRecoverableChargeJobStats(all, JOB_A, NOW);
const alertsA = computeRecoverableChargesAlerts(forJobA, NOW);
assert("C-alert-count", statsA.alertCount === alertsA.alerts.length, `${statsA.alertCount} vs ${alertsA.alerts.length}`);
assert("C-has-alerts", statsA.alertCount >= 1, String(statsA.alertCount));

// D — recoveredAmount on target job
assert("D-recovered-amount", statsB.recoveredAmount === 1500, String(statsB.recoveredAmount));

// E — list limited to 5
assert("E-limit-constant", JOB_RECOVERABLE_CHARGES_LIST_LIMIT === 5);
assert("E-source-overflow", forJobA.length - JOB_RECOVERABLE_CHARGES_LIST_LIMIT === 2);
const preview = forJobA.slice(0, JOB_RECOVERABLE_CHARGES_LIST_LIMIT);
assert("E-preview-len", preview.length === 5);

// F — no regression settlement workflow
const normalized = normalizeRecoverableCharges([recoveredOnB2])[0];
const derived = deriveChargeAmounts(normalized);
assert("F-settled-status", derived.status === "partial", derived.status);
assert("F-settled-remaining", derived.amountRemaining === 1500, String(derived.amountRemaining));

// G — no regression dashboard KPI
const dash = recoverableChargesDashboardCardStats(all, NOW);
assert("G-dash-unsettled", dash.unsettledCount >= 7, String(dash.unsettledCount));
assert("G-dash-recovered", dash.recoveredSum >= 2000, String(dash.recoveredSum));

log("\n=== Podsumowanie ===");
for (const [k, v] of Object.entries(results)) {
  log(`${v}: ${k}`);
}
const failed = Object.values(results).filter((v) => v === "FAIL").length;
log(`\n${failed === 0 ? "ALL PASS" : `FAILED: ${failed}`}`);
