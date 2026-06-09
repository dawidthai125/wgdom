/**
 * Sprint 20.5A.9 — Technical Drawing Workflow (plan_techniczny)
 * Uruchom: npx vite-node scripts/smoke-test-technical-drawing-20.5a9.mjs
 */
import {
  syncJobDocuments,
  removeJobFileAttachment,
  planTechnicznyUploadError,
  jobHasPlanTechniczny,
  jobHasReportRysunek,
  DOCUMENT_TYPES,
} from "../src/lib/job-documents.ts";
import {
  collectJobImages,
  collectJobDocuments,
} from "../src/lib/media-separation.ts";
import { collectJobDocumentPackEntries } from "../src/lib/job-documents-pack.ts";
import { collectJobPhotoPackEntries } from "../src/lib/photo-download.ts";

const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

function assertEq(name, got, expected) {
  assert(name, got === expected, got === expected ? "" : `got ${got}, expected ${expected}`);
}

function assertIncludes(name, haystack, needle) {
  assert(name, haystack.some((x) => JSON.stringify(x).includes(needle)), needle);
}

function assertNotIncludes(name, haystack, needle) {
  assert(name, !haystack.some((x) => JSON.stringify(x).includes(needle)), needle);
}

const planPdf = {
  id: "plan-1",
  kind: "plan_techniczny",
  path: "jobs/test/plan_techniczny-1.pdf",
  publicUrl: "https://example.com/plan_techniczny-1.pdf",
  filename: "plan_mieszkania.pdf",
  uploadedBy: "Dawid",
  uploadedAt: "2026-06-09T10:00:00.000Z",
};

const sketchReport = {
  id: "r1",
  workerName: "Jan",
  submittedAt: "2026-06-09T09:00:00.000Z",
  workItems: [],
  rooms: [],
  sketch: {
    path: "jobs/test/sketch-1.jpg",
    publicUrl: "https://example.com/sketch-1.jpg",
  },
};

const roomsOnlyReport = {
  id: "r2",
  workerName: "Anna",
  submittedAt: "2026-06-08T09:00:00.000Z",
  workItems: [],
  rooms: [{ length: "4", width: "3", height: "2.7", note: "" }],
  sketch: null,
};

function emptyDocuments() {
  return Object.fromEntries(DOCUMENT_TYPES.map((d) => [d, false]));
}

function baseJob(overrides = {}) {
  return {
    id: "job-20.5a9",
    address: "ul. Testowa 1",
    flatNumber: "2",
    client: "WM",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    status: "in_progress",
    keysHandedOver: false,
    notes: "",
    documents: emptyDocuments(),
    jobFiles: [],
    workerReports: [],
    ...overrides,
  };
}

log("\n=== 20.5A.9 Technical Drawing — smoke ===\n");

// T1 — Szkic JPG → rysunek = true
{
  const job = syncJobDocuments(baseJob({ workerReports: [sketchReport] }));
  assertEq("T1-sketch-sync-rysunek", job.documents.rysunek, true);
  assert("T1-report-has-rysunek", jobHasReportRysunek(job));
}

// T2 — Plan PDF → rysunek = true
{
  const job = syncJobDocuments(baseJob({ jobFiles: [planPdf] }));
  assertEq("T2-plan-pdf-sync-rysunek", job.documents.rysunek, true);
  assert("T2-has-plan", jobHasPlanTechniczny(job));
}

// T3 — Szkic + PDF → true
{
  const job = syncJobDocuments(baseJob({
    workerReports: [sketchReport],
    jobFiles: [planPdf],
  }));
  assertEq("T3-sketch-and-pdf", job.documents.rysunek, true);
}

// T4 — Usunięcie PDF przy szkicu → true
{
  const withBoth = syncJobDocuments(baseJob({
    workerReports: [sketchReport],
    jobFiles: [planPdf],
    documents: { ...emptyDocuments(), rysunek: true },
  }));
  const afterRemove = removeJobFileAttachment(withBoth, planPdf.id);
  assertEq("T4-remove-pdf-sketch-keeps-true", afterRemove.documents.rysunek, true);
  assert("T4-no-plan-after-remove", !jobHasPlanTechniczny(afterRemove));
}

// T5 — Upload validation PDF
{
  assertEq("T5-plan-pdf-accept", planTechnicznyUploadError("plan.pdf"), null);
  assert("T5-plan-jpg-reject", planTechnicznyUploadError("plan.jpg") !== null);
}

// T6 — PDF w Plikach
{
  const job = baseJob({ jobFiles: [planPdf] });
  const docs = collectJobDocuments(job);
  assertIncludes("T6-plan-in-documents", docs, "plan_techniczny");
}

// T7 — PDF nie w Zdjęciach
{
  const job = baseJob({ jobFiles: [planPdf], workerReports: [sketchReport] });
  const images = collectJobImages(job);
  const docs = collectJobDocuments(job);
  assert("T7-plan-not-in-images", !images.some((i) => i.publicUrl.includes("plan_techniczny")));
  assertIncludes("T7-sketch-in-images", images, "sketch-1");
  assertIncludes("T7-plan-in-documents", docs, planPdf.id);
}

// T8 — PDF w Dokumenty ZIP
{
  const job = baseJob({ jobFiles: [planPdf] });
  const entries = collectJobDocumentPackEntries(job);
  assertIncludes("T8-plan-in-documents-zip", entries, "plan-techniczny/");
}

// T9 — PDF nie w Zdjęcia ZIP
{
  const job = baseJob({ jobFiles: [planPdf], workerReports: [sketchReport] });
  const photoEntries = collectJobPhotoPackEntries(job);
  const docEntries = collectJobDocumentPackEntries(job);
  assertNotIncludes("T9-plan-not-in-photo-zip", photoEntries, "plan_techniczny");
  assertNotIncludes("T9-plan-pdf-not-in-photo-zip", photoEntries, "plan_mieszkania");
  assertIncludes("T9-sketch-in-photo-zip", photoEntries, "raporty-rysunki");
  assertIncludes("T9-plan-in-doc-zip", docEntries, "plan-techniczny/");
}

// T10 — rooms only (regresja C)
{
  const job = syncJobDocuments(baseJob({ workerReports: [roomsOnlyReport] }));
  assertEq("T10-rooms-sync-rysunek", job.documents.rysunek, true);
}

// Regresja zlecenie/kosztorys
{
  const zlec = {
    id: "z1", kind: "zlecenie", path: "z.pdf", publicUrl: "https://ex/z.pdf",
    filename: "zlecenie.pdf", uploadedBy: "X", uploadedAt: "2026-06-01T00:00:00Z",
  };
  const job = syncJobDocuments(baseJob({ jobFiles: [zlec] }));
  assertEq("REG-zlecenie-sync", job.documents.zlecenie, true);
  assertEq("REG-rysunek-false-without-plan", job.documents.rysunek, false);
}

const passed = Object.values(results).filter((v) => v === "PASS").length;
const total = Object.keys(results).length;
log(`\n=== ${passed}/${total} PASS ===\n`);
if (passed !== total) process.exit(1);
