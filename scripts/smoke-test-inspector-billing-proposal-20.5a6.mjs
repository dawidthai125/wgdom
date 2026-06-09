/**
 * Sprint 20.5A.6 — Billing Proposal Workflow (B1)
 * Uruchom: npx vite-node scripts/smoke-test-inspector-billing-proposal-20.5a6.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  mergeJobNotes,
  appendBillingProposalNote,
  buildBillingProposalNote,
  billingProposalsForJob,
  pendingBillingProposalsForJob,
  approveBillingProposalNote,
  rejectBillingProposalNote,
  updateJobBillingProposalNote,
  jobNotesForCharge,
  isBillingJobNote,
  isBillingProposalNote,
  isBillingProposalPending,
  billingProposalApprovedActivityText,
} from "../src/lib/job-wm.ts";
import {
  appendRecoverableChargeCreate,
  countUnsettledRecoverableCharges,
  createChargeDraftFromProposal,
  deriveChargeAmounts,
  finalizeRecoverableChargeDraftForSave,
  findRecoverableChargeByProposalId,
  getRecoverableChargeJobStats,
  recoverableChargeProposalTag,
} from "../src/lib/recoverable-charges.ts";
import { validateBillingEvidenceFile } from "../src/lib/billing-evidence-upload.ts";

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

const JOB_ID = "job-proposal-1";
const PROPOSAL_ID = "proposal-test-1";
const CHARGE_ID = "charge-from-proposal";

log("=== Sprint 20.5A.6 — Billing Proposal smoke ===\n");

// T1 — model buildBillingProposalNote
{
  const note = buildBillingProposalNote({
    id: PROPOSAL_ID,
    jobId: JOB_ID,
    text: "Uszkodzenie drzwi przy odbiorze",
    title: "Drzwi balkonowe",
    amount: 1250.5,
    author: "Szymon",
  });
  assert("T1 context", note.context === "billing_proposal");
  assert("T1 status pending", note.proposalStatus === "pending");
  assert("T1 amount", note.proposalAmount === 1250.5);
  assert("T1 sourceJobId", note.sourceJobId === JOB_ID);
}

// T2 — proposal excluded from jobNotesForCharge
{
  const note = buildBillingProposalNote({
    id: PROPOSAL_ID,
    jobId: JOB_ID,
    text: "Test",
    amount: 100,
    author: "Szymon",
  });
  assert("T2 not billing job note", !isBillingJobNote(note));
  assert("T2 is proposal", isBillingProposalNote(note));
  const thread = jobNotesForCharge([note], "any-charge");
  assert("T2 excluded from charge thread", thread.length === 0);
}

// T3 — appendBillingProposalNote + activityLog
{
  const note = buildBillingProposalNote({
    id: PROPOSAL_ID,
    jobId: JOB_ID,
    text: "Opis zgłoszenia",
    amount: 500,
    author: "Szymon",
  });
  const job = appendBillingProposalNote({ id: JOB_ID, jobNotes: [], activityLog: [] }, note);
  assert("T3 jobNotes +1", job.jobNotes.length === 1);
  assert("T3 activity type", job.activityLog[0].type === "inspector_billing_proposal");
  assert("T3 activity text", job.activityLog[0].text.includes("Zgłoszenie Do rozliczenia"));
}

// T4 — pending filter
{
  const pending = buildBillingProposalNote({ id: "p1", jobId: JOB_ID, text: "A", amount: 10, author: "X" });
  const approved = approveBillingProposalNote(
    buildBillingProposalNote({ id: "p2", jobId: JOB_ID, text: "B", amount: 20, author: "X" }),
    CHARGE_ID,
    "Admin",
  );
  const notes = [pending, approved];
  assert("T4 pending count", pendingBillingProposalsForJob(notes, JOB_ID).length === 1);
  assert("T4 all proposals", billingProposalsForJob(notes, JOB_ID).length === 2);
}

// T5 — createChargeDraftFromProposal
{
  const proposal = buildBillingProposalNote({
    id: PROPOSAL_ID,
    jobId: JOB_ID,
    text: "Koszt naprawy",
    title: "Naprawa",
    amount: 999.99,
    author: "Szymon",
  });
  const job = {
    id: JOB_ID,
    address: "ul. Test 1",
    flatNumber: "9",
    client: "WM",
    executionLeadDirectoryId: "",
  };
  const draft = createChargeDraftFromProposal(proposal, job, [], "Dawid");
  assert("T5 sourceJobId", draft.sourceJobId === JOB_ID);
  assert("T5 amount", draft.amount === 999.99);
  assert("T5 description", draft.description === "Koszt naprawy");
  assert("T5 proposal tag", draft.tags.some((t) => t === recoverableChargeProposalTag(PROPOSAL_ID)));
}

// T6 — approve helper
{
  const note = buildBillingProposalNote({ id: PROPOSAL_ID, jobId: JOB_ID, text: "X", amount: 1, author: "I" });
  const approved = approveBillingProposalNote(note, CHARGE_ID, "Dawid");
  assert("T6 approved status", approved.proposalStatus === "approved");
  assert("T6 charge link", approved.approvedChargeId === CHARGE_ID);
  assert("T6 reviewedBy", approved.reviewedBy === "Dawid");
}

// T7 — reject helper
{
  const note = buildBillingProposalNote({ id: PROPOSAL_ID, jobId: JOB_ID, text: "X", amount: 1, author: "I" });
  const rejected = rejectBillingProposalNote(note, "Brak dokumentacji", "Dawid");
  assert("T7 rejected status", rejected.proposalStatus === "rejected");
  assert("T7 reason", rejected.rejectedReason === "Brak dokumentacji");
}

// T8 — charge create after approve
{
  const proposal = buildBillingProposalNote({
    id: PROPOSAL_ID,
    jobId: JOB_ID,
    text: "Opis",
    amount: 300,
    author: "Szymon",
  });
  const job = { id: JOB_ID, address: "A", flatNumber: "", client: "C", executionLeadDirectoryId: "" };
  const draft = finalizeRecoverableChargeDraftForSave(
    createChargeDraftFromProposal(proposal, job, [], "Dawid"),
  );
  const charges = appendRecoverableChargeCreate([], draft);
  assert("T8 charge open", deriveChargeAmounts(charges[0]).status === "open");
  assert("T8 empty settlements", (charges[0].settlements ?? []).length === 0);
}

// T9 — KPI isolation before approve (no charge yet)
{
  const charges = [];
  assert("T9 unsettled before approve", countUnsettledRecoverableCharges(charges) === 0);
  const stats = getRecoverableChargeJobStats(charges, JOB_ID);
  assert("T9 job stats zero", stats.chargeCount === 0 && stats.unsettledCount === 0);
}

// T10 — KPI after approve
{
  const proposal = buildBillingProposalNote({
    id: PROPOSAL_ID,
    jobId: JOB_ID,
    text: "Opis",
    amount: 300,
    author: "Szymon",
  });
  const job = { id: JOB_ID, address: "A", flatNumber: "", client: "C", executionLeadDirectoryId: "" };
  const draft = finalizeRecoverableChargeDraftForSave(
    createChargeDraftFromProposal(proposal, job, [], "Dawid"),
  );
  const charges = appendRecoverableChargeCreate([], draft);
  assert("T10 unsettled +1", countUnsettledRecoverableCharges(charges) === 1);
  const stats = getRecoverableChargeJobStats(charges, JOB_ID);
  assert("T10 job unsettled", stats.unsettledCount === 1);
}

// T11 — evidence path naming in source
{
  const src = readFileSync(resolve(root, "src/lib/billing-evidence-upload.ts"), "utf8");
  assert("T11 proposal upload fn", src.includes("uploadBillingProposalEvidence"));
  assert("T11 proposal prefix", src.includes("billing-proposal"));
  const err = validateBillingEvidenceFile({ name: "a.jpg", size: 100, type: "image/jpeg" });
  assert("T11 validate jpeg", err === null);
}

// T12 — mergeJobNotes preserves proposal fields
{
  const local = buildBillingProposalNote({
    id: PROPOSAL_ID,
    jobId: JOB_ID,
    text: "Local",
    amount: 100,
    author: "Szymon",
    attachments: [{
      id: "att-1",
      kind: "image",
      path: "p",
      publicUrl: "https://x/y.jpg",
      filename: "y.jpg",
      uploadedAt: "2026-06-09T10:00:00.000Z",
      uploadedBy: "Szymon",
    }],
  });
  const cloud = { ...local, text: "Cloud wins" };
  const merged = mergeJobNotes([local], [cloud]);
  assert("T12 merge length", merged.length === 1);
  assert("T12 attachments kept", merged[0].attachments?.length === 1);
  assert("T12 status pending", merged[0].proposalStatus === "pending");
}

// T13 — updateJobBillingProposalNote
{
  const note = buildBillingProposalNote({ id: PROPOSAL_ID, jobId: JOB_ID, text: "X", amount: 1, author: "I" });
  const job = updateJobBillingProposalNote(
    { id: JOB_ID, jobNotes: [note] },
    PROPOSAL_ID,
    (n) => approveBillingProposalNote(n, CHARGE_ID, "Admin"),
  );
  assert("T13 updated status", job.jobNotes[0].proposalStatus === "approved");
  assert("T13 activity text helper", billingProposalApprovedActivityText(note).includes("Zaakceptowano"));
}

// T14 — InspectorPanel wiring
{
  const src = readFileSync(resolve(root, "src/app/InspectorPanel.tsx"), "utf8");
  assert("T14 proposal modal", src.includes("InspectorBillingProposalModal"));
  assert("T14 handleSubmitBillingProposal", src.includes("handleSubmitBillingProposal"));
  assert("T14 appendBillingProposalNote", src.includes("appendBillingProposalNote"));
  assert("T14 no pushRecoverableCharges", !src.includes("pushRecoverableChargesToCloud"));
}

// T15 — JobsView admin approve/reject
{
  const src = readFileSync(resolve(root, "src/app/JobsView.tsx"), "utf8");
  assert("T15 approve handler", src.includes("handleApproveBillingProposal"));
  assert("T15 reject handler", src.includes("handleRejectBillingProposal"));
  assert("T15 createChargeDraftFromProposal", src.includes("createChargeDraftFromProposal"));
  assert("T15 approve modal title", src.includes("Zatwierdź zgłoszenie inspektora"));
  assert("T15 onApproveBillingProposal wired", src.includes("onApproveBillingProposal"));
}

// T16 — review card + panel sections
{
  const panel = readFileSync(resolve(root, "src/app/JobRecoverableChargesPanel.tsx"), "utf8");
  assert("T16 review card import", panel.includes("BillingProposalReviewCard"));
  assert("T16 inspector CTA", panel.includes("Zgłoś pozycję"));
  assert("T16 admin proposals section", panel.includes("Zgłoszenia inspektora"));
  const card = readFileSync(resolve(root, "src/app/BillingProposalReviewCard.tsx"), "utf8");
  assert("T16 approve button", card.includes("Zatwierdź"));
  assert("T16 reject button", card.includes("Odrzuć"));
}

// T17 — proposal modal + upload in InspectorPanel
{
  const modal = readFileSync(resolve(root, "src/app/InspectorBillingProposalModal.tsx"), "utf8");
  assert("T17 modal pending files", modal.includes("BillingNotePendingFiles"));
  assert("T17 amount field", modal.includes("setAmount"));
  const panel = readFileSync(resolve(root, "src/app/InspectorPanel.tsx"), "utf8");
  assert("T17 uploadBillingProposalEvidence", panel.includes("uploadBillingProposalEvidence"));
}

// T18 — approve approved proposal => no-op (throws)
{
  const note = buildBillingProposalNote({ id: PROPOSAL_ID, jobId: JOB_ID, text: "X", amount: 1, author: "I" });
  const approved = approveBillingProposalNote(note, CHARGE_ID, "Admin");
  let blocked = false;
  try {
    approveBillingProposalNote(approved, "charge-dup", "Admin");
  } catch {
    blocked = true;
  }
  assert("T18 double approve blocked", blocked);
  assert("T18 not pending after approve", !isBillingProposalPending(approved));
}

// T19 — duplicate proposal tag => no new charge
{
  const proposal = buildBillingProposalNote({ id: PROPOSAL_ID, jobId: JOB_ID, text: "D", amount: 500, author: "I" });
  const job = { id: JOB_ID, address: "A", flatNumber: "", client: "C", executionLeadDirectoryId: "" };
  const draft = finalizeRecoverableChargeDraftForSave(createChargeDraftFromProposal(proposal, job, [], "Admin"));
  let charges = appendRecoverableChargeCreate([], draft);
  const found = findRecoverableChargeByProposalId(charges, PROPOSAL_ID);
  assert("T19 tag lookup", found?.id === charges[0].id);
  const before = charges.length;
  if (!findRecoverableChargeByProposalId(charges, PROPOSAL_ID)) {
    charges = appendRecoverableChargeCreate(charges, draft);
  }
  assert("T19 no duplicate charge", charges.length === before);
}

// T20 — double submit guard => one charge
{
  const modal = readFileSync(resolve(root, "src/app/JobCreateRecoverableChargeModal.tsx"), "utf8");
  assert("T20 modal saving state", modal.includes("saving") && modal.includes("disabled={!validation.ok || saving}"));
  const jobsView = readFileSync(resolve(root, "src/app/JobsView.tsx"), "utf8");
  assert("T20 findRecoverableChargeByProposalId in approve", jobsView.includes("findRecoverableChargeByProposalId"));
  const pid = "prop-double-submit";
  const proposal = buildBillingProposalNote({ id: pid, jobId: JOB_ID, text: "D", amount: 100, author: "I" });
  const job = { id: JOB_ID, address: "A", flatNumber: "", client: "C", executionLeadDirectoryId: "" };
  const draft = finalizeRecoverableChargeDraftForSave(createChargeDraftFromProposal(proposal, job, [], "Admin"));
  let charges = [];
  const guardedAppend = (list) => {
    if (findRecoverableChargeByProposalId(list, pid)) return list;
    return appendRecoverableChargeCreate(list, draft);
  };
  charges = guardedAppend(charges);
  charges = guardedAppend(charges);
  assert("T20 one charge after double submit", charges.length === 1);
}

const passed = Object.values(results).filter((v) => v === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${passed}/${total} PASS ===`);
if (passed !== total) process.exit(1);
