/**
 * Sprint 20.3A — Recoverable Charges Foundation
 * Uruchom: npx vite-node scripts/smoke-test-recoverable-charges-20.3a.mjs
 */
import {
  defaultRecoverableCharge,
  mergeRecoverableCharges,
  normalizeRecoverableCharges,
  filterRecoverableCharges,
  countOpenRecoverableCharges,
  openRecoverableChargesKpi,
  recoverableChargeSourceLabel,
  recoverableChargeSourceListLabel,
  validateRecoverableChargeDraft,
  isRecoverableChargeAmountValid,
} from "../src/lib/recoverable-charges.ts";

const results = {};
let stepLog = [];

function log(msg) {
  stepLog.push(msg);
  console.log(msg);
}

function assert(name, cond, detail = "") {
  results[name] = cond ? "PASS" : "FAIL";
  log(`${cond ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!cond) throw new Error(`FAIL: ${name}`);
}

function memStorage() {
  const map = new Map();
  return {
    getItem(k) {
      return map.has(k) ? map.get(k) : null;
    },
    setItem(k, v) {
      map.set(k, v);
    },
    removeItem(k) {
      map.delete(k);
    },
  };
}

log("=== Sprint 20.3A / 20.3A.1 — Recoverable Charges smoke ===\n");

// A — create + normalize
const created = defaultRecoverableCharge("Admin Test");
created.title = "Dopłata materiał";
created.description = "Farba dodatkowa poza kosztorysem";
created.amount = 1250.5;
created.sourceType = "standalone";
created.clientName = "Klient ABC";
created.responsibleInspector = "Szymon";
created.tags = ["materiał", "VO"];

const normalized = normalizeRecoverableCharges([created]);
assert("create-normalize", normalized.length === 1 && normalized[0].amount === 1250.5, `amount=${normalized[0]?.amount}`);

// B — edit (merge LWW by updatedAt)
const edited = { ...created, amount: 999, updatedAt: new Date(Date.now() + 1000).toISOString() };
const mergedEdit = mergeRecoverableCharges([created], [edited], []);
assert("edit-merge", mergedEdit[0].amount === 999, `merged amount=${mergedEdit[0].amount}`);

// C — delete (tombstone)
const deletedIds = [created.id];
const afterDelete = mergeRecoverableCharges([created, edited], [edited], deletedIds);
assert("delete-tombstone", afterDelete.length === 0, `count=${afterDelete.length}`);

// D — job source
const jobCharge = defaultRecoverableCharge("Admin");
jobCharge.sourceType = "job";
jobCharge.sourceJobId = "job-1";
jobCharge.clientName = "Firma X";
const jobsById = new Map([
  ["job-1", { id: "job-1", address: "ul. Testowa 1", flatNumber: "2", client: "Firma X" }],
]);
const srcLabel = recoverableChargeSourceLabel(jobCharge, jobsById);
assert("job-source-label", srcLabel.includes("Testowa") && srcLabel.includes("Firma X"), srcLabel);

// E — search + filter + sort
const list = normalizeRecoverableCharges([
  { ...defaultRecoverableCharge(), id: "a", title: "Alpha", status: "open", amount: 100, createdAt: "2026-06-01T10:00:00.000Z", clientName: "A" },
  { ...defaultRecoverableCharge(), id: "b", title: "Beta materiał", status: "settled", amount: 500, createdAt: "2026-06-02T10:00:00.000Z", clientName: "B" },
  { ...defaultRecoverableCharge(), id: "c", title: "Gamma", status: "partial", amount: 50, createdAt: "2026-06-03T10:00:00.000Z", responsibleInspector: "Kamil" },
]);

const searched = filterRecoverableCharges(list, {
  search: "materiał",
  status: "all",
  sourceType: "all",
  sort: "date",
  sortDir: "desc",
});
assert("search", searched.length === 1 && searched[0].id === "b", `ids=${searched.map((x) => x.id).join(",")}`);

const filtered = filterRecoverableCharges(list, {
  search: "",
  status: "open",
  sourceType: "all",
  sort: "amount",
  sortDir: "desc",
});
assert("filter-status", filtered.length === 1 && filtered[0].id === "a");

const inspectorSearch = filterRecoverableCharges(list, {
  search: "kamil",
  status: "all",
  sourceType: "all",
  sort: "date",
  sortDir: "desc",
});
assert("search-inspector", inspectorSearch.length === 1 && inspectorSearch[0].id === "c");

assert("count-open", countOpenRecoverableCharges(list) === 1, String(countOpenRecoverableCharges(list)));

const kpi = openRecoverableChargesKpi(list);
assert("kpi-open-only", kpi.count === 1 && kpi.sum === 100, `count=${kpi.count} sum=${kpi.sum}`);

const shortSrc = recoverableChargeSourceListLabel(jobCharge, jobsById);
assert("source-list-label", shortSrc === "Firma X", shortSrc);

// H — validation 20.3A.1
assert("validate-amount-zero", !validateRecoverableChargeDraft({
  title: "Test",
  description: "",
  amount: 0,
  sourceType: "standalone",
  sourceJobId: "",
}).ok);

assert("validate-amount-negative", !isRecoverableChargeAmountValid(-10));

const negDraft = validateRecoverableChargeDraft({
  title: "Test",
  description: "Opis",
  amount: -50,
  sourceType: "standalone",
  sourceJobId: "",
});
assert("validate-amount-negative-draft", !negDraft.ok && negDraft.error === "invalid_amount");

const jobMissing = validateRecoverableChargeDraft({
  title: "Test",
  description: "Opis",
  amount: 100,
  sourceType: "job",
  sourceJobId: "",
});
assert("validate-job-required", !jobMissing.ok && jobMissing.error === "missing_job");

const validDraft = validateRecoverableChargeDraft({
  title: "",
  description: "Naprawa bramy",
  amount: 420,
  sourceType: "job",
  sourceJobId: "job-1",
});
assert("validate-ok", validDraft.ok);

// F — persistence (localStorage round-trip)
const storage = memStorage();
const payload = [created, jobCharge];
storage.setItem("kw-recoverable-charges", JSON.stringify(payload));
const raw = storage.getItem("kw-recoverable-charges");
const roundTrip = normalizeRecoverableCharges(JSON.parse(raw));
assert("persistence", roundTrip.length === 2 && roundTrip[0].title === created.title);

// G — cloud merge union
const local = [created];
const cloud = [{ ...jobCharge, updatedAt: new Date().toISOString() }];
const union = mergeRecoverableCharges(local, cloud, []);
assert("merge-union", union.length === 2, `count=${union.length}`);

const passCount = Object.values(results).filter((v) => v === "PASS").length;
const failCount = Object.values(results).filter((v) => v === "FAIL").length;
log(`\n=== SUMMARY: ${passCount} PASS, ${failCount} FAIL ===`);
if (failCount > 0) process.exit(1);
