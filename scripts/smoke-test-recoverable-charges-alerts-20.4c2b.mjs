/**
 * Sprint 20.4C.2B — Recoverable charge alerts
 * Uruchom: npx vite-node scripts/smoke-test-recoverable-charges-alerts-20.4c2b.mjs
 */
import {
  applySettlement,
  defaultRecoverableCharge,
  computeRecoverableChargesAlerts,
  topRecoverableChargeAlerts,
  recoverableChargesDashboardCardStats,
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
  c.updatedAt = extra.updatedAt ?? createdAt;
  c.title = extra.title ?? `Pozycja ${id}`;
  c.description = extra.description ?? "Test";
  c.status = extra.status ?? "open";
  return c;
}

const NOW = new Date("2026-06-06T12:00:00.000Z");

log("=== Sprint 20.4C.2B — Alerts smoke ===\n");

// A — kwota >= 2000
const alertA = charge("a1", 2500, "2026-05-27T10:00:00.000Z", { title: "Malowanie klatki" });
const statsA = computeRecoverableChargesAlerts([alertA], NOW);
assert("A-kwota-count", statsA.countsByType.kwota === 1, String(statsA.countsByType.kwota));
assert("A-kwota-type", statsA.alerts[0].types.includes("kwota"));
assert("A-kwota-reason", statsA.alerts[0].reason === "Kwota ≥ 2 000 PLN");

// B — wiek > 90 dni
const alertB = charge("b1", 500, "2025-02-01T10:00:00.000Z", { title: "Stara pozycja" });
const statsB = computeRecoverableChargesAlerts([alertB], NOW);
assert("B-wiek-count", statsB.countsByType.wiek === 1, String(statsB.countsByType.wiek));
assert("B-wiek-type", statsB.alerts[0].types.includes("wiek"));
assert("B-wiek-reason", statsB.alerts[0].reason === "Ponad 90 dni");

// C — partial > 60 dni od pierwszego settlement
const partialBase = charge("c1", 2000, "2026-04-01T10:00:00.000Z", { title: "Partial stary" });
const alertC = applySettlement(partialBase, {
  amount: 500,
  settledBy: "Dawid",
  settledAt: "2026-04-05T10:00:00.000Z",
});
const statsC = computeRecoverableChargesAlerts([alertC], NOW);
assert("C-partial-count", statsC.countsByType.częściowe === 1, String(statsC.countsByType.częściowe));
assert("C-partial-type", statsC.alerts[0].types.includes("częściowe"));
assert("C-partial-reason", statsC.alerts[0].reason === "Częściowo rozliczone > 60 dni");

// D — brak aktywności > 60 dni
const alertD = charge("d1", 800, "2026-05-01T10:00:00.000Z", {
  title: "Bez ruchu",
  updatedAt: "2026-03-01T10:00:00.000Z",
});
const statsD = computeRecoverableChargesAlerts([alertD], NOW);
assert("D-aktywnosc-count", statsD.countsByType.aktywność === 1, String(statsD.countsByType.aktywność));
assert("D-aktywnosc-type", statsD.alerts[0].types.includes("aktywność"));
assert("D-aktywnosc-reason", statsD.alerts[0].reason === "Brak aktywności > 60 dni");

// E — attentionCount = 1 (wiele alertów, jedna sekcja systemowa)
const many = computeRecoverableChargesAlerts([alertA, alertB, alertC, alertD], NOW);
assert("E-attention-one", many.attentionCount === 1, String(many.attentionCount));
assert("E-alert-list-len", many.alerts.length === 4, String(many.alerts.length));

// F — brak alertów
const settled = applySettlement(
  charge("s1", 1000, "2025-01-01T10:00:00.000Z"),
  { amount: 1000, settledBy: "Dawid", settledAt: "2026-01-01T10:00:00.000Z" },
);
const fresh = charge("f1", 400, "2026-06-01T10:00:00.000Z");
const statsF = computeRecoverableChargesAlerts([settled, fresh], NOW);
assert("F-no-alerts", statsF.alerts.length === 0);
assert("F-attention-zero", statsF.attentionCount === 0);
assert("F-settled-excluded", statsF.countsByType.kwota === 0);

// G — priorytet sortowania: wiek > kwota > częściowe > aktywność
assert("G-sort-first-wiek", many.alerts[0].primaryType === "wiek", many.alerts[0].primaryType);
assert("G-sort-second-kwota", many.alerts[1].primaryType === "kwota", many.alerts[1].primaryType);
assert("G-sort-third-partial", many.alerts[2].primaryType === "częściowe", many.alerts[2].primaryType);
assert("G-sort-fourth-inactivity", many.alerts[3].primaryType === "aktywność", many.alerts[3].primaryType);

const top3 = topRecoverableChargeAlerts(many.alerts, 3);
assert("G-dashboard-top3", top3.length === 3);
assert("G-dashboard-top3-types", top3.map((a) => a.primaryType).join(",") === "wiek,kwota,częściowe");

// Dashboard alarm threshold 90 dni (nie 30)
const midAge = charge("m1", 500, "2026-04-01T10:00:00.000Z");
const dashMid = recoverableChargesDashboardCardStats([midAge], NOW);
assert("alarm-not-66-days", !dashMid.isAlarm, `oldest=${dashMid.oldestUnsettledDays}`);
const dashHigh = recoverableChargesDashboardCardStats([alertA], NOW);
assert("alarm-still-kwota", dashHigh.isAlarm);

const passCount = Object.values(results).filter((v) => v === "PASS").length;
log(`\n=== SUMMARY: ${passCount} PASS, ${Object.values(results).filter((v) => v === "FAIL").length} FAIL ===`);
if (Object.values(results).some((v) => v === "FAIL")) process.exit(1);
