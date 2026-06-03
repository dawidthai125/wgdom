/**
 * FAZA 9.0 — isWorkerOnExecutionTeam
 * Run: npx vite-node scripts/test-worker-execution-team-9.0.mjs
 */
import { isWorkerOnExecutionTeam } from "../src/app/app-domain.ts";

const workerA = "dir-a";
const workerB = "dir-b";

const job = {
  id: "j1",
  address: "ul. Test",
  flatNumber: "",
  client: "Klient",
  status: "in_progress",
  keysHandedOver: false,
  documents: {},
  startDate: "2026-06-01",
  endDate: "",
  notes: "",
  workEntries: [],
  materials: [],
  invoiceStatus: "pending",
  invoiceNumber: "",
  invoiceAmount: "",
  photos: [],
  executionLeadDirectoryId: workerA,
  executionAssigneeDirectoryIds: [workerB, "dir-c"],
};

const pass =
  isWorkerOnExecutionTeam(job, workerA) === true &&
  isWorkerOnExecutionTeam(job, workerB) === true &&
  isWorkerOnExecutionTeam(job, "dir-c") === true &&
  isWorkerOnExecutionTeam(job, "dir-x") === false &&
  isWorkerOnExecutionTeam(job, "") === false &&
  isWorkerOnExecutionTeam({ ...job, executionLeadDirectoryId: undefined, executionAssigneeDirectoryIds: [] }, workerB) === false;

console.log(JSON.stringify({ test: "worker-execution-team-9.0", pass }, null, 2));
process.exit(pass ? 0 : 1);
