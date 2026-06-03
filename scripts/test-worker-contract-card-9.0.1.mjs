/**
 * FAZA 9.0.1 — resolveWorkerContractStatusLabel / resolveWorkerContractDateLabel
 * Run: npx vite-node scripts/test-worker-contract-card-9.0.1.mjs
 */
import {
  resolveWorkerContractStatusLabel,
  resolveWorkerContractDateLabel,
} from "../src/app/app-domain.ts";

const baseJob = {
  id: "j1",
  address: "Remont szkoły",
  flatNumber: "",
  client: "Wrocławskie Mieszkania",
  status: "in_progress",
  keysHandedOver: false,
  documents: { zlecenie: true, kosztorys: false, protokol: false, faktura: false },
  notes: "",
  workEntries: [],
  materials: [],
  invoiceStatus: "pending",
  invoiceNumber: "",
  invoiceAmount: "",
  photos: [],
};

const bzpContract = {
  ...baseJob,
  linkedTenderId: "t-1",
  handoverStage: "in_progress",
  startDate: "2026-06-01",
  endDate: "2026-07-15",
};

const plainJob = {
  ...baseJob,
  startDate: "2026-05-10",
  endDate: "",
  jobPhase: "in_progress",
};

const noDates = { ...baseJob, linkedTenderId: "t-2", startDate: "", endDate: "" };

const pass =
  resolveWorkerContractStatusLabel(bzpContract) === "W realizacji" &&
  resolveWorkerContractDateLabel(bzpContract) === "01.06.2026 – 15.07.2026" &&
  resolveWorkerContractStatusLabel(plainJob) === "W trakcie" &&
  resolveWorkerContractDateLabel(plainJob) === "Start: 10.05.2026" &&
  resolveWorkerContractDateLabel(noDates) === null;

console.log(
  JSON.stringify(
    {
      test: "worker-contract-card-9.0.1",
      bzpStatus: resolveWorkerContractStatusLabel(bzpContract),
      bzpDate: resolveWorkerContractDateLabel(bzpContract),
      plainStatus: resolveWorkerContractStatusLabel(plainJob),
      plainDate: resolveWorkerContractDateLabel(plainJob),
      noDates: resolveWorkerContractDateLabel(noDates),
      pass,
    },
    null,
    2,
  ),
);

process.exit(pass ? 0 : 1);
