/**
 * PAYROLL — confirmed day OFF must survive resume during domain-push debounce.
 * READ-ONLY unit harness (no Cloud / no production mutation).
 */
import assert from "node:assert/strict";
import {
  bindPayrollDomainPushHandler,
  cancelPayrollDomainPush,
  cancelPayrollDomainPushPreservingSettlement,
  hasPendingPayrollDomainPush,
  schedulePayrollDomainPush,
  unbindPayrollDomainPushHandler,
  __testPeekPayrollDomainPushPending,
  PAYROLL_DOMAIN_PUSH_DEBOUNCE_MS,
} from "../src/lib/payroll-domain-sync.ts";
import {
  deriveHoursIntentsFromLocalEdit,
  isHoursDownFullyAuthorized,
} from "../src/lib/payroll-hours-intent.ts";
import { detectHoursCollapse } from "../src/lib/payroll-hours-collapse-gate.ts";

const WF = "2026-08-31";
const WT = "2026-09-05";
const ID = "7793c935-af53-49cd-8f35-f0f4fc8ee62f";
const DIR = "6bafc80e-ee8c-4183-8e74-8750b7667d59";

function day(active, updatedAt) {
  return {
    active,
    from: "07:00",
    to: "16:00",
    zaliczka: "",
    ...(updatedAt ? { updatedAt } : {}),
  };
}

function emp(daysPatch = {}) {
  return {
    id: ID,
    directoryId: DIR,
    name: "Damianek",
    rate: "28",
    position: "Kombinator2",
    settled: false,
    days: {
      Pn: day(false),
      Wt: day(false),
      Sr: day(false),
      Cz: day(false),
      Pt: day(false),
      So: day(false),
      ...daysPatch,
    },
    prevSaturday: day(false),
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

let passed = 0;
function ok(name, cond) {
  assert.equal(cond, true, name);
  passed += 1;
  console.log("PASS", name);
}

const satOn = [emp({ So: day(true, "2026-09-04T19:48:17.564Z") })];
const satOff = [emp({ So: day(false, "2026-09-04T19:48:20.000Z") })];
const friOnSatOff = [
  emp({
    Pt: day(true, "2026-09-04T19:48:24.947Z"),
    So: day(false, "2026-09-04T19:48:20.000Z"),
  }),
];

// --- TEST 1: confirmed OFF → resume before debounce → flush survives ---
{
  cancelPayrollDomainPush();
  const flushes = [];
  bindPayrollDomainPushHandler((roster, options, before) => {
    flushes.push({ roster, options, before });
  });

  const collapse = detectHoursCollapse(satOn, satOff);
  ok("T1 D2 would fire hours_to_zero", collapse.length === 1 && collapse[0].reason === "hours_to_zero");

  const intents = deriveHoursIntentsFromLocalEdit(satOn, satOff, WF, WT);
  ok("T1 So intent 9→0", intents.length === 1 && intents[0].slot === "So" && intents[0].fromHours === 9 && intents[0].toHours === 0);

  // Simulate D2 CONFIRM path
  schedulePayrollDomainPush(
    satOff,
    { intentionalHoursClear: true, hoursIntents: intents },
    satOn,
  );
  ok("T1 pending after confirm", hasPendingPayrollDomainPush());

  // Resume during debounce — must flush, not drop
  cancelPayrollDomainPushPreservingSettlement();
  ok("T1 resume flushed once", flushes.length === 1);
  ok("T1 no pending after flush", !hasPendingPayrollDomainPush());
  ok("T1 flushed roster Sat inactive", flushes[0].roster[0].days.So.active === false);
  ok("T1 flushed So intent present", (flushes[0].options?.hoursIntents || []).some((i) => i.slot === "So" && i.toHours === 0));
  ok("T1 intentionalHoursClear kept", flushes[0].options?.intentionalHoursClear === true);

  unbindPayrollDomainPushHandler();
}

// --- TEST 2: Sat OFF + Fri ON combined pending → resume preserves both ---
{
  cancelPayrollDomainPush();
  const flushes = [];
  bindPayrollDomainPushHandler((roster, options) => {
    flushes.push({ roster, options });
  });

  const iOff = deriveHoursIntentsFromLocalEdit(satOn, satOff, WF, WT);
  schedulePayrollDomainPush(
    satOff,
    { intentionalHoursClear: true, hoursIntents: iOff },
    satOn,
  );

  const iFri = deriveHoursIntentsFromLocalEdit(satOff, friOnSatOff, WF, WT);
  schedulePayrollDomainPush(friOnSatOff, { hoursIntents: iFri }, satOff);

  ok("T2 pending combined", hasPendingPayrollDomainPush());
  const peek = __testPeekPayrollDomainPushPending();
  ok("T2 peek has pending", peek.hasPending === true);

  cancelPayrollDomainPushPreservingSettlement();
  ok("T2 resume one flush", flushes.length === 1);
  const r = flushes[0].roster[0];
  ok("T2 Sat OFF survived", r.days.So.active === false);
  ok("T2 Fri ON survived", r.days.Pt.active === true);
  const slots = new Set((flushes[0].options?.hoursIntents || []).map((i) => i.slot));
  ok("T2 merged intents include So+Pt", slots.has("So") && slots.has("Pt"));
  ok(
    "T2 So intent in flush options",
    (flushes[0].options?.hoursIntents || []).some((i) => i.slot === "So" && i.toHours === 0),
  );
  ok(
    "T2 Pt intent in flush options",
    (flushes[0].options?.hoursIntents || []).some((i) => i.slot === "Pt" && i.toHours === 9),
  );

  unbindPayrollDomainPushHandler();
}

// --- TEST 3: D2 CANCEL → no pending OFF ---
{
  cancelPayrollDomainPush();
  let flushed = 0;
  bindPayrollDomainPushHandler(() => {
    flushed += 1;
  });

  // Cancel path: commitLivePayrollRosterEdit returns false → cancelPayrollDomainPush, no schedule
  // Simulate: never schedule after cancel
  cancelPayrollDomainPush();
  ok("T3 no pending after cancel path", !hasPendingPayrollDomainPush());
  cancelPayrollDomainPushPreservingSettlement();
  ok("T3 resume no flush", flushed === 0);
  ok("T3 still no pending", !hasPendingPayrollDomainPush());

  unbindPayrollDomainPushHandler();
}

// --- TEST 4: no pending → resume no-op ---
{
  cancelPayrollDomainPush();
  let flushed = 0;
  bindPayrollDomainPushHandler(() => {
    flushed += 1;
  });
  ok("T4 no pending", !hasPendingPayrollDomainPush());
  cancelPayrollDomainPushPreservingSettlement();
  ok("T4 resume no write", flushed === 0);
  unbindPayrollDomainPushHandler();
}

// --- TEST 5: settlement pending still flushed (preservation) ---
{
  cancelPayrollDomainPush();
  const flushes = [];
  bindPayrollDomainPushHandler((_r, options) => {
    flushes.push(options);
  });
  schedulePayrollDomainPush(satOff, { settlementCloudAck: true }, satOn);
  ok("T5 settlement pending", __testPeekPayrollDomainPushPending().settlementCloudAck === true);
  cancelPayrollDomainPushPreservingSettlement();
  ok("T5 settlement flushed", flushes.length === 1 && flushes[0]?.settlementCloudAck === true);
  ok("T5 cleared", !hasPendingPayrollDomainPush());
  unbindPayrollDomainPushHandler();
}

// --- TEST 6: Guard authorization Cloud 9 → local 0 with intent ---
{
  const intents = deriveHoursIntentsFromLocalEdit(satOn, satOff, WF, WT);
  ok(
    "T6 hours-down authorized",
    isHoursDownFullyAuthorized(satOn, satOff, intents, WF, WT) === true,
  );
  ok(
    "T6 without intent unauthorized",
    isHoursDownFullyAuthorized(satOn, satOff, [], WF, WT) === false,
  );
}

// --- TEST 7: debounce still coalesces; resume flush uses final pending (CAS path intact at domain layer) ---
async function test7() {
  cancelPayrollDomainPush();
  const flushes = [];
  bindPayrollDomainPushHandler((roster) => {
    flushes.push(roster);
  });
  schedulePayrollDomainPush(satOff, { hoursIntents: deriveHoursIntentsFromLocalEdit(satOn, satOff, WF, WT) }, satOn);
  ok("T7 still pending before natural debounce", hasPendingPayrollDomainPush());
  ok("T7 debounce ms constant", PAYROLL_DOMAIN_PUSH_DEBOUNCE_MS === 1000);
  cancelPayrollDomainPushPreservingSettlement();
  ok("T7 flush via resume path (CAS-bound handler)", flushes.length === 1);
  ok("T7 final roster is OFF", flushes[0][0].days.So.active === false);
  await sleep(PAYROLL_DOMAIN_PUSH_DEBOUNCE_MS + 50);
  ok("T7 no double flush after timer", flushes.length === 1);
  unbindPayrollDomainPushHandler();
}

await test7();

console.log(`\nOK ${passed} assertions · payroll confirmed-off resume safety`);
