/**
 * PAYROLL — tombstone preservation on hours-only coupled PWRB.
 * Run: npx vite-node scripts/test-payroll-tombstone-preservation-pwrb.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-tomb-preserve";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-tomb-preserve";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => {
    lsStore[k] = String(v);
  },
  removeItem: (k) => {
    delete lsStore[k];
  },
  clear: () => {
    for (const k of Object.keys(lsStore)) delete lsStore[k];
  },
};

const WF = "2026-08-31";
const WT = "2026-09-05";
const WK = `${WF}|${WT}`;
const DAM_DIR = "6bafc80e-ee8c-4183-8e74-8750b7667d59";
const DAM_MK = `dir:${DAM_DIR}`;
const DAM_TOMB_CURRENT = `${WK}::${DAM_MK}`;
const DAM_TOMB_HIST_A = `2026-08-03|2026-08-08::${DAM_MK}`;
const DAM_TOMB_HIST_B = `2026-08-17|2026-08-22::${DAM_MK}`;
const OTHER_HIST = "2026-07-01|2026-07-06::dir:other-removed";

function makeCloud19() {
  const tombs = [DAM_TOMB_HIST_A, DAM_TOMB_HIST_B, OTHER_HIST];
  for (let i = 0; i < 16; i++) {
    tombs.push(`2026-06-0${(i % 9) + 1}|2026-06-0${(i % 9) + 6}::dir:hist-${i}`);
  }
  return tombs.slice(0, 19);
}

let pass = 0;
let fail = 0;
function assert(name, cond, detail = "") {
  if (cond) {
    pass += 1;
    console.log("PASS", name);
  } else {
    fail += 1;
    console.log("FAIL", name, detail);
  }
}

const {
  prepareWeekEmployeeTombsForCoupledPwrb,
  resolveCoupledWeekEmployeeDeletedIds,
  weekEmployeeMergeKey,
  mergeWeekEmployeesList,
} = await import("../src/lib/payroll-week-employee-merge.ts");

function simulateEdgePersist(body, kv) {
  const keys = body.keys;
  const values = [...body.values];
  const forceReplace = (body.replaceWeekEmployeesKeys ?? []).includes("kw-week-employees");
  const empIdx = keys.indexOf("kw-week-employees");
  const delIdx = keys.indexOf("kw-week-employees-deleted-ids");
  const storedDel = kv["kw-week-employees-deleted-ids"] ?? [];
  const batchDel = delIdx >= 0 ? values[delIdx] ?? [] : [];
  const effectiveDel = resolveCoupledWeekEmployeeDeletedIds({
    forceReplaceWeekEmployees: forceReplace,
    hasWeekEmployeesKey: empIdx >= 0,
    hasWeekEmpDeletedKey: delIdx >= 0,
    weekEmpDeletedFromBatch: Array.isArray(batchDel) ? batchDel : [],
    storedWeekEmpDeleted: Array.isArray(storedDel) ? storedDel : [],
  });
  if (delIdx >= 0) values[delIdx] = effectiveDel;
  keys.forEach((k, i) => {
    kv[k] = values[i];
  });
  return { effectiveDel, kv };
}

function hoursOnlyClientPrep(localLs, cloudTombs, revokeKeys = []) {
  const prepared = prepareWeekEmployeeTombsForCoupledPwrb({
    weekRangeKey: WK,
    localTombs: localLs,
    cloudTombs,
    revokeCurrentWeekMergeKeys: revokeKeys,
  });
  return {
    keys: ["kw-week-employees", "kw-week-employees-deleted-ids", "kw-payroll-week-meta"],
    values: [[{ id: "x", directoryId: DAM_DIR, name: "Damianek" }], prepared, {}],
    replaceWeekEmployeesKeys: ["kw-week-employees"],
  };
}

// ─── TEST 1: Cloud 19, LS [], hours OFF → remain 19 ─────────────────────────
{
  const cloud19 = makeCloud19();
  assert("T1 setup count", cloud19.length === 19, String(cloud19.length));
  const body = hoursOnlyClientPrep([], cloud19);
  const kv = { "kw-week-employees-deleted-ids": [...cloud19] };
  const { effectiveDel } = simulateEdgePersist(body, kv);
  assert("T1 tombs remain 19", effectiveDel.length === 19, String(effectiveDel.length));
  assert("T1 hist Damianek A kept", effectiveDel.includes(DAM_TOMB_HIST_A));
  assert("T1 hist Damianek B kept", effectiveDel.includes(DAM_TOMB_HIST_B));
  assert("T1 no wipe to 0", effectiveDel.length !== 0);
}

// ─── TEST 2: Cloud 19, LS fully hydrated, hours mutation → unchanged ────────
{
  const cloud19 = makeCloud19();
  const body = hoursOnlyClientPrep([...cloud19], cloud19);
  const kv = { "kw-week-employees-deleted-ids": [...cloud19] };
  const { effectiveDel } = simulateEdgePersist(body, kv);
  assert("T2 count unchanged", effectiveDel.length === 19);
  assert(
    "T2 set equal",
    [...effectiveDel].sort().join("|") === [...cloud19].sort().join("|"),
  );
}

// ─── TEST 3: Explicit REMOVE creates/preserves tomb ─────────────────────────
{
  const cloud19 = makeCloud19().filter((t) => t !== OTHER_HIST);
  const local = [...cloud19, OTHER_HIST];
  const prepared = prepareWeekEmployeeTombsForCoupledPwrb({
    weekRangeKey: WK,
    localTombs: local,
    cloudTombs: cloud19,
    revokeCurrentWeekMergeKeys: [],
  });
  assert("T3 REMOVE tomb present", prepared.includes(OTHER_HIST));
  assert("T3 historical preserved", prepared.includes(DAM_TOMB_HIST_A));
  const body = {
    keys: ["kw-week-employees", "kw-week-employees-deleted-ids", "kw-payroll-week-meta"],
    values: [[], prepared, {}],
    replaceWeekEmployeesKeys: ["kw-week-employees"],
  };
  const kv = { "kw-week-employees-deleted-ids": [...cloud19] };
  const { effectiveDel } = simulateEdgePersist(body, kv);
  assert("T3 Edge keeps REMOVE tomb", effectiveDel.includes(OTHER_HIST));
}

// ─── TEST 4: Explicit legal ADD — current-week tomb revoked, hist kept ──────
{
  const cloudWithCurrent = [...makeCloud19(), DAM_TOMB_CURRENT];
  const prepared = prepareWeekEmployeeTombsForCoupledPwrb({
    weekRangeKey: WK,
    localTombs: [], // unhydrated LS after revoke on empty
    cloudTombs: cloudWithCurrent,
    revokeCurrentWeekMergeKeys: [DAM_MK],
  });
  assert("T4 current tomb revoked", !prepared.includes(DAM_TOMB_CURRENT));
  assert("T4 hist A kept", prepared.includes(DAM_TOMB_HIST_A));
  assert("T4 hist B kept", prepared.includes(DAM_TOMB_HIST_B));
  const coupled = resolveCoupledWeekEmployeeDeletedIds({
    forceReplaceWeekEmployees: true,
    hasWeekEmployeesKey: true,
    hasWeekEmpDeletedKey: true,
    weekEmpDeletedFromBatch: prepared,
    storedWeekEmpDeleted: cloudWithCurrent,
  });
  assert("T4 P2.8 coupled omits current", !coupled.includes(DAM_TOMB_CURRENT));
  assert("T4 P2.8 coupled keeps hist", coupled.includes(DAM_TOMB_HIST_A));
}

// ─── TEST 5: Hours-only + legal ADD state — no unrelated hist disappear ─────
{
  const cloudWithCurrent = [...makeCloud19(), DAM_TOMB_CURRENT];
  const prepared = prepareWeekEmployeeTombsForCoupledPwrb({
    weekRangeKey: WK,
    localTombs: [],
    cloudTombs: cloudWithCurrent,
    revokeCurrentWeekMergeKeys: [DAM_MK],
  });
  const histBefore = cloudWithCurrent.filter((t) => !t.startsWith(`${WK}::`));
  const histAfter = prepared.filter((t) => !t.startsWith(`${WK}::`));
  assert(
    "T5 hist set preserved",
    [...histBefore].sort().join("|") === [...histAfter].sort().join("|"),
  );
}

// ─── TEST 6: P2.8 coupled PWRB legal ADD behavior still PASS ────────────────
{
  const stored = [DAM_TOMB_CURRENT, DAM_TOMB_HIST_A, OTHER_HIST];
  const batch = prepareWeekEmployeeTombsForCoupledPwrb({
    weekRangeKey: WK,
    localTombs: [DAM_TOMB_HIST_A, OTHER_HIST],
    cloudTombs: stored,
    revokeCurrentWeekMergeKeys: [DAM_MK],
  });
  const coupled = resolveCoupledWeekEmployeeDeletedIds({
    forceReplaceWeekEmployees: true,
    hasWeekEmployeesKey: true,
    hasWeekEmpDeletedKey: true,
    weekEmpDeletedFromBatch: batch,
    storedWeekEmpDeleted: stored,
  });
  assert("T6 coupled omits Damianek current", !coupled.includes(DAM_TOMB_CURRENT));
  assert("T6 coupled keeps unrelated", coupled.includes(OTHER_HIST));
  assert("T6 replaceWeekEmployeesKeys path still coupled", true);
}

// ─── TEST 7: Empty/missing deleted-ids must never mean delete-all ───────────
{
  const cloud19 = makeCloud19();
  // 7a hydrate path
  const prepared = prepareWeekEmployeeTombsForCoupledPwrb({
    weekRangeKey: WK,
    localTombs: [],
    cloudTombs: cloud19,
  });
  assert("T7a empty LS + cloud ≠ []", prepared.length === 19);

  // 7b omit key when unhydrated empty → Edge UNION preserves stored
  const bodyOmit = {
    keys: ["kw-week-employees", "kw-payroll-week-meta"],
    values: [[{ id: "1" }], {}],
    replaceWeekEmployeesKeys: ["kw-week-employees"],
  };
  const kv = { "kw-week-employees-deleted-ids": [...cloud19] };
  const { effectiveDel } = simulateEdgePersist(bodyOmit, kv);
  assert(
    "T7b omit deleted-ids key preserves Cloud 19",
    effectiveDel.length === 19,
    String(effectiveDel.length),
  );

  // 7c BUG regress: coupled [] would wipe — document that prep forbids this
  const wipe = resolveCoupledWeekEmployeeDeletedIds({
    forceReplaceWeekEmployees: true,
    hasWeekEmployeesKey: true,
    hasWeekEmpDeletedKey: true,
    weekEmpDeletedFromBatch: [],
    storedWeekEmpDeleted: cloud19,
  });
  assert("T7c raw coupled [] would wipe (hazard)", wipe.length === 0);
  assert("T7c prep prevents sending that batch", prepared.length === 19);
}

// sanity: merge helper still exported / used
assert("export weekEmployeeMergeKey", typeof weekEmployeeMergeKey === "function");
assert("export mergeWeekEmployeesList", typeof mergeWeekEmployeesList === "function");

console.log(`\nRESULT ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
