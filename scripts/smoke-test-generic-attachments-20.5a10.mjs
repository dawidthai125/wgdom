/**
 * Sprint 20.5A.10 — Generic File Attachments
 * Uruchom: npx vite-node scripts/smoke-test-generic-attachments-20.5a10.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  appendJobAttachment,
  buildJobAttachmentTombstone,
  mergeJobAttachmentTombstones,
  mergeJobAttachments,
  removeJobAttachmentWithTombstone,
  isJobAttachmentAllowed,
  isJobAttachmentBlockedImage,
  jobAttachmentUploadError,
  buildJobAttachmentStorageFilename,
  resolveJobAttachmentStoragePath,
  JOB_ATTACHMENT_MAX_BYTES,
} from "../src/lib/job-attachments.ts";
import { mergeJobsById } from "../src/lib/cloud-sync.ts";
import {
  collectJobAttachmentPackEntries,
  collectActiveJobAttachments,
  jobAttachmentsPackHasFiles,
} from "../src/lib/job-attachments-pack.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

function assert(name, cond, detail = "") {
  console.log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

const jobsViewSource = readFileSync(resolve(root, "src/app/JobsView.tsx"), "utf8");
const emailModalSource = readFileSync(resolve(root, "src/app/JobFilesEmailModal.tsx"), "utf8");
const genericSectionSource = readFileSync(resolve(root, "src/app/JobGenericAttachmentsSection.tsx"), "utf8");
const previewSource = readFileSync(resolve(root, "src/app/JobFilePreviewModal.tsx"), "utf8");
const appDomainSource = readFileSync(resolve(root, "src/app/app-domain.ts"), "utf8");

console.log("=== Smoke 20.5A.10 — Generic File Attachments ===\n");

function mkAtt(id, filename, uploadedAt = "2026-06-09T10:00:00Z") {
  return {
    id,
    filename,
    path: `jobs/j1/attachments-${id}-${filename}`,
    publicUrl: `https://example.com/storage/${id}/${filename}`,
    uploadedBy: "Admin",
    uploadedAt,
    sizeBytes: 1024,
  };
}

assert("T1 job_model_fields", /jobAttachments\?:/.test(appDomainSource) && /deletedJobAttachmentTombstones\?:/.test(appDomainSource));

{
  const job = { jobAttachments: [] };
  const att = mkAtt("a1", "spec.pdf");
  const next = appendJobAttachment(job, att);
  assert("T2 append", next.jobAttachments?.length === 1 && next.jobAttachments[0].id === "a1");
}

{
  const att = mkAtt("a2", "note.docx");
  const job = { jobAttachments: [att] };
  const next = removeJobAttachmentWithTombstone(job, "a2", { deletedBy: "Admin" });
  assert("T3 delete_removes", (next.jobAttachments || []).length === 0);
  assert("T3 delete_tombstone", (next.deletedJobAttachmentTombstones || []).some((t) => t.attachmentId === "a2"));
}

{
  const old = mkAtt("m1", "v1.pdf", "2026-06-09T10:00:00Z");
  const neu = { ...mkAtt("m1", "v2.pdf", "2026-06-09T12:00:00Z"), sizeBytes: 2048 };
  const merged = mergeJobAttachments([old], [neu]);
  assert("T4 merge_lww", merged.length === 1 && merged[0].filename === "v2.pdf");
}

{
  const att = mkAtt("t5", "gone.zip");
  const ts = buildJobAttachmentTombstone(att, { deletedBy: "Admin" });
  const merged = mergeJobAttachments([att], [att], [ts]);
  assert("T5 tombstone_filter", merged.length === 0);
}

{
  const t1 = { attachmentId: "x", deletedAt: "2026-06-09T10:00:00Z" };
  const t2 = { attachmentId: "x", deletedAt: "2026-06-09T11:00:00Z", deletedBy: "B" };
  const merged = mergeJobAttachmentTombstones([t1], [t2]);
  assert("T6 tombstone_lww", merged.length === 1 && merged[0].deletedBy === "B");
}

{
  const att = mkAtt("res", "res.pdf");
  const tombstone = buildJobAttachmentTombstone(att, { deletedAt: "2026-06-09T13:00:00Z" });
  const local = {
    id: "j1",
    updatedAt: "2026-06-09T13:00:00Z",
    jobAttachments: [],
    deletedJobAttachmentTombstones: [tombstone],
  };
  const cloud = {
    ...local,
    jobAttachments: [att],
    deletedJobAttachmentTombstones: undefined,
  };
  const [merged] = mergeJobsById([local], [cloud]);
  assert("T7 sync_no_resurrection", !(merged.jobAttachments || []).some((a) => a.id === "res"));
}

assert("T8 mime_pdf", isJobAttachmentAllowed("raport.pdf", "application/pdf"));
assert("T9 mime_block_jpg", !isJobAttachmentAllowed("foto.jpg", "image/jpeg") && isJobAttachmentBlockedImage("foto.jpg"));
assert("T10 mime_block_png", !isJobAttachmentAllowed("x.png"));

{
  const big = { name: "big.pdf", type: "application/pdf", size: JOB_ATTACHMENT_MAX_BYTES + 1 };
  const err = jobAttachmentUploadError(big);
  assert("T11 size_limit", err !== null && /25/.test(err));
}

{
  const name = buildJobAttachmentStorageFilename("umowa.pdf");
  assert("T12 storage_prefix", name.startsWith("attachments-") && name.includes("umowa"));
}

{
  const att = mkAtt("p1", "a.pdf");
  assert("T13 resolve_path", resolveJobAttachmentStoragePath(att) === att.path);
}

{
  const job = { id: "j1", address: "Test", flatNumber: "1", jobAttachments: [mkAtt("z1", "plik.pdf")] };
  const entries = collectJobAttachmentPackEntries(job);
  assert("T14 zip_entries", entries.length === 1 && entries[0].zipPath.startsWith("zalaczniki/"));
}

{
  const att = mkAtt("dead", "x.txt");
  const job = {
    id: "j1",
    address: "A",
    flatNumber: "",
    jobAttachments: [att],
    deletedJobAttachmentTombstones: [buildJobAttachmentTombstone(att, {})],
  };
  assert("T15 active_filter", collectActiveJobAttachments(job).length === 0);
  assert("T15 pack_empty", !jobAttachmentsPackHasFiles(job));
}

assert("T16 ui_section", /Załączniki ogólne/.test(genericSectionSource) && (/JobGenericAttachmentsSection/.test(jobsViewSource) || /JobFilesHub/.test(jobsViewSource)));
assert("T17 upload_wired", /uploadJobAttachment/.test(genericSectionSource));
assert("T18 email_contract_group", /Dokumenty kontraktowe/.test(emailModalSource));
assert("T18 email_generic_group", /Załączniki ogólne/.test(emailModalSource));
assert("T18 email_default_contract", /includeContract.*useState\(true\)/.test(emailModalSource));
assert("T18 email_activity_suffix", /genericCount/.test(jobsViewSource));
assert("T19 preview_jobAttachment", /jobAttachment/.test(previewSource));
assert("T19 preview_no_dwg", /Brak podglądu — pobierz plik/.test(previewSource));
assert("T20 no_kind_generic", !/kind:\s*["']generic["']/.test(appDomainSource));

console.log("\n=== ALL PASS (20.5A.10 T1–T20) ===");
