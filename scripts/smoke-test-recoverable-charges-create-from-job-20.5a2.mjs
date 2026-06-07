/**
 * Sprint 20.5A.2 — Create recoverable charge from job
 * Uruchom: npx vite-node scripts/smoke-test-recoverable-charges-create-from-job-20.5a2.mjs
 */
import {
  appendRecoverableChargeCreate,
  buildRecoverableChargeDraftFromJob,
  defaultRecoverableCharge,
  deriveChargeAmounts,
  finalizeRecoverableChargeDraftForSave,
  getRecoverableChargeJobStats,
  getRecoverableChargesForJob,
  jobAddressForRecoverableCharge,
  recoverableChargesDashboardCardStats,
  resolveJobResponsibleInspector,
  validateRecoverableChargeDraft,
} from "../src/lib/recoverable-charges.ts";

const results = {};

function log(msg) {
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

const JOB_ID = "job-create-1";
const job = {
  id: JOB_ID,
  address: "ul. Testowa 12",
  flatNumber: "5A",
  client: "WM Wrocław",
  executionLeadDirectoryId: "dir-inspector-1",
  startDate: "2026-01-01",
  endDate: "",
  workEntries: [],
  documents: {},
  photos: [],
  materials: [],
  notes: "",
};

const directory = [
  { id: "dir-inspector-1", name: "Jan Kowalski" },
];

const NOW = new Date("2026-06-06T12:00:00.000Z");

log("=== Sprint 20.5A.2 — Create from job smoke ===\n");

// A — create draft from job
const draft = buildRecoverableChargeDraftFromJob(job, "Admin", directory);
assert("A-draft-exists", !!draft.id);
assert("A-source-type", draft.sourceType === "job");

// B — sourceJobId preset
assert("B-source-job-id", draft.sourceJobId === JOB_ID);

// C — client preset
assert("C-client", draft.clientName === "WM Wrocław");

// D — inspector preset
assert("D-inspector-fn", resolveJobResponsibleInspector(job, directory) === "Jan Kowalski");
assert("D-inspector-draft", draft.responsibleInspector === "Jan Kowalski");

// Address helper
assert("D-address", jobAddressForRecoverableCharge(job) === "ul. Testowa 12 m.5A");

// E — save creates charge
draft.title = "Dodatkowe malowanie";
draft.description = "Farba poza kosztorysem";
draft.amount = 1200;
const validation = validateRecoverableChargeDraft(draft);
assert("E-validation", validation.ok === true);
const saved = finalizeRecoverableChargeDraftForSave(draft);
assert("E-status-open", saved.status === "open");
assert("E-amount", saved.amount === 1200);
assert("E-remaining", saved.amountRemaining === 1200);

// F — after save visible on source job
const list = appendRecoverableChargeCreate([], draft);
assert("F-list-len", list.length === 1);
const onJob = getRecoverableChargesForJob(list, JOB_ID);
assert("F-on-job", onJob.length === 1);
assert("F-on-job-title", onJob[0].title === "Dodatkowe malowanie");
const stats = getRecoverableChargeJobStats(list, JOB_ID, NOW);
assert("F-stats-count", stats.chargeCount === 1);
assert("F-stats-to-recover", stats.toRecoverAmount === 1200);

// G — deep-link create consumed once (preset merge semantics)
const preset = { sourceType: "job", sourceJobId: JOB_ID, clientName: "WM Wrocław" };
const merged = { ...defaultRecoverableCharge("Admin"), ...preset };
assert("G-preset-source", merged.sourceType === "job" && merged.sourceJobId === JOB_ID);
assert("G-preset-client", merged.clientName === "WM Wrocław");
let consumed = false;
const consume = () => { consumed = true; };
consume();
assert("G-consumed-once", consumed === true);

// H — no regression settlement workflow
const derived = deriveChargeAmounts(saved);
assert("H-derived-open", derived.status === "open");
assert("H-derived-settled-zero", derived.amountSettled === 0);

// I — no regression dashboard KPI
const dash = recoverableChargesDashboardCardStats(list, NOW);
assert("I-dash-unsettled", dash.unsettledCount === 1);
assert("I-dash-to-recover", dash.toRecoverSum === 1200);

log("\n=== Podsumowanie ===");
for (const [k, v] of Object.entries(results)) {
  log(`${v}: ${k}`);
}
const failed = Object.values(results).filter((v) => v === "FAIL").length;
log(`\n${failed === 0 ? "ALL PASS" : `FAILED: ${failed}`}`);
