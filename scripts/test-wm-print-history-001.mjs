/**
 * WM-HISTORY-001 — historia generowania WM Druk (metadane only).
 */
import {
  appendWmPrintHistory,
  buildWmPrintHistoryTemplateEntry,
  buildWmPrintHistoryZipEntry,
  filterWmPrintHistoryForJob,
  mergeWmPrintHistory,
  normalizeWmPrintHistory,
  resolveWmPrintOutputType,
  sortWmPrintHistoryDesc,
  WM_PRINT_HISTORY_CAP,
  WM_PRINT_HISTORY_ZIP_TEMPLATE_ID,
  WM_PRINT_HISTORY_ZIP_TEMPLATE_NAME,
} from "../src/lib/wm-print/history.ts";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${msg}`);
  } else {
    fail++;
    console.error(`  ✗ ${msg}`);
  }
}

const job = {
  id: "job-sepa-83",
  address: "Szarzyńskiego 83",
  flatNumber: "7",
  client: "WM",
  startDate: "",
  endDate: "",
  status: "in_progress",
  keysHandedOver: false,
  notes: "",
  documents: {},
  workEntries: [],
};

const docxTemplate = {
  id: "tpl-docx-1",
  name: "Oświadczenie",
  type: "docx",
  kind: "generated",
  enabled: true,
  sortOrder: 1,
  files: [],
  updatedAt: "",
};

const pdfTemplate = {
  ...docxTemplate,
  id: "tpl-pdf-zi",
  name: "ZI",
  type: "pdf_form",
};

console.log("WM Print History 001 smoke\n");

const pdfEntry = buildWmPrintHistoryTemplateEntry(job, pdfTemplate, "admin-1", "Dawid");
assert(pdfEntry.outputType === "pdf", "append PDF outputType");
assert(pdfEntry.templateName === "ZI", "PDF templateName");

const docxEntry = buildWmPrintHistoryTemplateEntry(job, docxTemplate, "admin-1", "Dawid");
assert(docxEntry.outputType === "docx", "append DOCX outputType");

const zipEntry = buildWmPrintHistoryZipEntry(job, "admin-2", "Stanisław");
assert(zipEntry.outputType === "zip", "append ZIP outputType");
assert(zipEntry.templateId === WM_PRINT_HISTORY_ZIP_TEMPLATE_ID, "ZIP sentinel templateId");
assert(zipEntry.templateName === WM_PRINT_HISTORY_ZIP_TEMPLATE_NAME, "ZIP label Pakiet odbiorowy ZIP");

let log = appendWmPrintHistory([], [pdfEntry, docxEntry, zipEntry]);
assert(log.length === 3, "append three entries");

const sorted = sortWmPrintHistoryDesc([
  { ...zipEntry, timestamp: "2026-06-10T10:00:00.000Z" },
  { ...pdfEntry, timestamp: "2026-06-15T12:00:00.000Z" },
]);
assert(sorted[0].timestamp.startsWith("2026-06-15"), "sort desc by timestamp");

const oldEntry = {
  ...pdfEntry,
  id: "old-1",
  timestamp: "2020-01-01T00:00:00.000Z",
};
const batch = Array.from({ length: WM_PRINT_HISTORY_CAP }, (_, i) => ({
  ...docxEntry,
  id: `cap-${i}`,
  timestamp: `2026-06-${String((i % 28) + 1).padStart(2, "0")}T12:00:00.000Z`,
}));
log = appendWmPrintHistory(batch, oldEntry);
assert(log.length === WM_PRINT_HISTORY_CAP, "cap 1000 entries");
assert(!log.some((e) => e.id === "old-1"), "cap drops oldest entry");

const local = [pdfEntry];
const cloud = [{ ...docxEntry, userName: "Cloud merge" }];
const merged = mergeWmPrintHistory(local, cloud);
assert(merged.length === 2, "merge local + cloud");
assert(merged.some((e) => e.id === docxEntry.id), "merge includes cloud entry");

const forJob = filterWmPrintHistoryForJob([pdfEntry, { ...docxEntry, jobId: "other" }], job.id);
assert(forJob.length === 1 && forJob[0].id === pdfEntry.id, "filter by jobId");

assert(resolveWmPrintOutputType(docxTemplate) === "docx", "resolve docx");
assert(resolveWmPrintOutputType(pdfTemplate) === "pdf", "resolve pdf from pdf_form");

const norm = normalizeWmPrintHistory([{ garbage: true }, pdfEntry]);
assert(norm.length === 1, "normalize rejects invalid rows");

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
