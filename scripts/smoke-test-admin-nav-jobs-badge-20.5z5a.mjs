/**
 * 20.5Z.5A — Admin nav Jobs badge = W toku + Do odbioru (Jobs 2.0)
 * Uruchom: npx vite-node scripts/smoke-test-admin-nav-jobs-badge-20.5z5a.mjs
 */
import { DOCUMENT_TYPES } from "../src/lib/job-documents.ts";
import { defaultJob } from "../src/app/app-domain.ts";
import { inferJobPhase } from "../src/lib/job-list-status.ts";
import {
  computeJobListOpsKpi,
  countActiveJobsForNavBadge,
} from "../src/lib/job-list-ops.ts";
import { buildAdminNavItems } from "../src/app/admin/admin-nav.ts";

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

const fresh = { ...defaultJob(), id: "fresh-in-progress" };

const handoverJob = {
  id: "handover-phase",
  address: "Test handover",
  client: "Inny",
  flatNumber: "",
  startDate: "2026-06-01",
  endDate: "",
  status: "in_progress",
  keysHandedOver: false,
  notes: "",
  documents: { ...fullRequiredDocs(), kosztorys: false },
  workEntries: [],
  materials: [],
  invoiceStatus: "pending",
  invoiceNumber: "",
  invoiceAmount: "",
  photos: [],
  jobPhase: "handover",
  executionAssigneeDirectoryIds: ["emp-1"],
};

const completedJob = {
  ...fresh,
  id: "completed-only",
  status: "completed",
  keysHandedOver: true,
  jobPhase: "completed",
  documents: fullRequiredDocs(),
};

const pendingPhotoOnly = {
  ...fresh,
  id: "pending-photo-only",
  photos: [
    {
      id: "ph-pending",
      publicUrl: "https://example.com/p.jpg",
      storagePath: "jobs/x/p.jpg",
      uploadedAt: "2026-06-10T10:00:00.000Z",
      uploadedBy: "Test Worker",
      label: "progress",
      status: "pending",
    },
  ],
};

log("=== 20.5Z.5A admin nav Jobs badge smoke ===\n");

// T1 — in_progress
assert("T1_in_progress_phase", inferJobPhase(fresh) === "in_progress");
assert("T1_in_progress_badge", countActiveJobsForNavBadge([fresh]) === 1);

// T2 — handover
assert("T2_handover_phase", inferJobPhase(handoverJob) === "handover");
assert("T2_handover_badge", countActiveJobsForNavBadge([handoverJob]) === 1);

// T3 — completed excluded
assert("T3_completed_badge", countActiveJobsForNavBadge([completedJob]) === 0);

// T4 — pending photo does not affect badge
assert(
  "T4_pending_photo_ignored",
  countActiveJobsForNavBadge([pendingPhotoOnly]) === 1,
  `badge=${countActiveJobsForNavBadge([pendingPhotoOnly])} (phase only)`,
);

// T5 — sum matches Jobs 2.0 KPI
const mix = [fresh, handoverJob, completedJob, pendingPhotoOnly];
const kpi = computeJobListOpsKpi(mix);
const expected = kpi.inProgress + kpi.handover;
assert(
  "T5_matches_kpi_sum",
  countActiveJobsForNavBadge(mix) === expected,
  `badge=${countActiveJobsForNavBadge(mix)} kpi=${expected} (inProgress=${kpi.inProgress} handover=${kpi.handover})`,
);

// T6 — buildAdminNavItems
const nav = buildAdminNavItems({
  canViewTendersNav: false,
  productionWeekEmployees: [],
  directory: [],
  contacts: [],
  savedWeeks: [],
  jobs: mix,
  recoverableCharges: [],
  adminUserId: undefined,
});
const jobsItem = nav.find((n) => n.key === "jobs");
assert("T6_nav_jobs_badge", jobsItem?.badge === expected, `badge=${jobsItem?.badge}`);

const pass = Object.values(results).filter((v) => v === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${pass}/${total} | 20.5Z.5A admin nav badge: ${pass === total ? "ALL PASS" : "FAIL"} ===\n`);
