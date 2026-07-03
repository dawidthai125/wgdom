/**
 * PR-PAY-S7-5 ETAP 1 — Resurrection Guard (cross-device tombstones).
 * npx vite-node scripts/test-payroll-resurrection-guard-s7-5.mjs
 *
 * Zakres ETAP 1 = S7-5-1 (współdzielenie tombstonów week-employees) +
 * S7-5-2 (Edge tombstone-aware PRZED UNION). Czysta logika, bez sieci.
 * Reuse First: testy operują na wyeksportowanych funkcjach klienta
 * (deletedWeekEmployeeMergeKeySet / filterDeletedWeekEmployees /
 * mergeWeekEmployeesForWeekRange / mergeDeletedWeekEmployeeKeys) oraz na
 * współdzielonym kernelu union (mergeWeekEmployeesList) — który Edge mirroruje.
 *
 * Pokrycie AC: AC1 (T1), AC1/AC2 (T2), AC8 (T3), AC3 (T4), AC9 (T7),
 * AC10 (T8), AC11 (T9).
 */
import { defaultDay } from "../src/app/app-domain.ts";
import {
  mergeWeekEmployeesForWeekRange,
  weekEmployeeTombstoneId,
  mergeDeletedWeekEmployeeKeys,
  deletedWeekEmployeeMergeKeySet,
  filterDeletedWeekEmployees,
} from "../src/lib/cloud-sync.ts";
import { mergeWeekEmployeesList } from "../src/lib/payroll-week-employee-merge.ts";

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
function merge(localEmps, cloudEmps, deleted, archive = []) {
  return mergeWeekEmployeesForWeekRange(
    CUR.from, CUR.to, CUR.from, CUR.to, localEmps, CUR.from, CUR.to, cloudEmps, archive, deleted,
  );
}
/** Symulacja Edge batch-set (parytet): filtr prev+next PRZED UNION. */
function edgeUnionWithTombstones(prev, next, deleted) {
  const tomb = deletedWeekEmployeeMergeKeySet(deleted, CUR.from, CUR.to);
  const prevF = filterDeletedWeekEmployees(prev, tomb);
  const nextF = filterDeletedWeekEmployees(next, tomb);
  return mergeWeekEmployeesList(prevF, nextF, (a, b) => ({ ...a, ...b }));
}

console.log("=== PR-PAY-S7-5 ETAP 1 RESURRECTION GUARD ===\n");

// Roster: e1..e10 stały + Mikołaj (m) + Tomek (t)
const roster10 = Array.from({ length: 10 }, (_, i) => makeEmp(`e${i + 1}`, `Prac ${i + 1}`));
const eM = makeEmp("m", "Mikołaj");
const eT = makeEmp("t", "Tomek");
const roster12 = [...roster10, eM, eT];
const tombMT = [
  weekEmployeeTombstoneId(CUR.from, CUR.to, eM),
  weekEmployeeTombstoneId(CUR.from, CUR.to, eT),
];

// ─── T1 — push bundla niesie niepustą listę tombstonów (S7-5-1 / AC1) ───────
{
  const localTomb = [weekEmployeeTombstoneId(CUR.from, CUR.to, eM)];
  const cloudTomb = [weekEmployeeTombstoneId(CUR.from, CUR.to, eT)];
  const union = mergeDeletedWeekEmployeeKeys(localTomb, cloudTomb);
  assert("T1 union tombstonów niepusty (do push)", union.length === 2);
  assert("T1 zawiera obie tożsamości", new Set(union).size === 2);
}

// ─── T2 — pull scala tombstony chmury z lokalnymi i filtruje (S7-5-1 / AC1) ─
{
  const localTomb = []; // to urządzenie nie kasowało
  const cloudTomb = tombMT; // usunięcie przyszło z innego urządzenia
  const shared = mergeDeletedWeekEmployeeKeys(localTomb, cloudTomb);
  const set = deletedWeekEmployeeMergeKeySet(shared, CUR.from, CUR.to);
  assert("T2 scalony zbiór ma M+T", set.has("dir:dir-m") && set.has("dir:dir-t"));
  const filtered = filterDeletedWeekEmployees(roster12, set);
  assert("T2 filtr usuwa M+T po scaleniu z chmury", !ids(filtered).includes("m") && !ids(filtered).includes("t"));
}

// ─── T3 — cross-device tombstone: merge klienta usuwa (nie UNION-uje) (AC8) ─
{
  // local ma rekord (bo nie kasował), cloud też ma rekord; tombstone z chmury
  const merged = merge(roster12, roster12, tombMT);
  assert("T3 M nie wraca w merge klienta", !ids(merged).includes("m"));
  assert("T3 T nie wraca w merge klienta", !ids(merged).includes("t"));
  assert("T3 pozostałych 10 zachowanych", ids(merged).length === 10);
}

// ─── T4 — Edge (symulacja): filtr prev PRZED UNION mimo roster-expansion (AC3) ─
{
  const prev = roster12; // chmura ma jeszcze M+T
  const next = roster12; // przychodzący push też (urządzenie bez tombstona)
  const edged = edgeUnionWithTombstones(prev, next, tombMT);
  assert("T4 Edge nie re-dodaje M (UNION po filtrze)", !ids(edged).includes("m"));
  assert("T4 Edge nie re-dodaje T", !ids(edged).includes("t"));
  assert("T4 Edge zachowuje 10", ids(edged).length === 10);
  const noTomb = edgeUnionWithTombstones(prev, next, []);
  assert("T4 bez tombstona Edge robi pełny UNION (12)", ids(noTomb).length === 12);
}

// ─── T7 — konwergencja 2 urządzeń A=10 / B=12 → 10 (AC9) ────────────────────
{
  // A skasował M+T (ma tombstony), B nie. Po współdzieleniu tombstonów oba = 10.
  const shared = mergeDeletedWeekEmployeeKeys(tombMT, []); // tombstony trafiają do chmury i do B
  const aMerged = merge(roster10, roster12, shared); // A: local 10, cloud 12 (od B)
  const bMerged = merge(roster12, roster10, shared); // B: po pull tombstonów, local 12, cloud 10
  assert("T7 A = 10", ids(aMerged).length === 10);
  assert("T7 B = 10", ids(bMerged).length === 10);
  assert("T7 identyczny roster A==B", JSON.stringify(ids(aMerged)) === JSON.stringify(ids(bMerged)));
  assert("T7 M+T nieobecni u obu", !ids(aMerged).includes("m") && !ids(bMerged).includes("t"));
}

// ─── T8 — urządzenie offline wraca, nie odtwarza usuniętych (AC10) ──────────
{
  // C było offline z rosterem 12 (bez tombstonów). Chmura ma tombstony M+T + roster 10.
  const cloudTomb = tombMT;
  const cLocalTomb = [];
  const cShared = mergeDeletedWeekEmployeeKeys(cLocalTomb, cloudTomb); // pull scala tombstony
  const cMerged = merge(roster12, roster10, cShared); // local 12 (zaległy), cloud 10
  assert("T8 C po powrocie = 10", ids(cMerged).length === 10);
  assert("T8 C nie re-dodaje M", !ids(cMerged).includes("m"));
  assert("T8 C nie re-dodaje T", !ids(cMerged).includes("t"));
}

// ─── T9 — konwergencja 3 urządzeń A/B/C → identyczny roster (AC11) ──────────
{
  // Tombstone ustawiony tylko na A. Union propaguje do B i C.
  const tombOnA = [weekEmployeeTombstoneId(CUR.from, CUR.to, eM)];
  const shared = mergeDeletedWeekEmployeeKeys(mergeDeletedWeekEmployeeKeys(tombOnA, []), []);
  const roster11 = [...roster10, eT]; // po usunięciu tylko M zostaje 11 (M usunięty, T zostaje)
  const a = merge(roster10.concat(eT), roster12, shared);
  const b = merge(roster12, roster10.concat(eT), shared);
  const c = merge(roster12, roster12, shared);
  assert("T9 A nie ma M", !ids(a).includes("m"));
  assert("T9 B nie ma M", !ids(b).includes("m"));
  assert("T9 C nie ma M", !ids(c).includes("m"));
  assert("T9 T (nietombstoned) obecny u wszystkich", ids(a).includes("t") && ids(b).includes("t") && ids(c).includes("t"));
  assert("T9 identyczny roster A==B==C", JSON.stringify(ids(a)) === JSON.stringify(ids(b)) && JSON.stringify(ids(b)) === JSON.stringify(ids(c)));
  assert("T9 roster = 11 (10 + T)", ids(a).length === 11 && JSON.stringify(ids(a)) === JSON.stringify(ids(roster11)));
}

console.log(`\n=== ${pass} PASS / ${fail} FAIL ===`);
process.exit(fail > 0 ? 1 : 0);
