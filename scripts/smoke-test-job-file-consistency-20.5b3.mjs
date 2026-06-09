/**
 * Sprint 20.5B.3 — File Consistency Hardening
 * Uruchom: npx vite-node scripts/smoke-test-job-file-consistency-20.5b3.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  applyJobFileKindUpload,
  buildJobFileTombstone,
  appendJobFileTombstone,
  mergeJobFileTombstones,
  mergeJobFiles,
  filterJobFilesByTombstones,
  removeJobFileAttachmentWithTombstone,
  resolveJobFileStoragePath,
} from "../src/lib/job-documents.ts";
import { mergeJobsById } from "../src/lib/cloud-sync.ts";
import {
  collectInspectorFeed,
  isJobFileUploadActivityVisible,
  parseJobFileUploadActivity,
} from "../src/lib/job-activity.ts";
import { getUnseenInspectorFeed } from "../src/lib/inspector-stats.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

function assert(name, cond, detail = "") {
  console.log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

const jobsViewSource = readFileSync(resolve(root, "src/app/JobsView.tsx"), "utf8");
const inspectorSource = readFileSync(resolve(root, "src/app/InspectorPanel.tsx"), "utf8");

console.log("=== Smoke 20.5B.3 — File Consistency ===\n");

const baseDocs = {
  zlecenie: true,
  kosztorys: false,
  zakres: false,
  rysunek: false,
  kominiarz: false,
  pomiary: false,
  oswiadczenia: false,
  gwarancje: false,
  zdjecia: false,
};

function mkFile(id, kind, filename, uploadedAt) {
  return {
    id,
    kind,
    filename,
    path: `jobs/test/${id}.pdf`,
    publicUrl: `https://example.com/${id}.pdf`,
    uploadedAt,
    uploadedBy: "Test",
  };
}

// T1 — mergeJobFiles filters tombstone
{
  const file = mkFile("f1", "zlecenie", "a.pdf", "2026-06-09T10:00:00Z");
  const tombstones = [buildJobFileTombstone(file, { reason: "delete" })];
  const merged = mergeJobFiles([file], [file], tombstones);
  assert("T1 mergeJobFiles_filters_tombstone", merged.length === 0);
}

// T2 — equal ts no resurrection
{
  const file = mkFile("f2", "zlecenie", "b.pdf", "2026-06-09T10:00:00Z");
  const tombstones = [buildJobFileTombstone(file, { reason: "delete" })];
  const merged = mergeJobFiles([], [file], tombstones);
  assert("T2 equal_ts_no_resurrection", merged.length === 0);
}

// T3 — tombstone LWW
{
  const t1 = { fileId: "x", kind: "zlecenie", deletedAt: "2026-06-09T10:00:00Z" };
  const t2 = { fileId: "x", kind: "zlecenie", deletedAt: "2026-06-09T11:00:00Z", deletedBy: "A" };
  const merged = mergeJobFileTombstones([t1], [t2]);
  assert("T3 tombstone_lww", merged.length === 1 && merged[0].deletedBy === "A");
}

// T4 — mergeJobsById delete wins (equal ts)
{
  const file = mkFile("fd", "zlecenie", "del.pdf", "2026-06-09T12:00:00Z");
  const tombstone = buildJobFileTombstone(file, { reason: "delete", deletedAt: "2026-06-09T13:00:00Z" });
  const local = {
    id: "j1",
    address: "A",
    flatNumber: "1",
    client: "WM",
    status: "in_progress",
    documents: baseDocs,
    updatedAt: "2026-06-09T13:00:00Z",
    jobFiles: [],
    deletedJobFileTombstones: [tombstone],
    activityLog: [],
  };
  const cloud = {
    ...local,
    jobFiles: [file],
    deletedJobFileTombstones: undefined,
  };
  const [merged] = mergeJobsById([local], [cloud]);
  assert("T4 mergeJobsById_delete_wins", !(merged.jobFiles || []).some((f) => f.id === "fd"));
}

// T5 — upload append (applyJobFileKindUpload)
{
  const job = { id: "j2", documents: { ...baseDocs }, jobFiles: [] };
  const att = mkFile("n1", "zlecenie", "new.pdf", "2026-06-09T14:00:00Z");
  const next = applyJobFileKindUpload(job, "zlecenie", att, { deletedBy: "Admin" });
  assert("T5 upload_append", next.jobFiles?.length === 1 && next.jobFiles[0].id === "n1");
}

// T6 — delete append tombstone
{
  const file = mkFile("f6", "kosztorys", "k.pdf", "2026-06-09T10:00:00Z");
  const job = { documents: { ...baseDocs, kosztorys: true }, jobFiles: [file] };
  const next = removeJobFileAttachmentWithTombstone(job, "f6", { deletedBy: "Admin", reason: "delete" });
  assert("T6 delete_tombstone", next.jobFiles?.length === 0);
  assert("T6 tombstone_record", (next.deletedJobFileTombstones || []).some((t) => t.fileId === "f6"));
}

// T7 — replace tombstones old
{
  const oldF = mkFile("old", "zlecenie", "old.pdf", "2026-06-09T10:00:00Z");
  const newF = mkFile("new", "zlecenie", "new.pdf", "2026-06-09T15:00:00Z");
  const job = { documents: baseDocs, jobFiles: [oldF] };
  const next = applyJobFileKindUpload(job, "zlecenie", newF, { deletedBy: "Admin", previousFile: oldF });
  const ts = next.deletedJobFileTombstones?.find((t) => t.fileId === "old");
  assert("T7 replace_tombstone", ts?.reason === "replace" && ts.supersededByFileId === "new");
  assert("T7 replace_jobFiles", next.jobFiles?.length === 1 && next.jobFiles[0].id === "new");
}

// T8 — replace storage delete wired in JobsView
{
  assert("T8 replace_upload_before_delete", /await uploadJobFile[\s\S]*applyJobFileKindUpload/.test(jobsViewSource));
  assert("T8 replace_storage_delete", /previousFile[\s\S]*deleteJobFile\(oldPath\)/.test(jobsViewSource));
  assert("T8 inspector_replace", /previousFile[\s\S]*deleteJobFile\(oldPath\)/.test(inspectorSource));
}

// T9 — multi-device stale cloud
{
  const file = mkFile("stale", "zlecenie", "stale.pdf", "2026-06-09T10:00:00Z");
  const deleted = buildJobFileTombstone(file, { reason: "delete", deletedAt: "2026-06-09T16:00:00Z" });
  const deviceA = {
    id: "j9",
    address: "X",
    flatNumber: "1",
    client: "WM",
    status: "in_progress",
    documents: baseDocs,
    updatedAt: "2026-06-09T16:00:00Z",
    jobFiles: [],
    deletedJobFileTombstones: [deleted],
  };
  const deviceB = {
    ...deviceA,
    updatedAt: "2026-06-09T16:00:00Z",
    jobFiles: [file],
    deletedJobFileTombstones: [],
  };
  const [merged] = mergeJobsById([deviceA], [deviceB]);
  assert("T9 multi_device_stale", (merged.jobFiles || []).length === 0);
}

// T10 — offline delete reconnect
{
  const file = mkFile("off", "kosztorys", "off.pdf", "2026-06-09T09:00:00Z");
  const tomb = buildJobFileTombstone(file, { reason: "delete" });
  const offline = {
    id: "j10",
    address: "Y",
    flatNumber: "2",
    client: "WM",
    status: "in_progress",
    documents: baseDocs,
    updatedAt: "2026-06-09T17:00:00Z",
    jobFiles: [],
    deletedJobFileTombstones: [tomb],
  };
  const online = {
    ...offline,
    jobFiles: [file],
    deletedJobFileTombstones: undefined,
  };
  const [merged] = mergeJobsById([offline], [online]);
  assert("T10 offline_online", filterJobFilesByTombstones(merged.jobFiles, merged.deletedJobFileTombstones).length === 0);
}

// T11 — feed hides orphan upload
{
  const job = {
    id: "j11",
    address: "Okulickiego",
    flatNumber: "9",
    client: "WM",
    status: "in_progress",
    jobFiles: [],
    activityLog: [{
      id: "ev1",
      at: "2026-06-09T09:35:57Z",
      actor: "Paweł",
      type: "inspector_file",
      text: "Wgrano zlecenie: okulickiego 22 m 9 rzut druk.pdf",
    }],
  };
  assert("T11 orphan_hidden", !isJobFileUploadActivityVisible(job, job.activityLog[0]));
  assert("T11 feed_no_orphan", collectInspectorFeed([job]).every((i) => i.id !== "ev1"));
}

// T12 — feed hides superseded upload
{
  const job = {
    id: "j12",
    address: "A",
    flatNumber: "1",
    client: "WM",
    status: "in_progress",
    jobFiles: [mkFile("cur", "zlecenie", "new.pdf", "2026-06-09T16:00:00Z")],
    activityLog: [{
      id: "ev-old",
      at: "2026-06-09T10:00:00Z",
      actor: "Admin",
      type: "inspector_file",
      text: "Wgrano zlecenie: old.pdf",
    }],
  };
  assert("T12 superseded_hidden", !isJobFileUploadActivityVisible(job, job.activityLog[0]));
}

// T13 — delete activity still visible (not upload)
{
  const job = {
    id: "j13",
    address: "A",
    flatNumber: "1",
    client: "WM",
    status: "in_progress",
    jobFiles: [],
    activityLog: [{
      id: "ev-del",
      at: "2026-06-09T17:00:00Z",
      actor: "Admin",
      type: "inspector_file",
      text: "Usunięto plik: x.pdf",
    }],
  };
  assert("T13 delete_visible", isJobFileUploadActivityVisible(job, job.activityLog[0]));
  assert("T13 delete_in_feed", collectInspectorFeed([job]).some((i) => i.id === "ev-del"));
}

// T14 — current file in feed with url
{
  const file = mkFile("cur14", "zlecenie", "live.pdf", "2026-06-09T18:00:00Z");
  const job = {
    id: "j14",
    address: "A",
    flatNumber: "1",
    client: "WM",
    status: "in_progress",
    jobFiles: [file],
    activityLog: [{
      id: "ev14",
      at: "2026-06-09T18:00:00Z",
      actor: "Admin",
      type: "inspector_file",
      text: "Wgrano zlecenie: live.pdf",
    }],
  };
  const feed = collectInspectorFeed([job]);
  const item = feed.find((i) => i.id === "ev14");
  assert("T14 file_in_feed", !!item?.fileUrl);
}

// T15 — dashboard unseen consistent
{
  const job = {
    id: "j15",
    address: "A",
    flatNumber: "1",
    client: "WM",
    status: "in_progress",
    jobFiles: [],
    activityLog: [{
      id: "orph",
      at: "2026-06-09T20:00:00Z",
      actor: "P",
      type: "inspector_file",
      text: "Wgrano zlecenie: ghost.pdf",
    }],
  };
  const unseen = getUnseenInspectorFeed([job], undefined, "admin");
  assert("T15 dashboard_no_orphan", !unseen.some((i) => i.id === "orph"));
}

// T16 — synthetic file entry
{
  const file = mkFile("syn", "kosztorys", "syn.ath", "2026-06-09T19:00:00Z");
  const job = {
    id: "j16",
    address: "A",
    flatNumber: "1",
    client: "WM",
    status: "in_progress",
    jobFiles: [file],
    activityLog: [],
  };
  assert("T16 synthetic", collectInspectorFeed([job]).some((i) => i.id === "file-syn"));
}

// T17 — parser variants
{
  assert("T17 admin_zlecenie", parseJobFileUploadActivity("Wgrano zlecenie: a.pdf")?.kind === "zlecenie");
  assert("T17 inspector_zlecenie", parseJobFileUploadActivity("Wgrano zlecenie PDF: a.pdf")?.kind === "zlecenie");
  assert("T17 kosztorys", parseJobFileUploadActivity("Wgrano kosztorys: k.ath")?.filename === "k.ath");
  assert("T17 plan", parseJobFileUploadActivity("Wgrano plan techniczny: p.pdf")?.kind === "plan_techniczny");
}

// T18 — backward compat no tombstones
{
  const f1 = mkFile("b1", "zlecenie", "one.pdf", "2026-06-09T10:00:00Z");
  const f2 = mkFile("b2", "zlecenie", "two.pdf", "2026-06-09T11:00:00Z");
  const merged = mergeJobFiles([f1], [f2]);
  assert("T18 backward_compat", merged.length === 1 && merged[0].id === "b2");
}

// T19 — upload delete sync scenario C
{
  const file = mkFile("c1", "zlecenie", "c.pdf", "2026-06-09T10:00:00Z");
  const tomb = buildJobFileTombstone(file, { reason: "delete", deletedAt: "2026-06-09T11:00:00Z" });
  const afterDelete = {
    id: "jc",
    address: "C",
    flatNumber: "1",
    client: "WM",
    status: "in_progress",
    documents: baseDocs,
    updatedAt: "2026-06-09T11:00:00Z",
    jobFiles: [],
    deletedJobFileTombstones: [tomb],
    activityLog: [
      { id: "u", at: "2026-06-09T10:00:00Z", actor: "A", type: "inspector_file", text: "Wgrano zlecenie: c.pdf" },
      { id: "d", at: "2026-06-09T11:00:00Z", actor: "A", type: "inspector_file", text: "Usunięto plik: c.pdf" },
    ],
  };
  const stale = { ...afterDelete, jobFiles: [file], deletedJobFileTombstones: undefined };
  const [merged] = mergeJobsById([afterDelete], [stale]);
  assert("T19 upload_delete_sync", (merged.jobFiles || []).length === 0);
}

// T20 — regression 2.50.50 delete hotfix
{
  assert("T20 import resolve", jobsViewSource.includes("resolveJobFileStoragePath"));
  assert("T20 removeWithTombstone", jobsViewSource.includes("removeJobFileAttachmentWithTombstone"));
  assert("T20 resolve_path", resolveJobFileStoragePath(mkFile("r", "zlecenie", "r.pdf", "2026")) === "jobs/test/r.pdf");
}

console.log("\n=== PASS — 20.5B.3 smoke ===");
