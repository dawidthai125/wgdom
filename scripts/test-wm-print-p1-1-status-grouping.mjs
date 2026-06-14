/**
 * P1.1 correction — grupowanie Odbiorów WM Druk wyłącznie po statusie robota (jobPhase).
 */
import {
  groupWmPrintJobsByPhase,
  countWmPrintJobsByPhase,
  getWmPrintJobPhase,
  WM_PRINT_SECTION_LABELS,
  WM_PRINT_SECTION_ORDER,
} from "../src/lib/wm-print/job-phase-grouping.ts";
import { jobMatchesWmPrintFilter, WM_PRINT_FILTER_LABELS } from "../src/lib/wm-print/filters.ts";
import { WM_PRINT_BACKUP_KEYS } from "../src/lib/wm-print/types.ts";
import { DATA_KEYS } from "../src/lib/cloud-sync.ts";

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

function makeJob(id, jobPhase, extra = {}) {
  return {
    id,
    address: `Test ${id}`,
    status: jobPhase === "completed" ? "completed" : "in_progress",
    jobPhase,
    client: "WM Wrocławskie Mieszkania",
    documents: { zlecenie: true, kosztorys: false, protokol: false, faktura: false },
    ...extra,
  };
}

console.log("WM Print P1.1 correction — status grouping (job phase only)\n");

const jIn = makeJob("j-in", "in_progress");
const jHand = makeJob("j-hand", "handover");
const jDone = makeJob("j-done", "completed");

const grouped = groupWmPrintJobsByPhase([jDone, jIn, jHand]);
assert(grouped.in_progress.length === 1 && grouped.in_progress[0].id === "j-in", "grupowanie W trakcie");
assert(grouped.handover.length === 1 && grouped.handover[0].id === "j-hand", "grupowanie Do odbioru");
assert(grouped.completed.length === 1 && grouped.completed[0].id === "j-done", "grupowanie Zdane");

const counts = countWmPrintJobsByPhase([jIn, jHand, jDone, jIn]);
assert(counts.in_progress === 2 && counts.handover === 1 && counts.completed === 1, "liczniki sekcji");

const changed = makeJob("j-hand", "completed");
const regrouped = groupWmPrintJobsByPhase([jIn, changed, jDone]);
assert(regrouped.handover.length === 0, "po zmianie fazy: brak w GOTOWE DO ODBIORU");
assert(regrouped.completed.some((j) => j.id === "j-hand"), "po zmianie fazy: robota w ZDANE");

assert(WM_PRINT_SECTION_ORDER.length === 3, "3 sekcje UI");
assert(WM_PRINT_SECTION_LABELS.in_progress === "W TRAKCIE", "etykieta sekcji W TRAKCIE");
assert(WM_PRINT_SECTION_LABELS.handover === "GOTOWE DO ODBIORU", "etykieta sekcji GOTOWE DO ODBIORU");
assert(WM_PRINT_SECTION_LABELS.completed === "ZDANE", "etykieta sekcji ZDANE");

assert(getWmPrintJobPhase(jHand) === "handover", "getWmPrintJobPhase z jobPhase");

assert(jobMatchesWmPrintFilter(jIn, "all"), "filtr Wszystkie");
assert(jobMatchesWmPrintFilter(jIn, "in_progress"), "filtr W trakcie");
assert(!jobMatchesWmPrintFilter(jIn, "handover"), "filtr Do odbioru — wyklucza W trakcie");
assert(jobMatchesWmPrintFilter(jDone, "completed"), "filtr Zdane");
assert(WM_PRINT_FILTER_LABELS.handover === "Do odbioru", "etykieta filtra Do odbioru");

assert(!WM_PRINT_BACKUP_KEYS.includes("kw-wm-print-job-statuses"), "brak kw-wm-print-job-statuses w backup keys");
assert(!DATA_KEYS.includes("kw-wm-print-job-statuses"), "brak kw-wm-print-job-statuses w DATA_KEYS");

console.log(`\n${pass} PASS, ${fail} FAIL`);
process.exit(fail > 0 ? 1 : 0);
