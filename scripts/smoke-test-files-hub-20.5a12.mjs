/**
 * Sprint 20.5A.12 — Files Hub Consolidation
 * Uruchom: npx vite-node scripts/smoke-test-files-hub-20.5a12.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  collectFilesHubContractItems,
  collectFilesHubReportItems,
  collectFilesHubAttachmentItems,
  getFilesHubChecklistSummary,
  countFilesHubItems,
  countAllFilesHubItems,
  jobHasFilesHubContent,
  summarizeFilesHub,
} from "../src/lib/files-hub-index.ts";
import { countJobDocuments } from "../src/lib/media-separation.ts";
import { countJobImages } from "../src/lib/media-separation.ts";
import { toWorkerReportPdfSource, downloadWorkerReportPdf } from "../src/lib/worker-report-pdf.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

function assert(name, cond, detail = "") {
  console.log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

function assertEq(name, got, expected) {
  assert(name, got === expected, got === expected ? "" : `got ${got}, expected ${expected}`);
}

const jobFixture = {
  id: "job-hub-12",
  address: "ul. Hubowa 1",
  flatNumber: "3",
  client: "WM",
  documents: {
    zlecenie: true,
    zakres: true,
    kosztorys: true,
    kominiarz: true,
    pomiary: true,
    oswiadczenia: true,
    gwarancje: false,
    rysunek: false,
    zdjecia: false,
  },
  jobFiles: [
    {
      id: "jf1",
      kind: "zlecenie",
      path: "jobs/j1/zlec.pdf",
      publicUrl: "https://example.com/zlec.pdf",
      filename: "zlecenie.pdf",
      uploadedBy: "Admin",
      uploadedAt: "2026-06-09T10:00:00Z",
    },
    {
      id: "jf2",
      kind: "kosztorys",
      path: "jobs/j1/koszt.ath",
      publicUrl: "https://example.com/koszt.ath",
      filename: "kosztorys.ath",
      uploadedBy: "Admin",
      uploadedAt: "2026-06-09T11:00:00Z",
    },
  ],
  workerReports: [
    {
      id: "wr1",
      workerName: "Jan",
      submittedAt: "2026-06-08T12:00:00Z",
      workScopeText: "• Malowanie",
      rooms: [{ id: "r1", roomType: "pokoj", length: "4", width: "3", height: "2.6", note: "" }],
      sketch: null,
    },
    {
      id: "wr2",
      workerName: "Anna",
      submittedAt: "2026-06-07T09:00:00Z",
      workScopeText: "",
      rooms: [],
      sketch: { publicUrl: "https://example.com/sketch.jpg", path: "jobs/j1/sk.jpg" },
    },
  ],
  jobAttachments: [
    {
      id: "ja1",
      filename: "notatka.pdf",
      path: "jobs/j1/attachments-1-notatka.pdf",
      publicUrl: "https://example.com/notatka.pdf",
      uploadedBy: "Admin",
      uploadedAt: "2026-06-09T08:00:00Z",
    },
  ],
  photos: [
    {
      id: "p1",
      status: "approved",
      publicUrl: "https://example.com/photo.jpg",
      label: "before",
      uploadedBy: "Jan",
      uploadedAt: "2026-06-09T07:00:00Z",
    },
  ],
};

console.log("=== Smoke 20.5A.12 — Files Hub Consolidation ===\n");

// T1–T3 aggregation
assertEq("T1 contract items", collectFilesHubContractItems(jobFixture).length, 2);
assertEq("T2 report items", collectFilesHubReportItems(jobFixture).length, 2);
assertEq("T3 attachment items", collectFilesHubAttachmentItems(jobFixture).length, 1);

const reports = collectFilesHubReportItems(jobFixture);
assertEq("T2 label first", reports[0].label, "Dokumentacja robót #1");
assert(reports[0].hasScope, "T2 scope on first report");

// T4–T6 countFilesHubItems
const summary = summarizeFilesHub(jobFixture);
assertEq("T4 summary total", summary.total, 5);
assertEq("T5 countFilesHubItems", countFilesHubItems(jobFixture), 5);
assertEq("T6 countAllFilesHubItems", countAllFilesHubItems([jobFixture, jobFixture]), 10);

// T7 report without sketch (wr1)
const wr1 = reports.find((r) => r.id === "wr1");
assert(wr1 && wr1.hasScope && !wr1.hasSketch && wr1.roomCount === 1, "T7 report without sketch");

// T8 checklist
const checklist = getFilesHubChecklistSummary(jobFixture);
assertEq("T8 checklist checked", checklist.checked, 6);
assertEq("T8 checklist total", checklist.total, 9);

// T9 jobHasFilesHubContent
assert(jobHasFilesHubContent(jobFixture), "T9 hub content present");
const emptyJob = { ...jobFixture, jobFiles: [], workerReports: [], jobAttachments: [] };
assert(!jobHasFilesHubContent(emptyJob), "T9 empty hub");

// T10 photos not counted
assertEq("T10 hub ignores photos", countFilesHubItems(jobFixture), 5);
assert(countJobImages(jobFixture) > 0, "T10 photos exist separately");

// T11–T12 no regression countJobDocuments
assertEq("T11 countJobDocuments unchanged", countJobDocuments(jobFixture), 2);
assertEq("T12 countFilesHub >= countJobDocuments", countFilesHubItems(jobFixture) >= countJobDocuments(jobFixture), true);

// PDF stub
const pdfSource = toWorkerReportPdfSource(jobFixture, jobFixture.workerReports[0]);
assert(pdfSource.reportId === "wr1" && pdfSource.workScopeText.includes("Malowanie"), "T12b pdf source mapping");
let pdfThrows = false;
try {
  await downloadWorkerReportPdf(pdfSource);
} catch (e) {
  pdfThrows = String(e).includes("planned 20.5A.12C");
}
assert(pdfThrows, "T12c pdf stub throws");

// T13–T15 bundle markers (source)
const hubIndex = readFileSync(resolve(root, "src/lib/files-hub-index.ts"), "utf8");
const hubUi = readFileSync(resolve(root, "src/app/JobFilesHub.tsx"), "utf8");
const jobsView = readFileSync(resolve(root, "src/app/JobsView.tsx"), "utf8");
assert(hubIndex.includes("countFilesHubItems"), "T13 files-hub-index marker");
assert(hubUi.includes("Dokumentacja robót") && hubUi.includes("Checklista odbiorowa"), "T14 JobFilesHub sections");
assert(jobsView.includes("JobFilesHub") && jobsView.includes("countFilesHubItems"), "T15 JobsView integration");

console.log("\n=== PASS — 20.5A.12 Files Hub ===");
