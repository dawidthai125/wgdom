/**
 * Sprint 20.4C.2C — Time KPI + top lists
 * Uruchom: npx vite-node scripts/smoke-test-recoverable-charges-insights-20.4c2c.mjs
 */
import {
  applySettlement,
  defaultRecoverableCharge,
  computeRecoverableChargesTimeStats,
  computeRecoverableChargesTopLists,
  RECOVERABLE_TOP_LIST_LIMIT,
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
  c.status = extra.status ?? "open";
  return c;
}

const NOW = new Date("2026-06-06T12:00:00.000Z");

log("=== Sprint 20.4C.2C — Insights smoke ===\n");

// Settled with recovery durations
const settledFast = applySettlement(
  charge("sf", 1000, "2026-01-01T10:00:00.000Z", { title: "Szybkie" }),
  { amount: 1000, settledBy: "Dawid", settledAt: "2026-03-02T10:00:00.000Z" },
);
const settledSlow = applySettlement(
  charge("ss", 2000, "2026-02-01T10:00:00.000Z", { title: "Wolne" }),
  { amount: 2000, settledBy: "Dawid", settledAt: "2026-05-01T10:00:00.000Z" },
);

// Month + year settlements
const monthSettle = applySettlement(
  charge("ms", 1500, "2026-05-01T10:00:00.000Z", { title: "Czerwiec" }),
  { amount: 1500, settledBy: "Dawid", settledAt: "2026-06-02T10:00:00.000Z" },
);
const yearSettle = applySettlement(
  charge("ys", 800, "2026-01-15T10:00:00.000Z", { title: "Marzec" }),
  { amount: 800, settledBy: "Dawid", settledAt: "2026-03-10T10:00:00.000Z" },
);

// Legacy-only settled — excluded from average + largestRecovered
const legacyOnly = charge("leg", 5000, "2025-01-01T10:00:00.000Z", { title: "Legacy", status: "settled" });
legacyOnly.settlements = [
  {
    id: "legacy-migration-leg",
    amount: 5000,
    settledAt: "2025-06-01T10:00:00.000Z",
    settledBy: "Migracja",
    note: "legacy",
  },
];
legacyOnly.amountSettled = 5000;
legacyOnly.amountRemaining = 0;

// Outstanding for top lists (6 items, limit 5)
const outstanding = [
  charge("o1", 4200, "2026-05-27T10:00:00.000Z", { title: "Malowanie klatki" }),
  charge("o2", 3100, "2026-05-20T10:00:00.000Z", { title: "Elewacja A" }),
  charge("o3", 2800, "2026-04-22T10:00:00.000Z", { title: "Elewacja B" }),
  charge("o4", 2100, "2026-03-23T10:00:00.000Z", { title: "Docieplenie" }),
  charge("o5", 1800, "2026-02-07T10:00:00.000Z", { title: "Balkon" }),
  charge("o6", 900, "2026-05-01T10:00:00.000Z", { title: "Drobne" }),
];

const oldestExpected = charge("old", 1200, "2025-12-01T10:00:00.000Z", { title: "Najstarsza" });

const all = [
  settledFast,
  settledSlow,
  monthSettle,
  yearSettle,
  legacyOnly,
  oldestExpected,
  ...outstanding,
];

const time = computeRecoverableChargesTimeStats(all, NOW);
const tops = computeRecoverableChargesTopLists(all, NOW);

// A — monthRecovered (1500 June only)
assert("A-month", time.monthRecovered === 1500, String(time.monthRecovered));

// B — yearRecovered (1000+2000+1500+800 = 5300)
assert("B-year", time.yearRecovered === 5300, String(time.yearRecovered));

// C — averageRecoveryDays (4 settled charges with real settlements: sf, ss, ms, ys)
// sf: 60d, ss: 89d, ms: 32d, ys: 54d → avg 59
assert("C-avg-days", time.averageRecoveryDays === 59, String(time.averageRecoveryDays));

// D — largestOutstanding
assert("D-largest-first", tops.largestOutstanding[0].title === "Malowanie klatki");
assert("D-largest-amount", tops.largestOutstanding[0].amount === 4200);
assert("D-largest-second", tops.largestOutstanding[1].amount === 3100);

// E — oldestOutstanding
assert("E-oldest-first", tops.oldestOutstanding[0].title === "Najstarsza");
assert("E-oldest-days", tops.oldestOutstanding[0].statusLabel.includes("dni"));

// F — largestRecovered (legacy excluded)
assert("F-recovered-first", tops.largestRecovered[0].title === "Wolne");
assert("F-recovered-amount", tops.largestRecovered[0].amount === 2000);
assert("F-no-legacy", !tops.largestRecovered.some((i) => i.chargeId === "leg"));

// G — limit 5
assert("G-limit-constant", RECOVERABLE_TOP_LIST_LIMIT === 5);
assert("G-largest-len", tops.largestOutstanding.length === 5, String(tops.largestOutstanding.length));
assert("G-oldest-len", tops.oldestOutstanding.length === 5);
assert("G-sixth-excluded", !tops.largestOutstanding.some((i) => i.chargeId === "o6"));

// H — legacy excluded from average (4 durations not 5)
assert("H-legacy-not-in-avg", time.averageRecoveryDays === 59);

// I — empty state
const emptyTime = computeRecoverableChargesTimeStats([], NOW);
const emptyTops = computeRecoverableChargesTopLists([], NOW);
assert("I-empty-month", emptyTime.monthRecovered === 0);
assert("I-empty-year", emptyTime.yearRecovered === 0);
assert("I-empty-avg", emptyTime.averageRecoveryDays === null);
assert("I-empty-settled", emptyTime.settledCount === 0);
assert("I-empty-lists", emptyTops.largestOutstanding.length === 0);
assert("I-empty-oldest", emptyTops.oldestOutstanding.length === 0);
assert("I-empty-recovered", emptyTops.largestRecovered.length === 0);

assert("settled-count", time.settledCount === 5, String(time.settledCount));

const passCount = Object.values(results).filter((v) => v === "PASS").length;
log(`\n=== SUMMARY: ${passCount} PASS, ${Object.values(results).filter((v) => v === "FAIL").length} FAIL ===`);
if (Object.values(results).some((v) => v === "FAIL")) process.exit(1);
