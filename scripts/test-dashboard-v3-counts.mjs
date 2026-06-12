/**
 * Dashboard V3 — liczniki operacyjne
 * Run: npx vite-node scripts/test-dashboard-v3-counts.mjs
 */
import { buildUrgentTodayCategories } from "../src/lib/dashboard-urgent-today.ts";
import { defaultRecoverableCharge, computeRecoverableChargesAlerts } from "../src/lib/recoverable-charges.ts";

const results = {};
const failed = [];

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  if (!cond) {
    failed.push(name);
    console.error(`✗ ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    console.log(`✓ ${name}${detail ? ` — ${detail}` : ""}`);
  }
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
const recoverableAlerts = computeRecoverableChargesAlerts(
  [
    charge("a1", 2500, "2026-05-27T10:00:00.000Z"),
    charge("b1", 500, "2025-02-01T10:00:00.000Z"),
    charge("c1", 2000, "2026-04-01T10:00:00.000Z"),
    charge("d1", 800, "2026-05-01T10:00:00.000Z", { updatedAt: "2026-03-01T10:00:00.000Z" }),
  ],
  NOW,
);

const input = {
  needsUnsavedWeekAlert: true,
  payrollRolloverBlockersCount: 2,
  consistencyAlertsCount: 1,
  pendingReceiptsCount: 3,
  pendingReportsCount: 2,
  pendingPhotosCount: 1,
  unseenInspectorFeedCount: 4,
  inspectorNotesPendingCount: 2,
  wmOverdueJobsCount: 1,
  wmThisWeekJobsCount: 2,
  handoverJobCount: 3,
  recoverableAlertsCount: recoverableAlerts.alerts.length,
};

const jobsMissingDocsCount = 5;

const { categories, urgentTodayTotal } = buildUrgentTodayCategories(input);

const byId = Object.fromEntries(categories.map((c) => [c.id, c]));

assert("place-count", byId.place.count === 7, String(byId.place.count));
assert("dokumentacja-count", byId["dokumentacja-ekipy"].count === 2);
assert("zdjecia-count", byId.zdjecia.count === 1);
assert("inspektor-count", byId.inspektor.count === 6);
assert("wm-count", byId.wm.count === 3);
assert("odbior-count", byId.odbior.count === 3, "handover=Odbiory");
assert("recoverable-count", byId["do-odzyskania"].count === 4, `alerts=${recoverableAlerts.alerts.length}`);
assert("recoverable-not-attention", recoverableAlerts.attentionCount === 1, "lib 0/1 unchanged");

const sumCategories = categories.reduce((s, c) => s + c.count, 0);
assert("total-equals-sum", urgentTodayTotal === sumCategories, `${urgentTodayTotal} vs ${sumCategories}`);
assert("total-expected", urgentTodayTotal === 26, String(urgentTodayTotal));

assert(
  "jobsMissingDocs-not-in-urgent",
  !categories.some((c) => c.label.toLowerCase().includes("braki dokumentów")),
);
assert(
  "jobsMissingDocs-separate-kpi",
  jobsMissingDocsCount === 5 && urgentTodayTotal !== jobsMissingDocsCount,
);

console.log(
  JSON.stringify({ test: "dashboard-v3-counts", pass: failed.length === 0, results }, null, 2),
);
if (failed.length > 0) process.exit(1);
