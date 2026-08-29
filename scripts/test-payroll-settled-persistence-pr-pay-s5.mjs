/**
 * PR-PAY-S5 — Payroll Settled Status Persistence (Golden Regression).
 *
 * Chroni świadomą decyzję użytkownika Rozliczony → Oczekujący przed samoczynnym
 * powrotem po Cloud Sync / Bootstrap / Restore / finalizePayrollBundleMerge.
 *
 * Zakres: WYŁĄCZNIE status settled/settledUpdatedAt. Bez zmian godzin/dni,
 * zero-hours, tombstones, archive, rollover, carry-forward.
 *
 * Run: npx vite-node scripts/test-payroll-settled-persistence-pr-pay-s5.mjs
 */
import {
  DATA_KEYS,
  finalizePayrollBundleMerge,
  applyBootstrapPayrollMerge,
  mergeWeekEmployeeRecord,
  mergeWeekEmployees,
  mergeWeekEmployeesForWeekRange,
} from "../src/lib/cloud-sync.ts";

let pass = true;
const results = [];
function assert(label, cond) {
  results.push({ label, ok: !!cond });
  if (!cond) {
    pass = false;
    console.error("FAIL:", label);
  }
}

const EMP_IDX = DATA_KEYS.indexOf("kw-week-employees");
const FROM_IDX = DATA_KEYS.indexOf("kw-weekFrom");
const TO_IDX = DATA_KEYS.indexOf("kw-weekTo");
const ARCH_IDX = DATA_KEYS.indexOf("kw-archive");

const WEEK_FROM = "2026-06-08";
const WEEK_TO = "2026-06-14";

const NEW_TS = "2026-06-12T10:00:00.000Z"; // świadome cofnięcie użytkownika
const OLD_TS = "2026-06-09T08:00:00.000Z"; // starszy status z chmury
/** dataUpdatedAt ≠ settledUpdatedAt (>1.5s) — świadome cofnięcie, nie spurious sync-bug. */
const GENUINE_DATA_TS = "2026-06-12T09:00:00.000Z";

/** Bogaty skład (więcej aktywnych dni/godzin) — wymusza richness override w finalize. */
function richDays() {
  return {
    Pn: { active: true, from: "07:00", to: "16:00" },
    Wt: { active: true, from: "07:00", to: "16:00" },
    Sr: { active: true, from: "07:00", to: "15:00" },
  };
}
function leanDays() {
  return { Pn: { active: true, from: "07:00", to: "12:00" } };
}

function emp(overrides) {
  return { id: "e1", name: "Jan", rate: "30", days: leanDays(), ...overrides };
}

function bundle(emps, from = WEEK_FROM, to = WEEK_TO) {
  const b = new Array(DATA_KEYS.length).fill(undefined);
  b[EMP_IDX] = emps;
  b[ARCH_IDX] = [];
  b[FROM_IDX] = from;
  b[TO_IDX] = to;
  return b;
}

// Lokalnie: świadome cofnięcie (settled=false, świeży settledUpdatedAt, dataUpdatedAt starsze).
// Chmura: settled=true (starszy), skład bogatszy.
const localEmp = emp({
  settled: false,
  settledUpdatedAt: NEW_TS,
  dataUpdatedAt: GENUINE_DATA_TS,
  days: leanDays(),
});
const cloudEmp = emp({ settled: true, settledUpdatedAt: OLD_TS, dataUpdatedAt: OLD_TS, days: richDays() });

// ---------------------------------------------------------------------------
// 1) local unsettled survives sync (finalizePayrollBundleMerge, richness override)
// ---------------------------------------------------------------------------
{
  const merged = bundle([localEmp]);
  const out = finalizePayrollBundleMerge(merged, bundle([localEmp]), bundle([cloudEmp]));
  const roster = out[EMP_IDX];
  const r = roster && roster[0];
  assert("1. local unsettled survives sync — settled=false", r && r.settled === false);
  assert("1. richness override adoptuje bogatsze godziny z chmury (Wt active)", r && r.days?.Wt?.active === true);
}

// ---------------------------------------------------------------------------
// 2) local unsettled survives bootstrap (applyBootstrapPayrollMerge)
// ---------------------------------------------------------------------------
{
  const merged = bundle([localEmp]);
  const out = applyBootstrapPayrollMerge(merged, bundle([localEmp]), bundle([cloudEmp]));
  const r = out[EMP_IDX]?.[0];
  assert("2. local unsettled survives bootstrap — settled=false", r && r.settled === false);
}

// ---------------------------------------------------------------------------
// 3) local unsettled survives richness override — settledUpdatedAt zachowany (LOCAL)
// ---------------------------------------------------------------------------
{
  const out = finalizePayrollBundleMerge(bundle([localEmp]), bundle([localEmp]), bundle([cloudEmp]));
  const r = out[EMP_IDX]?.[0];
  assert("3. richness override — settled=false", r && r.settled === false);
  assert("3. richness override — settledUpdatedAt = lokalny (NEW)", r && r.settledUpdatedAt === NEW_TS);
}

// ---------------------------------------------------------------------------
// 4) cloud richer does not overwrite newer settledUpdatedAt (odwrotny kierunek):
//    lokalnie ROZLICZONE świeżo, chmura cofnięta starszym ts + bogatsza → zostaje true
// ---------------------------------------------------------------------------
{
  const localSettledFresh = emp({ settled: true, settledUpdatedAt: NEW_TS, dataUpdatedAt: NEW_TS, days: leanDays() });
  const cloudUnsettledOld = emp({ settled: false, settledUpdatedAt: OLD_TS, dataUpdatedAt: OLD_TS, days: richDays() });
  const out = finalizePayrollBundleMerge(
    bundle([localSettledFresh]),
    bundle([localSettledFresh]),
    bundle([cloudUnsettledOld]),
  );
  const r = out[EMP_IDX]?.[0];
  assert("4. cloud richer nie nadpisuje nowszego settledUpdatedAt — settled=true", r && r.settled === true);
  assert("4. settledUpdatedAt = lokalny (NEW)", r && r.settledUpdatedAt === NEW_TS);
}

// ---------------------------------------------------------------------------
// 5) legacy tie regression — brak settledUpdatedAt po obu stronach:
//    zachowujemy istniejące rozliczenie (OR), NIE gubimy settled=true
// ---------------------------------------------------------------------------
{
  const l = emp({ settled: false, days: leanDays() });
  const c = emp({ settled: true, days: leanDays() });
  const m = mergeWeekEmployeeRecord(l, c);
  assert("5. legacy (0/0) — rozliczenie nie ginie (settled=true)", m.settled === true);
}

// ---------------------------------------------------------------------------
// 5b) remis realny (równy settledUpdatedAt > 0) — świadome cofnięcie LOCAL wygrywa
// ---------------------------------------------------------------------------
{
  const l = emp({ settled: false, settledUpdatedAt: NEW_TS, dataUpdatedAt: NEW_TS });
  const c = emp({ settled: true, settledUpdatedAt: NEW_TS, dataUpdatedAt: OLD_TS });
  const m = mergeWeekEmployeeRecord(l, c);
  assert("5b. remis settledUpdatedAt — LOCAL cofnięcie wygrywa (settled=false)", m.settled === false);
}

// ---------------------------------------------------------------------------
// 6) restore preserves newer settled state (mergeWeekEmployeesForWeekRange)
// ---------------------------------------------------------------------------
{
  const merged = mergeWeekEmployeesForWeekRange(
    WEEK_FROM,
    WEEK_TO,
    WEEK_FROM,
    WEEK_TO,
    [localEmp],
    WEEK_FROM,
    WEEK_TO,
    [cloudEmp],
    [],
    [],
  );
  const r = merged?.[0];
  assert("6. restore preserves newer settled — settled=false", r && r.settled === false);
}

// ---------------------------------------------------------------------------
// 7) settled toggle remains idempotent — powtórny merge nie zmienia statusu
// ---------------------------------------------------------------------------
{
  const once = mergeWeekEmployeeRecord(localEmp, cloudEmp);
  const twice = mergeWeekEmployeeRecord(once, cloudEmp);
  const thrice = mergeWeekEmployeeRecord(twice, cloudEmp);
  assert("7. idempotent — settled stabilny (false)", once.settled === false && twice.settled === false && thrice.settled === false);
  assert("7. idempotent — settledUpdatedAt stabilny", once.settledUpdatedAt === twice.settledUpdatedAt && twice.settledUpdatedAt === thrice.settledUpdatedAt);
}

// ---------------------------------------------------------------------------
// 8) no regression same-week merge — czysty LWW po settledUpdatedAt (obie strony)
// ---------------------------------------------------------------------------
{
  // local rozliczone nowsze vs cloud cofnięte starsze → true
  const a = mergeWeekEmployeeRecord(
    emp({ settled: true, settledUpdatedAt: NEW_TS, dataUpdatedAt: NEW_TS }),
    emp({ settled: false, settledUpdatedAt: OLD_TS, dataUpdatedAt: OLD_TS }),
  );
  assert("8a. LWW — nowsze local settled=true wygrywa", a.settled === true);

  // cloud rozliczone nowsze (nie-spurious) vs local cofnięte starsze → true (cloud nowszy)
  const b = mergeWeekEmployeeRecord(
    emp({ settled: false, settledUpdatedAt: OLD_TS, dataUpdatedAt: "2026-06-01T00:00:00.000Z" }),
    emp({ settled: true, settledUpdatedAt: NEW_TS, dataUpdatedAt: OLD_TS }),
  );
  assert("8b. LWW — nowsze cloud settled=true wygrywa", b.settled === true);

  // godziny z chmury nie giną; świadome local unsettle (nie-spurious) → LWW false
  const c = mergeWeekEmployeeRecord(
    emp({
      settled: false,
      settledUpdatedAt: NEW_TS,
      dataUpdatedAt: GENUINE_DATA_TS,
      days: leanDays(),
    }),
    emp({ settled: true, settledUpdatedAt: OLD_TS, dataUpdatedAt: OLD_TS, days: richDays() }),
  );
  assert("8c. same-week merge — genuine local unsettle LWW → false", c.settled === false);
  assert("8c. same-week merge — dni z chmury zachowane (Wt)", c.days?.Wt?.active === true);

  // 8d) spurious local unsettle (settledUpdatedAt ≈ dataUpdatedAt) → cloud settled=true wins
  const d = mergeWeekEmployeeRecord(
    emp({ settled: false, settledUpdatedAt: NEW_TS, dataUpdatedAt: NEW_TS, days: leanDays() }),
    emp({ settled: true, settledUpdatedAt: OLD_TS, dataUpdatedAt: OLD_TS, days: richDays() }),
  );
  assert("8d. spurious local unsettle — cloud settled=true chronione", d.settled === true);
  assert("8d. spurious — dni z chmury zachowane (Wt)", d.days?.Wt?.active === true);
}

console.log(
  JSON.stringify(
    {
      test: "payroll-settled-persistence-pr-pay-s5",
      total: results.length,
      passed: results.filter((r) => r.ok).length,
      pass,
    },
    null,
    2,
  ),
);

process.exit(pass ? 0 : 1);
