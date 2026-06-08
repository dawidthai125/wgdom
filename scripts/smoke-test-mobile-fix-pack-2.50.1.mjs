/**
 * Mobile Fix Pack 2.50.10 — toolbar compact, touch 44px, kolejki bez sticky
 * Uruchom: npx vite-node scripts/smoke-test-mobile-fix-pack-2.50.1.mjs
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DOCUMENT_TYPES } from "../src/lib/job-documents.ts";
import { JOB_LIST_STATUS_CONFIG } from "../src/lib/job-list-status.ts";
import {
  buildJobQueueSections,
  filterJobsForListView,
  groupJobsByStartMonth,
  wmOverdueJobIdSet,
} from "../src/lib/job-list-ops.ts";
import { getRecoverableChargeJobStats } from "../src/lib/recoverable-charges.ts";

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

function readSrc(relPath) {
  return readFileSync(resolve(root, relPath), "utf8");
}

function emptyDocs() {
  return Object.fromEntries(DOCUMENT_TYPES.map((d) => [d, false]));
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

const WM_OVERDUE = baseJob("wm-overdue", {
  client: "Wrocławskie Mieszkania",
  plannedHandoverDate: "2026-01-15",
  handoverStage: "in_progress",
  documents: { ...emptyDocs(), zlecenie: true },
});

const SEARCH_HIT = baseJob("search-hit", {
  address: "Szukana 42",
  client: "Klient ABC",
});

const BILLING_JOB = baseJob("billing-job");
const ALL_JOBS = [WM_OVERDUE, SEARCH_HIT, BILLING_JOB];

log("=== Mobile Fix Pack 2.50.10 smoke ===\n");

const headerSrc = readSrc("src/app/JobListPanelHeader.tsx");
const queueSrc = readSrc("src/app/JobQueueSections.tsx");
const filterBarSrc = readSrc("src/app/JobListStatus.tsx");

// T1 — Toolbar mobile compact
assert(
  "T1_toolbar_compact_space",
  headerSrc.includes("max-md:space-y-2")
    && headerSrc.includes("max-md:pt-3")
    && headerSrc.includes("max-md:pb-2"),
);
assert(
  "T1_toolbar_compact_kpi",
  headerSrc.includes("max-md:py-2") && headerSrc.includes("max-md:text-lg"),
);

// T2 — Toggle Lista/Kolejki 44px
const toggleBlock = headerSrc.slice(
  headerSrc.indexOf('aria-label="Widok listy robót"'),
  headerSrc.indexOf("Szukaj adresu"),
);
assert(
  "T2_toggle_44px",
  toggleBlock.includes("min-h-[44px]") && !toggleBlock.includes("min-h-[40px]"),
);

// T3 — Filtry dodatkowe 44px
const filtryIdx = headerSrc.indexOf("Filtry dodatkowe");
const filtryBlock = headerSrc.slice(Math.max(0, filtryIdx - 400), filtryIdx + 80);
assert(
  "T3_filtry_44px",
  filtryBlock.includes("min-h-[44px]") && !filtryBlock.includes("min-h-[36px]"),
);

// T4 — Kolejki (logika bez regresji)
const overdueIds = wmOverdueJobIdSet(ALL_JOBS);
const sections = buildJobQueueSections(ALL_JOBS, overdueIds);
assert(
  "T4_queue_sections",
  sections.length === 6
    && sections[0].id === "wm_overdue"
    && sections.some((s) => s.jobs.some((j) => j.id === "wm-overdue")),
  `ids=${sections.map((s) => s.id).join(",")}`,
);

// T5 — Brak sticky headers w JobQueueSections
assert("T5_no_sticky_headers", !queueSrc.includes("sticky top-0"));

// T6 — Billing badge 💰 (logika read-only)
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
  "T6_billing_stats",
  billingStats.unsettledCount >= 1 && typeof billingStats.toRecoverAmount === "number",
);

// T7 — Search bez regresji
const searchFiltered = filterJobsForListView(ALL_JOBS, {
  phaseFilter: "all",
  opsChip: null,
  overdueIds,
  workerDirectoryId: "",
  leadFilter: "",
  searchQuery: "Szukana",
});
assert(
  "T7_search",
  searchFiltered.length === 1 && searchFiltered[0].id === "search-hit",
);

// T8 — MID-B bez regresji (subset)
const monthGroups = groupJobsByStartMonth(ALL_JOBS);
assert(
  "T8_midb_list_groups",
  monthGroups.length >= 1 && monthGroups.every(([, jobs]) => jobs.length > 0),
);
assert(
  "T8_midb_handover_badges",
  JOB_LIST_STATUS_CONFIG.docs_pending.label === "Do odbioru — braki"
    && JOB_LIST_STATUS_CONFIG.ready_handover.label === "Gotowe do zdania",
);
const queueAfterSearch = buildJobQueueSections(searchFiltered, overdueIds);
assert(
  "T8_midb_search_queues",
  queueAfterSearch.reduce((s, sec) => s + sec.jobs.length, 0) === 1,
);

// Fazy 44px (bonus UX-3)
assert(
  "T3b_phase_tabs_44px",
  filterBarSrc.includes("min-h-[44px]") && filterBarSrc.includes("JobListFilterBar"),
);

// T9 — 20.5A.4 gate
log("\n--- Gate 20.5A.4 ---");
try {
  execSync("npx vite-node scripts/smoke-test-inspector-billing-notes-20.5a4.mjs", {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  results.T9_20_5a4 = "PASS";
  log("✓ T9_20_5a4 — gate PASS");
} catch (e) {
  results.T9_20_5a4 = "FAIL";
  log("✗ T9_20_5a4 — gate FAIL");
  if (e.stdout) log(e.stdout);
  if (e.stderr) log(e.stderr);
  throw new Error("FAIL: T9_20_5a4");
}

// T10 — 20.5A.3A gate
log("\n--- Gate 20.5A.3A ---");
try {
  execSync("npx vite-node scripts/smoke-test-inspector-billing-20.5a3a.mjs", {
    cwd: root,
    stdio: "pipe",
    encoding: "utf8",
  });
  results.T10_20_5a3a = "PASS";
  log("✓ T10_20_5a3a — gate PASS");
} catch (e) {
  results.T10_20_5a3a = "FAIL";
  log("✗ T10_20_5a3a — gate FAIL");
  if (e.stdout) log(e.stdout);
  if (e.stderr) log(e.stderr);
  throw new Error("FAIL: T10_20_5a3a");
}

log("\n--- Podsumowanie ---");
const passed = Object.values(results).filter((r) => r === "PASS").length;
const failed = Object.values(results).filter((r) => r === "FAIL").length;
log(`PASS: ${passed}  FAIL: ${failed}`);
if (failed > 0) process.exit(1);
log("\n✓ Mobile Fix Pack 2.50.10 smoke — ALL PASS");
