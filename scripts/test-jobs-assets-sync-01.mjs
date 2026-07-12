/**
 * JOBS-ASSETS-SYNC-01 — photos[] union merge in mergeJobsById
 * Run: npx vite-node scripts/test-jobs-assets-sync-01.mjs
 */
import { defaultJob } from "../src/app/app-domain.ts";
import {
  DATA_KEYS,
  mergeJobsById,
  reconcileJobsWithFreshLocal,
} from "../src/lib/cloud-sync.ts";
import { mergePhotos } from "../src/lib/job-photos.ts";
import { mergeAssignedInspectorId } from "../src/lib/inspector-job-assignment.ts";

const JOB_ID = "job-assets-01";
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

console.log("JA-ASSETS-T01 — mergePhotos union bez kolizji id");
{
  const a = [makePhoto("p1"), makePhoto("p2")];
  const b = [makePhoto("p3")];
  const merged = mergePhotos(a, b);
  assert(merged.length === 3, `length=3 (got ${merged.length})`);
  assert(merged.some((p) => p.id === "p1"), "p1 present");
  assert(merged.some((p) => p.id === "p3"), "p3 present");
}

console.log("\nJA-ASSETS-T02 — mergePhotos kolizja id, nowszy uploadedAt wygrywa");
{
  const older = makePhoto("p1", "2026-07-12T10:00:00.000Z");
  const newer = { ...makePhoto("p1", "2026-07-12T11:00:00.000Z"), caption: "newer" };
  const merged = mergePhotos([older], [newer]);
  assert(merged.length === 1, "single entry");
  assert(merged[0].caption === "newer", "newer record wins on id collision (b after a)");
}

console.log("\nJA-ASSETS-T03 — mergeJobsById local +photos, cloud newer updatedAt bez photos");
{
  const localPhoto = makePhoto("local-photo-1");
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
      jobFiles: [{ id: "f1", name: "zlecenie.pdf", kind: "zlecenie", uploadedAt: "2026-07-12T09:00:00.000Z" }],
    }),
  ];
  const merged = mergeJobsById(local, cloud, []);
  const job = merged.find((j) => j.id === JOB_ID);
  assert(job?.photos?.length === 1, `photos preserved (got ${job?.photos?.length})`);
  assert(job?.photos?.[0]?.id === "local-photo-1", "local photo id kept");
}

console.log("\nJA-ASSETS-T04 — remis updatedAt, cloud wyższy jobMergeScore, local +photos");
{
  const ts = "2026-07-12T10:00:10.000Z";
  const local = [
    makeJob({
      photos: [makePhoto("crew-1")],
      updatedAt: ts,
      workEntries: [],
    }),
  ];
  const cloud = [
    makeJob({
      photos: [],
      updatedAt: ts,
      jobFiles: [
        { id: "f1", name: "a.pdf", kind: "zlecenie", uploadedAt: ts },
        { id: "f2", name: "b.pdf", kind: "kosztorys", uploadedAt: ts },
        { id: "f3", name: "c.pdf", kind: "plan_techniczny", uploadedAt: ts },
      ],
    }),
  ];
  const merged = mergeJobsById(local, cloud, []);
  const job = merged.find((j) => j.id === JOB_ID);
  assert(job?.photos?.length === 1, "photos kept despite cloud jobMergeScore win");
  assert(job?.photos?.[0]?.id === "crew-1", "crew photo id");
}

console.log("\nJA-ASSETS-T05 — reconcileJobsWithFreshLocal fresh LS +photos vs merged bez");
{
  const freshPhoto = makePhoto("fresh-photo");
  const freshJob = makeJob({
    photos: [freshPhoto],
    updatedAt: "2026-07-12T10:00:05.000Z",
  });
  const cloudJob = makeJob({
    photos: [],
    updatedAt: "2026-07-12T10:00:25.000Z",
  });
  const staleMerged = bundleWithJobs([cloudJob]);
  const reconciled = reconcileJobsWithFreshLocal(staleMerged, [freshJob]);
  const job = jobsFromBundle(reconciled).find((j) => j.id === JOB_ID);
  assert(job?.photos?.length === 1, "reconcile preserves fresh photos");
  assert(job?.photos?.[0]?.id === "fresh-photo", "fresh photo id");
}

console.log("\nJA-ASSETS-T06 — regresja jobFiles union (remis updatedAt)");
{
  const ts = "2026-07-12T10:00:10.000Z";
  const local = [
    makeJob({
      updatedAt: ts,
      jobFiles: [{ id: "lf1", name: "local.pdf", kind: "zlecenie", uploadedAt: ts }],
    }),
  ];
  const cloud = [
    makeJob({
      updatedAt: ts,
      jobFiles: [{ id: "cf1", name: "cloud.pdf", kind: "kosztorys", uploadedAt: ts }],
    }),
  ];
  const merged = mergeJobsById(local, cloud, []);
  const job = merged.find((j) => j.id === JOB_ID);
  const ids = (job?.jobFiles ?? []).map((f) => f.id).sort();
  assert(ids.includes("lf1") && ids.includes("cf1"), `jobFiles union (got ${ids.join(",")})`);
}

console.log("\nJA-ASSETS-T07 — regresja workEntries union");
{
  const local = [
    makeJob({
      updatedAt: "2026-07-12T10:00:00.000Z",
      workEntries: [{ id: "we-local", directoryId: "d1", employeeName: "A", date: "2026-07-07", hours: 8 }],
    }),
  ];
  const cloud = [
    makeJob({
      updatedAt: "2026-07-12T10:00:10.000Z",
      workEntries: [{ id: "we-cloud", directoryId: "d2", employeeName: "B", date: "2026-07-07", hours: 6 }],
    }),
  ];
  const merged = mergeJobsById(local, cloud, []);
  const job = merged.find((j) => j.id === JOB_ID);
  const ids = (job?.workEntries ?? []).map((e) => e.id).sort();
  assert(ids.includes("we-local") && ids.includes("we-cloud"), `workEntries union (got ${ids.join(",")})`);
}

console.log("\nJA-ASSETS-T08 — regresja assignedInspectorId field merge");
{
  assert(
    mergeAssignedInspectorId("szymon", undefined, true) === "szymon",
    "local inspector kept when prefer newer",
  );
  assert(
    mergeAssignedInspectorId(undefined, "pawel", true) === "pawel",
    "incoming inspector when local empty",
  );
  const local = [
    makeJob({
      assignedInspectorId: "szymon",
      updatedAt: "2026-07-12T10:00:05.000Z",
    }),
  ];
  const cloud = [
    makeJob({
      assignedInspectorId: undefined,
      updatedAt: "2026-07-12T10:00:20.000Z",
    }),
  ];
  const merged = mergeJobsById(local, cloud, []);
  const job = merged.find((j) => j.id === JOB_ID);
  assert(job?.assignedInspectorId === "szymon", "inspector preserved vs stale cloud");
}

console.log(`\n${"=".repeat(48)}`);
console.log(`JOBS-ASSETS-SYNC-01: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
