/**
 * JOBS-SYNC-FIX-01 — MF-1/2/3 lifecycle smoke
 * Run: npx vite-node scripts/test-jobs-sync-lifecycle-01.mjs
 */
import { defaultJob } from "../src/app/app-domain.ts";
import {
  DATA_KEYS,
  mergeDataKey,
  mergeJobsById,
  reconcileAdminBundleWithFreshLocal,
  reconcileJobsWithFreshLocal,
  resolveReconcileFreshForKey,
} from "../src/lib/cloud-sync.ts";
import {
  bumpAdminBundleGeneration,
  getAdminBundleGeneration,
  resetAdminBundleGenerationForTests,
  shouldApplyAdminBundleAtGeneration,
} from "../src/lib/admin-bundle-sync-guard.ts";

const JOB_ID = "job-sync-lifecycle-01";
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

function makePhoto(id, uploadedAt = "2026-07-12T12:00:00.000Z") {
  return {
    id,
    path: `jobs/${JOB_ID}/${id}.jpg`,
    publicUrl: `https://example.com/${id}.jpg`,
    label: "progress",
    uploadedBy: "admin",
    uploadedAt,
    status: "approved",
  };
}

function makeJob(photos, updatedAt = "2026-07-12T12:00:00.000Z", extra = {}) {
  const base = defaultJob();
  return {
    ...base,
    id: JOB_ID,
    photos,
    updatedAt,
    ...extra,
  };
}

function ensureLocalStorage() {
  if (globalThis.localStorage) return;
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v); },
    removeItem: (k) => { store.delete(k); },
    clear: () => { store.clear(); },
  };
}

function mockLocalStorage(key, value) {
  ensureLocalStorage();
  const prev = globalThis.localStorage.getItem(key);
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
  return () => {
    if (prev == null) globalThis.localStorage.removeItem(key);
    else globalThis.localStorage.setItem(key, prev);
  };
}

console.log("JS-SYNC-T1 — Delete 3→2: React fresh wins over stale LS (no resurrection)");
{
  const tombstones = [{ photoId: "c", deletedAt: "2026-07-12T12:00:05.000Z", deletedBy: "admin" }];
  const reactFresh = [
    makeJob([makePhoto("a"), makePhoto("b")], "2026-07-12T12:00:10.000Z", {
      deletedPhotoTombstones: tombstones,
    }),
  ];
  const staleLs = [
    makeJob(
      [makePhoto("a"), makePhoto("b"), makePhoto("c")],
      "2026-07-12T11:00:00.000Z",
    ),
  ];
  const restore = mockLocalStorage("kw-jobs", staleLs);
  try {
    const picked = resolveReconcileFreshForKey("kw-jobs", reactFresh);
    assert(
      Array.isArray(picked) && picked[0]?.photos?.length === 2,
      "resolveReconcileFreshForKey picks React (2 photos)",
    );
    const staleMerged = bundleWithJobs([
      makeJob(
        [makePhoto("a"), makePhoto("b"), makePhoto("c")],
        "2026-07-12T11:30:00.000Z",
      ),
    ]);
    const reconciled = reconcileJobsWithFreshLocal(staleMerged, reactFresh);
    const job = jobsFromBundle(reconciled).find((j) => j.id === JOB_ID);
    assert(job?.photos?.length === 2, `stays 2 after reconcile (got ${job?.photos?.length})`);
  } finally {
    restore();
  }
}

console.log("\nJS-SYNC-T2 — Upload 2→3: React fresh wins over stale LS (no disappear)");
{
  const reactFresh = [
    makeJob(
      [makePhoto("a"), makePhoto("b"), makePhoto("c")],
      "2026-07-12T12:00:10.000Z",
    ),
  ];
  const staleLs = [
    makeJob([makePhoto("a"), makePhoto("b")], "2026-07-12T11:00:00.000Z"),
  ];
  const restore = mockLocalStorage("kw-jobs", staleLs);
  try {
    const picked = resolveReconcileFreshForKey("kw-jobs", reactFresh);
    assert(
      Array.isArray(picked) && picked[0]?.photos?.length === 3,
      "resolveReconcileFreshForKey picks React (3 photos)",
    );
    const staleMerged = bundleWithJobs([
      makeJob([makePhoto("a"), makePhoto("b")], "2026-07-12T11:30:00.000Z"),
    ]);
    const reconciled = reconcileJobsWithFreshLocal(staleMerged, reactFresh);
    const job = jobsFromBundle(reconciled).find((j) => j.id === JOB_ID);
    assert(job?.photos?.length === 3, `stays 3 after reconcile (got ${job?.photos?.length})`);
  } finally {
    restore();
  }
}

console.log("\nJS-SYNC-T3 — Cross-device: merge + reconcile without explicit fresh still works");
{
  const cloudJob = makeJob([], "2026-07-12T12:00:05.000Z", {
    deletedPhotoTombstones: [
      { photoId: "gone", deletedAt: "2026-07-12T12:00:00.000Z", deletedBy: "A" },
    ],
  });
  const localJob = makeJob([makePhoto("gone")], "2026-07-12T11:00:00.000Z");
  const merged = mergeJobsById([localJob], [cloudJob], []);
  const jobMerged = merged.find((j) => j.id === JOB_ID);
  assert(jobMerged?.photos?.length === 0, "cross-device merge: tombstone delete preserved");

  const restore = mockLocalStorage("kw-jobs", [localJob]);
  try {
    const reconciled = reconcileAdminBundleWithFreshLocal(bundleWithJobs([cloudJob]));
    const job = jobsFromBundle(reconciled).find((j) => j.id === JOB_ID);
    assert(job?.photos?.length === 0, "reconcile without explicit fresh uses LS path");
  } finally {
    restore();
  }
}

console.log("\nJS-SYNC-T4 — Generation guard: newer React mutation blocks stale apply");
{
  resetAdminBundleGenerationForTests();
  const captured = getAdminBundleGeneration();
  bumpAdminBundleGeneration();
  assert(
    shouldApplyAdminBundleAtGeneration(captured) === false,
    "stale captured generation blocked after bump",
  );
  const captured2 = getAdminBundleGeneration();
  assert(
    shouldApplyAdminBundleAtGeneration(captured2) === true,
    "same generation allows apply",
  );
  resetAdminBundleGenerationForTests();
}

console.log("\nJS-SYNC-T5 — DATA_KEYS mergeDataKey smoke (no throw, stable null merge)");
{
  for (const key of DATA_KEYS) {
    try {
      const merged = mergeDataKey(key, null, null);
      assert(merged === null || merged !== undefined, `mergeDataKey ${key} null/null`);
    } catch (e) {
      failed += 1;
      console.error(`  ✗ mergeDataKey ${key} threw: ${e instanceof Error ? e.message : e}`);
    }
  }
}

console.log(`\n${"=".repeat(48)}`);
console.log(`JOBS-SYNC-FIX-01 lifecycle: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
