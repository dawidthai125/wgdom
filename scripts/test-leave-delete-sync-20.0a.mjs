/**
 * Sprint 20.0A — DELETE leave + sync simulation
 * Uruchom: npx vite-node scripts/test-leave-delete-sync-20.0a.mjs
 */
import {
  mergeEmployeeLeaves,
  normalizeEmployeeLeaves,
} from "../src/lib/employee-leaves.ts";

const leave = {
  id: "leave-del-test",
  employeeId: "emp-1",
  leaveType: "vacation",
  weekStart: "2026-06-08",
  weekEnd: "2026-06-13",
  createdAt: "2026-06-01T10:00:00Z",
  updatedAt: "2026-06-01T10:00:00Z",
};

console.log("=== CREATE ===");
let local = [leave];
let cloud = [];
console.log(`  local count: ${local.length}, cloud count: ${cloud.length}`);

console.log("\n=== DELETE (local only, bez tombstone) ===");
local = [];
const mergeWithoutTombstone = mergeEmployeeLeaves(local, [leave], []);
console.log(`  merge bez tombstone → count: ${mergeWithoutTombstone.length} (oczekiwane: 1 = BUG)`);

console.log("\n=== DELETE + tombstone ===");
const deletedIds = ["leave-del-test"];
local = [];
cloud = [leave];
const mergeWithTombstone = mergeEmployeeLeaves(local, cloud, deletedIds);
console.log(`  local count: ${local.length}`);
console.log(`  cloud count: ${cloud.length}`);
console.log(`  merge z tombstone → count: ${mergeWithTombstone.length} (oczekiwane: 0)`);
console.log(`  ids po merge: ${mergeWithTombstone.map((l) => l.id).join(", ") || "(brak)"}`);

console.log("\n=== SYNC / RELOAD (cloud nadal ma stary wpis) ===");
const afterReload = mergeEmployeeLeaves(local, cloud, deletedIds);
const pass =
  local.length === 0 &&
  mergeWithTombstone.length === 0 &&
  afterReload.length === 0 &&
  !afterReload.some((l) => l.id === "leave-del-test") &&
  mergeWithoutTombstone.length === 1;

console.log(`  po reload merge count: ${afterReload.length}`);

console.log("\n=== push payload symulacja ===");
const pushPayload = normalizeEmployeeLeaves(local);
console.log(`  push payload count: ${pushPayload.length}`);
console.log(`  tombstone zawiera id: ${deletedIds.includes("leave-del-test")}`);

console.log("\n=== RAPORT ===");
const checks = [
  ["DELETE bez tombstone odtwarza (regresja znana)", mergeWithoutTombstone.length === 1],
  ["DELETE + tombstone → local pusty", local.length === 0],
  ["merge nie odtwarza wpisu", afterReload.length === 0],
  ["push payload bez rekordu", pushPayload.length === 0],
  ["tombstone zapisany", deletedIds.includes("leave-del-test")],
];
let fail = 0;
for (const [name, ok] of checks) {
  console.log(`  ${name}: ${ok ? "PASS" : "FAIL"}`);
  if (!ok && !name.includes("regresja")) fail += 1;
}
console.log(`\nWYNIK: ${fail === 0 ? "PASS" : "FAIL"}`);
process.exit(fail ? 1 : 0);
