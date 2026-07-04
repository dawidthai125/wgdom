/**
 * SYNC-ARCH-01 S1-2 — RS fingerprint excludes Payroll (AC4 parity z RS push).
 * Run: npx vite-node scripts/test-sync-arch-01-s2-rs-fingerprint.mjs
 */
process.env.VITE_SUPABASE_PROJECT_ID = "mock-proj-sync-arch-s2";
process.env.VITE_SUPABASE_ANON_KEY = "mock-anon-sync-arch-s2";

const lsStore = {};
globalThis.localStorage = {
  getItem: (k) => (k in lsStore ? lsStore[k] : null),
  setItem: (k, v) => { lsStore[k] = String(v); },
  removeItem: (k) => { delete lsStore[k]; },
  clear: () => { Object.keys(lsStore).forEach((k) => delete lsStore[k]); },
};

const { bundleFingerprint } = await import("../src/lib/cloud-sync-throttle.ts");
const {
  DATA_KEYS,
  RS_PUSH_EXCLUDED_PAYROLL_DATA_KEYS,
  rsBundleFingerprintFromMerged,
  ARCHIVE_DELETED_IDS_KEY,
  WEEK_EMPLOYEES_DELETED_KEYS_KEY,
  JOBS_DELETED_IDS_KEY,
} = await import("../src/lib/cloud-sync.ts");

let pass = 0;
let fail = 0;

function assert(name, cond) {
  if (cond) {
    pass++;
    console.log("PASS", name);
  } else {
    fail++;
    console.log("FAIL", name);
  }
}

function makeMerged(overrides = {}) {
  return DATA_KEYS.map((k) => (k in overrides ? overrides[k] : null));
}

// ── payroll-only change → RS fingerprint unchanged (R5 fix) ─────────────────
{
  const base = makeMerged({ "kw-jobs": [{ id: "j1" }] });
  const payrollOnly = makeMerged({
    "kw-jobs": [{ id: "j1" }],
    "kw-week-employees": [{ id: "e1", name: "Hours" }],
    "kw-weekFrom": "2026-06-09",
    "kw-weekTo": "2026-06-14",
    "kw-archive": [{ weekFrom: "2026-06-02" }],
  });

  const rsBase = rsBundleFingerprintFromMerged(base);
  const rsPayroll = rsBundleFingerprintFromMerged(payrollOnly);
  assert("RS fingerprint stabilny przy zmianie tylko payroll", rsBase === rsPayroll);
  assert(
    "pełny bundleFingerprint zmienia się przy payroll-only (baseline)",
    bundleFingerprint(base) !== bundleFingerprint(payrollOnly),
  );
}

// ── non-payroll change → RS fingerprint changes ───────────────────────────────
{
  const base = makeMerged({ "kw-jobs": [{ id: "j1" }] });
  const jobsChanged = makeMerged({ "kw-jobs": [{ id: "j2" }] });
  assert(
    "RS fingerprint zmienia się przy zmianie kw-jobs",
    rsBundleFingerprintFromMerged(base) !== rsBundleFingerprintFromMerged(jobsChanged),
  );
}

// ── determinism + tombstone parity (archive deleted excluded) ─────────────────
{
  const base = makeMerged({ "kw-directory": [{ id: "d1" }] });
  const copy = JSON.parse(JSON.stringify(base));
  assert("RS fingerprint deterministyczny", rsBundleFingerprintFromMerged(base) === rsBundleFingerprintFromMerged(copy));

  for (const excluded of RS_PUSH_EXCLUDED_PAYROLL_DATA_KEYS) {
    const a = makeMerged();
    const b = makeMerged({ [excluded]: excluded === "kw-week-employees" ? [{ id: "x" }] : "changed" });
    assert(`RS fingerprint ignoruje ${excluded}`, rsBundleFingerprintFromMerged(a) === rsBundleFingerprintFromMerged(b));
  }

  // payroll tombstones excluded from RS fingerprint
  localStorage.setItem(ARCHIVE_DELETED_IDS_KEY, JSON.stringify(["w1"]));
  const beforeTomb = rsBundleFingerprintFromMerged(makeMerged());
  localStorage.setItem(WEEK_EMPLOYEES_DELETED_KEYS_KEY, JSON.stringify(["2026-06-09:e9"]));
  const afterPayrollTomb = rsBundleFingerprintFromMerged(makeMerged());
  assert("RS fingerprint ignoruje payroll tombstones", beforeTomb === afterPayrollTomb);

  localStorage.setItem(JOBS_DELETED_IDS_KEY, JSON.stringify(["j-del"]));
  const afterJobTomb = rsBundleFingerprintFromMerged(makeMerged());
  assert("RS fingerprint reaguje na non-payroll tombstone", beforeTomb !== afterJobTomb);
}

// ── AC4 skip simulation (payroll churn nie wymusza push) ──────────────────────
{
  const nonPayroll = makeMerged({ "kw-jobs": [{ id: "j1" }] });
  let lastRsHash = "";
  const tryRsSync = (merged) => {
    const h = rsBundleFingerprintFromMerged(merged);
    if (h === lastRsHash) return "skip";
    lastRsHash = h;
    return "push";
  };
  assert("pierwszy RS sync = push", tryRsSync(nonPayroll) === "push");
  const payrollChurn = makeMerged({
    "kw-jobs": [{ id: "j1" }],
    "kw-week-employees": [{ id: "e1", days: { mon: 8 } }],
  });
  assert("payroll churn bez zmiany RS subset = skip", tryRsSync(payrollChurn) === "skip");
  const jobsChurn = makeMerged({
    "kw-jobs": [{ id: "j1", name: "Updated" }],
    "kw-week-employees": [{ id: "e1", days: { mon: 8 } }],
  });
  assert("zmiana jobs wymusza push", tryRsSync(jobsChurn) === "push");
}

console.log("\n---");
console.log(`SYNC-ARCH-01 S1-2: ${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
