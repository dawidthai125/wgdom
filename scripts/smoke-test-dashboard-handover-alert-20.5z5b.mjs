/**
 * 20.5Z.5B — Dashboard „Roboty do odbioru” (Jobs 2.0 handover)
 * Uruchom: npx vite-node scripts/smoke-test-dashboard-handover-alert-20.5z5b.mjs
 */
import { DOCUMENT_TYPES } from "../src/lib/job-documents.ts";
import { defaultJob, jobWorkerReports, reportNeedsAdminAttention } from "../src/app/app-domain.ts";
import { isMediaAttachmentAvailable } from "../src/lib/media-filter.ts";
import {
  countJobsByListFilter,
  inferJobPhase,
  jobMatchesListFilter,
  jobMissingRequiredDocs,
} from "../src/lib/job-list-status.ts";
import { buildUrgentTodayCategories } from "../src/lib/dashboard-urgent-today.ts";

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

function filterHandoverJobs(jobs) {
  return jobs.filter((j) => jobMatchesListFilter(j, "handover"));
}

function countPendingPhotos(jobs) {
  return jobs.flatMap((j) =>
    (j.photos || []).filter((p) => p.status === "pending" && isMediaAttachmentAvailable(p)),
  ).length;
}

function countPendingReports(jobs) {
  return jobs
    .filter((j) => j.status === "in_progress")
    .flatMap((j) => jobWorkerReports(j).filter((r) => reportNeedsAdminAttention(r))).length;
}

function countJobsMissingDocs(jobs) {
  return jobs.filter((j) => j.status === "in_progress" && jobMissingRequiredDocs(j).length > 0).length;
}

function showHandoverAlert(jobs) {
  return filterHandoverJobs(jobs).length > 0;
}

function urgentOdbiorCount(handoverCount) {
  const { categories } = buildUrgentTodayCategories({
    needsUnsavedWeekAlert: false,
    payrollRolloverBlockersCount: 0,
    consistencyAlertsCount: 0,
    pendingReceiptsCount: 0,
    pendingReportsCount: 0,
    pendingPhotosCount: 0,
    unseenInspectorFeedCount: 0,
    inspectorNotesPendingCount: 0,
    wmOverdueJobsCount: 0,
    wmThisWeekJobsCount: 0,
    handoverJobCount: handoverCount,
    recoverableAlertsCount: 0,
  });
  return categories.find((c) => c.id === "odbior")?.count ?? 0;
}

const fresh = { ...defaultJob(), id: "in-progress-only" };

const handoverMissing = {
  id: "handover-missing",
  address: "ul. Testowa 1",
  client: "Wspólnota Test",
  flatNumber: "12",
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

const handoverReady = {
  ...handoverMissing,
  id: "handover-ready",
  address: "ul. Gotowa 2",
  documents: fullRequiredDocs(),
  plannedHandoverDate: "2026-06-15",
};

const completedJob = {
  ...fresh,
  id: "completed",
  status: "completed",
  keysHandedOver: true,
  jobPhase: "completed",
  documents: fullRequiredDocs(),
};

const pendingPhotoJob = {
  ...fresh,
  id: "photo-pending",
  photos: [
    {
      id: "ph-1",
      publicUrl: "https://example.com/p.jpg",
      storagePath: "jobs/x/p.jpg",
      uploadedAt: "2026-06-10T10:00:00.000Z",
      uploadedBy: "Worker",
      label: "progress",
      status: "pending",
    },
  ],
};

log("=== 20.5Z.5B dashboard handover alert smoke ===\n");

// T1 — handover=0 → alert ukryty
assert("T1_handover_zero_hidden", !showHandoverAlert([fresh, completedJob]));

// T2 — handover=1 → alert widoczny
assert("T2_handover_one_visible", showHandoverAlert([handoverMissing]));

// T3 — handover>1 → poprawny licznik
const multi = [handoverMissing, handoverReady];
assert(
  "T3_handover_multi_count",
  filterHandoverJobs(multi).length === 2,
  `count=${filterHandoverJobs(multi).length}`,
);

// T4 — completed nie liczy się
assert(
  "T4_completed_excluded",
  countJobsByListFilter([completedJob, handoverMissing], "handover") === 1,
);

// T5 — zgodność z countJobsByListFilter
assert(
  "T5_matches_countJobsByListFilter",
  filterHandoverJobs(multi).length === countJobsByListFilter(multi, "handover"),
);

// T6 — klik → onNavigate("jobs", job.id) (wzorzec jak pending photos)
const handoverIds = filterHandoverJobs(multi).map((j) => j.id);
assert(
  "T6_nav_target_job_ids",
  handoverIds.length === 2 && handoverIds.every((id) => typeof id === "string" && id.length > 0),
  `ids=${handoverIds.join(",")}`,
);

// T7 — brak wpływu na pending photos
const photosBefore = countPendingPhotos([pendingPhotoJob]);
const photosAfter = countPendingPhotos([pendingPhotoJob, handoverMissing, handoverReady]);
assert("T7_pending_photos_unchanged", photosBefore === photosAfter, `${photosBefore} vs ${photosAfter}`);

// T8 — brak wpływu na pending reports
const reportsBefore = countPendingReports([fresh]);
const reportsAfter = countPendingReports([fresh, handoverMissing]);
assert("T8_pending_reports_unchanged", reportsBefore === reportsAfter);

// AUDIT — nakładanie jobsMissingDocs ∩ handover
const overlap = multi.filter(
  (j) => j.status === "in_progress" && jobMissingRequiredDocs(j).length > 0 && jobMatchesListFilter(j, "handover"),
);
assert(
  "AUDIT_overlap_jobsMissingDocs_handover",
  overlap.length >= 1,
  `overlap=${overlap.length} — handover poza attentionCount`,
);

assert(
  "V3_handover_in_odbior_category",
  urgentOdbiorCount(2) === 2,
  `odbior=${urgentOdbiorCount(2)}`,
);

const docsOnly = countJobsMissingDocs(multi);
const urgentWithHandover = buildUrgentTodayCategories({
  needsUnsavedWeekAlert: false,
  payrollRolloverBlockersCount: 0,
  consistencyAlertsCount: 0,
  pendingReceiptsCount: 0,
  pendingReportsCount: 0,
  pendingPhotosCount: 0,
  unseenInspectorFeedCount: 0,
  inspectorNotesPendingCount: 0,
  wmOverdueJobsCount: 0,
  wmThisWeekJobsCount: 0,
  handoverJobCount: countJobsByListFilter(multi, "handover"),
  recoverableAlertsCount: 0,
}).urgentTodayTotal;
assert(
  "V3_jobsMissingDocs_not_in_urgentTotal",
  docsOnly > 0 && urgentWithHandover === countJobsByListFilter(multi, "handover"),
  `docs=${docsOnly} urgent=${urgentWithHandover}`,
);

assert("AUDIT_handover_phase", inferJobPhase(handoverMissing) === "handover");

const pass = Object.values(results).filter((v) => v === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${pass}/${total} | 20.5Z.5B dashboard handover: ${pass === total ? "ALL PASS" : "FAIL"} ===\n`);
