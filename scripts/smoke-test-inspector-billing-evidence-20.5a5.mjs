/**
 * Sprint 20.5A.5 — Billing Evidence Pack (MIN)
 * Uruchom: npx vite-node scripts/smoke-test-inspector-billing-evidence-20.5a5.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mergeJobNotes,
  appendBillingJobNote,
  buildBillingJobNote,
} from "../src/lib/job-wm.ts";
import {
  MAX_BILLING_EVIDENCE_BYTES,
  MAX_BILLING_EVIDENCE_IMAGES,
  MAX_BILLING_EVIDENCE_PDFS,
  validateBillingEvidenceFile,
} from "../src/lib/billing-evidence-upload.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");
const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

const JOB_ID = "job-billing-evidence";
const CHARGE_ID = "charge-evidence-1";

log("=== Sprint 20.5A.5 — Billing Evidence Pack smoke ===\n");

// T1 — JobNoteAttachment model + buildBillingJobNote
{
  const attachment = {
    id: "att-1",
    kind: "image",
    path: `jobs/${JOB_ID}/billing-evidence-${CHARGE_ID}-1-photo.jpg`,
    publicUrl: "https://example.com/photo.jpg",
    filename: "uszkodzenie.jpg",
    uploadedAt: "2026-06-08T10:00:00.000Z",
    uploadedBy: "Szymon",
  };
  const note = buildBillingJobNote({
    chargeId: CHARGE_ID,
    text: "Uszkodzenie przy odbiorze",
    author: "Szymon",
    authorRole: "inspector",
    attachments: [attachment],
  });
  assert("T1 attachments on note", note.attachments?.length === 1);
  assert("T1 attachment kind", note.attachments?.[0].kind === "image");
  assert("T1 attachment path", note.attachments?.[0].path.includes("billing-evidence"));
}

// T2 — backward compat (no attachments)
{
  const note = buildBillingJobNote({
    chargeId: CHARGE_ID,
    text: "Tylko tekst",
    author: "Admin",
    authorRole: "admin",
  });
  assert("T2 no attachments field", note.attachments === undefined);
  assert("T2 text preserved", note.text === "Tylko tekst");
}

// T3 — merge preserves attachments
{
  const pdfAtt = {
    id: "att-pdf",
    kind: "pdf",
    path: `jobs/${JOB_ID}/billing-evidence-${CHARGE_ID}-2-dowod.pdf`,
    publicUrl: "https://example.com/dowod.pdf",
    filename: "faktura.pdf",
    uploadedAt: "2026-06-08T11:00:00.000Z",
    uploadedBy: "Szymon",
  };
  const local = buildBillingJobNote({
    chargeId: CHARGE_ID,
    text: "L",
    author: "Szymon",
    authorRole: "inspector",
    attachments: [pdfAtt],
  });
  local.id = "note-with-att";
  const merged = mergeJobNotes([local], []);
  assert("T3 merge keeps attachments", merged[0].attachments?.[0].kind === "pdf");
}

// T4 — appendBillingJobNote with attachments
{
  const job = { id: JOB_ID, jobNotes: [], activityLog: [] };
  const note = buildBillingJobNote({
    chargeId: CHARGE_ID,
    text: "Z dowodem",
    author: "Szymon",
    authorRole: "inspector",
    attachments: [{
      id: "a1",
      kind: "image",
      path: "jobs/x/billing-evidence-c-1.jpg",
      publicUrl: "https://x/y.jpg",
      filename: "y.jpg",
      uploadedAt: new Date().toISOString(),
      uploadedBy: "Szymon",
    }],
  });
  const updated = appendBillingJobNote(job, note, "Pozycja test");
  assert("T4 saved with attachments", updated.jobNotes[0].attachments?.length === 1);
}

// T5 — upload limits constants
{
  assert("T5 max images", MAX_BILLING_EVIDENCE_IMAGES === 3);
  assert("T5 max pdfs", MAX_BILLING_EVIDENCE_PDFS === 1);
  assert("T5 max bytes", MAX_BILLING_EVIDENCE_BYTES === 8 * 1024 * 1024);
}

// T6 — validateBillingEvidenceFile
{
  const okImg = { name: "a.jpg", size: 1000, type: "image/jpeg" };
  const okPdf = { name: "b.pdf", size: 2000, type: "application/pdf" };
  const big = { name: "c.jpg", size: MAX_BILLING_EVIDENCE_BYTES + 1, type: "image/jpeg" };
  const bad = { name: "d.exe", size: 100, type: "application/octet-stream" };
  assert("T6 jpeg ok", validateBillingEvidenceFile(okImg) === null);
  assert("T6 pdf ok", validateBillingEvidenceFile(okPdf) === null);
  assert("T6 too big", validateBillingEvidenceFile(big) !== null);
  assert("T6 bad type", validateBillingEvidenceFile(bad) !== null);
}

// T7 — billing-evidence-upload reuses storage-upload
{
  const src = readFileSync(resolve(root, "src/lib/billing-evidence-upload.ts"), "utf8");
  assert("T7 storage-upload", src.includes("storage-upload"));
  assert("T7 billing-evidence prefix", src.includes("billing-evidence-"));
  assert("T7 no new bucket", !src.includes("createBucket"));
}

// T8 — InspectorPanel upload flow
{
  const src = readFileSync(resolve(root, "src/app/InspectorPanel.tsx"), "utf8");
  assert("T8 uploadBillingEvidence", src.includes("uploadBillingEvidence"));
  assert("T8 async handler", src.includes("async (chargeId: string, text: string, files?"));
  assert("T8 attachments in note", src.includes("attachments:"));
  assert("T8 no pushRecoverableCharges", !src.includes("pushRecoverableChargesToCloud"));
}

// T9 — BillingNoteModal UI markers
{
  const src = readFileSync(resolve(root, "src/app/JobRecoverableChargesPanel.tsx"), "utf8");
  assert("T9 modal marker", src.includes("data-billing-evidence-modal"));
  assert("T9 add photos", src.includes("data-billing-add-photos"));
  assert("T9 add pdf", src.includes("data-billing-add-pdf"));
  assert("T9 uploading text", src.includes("Wgrywanie dowodów"));
  assert("T9 preview marker", src.includes("data-billing-evidence-preview"));
  assert("T9 JobFilePreviewModal", src.includes("JobFilePreviewModal"));
}

// T10 — JobsView callback accepts optional files
{
  const src = readFileSync(resolve(root, "src/app/JobsView.tsx"), "utf8");
  assert("T10 optional files param", src.includes("_files?: BillingNotePendingFiles"));
}

// T11 — guide docs
{
  const guide = readFileSync(resolve(root, "src/app/GuideView.tsx"), "utf8");
  const listGuide = readFileSync(resolve(root, "src/app/JobListGuidePanel.tsx"), "utf8");
  assert("T11 GuideView billing evidence", guide.includes("Billing Evidence Pack"));
  assert("T11 JobListGuidePanel", listGuide.includes("20.5A.5"));
}

const pass = Object.values(results).filter((v) => v === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${pass}/${total} PASS ===`);
if (pass !== total) process.exit(1);
