/**
 * WM-WORKER-SKETCH-01 P0 — schema · workflow · L0 revision · soft-delete · A2 filter
 * Run: npx vite-node scripts/test-wm-worker-sketch-01-p0.mjs
 */
import assert from "node:assert/strict";
import {
  isDrawingSoftDeleted,
  isDrawingVisibleInRysunkiTab,
  normalizeWmTechnicalDrawings,
  parseWmTechnicalDrawing,
} from "../src/lib/wm-technical-drawings/normalize.ts";
import { filterDrawingsForRysunkiTab, filterWorkerSketchesForJob, mergeWmTechnicalDrawings } from "../src/lib/wm-technical-drawings/merge.ts";
import { listFinalDrawingsForJob } from "../src/lib/wm-technical-drawings/zip-entries.ts";
import {
  createWorkerSketch,
  softDeleteWorkerSketch,
  submitWorkerSketch,
} from "../src/lib/wm-technical-drawings/workflow.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import { isWmWorkerSketchEnabled, forceWmWorkerSketchForTests } from "../src/lib/wm-technical-drawings/flag.ts";
import { defaultAppSettings } from "../src/lib/app-settings.ts";

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  passed += 1;
  console.log(`  PASS ${name}`);
}

console.log("WM-WORKER-SKETCH-01 P0\n");

// Flag default OFF
forceWmWorkerSketchForTests(null);
ok("flag default OFF", isWmWorkerSketchEnabled(defaultAppSettings()) === false);
forceWmWorkerSketchForTests(true);
ok("flag force ON", isWmWorkerSketchEnabled() === true);
forceWmWorkerSketchForTests(null);

// Legacy normalize
const legacy = parseWmTechnicalDrawing({
  id: "legacy-1",
  title: "Legacy",
  templateId: "blank",
  status: "draft",
  objects: [],
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-01T00:00:00.000Z",
  page: { format: "A4", orientation: "landscape" },
  grid: { enabled: true, step: 10, snap: true },
});
ok("legacy origin wm_druk", legacy?.origin === "wm_druk");
ok("legacy workflow accepted", legacy?.workflowStatus === "accepted");
ok("legacy revision 1", legacy?.revisionNumber === 1);
ok("legacy photoIds []", Array.isArray(legacy?.photoIds) && legacy.photoIds.length === 0);
ok("legacy visible in Rysunki", legacy && isDrawingVisibleInRysunkiTab(legacy));

// Create worker sketch
const created = createWorkerSketch({
  jobId: "job-1",
  address: "Test 1",
  workerUserId: "w1",
  workerName: "Jan",
});
ok("create ok", created.ok === true);
if (!created.ok) throw new Error("create failed");
ok("create origin worker", created.drawing.origin === "worker");
ok("create workflow worker_draft", created.drawing.workflowStatus === "worker_draft");
ok("create status draft", created.drawing.status === "draft");
ok("create rev 1", created.drawing.revisionNumber === 1);
ok("create NOT in Rysunki tab", !isDrawingVisibleInRysunkiTab(created.drawing));

// Submit L0
const stale = submitWorkerSketch(created.drawing, {
  expectedRevisionNumber: 99,
  workerUserId: "w1",
  workerName: "Jan",
});
ok("stale revision rejected", stale.ok === false && stale.reason === "stale_revision");

const submitted = submitWorkerSketch(created.drawing, {
  expectedRevisionNumber: 1,
  workerUserId: "w1",
  workerName: "Jan",
});
ok("submit ok", submitted.ok === true);
if (!submitted.ok) throw new Error("submit failed");
ok("submit status submitted", submitted.drawing.workflowStatus === "submitted");
ok("submit rev 2", submitted.drawing.revisionNumber === 2);

// Soft-delete only draft never submitted
const draft2 = createWorkerSketch({
  jobId: "job-1",
  workerUserId: "w1",
  workerName: "Jan",
});
ok("draft2 ok", draft2.ok);
if (!draft2.ok) throw new Error("draft2");
const delForbidden = softDeleteWorkerSketch(submitted.drawing, {
  expectedRevisionNumber: submitted.drawing.revisionNumber,
  workerUserId: "w1",
  workerName: "Jan",
});
ok("cannot soft-delete submitted", delForbidden.ok === false);

const deleted = softDeleteWorkerSketch(draft2.drawing, {
  expectedRevisionNumber: 1,
  workerUserId: "w1",
  workerName: "Jan",
});
ok("soft-delete draft ok", deleted.ok === true);
if (!deleted.ok) throw new Error("del");
ok("soft-deleted flag", isDrawingSoftDeleted(deleted.drawing));

// Merge LWW soft-delete wins when newer
const olderLive = { ...draft2.drawing, updatedAt: "2026-08-01T00:00:00.000Z" };
const merged = mergeWmTechnicalDrawings([olderLive], [deleted.drawing]);
const m = merged.find((d) => d.id === draft2.drawing.id);
ok("LWW soft-delete wins", m && isDrawingSoftDeleted(m));

// Filters
const list = normalizeWmTechnicalDrawings([legacy, created.drawing, submitted.drawing, deleted.drawing]);
ok(
  "Rysunki tab excludes worker non-final",
  filterDrawingsForRysunkiTab(list).every((d) => d.origin !== "worker" || d.status === "final"),
);
ok(
  "worker sketches filter active only",
  filterWorkerSketchesForJob(list, "job-1", "w1").every((d) => !isDrawingSoftDeleted(d)),
);

// ZIP finals exclude soft-deleted final
const adminFinal = buildDrawingFromTemplate("blank", { jobId: "job-1", address: "A" });
const asFinal = parseWmTechnicalDrawing({
  ...adminFinal,
  status: "final",
  workflowStatus: "accepted",
  origin: "wm_druk",
  revisionNumber: 1,
});
const asFinalDeleted = parseWmTechnicalDrawing({
  ...asFinal,
  deletedAt: "2026-08-05T00:00:00.000Z",
  updatedAt: "2026-08-05T01:00:00.000Z",
});
ok(
  "ZIP skips soft-deleted final",
  listFinalDrawingsForJob([asFinal, asFinalDeleted].filter(Boolean), "job-1").length === 1,
);

console.log(`\n${passed} assertions PASS`);
