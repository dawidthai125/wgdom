/**
 * SYNC-ARCH-01 RC-B-1 — PWRB boundary + G-0 regression tests.
 * npx vite-node scripts/test-pwrb-boundary-rcb.mjs
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
  saveDeletedWeekEmployeeKeys,
  filterDeletedWeekEmployees,
  deletedWeekEmployeeMergeKeySet,
  removeDeletedWeekEmployeeKeysForWeek,
} = await import("../src/lib/cloud-sync.ts");
const {
  pwrReconcile,
  pwrImportMerge,
} = await import("../src/lib/payroll-week-roster-bundle.ts");
const { readFileSync, readdirSync, statSync } = await import("node:fs");
const { join, relative } = await import("node:path");

const CUR = { from: "2026-06-23", to: "2026-06-28" };
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

// BND-T1 — forbidden imports in src/app
{
  const ROOT = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
  const appDir = join(ROOT, "src", "app");
  const forbidden = [];
  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx?)$/.test(name)) {
        const t = readFileSync(p, "utf8");
        if (/addDeletedWeekEmployeeKey|pushWeekEmployeesToCloud/.test(t)) {
          forbidden.push(relative(appDir, p));
        }
      }
    }
  }
  walk(appDir);
  assert("BND-T1: src/app bez forbidden PWRB imports", forbidden.length === 0);
}

// BND-T2 — pwrReconcile strips tomb when roster has X
{
  const anna = makeEmp("e2", "Anna");
  const tomb = weekEmployeeTombstoneId(CUR.from, CUR.to, anna);
  saveDeletedWeekEmployeeKeys([tomb]);
  const tombs = pwrReconcile({ weekFrom: CUR.from, weekTo: CUR.to, roster: [anna] });
  assert("BND-T2: reconcile usuwa T gdy roster ma X", !tombs.includes(tomb));
  saveDeletedWeekEmployeeKeys([]);
}

// BND-T3 — remove tomb → revoke on re-add → G-0
{
  saveDeletedWeekEmployeeKeys([]);
  const jan = makeEmp("e1", "Jan");
  const anna = makeEmp("e2", "Anna");
  const tomb = weekEmployeeTombstoneId(CUR.from, CUR.to, anna);
  saveDeletedWeekEmployeeKeys([tomb]);
  const afterAdd = [jan, anna];
  removeDeletedWeekEmployeeKeysForWeek(CUR.from, CUR.to, [anna]);
  const tombs = pwrReconcile({ weekFrom: CUR.from, weekTo: CUR.to, roster: afterAdd });
  assert("BND-T3: G-0 po re-add — brak tomb", !tombs.includes(tomb));
  const ts = deletedWeekEmployeeMergeKeySet(tombs, CUR.from, CUR.to);
  const filtered = filterDeletedWeekEmployees(afterAdd, ts);
  assert("BND-T3: filter zachowuje oba wpisy", filtered.length === afterAdd.length);
  saveDeletedWeekEmployeeKeys([]);
}

// BND-T4 — pwrImportMerge ze stale tombs
{
  const jan = makeEmp("e1", "Jan");
  const anna = makeEmp("e2", "Anna");
  const tomb = weekEmployeeTombstoneId(CUR.from, CUR.to, anna);
  const { roster, tombstones } = pwrImportMerge({
    weekFrom: CUR.from,
    weekTo: CUR.to,
    localRoster: [jan],
    importedRoster: [jan, anna],
    localTombs: [],
    importedTombs: [tomb],
  });
  assert("BND-T4: import merge roster ma Annę", roster.some((e) => e.directoryId === "dir-e2"));
  assert("BND-T4: I-3 — tomb usunięty", !tombstones.includes(tomb));
  saveDeletedWeekEmployeeKeys([]);
}

console.log(`\n=== PWRB BOUNDARY RCB: ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
