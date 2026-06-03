/**
 * ETAP 8.5 FULL — assignExecutionTeam + merge pól ekipy
 * Run: npx vite-node scripts/test-job-execution-team-8.5-full.mjs
 */
import {
  assignExecutionTeam,
  JOB_EXECUTION_TEAM_ACTIVITY_TEXT,
  mergeExecutionLeadDirectoryId,
  mergeExecutionAssigneeDirectoryIds,
  sanitizeExecutionAssigneeIds,
} from "../src/lib/job-wm.ts";

const baseJob = {
  id: "j1",
  address: "ul. Test 1",
  flatNumber: "2",
  client: "Wrocławskie Mieszkania",
  status: "in_progress",
  keysHandedOver: false,
  documents: { zlecenie: true, kosztorys: false, protokol: false, faktura: false },
  startDate: "2026-06-01",
  linkedTenderId: "t-1",
  handoverStage: "in_progress",
};

const lead = "dir-lead";
const crew = ["dir-a", "dir-b", "dir-c"];

const assigned = assignExecutionTeam(baseJob, lead, crew, "Dawid");
const log0 = assigned.activityLog?.[0];

const passAssign =
  assigned.executionLeadDirectoryId === lead &&
  assigned.executionAssigneeDirectoryIds?.length === 3 &&
  assigned.executionAssigneeDirectoryIds.join(",") === crew.join(",") &&
  log0?.text === JOB_EXECUTION_TEAM_ACTIVITY_TEXT &&
  log0?.actor === "Dawid" &&
  log0?.type === "status_change" &&
  !assigned.workEntries;

const mergedLead = mergeExecutionLeadDirectoryId("a", "b", true) === "b";
const mergedAssignees = mergeExecutionAssigneeDirectoryIds(["x", "y"], ["y", "z"]);
const passMerge =
  mergedLead &&
  mergedAssignees.length === 3 &&
  sanitizeExecutionAssigneeIds(["", "  id1 ", "id1"]).join() === "id1";

const pass = passAssign && passMerge;

console.log(
  JSON.stringify(
    {
      test: "job-execution-team-8.5-full",
      executionLeadDirectoryId: assigned.executionLeadDirectoryId,
      assigneeCount: assigned.executionAssigneeDirectoryIds?.length,
      activityText: log0?.text,
      mergedAssignees,
      pass,
    },
    null,
    2,
  ),
);

process.exit(pass ? 0 : 1);
