/**
 * SYNC-ARCH-01 RC-B — TOMBSTONE CONFIRMATION (READ ONLY)
 * Run: npx vite-node scripts/audit-rcb-tombstone-confirmation-readonly.mjs
 */
import { defaultDay } from "../src/app/app-domain.ts";
import {
  mergeAllDataKeys,
  sanitizeWeekEmployeesForTargetRange,
  DATA_KEYS,
  addDeletedWeekEmployeeKey,
  getDeletedWeekEmployeeKeys,
  filterDeletedWeekEmployees,
  deletedWeekEmployeeMergeKeySet,
} from "../src/lib/cloud-sync.ts";
import { weekEmployeeMergeKey } from "../src/lib/payroll-week-employee-merge.ts";

const ls = {};
globalThis.localStorage = {
  getItem: (k) => (k in ls ? ls[k] : null),
  setItem: (k, v) => { ls[k] = String(v); },
  removeItem: (k) => { delete ls[k]; },
  clear: () => { Object.keys(ls).forEach((k) => delete ls[k]); },
};

const DAYS = ["Pn", "Wt", "Sr", "Cz", "Pt", "So"];
const defaultDays = () => Object.fromEntries(DAYS.map((k) => [k, defaultDay()]));
const makeEmp = (id, dirId, name) => ({
  id,
  directoryId: dirId,
  name,
  days: defaultDays(),
  prevSaturday: defaultDay(),
  extraCosts: [],
  settled: false,
});

const W = { from: "2026-06-30", to: "2026-07-05" };
const existing = Array.from({ length: 10 }, (_, i) => makeEmp(`e${i}`, `dir-${i}`, `Emp ${i}`));
const newEmp = makeEmp("e-new", "dir-new", "Nowy Pracownik");
const cloudRoster = existing;
const localRoster = [...existing, newEmp];

addDeletedWeekEmployeeKey(W.from, W.to, newEmp);
const tombstones = getDeletedWeekEmployeeKeys();
const tombSet = deletedWeekEmployeeMergeKeySet(tombstones, W.from, W.to);

const empIdx = DATA_KEYS.indexOf("kw-week-employees");

const localValues = DATA_KEYS.map((k) => {
  if (k === "kw-week-employees") return localRoster;
  if (k === "kw-weekFrom") return W.from;
  if (k === "kw-weekTo") return W.to;
  if (k === "kw-archive") return [];
  return null;
});
const cloudValues = DATA_KEYS.map((k) => {
  if (k === "kw-week-employees") return cloudRoster;
  if (k === "kw-weekFrom") return W.from;
  if (k === "kw-weekTo") return W.to;
  if (k === "kw-archive") return [];
  return null;
});

const merged = mergeAllDataKeys(localValues, cloudValues);
const mergeCount = merged[empIdx].length;

const localFiltered = filterDeletedWeekEmployees(localRoster, tombSet);
const cloudFiltered = filterDeletedWeekEmployees(cloudRoster, tombSet);

const sanitized = sanitizeWeekEmployeesForTargetRange(merged, localValues, cloudValues);
const sanitizeCount = sanitized[empIdx].length;

console.log("=== RC-B TOMBSTONE CONFIRMATION (deterministic) ===\n");
console.log("mergeAllDataKeys count:", mergeCount);
console.log("filterDeletedWeekEmployees local:", localRoster.length, "->", localFiltered.length);
console.log("filterDeletedWeekEmployees cloud:", cloudRoster.length, "->", cloudFiltered.length);
console.log("tombstoneSet:", [...tombSet]);
console.log("newEmp mergeKey:", weekEmployeeMergeKey(newEmp));
console.log("sanitize afterCount:", sanitizeCount);
console.log("newEmp present after sanitize:", sanitized[empIdx].some(
  (e) => weekEmployeeMergeKey(e) === weekEmployeeMergeKey(newEmp),
));

const filterDropped = localFiltered.length < localRoster.length || cloudFiltered.length < cloudRoster.length;
console.log("\nWERDYKT filterDeletedWeekEmployees zmniejszył count?", filterDropped ? "TAK" : "NIE");
if (filterDropped) {
  console.log("line: cloud-sync.ts:631");
  console.log("directoryId:", newEmp.directoryId);
  console.log("mergeKey:", weekEmployeeMergeKey(newEmp));
  console.log("tombstone entry:", tombstones.find((t) => t.includes(weekEmployeeMergeKey(newEmp))));
}
