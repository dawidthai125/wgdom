/**
 * PAYROLL P2.8 — Edge coupled PWRB tombs + verified membership ACK.
 * Run: npx vite-node scripts/test-payroll-p2-8-coupled-legal-add.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p28-coupled";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p28-coupled";

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
const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const DAM_DIR = "6bafc80e-ee8c-4183-8e74-8750b7667d59";
const DAM_ID = "7e9bb56f-17da-4334-a5f8-6278283112f0";
const DAM_TOMB = `${WF}|${WT}::dir:${DAM_DIR}`;

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

function defaultDay(active = true, to = "16:00") {
  return { active, from: "07:00", to, zaliczka: "" };
}

function makeEmp(id, name, opts = {}) {
  return {
    id,
    directoryId: opts.directoryId ?? `dir-${id}`,
    name,
    phone: "",
    position: opts.position ?? "Pracownik",
    rate: opts.rate ?? "28",
    days: Object.fromEntries(
      DAYS.map((d) => [d, { ...defaultDay(d !== "So", opts.hoursTo ?? "16:00") }]),
    ),
    prevSaturday: defaultDay(false),
    extraCosts: [],
    settled: false,
    dataUpdatedAt: "2026-09-04T07:00:00.000Z",
  };
}

function cloud15() {
  return Array.from({ length: 15 }, (_, i) => makeEmp(`e${i + 1}`, `Emp ${i + 1}`));
}

function damianek(hours = false) {
  const e = makeEmp(DAM_ID, "Damianek", {
    directoryId: DAM_DIR,
    position: "Kombinator2",
    rate: "28",
  });
  if (!hours) {
    for (const d of DAYS) e.days[d] = { ...defaultDay(false) };
  } else {
    e.days.Pt = { ...defaultDay(true, "16:00") };
  }
  return e;
}

const {
  resolveCoupledWeekEmployeeDeletedIds,
  weekEmployeeMergeKey,
  mergeWeekEmployeesList,
} = await import("../src/lib/payroll-week-employee-merge.ts");
const { mergeWeekEmployeeRecord } = await import("../src/lib/payroll-week-employee-record-merge.ts");
const {
  rememberPayrollPendingAdds,
  getPayrollPendingAddKeys,
  resetPayrollPendingAddIntentsForTests,
  pendingAddKeysToConfirmInOutgoing,
  assertPayrollPendingAddsPersistedOrThrow,
  PAYROLL_MEMBERSHIP_PERSIST_FAILED_MESSAGE,
  ackPayrollPendingAddsInRoster,
} = await import("../src/lib/payroll-pending-add-intent.ts");
const { collectLegalAddMergeKeys } = await import("../src/lib/payroll-stale-roster-membership.ts");
const {
  mayPersistPayrollRosterUnderWeekKeys,
  BLOCK_TOMBSTONE_RECREATE,
} = await import("../src/lib/payroll-week-roster-binding.ts");
const {
  WEEK_EMPLOYEES_DELETED_KEYS_KEY,
  DATA_KEYS,
} = await import("../src/lib/cloud-sync.ts");

// ─── J: real Edge SSOT helper (not a duplicate of Edge inline) ───────────────
{
  const stored = [DAM_TOMB, "2026-08-03|2026-08-08::dir:other"];
  const batchRevoked = stored.filter((t) => t !== DAM_TOMB);
  const coupled = resolveCoupledWeekEmployeeDeletedIds({
    forceReplaceWeekEmployees: true,
    hasWeekEmployeesKey: true,
    hasWeekEmpDeletedKey: true,
    weekEmpDeletedFromBatch: batchRevoked,
    storedWeekEmpDeleted: stored,
  });
  assert("J coupled omits Damianek tomb", !coupled.includes(DAM_TOMB));
  assert("J coupled keeps unrelated week tomb", coupled.includes("2026-08-03|2026-08-08::dir:other"));

  const unioned = resolveCoupledWeekEmployeeDeletedIds({
    forceReplaceWeekEmployees: false,
    hasWeekEmployeesKey: true,
    hasWeekEmpDeletedKey: true,
    weekEmpDeletedFromBatch: batchRevoked,
    storedWeekEmpDeleted: stored,
  });
  assert("J non-coupled UNION keeps Damianek tomb", unioned.includes(DAM_TOMB));
}

function edgeFilterByTombs(list, deletedIds, weekFrom, weekTo) {
  const prefix = `${weekFrom}|${weekTo}::`;
  const tombs = new Set();
  for (const id of deletedIds) {
    if (typeof id === "string" && id.startsWith(prefix)) tombs.add(id.slice(prefix.length));
  }
  return list.filter((item) => !tombs.has(weekEmployeeMergeKey(item)));
}

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
  let next = empIdx >= 0 ? values[empIdx] : [];
  next = edgeFilterByTombs(next, effectiveDel, WF, WT);
  const prev = kv["kw-week-employees"] ?? [];
  const prevF = edgeFilterByTombs(prev, effectiveDel, WF, WT);
  if (body.intentionalHoursClear !== true || (Array.isArray(next) && next.length > 0)) {
    next = mergeWeekEmployeesList(prevF, next, mergeWeekEmployeeRecord);
  }
  // I-2: drop tombs for identities in roster
  const rosterKeys = new Set(next.map((e) => weekEmployeeMergeKey(e)));
  const tombsOut = effectiveDel.filter((id) => {
    if (!String(id).startsWith(`${WF}|${WT}::`)) return true;
    const mk = String(id).slice(`${WF}|${WT}::`.length);
    return !rosterKeys.has(mk);
  });
  if (empIdx >= 0) values[empIdx] = next;
  if (delIdx >= 0) values[delIdx] = tombsOut;
  keys.forEach((k, i) => {
    kv[k] = values[i];
  });
  const meta = kv["kw-payroll-week-meta"] || { rosterRevision: 271, weekFrom: WF, weekTo: WT };
  meta.rosterRevision = (meta.rosterRevision || 0) + 1;
  meta.updatedAt = Date.now();
  kv["kw-payroll-week-meta"] = meta;
  return {
    ok: true,
    payrollWeekMeta: meta,
    persistedWeekEmployees: next,
    persistedWeekEmployeeDeletedIds: tombsOut,
    requestId: "p28-test",
  };
}

// ─── unit: legalAddMergeKeys + fence ─────────────────────────────────────────
{
  resetPayrollPendingAddIntentsForTests();
  const cloud = cloud15();
  const dam = damianek();
  rememberPayrollPendingAdds([dam]);
  const outgoing = [...cloud, dam];
  const legal = collectLegalAddMergeKeys(cloud, outgoing, cloud);
  assert("C legalAdd has dir key", legal.has(`dir:${DAM_DIR}`));
  const gate = mayPersistPayrollRosterUnderWeekKeys({
    weekFrom: WF,
    weekTo: WT,
    roster: outgoing,
    archive: [],
    currentFrom: WF,
    currentTo: WT,
    cloudRoster: cloud,
    tombstonedMergeKeys: new Set([`dir:${DAM_DIR}`]),
    legalAddMergeKeys: legal,
  });
  assert("C fence ALLOW with legal ADD", gate.allow === true);
  const block = mayPersistPayrollRosterUnderWeekKeys({
    weekFrom: WF,
    weekTo: WT,
    roster: outgoing,
    archive: [],
    currentFrom: WF,
    currentTo: WT,
    cloudRoster: cloud,
    tombstonedMergeKeys: new Set([`dir:${DAM_DIR}`]),
  });
  assert("B normal resurrection BLOCK", block.allow === false && block.reason === BLOCK_TOMBSTONE_RECREATE);
}

// ─── I: false ACK ────────────────────────────────────────────────────────────
{
  resetPayrollPendingAddIntentsForTests();
  const dam = damianek();
  rememberPayrollPendingAdds([dam]);
  const confirm = pendingAddKeysToConfirmInOutgoing([...cloud15(), dam]);
  assert("I keys to confirm", confirm.has(`dir:${DAM_DIR}`));
  let threw = false;
  try {
    assertPayrollPendingAddsPersistedOrThrow(cloud15(), confirm);
  } catch (e) {
    threw = e instanceof Error && e.message === PAYROLL_MEMBERSHIP_PERSIST_FAILED_MESSAGE;
  }
  assert("I false persist throws", threw);
  assert("I pending retained after false ACK attempt", getPayrollPendingAddKeys().has(`dir:${DAM_DIR}`));
  ackPayrollPendingAddsInRoster([...cloud15(), dam]);
  assert("I ACK after real persist clears", !getPayrollPendingAddKeys().has(`dir:${DAM_DIR}`));
}

// ─── E2E mock Edge: legal ADD with stored tomb ───────────────────────────────
{
  resetPayrollPendingAddIntentsForTests();
  const kv = {
    "kw-week-employees": cloud15(),
    "kw-week-employees-deleted-ids": [DAM_TOMB],
    "kw-payroll-week-meta": { rosterRevision: 271, weekFrom: WF, weekTo: WT, updatedAt: 1 },
    "kw-weekFrom": WF,
    "kw-weekTo": WT,
  };
  let lastBody = null;
  let stripDamianekOnEdge = false;

  globalThis.fetch = async (url, opts) => {
    const u = String(url);
    if (u.includes("/batch-get")) {
      const { keys } = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({ values: keys.map((k) => kv[k] ?? null) }),
      };
    }
    if (u.includes("/batch-set")) {
      lastBody = JSON.parse(opts.body);
      let res = simulateEdgePersist(lastBody, kv);
      if (stripDamianekOnEdge && Array.isArray(res.persistedWeekEmployees)) {
        // I/false-success path: force Edge to drop Damianek despite coupled
        res = {
          ...res,
          persistedWeekEmployees: res.persistedWeekEmployees.filter(
            (e) => weekEmployeeMergeKey(e) !== `dir:${DAM_DIR}`,
          ),
        };
        kv["kw-week-employees"] = res.persistedWeekEmployees;
      }
      return {
        ok: true,
        status: 200,
        json: async () => res,
        text: async () => JSON.stringify(res),
      };
    }
    throw new Error(`unexpected fetch ${u}`);
  };

  lsStore["kw-weekFrom"] = JSON.stringify(WF);
  lsStore["kw-weekTo"] = JSON.stringify(WT);
  lsStore["kw-week-employees"] = JSON.stringify(cloud15());
  lsStore["kw-week-employees-deleted-ids"] = JSON.stringify([DAM_TOMB]);
  lsStore["kw-payroll-week-meta"] = JSON.stringify(kv["kw-payroll-week-meta"]);
  lsStore["kw-archive"] = JSON.stringify([]);

  const { registerCloudFreshnessReconcile, resetCloudFreshnessGateForTests } =
    await import("../src/lib/cloud-freshness-gate.ts");
  resetCloudFreshnessGateForTests({ allowWrites: true });
  registerCloudFreshnessReconcile(async () => {});

  const { pwrAdd } = await import("../src/lib/payroll-week-roster-bundle.ts");
  const dam = damianek();
  const result = await pwrAdd({
    weekFrom: WF,
    weekTo: WT,
    directoryIds: [DAM_DIR],
    directory: [{ id: DAM_DIR, name: "Damianek", position: "Kombinator2", rate: "28", phone: "" }],
    currentRoster: cloud15(),
    newEmployees: [dam],
  });

  assert("E2E replaceWeekEmployeesKeys set", lastBody?.replaceWeekEmployeesKeys?.includes("kw-week-employees"));
  assert("E2E pushed", result.pushed === true);
  assert("E2E cloud roster 16", (kv["kw-week-employees"] || []).length === 16);
  assert(
    "E2E Damianek PRESENT",
    (kv["kw-week-employees"] || []).some((e) => e.id === DAM_ID || e.directoryId === DAM_DIR),
  );
  assert("E2E current-week tomb REVOKED", !(kv["kw-week-employees-deleted-ids"] || []).includes(DAM_TOMB));
  assert("E2E pending cleared after verified ACK", getPayrollPendingAddKeys().size === 0);

  // I — false ACK: Edge drops Damianek in response → throw, pending retained
  resetPayrollPendingAddIntentsForTests();
  kv["kw-week-employees"] = cloud15();
  kv["kw-week-employees-deleted-ids"] = [DAM_TOMB];
  kv["kw-payroll-week-meta"] = { rosterRevision: 280, weekFrom: WF, weekTo: WT, updatedAt: 2 };
  lsStore["kw-week-employees"] = JSON.stringify(cloud15());
  lsStore["kw-week-employees-deleted-ids"] = JSON.stringify([DAM_TOMB]);
  lsStore["kw-payroll-week-meta"] = JSON.stringify(kv["kw-payroll-week-meta"]);
  stripDamianekOnEdge = true;
  let falseAckThrew = false;
  try {
    await pwrAdd({
      weekFrom: WF,
      weekTo: WT,
      directoryIds: [DAM_DIR],
      directory: [{ id: DAM_DIR, name: "Damianek", position: "Kombinator2", rate: "28", phone: "" }],
      currentRoster: cloud15(),
      newEmployees: [damianek()],
    });
  } catch (e) {
    falseAckThrew =
      e instanceof Error && e.message === PAYROLL_MEMBERSHIP_PERSIST_FAILED_MESSAGE;
  }
  assert("I pwrAdd throws on false Edge persist", falseAckThrew);
  assert(
    "I pending NOT cleared on false ACK",
    getPayrollPendingAddKeys().has(`dir:${DAM_DIR}`),
  );
  stripDamianekOnEdge = false;
}

// ─── A: explicit REMOVE keeps tomb (coupled) ─────────────────────────────────
{
  const stored = [];
  const batch = [DAM_TOMB];
  const coupled = resolveCoupledWeekEmployeeDeletedIds({
    forceReplaceWeekEmployees: true,
    hasWeekEmployeesKey: true,
    hasWeekEmpDeletedKey: true,
    weekEmpDeletedFromBatch: batch,
    storedWeekEmpDeleted: stored,
  });
  assert("A REMOVE batch tomb authoritative", coupled.includes(DAM_TOMB));
  const filtered = edgeFilterByTombs([...cloud15(), damianek()], coupled, WF, WT);
  assert("A REMOVE filter drops Damianek", !filtered.some((e) => e.directoryId === DAM_DIR));
}

// ─── RS must not hardcode replace in merge push path (source contract) ───────
{
  const cloudSrc = await import("node:fs").then((fs) =>
    fs.readFileSync(new URL("../src/lib/cloud-sync.ts", import.meta.url), "utf8"),
  );
  const rsBlock = cloudSrc.includes("brak replaceWeekEmployeesKeys w RS")
    || /pushMergedDataBundleToCloud[\s\S]{0,2500}replaceWeekEmployeesKeys:\s*\[\]/.test(cloudSrc)
    || /SYNC-ARCH-01 S1-1[\s\S]{0,400}replaceWeekEmployeesKeys/.test(cloudSrc);
  const pwrbSets = /replaceWeekEmployeesKeys:\s*\[["']kw-week-employees["']\]/.test(cloudSrc);
  assert("RS docs/path excludes replaceWeekEmployeesKeys", rsBlock || !/pushMergedDataBundleToCloud[\s\S]{0,800}replaceWeekEmployeesKeys:\s*\[["']kw-week-employees["']\]/.test(cloudSrc));
  assert("PWRB pushWeekEmployees sets replaceWeekEmployeesKeys", pwrbSets);
  assert("DATA_KEYS still includes week employees", DATA_KEYS.includes("kw-week-employees"));
  assert("WEEK_EMPLOYEES_DELETED_KEYS_KEY stable", WEEK_EMPLOYEES_DELETED_KEYS_KEY === "kw-week-employees-deleted-ids");
}

console.log(`\nP2.8 ${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
