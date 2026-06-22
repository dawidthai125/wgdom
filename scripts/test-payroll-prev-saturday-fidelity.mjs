/**
 * Payroll P2-A — prevSaturday richness merge (pickPrevSaturdayByTimestamps tie).
 * npx vite-node scripts/test-payroll-prev-saturday-fidelity.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import {
  mergePrevSaturdayByRichness,
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

const inactive = { active: false, from: "07:00", to: "16:00", zaliczka: "" };
const active8h = { active: true, from: "08:00", to: "17:00", zaliczka: "" };
const activeCloud8h = { active: true, from: "09:00", to: "17:00", zaliczka: "" };
const activeRicher = {
  active: true,
  from: "08:00",
  to: "17:00",
  zaliczka: "100",
  notes: [{ id: "n1", text: "Prace na obiekcie" }],
};

console.log("=== PAYROLL PREV SATURDAY FIDELITY ===\n");

// T1 — local active 8h, cloud inactive, tie → local
console.log("T1 local active, cloud inactive, tie");
{
  const merged = mergePrevSaturdayByRichness(active8h, inactive);
  assert("T1 active", merged?.active === true);
  assert("T1 from", merged?.from === "08:00");
  assert("T1 to", merged?.to === "17:00");
}

// T2 — local inactive, cloud active 8h, tie → cloud
console.log("\nT2 local inactive, cloud active, tie");
{
  const merged = mergePrevSaturdayByRichness(inactive, activeCloud8h);
  assert("T2 active", merged?.active === true);
  assert("T2 from", merged?.from === "09:00");
}

// T3 — both active, local richer, tie → local
console.log("\nT3 both active — local richer, tie");
{
  const merged = mergePrevSaturdayByRichness(activeRicher, active8h);
  assert("T3 zaliczka", merged?.zaliczka === "100");
  assert("T3 notes", (merged?.notes?.length ?? 0) === 1);
}

// T4 — local newer dataUpdatedAt → local prevSaturday
console.log("\nT4 local newer dataUpdatedAt");
{
  const local = {
    id: "e1",
    prevSaturday: active8h,
    dataUpdatedAt: "2026-06-22T12:00:00.000Z",
  };
  const cloud = {
    id: "e1",
    prevSaturday: inactive,
    dataUpdatedAt: "2026-06-22T10:00:00.000Z",
  };
  const merged = mergeWeekEmployeeRecord(local, cloud);
  assert("T4 active", merged.prevSaturday?.active === true);
  assert("T4 hours kept", merged.prevSaturday?.from === "08:00");
}

// T5 — cloud newer dataUpdatedAt → cloud prevSaturday
console.log("\nT5 cloud newer dataUpdatedAt");
{
  const local = {
    id: "e1",
    prevSaturday: active8h,
    dataUpdatedAt: "2026-06-22T10:00:00.000Z",
  };
  const cloud = {
    id: "e1",
    prevSaturday: activeCloud8h,
    dataUpdatedAt: "2026-06-22T12:00:00.000Z",
  };
  const merged = mergeWeekEmployeeRecord(local, cloud);
  assert("T5 cloud from", merged.prevSaturday?.from === "09:00");
  assert("T5 cloud to", merged.prevSaturday?.to === "17:00");
}

// T6 — real payroll: local prevSaturday vs cloud default, tie → preserved
console.log("\nT6 real payroll — tie, cloud default inactive");
{
  const days = defaultDay();
  const local = {
    id: "e1",
    days: { Pn: days, Wt: days, Sr: days, Cz: days, Pt: days, So: days },
    prevSaturday: { active: true, from: "08:00", to: "17:00", zaliczka: "" },
    dataUpdatedAt: "2026-06-22T11:00:00.000Z",
  };
  const cloud = {
    id: "e1",
    days: { Pn: days, Wt: days, Sr: days, Cz: days, Pt: days, So: days },
    prevSaturday: { active: false, from: "07:00", to: "16:00", zaliczka: "" },
    dataUpdatedAt: "2026-06-22T11:00:00.000Z",
  };
  const merged = mergeWeekEmployeeRecord(local, cloud);
  assert("T6 still active", merged.prevSaturday?.active === true);
  assert("T6 08:00", merged.prevSaturday?.from === "08:00");
  assert("T6 17:00", merged.prevSaturday?.to === "17:00");
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
if (fail > 0) process.exit(1);
