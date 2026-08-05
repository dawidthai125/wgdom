/**
 * WM-ODBIORY-RYSUNKI-FINAL-UNDO-01 P0 — unsetDrawingFinal · soft-delete · ZIP · A2 · Publication.
 * Uruchom: npx vite-node scripts/test-wm-odbior-rysunki-final-undo-01.mjs
 */
import assert from "node:assert/strict";
import {
  applyJobSketchPlacement,
} from "../src/lib/wm-technical-drawings/placement.ts";
import {
  isDrawingVisibleInRysunkiTab,
} from "../src/lib/wm-technical-drawings/normalize.ts";
import {
  setDrawingFinal,
  unsetDrawingFinal,
  touchDrawing,
} from "../src/lib/wm-technical-drawings/report.ts";
import {
  createWorkerSketch,
  softDeleteDrawing,
  submitWorkerSketch,
} from "../src/lib/wm-technical-drawings/workflow.ts";
import {
  buildDrawingFingerprintDigests,
  countFinalDrawingsForJob,
  listFinalDrawingsForJob,
} from "../src/lib/wm-technical-drawings/zip-entries.ts";
import { buildDrawingFromTemplate } from "../src/lib/wm-technical-drawings/templates.ts";
import {
  WM_DRUK_AUDIT_ACTION_LABEL_PL,
} from "../src/lib/wm-druk-audit.ts";

let n = 0;
function ok(label, cond) {
  assert.ok(cond, label);
  n += 1;
  console.log(`  PASS ${label}`);
}

console.log("WM-ODBIORY-RYSUNKI-FINAL-UNDO-01 P0\n");

// --- draft ↔ final ---
const base = touchDrawing(
  buildDrawingFromTemplate("blank", {
    jobId: "job-fu-1",
    address: "Testowa 1",
  }),
  { title: "FU-1" },
);
ok("start draft", base.status === "draft");

const toFinal = setDrawingFinal(base);
ok("draft → final ok", toFinal.ok === true && toFinal.drawing?.status === "final");

const toDraft = unsetDrawingFinal(toFinal.drawing);
ok("final → draft ok", toDraft.ok === true && toDraft.drawing?.status === "draft");

ok("unset on draft fails", unsetDrawingFinal(base).ok === false);
ok("unset reason not_final", unsetDrawingFinal(base).reason === "not_final");

// --- admin delete final blocked ---
const finalDrawing = toFinal.drawing;
const delAdmin = softDeleteDrawing(finalDrawing, {
  expectedRevisionNumber: finalDrawing.revisionNumber,
  userId: "admin-1",
  role: "admin",
  name: "Admin",
});
ok("admin delete final blocked", delAdmin.ok === false);
ok(
  "copy bez demote",
  delAdmin.ok === false &&
    delAdmin.message === "Najpierw oznacz rysunek jako Roboczy." &&
    !String(delAdmin.message).toLowerCase().includes("demote"),
);

// --- delete po demote ---
const afterDemote = toDraft.drawing;
const delAfter = softDeleteDrawing(afterDemote, {
  expectedRevisionNumber: afterDemote.revisionNumber,
  userId: "admin-1",
  role: "admin",
  name: "Admin",
});
ok("delete po demote ok", delAfter.ok === true && Boolean(delAfter.drawing.deletedAt));

// --- SA path unchanged ---
const final2 = setDrawingFinal(
  touchDrawing(buildDrawingFromTemplate("blank", { jobId: "job-fu-2", address: "A 2" }), {
    title: "FU-SA",
  }),
).drawing;
const delSa = softDeleteDrawing(final2, {
  expectedRevisionNumber: final2.revisionNumber,
  userId: "sa-1",
  role: "super_admin",
  name: "SA",
});
ok("SA delete final ok (status quo)", delSa.ok === true && Boolean(delSa.drawing.deletedAt));
ok("SA delete keeps status final", delSa.drawing.status === "final");

// --- Reception: unsetFinal nie rusza placement / workflow / revisionMeta ---
const created = createWorkerSketch({
  jobId: "job-fu-pub",
  workerUserId: "w1",
  workerName: "Worker",
  title: "Pub sketch",
});
ok("worker create", created.ok);
const submitted = submitWorkerSketch(created.drawing, {
  expectedRevisionNumber: created.drawing.revisionNumber,
  workerUserId: "w1",
  workerName: "Worker",
});
ok("worker submit", submitted.ok);
const published = applyJobSketchPlacement([submitted.drawing], submitted.drawing, {
  expectedRevisionNumber: submitted.drawing.revisionNumber,
  actorUserId: "a1",
  actorName: "Admin",
  actorRole: "admin",
  placement: { documentation: true, reception: true },
});
ok("publish both", published.ok && Boolean(published.reception));
const reception = published.reception;
ok("reception starts final", reception.status === "final");

const sketchBefore = published.sketch;
const recvMetaBefore = JSON.stringify(reception.revisionMeta ?? []);
const placementBefore = JSON.stringify(sketchBefore.placement);
const workflowBefore = sketchBefore.workflowStatus;
const recvWorkflowBefore = reception.workflowStatus;
const sourceBefore = reception.sourceSketchId;
const linkBefore = sketchBefore.receptionDrawingId;

const recvDraft = unsetDrawingFinal(reception);
ok("reception unset ok", recvDraft.ok && recvDraft.drawing?.status === "draft");
const after = recvDraft.drawing;

ok("reception placement sketch unchanged", JSON.stringify(sketchBefore.placement) === placementBefore);
ok("sketch workflowStatus unchanged", sketchBefore.workflowStatus === workflowBefore);
ok("reception workflowStatus unchanged", after.workflowStatus === recvWorkflowBefore);
ok("reception revisionMeta unchanged", JSON.stringify(after.revisionMeta ?? []) === recvMetaBefore);
ok("sourceSketchId unchanged", after.sourceSketchId === sourceBefore);
ok("receptionDrawingId link unchanged", sketchBefore.receptionDrawingId === linkBefore);
ok("no revisionMeta demote action", !(after.revisionMeta ?? []).some((m) => m.action === "demote"));

// --- ZIP count ---
const jobId = "job-zip-fu";
const d1 = setDrawingFinal(
  touchDrawing(buildDrawingFromTemplate("blank", { jobId, address: "Z 1" }), { title: "Z1" }),
).drawing;
const d2 = touchDrawing(buildDrawingFromTemplate("blank", { jobId, address: "Z 2" }), {
  title: "Z2-draft",
});
ok("zip count 1 final", countFinalDrawingsForJob([d1, d2], jobId) === 1);
ok("listFinal length 1", listFinalDrawingsForJob([d1, d2], jobId).length === 1);

const d1Draft = unsetDrawingFinal(d1).drawing;
ok("zip count 0 after demote", countFinalDrawingsForJob([d1Draft, d2], jobId) === 0);

// --- fingerprint update ---
const fpFinal = buildDrawingFingerprintDigests([d1]);
const fpDraft = buildDrawingFingerprintDigests([d1Draft]);
ok("fingerprint status final", fpFinal[0]?.status === "final");
ok("fingerprint status draft", fpDraft[0]?.status === "draft");
ok(
  "fingerprint changed after demote",
  JSON.stringify(fpFinal) !== JSON.stringify(fpDraft),
);

// --- A2 visibility (admin/wm_druk / reception) ---
ok("A2 reception final IN", isDrawingVisibleInRysunkiTab(reception));
ok("A2 reception draft IN (origin admin)", isDrawingVisibleInRysunkiTab(after));
const wmDraft = touchDrawing(buildDrawingFromTemplate("blank", { jobId: "j", address: "X" }), {});
ok("A2 wm_druk draft IN", isDrawingVisibleInRysunkiTab(wmDraft));
ok("A2 origin default wm_druk", (wmDraft.origin ?? "wm_druk") !== "worker");

// --- audit labels ---
ok(
  "audit drawing_finalized label",
  WM_DRUK_AUDIT_ACTION_LABEL_PL.drawing_finalized === "Oznaczono rysunek jako Finalny",
);
ok(
  "audit drawing_unfinalized label",
  WM_DRUK_AUDIT_ACTION_LABEL_PL.drawing_unfinalized === "Oznaczono rysunek jako Roboczy",
);

console.log(`\nOK — ${n} assertions PASS`);
