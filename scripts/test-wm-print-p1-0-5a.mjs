/**
 * P1.0.5A — deduplikacja braków kompletności robót.
 */
import {
  computeWmPrintCompleteness,
  dedupeWmPrintMissingNames,
  groupWmPrintJobUploadSlotsByName,
  wmPrintJobUploadSlotKey,
} from "../src/lib/wm-print/completeness.ts";
import { computeWmPrintConfigurationStatus } from "../src/lib/wm-print/configuration-status.ts";

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

function jobUploadSlot(id, name, sortOrder = 10) {
  return {
    id,
    name,
    kind: "job_upload",
    type: "pdf",
    enabled: true,
    sortOrder,
    files: [],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  };
}

// Zduplikowane sloty (np. po merge/sync) — ten sam zestaw nazw 2×
const templates = [
  jobUploadSlot("kom-1", "Kominiarz", 40),
  jobUploadSlot("pom-1", "Pomiary elektryczne", 50),
  jobUploadSlot("gaz-1", "Gaz", 60),
  jobUploadSlot("went-1", "Wentylacja", 70),
  jobUploadSlot("kom-2", "Kominiarz", 140),
  jobUploadSlot("pom-2", "Pomiary elektryczne", 150),
  jobUploadSlot("gaz-2", "Gaz", 160),
  jobUploadSlot("went-2", "Wentylacja", 170),
];

const job = { id: "job-1", address: "Gorlicka 26/6", status: "active" };

console.log("WM Print P1.0.5A — deduplikacja kompletności\n");

// 1. Grupowanie wejściowe
const groups = groupWmPrintJobUploadSlotsByName(templates);
assert(groups.size === 4, "8 slotów → 4 unikalne nazwy");

// 2. Dedupe listy braków
const rawMissing = [
  "Pomiary elektryczne",
  "Gaz",
  "Kominiarz",
  "Wentylacja",
  "Kominiarz",
  "Pomiary elektryczne",
  "Gaz",
  "Wentylacja",
];
const unique = dedupeWmPrintMissingNames(rawMissing);
assert(unique.length === 4, "dedupe: 8 wpisów → 4 unikalne");
assert(
  unique.join("|") === "Pomiary elektryczne|Gaz|Kominiarz|Wentylacja",
  "dedupe: zachowana kolejność pierwszego wystąpienia",
);

// 3. Kompletność % po deduplikacji (0% — brak uploadów)
const compEmpty = computeWmPrintCompleteness(job, templates, []);
assert(compEmpty.total === 4, "total = 4 (nie 8)");
assert(compEmpty.present === 0, "present = 0");
assert(compEmpty.percent === 0, "0% przy braku dokumentów");
assert(compEmpty.missing.length === 4, "missing: 4 unikalne pozycje");
assert(
  new Set(compEmpty.missing.map(wmPrintJobUploadSlotKey)).size === compEmpty.missing.length,
  "missing: brak duplikatów w wyniku",
);

// 4. Upload do jednego z duplikatów → 25% (1/4)
const jobDocs = [
  {
    id: "d1",
    jobId: "job-1",
    templateId: "kom-2",
    name: "Kominiarz",
    storagePath: "p1",
    storageUrl: "https://example.com/kom.pdf",
    originalFileName: "kom.pdf",
    uploadedAt: "2026-06-14T00:00:00Z",
    uploadedBy: "Admin",
  },
];
const compPartial = computeWmPrintCompleteness(job, templates, jobDocs);
assert(compPartial.percent === 25, "25% = 1/4 unikalnych slotów");
assert(compPartial.missing.length === 3, "3 braki po deduplikacji");
assert(!compPartial.missing.includes("Kominiarz"), "Kominiarz nie w missing");

// 5. Wszystkie unikalne sloty wypełnione (różne duplicate ids)
const fullDocs = [
  { ...jobDocs[0], id: "d1", templateId: "kom-1" },
  {
    id: "d2",
    jobId: "job-1",
    templateId: "pom-2",
    name: "Pomiary elektryczne",
    storagePath: "p2",
    storageUrl: "https://example.com/pom.pdf",
    originalFileName: "pom.pdf",
    uploadedAt: "2026-06-14T00:00:00Z",
    uploadedBy: "Admin",
  },
  {
    id: "d3",
    jobId: "job-1",
    templateId: "gaz-1",
    name: "Gaz",
    storagePath: "p3",
    storageUrl: "https://example.com/gaz.pdf",
    originalFileName: "gaz.pdf",
    uploadedAt: "2026-06-14T00:00:00Z",
    uploadedBy: "Admin",
  },
  {
    id: "d4",
    jobId: "job-1",
    templateId: "went-2",
    name: "Wentylacja",
    storagePath: "p4",
    storageUrl: "https://example.com/went.pdf",
    originalFileName: "went.pdf",
    uploadedAt: "2026-06-14T00:00:00Z",
    uploadedBy: "Admin",
  },
];
const compFull = computeWmPrintCompleteness(job, templates, fullDocs);
assert(compFull.percent === 100, "100% przy wszystkich unikalnych slotach");
assert(compFull.missing.length === 0, "brak missing");

// 6. Regresja P1.0.5 — config + kompletność bez duplikatów
const templatesSingle = [
  jobUploadSlot("kom-1", "Kominiarz"),
  jobUploadSlot("pom-1", "Pomiary elektryczne"),
  jobUploadSlot("went-1", "Wentylacja"),
  {
    id: "gen-izba",
    name: "Izba",
    kind: "generated",
    type: "pdf",
    enabled: true,
    sortOrder: 20,
    files: [],
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
  },
];
const compReg = computeWmPrintCompleteness(job, templatesSingle, [
  {
    id: "d1",
    jobId: "job-1",
    templateId: "kom-1",
    name: "Kominiarz",
    storagePath: "p1",
    storageUrl: "https://example.com/kom.pdf",
    originalFileName: "kom.pdf",
    uploadedAt: "2026-06-14T00:00:00Z",
    uploadedBy: "Admin",
  },
  {
    id: "d2",
    jobId: "job-1",
    templateId: "pom-1",
    name: "Pomiary elektryczne",
    storagePath: "p2",
    storageUrl: "https://example.com/pom.pdf",
    originalFileName: "pom.pdf",
    uploadedAt: "2026-06-14T00:00:00Z",
    uploadedBy: "Admin",
  },
]);
assert(compReg.percent === 67, "regresja P1.0.5: 67% (2/3 slotów)");
assert(compReg.missing.length === 1 && compReg.missing[0] === "Wentylacja", "regresja: tylko Wentylacja");
const cfg = computeWmPrintConfigurationStatus(templatesSingle);
assert(cfg.missing.includes("Izba"), "regresja P1.0.5: Izba w config missing");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
