/**
 * JOBS-ADDRESS-SYNC-01 — address/flatNumber field-level merge + reconcile parity
 * Run: npx vite-node scripts/test-jobs-address-sync-race.mjs
 */
import { defaultJob } from "../src/app/app-domain.ts";
import {
  DATA_KEYS,
  mergeJobsById,
  reconcileAdminBundleWithFreshLocal,
  reconcileJobsWithFreshLocal,
  reconcileOperationalNotesInMergedBundle,
  rsBundleFingerprintFromMerged,
} from "../src/lib/cloud-sync.ts";
import {
  mergeJobAddressField,
  normalizeJobAddressField,
} from "../src/lib/job-address-fields.ts";

const JOB_ID = "job-addr-01";
let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

function emptyBundle() {
  return DATA_KEYS.map(() => null);
}

function bundleWithJobs(jobs) {
  const bundle = emptyBundle();
  bundle[DATA_KEYS.indexOf("kw-jobs")] = jobs;
  return bundle;
}

function jobsFromBundle(bundle) {
  return bundle[DATA_KEYS.indexOf("kw-jobs")] ?? [];
}

function jobFields(jobs, jobId) {
  const j = jobs?.find((x) => x.id === jobId);
  return { address: j?.address ?? "", flatNumber: j?.flatNumber ?? "" };
}

function makeJob(overrides = {}) {
  const base = defaultJob();
  return {
    ...base,
    id: JOB_ID,
    address: "",
    flatNumber: "",
    updatedAt: "2026-07-12T10:00:00.000Z",
    ...overrides,
  };
}

console.log("JA-T01 — normalizeJobAddressField");
assert(normalizeJobAddressField(null) === "", "null → empty");
assert(normalizeJobAddressField("  ul. X  ") === "ul. X", "trim whitespace");
assert(normalizeJobAddressField(undefined) === "", "undefined → empty");

console.log("\nJA-T02 — mergeJobAddressField non-empty wins over empty");
assert(
  mergeJobAddressField("", "ul. Testowa 1", true) === "ul. Testowa 1",
  "empty + non-empty → non-empty",
);
assert(
  mergeJobAddressField("ul. Lokalna", "", false) === "ul. Lokalna",
  "non-empty + empty → non-empty",
);
assert(
  mergeJobAddressField("  ", "5A", true) === "5A",
  "whitespace-only treated as empty",
);

console.log("\nJA-T03 — mergeJobAddressField both non-empty → LWW preferB");
assert(
  mergeJobAddressField("ul. Stara", "ul. Nowa", true) === "ul. Nowa",
  "preferB=true → b wins",
);
assert(
  mergeJobAddressField("ul. Stara", "ul. Nowa", false) === "ul. Stara",
  "preferB=false → a wins",
);
assert(
  mergeJobAddressField("ul. Ta sama", "ul. Ta sama", true) === "ul. Ta sama",
  "equal values → either side",
);

console.log("\nJA-T04 — mergeJobsById cloud empty address loses to local non-empty");
{
  const local = [
    makeJob({
      address: "ul. Lokalna 12",
      flatNumber: "7",
      updatedAt: "2026-07-12T10:00:05.000Z",
    }),
  ];
  const cloud = [
    makeJob({
      address: "",
      flatNumber: "",
      updatedAt: "2026-07-12T10:00:10.000Z",
    }),
  ];
  const merged = mergeJobsById(local, cloud, []);
  const fields = jobFields(merged, JOB_ID);
  assert(fields.address === "ul. Lokalna 12", "address preserved from local");
  assert(fields.flatNumber === "7", "flatNumber preserved from local");
}

console.log("\nJA-T05 — mergeJobsById both non-empty → newer timestamp wins");
{
  const older = [
    makeJob({
      address: "ul. Starsza",
      flatNumber: "1",
      updatedAt: "2026-07-12T10:00:05.000Z",
    }),
  ];
  const newer = [
    makeJob({
      address: "ul. Nowsza",
      flatNumber: "2",
      updatedAt: "2026-07-12T10:00:15.000Z",
    }),
  ];
  const merged = mergeJobsById(older, newer, []);
  const fields = jobFields(merged, JOB_ID);
  assert(fields.address === "ul. Nowsza", "newer address wins");
  assert(fields.flatNumber === "2", "newer flatNumber wins");
}

console.log("\nJA-T06 — reconcileAdminBundleWithFreshLocal preserves address vs stale cloud");
{
  const freshJob = makeJob({
    address: "ul. Po edycji 99",
    flatNumber: "12B",
    updatedAt: "2026-07-12T10:00:05.000Z",
  });
  const cloudJob = makeJob({
    address: "",
    flatNumber: "",
    updatedAt: "2026-07-12T10:00:20.000Z",
  });
  const mergedBundle = bundleWithJobs([cloudJob]);
  const reconciled = reconcileAdminBundleWithFreshLocal(mergedBundle, { jobs: [freshJob] });
  const reconciledJobs = jobsFromBundle(reconciled);
  const fields = jobFields(reconciledJobs, JOB_ID);
  assert(fields.address === "ul. Po edycji 99", "reconcile keeps local address");
  assert(fields.flatNumber === "12B", "reconcile keeps local flatNumber");

  const fpMerged = rsBundleFingerprintFromMerged(
    reconcileOperationalNotesInMergedBundle(mergedBundle),
  );
  const fpReconciled = rsBundleFingerprintFromMerged(
    reconcileOperationalNotesInMergedBundle(reconciled),
  );
  assert(fpMerged !== fpReconciled, "fingerprint changes after reconcile (expected)");

  const directReconcile = reconcileJobsWithFreshLocal(
    bundleWithJobs([cloudJob]),
    [freshJob],
  );
  const directFields = jobFields(jobsFromBundle(directReconcile), JOB_ID);
  assert(directFields.address === "ul. Po edycji 99", "reconcileJobsWithFreshLocal address");
  assert(directFields.flatNumber === "12B", "reconcileJobsWithFreshLocal flatNumber");
}

console.log(`\n${"=".repeat(48)}`);
console.log(`JOBS-ADDRESS-SYNC-01: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
