/**
 * PAYROLL P2.6 — bootstrap must not write kw-week-employees without user intent.
 * Run: npx vite-node scripts/test-payroll-p2-6-bootstrap-no-write.mjs
 *
 * Local / mock only — no production writes.
 */
process.env.VITE_SUPABASE_PROJECT_ID ??= "mock-proj-p26-boot";
process.env.VITE_SUPABASE_ANON_KEY ??= "mock-anon-p26-boot";

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
const KAMIL_AT = "2026-09-04T14:39:20.689Z";

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
  bootstrapMergedShouldPush,
  bootstrapMergedShouldPersist,
  persistBootstrapMergedKey,
  rebuildPayrollOutgoingAfterFreshness,
  DATA_KEYS,
} = await import("../src/lib/cloud-sync.ts");
const { applyPayrollFieldIntentsOntoCanonical } = await import(
  "../src/lib/payroll-field-intent.ts"
);
const {
  applySettlementFieldIntent,
  buildPayrollSettlement,
} = await import("../src/lib/payroll-settlement.ts");
const {
  clearSettlementCloudAckForTests,
  extractSettlementCloudIntents,
  markSettlementCloudPending,
  listUnresolvedSettlementCloudAcks,
} = await import("../src/lib/payroll-settlement-cloud-ack.ts");
const {
  rememberPayrollPendingAdds,
  resetPayrollPendingAddIntentsForTests,
} = await import("../src/lib/payroll-pending-add-intent.ts");
const { outgoingHasLegalMembershipAdd, sanitizeStaleRosterMembership } = await import(
  "../src/lib/payroll-stale-roster-membership.ts"
);
const { weekEmployeeMergeKey } = await import("../src/lib/payroll-week-employee-merge.ts");
const { readFileSync } = await import("node:fs");
const { resolve } = await import("node:path");

function day(active = true, to = "16:00", updatedAt) {
  const d = { active, from: "07:00", to, zaliczka: "" };
  if (updatedAt) d.updatedAt = updatedAt;
  return d;
}

function makeEmp(id, name, opts = {}) {
  return {
    id,
    directoryId: opts.directoryId ?? `dir-${id}`,
    name,
    phone: "",
    position: "Pracownik",
    rate: opts.rate ?? "28",
    days: Object.fromEntries(
      DAYS.map((d) => [d, { ...day(d !== "So", opts.hoursTo ?? "16:00", opts.dayUpdatedAt) }]),
    ),
    prevSaturday: day(false),
    extraCosts: [],
    settled: opts.settled ?? false,
    dataUpdatedAt: "2026-09-04T07:00:00.000Z",
  };
}

function settlementMeta(amount, at) {
  return buildPayrollSettlement({
    settledByUserId: "u-dawid",
    settledByName: "Dawid",
    paymentMethod: "transfer",
    amount,
    settledAt: at,
  });
}

function settledEmp(emp, amount, at) {
  return {
    ...emp,
    settled: true,
    settledUpdatedAt: at,
    payrollSettlement: settlementMeta(amount, at),
  };
}

function withSaturday(emp, to, updatedAt) {
  return {
    ...emp,
    days: { ...emp.days, So: day(true, to, updatedAt) },
  };
}

function cloud15() {
  const list = [];
  for (let i = 1; i <= 13; i += 1) {
    const base = makeEmp(`e${i}`, `Emp ${i}`);
    list.push(i <= 10 ? settledEmp(base, 100 + i, `2026-09-03T10:0${i % 10}:00.000Z`) : base);
  }
  list.push(makeEmp("kamil", "Kamil Elektryk", { directoryId: "dir-4", rate: "35" }));
  list.push(
    withSaturday(makeEmp("krzysztof", "Krzysztof"), "17:00", "2026-09-04T10:34:46.074Z"),
  );
  return list;
}

function localDivergent() {
  return cloud15().map((emp) => {
    if (emp.id === "kamil") return settledEmp(emp, 1575, KAMIL_AT);
    if (emp.id === "krzysztof") {
      return withSaturday(emp, "16:00", "2026-09-04T09:00:00.000Z");
    }
    return emp;
  });
}

function damianek() {
  return makeEmp("dam-new", "Damianek", { directoryId: DAM_DIR, hoursTo: "07:00" });
}

function reset() {
  clearSettlementCloudAckForTests();
  resetPayrollPendingAddIntentsForTests();
  for (const k of Object.keys(lsStore)) delete lsStore[k];
}

const cloudSrc = readFileSync(resolve("src/lib/cloud-sync.ts"), "utf8");
const loaderSrc = readFileSync(resolve("src/app/CloudLoader.tsx"), "utf8");
const fieldSrc = readFileSync(resolve("src/lib/payroll-field-intent.ts"), "utf8");
const settleSrc = readFileSync(resolve("src/lib/payroll-settlement.ts"), "utf8");
const pwrbSrc = readFileSync(resolve("src/lib/payroll-week-roster-bundle.ts"), "utf8");
const staleSrc = readFileSync(resolve("src/lib/payroll-stale-roster-membership.ts"), "utf8");

console.log("\n=== P2.6 bootstrap must not write payroll ===\n");

// ─── static contract ────────────────────────────────────────────────────────
{
  assert(
    "S1 bootstrapMergedShouldPush hard-stops kw-week-employees",
    /key === ["']kw-week-employees["'][\s\S]{0,400}p2_6_bootstrap_payroll_read_only|p2_6_bootstrap_payroll_read_only[\s\S]{0,200}return false/.test(
      cloudSrc,
    ),
  );
  assert(
    "S2 CloudLoader still calls bootstrapMergedShouldPush (no bypass)",
    /bootstrapMergedShouldPush\(key, merged, cloudVal/.test(loaderSrc),
  );
  assert(
    "S3 Guard applyPayrollGuardBeforePush unchanged (no skip for bootstrap)",
    /blocked silent hours-down \(no scoped intent\)/.test(cloudSrc)
      && !/skipPayrollGuard:\s*true[\s\S]{0,80}bootstrap/.test(loaderSrc),
  );
  assert(
    "S4 pwrAdd / pushRosterWithRebase preserved",
    /export async function pwrAdd/.test(pwrbSrc) && /pushRosterWithRebase/.test(pwrbSrc),
  );
  assert(
    "S5 GO8.2 unresolvedCloudAck gate preserved",
    /unresolvedCloudAck/.test(settleSrc) && /resolveUnresolvedSettlementAckEmpIds/.test(fieldSrc),
  );
  assert(
    "S6 P2.4 sanitizeStaleRosterMembership preserved",
    /sanitizeStaleRosterMembership/.test(staleSrc),
  );
  assert(
    "S7 deferred bootstrap still uses bootstrapMergedShouldPush for non-payroll",
    /fetchAndMergeDeferredBootstrap[\s\S]*bootstrapMergedShouldPush\(key, merged, cloudVal\)/.test(
      cloudSrc,
    )
      && /BOOTSTRAP_DEFERRED_KEYS/.test(cloudSrc),
  );
  assert(
    "S8 kw-week-employees is CORE not DEFERRED",
    /BOOTSTRAP_CORE_KEYS[\s\S]{0,200}kw-week-employees/.test(cloudSrc)
      && !/BOOTSTRAP_DEFERRED_KEYS[\s\S]{0,200}kw-week-employees/.test(cloudSrc),
  );
}

// ─── P2.6-A / B / C / D: bootstrapMergedShouldPush never true for payroll ───
{
  reset();
  const cloud = cloud15();
  const localHoursDown = localDivergent();
  const identical = cloud15();

  assert(
    "P2.6-A hours-down → shouldPush false",
    bootstrapMergedShouldPush("kw-week-employees", localHoursDown, cloud) === false,
  );
  assert(
    "P2.6-B settlement ahead → shouldPush false",
    bootstrapMergedShouldPush(
      "kw-week-employees",
      localHoursDown.map((e) =>
        e.id === "krzysztof"
          ? withSaturday(e, "17:00", "2026-09-04T10:34:46.074Z")
          : e,
      ),
      cloud,
    ) === false,
  );
  assert(
    "P2.6-C JSON merged !== cloud → shouldPush false",
    JSON.stringify(localHoursDown) !== JSON.stringify(cloud)
      && bootstrapMergedShouldPush("kw-week-employees", localHoursDown, cloud) === false,
  );
  assert(
    "P2.6-D identical state → shouldPush false",
    bootstrapMergedShouldPush("kw-week-employees", identical, cloud) === false,
  );
  assert(
    "P2.6-D2 cloud-empty local-rich still no bootstrap CAS",
    bootstrapMergedShouldPush("kw-week-employees", localHoursDown, []) === false,
  );
}

// ─── LS persist still allowed (read-only bootstrap may update UI LS) ────────
{
  reset();
  const merged = localDivergent();
  assert(
    "P2.6 persist still allowed",
    bootstrapMergedShouldPersist("kw-week-employees", merged) === true,
  );
  const persisted = persistBootstrapMergedKey("kw-week-employees", merged);
  assert("P2.6 persist writes LS", persisted.ok === true);
  const raw = localStorage.getItem("kw-week-employees");
  assert("P2.6 LS has roster", !!raw && JSON.parse(raw).length === 15);
}

// ─── non-payroll bootstrap push decision unchanged ──────────────────────────
{
  reset();
  const jobsLocal = [{ id: "j1", title: "A" }, { id: "j2", title: "B" }];
  const jobsCloud = [{ id: "j1", title: "A" }];
  assert(
    "P2.6-K jobs bootstrap push still possible when richer",
    bootstrapMergedShouldPush("kw-jobs", jobsLocal, jobsCloud) === true,
  );
  assert(
    "P2.6-K pipeline key not week-employees",
    DATA_KEYS.includes("kw-tenders-pipeline")
      && "kw-tenders-pipeline" !== "kw-week-employees",
  );
}

// ─── P2.6-E explicit hours edit path still produces intent write shape ──────
{
  reset();
  const cloud = cloud15();
  const before = cloud.map((e) => ({ ...e }));
  const after = before.map((e) =>
    e.id === "e12" ? { ...e, days: { ...e.days, Pn: day(true, "18:00") } } : e,
  );
  const hoursIntents = [
    {
      employeeId: "e12",
      directoryId: "dir-e12",
      slot: "Pn",
      fromHours: 9,
      toHours: 11,
      weekFrom: WF,
      weekTo: WT,
    },
  ];
  const { roster, changed } = applyPayrollFieldIntentsOntoCanonical(
    cloud,
    before,
    after,
    hoursIntents,
    WF,
    WT,
  );
  assert("P2.6-E field intent path active", changed === true);
  assert(
    "P2.6-E hours applied for scoped employee",
    roster.find((e) => e.id === "e12")?.days?.Pn?.to === "18:00",
  );
}

// ─── P2.6-F explicit settlement ─────────────────────────────────────────────
{
  reset();
  const cloud = cloud15();
  const before = cloud.map((e) => ({ ...e }));
  const after = before.map((e) =>
    e.id === "kamil" ? settledEmp(e, 1575, KAMIL_AT) : e,
  );
  const applied = applySettlementFieldIntent(
    before.find((e) => e.id === "kamil"),
    before.find((e) => e.id === "kamil"),
    after.find((e) => e.id === "kamil"),
  );
  assert("P2.6-F explicit settlement applies", applied.settled === true);
  assert("P2.6-F amount 1575", applied.payrollSettlement?.amount === 1575);
  const field = applyPayrollFieldIntentsOntoCanonical(cloud, before, after, [], WF, WT);
  assert(
    "P2.6-F field-intent settlement lands",
    field.roster.find((e) => e.id === "kamil")?.settled === true,
  );
}

// ─── P2.6-G / H pwrAdd + rebuild path (P2.5) ────────────────────────────────
{
  reset();
  const cloud = cloud15();
  const before = cloud.map((e) =>
    e.id === "krzysztof"
      ? withSaturday(e, "16:00", "2026-09-04T09:00:00.000Z")
      : e,
  );
  const dam = damianek();
  const after = [...before, dam];
  rememberPayrollPendingAdds([dam]);
  const { roster, mode } = rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: after,
    intentBefore: before,
    weekFrom: WF,
    weekTo: WT,
    tombstoned: new Set(),
  });
  assert("P2.6-G ADD lands 16", roster.length === 16, String(roster.length));
  assert("P2.6-G Damianek present", !!roster.find((e) => e.id === "dam-new"));
  assert("P2.6-G mode canonical_intent", mode === "canonical_intent", mode);
  assert(
    "P2.6-G legal membership ADD detected",
    outgoingHasLegalMembershipAdd(cloud, after, before) === true,
  );
  assert(
    "P2.6-H pushRosterWithRebase still in PWRB (CAS 409 path)",
    /PAYROLL_REBASE_MAX_ATTEMPTS|stale_revision|PayrollStaleRevisionError/.test(pwrbSrc),
  );
}

// ─── P2.6-I P2.4 tombstone ──────────────────────────────────────────────────
{
  reset();
  const cloud = cloud15();
  const dam = damianek();
  const after = [...cloud, dam];
  const before = cloud.map((e) => ({ ...e }));
  rememberPayrollPendingAdds([dam]);
  const tombKey = weekEmployeeMergeKey(dam);
  const membership = sanitizeStaleRosterMembership(
    cloud,
    after,
    before,
    new Set([tombKey]),
  );
  assert(
    "P2.6-I pending ADD beats stale tomb",
    membership.roster.some((e) => e.id === "dam-new"),
  );
}

// ─── P2.6-J 2.66.156 ACK safety ─────────────────────────────────────────────
{
  reset();
  const cloud = cloud15();
  const before = localDivergent().map((e) =>
    e.id === "krzysztof"
      ? withSaturday(e, "17:00", "2026-09-04T10:34:46.074Z")
      : e,
  );
  markSettlementCloudPending(extractSettlementCloudIntents(cloud, before, WF, WT));
  assert(
    "P2.6-J ACK pending for Kamil",
    listUnresolvedSettlementCloudAcks().some((e) => e.empId === "kamil"),
  );
  const dam = damianek();
  rememberPayrollPendingAdds([dam]);
  const { roster } = rebuildPayrollOutgoingAfterFreshness({
    cloudEmps: cloud,
    intentAfter: [...before, dam],
    intentBefore: before,
    weekFrom: WF,
    weekTo: WT,
  });
  assert(
    "P2.6-J ADD does not persist unresolved Kamil settlement",
    roster.find((e) => e.id === "kamil")?.settled === false,
  );
  assert(
    "P2.6-J ACK still pending",
    listUnresolvedSettlementCloudAcks().some((e) => e.empId === "kamil"),
  );
}

// ─── P2.6-L refresh must not mutate Cloud — decision layer ──────────────────
{
  reset();
  const cloud = cloud15();
  const local = localDivergent();
  const decisions = ["hours-down", "settlement-ahead", "identical", "empty-cloud"].map(
    (label) => {
      const merged =
        label === "identical"
          ? cloud
          : label === "empty-cloud"
            ? local
            : local;
      const cloudVal = label === "empty-cloud" ? [] : cloud;
      return {
        label,
        push: bootstrapMergedShouldPush("kw-week-employees", merged, cloudVal),
      };
    },
  );
  assert(
    "P2.6-L all bootstrap payroll push decisions false",
    decisions.every((d) => d.push === false),
    JSON.stringify(decisions),
  );
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
