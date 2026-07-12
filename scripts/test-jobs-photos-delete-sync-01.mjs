/**
 * JOBS-PHOTOS-DELETE-SYNC-01 — photos[] tombstone delete merge
 * Run: npx vite-node scripts/test-jobs-photos-delete-sync-01.mjs
 */
import { defaultJob } from "../src/app/app-domain.ts";
import {
  DATA_KEYS,
  mergeJobsById,
  reconcileJobsWithFreshLocal,
} from "../src/lib/cloud-sync.ts";
import {
  buildPhotoTombstone,
  filterPhotosByTombstones,
  mergePhotoTombstones,
  mergePhotos,
  removePhotoWithTombstone,
} from "../src/lib/job-photos.ts";
import { mergeAssignedInspectorId } from "../src/lib/inspector-job-assignment.ts";

const JOB_ID = "job-photo-del-01";
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

function makeJob(overrides = {}) {
  const base = defaultJob();
  return {
    ...base,
    id: JOB_ID,
    photos: [],
    updatedAt: "2026-07-12T10:00:00.000Z",
    ...overrides,
  };
}

console.log("JA-PHOTO-DEL-T01 — mergePhotoTombstones same photoId, higher deletedAt wins");
{
  const older = { photoId: "p1", deletedAt: "2026-07-12T10:00:00.000Z", deletedBy: "a" };
  const newer = { photoId: "p1", deletedAt: "2026-07-12T11:00:00.000Z", deletedBy: "b" };
  const merged = mergePhotoTombstones([older], [newer]);
  assert(merged.length === 1, "single tombstone");
  assert(merged[0].deletedBy === "b", "newer deletedAt wins");
}

console.log("\nJA-PHOTO-DEL-T02 — filterPhotosByTombstones");
{
  const photos = [makePhoto("keep"), makePhoto("gone")];
  const tombstones = [{ photoId: "gone", deletedAt: "2026-07-12T12:00:00.000Z" }];
  const filtered = filterPhotosByTombstones(photos, tombstones);
  assert(filtered.length === 1 && filtered[0].id === "keep", "tombstoned id excluded");
}

console.log("\nJA-PHOTO-DEL-T03 — mergePhotos + tombstone: cloud has photo, local deleted");
{
  const tombstones = [{ photoId: "p1", deletedAt: "2026-07-12T12:00:00.000Z" }];
  const merged = mergePhotos([], [makePhoto("p1")], tombstones);
  assert(merged.length === 0, "tombstoned photo excluded from union");
}

console.log("\nJA-PHOTO-DEL-T04 — mergePhotos without tombstone: regresja ASSETS add");
{
  const merged = mergePhotos([makePhoto("p1")], [], undefined);
  assert(merged.length === 1 && merged[0].id === "p1", "local photo preserved without tombstone");
}

console.log("\nJA-PHOTO-DEL-T05 — mergeJobsById local tombstone + delete, cloud stale photo");
{
  const tombstones = [{ photoId: "stale-1", deletedAt: "2026-07-12T12:00:00.000Z" }];
  const local = [
    makeJob({
      photos: [],
      deletedPhotoTombstones: tombstones,
      updatedAt: "2026-07-12T12:00:05.000Z",
    }),
  ];
  const cloud = [
    makeJob({
      photos: [makePhoto("stale-1")],
      updatedAt: "2026-07-12T11:00:00.000Z",
    }),
  ];
  const merged = mergeJobsById(local, cloud, []);
  const job = merged.find((j) => j.id === JOB_ID);
  assert(job?.photos?.length === 0, `photo not resurrected (got ${job?.photos?.length})`);
  assert(
    job?.deletedPhotoTombstones?.some((t) => t.photoId === "stale-1"),
    "tombstone kept",
  );
}

console.log("\nJA-PHOTO-DEL-T06 — removePhotoWithTombstone");
{
  const photo = makePhoto("rm-1");
  const job = makeJob({ photos: [photo, makePhoto("rm-2")] });
  const next = removePhotoWithTombstone(job, "rm-1", { deletedBy: "admin" });
  assert(next.photos?.length === 1 && next.photos[0].id === "rm-2", "photo removed from array");
  assert(
    next.deletedPhotoTombstones?.some((t) => t.photoId === "rm-1"),
    "tombstone appended",
  );
}

console.log("\nJA-PHOTO-DEL-T07 — reconcile fresh LS tombstone vs merged cloud photo");
{
  const tombstones = [{ photoId: "fresh-del", deletedAt: "2026-07-12T12:00:00.000Z" }];
  const freshJob = makeJob({
    photos: [],
    deletedPhotoTombstones: tombstones,
    updatedAt: "2026-07-12T12:00:05.000Z",
  });
  const cloudJob = makeJob({
    photos: [makePhoto("fresh-del")],
    updatedAt: "2026-07-12T11:00:00.000Z",
  });
  const staleMerged = bundleWithJobs([cloudJob]);
  const reconciled = reconcileJobsWithFreshLocal(staleMerged, [freshJob]);
  const job = jobsFromBundle(reconciled).find((j) => j.id === JOB_ID);
  assert(job?.photos?.length === 0, "reconcile keeps delete");
}

console.log("\nJA-PHOTO-DEL-T08 — regresja jobFiles / workEntries / assignedInspectorId");
{
  const ts = "2026-07-12T10:00:10.000Z";
  const local = [
    makeJob({
      updatedAt: ts,
      jobFiles: [{ id: "lf1", name: "local.pdf", kind: "zlecenie", uploadedAt: ts }],
      workEntries: [{ id: "we-local", directoryId: "d1", employeeName: "A", date: "2026-07-07", hours: 8 }],
      assignedInspectorId: "szymon",
    }),
  ];
  const cloud = [
    makeJob({
      updatedAt: ts,
      jobFiles: [{ id: "cf1", name: "cloud.pdf", kind: "kosztorys", uploadedAt: ts }],
      workEntries: [{ id: "we-cloud", directoryId: "d2", employeeName: "B", date: "2026-07-07", hours: 6 }],
      assignedInspectorId: undefined,
    }),
  ];
  const merged = mergeJobsById(local, cloud, []);
  const job = merged.find((j) => j.id === JOB_ID);
  const fileIds = (job?.jobFiles ?? []).map((f) => f.id).sort();
  const entryIds = (job?.workEntries ?? []).map((e) => e.id).sort();
  assert(fileIds.includes("lf1") && fileIds.includes("cf1"), `jobFiles union (${fileIds.join(",")})`);
  assert(entryIds.includes("we-local") && entryIds.includes("we-cloud"), `workEntries union`);
  assert(job?.assignedInspectorId === "szymon", "inspector preserved");
  assert(
    mergeAssignedInspectorId("szymon", undefined, true) === "szymon",
    "mergeAssignedInspectorId helper",
  );
}

console.log("\nJA-PHOTO-DEL-T09 — regresja ASSETS union add (local +photo, cloud newer)");
{
  const localPhoto = makePhoto("assets-regression");
  const local = [
    makeJob({
      photos: [localPhoto],
      updatedAt: "2026-07-12T10:00:05.000Z",
    }),
  ];
  const cloud = [
    makeJob({
      photos: [],
      updatedAt: "2026-07-12T10:00:20.000Z",
    }),
  ];
  const merged = mergeJobsById(local, cloud, []);
  const job = merged.find((j) => j.id === JOB_ID);
  assert(job?.photos?.some((p) => p.id === "assets-regression"), "ASSETS add+sync regresja");
}

console.log("\nJA-PHOTO-DEL-T10 — buildPhotoTombstone shape");
{
  const photo = makePhoto("t10");
  const ts = buildPhotoTombstone(photo, { deletedBy: "tester" });
  assert(ts.photoId === "t10", "photoId set");
  assert(ts.path?.includes("t10"), "path captured");
  assert(ts.deletedBy === "tester", "deletedBy set");
}

console.log("\nJA-PHOTO-DEL-T11 — Device A delete → Device B pull/sync (photo nie wraca)");
{
  const photo = makePhoto("cross-device-1");
  const tombstone = {
    photoId: "cross-device-1",
    deletedAt: "2026-07-12T12:00:00.000Z",
    deletedBy: "DeviceA",
  };
  const cloudAfterDeviceA = [
    makeJob({
      photos: [],
      deletedPhotoTombstones: [tombstone],
      updatedAt: "2026-07-12T12:00:05.000Z",
    }),
  ];
  const deviceBLocal = [
    makeJob({
      photos: [photo],
      updatedAt: "2026-07-12T11:00:00.000Z",
    }),
  ];
  const mergedPull = mergeJobsById(deviceBLocal, cloudAfterDeviceA, []);
  const jobPull = mergedPull.find((j) => j.id === JOB_ID);
  assert(jobPull?.photos?.length === 0, "Device B pull: photo not resurrected");
  assert(
    jobPull?.deletedPhotoTombstones?.some((t) => t.photoId === "cross-device-1"),
    "Device B pull: tombstone from cloud",
  );

  const staleMerged = bundleWithJobs(cloudAfterDeviceA);
  const reconciled = reconcileJobsWithFreshLocal(staleMerged, deviceBLocal);
  const jobReconcile = jobsFromBundle(reconciled).find((j) => j.id === JOB_ID);
  assert(jobReconcile?.photos?.length === 0, "Device B reconcile: photo not resurrected");
}

console.log(`\n${"=".repeat(48)}`);
console.log(`JOBS-PHOTOS-DELETE-SYNC-01: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
