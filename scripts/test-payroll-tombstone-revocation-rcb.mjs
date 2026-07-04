/**
 * SYNC-ARCH-01 RC-B-1 — tombstone revocation unit tests (RCB-T1…T5).
 * npx vite-node scripts/test-payroll-tombstone-revocation-rcb.mjs
 */
const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: (k) => { delete lsStore[k]; },
};

const { defaultDay } = await import("../src/app/app-domain.ts");
const {
  weekEmployeeTombstoneId,
  mergeWeekEmployeesForWeekRange,
  filterDeletedWeekEmployees,
  deletedWeekEmployeeMergeKeySet,
  saveDeletedWeekEmployeeKeys,
  removeDeletedWeekEmployeeKeysForWeek,
  reconcileTombstonesWithRoster,
  getDeletedWeekEmployeeKeys,
} = await import("../src/lib/cloud-sync.ts");

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
    id,
    directoryId: `dir-${id}`,
    name,
    phone: "+48 500 000 001",
    position: "Pracownik",
    rate: "50",
    days: activeDays(),
    prevSaturday: defaultDay(),
    extraCosts: [],
    settled: false,
  };
}

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

console.log("=== RC-B-1 TOMBSTONE REVOCATION ===\n");
saveDeletedWeekEmployeeKeys([]);

const eJan = makeEmp("e1", "Jan");
const eAnna = makeEmp("e2", "Anna");
const tombAnna = weekEmployeeTombstoneId(CUR.from, CUR.to, eAnna);

// RCB-T1
{
  const ts = deletedWeekEmployeeMergeKeySet([tombAnna], CUR.from, CUR.to);
  const filtered = filterDeletedWeekEmployees([eJan, eAnna], ts);
  assert("RCB-T1: filter usuwa Annę", !filtered.some((e) => e.id === "e2"));
  assert("RCB-T1: tomb T obecny w zbiorze", ts.size === 1);
}

// RCB-T2
{
  saveDeletedWeekEmployeeKeys([tombAnna]);
  removeDeletedWeekEmployeeKeysForWeek(CUR.from, CUR.to, [eAnna]);
  const tombs = getDeletedWeekEmployeeKeys();
  const ts = deletedWeekEmployeeMergeKeySet(tombs, CUR.from, CUR.to);
  const filtered = filterDeletedWeekEmployees([eJan, eAnna], ts);
  assert("RCB-T2: po revoke T absent", !tombs.includes(tombAnna));
  assert("RCB-T2: Anna present po revoke", filtered.some((e) => e.id === "e2"));
}

// RCB-T3 — mergeAllDataKeys=11 → sanitize po revoke (symulacja)
{
  saveDeletedWeekEmployeeKeys([tombAnna]);
  const local = Array.from({ length: 10 }, (_, i) => makeEmp(`l${i}`, `L${i}`));
  const cloud = [...local, eAnna];
  removeDeletedWeekEmployeeKeysForWeek(CUR.from, CUR.to, [eAnna]);
  const merged = mergeWeekEmployeesForWeekRange(
    CUR.from,
    CUR.to,
    CUR.from,
    CUR.to,
    local,
    CUR.from,
    CUR.to,
    cloud,
    [],
    getDeletedWeekEmployeeKeys(),
  );
  assert("RCB-T3: sanitize po revoke = 11", merged.length === 11);
}

// RCB-T4
{
  saveDeletedWeekEmployeeKeys([tombAnna]);
  const tombs = reconcileTombstonesWithRoster(CUR.from, CUR.to, [eJan, eAnna]);
  assert("RCB-T4: reconcile G-0", !tombs.includes(tombAnna));
}

// RCB-T5 — week-scope
{
  const tombAnnaW2 = weekEmployeeTombstoneId(NEXT.from, NEXT.to, eAnna);
  saveDeletedWeekEmployeeKeys([tombAnna, tombAnnaW2]);
  removeDeletedWeekEmployeeKeysForWeek(CUR.from, CUR.to, [eAnna]);
  const tombs = getDeletedWeekEmployeeKeys();
  assert("RCB-T5: T w W1 usunięty", !tombs.includes(tombAnna));
  assert("RCB-T5: T w W2 nietknięty", tombs.includes(tombAnnaW2));
  saveDeletedWeekEmployeeKeys([]);
}

console.log(`\n=== RCB REVOCATION: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
