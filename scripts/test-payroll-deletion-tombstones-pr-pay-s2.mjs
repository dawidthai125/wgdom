/**
 * PR-PAY-S2 — Payroll Deletion Tombstones (P0 „wskrzeszanie” usuniętych).
 * npx vite-node scripts/test-payroll-deletion-tombstones-pr-pay-s2.mjs
 *
 * Golden:
 *  - deleted employee survives sync
 *  - deleted employee survives restore
 *  - deleted employee not resurrected
 *  - tombstone overrides union
 *  - same-week sync still works (bez tombstone)
 *  - week-scoped: tombstone tygodnia A nie blokuje tygodnia B
 */
import { defaultDay } from "../src/app/app-domain.ts";
import {
  mergeWeekEmployeesForWeekRange,
  weekEmployeeTombstoneId,
  mergeDeletedWeekEmployeeKeys,
  deletedWeekEmployeeMergeKeySet,
  filterDeletedWeekEmployees,
} from "../src/lib/cloud-sync.ts";

const CUR = { from: "2026-06-23", to: "2026-06-28" };
const NEXT = { from: "2026-06-30", to: "2026-07-05" };
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];

function activeDays() {
  const d = defaultDay();
  return Object.fromEntries(
    DAYS.map((k) => [k, k === "So" ? d : { ...d, active: true, from: "07:00", to: "16:00" }]),
  );
}
function makeEmp(id, name) {
  return {
    id, directoryId: `dir-${id}`, name,
    phone: "+48 500 000 001", position: "Pracownik", rate: "50",
    days: activeDays(), prevSaturday: defaultDay(), extraCosts: [], settled: false,
  };
}

let pass = 0;
let fail = 0;
function assert(name, cond) {
  if (cond) { pass += 1; console.log("PASS", name); }
  else { fail += 1; console.log("FAIL", name); }
}
function ids(list) {
  return (Array.isArray(list) ? list : []).map((e) => e.id).sort();
}
function dirKeys(list) {
  return (Array.isArray(list) ? list : []).map((e) => e.directoryId).filter(Boolean).sort();
}
/** wołanie jak sync/restore, z jawną listą tombstones. */
function merge(localFrom, localTo, localEmps, cloudFrom, cloudTo, cloudEmps, deleted, archive = []) {
  return mergeWeekEmployeesForWeekRange(
    CUR.from, CUR.to, localFrom, localTo, localEmps, cloudFrom, cloudTo, cloudEmps, archive, deleted,
  );
}

console.log("=== PR-PAY-S2 PAYROLL DELETION TOMBSTONES ===\n");

const eJan = makeEmp("e1", "Jan Kowalski");
const eAnna = makeEmp("e2", "Anna Nowak");
const ePiotr = makeEmp("e3", "Piotr Zieliński");
const tombAnna = [weekEmployeeTombstoneId(CUR.from, CUR.to, eAnna)];

// ─── 1. DELETED EMPLOYEE SURVIVES SYNC ──────────────────────────────────────
{
  // lokal po usunięciu Anny; chmura (ten sam tydzień) nadal ma Annę
  const local = [eJan];
  const cloud = [eJan, eAnna];
  const merged = merge(CUR.from, CUR.to, local, CUR.from, CUR.to, cloud, tombAnna);
  assert("sync: Anna NOT resurrected", !ids(merged).includes("e2"));
  assert("sync: Jan preserved", ids(merged).includes("e1"));
  assert("sync: Anna dir absent", !dirKeys(merged).includes("dir-e2"));
}

// ─── 2. DELETED EMPLOYEE SURVIVES RESTORE ───────────────────────────────────
{
  // restorePayrollFromCloud: chmura bieżącego tygodnia z Anną, tombstone lokalny
  const localCurrent = [eJan];
  const cloudCurrent = [eJan, eAnna, ePiotr];
  const restored = merge(CUR.from, CUR.to, localCurrent, CUR.from, CUR.to, cloudCurrent, tombAnna);
  assert("restore: Anna stays deleted", !ids(restored).includes("e2"));
  assert("restore: Piotr (nietombstoned) present", ids(restored).includes("e3"));
}

// ─── 3. DELETED EMPLOYEE NOT RESURRECTED (idempotencja) ─────────────────────
{
  const local = [eJan];
  const cloud = [eJan, eAnna];
  const once = merge(CUR.from, CUR.to, local, CUR.from, CUR.to, cloud, tombAnna);
  const twice = merge(CUR.from, CUR.to, once, CUR.from, CUR.to, cloud, tombAnna);
  assert("no-resurrect: 1st pass clean", !ids(once).includes("e2"));
  assert("no-resurrect: 2nd pass clean", !ids(twice).includes("e2"));
  assert("no-resurrect: stable", JSON.stringify(ids(once)) === JSON.stringify(ids(twice)));
}

// ─── 4. TOMBSTONE OVERRIDES UNION ───────────────────────────────────────────
{
  // UNION dodałby Annę (obecna po obu stronach), ale tombstone ją wycina
  const local = [eJan, eAnna];
  const cloud = [eAnna, ePiotr];
  const merged = merge(CUR.from, CUR.to, local, CUR.from, CUR.to, cloud, tombAnna);
  assert("override: Anna removed from both sides", !ids(merged).includes("e2"));
  assert("override: union keeps Jan+Piotr", ids(merged).includes("e1") && ids(merged).includes("e3"));
}

// ─── 5. SAME-WEEK SYNC STILL WORKS (brak tombstone) ─────────────────────────
{
  const local = [eJan, eAnna];
  const cloud = [eAnna, ePiotr];
  const merged = merge(CUR.from, CUR.to, local, CUR.from, CUR.to, cloud, []);
  assert("no-tombstone: full union e1+e2+e3", JSON.stringify(ids(merged)) === JSON.stringify(["e1", "e2", "e3"]));
  assert("no-tombstone: hours preserved", merged.find((e) => e.id === "e1")?.days?.Pn?.active === true);
}

// ─── 6. WEEK-SCOPED: tombstone tygodnia CUR nie blokuje kolejnego tygodnia ───
{
  const set = deletedWeekEmployeeMergeKeySet(tombAnna, NEXT.from, NEXT.to);
  assert("week-scope: no Anna tombstone in NEXT week", set.size === 0);
  const nextRoster = filterDeletedWeekEmployees([eAnna, eJan], set);
  assert("week-scope: Anna allowed in NEXT week", ids(nextRoster).includes("e2"));
}

// ─── 7. UNION tombstonów (merge lokal+cloud tombstones) ─────────────────────
{
  const a = [weekEmployeeTombstoneId(CUR.from, CUR.to, eAnna)];
  const b = [weekEmployeeTombstoneId(CUR.from, CUR.to, ePiotr)];
  const union = mergeDeletedWeekEmployeeKeys(a, b);
  const set = deletedWeekEmployeeMergeKeySet(union, CUR.from, CUR.to);
  assert("union tombstones: both weeks-keys present", set.has("dir:dir-e2") && set.has("dir:dir-e3"));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
