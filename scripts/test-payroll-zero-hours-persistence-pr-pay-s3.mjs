/**
 * PR-PAY-S3 — Zero Hours Persistence (P0: wyzerowane godziny wracają po Cloud Sync).
 * npx vite-node scripts/test-payroll-zero-hours-persistence-pr-pay-s3.mjs
 *
 * Golden:
 *  - cleared hours survive sync
 *  - cleared hours survive restore
 *  - clear overrides richness
 *  - same week merge still works
 *  - older clear loses to newer edit
 */
import {
  mergeWeekEmployees,
  mergeWeekEmployeeRecord,
  mergeDaysByRichness,
} from "../src/lib/cloud-sync.ts";

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass += 1; console.log("PASS", name); }
  else { fail += 1; console.log("FAIL", name); }
}

const T_OLD = "2026-06-22T10:00:00.000Z";
const T_NEW = "2026-06-22T12:00:00.000Z";

const active = () => ({ active: true, from: "08:00", to: "17:00", zaliczka: "" });
const activeRicher = () => ({ active: true, from: "07:00", to: "18:00", zaliczka: "100", extraHours: [{ id: "x", from: "18:00", to: "19:00", description: "" }] });
const cleared = () => ({ active: false, from: "", to: "", zaliczka: "" });
const clearedKeepTimes = () => ({ active: false, from: "07:00", to: "16:00", zaliczka: "" });

function emp(days, dataUpdatedAt) {
  return { id: "e1", directoryId: "dir-e1", name: "Jan Kowalski", rate: "50", days, dataUpdatedAt };
}
function pnActive(rec) { return rec?.days?.Pn?.active === true; }

console.log("=== PR-PAY-S3 ZERO HOURS PERSISTENCE ===\n");

// ─── 1. CLEARED HOURS SURVIVE SYNC (record tie — najczęstszy P0: brak bumpa ts) ─
{
  const local = emp({ Pn: cleared() }, T_OLD);
  const cloud = emp({ Pn: active() }, T_OLD); // ten sam ts (remis) → chmura NIE wskrzesza
  const merged = mergeWeekEmployeeRecord(local, cloud);
  assert("sync: Pn stays cleared", !pnActive(merged));
  assert("sync: no resurrected hours", merged.days?.Pn?.from === "");
}

// ─── 2. CLEARED HOURS SURVIVE RESTORE (lista, restore chmury do lokalu) ─────────
{
  const local = [emp({ Pn: cleared(), Wt: active() }, T_OLD)];
  const cloud = [emp({ Pn: active(), Wt: active() }, T_OLD)];
  const merged = mergeWeekEmployees(local, cloud);
  const rec = merged.find((e) => e.id === "e1");
  assert("restore: Pn stays cleared", !pnActive(rec));
  assert("restore: Wt untouched active", rec?.days?.Wt?.active === true);
}

// ─── 3. CLEAR OVERRIDES RICHNESS (remis → clear bije bogatszy dzień) ────────────
{
  const merged = mergeDaysByRichness({ Pn: clearedKeepTimes() }, { Pn: activeRicher() });
  assert("override: cleared beats richer", merged.Pn?.active === false);
  assert("override: no zaliczka resurrected", (merged.Pn?.zaliczka ?? "") === "");
  assert("override: no extraHours resurrected", (merged.Pn?.extraHours?.length ?? 0) === 0);
}

// ─── 4. SAME WEEK MERGE STILL WORKS (dwa aktywne dni → bogatszy wygrywa) ────────
{
  const merged = mergeDaysByRichness({ Pn: active() }, { Pn: activeRicher() });
  assert("same-week: richer active wins", merged.Pn?.zaliczka === "100");
  assert("same-week: richer to kept", merged.Pn?.to === "18:00");
  // aktywny lokalny vs pusty/cleared chmura → lokalny aktywny zostaje (bez utraty godzin)
  const merged2 = mergeDaysByRichness({ Pn: active() }, { Pn: cleared() });
  assert("same-week: local active not wiped by cloud clear", merged2.Pn?.active === true);
}

// ─── 5. OLDER CLEAR LOSES TO NEWER EDIT (ts decyduje — nowszy edit wygrywa) ─────
{
  const local = emp({ Pn: cleared() }, T_OLD);
  const cloud = emp({ Pn: active() }, T_NEW); // chmura nowsza → prawdziwy nowszy edit
  const merged = mergeWeekEmployeeRecord(local, cloud);
  assert("older-clear: newer edit wins", pnActive(merged));
  assert("older-clear: hours from newer", merged.days?.Pn?.from === "08:00");
}

// ─── 6. CLEAR NEWER WINS (świadomy clear z nowszym ts — obie strony) ────────────
{
  const localNew = mergeWeekEmployeeRecord(emp({ Pn: cleared() }, T_NEW), emp({ Pn: active() }, T_OLD));
  assert("clear-newer local wins", !pnActive(localNew));
  const cloudNew = mergeWeekEmployeeRecord(emp({ Pn: active() }, T_OLD), emp({ Pn: cleared() }, T_NEW));
  assert("clear-newer cloud wins", !pnActive(cloudNew));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
