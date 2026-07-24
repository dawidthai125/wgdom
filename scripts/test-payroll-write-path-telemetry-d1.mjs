/**
 * PAYROLL-IMPLEMENT-01 D1 — write-path telemetry smoke.
 * npx vite-node scripts/test-payroll-write-path-telemetry-d1.mjs
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
  emitPayrollWritePathTelemetry,
  payrollWritePathTelemetryDump,
  rosterTotalHoursPassive,
  installPayrollWritePathTelemetryGlobals,
} = await import("../src/lib/payroll-write-path-telemetry.ts");
const { payrollTraceDump, isPayrollTraceEnabled } = await import("../src/lib/payroll-runtime-trace.ts");
const { flushPayrollDomainPush, schedulePayrollDomainPush, bindPayrollDomainPushHandler, cancelPayrollDomainPush } =
  await import("../src/lib/payroll-domain-sync.ts");

const activeDay = { active: true, from: "07:00", to: "16:00", zaliczka: "" };
const inactiveDay = { active: false, from: "07:00", to: "16:00", zaliczka: "" };
const daysActive = Object.fromEntries(["Pn", "Wt", "Sr", "Cz", "Pt", "So"].map((k) => [k, { ...activeDay }]));
const daysInactive = Object.fromEntries(["Pn", "Wt", "Sr", "Cz", "Pt", "So"].map((k) => [k, { ...inactiveDay }]));

const rich = [
  {
    id: "e1",
    directoryId: "dir-1",
    name: "Piotrek",
    rate: "25",
    days: daysActive,
    prevSaturday: inactiveDay,
  },
];
const zeroed = [
  {
    id: "e1",
    directoryId: "dir-1",
    name: "Piotrek",
    rate: "25",
    days: daysInactive,
    prevSaturday: inactiveDay,
  },
];

assert("hours rich > 0", rosterTotalHoursPassive(rich) > 0);
assert("hours zeroed === 0", rosterTotalHoursPassive(zeroed) === 0);

// --- Telemetry present (default ON) ---
localStorage.removeItem("wg-payroll-write-path-telemetry");
localStorage.setItem("wg-payroll-trace", "0"); // console opt-in OFF
emitPayrollWritePathTelemetry({
  source: "pwrPush",
  weekFrom: "2026-07-20",
  weekTo: "2026-07-25",
  rosterBefore: rich,
  rosterAfter: zeroed,
  intentionalHoursClear: false,
  skipPayrollGuard: true,
});
const dump1 = payrollWritePathTelemetryDump();
assert("telemetry present: event recorded", dump1.eventCount >= 1);
assert(
  "telemetry present: write_path event",
  dump1.events.some((e) => e.event === "payroll.write_path" && e.source === "pwrPush"),
);
const ev = dump1.events.find((e) => e.event === "payroll.write_path");
assert("hoursBefore > 0", typeof ev?.hoursBefore === "number" && ev.hoursBefore > 0);
assert("hoursAfter === 0", ev?.hoursAfter === 0);
assert("console gate off by default flag", isPayrollTraceEnabled() === false);

// --- Telemetry disabled (kill-switch) ---
const beforeDisableCount = payrollWritePathTelemetryDump().eventCount;
localStorage.setItem("wg-payroll-write-path-telemetry", "0");
emitPayrollWritePathTelemetry({
  source: "pwrPush",
  weekFrom: "2026-07-20",
  weekTo: "2026-07-25",
  rosterBefore: rich,
  rosterAfter: zeroed,
});
assert(
  "telemetry disabled: no new write_path events",
  payrollWritePathTelemetryDump().eventCount === beforeDisableCount,
);

// --- Telemetry enabled again ---
localStorage.removeItem("wg-payroll-write-path-telemetry");
emitPayrollWritePathTelemetry({
  source: "domain_push_flush",
  weekFrom: "2026-07-20",
  weekTo: "2026-07-25",
  rosterBefore: rich,
  rosterAfter: rich,
});
assert(
  "telemetry enabled: more events",
  payrollWritePathTelemetryDump().eventCount > beforeDisableCount,
);

// --- Domain flush hook passive (handler still called; telemetry side-effect free on return) ---
localStorage.setItem("kw-week-employees", JSON.stringify(rich));
localStorage.setItem("kw-weekFrom", "2026-07-20");
localStorage.setItem("kw-weekTo", "2026-07-25");
let handlerRoster = null;
bindPayrollDomainPushHandler((r) => {
  handlerRoster = r;
});
schedulePayrollDomainPush(zeroed);
flushPayrollDomainPush();
assert("domain flush still invokes handler", handlerRoster === zeroed);
assert(
  "domain flush emits write_path",
  payrollWritePathTelemetryDump().events.some((e) => e.source === "domain_push_flush"),
);
cancelPayrollDomainPush();

installPayrollWritePathTelemetryGlobals();
assert("globals installed", typeof globalThis.__WG_PAYROLL_WRITE_PATH__?.dump === "function");

// Static hooks present
const domainSync = readFileSync("src/lib/payroll-domain-sync.ts", "utf8");
const pwrb = readFileSync("src/lib/payroll-week-roster-bundle.ts", "utf8");
const runtime = readFileSync("src/lib/payroll-runtime-trace.ts", "utf8");
assert("hook domain flush", domainSync.includes("emitPayrollWritePathTelemetry"));
assert("hook pwrPush", pwrb.includes('source: "pwrPush"'));
assert("hook pwrRemove", pwrb.includes('source: "pwrRemove"'));
assert("hook pwrAdd", pwrb.includes('source: "pwrAdd"'));
assert("emitWritePath API", runtime.includes("payrollTraceEmitWritePath"));
assert("general emit still gated", runtime.includes("if (!isPayrollTraceEnabled()) return"));

// Passive: emit must not throw on bad input
let threw = false;
try {
  emitPayrollWritePathTelemetry({
    source: "pwrPush",
    weekFrom: "",
    weekTo: "",
    rosterAfter: null,
  });
} catch {
  threw = true;
}
assert("passive: bad input no throw", threw === false);

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
