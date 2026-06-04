/**
 * Roboty 2.0 MIN — job-list-ops
 * Run: npx vite-node scripts/test-job-list-ops-2.0-min.mjs
 * (alias @/ — plain `node` nie rozwiązuje importów)
 */
import {
  computeJobListOpsKpi,
  jobMatchesOpsChip,
  jobOpsHasNoExecutionTeam,
  jobOpsIsBzpNotStarted,
  compareJobsByOpsPriority,
  wmOverdueJobIdSet,
  sortJobsInMonthGroup,
} from "../src/lib/job-list-ops.ts";

const base = {
  id: "j1",
  address: "ul. Test 1",
  flatNumber: "",
  client: "Inny klient",
  status: "in_progress",
  keysHandedOver: false,
  documents: { zlecenie: true, kosztorys: false, protokol: false, faktura: false },
  startDate: "2026-06-01",
  handoverStage: "in_progress",
};

const noTeam = {
  ...base,
  id: "no-team",
  client: "Wrocławskie Mieszkania",
  plannedHandoverDate: "2026-05-01",
  executionAssigneeDirectoryIds: [],
};
const withTeam = {
  ...base,
  id: "with-team",
  executionAssigneeDirectoryIds: ["d1"],
  startDate: "2026-06-10",
};
const bzpNotStarted = {
  ...base,
  id: "bzp-ns",
  linkedTenderId: "t-1",
  handoverStage: "awaiting_order",
  executionAssigneeDirectoryIds: ["d1"],
  startDate: "2026-06-05",
};
const completed = {
  ...base,
  id: "done",
  jobPhase: "completed",
  status: "completed",
  executionAssigneeDirectoryIds: [],
};

const jobs = [withTeam, noTeam, bzpNotStarted, completed];
const overdueIds = wmOverdueJobIdSet(jobs);
const kpi = computeJobListOpsKpi(jobs);

const sorted = sortJobsInMonthGroup(jobs, overdueIds);
const firstId = sorted[0]?.id;

const checks = {
  noTeamActive: jobOpsHasNoExecutionTeam(noTeam) === true,
  noTeamCompleted: jobOpsHasNoExecutionTeam(completed) === false,
  bzpNotStarted: jobOpsIsBzpNotStarted(bzpNotStarted) === true,
  kpiNoTeam: kpi.noTeam === 1,
  kpiBzp: kpi.bzp === 1,
  kpiWmOverdue: kpi.wmOverdue === 1,
  chipNoTeam: jobMatchesOpsChip(noTeam, "no_team", overdueIds),
  chipBzp: jobMatchesOpsChip(bzpNotStarted, "bzp_only", overdueIds) && !jobMatchesOpsChip(completed, "bzp_only", overdueIds),
  sortPutsNoTeamOrOverdueFirst: firstId === "no-team",
  compareOrder:
    compareJobsByOpsPriority(noTeam, withTeam, overdueIds) < 0
    && compareJobsByOpsPriority(noTeam, bzpNotStarted, overdueIds) < 0,
};

const pass = Object.values(checks).every(Boolean);

console.log(
  JSON.stringify(
    {
      test: "job-list-ops-2.0-min",
      kpi,
      overdueIds: [...overdueIds],
      sortedIds: sorted.map((j) => j.id),
      checks,
      pass,
    },
    null,
    2,
  ),
);

process.exit(pass ? 0 : 1);
