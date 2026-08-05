/** WM-DOKUMENTACJA-SZKICE-02 — Publication Workflow tests. */
import assert from "node:assert/strict";
import {
  assertPlacementInvariant,
  applyJobSketchPlacement,
  findLinkedReceptionDrawing,
  isJobSketchVisibleInDokumentacja,
  softDeleteLinkedReceptionDrawing,
  undeleteDrawing,
} from "../src/lib/wm-technical-drawings/placement.ts";
import {
  canPublishJobSketch,
  canMarkNeedsChanges,
  countPendingJobSketches,
  filterJobSketchesForDokumentacja,
  isJobSketchAttentionStatus,
} from "../src/lib/wm-technical-drawings/job-sketch-list.ts";
import { isDrawingVisibleInRysunkiTab, parseWmTechnicalDrawing } from "../src/lib/wm-technical-drawings/normalize.ts";
import {
  createWorkerSketch,
  markJobSketchNeedsChanges,
  softDeleteDrawing,
  submitWorkerSketch,
} from "../src/lib/wm-technical-drawings/workflow.ts";
import { buildJobSketchDashboardGroups } from "../src/lib/wm-technical-drawings/job-sketch-dashboard.ts";

let n = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  n += 1;
  console.log(`  PASS ${label}`);
}

console.log("WM-DOKUMENTACJA-SZKICE-02 Publication Workflow");

// --- invariant ---
ok("inv softDeleted ok", assertPlacementInvariant({ documentation: false, reception: false }, true).ok);
ok("inv docs ok", assertPlacementInvariant({ documentation: true, reception: false }, false).ok);
ok("inv both ok", assertPlacementInvariant({ documentation: true, reception: true }, false).ok);
ok("inv false/false fail", !assertPlacementInvariant({ documentation: false, reception: false }, false).ok);

// --- normalize accepted → resolved ---
const legacy = parseWmTechnicalDrawing({
  id: "leg-1",
  title: "L",
  templateId: "blank",
  status: "draft",
  domain: "job_sketch",
  origin: "worker",
  workflowStatus: "accepted",
  revisionNumber: 2,
  page: { format: "A4", orientation: "portrait", width: 595, height: 842 },
  objects: [],
  grid: { enabled: true, size: 10, snap: true },
  documentDate: "2026-08-05",
  createdAt: "2026-08-05T00:00:00.000Z",
  updatedAt: "2026-08-05T00:00:00.000Z",
  photoIds: [],
  jobId: "job-1",
});
ok("legacy → resolved", legacy?.workflowStatus === "resolved");
ok("legacy placement docs-only", legacy?.placement?.documentation === true && legacy?.placement?.reception === false);

const created = createWorkerSketch({
  jobId: "job-1",
  workerUserId: "w1",
  workerName: "Worker",
  title: "S1",
});
ok("create", created.ok);
const submitted = submitWorkerSketch(created.drawing, {
  expectedRevisionNumber: created.drawing.revisionNumber,
  workerUserId: "w1",
  workerName: "Worker",
});
ok("submit", submitted.ok);

// --- Inspector ACL: no publish ---
ok("inspector can needs", canMarkNeedsChanges("inspector"));
ok("inspector cannot publish", canPublishJobSketch("inspector") === false);
const inspPub = applyJobSketchPlacement([submitted.drawing], submitted.drawing, {
  expectedRevisionNumber: submitted.drawing.revisionNumber,
  actorUserId: "i1",
  actorName: "Insp",
  actorRole: "inspector",
  placement: { documentation: true, reception: false },
});
ok("inspector publish forbidden", !inspPub.ok && inspPub.reason === "forbidden");

// --- Worker ACL ---
ok("worker cannot publish", canPublishJobSketch("worker") === false);

// --- docs-only ---
const docsOnly = applyJobSketchPlacement([submitted.drawing], submitted.drawing, {
  expectedRevisionNumber: submitted.drawing.revisionNumber,
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
  placement: { documentation: true, reception: false },
});
ok("docs-only ok", docsOnly.ok);
ok("docs-only resolved", docsOnly.ok && docsOnly.sketch.workflowStatus === "resolved");
ok(
  "docs-only placement",
  docsOnly.ok &&
    docsOnly.sketch.placement?.documentation === true &&
    docsOnly.sketch.placement?.reception === false,
);
ok("docs-only no reception copy", docsOnly.ok && !docsOnly.reception);
ok("attention OUT resolved", !isJobSketchAttentionStatus("resolved"));
ok(
  "dashboard OUT",
  buildJobSketchDashboardGroups([{ id: "job-1", address: "A" }], docsOnly.ok ? docsOnly.drawings : [], {
    viewerRole: "admin",
    viewerUserId: "a1",
  }).length === 0,
);
ok(
  "docs list shows resolved docs",
  docsOnly.ok &&
    filterJobSketchesForDokumentacja(docsOnly.drawings, "job-1", { viewerRole: "admin" }).some(
      (d) => d.id === docsOnly.sketch.id,
    ),
);

// --- reception-only + promote 1:1 ---
const created2 = createWorkerSketch({
  jobId: "job-2",
  workerUserId: "w1",
  workerName: "Worker",
  title: "S2",
});
const sub2 = submitWorkerSketch(created2.drawing, {
  expectedRevisionNumber: created2.drawing.revisionNumber,
  workerUserId: "w1",
  workerName: "Worker",
});
const recv = applyJobSketchPlacement([sub2.drawing], sub2.drawing, {
  expectedRevisionNumber: sub2.drawing.revisionNumber,
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
  placement: { documentation: false, reception: true },
});
ok("reception publish ok", recv.ok);
ok("reception copy exists", recv.ok && Boolean(recv.reception));
ok("reception domain", recv.ok && recv.reception?.domain === "reception");
ok("reception final", recv.ok && recv.reception?.status === "final");
ok("sourceSketchId", recv.ok && recv.reception?.sourceSketchId === recv.sketch.id);
ok("receptionDrawingId", recv.ok && recv.sketch.receptionDrawingId === recv.reception?.id);
ok("job sketch id unchanged", recv.ok && recv.sketch.id === sub2.drawing.id);
ok("A2 shows reception", recv.ok && recv.reception && isDrawingVisibleInRysunkiTab(recv.reception));
ok(
  "A2 hides job sketch worker non-final",
  recv.ok && !isDrawingVisibleInRysunkiTab(recv.sketch),
);
ok(
  "docs hides reception-only resolved",
  recv.ok && !isJobSketchVisibleInDokumentacja(recv.sketch),
);

// --- duplicate promote ---
const again = applyJobSketchPlacement(recv.ok ? recv.drawings : [], recv.ok ? recv.sketch : sub2.drawing, {
  expectedRevisionNumber: recv.ok ? recv.sketch.revisionNumber : 0,
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
  placement: { documentation: false, reception: true },
});
ok("re-promote ok", again.ok);
const receptions = (again.ok ? again.drawings : []).filter(
  (d) => d.domain === "reception" && d.sourceSketchId === (again.ok ? again.sketch.id : ""),
);
ok("no duplicate reception", receptions.length === 1);
ok("same reception id", again.ok && again.reception?.id === recv.reception?.id);

// --- soft-delete reception + undelete ---
const linked = findLinkedReceptionDrawing(again.ok ? again.drawings : [], again.ok ? again.sketch : sub2.drawing);
ok("linked found", Boolean(linked));
const soft = softDeleteLinkedReceptionDrawing(linked, {
  expectedRevisionNumber: linked.revisionNumber,
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
  sourceSketchId: again.ok ? again.sketch.id : "",
});
ok("softDelete linked ok", soft.ok);
ok("A2 hides soft-deleted reception", soft.ok && !isDrawingVisibleInRysunkiTab(soft.drawing));

let listAfterSoft = again.ok ? again.drawings.map((d) => (d.id === soft.drawing.id ? soft.drawing : d)) : [];
const offRecv = applyJobSketchPlacement(listAfterSoft, again.ok ? again.sketch : sub2.drawing, {
  expectedRevisionNumber: again.ok ? again.sketch.revisionNumber : 0,
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
  placement: { documentation: true, reception: false },
});
ok("toggle docs-only after soft ok", offRecv.ok);

const onAgain = applyJobSketchPlacement(offRecv.ok ? offRecv.drawings : [], offRecv.ok ? offRecv.sketch : sub2.drawing, {
  expectedRevisionNumber: offRecv.ok ? offRecv.sketch.revisionNumber : 0,
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
  placement: { documentation: true, reception: true },
});
ok("re-enable reception undelete path", onAgain.ok);
ok(
  "same reception after undelete",
  onAgain.ok && onAgain.reception?.id === linked.id && !onAgain.reception?.deletedAt,
);
ok("A2 shows after undelete", onAgain.ok && onAgain.reception && isDrawingVisibleInRysunkiTab(onAgain.reception));

// --- both ---
const created3 = createWorkerSketch({
  jobId: "job-3",
  workerUserId: "w1",
  workerName: "Worker",
  title: "S3",
});
const sub3 = submitWorkerSketch(created3.drawing, {
  expectedRevisionNumber: created3.drawing.revisionNumber,
  workerUserId: "w1",
  workerName: "Worker",
});
const both = applyJobSketchPlacement([sub3.drawing], sub3.drawing, {
  expectedRevisionNumber: sub3.drawing.revisionNumber,
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
  placement: { documentation: true, reception: true },
});
ok("both ok", both.ok);
ok(
  "both placement",
  both.ok && both.sketch.placement?.documentation && both.sketch.placement?.reception,
);
ok("both visible docs", both.ok && isJobSketchVisibleInDokumentacja(both.sketch));
ok("both reception A2", both.ok && both.reception && isDrawingVisibleInRysunkiTab(both.reception));

// --- Usuń → Dashboard OUT ---
const created4 = createWorkerSketch({
  jobId: "job-4",
  workerUserId: "w1",
  workerName: "Worker",
  title: "S4",
});
const sub4 = submitWorkerSketch(created4.drawing, {
  expectedRevisionNumber: created4.drawing.revisionNumber,
  workerUserId: "w1",
  workerName: "Worker",
});
ok(
  "pending before delete",
  countPendingJobSketches([sub4.drawing], "job-4", { viewerRole: "admin" }) === 1,
);
const deleted = softDeleteDrawing(sub4.drawing, {
  expectedRevisionNumber: sub4.drawing.revisionNumber,
  userId: "a1",
  role: "admin",
});
ok("delete ok", deleted.ok);
ok(
  "pending after delete 0",
  countPendingJobSketches([deleted.drawing], "job-4", { viewerRole: "admin" }) === 0,
);

// --- needs_changes still attention ---
const created5 = createWorkerSketch({
  jobId: "job-5",
  workerUserId: "w1",
  workerName: "Worker",
  title: "S5",
});
const sub5 = submitWorkerSketch(created5.drawing, {
  expectedRevisionNumber: created5.drawing.revisionNumber,
  workerUserId: "w1",
  workerName: "Worker",
});
const nc = markJobSketchNeedsChanges(sub5.drawing, {
  expectedRevisionNumber: sub5.drawing.revisionNumber,
  actorUserId: "i1",
  actorName: "Insp",
  actorRole: "inspector",
});
ok("needs_changes", nc.ok && nc.drawing.workflowStatus === "needs_changes");
ok("needs still attention", isJobSketchAttentionStatus("needs_changes"));

// --- undelete unit ---
const und = undeleteDrawing(soft.drawing, {
  expectedRevisionNumber: soft.drawing.revisionNumber,
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
});
ok("undelete standalone", und.ok && !und.drawing.deletedAt);

console.log(`\nOK ${n} assertions`);
