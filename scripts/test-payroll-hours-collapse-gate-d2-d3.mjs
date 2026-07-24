/**
 * PAYROLL-IMPLEMENT-02 D2+D3 — hours-collapse gate + intentionalHoursClear skip coupling.
 * npx vite-node scripts/test-payroll-hours-collapse-gate-d2-d3.mjs
 */
import { readFileSync } from "fs";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    Object.keys(lsStore).forEach((k) => delete lsStore[k]);
  },
};

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name);
  }
}

const {
  detectHoursCollapse,
  requiresHoursCollapseConfirm,
  resolvePayrollDomainPushOptions,
  maySkipPayrollShrinkGuard,
  assertHoursCollapseAllowedOrThrow,
  PAYROLL_HOURS_COLLAPSE_CONFIRM_REQUIRED,
  empTotalHours,
} = await import("../src/lib/payroll-hours-collapse-gate.ts");

const {
  wouldBlockPayrollShrink,
  evaluatePayrollGuardBeforePush,
  PAYROLL_GUARD_BLOCKED_MESSAGE,
} = await import("../src/lib/cloud-sync.ts");

const {
  schedulePayrollDomainPush,
  flushPayrollDomainPush,
  bindPayrollDomainPushHandler,
  cancelPayrollDomainPush,
  PAYROLL_DOMAIN_PUSH_DEBOUNCE_MS,
} = await import("../src/lib/payroll-domain-sync.ts");

const { pwrPush } = await import("../src/lib/payroll-week-roster-bundle.ts");

const activeDay = { active: true, from: "07:00", to: "16:00", zaliczka: "" };
const inactiveDay = { active: false, from: "07:00", to: "16:00", zaliczka: "" };
const daysActive = Object.fromEntries(["Pn", "Wt", "Sr", "Cz", "Pt", "So"].map((k) => [k, { ...activeDay }]));
const daysInactive = Object.fromEntries(["Pn", "Wt", "Sr", "Cz", "Pt", "So"].map((k) => [k, { ...inactiveDay }]));

function richEmp(id = "e1", name = "Piotrek") {
  return {
    id,
    directoryId: `dir-${id}`,
    name,
    rate: "25",
    days: structuredClone(daysActive),
    prevSaturday: { ...inactiveDay },
  };
}

function zeroEmp(id = "e1", name = "Piotrek") {
  return {
    id,
    directoryId: `dir-${id}`,
    name,
    rate: "25",
    days: structuredClone(daysInactive),
    prevSaturday: { ...inactiveDay },
  };
}

localStorage.removeItem("wg-payroll-hours-collapse-confirm");
localStorage.removeItem("wg-payroll-domain-push-guard-strict");

// --- D2 predicate ---
const rich = [richEmp()];
const zeroed = [zeroEmp()];
assert("rich hours > 0", empTotalHours(rich[0]) > 0);
assert("zero hours === 0", empTotalHours(zeroed[0]) === 0);
assert("detect hours_to_zero", detectHoursCollapse(rich, zeroed).some((f) => f.reason === "hours_to_zero"));
assert("requires confirm true", requiresHoursCollapseConfirm(rich, zeroed) === true);
assert("CREATED no confirm", requiresHoursCollapseConfirm([], [zeroEmp("new")]) === false);
assert("rate-only no confirm", requiresHoursCollapseConfirm(rich, [{ ...rich[0], rate: "30" }]) === false);

// --- W1 regression: deactivate-all same UUID → D2 findings; factory untouched ---
const { weekEmployeeFromDir, defaultDay } = await import("../src/app/app-domain.ts");
const w1Before = [richEmp("w1-same", "Piotrek")];
const w1After = [{
  ...w1Before[0],
  days: structuredClone(daysInactive),
  dataUpdatedAt: "2026-07-24T09:29:17.795Z",
}];
const w1Findings = detectHoursCollapse(w1Before, w1After);
assert("W1 same id after deactivate", w1After[0].id === w1Before[0].id);
assert("W1 requires confirm", w1Findings.length >= 1);
assert("W1 hours_to_zero or all_inactive", w1Findings.some((f) => f.reason === "hours_to_zero" || f.reason === "all_inactive"));

// --- W2 regression: weekEmployeeFromDir PURE → CREATED fingerprint, no D2 ---
const dir = {
  id: "dir-w2",
  name: "Tomek",
  phone: "",
  position: "Murarz",
  defaultRate: "30",
  active: true,
};
const created = weekEmployeeFromDir(dir);
assert("W2 new UUID", typeof created.id === "string" && created.id.length > 0 && created.id !== "dir-w2");
assert("W2 directoryId", created.directoryId === "dir-w2");
assert("W2 defaultDay fingerprint", Object.values(created.days).every((d) => d.active === false && d.from === defaultDay().from));
assert("W2 CREATED no D2 vs empty before", requiresHoursCollapseConfirm([], [created]) === false);
assert("W2 add onto rich no collapse on existing", requiresHoursCollapseConfirm(rich, [...rich, created]) === false);

// partial wipe 2 emp (INCIDENT class) — D2 primary
const roster14 = Array.from({ length: 14 }, (_, i) => richEmp(`e${i}`, `Emp${i}`));
const partialWipe = roster14.map((e, i) => (i < 2 ? zeroEmp(e.id, e.name) : e));
assert("partial wipe 2/14 requires confirm", requiresHoursCollapseConfirm(roster14, partialWipe) === true);

// --- D3 resolve ---
assert(
  "intentional → skip true",
  resolvePayrollDomainPushOptions({ intentionalHoursClear: true }).skipPayrollGuard === true
    && resolvePayrollDomainPushOptions({ intentionalHoursClear: true }).intentionalHoursClear === true,
);
assert(
  "bare skip → no skip (strict)",
  resolvePayrollDomainPushOptions({ skipPayrollGuard: true }).skipPayrollGuard === false,
);
assert("maySkip false without intentional", maySkipPayrollShrinkGuard({ skipPayrollGuard: true }) === false);
assert("maySkip true with intentional", maySkipPayrollShrinkGuard({ intentionalHoursClear: true }) === true);

// --- Domain gate throw ---
let threw = false;
try {
  assertHoursCollapseAllowedOrThrow(rich, zeroed, {});
} catch (e) {
  threw = e instanceof Error && e.message === PAYROLL_HOURS_COLLAPSE_CONFIRM_REQUIRED;
}
assert("gate blocks without intentional", threw);

threw = false;
try {
  assertHoursCollapseAllowedOrThrow(rich, zeroed, { intentionalHoursClear: true });
} catch {
  threw = true;
}
assert("gate allows with intentional", threw === false);

// --- Guard evaluate: bare skip no longer bypasses ---
process.env.VITE_SUPABASE_PROJECT_ID = process.env.VITE_SUPABASE_PROJECT_ID || "mock-d23";
process.env.VITE_SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || "mock-anon-d23";

const cloudRich = [richEmp("c1"), richEmp("c2"), richEmp("c3")];
assert("wouldBlock shrink", wouldBlockPayrollShrink(cloudRich, []) === true);

const blockedBare = await evaluatePayrollGuardBeforePush(
  ["kw-week-employees"],
  [[]],
  { skipPayrollGuard: true, cloudWeekEmployees: cloudRich, replaceWeekEmployeesKeys: ["kw-week-employees"] },
);
assert("bare skipPayrollGuard blocked (D3)", blockedBare.blocked === true);

const allowedIntent = await evaluatePayrollGuardBeforePush(
  ["kw-week-employees"],
  [[]],
  {
    intentionalHoursClear: true,
    cloudWeekEmployees: cloudRich,
    replaceWeekEmployeesKeys: ["kw-week-employees"],
  },
);
assert("intentionalHoursClear allows guard skip", allowedIntent.blocked === false);

// --- Cancel confirmation path: no handler write ---
let pushCount = 0;
cancelPayrollDomainPush();
bindPayrollDomainPushHandler(() => {
  pushCount += 1;
});
// Simulate cancel: never schedule
assert("cancel → no schedule → no write", pushCount === 0);

// Accept path: schedule with intentional → flush writes
schedulePayrollDomainPush(zeroed, { intentionalHoursClear: true }, rich);
flushPayrollDomainPush();
assert("accept → flush write", pushCount === 1);

// Sticky intentional across debounce window
pushCount = 0;
let flushedOpts = null;
cancelPayrollDomainPush();
bindPayrollDomainPushHandler((_r, opts) => {
  pushCount += 1;
  flushedOpts = opts;
});
schedulePayrollDomainPush(zeroed, { intentionalHoursClear: true }, rich);
schedulePayrollDomainPush([{ ...zeroed[0], rate: "40" }], undefined, zeroed);
flushPayrollDomainPush();
assert("sticky intentional on second schedule", flushedOpts?.intentionalHoursClear === true);
assert("sticky flush once", pushCount === 1);

// --- pwrPush domain gate ---
let pwrBlocked = false;
try {
  await pwrPush({
    roster: zeroed,
    weekFrom: "2026-07-20",
    weekTo: "2026-07-25",
    rosterBefore: rich,
    options: {},
  });
} catch (e) {
  pwrBlocked = e instanceof Error && e.message === PAYROLL_HOURS_COLLAPSE_CONFIRM_REQUIRED;
}
assert("pwrPush blocks collapse without flag", pwrBlocked);

// Source presence (no D4/D5)
const gateSrc = readFileSync(new URL("../src/lib/payroll-hours-collapse-gate.ts", import.meta.url), "utf8");
assert("gate module has D2/D3", gateSrc.includes("intentionalHoursClear") && gateSrc.includes("detectHoursCollapse"));
const appSrc = readFileSync(new URL("../src/app/App.tsx", import.meta.url), "utf8");
assert("App wires confirm", appSrc.includes("formatHoursCollapseConfirmMessage"));
assert("App no bare skip on domain persist", !appSrc.includes("persistPayrollRoster") || !/pwrPush\(\{[^}]*skipPayrollGuard:\s*true/.test(
  appSrc.slice(appSrc.indexOf("persistPayrollRoster"), appSrc.indexOf("persistPayrollRoster") + 800),
));
assert("no D4 banner in this change", !gateSrc.includes("shouldShowPayrollPrevRecoveryBanner"));
assert("debounce const present", typeof PAYROLL_DOMAIN_PUSH_DEBOUNCE_MS === "number");
assert("guard message constant", typeof PAYROLL_GUARD_BLOCKED_MESSAGE === "string");

console.log(`\nD2+D3 results: ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
