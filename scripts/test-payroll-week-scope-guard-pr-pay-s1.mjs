/**
 * PR-PAY-S1 — Week Scope Hard Guard (P0 kontaminacja tygodnia).
 * npx vite-node scripts/test-payroll-week-scope-guard-pr-pay-s1.mjs
 *
 * Golden: foreign week ignored · restore respects week ·
 * no cross-week contamination · existing current week preserved.
 */
import { defaultDay } from "../src/app/app-domain.ts";
import {
  mergeWeekEmployees,
  mergeWeekEmployeesForWeekRange,
} from "../src/lib/cloud-sync.ts";

const CUR = { from: "2026-06-23", to: "2026-06-28" };
const FOREIGN = { from: "2026-06-16", to: "2026-06-21" };
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
/** target = CUR zawsze; wołanie jak w sync/restore. */
function guard(localFrom, localTo, localEmps, cloudFrom, cloudTo, cloudEmps, archive = []) {
  return mergeWeekEmployeesForWeekRange(
    CUR.from, CUR.to, localFrom, localTo, localEmps, cloudFrom, cloudTo, cloudEmps, archive,
  );
}

console.log("=== PR-PAY-S1 WEEK SCOPE HARD GUARD ===\n");

// ─── 1. FOREIGN WEEK IGNORED (localMatch && !cloudMatch) ────────────────────
{
  const local = [makeEmp("e1", "Jan Kowalski"), makeEmp("e2", "Anna Nowak")];
  const cloudForeign = [makeEmp("c1", "Obcy Tydzień")];
  const merged = guard(CUR.from, CUR.to, local, FOREIGN.from, FOREIGN.to, cloudForeign);
  assert("foreign cloud NOT added", JSON.stringify(ids(merged)) === JSON.stringify(["e1", "e2"]));
  assert("foreign cloud dir absent", !dirKeys(merged).includes("dir-c1"));
  assert("current-week hours preserved", merged.find((e) => e.id === "e1")?.days?.Pn?.active === true);
}

// ─── 2. RESTORE RESPECTS WEEK (local obcy, cloud bieżący) ───────────────────
{
  // symuluje restorePayrollFromCloud: local=bieżący tydzień state, cloud=inny tydzień
  const localCurrent = [makeEmp("e1", "Jan Kowalski")];
  const cloudForeign = [makeEmp("c1", "Obcy A"), makeEmp("c2", "Obcy B")];
  const restored = guard(CUR.from, CUR.to, localCurrent, FOREIGN.from, FOREIGN.to, cloudForeign);
  assert("restore keeps only current week", JSON.stringify(ids(restored)) === JSON.stringify(["e1"]));
  assert("restore drops foreign roster", dirKeys(restored).every((k) => k === "dir-e1"));
}

// ─── 3. NO CROSS-WEEK CONTAMINATION (!localMatch && cloudMatch) ─────────────
{
  const localForeign = [makeEmp("old1", "Stary Tydzień"), makeEmp("old2", "Stary 2")];
  const cloudCurrent = [makeEmp("c1", "Bieżący")];
  const merged = guard(FOREIGN.from, FOREIGN.to, localForeign, CUR.from, CUR.to, cloudCurrent);
  assert("foreign local NOT carried", JSON.stringify(ids(merged)) === JSON.stringify(["c1"]));
  assert("no old-week dir keys", !dirKeys(merged).some((k) => k === "dir-old1" || k === "dir-old2"));
}

// ─── 4. EXISTING CURRENT WEEK PRESERVED (localMatch && cloudMatch — bez zmian) ─
{
  const local = [makeEmp("e1", "Jan"), makeEmp("e2", "Anna")];
  const cloudCurrent = [makeEmp("e2", "Anna"), makeEmp("e3", "Piotr")];
  const merged = guard(CUR.from, CUR.to, local, CUR.from, CUR.to, cloudCurrent);
  const expected = mergeWeekEmployees(local, cloudCurrent);
  assert("same-week union unchanged", JSON.stringify(ids(merged)) === JSON.stringify(ids(expected)));
  assert("same-week keeps e1+e3", dirKeys(merged).includes("dir-e1") && dirKeys(merged).includes("dir-e3"));
  assert("same-week hours preserved", merged.find((e) => e.id === "e1")?.days?.Pn?.active === true);
}

// ─── 5. LOCAL-ONLY current week (cloud empty/foreign) preserved ─────────────
{
  const local = [makeEmp("e1", "Jan"), makeEmp("e2", "Anna")];
  const mergedEmptyCloud = guard(CUR.from, CUR.to, local, CUR.from, CUR.to, []);
  assert("current week preserved vs empty cloud", JSON.stringify(ids(mergedEmptyCloud)) === JSON.stringify(["e1", "e2"]));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
