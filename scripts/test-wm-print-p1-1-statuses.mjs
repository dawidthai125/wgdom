/**
 * P1.1 — statusy procesu odbiorowego WM (niezależne od statusu robota).
 */
import {
  DEFAULT_WM_PRINT_JOB_WM_STATUS,
  getWmPrintJobWmStatus,
  setWmPrintJobWmStatus,
  normalizeWmPrintJobStatuses,
  mergeWmPrintJobStatuses,
  groupWmPrintJobsByWmStatus,
  countWmPrintJobsByWmStatus,
  jobMatchesWmPrintWmStatusFilter,
  WM_PRINT_WM_STATUS_LABELS,
} from "../src/lib/wm-print/job-wm-status.ts";
import { WM_PRINT_BACKUP_KEYS, WM_PRINT_JOB_STATUSES_KEY } from "../src/lib/wm-print/types.ts";

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

console.log("WM Print P1.1 — statusy WM\n");

// migracja / domyślny status
assert(normalizeWmPrintJobStatuses(null).length === 0, "migracja: pusta tablica bez utraty");
assert(normalizeWmPrintJobStatuses([{ jobId: "j1", status: "bogus", updatedAt: "x" }])[0].status === DEFAULT_WM_PRINT_JOB_WM_STATUS, "migracja: nieznany status → W TRAKCIE");
assert(getWmPrintJobWmStatus([], "new-job") === DEFAULT_WM_PRINT_JOB_WM_STATUS, "domyślny status nowej roboty: W TRAKCIE");
assert(getWmPrintJobWmStatus([], "existing-job") === "in_progress", "istniejące roboty bez wpisu: W TRAKCIE");

// zmiana statusów
let statuses = setWmPrintJobWmStatus([], "j1", "ready_for_handover");
assert(getWmPrintJobWmStatus(statuses, "j1") === "ready_for_handover", "zmiana na GOTOWE DO ODBIORU");
statuses = setWmPrintJobWmStatus(statuses, "j1", "handed_over");
assert(getWmPrintJobWmStatus(statuses, "j1") === "handed_over", "zmiana na ZDANE");
statuses = setWmPrintJobWmStatus(statuses, "j2", "in_progress");
assert(statuses.length === 2, "druga robota — osobny wpis");

// grupowanie sekcji + liczniki
const jobs = [
  { id: "j1", address: "A", flatNumber: "1", updatedAt: "2026-06-14T12:00:00Z", startDate: "2026-06-01", endDate: "2026-06-30", status: "in_progress", keysHandedOver: false, client: "", notes: "", documents: {}, workEntries: [], materials: [], invoiceStatus: "pending", invoiceNumber: "", invoiceAmount: "", photos: [] },
  { id: "j2", address: "B", flatNumber: "2", updatedAt: "2026-06-13T12:00:00Z", startDate: "2026-06-01", endDate: "2026-06-30", status: "in_progress", keysHandedOver: false, client: "", notes: "", documents: {}, workEntries: [], materials: [], invoiceStatus: "pending", invoiceNumber: "", invoiceAmount: "", photos: [] },
  { id: "j3", address: "C", flatNumber: "3", updatedAt: "2026-06-12T12:00:00Z", startDate: "2026-06-01", endDate: "2026-06-30", status: "completed", keysHandedOver: true, client: "", notes: "", documents: {}, workEntries: [], materials: [], invoiceStatus: "pending", invoiceNumber: "", invoiceAmount: "", photos: [] },
];
const statusRows = [
  { jobId: "j1", status: "in_progress", updatedAt: "2026-06-14T00:00:00Z" },
  { jobId: "j2", status: "ready_for_handover", updatedAt: "2026-06-14T00:00:00Z" },
  { jobId: "j3", status: "handed_over", updatedAt: "2026-06-14T00:00:00Z" },
];
const grouped = groupWmPrintJobsByWmStatus(jobs, statusRows);
assert(grouped.in_progress.length === 1 && grouped.in_progress[0].id === "j1", "sekcja W TRAKCIE: j1");
assert(grouped.ready_for_handover.length === 1 && grouped.ready_for_handover[0].id === "j2", "sekcja GOTOWE: j2");
assert(grouped.handed_over.length === 1 && grouped.handed_over[0].id === "j3", "sekcja ZDANE: j3");
assert(grouped.in_progress[0].updatedAt === "2026-06-14T12:00:00Z", "sortowanie w sekcji: najnowsze na górze");

const counts = countWmPrintJobsByWmStatus(jobs, statusRows);
assert(counts.in_progress === 1 && counts.ready_for_handover === 1 && counts.handed_over === 1, "liczniki sekcji 1/1/1");

// filtr WM
assert(jobMatchesWmPrintWmStatusFilter(statusRows, "j2", "ready_for_handover"), "filtr WM: gotowe");
assert(!jobMatchesWmPrintWmStatusFilter(statusRows, "j2", "handed_over"), "filtr WM: wyklucza inne");

// cloud sync LWW
const local = [{ jobId: "j1", status: "handed_over", updatedAt: "2026-06-15T10:00:00Z" }];
const cloud = [{ jobId: "j1", status: "in_progress", updatedAt: "2026-06-14T10:00:00Z" }];
const merged = mergeWmPrintJobStatuses(local, cloud);
assert(merged[0].status === "handed_over", "sync LWW: nowszy lokalny wygrywa");

// backup / restore — klucz w zestawie WM
assert(WM_PRINT_BACKUP_KEYS.includes(WM_PRINT_JOB_STATUSES_KEY), "backup: kw-wm-print-job-statuses w WM_PRINT_BACKUP_KEYS");
assert(WM_PRINT_JOB_STATUSES_KEY === "kw-wm-print-job-statuses", "sync key SSOT");

assert(WM_PRINT_WM_STATUS_LABELS.in_progress === "W TRAKCIE", "etykieta W TRAKCIE");
assert(WM_PRINT_WM_STATUS_LABELS.ready_for_handover === "GOTOWE DO ODBIORU", "etykieta GOTOWE DO ODBIORU");
assert(WM_PRINT_WM_STATUS_LABELS.handed_over === "ZDANE", "etykieta ZDANE");

console.log(`\n${pass} PASS · ${fail} FAIL`);
if (fail > 0) process.exit(1);
