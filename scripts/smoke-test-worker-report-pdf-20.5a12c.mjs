/**
 * Sprint 20.5A.12C — Worker Report PDF Export
 * Uruchom: npx vite-node scripts/smoke-test-worker-report-pdf-20.5a12c.mjs
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readChangelogVersion } from "./read-changelog-version.mjs";
import {
  toWorkerReportPdfSource,
  buildWorkerReportDocDef,
  workerReportPdfFilename,
  downloadWorkerReportPdf,
} from "../src/lib/worker-report-pdf.ts";

const __dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dir, "..");

function readSrc(rel) {
  return readFileSync(resolve(root, rel), "utf8");
}

function assert(name, cond, detail = "") {
  console.log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

console.log("=== Sprint 20.5A.12C — Worker Report PDF ===\n");

assert("precheck changelog 2.50.61", readChangelogVersion() === "2.50.61");

const pdfSrc = readSrc("src/lib/worker-report-pdf.ts");
assert("T1 exports toWorkerReportPdfSource", pdfSrc.includes("export function toWorkerReportPdfSource"));
assert("T2 exports downloadWorkerReportPdf", pdfSrc.includes("export async function downloadWorkerReportPdf"));
assert("T3 exports buildWorkerReportDocDef", pdfSrc.includes("export async function buildWorkerReportDocDef"));
assert("T4 no stub throw", !pdfSrc.includes("planned 20.5A.12C"));
assert("T5 loadPdfMake", pdfSrc.includes("loadPdfMake") && pdfSrc.includes("pdfmake-loader"));
assert("T6 deliverPdfBlob", pdfSrc.includes("deliverPdfBlob") && pdfSrc.includes("inspector-report-pdf"));

assert(
  "T7 UI JobWorkerReportsPanel",
  readSrc("src/app/JobWorkerReportsPanel.tsx").includes("Eksportuj PDF")
    && readSrc("src/app/JobWorkerReportsPanel.tsx").includes("downloadWorkerReportPdfForJob"),
);
assert(
  "T8 UI JobFilesHub",
  readSrc("src/app/JobFilesHub.tsx").includes("Eksportuj PDF")
    && readSrc("src/app/JobFilesHub.tsx").includes("downloadWorkerReportPdfForJob"),
);

const mockJob = {
  id: "job-1",
  address: "ul. Testowa 1",
  flatNumber: "2",
  workerReports: [],
};
const mockReport = {
  id: "r1",
  workerName: "Jan Kowalski",
  submittedAt: "2026-06-10T10:00:00.000Z",
  updatedAt: "2026-06-10T12:00:00.000Z",
  workScopeText: "• Malowanie ścian\n• Układanie płytek",
  workItems: [],
  rooms: [{
    id: "room1",
    roomType: "lazienka",
    customLabel: "",
    length: "3",
    width: "2",
    height: "2.6",
    note: "sufit podwieszany",
  }],
  generalNote: "Uwaga do admina",
  sketchNote: "Obrys z wejścia",
};

const source = toWorkerReportPdfSource(mockJob, mockReport);
assert("T9 source mapping", source.jobTitle.includes("Testowa") && source.workScopeText.includes("Malowanie"));
assert("T10 source updatedAt", source.updatedAt === mockReport.updatedAt);
assert("T11 filename", workerReportPdfFilename(source).startsWith("dokumentacja-"));

const doc = await buildWorkerReportDocDef(source, null);
assert("T12 docDef content", Array.isArray(doc.content) && doc.content.length > 5);
assert("T13 docDef scope", JSON.stringify(doc).includes("ZAKRES PRAC"));
assert("T14 sketch fallback", JSON.stringify(doc).includes("Obrys lokalu niedostępny") || !source.sketchUrl);

assert(
  "T15 inspector export deliverPdfBlob",
  readSrc("src/lib/inspector-report-pdf.ts").includes("export async function deliverPdfBlob"),
);

console.log("\n=== 15/15 PASS — 20.5A.12C Worker Report PDF ===");
