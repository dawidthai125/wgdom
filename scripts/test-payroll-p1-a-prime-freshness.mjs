/**
 * PAYROLL P1 A′ — immediate entry + revision awareness + freshness UX.
 * Run: npx vite-node scripts/test-payroll-p1-a-prime-freshness.mjs
 *
 * Does not mutate Guard / CAS / P0 / Edge / tombstone hydrate.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p1-a-prime";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p1-a-prime";

globalThis.localStorage ??= {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const { MIN_PULL_INTERVAL_MS } = await import("../src/lib/cloud-sync-throttle.ts");
const {
  decidePayrollVisibleFreshnessPull,
  comparePayrollRosterRevisions,
  shouldRunFullFreshnessPullForRevision,
  derivePayrollFreshnessUxLevel,
  formatPayrollFreshnessCheckedLabel,
  PAYROLL_VISIBLE_FRESHNESS_VIEW,
} = await import("../src/lib/payroll-visible-freshness-pull.ts");
const {
  getCloudFreshnessSnapshot,
  markCloudFreshnessFresh,
  markCloudFreshnessUnknown,
  markCloudFreshnessUnconfirmed,
  resetCloudFreshnessGateForTests,
} = await import("../src/lib/cloud-freshness-gate.ts");

let pass = 0;
let fail = 0;

function assert(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
  }
}

const appSrc = readFileSync(resolve("src/app/App.tsx"), "utf8");
const helperSrc = readFileSync(resolve("src/lib/payroll-visible-freshness-pull.ts"), "utf8");
const viewSrc = readFileSync(resolve("src/app/PayrollView.tsx"), "utf8");
const p0Src = readFileSync(resolve("src/lib/payroll-settlement-mark-paid-if-unpaid.ts"), "utf8");

const p1Marker = "PAYROLL-P1-VISIBLE-FRESHNESS-PULL";
const p1Start = appSrc.indexOf(p1Marker);
const p1End = appSrc.indexOf("}, [view, executeCloudFreshnessPull, refreshPayrollFreshnessUx, weekFrom, weekTo]);", p1Start);
const p1Block =
  p1Start >= 0 && p1End > p1Start
    ? appSrc.slice(
        p1Start,
        p1End + "}, [view, executeCloudFreshnessPull, refreshPayrollFreshnessUx, weekFrom, weekTo]);".length,
      )
    : "";

const idleBase = {
  view: PAYROLL_VISIBLE_FRESHNESS_VIEW,
  hidden: false,
  mutationGuardBlocked: false,
  hasPendingDomainPush: false,
  lastPullAt: 0,
  now: 1_000_000,
};

console.log("=== PAYROLL P1 A′ freshness ===\n");

// T1 — Payroll entry triggers immediate freshness
{
  assert("T1 App tick(\"entry\") on mount", p1Block.includes('tick("entry")'));
  assert("T1 entry uses decidePayrollVisibleFreshnessPull", p1Block.includes("decidePayrollVisibleFreshnessPull"));
  const entryAllow = decidePayrollVisibleFreshnessPull({ ...idleBase, trigger: "entry" });
  assert("T1 entry decision allow when idle", entryAllow.allow === true);
}

// T2 — Entry + interval do not cause duplicate pull burst (shared throttle)
{
  const afterClaim = decidePayrollVisibleFreshnessPull({
    ...idleBase,
    trigger: "interval",
    lastPullAt: idleBase.now,
    now: idleBase.now + 1_000,
  });
  assert("T2 interval within 15s throttled", afterClaim.allow === false && afterClaim.reason === "throttle");
  assert("T2 App claims lastPullAtRef before async", p1Block.includes("lastPullAtRef.current = Date.now()"));
  assert("T2 MIN_PULL_INTERVAL still 15s", MIN_PULL_INTERVAL_MS === 15_000);
  assert("T2 interval timer preserved", p1Block.includes("setInterval(() => tick(\"interval\"), MIN_PULL_INTERVAL_MS)"));
}

// T3 — New Cloud rosterRevision triggers full freshness path
{
  assert(
    "T3 cloud_newer runs full pull",
    shouldRunFullFreshnessPullForRevision(comparePayrollRosterRevisions(10, 11)) === true,
  );
  assert("T3 App probes PAYROLL_WEEK_META_KEY", p1Block.includes("PAYROLL_WEEK_META_KEY"));
  assert("T3 App uses shouldRunFullFreshnessPullForRevision", p1Block.includes("shouldRunFullFreshnessPullForRevision"));
}

// T4 — Equal/older revision does not unnecessarily replace local state
{
  assert(
    "T4 equal skips full pull",
    shouldRunFullFreshnessPullForRevision(comparePayrollRosterRevisions(5, 5)) === false,
  );
  assert(
    "T4 cloud older skips full pull",
    shouldRunFullFreshnessPullForRevision(comparePayrollRosterRevisions(9, 7)) === false,
  );
  assert(
    "T4 unknown falls back to pull",
    shouldRunFullFreshnessPullForRevision(comparePayrollRosterRevisions(null, 1)) === true,
  );
  assert("T4 App marks fresh without full replace on equal", p1Block.includes("markCloudFreshnessFresh"));
}

// T5 — Pending Payroll domain push survives entry freshness
{
  const d = decidePayrollVisibleFreshnessPull({ ...idleBase, hasPendingDomainPush: true, trigger: "entry" });
  assert("T5 pending skips pull", d.allow === false && d.reason === "pending_domain_push");
  assert(
    "T5 App never cancelPayrollDomainPushPreservingSettlement in P1 block",
    !p1Block.includes("cancelPayrollDomainPushPreservingSettlement"),
  );
  assert("T5 helper never cancels pending", !helperSrc.includes("cancelPayrollDomainPush"));
}

// T6/T7 — Hours / rate: existing pull path only (no second merge)
{
  assert("T6/T7 full path still executeCloudFreshnessPull", p1Block.includes("executeCloudFreshnessPull"));
  assert("T6/T7 helper has no weekEmployees merge", !helperSrc.includes("weekEmployees"));
  assert("T6/T7 helper has no hours/rate writers", !helperSrc.includes("pushWeekEmployees") && !helperSrc.includes("pwrPush"));
}

// T8/T9 — Membership ADD/REMOVE remain outside P1 helper (safety = skip pending + existing merge)
{
  assert("T8/T9 App P1 block does not call pwrPush", !/\bpwrPush\s*\(/.test(p1Block));
  assert("T8/T9 helper does not touch membership", !helperSrc.includes("legalAdd") && !helperSrc.includes("tombstone"));
  assert("T8/T9 App P1 block does not enqueue writes", !p1Block.includes("enqueueKwWeekEmployeesWrite"));
}

// T10 — Settlement state propagates through normal freshness (existing pull), no new gate
{
  assert("T10 no >24h settlement block in helper", !helperSrc.includes("24h") && !helperSrc.includes("settlement blocked"));
  assert("T10 no settlement block in App P1 block", !p1Block.includes("settlement") || !p1Block.toLowerCase().includes("block settlement"));
}

// T11 — P0 settlement file unchanged by this suite's scope marker
{
  assert("T11 P0 markPaidIfUnpaid still present", p0Src.includes("markPaidIfUnpaid") || p0Src.includes("payroll_already_settled") || p0Src.includes("ALREADY_SETTLED"));
  assert("T11 App P1 block does not import P0 settle path", !p1Block.includes("markPaidIfUnpaid"));
}

// T12 — 2.66.161 tombstone preservation not opened in P1 helper
{
  assert("T12 helper never touches prepareWeekEmployeeTombs", !helperSrc.includes("prepareWeekEmployeeTombs"));
  assert("T12 App P1 block never hydrates deleted-ids", !p1Block.includes("kw-week-employees-deleted-ids"));
}

// T13 — Offline/failing freshness preserves local (unconfirmed, no wipe)
{
  assert("T13 fail path markCloudFreshnessUnconfirmed", p1Block.includes("markCloudFreshnessUnconfirmed"));
  assert("T13 no setWeekEmployees([]) in P1 block", !p1Block.includes("setWeekEmployees([])"));
  assert("T13 no clear tombstones in P1 block", !p1Block.includes("deleted-ids"));
}

// T14 — Hidden Payroll does not start unwanted polling
{
  const d = decidePayrollVisibleFreshnessPull({ ...idleBase, hidden: true });
  assert("T14 hidden skips", d.allow === false && d.reason === "hidden");
  assert("T14 App reads document.hidden", p1Block.includes("document.hidden"));
}

// T15 — Resume force-refresh remains intact (outside P1 timer; requestCloudFreshnessOnResume)
{
  assert("T15 requestCloudFreshnessOnResume still in App", appSrc.includes("requestCloudFreshnessOnResume"));
  assert("T15 P1 block does not call resume force", !p1Block.includes("requestCloudFreshnessOnResume"));
  assert("T15 ensureCloudFreshBeforeWrite still in App", appSrc.includes("ensureCloudFreshBeforeWrite"));
}

// T16 — CAS/rebase intact (P1 does not add second CAS)
{
  assert("T16 helper has no CAS", !helperSrc.includes("payrollWeekCas") && !helperSrc.includes("expectedRevision"));
  assert("T16 App still has payroll CAS plumbing", appSrc.includes("PayrollStaleRevisionError") || appSrc.includes("expectedRevision"));
}

// UX helpers
{
  resetCloudFreshnessGateForTests({ allowWrites: true });
  markCloudFreshnessFresh("reconcile_ok");
  assert(
    "UX green when fresh",
    derivePayrollFreshnessUxLevel({ gateState: "fresh", hasPendingDomainPush: false }) === "green",
  );
  assert(
    "UX yellow when checking",
    derivePayrollFreshnessUxLevel({ gateState: "checking" }) === "yellow",
  );
  assert(
    "UX yellow when pending domain",
    derivePayrollFreshnessUxLevel({ gateState: "fresh", hasPendingDomainPush: true }) === "yellow",
  );
  assert(
    "UX red when stale",
    derivePayrollFreshnessUxLevel({ gateState: "stale" }) === "red",
  );
  assert(
    "UX red when unconfirmed",
    derivePayrollFreshnessUxLevel({ gateState: "unconfirmed" }) === "red",
  );
  const label = formatPayrollFreshnessCheckedLabel(Date.now());
  assert("UX label prefix Sprawdzono", typeof label === "string" && /^Sprawdzono: \d{2}:\d{2}$/.test(label));
  assert("UX never claims Cloud updated at", !/cloud updated at/i.test(helperSrc) && !/Cloud updated/i.test(viewSrc));
  assert("UX label is local Sprawdzono", helperSrc.includes("Sprawdzono:") && helperSrc.includes("never claim Cloud updatedAt"));
  assert("UX chip in PayrollView", viewSrc.includes("data-payroll-freshness-ux"));
  markCloudFreshnessUnknown("manual");
  markCloudFreshnessUnconfirmed("reconcile_fail");
  const snap = getCloudFreshnessSnapshot();
  assert("UX gate snapshot usable", snap.state === "unconfirmed");
}

// No Realtime
{
  assert("No Realtime in helper", !helperSrc.includes("realtime") && !helperSrc.includes("channel"));
  assert("No Realtime in P1 App block", !p1Block.toLowerCase().includes("realtime") && !p1Block.includes("postgres_changes"));
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
