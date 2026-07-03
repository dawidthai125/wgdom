/**
 * Payroll P0 — per-day merge fidelity (pickDaysByTimestamps tie → mergeDaysByRichness).
 * npx vite-node scripts/test-payroll-day-merge-fidelity.mjs
 */
import { defaultDay, defaultDays } from "../src/app/app-domain.ts";
import {
  mergeDaysByRichness,
  mergeWeekEmployeeRecord,
} from "../src/lib/cloud-sync.ts";

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

const inactivePn = { active: false, from: "07:00", to: "16:00", zaliczka: "" };
const activePn = { active: true, from: "08:00", to: "17:00", zaliczka: "" };
const activePnRicher = { active: true, from: "07:00", to: "18:00", zaliczka: "100", extraHours: [{ id: "x", from: "18:00", to: "19:00", description: "" }] };
const activePnCloud = { active: true, from: "09:00", to: "15:00", zaliczka: "" };

console.log("=== PAYROLL DAY MERGE FIDELITY ===\n");

// T1 — local active + hours, cloud inactive, tie timestamp → local
console.log("T1 local active, cloud inactive, tie");
{
  const merged = mergeDaysByRichness({ Pn: activePn }, { Pn: inactivePn });
  assert("T1 Pn active", merged.Pn?.active === true);
  assert("T1 Pn from", merged.Pn?.from === "08:00");
  assert("T1 Pn to", merged.Pn?.to === "17:00");
}

// T2 — local cleared (inactive), cloud active + hours, tie → local clear wins (PR-PAY-S3)
console.log("\nT2 local cleared, cloud active, tie → clear wins (PR-PAY-S3)");
{
  const merged = mergeDaysByRichness({ Pn: inactivePn }, { Pn: activePnCloud });
  assert("T2 Pn cleared (inactive)", merged.Pn?.active === false);
  assert("T2 Pn local from kept", merged.Pn?.from === "07:00");
}

// T3 — both active, richer day wins
console.log("\nT3 both active — richer wins");
{
  const merged = mergeDaysByRichness({ Pn: activePn }, { Pn: activePnRicher });
  assert("T3 richer cloud zaliczka", merged.Pn?.zaliczka === "100");
  assert("T3 richer cloud to", merged.Pn?.to === "18:00");
}

// T4 — local newer timestamp → local days
console.log("\nT4 local newer dataUpdatedAt");
{
  const local = { id: "e1", days: { Pn: activePn }, dataUpdatedAt: "2026-06-22T12:00:00.000Z" };
  const cloud = { id: "e1", days: { Pn: inactivePn }, dataUpdatedAt: "2026-06-22T10:00:00.000Z" };
  const merged = mergeWeekEmployeeRecord(local, cloud);
  assert("T4 Pn active", merged.days?.Pn?.active === true);
  assert("T4 Pn hours kept", merged.days?.Pn?.from === "08:00");
}

// T5 — cloud newer timestamp → cloud days
console.log("\nT5 cloud newer dataUpdatedAt");
{
  const local = { id: "e1", days: { Pn: activePn }, dataUpdatedAt: "2026-06-22T10:00:00.000Z" };
  const cloud = { id: "e1", days: { Pn: activePnCloud }, dataUpdatedAt: "2026-06-22T12:00:00.000Z" };
  const merged = mergeWeekEmployeeRecord(local, cloud);
  assert("T5 cloud from", merged.days?.Pn?.from === "09:00");
  assert("T5 cloud to", merged.days?.Pn?.to === "15:00");
}

// T6 — real payroll: Pn 08–17 local vs cloud default inactive, tie → hours preserved
console.log("\nT6 real payroll case — tie, default cloud inactive");
{
  const days = defaultDays();
  days.Pn = { active: true, from: "08:00", to: "17:00", zaliczka: "" };
  const local = { id: "e1", name: "Jan", days, dataUpdatedAt: undefined };
  const cloud = { id: "e1", name: "Jan", days: defaultDays(), dataUpdatedAt: undefined };
  const merged = mergeWeekEmployeeRecord(local, cloud);
  assert("T6 Pn still active", merged.days?.Pn?.active === true);
  assert("T6 Pn 08:00", merged.days?.Pn?.from === "08:00");
  assert("T6 Pn 17:00", merged.days?.Pn?.to === "17:00");
  const hours = merged.days?.Pn?.active && merged.days.Pn.from === "08:00" && merged.days.Pn.to === "17:00";
  assert("T6 hours preserved", hours);
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
