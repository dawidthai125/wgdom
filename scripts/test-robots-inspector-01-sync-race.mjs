/**
 * ROBOTS-INSPECTOR-01 — assignedInspectorId stale apply + push parity
 * Run: npx vite-node scripts/test-robots-inspector-01-sync-race.mjs
 */
import { defaultJob, normalizeJobsList } from "../src/app/app-domain.ts";
import {
  DATA_KEYS,
  mergeJobsById,
  reconcileAdminBundleWithFreshLocal,
  reconcileJobsWithFreshLocal,
  reconcileOperationalNotesInMergedBundle,
  rsBundleFingerprintFromMerged,
} from "../src/lib/cloud-sync.ts";
import { validateJobAssignedInspectorForSave } from "../src/lib/inspector-job-assignment.ts";

const INSPECTOR_ID = "szymon";
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

function inspectorId(jobs, jobId) {
  return jobs?.find((j) => j.id === jobId)?.assignedInspectorId ?? null;
}

function makeJobWithInspector(jobId, opts = {}) {
  const base = defaultJob();
  return {
    ...base,
    id: jobId,
    assignedInspectorId: opts.assignedInspectorId ?? INSPECTOR_ID,
    updatedAt: opts.updatedAt ?? "2026-07-12T14:00:01.000Z",
    client: opts.client ?? base.client,
  };
}

console.log("=== RI-T01 — fresh assignedInspectorId survives stale merged ===");
{
  const jobId = "ri-job-1";
  const staleCloud = [
    {
      ...defaultJob(),
      id: jobId,
      assignedInspectorId: undefined,
      updatedAt: "2026-07-12T14:00:00.000Z",
    },
  ];
  const freshLocal = [makeJobWithInspector(jobId)];
  const staleMerged = bundleWithJobs(mergeJobsById([staleCloud[0]], freshLocal));
  const out = reconcileJobsWithFreshLocal(staleMerged, freshLocal);
  assert(inspectorId(jobsFromBundle(out), jobId) === INSPECTOR_ID, "RI-T01 inspector preserved");
}

console.log("\n=== RI-T02 — finalBundle chain preserves inspector (Variant D) ===");
{
  const jobId = "ri-job-2";
  const reactStale = [{ ...defaultJob(), id: jobId }];
  const cloudStale = [
    {
      ...defaultJob(),
      id: jobId,
      updatedAt: "2026-07-12T14:00:00.000Z",
    },
  ];
  const freshLocal = [makeJobWithInspector(jobId)];
  const staleMerged = bundleWithJobs(mergeJobsById(reactStale, cloudStale));
  const finalBundle = reconcileAdminBundleWithFreshLocal(staleMerged, { jobs: freshLocal });
  const applied = normalizeJobsList(jobsFromBundle(finalBundle));
  assert(inspectorId(applied, jobId) === INSPECTOR_ID, "RI-T02 apply bundle has inspector");
}

console.log("\n=== RI-T03 — push bundle matches apply (no op-notes-only asymmetry) ===");
{
  const jobId = "ri-job-3";
  const reactStale = [{ ...defaultJob(), id: jobId }];
  const cloudStale = [
    {
      ...defaultJob(),
      id: jobId,
      updatedAt: "2026-07-12T14:00:00.000Z",
    },
  ];
  const freshLocal = [makeJobWithInspector(jobId)];
  const staleMerged = bundleWithJobs(mergeJobsById(reactStale, cloudStale));
  const opOnly = reconcileOperationalNotesInMergedBundle(staleMerged);
  const finalBundle = reconcileAdminBundleWithFreshLocal(staleMerged, { jobs: freshLocal });
  const pushJobsWrong = jobsFromBundle(opOnly);
  const pushJobsCorrect = jobsFromBundle(finalBundle);
  assert(
    inspectorId(pushJobsWrong, jobId) !== INSPECTOR_ID,
    "RI-T03 stale op-only bundle lacks inspector (regression signal)",
  );
  assert(
    inspectorId(pushJobsCorrect, jobId) === INSPECTOR_ID,
    "RI-T03 finalBundle push has inspector",
  );
}

console.log("\n=== RI-T04 — fingerprint uses same bundle as push ===");
{
  const jobId = "ri-job-4";
  const freshLocal = [makeJobWithInspector(jobId)];
  const staleMerged = bundleWithJobs(
    mergeJobsById([{ ...defaultJob(), id: jobId }], [{ ...defaultJob(), id: jobId, updatedAt: "2026-07-12T14:00:00.000Z" }]),
  );
  const finalBundle = reconcileAdminBundleWithFreshLocal(staleMerged, { jobs: freshLocal });
  const fpFinal = rsBundleFingerprintFromMerged(finalBundle);
  const fpStale = rsBundleFingerprintFromMerged(reconcileOperationalNotesInMergedBundle(staleMerged));
  assert(fpFinal !== fpStale, "RI-T04 fingerprint differs stale vs finalBundle");
  assert(
    inspectorId(jobsFromBundle(finalBundle), jobId) === INSPECTOR_ID,
    "RI-T04 finalBundle jobs before fingerprint",
  );
}

console.log("\n=== RI-T05 — validateJobAssignedInspectorForSave passes after reconcile ===");
{
  const jobId = "ri-job-5";
  const freshLocal = [makeJobWithInspector(jobId)];
  const staleMerged = bundleWithJobs(
    mergeJobsById([{ ...defaultJob(), id: jobId }], [{ ...defaultJob(), id: jobId, updatedAt: "2026-07-12T14:00:00.000Z" }]),
  );
  const finalBundle = reconcileAdminBundleWithFreshLocal(staleMerged, { jobs: freshLocal });
  const job = normalizeJobsList(jobsFromBundle(finalBundle)).find((j) => j.id === jobId);
  const validation = validateJobAssignedInspectorForSave(job);
  assert(validation.ok === true, "RI-T05 save validation ok");
}

console.log(`\n=== ROBOTS-INSPECTOR-01 reconcile: ${passed} passed, ${failed} failed ===`);
if (failed > 0) process.exit(1);
