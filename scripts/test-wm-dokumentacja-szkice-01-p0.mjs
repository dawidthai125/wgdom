/**
 * WM-DOKUMENTACJA-SZKICE-01 P0 — domain · ACL · workflow · A2 regression · sort · pending
 * Run: npx vite-node scripts/test-wm-dokumentacja-szkice-01-p0.mjs
 */
import assert from "node:assert/strict";
import {
  isDrawingVisibleInRysunkiTab,
  parseWmTechnicalDrawing,
} from "../src/lib/wm-technical-drawings/normalize.ts";
import { filterDrawingsForRysunkiTab } from "../src/lib/wm-technical-drawings/merge.ts";
import {
  canAcceptJobSketch,
  canMarkNeedsChanges,
  compareJobSketchesForList,
  countPendingJobSketches,
  filterJobSketchesForDokumentacja,
} from "../src/lib/wm-technical-drawings/job-sketch-list.ts";
import {
  acceptJobSketch,
  createJobSketch,
  createWorkerSketch,
  markJobSketchNeedsChanges,
  resubmitWorkerSketch,
  submitWorkerSketch,
} from "../src/lib/wm-technical-drawings/workflow.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  PASS ${name}`);
}

console.log("WM-DOKUMENTACJA-SZKICE-01 P0\n");

// Domain on create
const created = createWorkerSketch({
  jobId: "job-1",
  address: "A",
  workerUserId: "w1",
  workerName: "Piotrek",
});
ok("create ok", created.ok === true);
if (!created.ok) throw new Error("create");
ok("domain job_sketch", created.drawing.domain === "job_sketch");
ok("status draft", created.drawing.status === "draft");
ok("A2 hides worker draft", !isDrawingVisibleInRysunkiTab(created.drawing));

const submitted = submitWorkerSketch(created.drawing, {
  expectedRevisionNumber: 1,
  workerUserId: "w1",
  workerName: "Piotrek",
});
ok("submit ok", submitted.ok === true);
if (!submitted.ok) throw new Error("submit");
ok("submitted status", submitted.drawing.workflowStatus === "submitted");
ok("A2 hides submitted", !isDrawingVisibleInRysunkiTab(submitted.drawing));
ok("still job_sketch", submitted.drawing.domain === "job_sketch");

// Inspector needs_changes
const ncInsp = markJobSketchNeedsChanges(submitted.drawing, {
  expectedRevisionNumber: submitted.drawing.revisionNumber,
  actorUserId: "i1",
  actorName: "Adam",
  actorRole: "inspector",
});
ok("inspector needs_changes", ncInsp.ok === true);
if (!ncInsp.ok) throw new Error("nc");

// Inspector cannot accept
const acceptInsp = acceptJobSketch(submitted.drawing, {
  expectedRevisionNumber: submitted.drawing.revisionNumber,
  actorUserId: "i1",
  actorName: "Adam",
  actorRole: "inspector",
});
ok("inspector accept forbidden", acceptInsp.ok === false && acceptInsp.reason === "forbidden");
ok("canAccept inspector false", canAcceptJobSketch("inspector") === false);
ok("canNeedsChanges inspector true", canMarkNeedsChanges("inspector") === true);

// Resubmit
const resub = resubmitWorkerSketch(ncInsp.drawing, {
  expectedRevisionNumber: ncInsp.drawing.revisionNumber,
  workerUserId: "w1",
  workerName: "Piotrek",
});
ok("resubmit ok", resub.ok === true);
if (!resub.ok) throw new Error("resub");
ok("resubmit → submitted", resub.drawing.workflowStatus === "submitted");

// Admin accept (deprecated → resolved + docs-only)
const accepted = acceptJobSketch(resub.drawing, {
  expectedRevisionNumber: resub.drawing.revisionNumber,
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
});
ok("admin accept", accepted.ok === true);
if (!accepted.ok) throw new Error("accept");
ok("accepted wf → resolved", accepted.drawing.workflowStatus === "resolved");
ok("accept keeps draft status", accepted.drawing.status === "draft");
ok("A2 still hides resolved sketch", !isDrawingVisibleInRysunkiTab(accepted.drawing));
ok("placement docs-only", accepted.drawing.placement?.documentation === true && accepted.drawing.placement?.reception === false);

// ACL list
const other = createWorkerSketch({
  jobId: "job-1",
  workerUserId: "w2",
  workerName: "Inny",
});
if (!other.ok) throw new Error("other");
const pool = [created.drawing, submitted.drawing, accepted.drawing, other.drawing];

const workerList = filterJobSketchesForDokumentacja(pool, "job-1", {
  viewerRole: "worker",
  viewerUserId: "w1",
});
ok(
  "worker only own",
  workerList.every((d) => !d.createdByUserId || d.createdByUserId === "w1"),
);

const adminList = filterJobSketchesForDokumentacja(pool, "job-1", {
  viewerRole: "admin",
  viewerUserId: "a1",
});
ok("admin sees all job sketches", adminList.length >= 2);

const inspList = filterJobSketchesForDokumentacja(
  [submitted.drawing, other.drawing],
  "job-1",
  { viewerRole: "inspector", viewerUserId: "i1" },
);
ok("inspector sees both workers", inspList.length === 2);

// Sort
const draft2 = createWorkerSketch({
  jobId: "job-1",
  workerUserId: "w1",
  workerName: "Piotrek",
  title: "Draft",
});
if (!draft2.ok) throw new Error("d2");
const sorted = [draft2.drawing, accepted.drawing, resub.drawing].sort(compareJobSketchesForList);
ok("sort submitted first", sorted[0].workflowStatus === "submitted");
ok("sort resolved before draft", sorted[1].workflowStatus === "resolved");
ok("sort draft last", sorted[2].workflowStatus === "worker_draft");

// Pending badge
const pendingAdmin = countPendingJobSketches([resub.drawing, accepted.drawing, draft2.drawing], "job-1", {
  viewerRole: "admin",
});
ok("pending counts submitted", pendingAdmin === 1);

// A2 regression — reception draft still visible; worker never
const reception = parseWmTechnicalDrawing({
  ...buildDrawingFromTemplate("blank", { jobId: "job-1" }),
  domain: "reception",
  origin: "admin",
  status: "draft",
  workflowStatus: "resolved",
});
ok("reception draft in A2", reception && isDrawingVisibleInRysunkiTab(reception));
ok(
  "Rysunki tab excludes job sketches",
  filterDrawingsForRysunkiTab([submitted.drawing, accepted.drawing, reception].filter(Boolean)).every(
    (d) => d.domain !== "job_sketch" || d.status === "final",
  ),
);

// Admin create job sketch
const adminSketch = createJobSketch({
  jobId: "job-1",
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
  origin: "admin",
});
ok("admin create job_sketch", adminSketch.ok && adminSketch.drawing.domain === "job_sketch");

// L0 stale
const stale = acceptJobSketch(resub.drawing, {
  expectedRevisionNumber: 1,
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
});
ok("L0 stale reject", stale.ok === false && stale.reason === "stale_revision");

console.log(`\nOK ${passed} assertions`);
