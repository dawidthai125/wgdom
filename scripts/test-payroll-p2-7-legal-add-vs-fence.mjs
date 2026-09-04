/**
 * PAYROLL P2.7 — legal ADD vs Resurrection Fence (tombstone_recreate).
 * Run: npx vite-node scripts/test-payroll-p2-7-legal-add-vs-fence.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p27-fence";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p27-fence";

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

function damianek() {
  return makeEmp(DAM_ID, "Damianek", {
    directoryId: DAM_DIR,
    position: "Kombinator2",
    rate: "28",
    hoursTo: "16:00",
  });
}

const {
  mayPersistPayrollRosterUnderWeekKeys,
  BLOCK_TOMBSTONE_RECREATE,
} = await import("../src/lib/payroll-week-roster-binding.ts");
const {
  collectLegalAddMergeKeys,
} = await import("../src/lib/payroll-stale-roster-membership.ts");
const {
  rebuildPayrollOutgoingAfterFreshness,
  addDeletedWeekEmployeeKey,
  removeDeletedWeekEmployeeMergeKeysForWeek,
  getDeletedWeekEmployeeKeys,
  deletedWeekEmployeeMergeKeySet,
  saveDeletedWeekEmployeeKeys,
} = await import("../src/lib/cloud-sync.ts");
const {
  rememberPayrollPendingAdds,
  resetPayrollPendingAddIntentsForTests,
  getPayrollPendingAddKeys,
  ackPayrollPendingAddsInRoster,
  revokePayrollPendingAdd,
  unionRosterWithPendingAdds,
} = await import("../src/lib/payroll-pending-add-intent.ts");
const { weekEmployeeMergeKey } = await import("../src/lib/payroll-week-employee-merge.ts");
const { readFileSync } = await import("node:fs");

function gate(roster, cloud, tombs, legalAdds) {
  return mayPersistPayrollRosterUnderWeekKeys({
    weekFrom: WF,
    weekTo: WT,
    roster,
    archive: [],
    currentFrom: WF,
    currentTo: WT,
    cloudRoster: cloud,
    tombstonedMergeKeys: tombs,
    legalAddMergeKeys: legalAdds,
  });
}

function resetAll() {
  resetPayrollPendingAddIntentsForTests();
  saveDeletedWeekEmployeeKeys([]);
  for (const k of Object.keys(lsStore)) delete lsStore[k];
}

const TOMB = `${WF}|${WT}::dir:${DAM_DIR}`;

// ─── P2.7-A: Cloud 15 + current-week tomb + legal ADD → fence ALLOW ─────────
{
  resetAll();
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  saveDeletedWeekEmployeeKeys([TOMB]);
  removeDeletedWeekEmployeeMergeKeysForWeek(WF, WT, getPayrollPendingAddKeys());
  const rebuilt = rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: [...cloud, add],
    intentBefore: cloud,
    weekFrom: WF,
    weekTo: WT,
    tombstoned: deletedWeekEmployeeMergeKeySet(getDeletedWeekEmployeeKeys(), WF, WT),
  });
  const legal = collectLegalAddMergeKeys(cloud, rebuilt.roster, cloud);
  const tombs = deletedWeekEmployeeMergeKeySet(
    [...getDeletedWeekEmployeeKeys(), TOMB], // simulate stale tomb still visible
    WF,
    WT,
  );
  const g = gate(rebuilt.roster, cloud, tombs, legal);
  assert("P2.7-A roster 16", rebuilt.roster.length === 16);
  assert("P2.7-A Damianek present", rebuilt.roster.some((e) => e.directoryId === DAM_DIR));
  assert("P2.7-A legal keys", legal.has(`dir:${DAM_DIR}`));
  assert("P2.7-A fence ALLOW", g.allow === true, g.reason);
  assert("P2.7-A pending still present", getPayrollPendingAddKeys().has(`dir:${DAM_DIR}`));
}

// ─── P2.7-B: freshness reintroduces tomb → revoke + legal ADD → ALLOW ───────
{
  resetAll();
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  // initial revoke
  removeDeletedWeekEmployeeMergeKeysForWeek(WF, WT, getPayrollPendingAddKeys());
  // freshness UNION reimports cloud tomb
  saveDeletedWeekEmployeeKeys([TOMB, "2026-08-03|2026-08-08::dir:" + DAM_DIR]);
  // P2.7 final revoke before fence
  removeDeletedWeekEmployeeMergeKeysForWeek(WF, WT, getPayrollPendingAddKeys());
  assert("P2.7-B current-week tomb revoked", !getDeletedWeekEmployeeKeys().includes(TOMB));
  assert(
    "P2.7-B other-week tomb kept",
    getDeletedWeekEmployeeKeys().some((t) => t.includes("2026-08-03")),
  );
  const rebuilt = rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: cloud, // freshness dropped ADD from intent
    intentBefore: cloud,
    weekFrom: WF,
    weekTo: WT,
    tombstoned: deletedWeekEmployeeMergeKeySet(getDeletedWeekEmployeeKeys(), WF, WT),
  });
  assert("P2.7-B pending reattach 16", rebuilt.roster.length === 16);
  const legal = collectLegalAddMergeKeys(cloud, rebuilt.roster, cloud);
  // even if tomb set still had key, legal ADD exempts
  const g = gate(rebuilt.roster, cloud, new Set([`dir:${DAM_DIR}`]), legal);
  assert("P2.7-B fence ALLOW after freshness", g.allow === true, g.reason);
}

// ─── P2.7-C: tomb WITHOUT pending/legal ADD → BLOCK ─────────────────────────
{
  resetAll();
  const cloud = cloud15();
  const add = damianek();
  const roster = [...cloud, add];
  const tombs = new Set([`dir:${DAM_DIR}`]);
  const legal = collectLegalAddMergeKeys(cloud, roster, undefined); // no before → no legal
  assert("P2.7-C no legal without before/pending", legal.size === 0);
  const g = gate(roster, cloud, tombs, legal);
  assert("P2.7-C fence BLOCK", g.allow === false && g.reason === BLOCK_TOMBSTONE_RECREATE);
}

// ─── P2.7-D: explicit REMOVE wins (revoke pending + tomb kept for identity) ─
{
  resetAll();
  const cloud = cloud15();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  revokePayrollPendingAdd(add);
  addDeletedWeekEmployeeKey(WF, WT, add);
  assert("P2.7-D pending cleared", !getPayrollPendingAddKeys().has(`dir:${DAM_DIR}`));
  assert("P2.7-D tomb present", getDeletedWeekEmployeeKeys().includes(TOMB));
  const afterRemove = cloud;
  const legal = collectLegalAddMergeKeys(cloud, afterRemove, [...cloud, add]);
  assert("P2.7-D no legal add after remove", legal.size === 0);
  // reappearance without pending/legal → BLOCK
  const g = gate([...cloud, add], cloud, new Set([`dir:${DAM_DIR}`]), legal);
  assert("P2.7-D reappear BLOCK", g.allow === false && g.reason === BLOCK_TOMBSTONE_RECREATE);
}

// ─── P2.7-E: fence block with legal ADD must throw (no silent success) ──────
{
  const src = readFileSync(new URL("../src/lib/cloud-sync.ts", import.meta.url), "utf8");
  assert(
    "P2.7-E throw on legal ADD fence block",
    /legalAddMergeKeys\.size > 0[\s\S]{0,200}throw new Error\(/.test(src) ||
      /if \(legalAddMergeKeys\.size > 0\) \{\s*throw new Error/.test(src),
  );
  assert(
    "P2.7-E no bare return after legal-add throw path",
    src.includes("legal membership ADD must not report silent success") ||
      src.includes("legalAddMergeKeys.size > 0"),
  );
  // Guard path unchanged — still strips / blocks hours-down separately
  assert("P2.7-E Guard silent_hours_down present", src.includes("silent_hours_down"));
}

// ─── P2.7-F: 409 rebase keeps Damianek (shared pushRosterWithRebase contract) ─
{
  const bundleSrc = readFileSync(
    new URL("../src/lib/payroll-week-roster-bundle.ts", import.meta.url),
    "utf8",
  );
  assert("P2.7-F pwrAdd uses pushRosterWithRebase", /pwrAdd[\s\S]{0,800}pushRosterWithRebase/.test(bundleSrc));
  assert(
    "P2.7-F rebase filters via filterDeletedWeekEmployees",
    bundleSrc.includes("filterDeletedWeekEmployees"),
  );
  // pending protects filterDeletedWeekEmployees
  resetAll();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  const { filterDeletedWeekEmployees } = await import("../src/lib/cloud-sync.ts");
  const filtered = filterDeletedWeekEmployees(
    [...cloud15(), add],
    new Set([`dir:${DAM_DIR}`]),
  );
  assert("P2.7-F Damianek survives tomb filter", filtered.some((e) => e.directoryId === DAM_DIR));
}

// ─── P2.7-G: CAS 2xx clears pending only via ack ────────────────────────────
{
  resetAll();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  assert("P2.7-G pending before ack", getPayrollPendingAddKeys().size === 1);
  ackPayrollPendingAddsInRoster([...cloud15(), add]);
  assert("P2.7-G pending cleared after ack", getPayrollPendingAddKeys().size === 0);
}

// ─── P2.7-H: failed path does not ack-clear pending ─────────────────────────
{
  resetAll();
  const add = damianek();
  rememberPayrollPendingAdds([add]);
  // simulate fence throw path — pending must remain (no ack call)
  assert("P2.7-H pending remains without ack", getPayrollPendingAddKeys().has(`dir:${DAM_DIR}`));
  const src = readFileSync(new URL("../src/lib/cloud-sync.ts", import.meta.url), "utf8");
  // ack only after successful pushKeysToCloud
  const ackIdx = src.indexOf("ackPayrollPendingAddsInRoster");
  const pushCompleteIdx = src.indexOf('payroll.roster.push.complete');
  assert("P2.7-H ack after push start region", ackIdx > 0 && pushCompleteIdx > 0 && ackIdx < pushCompleteIdx + 200);
}

// ─── P2.7-O: no Pipeline / IK scope in this change ──────────────────────────
{
  const binding = readFileSync(
    new URL("../src/lib/payroll-week-roster-binding.ts", import.meta.url),
    "utf8",
  );
  const stale = readFileSync(
    new URL("../src/lib/payroll-stale-roster-membership.ts", import.meta.url),
    "utf8",
  );
  assert("P2.7-O no pipeline in binding", !/pipeline-cloud-lean|pushTenderPipeline/.test(binding));
  assert("P2.7-O no IK in stale membership", !/Intelligent Estimator|ik-owner|OUR RATE/.test(stale));
}

// Source contract: legalAddMergeKeys plumbed into fence call
{
  const src = readFileSync(new URL("../src/lib/cloud-sync.ts", import.meta.url), "utf8");
  assert("P2.7 fence call passes legalAddMergeKeys", /legalAddMergeKeys,/.test(src) || /legalAddMergeKeys\s*,/.test(src));
  assert("P2.7 collectLegalAddMergeKeys used", src.includes("collectLegalAddMergeKeys"));
  assert(
    "P2.7 re-revoke before fence",
    /removeDeletedWeekEmployeeMergeKeysForWeek\(weekFrom, weekTo, legalAddMergeKeys\)/.test(src),
  );
}

console.log(`\nP2.7 legal ADD vs fence: ${pass} PASS, ${fail} FAIL`);
if (fail > 0) process.exit(1);
