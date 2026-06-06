/**
 * Sprint 20.4B — Settlement Workflow UI (domain + KPI helpers)
 * Uruchom: npx vite-node scripts/smoke-test-recoverable-charges-settlement-ui-20.4b.mjs
 */
import {
  applySettlement,
  defaultRecoverableCharge,
  deriveChargeAmounts,
  recoverableChargesModuleKpi,
  countUnsettledRecoverableCharges,
  settlementTargetJobLabel,
  validateSettlementDraft,
} from "../src/lib/recoverable-charges.ts";
import {
  buildSettlementNote,
  parseSettlementNote,
  settlementTypeLabel,
} from "../src/app/SettleChargeModal.tsx";

const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

function baseCharge(amount = 1200) {
  const c = defaultRecoverableCharge("Dawid");
  c.title = "Dodatkowe malowanie";
  c.description = "Test workflow";
  c.amount = amount;
  return c;
}

function settle(charge, amount, extra = {}) {
  return applySettlement(charge, {
    amount,
    settledBy: "Dawid",
    settledAt: "2026-07-12T10:00:00.000Z",
    ...extra,
  });
}

log("=== Sprint 20.4B — Settlement UI workflow smoke ===\n");

// A — 1200 → 500 → partial, remaining 700
let chargeA = baseCharge(1200);
chargeA = settle(chargeA, 500, { id: "s-a1" });
const dA = deriveChargeAmounts(chargeA);
assert("A-partial", dA.status === "partial", dA.status);
assert("A-remaining-700", dA.amountRemaining === 700, String(dA.amountRemaining));
assert("A-settled-500", dA.amountSettled === 500, String(dA.amountSettled));

// B — 1200 → 1200 → settled
let chargeB = baseCharge(1200);
chargeB = settle(chargeB, 1200, { id: "s-b1" });
const dB = deriveChargeAmounts(chargeB);
assert("B-settled", dB.status === "settled", dB.status);
assert("B-remaining-0", dB.amountRemaining === 0, String(dB.amountRemaining));

// C — 1200 → 1300 FAIL
const chargeC = baseCharge(1200);
const blockC = validateSettlementDraft(chargeC, 1300);
assert("C-block", !blockC.ok && blockC.error === "exceeds_remaining");
let threwC = false;
try {
  settle(chargeC, 1300);
} catch {
  threwC = true;
}
assert("C-throws", threwC);

// D — 500 + 300 → remaining 400
let chargeD = baseCharge(1200);
chargeD = settle(chargeD, 500, { id: "s-d1" });
chargeD = settle(chargeD, 300, { id: "s-d2", settledAt: "2026-07-13T10:00:00.000Z" });
const dD = deriveChargeAmounts(chargeD);
assert("D-partial", dD.status === "partial");
assert("D-remaining-400", dD.amountRemaining === 400, String(dD.amountRemaining));
assert("D-two-settlements", chargeD.settlements.length === 2);

// E — historia 2 wpisy, sort newest first
const sorted = [...chargeD.settlements].sort((a, b) => b.settledAt.localeCompare(a.settledAt));
assert("E-history-count", sorted.length === 2);
assert("E-history-newest-first", sorted[0].id === "s-d2");

// F — targetJobId + label
const jobsById = new Map([
  ["job-preschool", { id: "job-preschool", address: "ul. Szkolna 1", flatNumber: "", client: "Przedszkole nr 2" }],
]);
const chargeF = settle(baseCharge(600), 200, {
  id: "s-f1",
  targetJobId: "job-preschool",
  targetJobLabel: "Przedszkole nr 2 — ul. Szkolna 1",
});
const labelLive = settlementTargetJobLabel(chargeF.settlements[0], jobsById);
assert("F-target-label", labelLive.includes("Przedszkole"));
const labelArchived = settlementTargetJobLabel(
  { targetJobId: "deleted-job", targetJobLabel: "" },
  jobsById,
);
assert("F-archived", labelArchived === "Robota archiwalna");

// G — onBehalfOf
const noteG = buildSettlementNote(settlementTypeLabel("next_job"), "Potwierdzone telefonicznie");
const chargeG = settle(baseCharge(800), 100, {
  id: "s-g1",
  onBehalfOf: "Szymon",
  recordedVia: "on_behalf_of_inspector",
  note: noteG,
});
assert("G-on-behalf", chargeG.settlements[0].onBehalfOf === "Szymon");
const parsed = parseSettlementNote(chargeG.settlements[0].note);
assert("G-note-type", parsed.typeLabel === "Doliczone do kolejnej roboty");
assert("G-note-text", parsed.userNote === "Potwierdzone telefonicznie");

// KPI helpers
const kpiList = [chargeA, chargeB, chargeD];
const kpi = recoverableChargesModuleKpi(kpiList);
assert("KPI-to-settle", kpi.toSettleSum === 0, String(kpi.toSettleSum));
assert("KPI-partial", kpi.partialRemainingSum === 1100, String(kpi.partialRemainingSum));
assert("KPI-recovered", kpi.recoveredSum === 2500, String(kpi.recoveredSum));
assert("KPI-badge-count", countUnsettledRecoverableCharges(kpiList) === 2, String(countUnsettledRecoverableCharges(kpiList)));

const passCount = Object.values(results).filter((v) => v === "PASS").length;
const failCount = Object.values(results).filter((v) => v === "FAIL").length;
log(`\n=== SUMMARY: ${passCount} PASS, ${failCount} FAIL (${Object.keys(results).length} assertions) ===`);
if (failCount > 0) process.exit(1);
