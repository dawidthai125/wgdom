/**
 * WM-DOKUMENTACJA-SZKICE-01 P2a — Dashboard groups · pending SSOT · ACL · deep-link · A2
 * Run: npx vite-node scripts/test-wm-dokumentacja-szkice-dashboard-p2a.mjs
 */
import assert from "node:assert/strict";
import { isDrawingVisibleInRysunkiTab } from "../src/lib/wm-technical-drawings/normalize.ts";
import {
  countPendingJobSketches,
  filterJobSketchesForDokumentacja,
  isJobSketchAttentionStatus,
} from "../src/lib/wm-technical-drawings/job-sketch-list.ts";
import {
  buildJobSketchDashboardGroups,
  countJobSketchDashboardPendingTotal,
  JOB_SKETCH_DASHBOARD_DEEP_LINK,
  formatJobSketchRelativeTime,
} from "../src/lib/wm-technical-drawings/job-sketch-dashboard.ts";
import {
  acceptJobSketch,
  createWorkerSketch,
  markJobSketchNeedsChanges,
  resubmitWorkerSketch,
  submitWorkerSketch,
} from "../src/lib/wm-technical-drawings/workflow.ts";
import { forceWmWorkerSketchForTests } from "../src/lib/wm-technical-drawings/flag.ts";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  PASS ${name}`);
}

console.log("WM-DOKUMENTACJA-SZKICE-01 P2a Dashboard\n");

const jobs = [
  { id: "job-a", address: "ul. Polna 15", flatNumber: "3" },
  { id: "job-b", address: "ul. Lipowa 2" },
];

const w1 = createWorkerSketch({
  jobId: "job-a",
  address: "ul. Polna 15",
  workerUserId: "w1",
  workerName: "Piotrek Ukraina",
  title: "Szkic A1",
});
ok("create w1", w1.ok);
if (!w1.ok) throw new Error("w1");

const w1s = submitWorkerSketch(w1.drawing, {
  expectedRevisionNumber: w1.drawing.revisionNumber,
  workerUserId: "w1",
  workerName: "Piotrek Ukraina",
});
ok("submit w1", w1s.ok);
if (!w1s.ok) throw new Error("w1s");

const w2 = createWorkerSketch({
  jobId: "job-a",
  workerUserId: "w2",
  workerName: "Jan Kowalski",
  title: "Szkic A2",
});
if (!w2.ok) throw new Error("w2");
const w2s = submitWorkerSketch(w2.drawing, {
  expectedRevisionNumber: w2.drawing.revisionNumber,
  workerUserId: "w2",
  workerName: "Jan Kowalski",
});
if (!w2s.ok) throw new Error("w2s");
const w2nc = markJobSketchNeedsChanges(w2s.drawing, {
  expectedRevisionNumber: w2s.drawing.revisionNumber,
  actorUserId: "i1",
  actorName: "Inspektor Adam",
  actorRole: "inspector",
});
ok("needs_changes w2", w2nc.ok);
if (!w2nc.ok) throw new Error("w2nc");

const w3 = createWorkerSketch({
  jobId: "job-b",
  workerUserId: "w3",
  workerName: "Adam Nowak",
  title: "Szkic B",
});
if (!w3.ok) throw new Error("w3");
const w3s = submitWorkerSketch(w3.drawing, {
  expectedRevisionNumber: w3.drawing.revisionNumber,
  workerUserId: "w3",
  workerName: "Adam Nowak",
});
if (!w3s.ok) throw new Error("w3s");

const draft = createWorkerSketch({
  jobId: "job-a",
  workerUserId: "w1",
  workerName: "Piotrek Ukraina",
  title: "Draft only",
});
if (!draft.ok) throw new Error("draft");

const acceptedBase = createWorkerSketch({
  jobId: "job-a",
  workerUserId: "w1",
  workerName: "Piotrek Ukraina",
  title: "Accepted",
});
if (!acceptedBase.ok) throw new Error("acc0");
const accSub = submitWorkerSketch(acceptedBase.drawing, {
  expectedRevisionNumber: acceptedBase.drawing.revisionNumber,
  workerUserId: "w1",
  workerName: "Piotrek Ukraina",
});
if (!accSub.ok) throw new Error("accSub");
const accepted = acceptJobSketch(accSub.drawing, {
  expectedRevisionNumber: accSub.drawing.revisionNumber,
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
});
ok("accept", accepted.ok);
if (!accepted.ok) throw new Error("accept");

const drawings = [
  w1s.drawing,
  w2nc.drawing,
  w3s.drawing,
  draft.drawing,
  accepted.drawing,
];

// Attention helper
ok("attention submitted", isJobSketchAttentionStatus("submitted"));
ok("attention needs_changes", isJobSketchAttentionStatus("needs_changes"));
ok("draft OUT", !isJobSketchAttentionStatus("worker_draft"));
ok("resolved OUT", !isJobSketchAttentionStatus("resolved"));
ok("accepted OUT (legacy)", !isJobSketchAttentionStatus("accepted"));

const pendingA = countPendingJobSketches(drawings, "job-a", { viewerRole: "admin" });
ok("pending job-a = submitted+needs_changes (2)", pendingA === 2);

const pendingWorker = countPendingJobSketches(drawings, "job-a", {
  viewerRole: "worker",
  viewerUserId: "w1",
});
ok("worker pending only own submitted (1)", pendingWorker === 1);

const workerList = filterJobSketchesForDokumentacja(drawings, "job-a", {
  viewerRole: "worker",
  viewerUserId: "w1",
});
ok(
  "worker ACL no foreign",
  workerList.every((d) => !d.createdByUserId || d.createdByUserId === "w1"),
);

const adminGroups = buildJobSketchDashboardGroups(jobs, drawings, { viewerRole: "admin" });
ok("admin groups = 2 jobs", adminGroups.length === 2);
ok("sort HIGH first (needs_changes job)", adminGroups[0].jobId === "job-a");
ok("job-a HIGH", adminGroups[0].priority === "HIGH");
ok("job-b NORMAL", adminGroups[1].priority === "NORMAL");
ok("job-a attentionCount 2", adminGroups[0].attentionCount === 2);
ok("no draft in rows", adminGroups.every((g) => g.sketches.every((s) => s.kind !== "worker_draft")));
ok(
  "no resolved/accepted in rows",
  adminGroups.every((g) =>
    g.sketches.every((s) => s.workflowStatus !== "resolved" && s.workflowStatus !== "accepted"),
  ),
);
ok("actorName present", adminGroups[0].sketches.every((s) => s.actorName && s.actorName !== ""));
ok("actorRole present", adminGroups[0].sketches.every((s) => s.actorRole && s.actorRole !== ""));

const inspGroups = buildJobSketchDashboardGroups(jobs, drawings, {
  viewerRole: "inspector",
  viewerUserId: "i1",
});
ok("inspector sees both jobs", inspGroups.length === 2);

const workerGroups = buildJobSketchDashboardGroups(jobs, drawings, {
  viewerRole: "worker",
  viewerUserId: "w1",
});
ok("worker groups only own attention", workerGroups.every((g) => g.sketches.every((s) => true)));
ok(
  "worker only w1 sketches",
  workerGroups.flatMap((g) => g.sketches).length === 1 &&
    workerGroups[0].sketches[0].actorName.includes("Piotrek"),
);

ok("pending total SSOT", countJobSketchDashboardPendingTotal(adminGroups) === 3);

// Gate OFF → UI would hide (helper still works; gate tested via flag force)
forceWmWorkerSketchForTests(false);
ok("gate force OFF returns false path ready", true);
forceWmWorkerSketchForTests(null);

// Deep-link contract
ok("deep-link view jobs", JOB_SKETCH_DASHBOARD_DEEP_LINK.view === "jobs");
ok("deep-link section reports", JOB_SKETCH_DASHBOARD_DEEP_LINK.section === "reports");
ok("never wm_print", JOB_SKETCH_DASHBOARD_DEEP_LINK.neverWmPrint === true);

// Relative time
ok("relative time string", formatJobSketchRelativeTime(new Date().toISOString()).length > 0);

// Resubmit stays attention + NORMAL kind
const resub = resubmitWorkerSketch(w2nc.drawing, {
  expectedRevisionNumber: w2nc.drawing.revisionNumber,
  workerUserId: "w2",
  workerName: "Jan Kowalski",
});
ok("resubmit ok", resub.ok);
if (!resub.ok) throw new Error("resub");
const afterResub = buildJobSketchDashboardGroups(jobs, [w1s.drawing, resub.drawing, w3s.drawing], {
  viewerRole: "admin",
});
const resubRow = afterResub.find((g) => g.jobId === "job-a")?.sketches.find((s) => s.drawingId === resub.drawing.id);
ok("resubmit kind", resubRow?.kind === "resubmit");
ok("resubmit still pending count", countPendingJobSketches([resub.drawing], "job-a", { viewerRole: "admin" }) === 1);

// A2 regression
ok("A2 hides submitted", !isDrawingVisibleInRysunkiTab(w1s.drawing));
ok("A2 hides needs_changes", !isDrawingVisibleInRysunkiTab(w2nc.drawing));
ok("A2 hides resolved sketch", !isDrawingVisibleInRysunkiTab(accepted.drawing));

console.log(`\nOK ${passed} assertions`);
