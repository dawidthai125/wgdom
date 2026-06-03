/**
 * ETAP 8.5 MIN — startJobExecution
 * Run: npx vite-node scripts/test-job-start-execution-8.5.mjs
 */
import {
  startJobExecution,
  canShowStartExecutionButton,
  inferHandoverStage,
  JOB_START_EXECUTION_ACTIVITY_TEXT,
} from "../src/lib/job-wm.ts";
import { inferJobPhase } from "../src/lib/job-list-status.ts";

const baseJob = {
  id: "j1",
  address: "ul. Test 1",
  flatNumber: "2",
  client: "Wrocławskie Mieszkania",
  status: "in_progress",
  keysHandedOver: false,
  documents: { zlecenie: false, kosztorys: false, protokol: false, faktura: false },
  startDate: "2026-06-01",
  linkedTenderId: "t-1",
};

const awaiting = {
  ...baseJob,
  handoverStage: "awaiting_order",
};

const started = startJobExecution(awaiting, "Dawid");
const phase = inferJobPhase(started);
const stage = inferHandoverStage(started);
const log0 = started.activityLog?.[0];

const pass =
  canShowStartExecutionButton(awaiting) === true &&
  canShowStartExecutionButton(started) === false &&
  phase === "in_progress" &&
  stage === "in_progress" &&
  started.handoverStage === "in_progress" &&
  started.jobPhase === "in_progress" &&
  log0?.text === JOB_START_EXECUTION_ACTIVITY_TEXT &&
  log0?.actor === "Dawid" &&
  log0?.type === "status_change";

console.log(
  JSON.stringify(
    {
      test: "job-start-execution-8.5-min",
      canShowBefore: canShowStartExecutionButton(awaiting),
      canShowAfter: canShowStartExecutionButton(started),
      jobPhase: phase,
      handoverStage: stage,
      activityText: log0?.text,
      pass,
    },
    null,
    2,
  ),
);

process.exit(pass ? 0 : 1);
