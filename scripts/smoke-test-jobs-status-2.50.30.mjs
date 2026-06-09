/**
 * Roboty 2.50.30 — status nowej roboty + regresja badge odbioru
 * Uruchom: npx vite-node scripts/smoke-test-jobs-status-2.50.30.mjs
 */
import { DOCUMENT_TYPES } from "../src/lib/job-documents.ts";
import { defaultJob } from "../src/app/app-domain.ts";
import {
  JOB_LIST_STATUS_CONFIG,
  inferJobPhase,
  resolveJobListStatus,
} from "../src/lib/job-list-status.ts";
import { inferHandoverStage } from "../src/lib/job-wm.ts";
import {
  computeJobListOpsKpi,
  jobOpsIsDocsPendingHandover,
  buildJobQueueSections,
  wmOverdueJobIdSet,
} from "../src/lib/job-list-ops.ts";

const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

function emptyDocs() {
  return Object.fromEntries(DOCUMENT_TYPES.map((d) => [d, false]));
}

function fullRequiredDocs() {
  const docs = emptyDocs();
  for (const d of [
    "zlecenie", "zakres", "kosztorys", "kominiarz", "pomiary", "oswiadczenia", "gwarancje", "rysunek",
  ]) {
    docs[d] = true;
  }
  return docs;
}

log("=== Roboty 2.50.30 status smoke ===\n");

// T1 — defaultJob → W trakcie (RCA fix)
const fresh = defaultJob();
assert(
  "T1_defaultJob_handover_stage",
  inferHandoverStage(fresh) === "awaiting_order",
  `stage=${inferHandoverStage(fresh)}`,
);
assert(
  "T1_defaultJob_phase_in_progress",
  inferJobPhase(fresh) === "in_progress",
  `phase=${inferJobPhase(fresh)}`,
);
assert(
  "T1_defaultJob_list_status",
  resolveJobListStatus(fresh) === "in_progress",
  `status=${resolveJobListStatus(fresh)}`,
);
assert(
  "T1_defaultJob_label",
  JOB_LIST_STATUS_CONFIG.in_progress.label === "W trakcie",
);

// T2 — awaiting_order explicit nie mapuje do handover
const awaiting = {
  ...fresh,
  id: "await-explicit",
  handoverStage: "awaiting_order",
};
assert("T2_awaiting_order_phase", inferJobPhase(awaiting) === "in_progress");
assert("T2_awaiting_order_status", resolveJobListStatus(awaiting) === "in_progress");
assert("T2_not_docs_pending_queue", !jobOpsIsDocsPendingHandover(awaiting));

// T3 — jobPhase handover + braki → Do odbioru — braki
const handoverMissing = {
  id: "handover-missing",
  address: "Test",
  client: "Inny",
  flatNumber: "",
  startDate: "2026-06-01",
  status: "in_progress",
  keysHandedOver: false,
  documents: { ...fullRequiredDocs(), kosztorys: false },
  workEntries: [],
  jobPhase: "handover",
  executionAssigneeDirectoryIds: ["emp-1"],
};
assert(
  "T3_handover_missing_status",
  resolveJobListStatus(handoverMissing) === "docs_pending",
);
assert(
  "T3_handover_missing_label",
  JOB_LIST_STATUS_CONFIG.docs_pending.label === "Do odbioru — braki",
);
assert("T3_handover_missing_queue", jobOpsIsDocsPendingHandover(handoverMissing));

// T4 — jobPhase handover + komplet → Gotowe do zdania
const handoverReady = {
  ...handoverMissing,
  id: "handover-ready",
  documents: fullRequiredDocs(),
};
assert(
  "T4_handover_ready_status",
  resolveJobListStatus(handoverReady) === "ready_handover",
);
assert(
  "T4_handover_ready_label",
  JOB_LIST_STATUS_CONFIG.ready_handover.label === "Gotowe do zdania",
);

// T5 — inferHandoverStage docs_pending (zlecenie + braki) → handover phase
const inferredDocsPending = {
  id: "inferred-docs",
  address: "Test",
  client: "Wrocławskie Mieszkania",
  flatNumber: "",
  startDate: "2026-06-01",
  status: "in_progress",
  keysHandedOver: false,
  documents: { ...emptyDocs(), zlecenie: true },
  workEntries: [],
};
assert(
  "T5_inferred_docs_pending_stage",
  inferHandoverStage(inferredDocsPending) === "docs_pending",
);
assert("T5_inferred_docs_pending_phase", inferJobPhase(inferredDocsPending) === "handover");
assert(
  "T5_inferred_docs_pending_status",
  resolveJobListStatus(inferredDocsPending) === "docs_pending",
);

// T6 — KPI handover nie liczy defaultJob
const kpi = computeJobListOpsKpi([fresh, handoverMissing]);
assert(
  "T6_kpi_handover_count",
  kpi.handover === 1,
  `handover=${kpi.handover}`,
);

// T7 — kolejka docs_pending tylko dla handover z brakami
const overdueIds = wmOverdueJobIdSet([fresh, handoverMissing]);
const sections = buildJobQueueSections([fresh, handoverMissing], overdueIds);
const docsSec = sections.find((s) => s.id === "docs_pending");
assert(
  "T7_queue_docs_pending",
  docsSec.jobs.length === 1 && docsSec.jobs[0].id === "handover-missing",
  `ids=${docsSec.jobs.map((j) => j.id).join(",")}`,
);

const pass = Object.values(results).filter((v) => v === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${pass}/${total} | Roboty 2.50.30 status: ${pass === total ? "ALL PASS" : "FAIL"} ===\n`);
