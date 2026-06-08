/**
 * Roboty 2.0 MID-B — kolejki, filtr lidera, badge odbiorów
 * Uruchom: npx vite-node scripts/smoke-test-jobs-2.0-midb.mjs
 */
import { DOCUMENT_TYPES } from "../src/lib/job-documents.ts";
import {
  JOB_LIST_STATUS_CONFIG,
  resolveJobListStatus,
} from "../src/lib/job-list-status.ts";
import {
  LEAD_FILTER_NO_LEAD,
  applyLeadFilter,
  buildJobQueueSections,
  computeJobListOpsKpi,
  filterJobsForListView,
  groupJobsByStartMonth,
  jobOpsIsBzpNotStarted,
  jobOpsHasNoExecutionTeam,
  jobOpsIsWmOverdue,
  jobOpsStaleDocs,
  wmOverdueJobIdSet,
} from "../src/lib/job-list-ops.ts";
import { getRecoverableChargeJobStats } from "../src/lib/recoverable-charges.ts";

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

function baseJob(id, extra = {}) {
  return {
    id,
    address: `Adres ${id}`,
    client: "Inny klient",
    flatNumber: "",
    startDate: "2026-06-01",
    status: "in_progress",
    keysHandedOver: false,
    documents: emptyDocs(),
    workEntries: [],
    executionAssigneeDirectoryIds: ["emp-1"],
    ...extra,
  };
}

const LEAD_A = "dir-lead-a";
const LEAD_ORPHAN = "dir-deleted";

const WM_OVERDUE = baseJob("wm-overdue", {
  client: "Wrocławskie Mieszkania",
  plannedHandoverDate: "2026-01-15",
  handoverStage: "in_progress",
  documents: { ...emptyDocs(), zlecenie: true },
});

const BZP_START = baseJob("bzp-start", {
  linkedTenderId: "tender-1",
  handoverStage: "awaiting_order",
  executionAssigneeDirectoryIds: ["emp-2"],
});

const NO_TEAM = baseJob("no-team", {
  executionAssigneeDirectoryIds: [],
  executionLeadDirectoryId: LEAD_A,
});

const DOCS_PENDING = baseJob("docs-pending", {
  jobPhase: "handover",
  documents: { ...fullRequiredDocs(), kosztorys: false },
});

const READY_HANDOVER = baseJob("ready-handover", {
  jobPhase: "handover",
  documents: fullRequiredDocs(),
});

const STALE_DOCS = baseJob("stale-docs", {
  startDate: "2026-05-20",
  documents: emptyDocs(),
  client: "Prywatny",
});

const WITH_LEAD = baseJob("with-lead", {
  executionLeadDirectoryId: LEAD_A,
  address: "Ulica Testowa 1",
});

const NO_LEAD = baseJob("no-lead", {
  executionLeadDirectoryId: undefined,
  address: "Ulica Testowa 2",
});

const ORPHAN_LEAD = baseJob("orphan-lead", {
  executionLeadDirectoryId: LEAD_ORPHAN,
});

const SEARCH_HIT = baseJob("search-hit", {
  address: "Szukana 42",
  client: "Klient ABC",
});

const BILLING_JOB = baseJob("billing-job", {
  executionAssigneeDirectoryIds: ["emp-1"],
});

const ALL_JOBS = [
  WM_OVERDUE,
  BZP_START,
  NO_TEAM,
  DOCS_PENDING,
  READY_HANDOVER,
  STALE_DOCS,
  WITH_LEAD,
  NO_LEAD,
  ORPHAN_LEAD,
  SEARCH_HIT,
  BILLING_JOB,
];

log("=== Roboty 2.0 MID-B smoke ===\n");

// T1 — Toggle Lista/Kolejki (logika widoków)
const overdueIds = wmOverdueJobIdSet(ALL_JOBS);
const sections = buildJobQueueSections(ALL_JOBS, overdueIds);
assert(
  "T1_toggle_queue_sections_order",
  sections.length === 6
    && sections[0].id === "wm_overdue"
    && sections[1].id === "bzp_needs_start"
    && sections[5].id === "stale_docs",
  `ids=${sections.map((s) => s.id).join(",")}`,
);
const monthGroups = groupJobsByStartMonth(ALL_JOBS);
assert(
  "T1_toggle_list_month_groups",
  monthGroups.length >= 1 && monthGroups.every(([key, jobs]) => key.includes("-") && jobs.length > 0),
);

// T2 — WM overdue
const wmSection = sections.find((s) => s.id === "wm_overdue");
assert("T2_wm_overdue_count", wmSection.jobs.some((j) => j.id === "wm-overdue"));
assert(
  "T2_wm_overdue_match",
  jobOpsIsWmOverdue(WM_OVERDUE, overdueIds) && wmSection.jobs.every((j) => jobOpsIsWmOverdue(j, overdueIds)),
);

// T3 — BZP wymaga startu
const bzpSection = sections.find((s) => s.id === "bzp_needs_start");
assert("T3_bzp_needs_start", bzpSection.jobs.some((j) => j.id === "bzp-start"));
assert(
  "T3_bzp_not_in_progress",
  jobOpsIsBzpNotStarted(BZP_START) && bzpSection.jobs.every((j) => jobOpsIsBzpNotStarted(j)),
);

// T4 — Bez ekipy
const noTeamSection = sections.find((s) => s.id === "no_team");
assert("T4_no_team", noTeamSection.jobs.some((j) => j.id === "no-team"));
assert(
  "T4_no_team_rule",
  jobOpsHasNoExecutionTeam(NO_TEAM) && noTeamSection.jobs.every((j) => jobOpsHasNoExecutionTeam(j)),
);

// T5 — Do odbioru — braki
const docsPendingSection = sections.find((s) => s.id === "docs_pending");
assert("T5_docs_pending_section", docsPendingSection.jobs.some((j) => j.id === "docs-pending"));
assert(
  "T5_docs_pending_badge",
  JOB_LIST_STATUS_CONFIG.docs_pending.label === "Do odbioru — braki"
    && resolveJobListStatus(DOCS_PENDING) === "docs_pending",
);

// T6 — Gotowe do zdania
const readySection = sections.find((s) => s.id === "ready_handover");
assert("T6_ready_handover_section", readySection.jobs.some((j) => j.id === "ready-handover"));
assert(
  "T6_ready_handover_badge",
  JOB_LIST_STATUS_CONFIG.ready_handover.label === "Gotowe do zdania"
    && resolveJobListStatus(READY_HANDOVER) === "ready_handover",
);

// T7 — Filtr lidera
const noLeadFiltered = applyLeadFilter(ALL_JOBS, LEAD_FILTER_NO_LEAD);
assert(
  "T7_lead_filter_no_lead",
  noLeadFiltered.some((j) => j.id === "no-lead")
    && !noLeadFiltered.some((j) => j.id === "with-lead")
    && !noLeadFiltered.some((j) => j.id === "orphan-lead"),
);
const leadAFiltered = applyLeadFilter(ALL_JOBS, LEAD_A);
assert(
  "T7_lead_filter_specific",
  leadAFiltered.every((j) => j.executionLeadDirectoryId === LEAD_A)
    && leadAFiltered.some((j) => j.id === "with-lead"),
);

// T8 — Search bez regresji
const searchFiltered = filterJobsForListView(ALL_JOBS, {
  phaseFilter: "all",
  opsChip: null,
  overdueIds,
  workerDirectoryId: "",
  leadFilter: "",
  searchQuery: "Szukana",
});
assert(
  "T8_search",
  searchFiltered.length === 1 && searchFiltered[0].id === "search-hit",
);
const queueAfterSearch = buildJobQueueSections(searchFiltered, overdueIds);
const totalInQueues = queueAfterSearch.reduce((s, sec) => s + sec.jobs.length, 0);
assert("T8_search_queues", totalInQueues === 1);

// T9 — KPI bez regresji
const kpi = computeJobListOpsKpi(ALL_JOBS);
assert(
  "T9_kpi_shape",
  typeof kpi.inProgress === "number"
    && typeof kpi.handover === "number"
    && typeof kpi.noTeam === "number"
    && typeof kpi.bzp === "number"
    && typeof kpi.wmOverdue === "number",
);
assert("T9_kpi_wm_overdue", kpi.wmOverdue >= 1);

// T10 — Billing badge bez regresji (logika recoverable niezależna od kolejek)
const billingStats = getRecoverableChargeJobStats(
  [
    {
      id: "rc-1",
      title: "Test",
      amount: 100,
      status: "open",
      sourceJobId: "billing-job",
      createdAt: "2026-06-01T10:00:00.000Z",
      updatedAt: "2026-06-01T10:00:00.000Z",
    },
  ],
  "billing-job",
);
assert(
  "T10_billing_stats",
  billingStats.unsettledCount >= 1 && buildJobQueueSections([BILLING_JOB], overdueIds).length === 6,
);

// Rozłączność sekcji
const allQueuedIds = sections.flatMap((s) => s.jobs.map((j) => j.id));
assert(
  "exclusive_sections",
  allQueuedIds.length === new Set(allQueuedIds).size,
  `duplicate ids in queues`,
);

// WM overdue wygrywa nad innymi regułami
const wmAlsoNoTeam = baseJob("wm-also-no-team", {
  client: "Wrocławskie Mieszkania",
  plannedHandoverDate: "2026-01-10",
  handoverStage: "in_progress",
  executionAssigneeDirectoryIds: [],
  documents: { ...emptyDocs(), zlecenie: true },
});
const exclusiveSections = buildJobQueueSections([wmAlsoNoTeam], wmOverdueJobIdSet([wmAlsoNoTeam]));
const placed = exclusiveSections.flatMap((s) => s.jobs.map((j) => `${s.id}:${j.id}`));
assert(
  "exclusive_wm_over_no_team",
  placed.length === 1 && placed[0].startsWith("wm_overdue:"),
  placed.join(", "),
);

log("\n--- Podsumowanie ---");
const passed = Object.values(results).filter((r) => r === "PASS").length;
const failed = Object.values(results).filter((r) => r === "FAIL").length;
log(`PASS: ${passed}  FAIL: ${failed}`);
if (failed > 0) process.exit(1);
log("\n✓ Roboty 2.0 MID-B smoke — ALL PASS");
