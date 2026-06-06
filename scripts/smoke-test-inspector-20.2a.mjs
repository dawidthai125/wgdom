/**
 * Sprint 20.2A — Inspector UX Refresh smoke
 * Uruchom: npx vite-node scripts/smoke-test-inspector-20.2a.mjs
 */
import {
  computeInspectionProgress,
  inspectionPriority,
  collectMissingHandoverItems,
  getLastInspectorActivity,
  computeInspectorKpiStats,
  buildTodayJobs,
  buildActionCenterItems,
  countRequiredDocsDone,
  sortJobsByInspectionPriority,
  INSPECTION_PRIORITY_EMOJI,
} from "../src/lib/inspector-dashboard.ts";
import { REQUIRED_DOCS } from "../src/lib/job-documents.ts";

const R = {};

function assert(cond, msg) {
  if (!cond) throw new Error(`FAIL: ${msg}`);
  console.log(`PASS: ${msg}`);
}

function makeJob(overrides = {}) {
  const docs = Object.fromEntries(REQUIRED_DOCS.map((d) => [d, false]));
  return {
    id: "j1",
    address: "ul. Testowa 1",
    flatNumber: "12",
    client: "WM",
    status: "in_progress",
    keysHandedOver: false,
    startDate: "2026-06-01",
    plannedHandoverDate: "2026-06-06",
    documents: { ...docs, zlecenie: true, kosztorys: true, pomiary: true },
    inspectorPhotos: [{ id: "p1" }],
    jobNotes: [{ id: "n1", author: "Jan", authorRole: "inspector", text: "OK", at: "2026-06-05T10:00:00Z" }],
    activityLog: [
      { id: "a1", at: "2026-06-05T12:00:00Z", actor: "Jan", type: "inspector_document", text: "Zaznaczono: Pomiary" },
    ],
    ...overrides,
  };
}

// TEST 1 — progress 0–100
{
  const empty = computeInspectionProgress(makeJob({
    documents: Object.fromEntries(REQUIRED_DOCS.map((d) => [d, false])),
    inspectorPhotos: [],
    jobNotes: [],
    activityLog: [],
  }));
  assert(empty.percent >= 0 && empty.percent <= 100, "progress w zakresie 0–100");
  assert(empty.docsDone === 0, "progress — 0 dokumentów");
}

// TEST 2 — progress rośnie z dokumentami + brak double-count (20.2A.1)
{
  const partial = computeInspectionProgress(makeJob());
  const full = computeInspectionProgress(makeJob({
    documents: Object.fromEntries(REQUIRED_DOCS.map((d) => [d, true])),
    handoverStage: "handed_over",
  }));
  assert(full.percent >= partial.percent, "pełniejsza robota ma wyższy postęp");
  assert(partial.percent < 60, "3/8 dok. — postęp < 60% (bez double-count zlecenie/kosztorys)");
  assert(partial.breakdown.filesPct === 0, "filesPct wyłączone — brak podwójnego liczenia");
  assert(full.percent === 100, "komplet + handed_over = 100%");
}

// TEST 3 — priority overdue / today / complete
{
  const overdue = inspectionPriority(makeJob({
    plannedHandoverDate: "2026-01-01",
    handoverStage: "in_progress",
  }));
  assert(overdue === "overdue", "priority overdue");
  assert(INSPECTION_PRIORITY_EMOJI.overdue === "🔴", "emoji overdue");

  const complete = inspectionPriority(makeJob({
    status: "completed",
    documents: Object.fromEntries(REQUIRED_DOCS.map((d) => [d, true])),
  }));
  assert(complete === "complete", "priority complete");
}

// TEST 4 — missing items max 3
{
  const missing = collectMissingHandoverItems(makeJob({
    documents: Object.fromEntries(REQUIRED_DOCS.map((d) => [d, false])),
    inspectorPhotos: [],
  }), 3);
  assert(missing.length <= 3, "missing max 3");
  assert(missing.includes("kosztorys"), "missing zawiera kosztorys");
}

// TEST 5 — last activity
{
  const last = getLastInspectorActivity(makeJob());
  assert(last?.actor === "Jan", "last activity actor");
  assert(last?.text.includes("Pomiary"), "last activity text");
}

// TEST 6 — KPI stats
{
  const jobs = [
    makeJob({ id: "a" }),
    makeJob({ id: "b", status: "completed" }),
    makeJob({ id: "c", photos: [{ id: "x", status: "pending", publicUrl: "u", label: "before", uploadedBy: "w", uploadedAt: "t" }] }),
  ];
  const kpi = computeInspectorKpiStats(jobs, []);
  assert(kpi.activeCount === 2, "KPI active");
  assert(kpi.completedCount === 1, "KPI completed");
  assert(kpi.pendingPhotosCount >= 1, "KPI pending photos");
}

// TEST 7 — today jobs
{
  const today = new Date();
  const iso = today.toISOString().slice(0, 10);
  const jobs = [makeJob({ plannedHandoverDate: iso })];
  const list = buildTodayJobs(jobs);
  assert(list.length >= 1, "buildTodayJobs zawiera dziś");
}

// TEST 8 — action center max 3
{
  const jobs = [
    makeJob({ id: "x", documents: { ...makeJob().documents, kosztorys: false } }),
    makeJob({ id: "y", plannedHandoverDate: "2020-01-01" }),
  ];
  const admin = [makeJob({ id: "z" })];
  const actions = buildActionCenterItems(jobs, admin, 3);
  assert(actions.length <= 3, "action center max 3");
  assert(actions.length >= 1, "action center niepusty");
}

// TEST 9 — doc counter
{
  const { done, total } = countRequiredDocsDone(makeJob());
  assert(total === REQUIRED_DOCS.length, "doc total");
  assert(done === 3, "doc done (zlecenie, kosztorys, pomiary)");
}

// TEST 10 — sort priority
{
  const jobs = [
    makeJob({ id: "complete", status: "completed" }),
    makeJob({ id: "overdue", plannedHandoverDate: "2020-01-01" }),
    makeJob({ id: "normal", plannedHandoverDate: "2099-12-31" }),
  ];
  const sorted = sortJobsByInspectionPriority(jobs);
  assert(sorted[0].id === "overdue", "sort — overdue pierwszy");
}

console.log("\n=== Sprint 20.2A Inspector UX — ALL PASS ===\n");
