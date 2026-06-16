/**
 * EM-P1.6B — RAP Registry Baseline Repair — testy.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-registry-p16b.mjs
 */
import {
  assignRapForJob,
  createEmptyRegistryState,
  formatRapNumber,
  getMaxSequenceForYear,
} from "../src/lib/electrical-measurements/registry.ts";
import {
  applyRapRegistryBaselineRepairP16B,
  collectRapRegistryTestJobIds,
  getBaselineSequenceForYear,
  isRapRegistryTestJob,
  isTestRapNumber,
  measurementsHaveTestRapNumbers,
  nextRapSequencePreview,
  RAP_BASELINE_LAST_SEQUENCE_2026,
  RAP_BASELINE_REPAIR_VERSION,
  registryStateHasTestRapNumbers,
  TEST_RAP_NUMBERS_TO_PURGE,
} from "../src/lib/electrical-measurements/registry-baseline-repair.ts";
import { createEmptyElectricalMeasurement } from "../src/lib/electrical-measurements/report.ts";

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${msg}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${msg}`);
  }
}

const JOB_KLE = "job-kleczkowska-p16b";
const JOB_BRO = "job-brochow-p16b";
const JOB_REAL = "job-real-p16b";

const TEST_JOBS = [
  { id: JOB_KLE, address: "ul. Kleczkowska 26", flatNumber: "3" },
  { id: JOB_BRO, address: "Brochów", flatNumber: "m. Cyganka" },
  { id: JOB_REAL, address: "Inna 1", flatNumber: "2" },
];

console.log("=== P16B-T01 wykrywanie robot testowych ===");
{
  assert(isRapRegistryTestJob(TEST_JOBS[0]), "P16B-T01 Kleczkowska 26 m.3");
  assert(isRapRegistryTestJob(TEST_JOBS[1]), "P16B-T01 Brochów Cyganka");
  assert(!isRapRegistryTestJob(TEST_JOBS[2]), "P16B-T01 inna robota — nie test");
  const ids = collectRapRegistryTestJobIds(TEST_JOBS);
  assert(ids.has(JOB_KLE) && ids.has(JOB_BRO) && !ids.has(JOB_REAL), "P16B-T01 collect ids");
}

console.log("\n=== P16B-T02 numery testowe do usunięcia ===");
{
  for (const n of TEST_RAP_NUMBERS_TO_PURGE) {
    assert(isTestRapNumber(n), `P16B-T02 ${n} jest testowy`);
  }
  assert(!isTestRapNumber("RAP-45-2026"), "P16B-T02 RAP-45 nie jest testowy");
}

console.log("\n=== P16B-T03 naprawa — usuwa testy + baseline 44 ===");
{
  let state = createEmptyRegistryState();
  state = assignRapForJob(state, JOB_KLE, { now: new Date("2026-06-16T10:00:00Z") }).registry;
  state = assignRapForJob(state, JOB_BRO, { now: new Date("2026-06-16T10:01:00Z") }).registry;

  const measurements = [
    createEmptyElectricalMeasurement(JOB_KLE, "RAP-1-2026"),
    createEmptyElectricalMeasurement(JOB_BRO, "RAP-2-2026"),
    createEmptyElectricalMeasurement(JOB_REAL, "RAP-40-2026"),
  ];

  const repaired = applyRapRegistryBaselineRepairP16B(state, measurements, TEST_JOBS);
  assert(repaired.changed, "P16B-T03 changed");
  assert(repaired.state.repairVersion === RAP_BASELINE_REPAIR_VERSION, "P16B-T03 repairVersion");
  assert(
    getBaselineSequenceForYear(repaired.state, 2026) === RAP_BASELINE_LAST_SEQUENCE_2026,
    "P16B-T03 baseline lastNumber=44",
  );
  assert(!registryStateHasTestRapNumbers(repaired.state), "P16B-T03 brak RAP-1/2 w registry");
  assert(!measurementsHaveTestRapNumbers(repaired.measurements), "P16B-T03 brak RAP-1/2 w measurements");
  assert(repaired.measurements.length === 1, "P16B-T03 zostaje tylko raport nie-testowy");
  assert(repaired.measurements[0].jobId === JOB_REAL, "P16B-T03 zostaje JOB_REAL");
  assert(repaired.state.entries.length === 0, "P16B-T03 brak wpisów testowych w registry");
}

console.log("\n=== P16B-T04 idempotentność ===");
{
  let state = createEmptyRegistryState();
  state.baselineByYear = { "2026": 44 };
  state.repairVersion = RAP_BASELINE_REPAIR_VERSION;
  const measurements = [createEmptyElectricalMeasurement(JOB_REAL, "RAP-40-2026")];
  const again = applyRapRegistryBaselineRepairP16B(state, measurements, TEST_JOBS);
  assert(!again.changed, "P16B-T04 drugi raz — skip");
}

console.log("\n=== P16B-T05 nowy raport = RAP-45-2026 ===");
{
  let state = createEmptyRegistryState();
  state.baselineByYear = { "2026": 44 };
  state.repairVersion = RAP_BASELINE_REPAIR_VERSION;
  assert(nextRapSequencePreview(state, 2026) === 45, "P16B-T05 preview 45");
  const r45 = assignRapForJob(state, JOB_REAL, { now: new Date("2026-06-16T12:00:00Z") });
  assert(r45.entry.rapNumber === "RAP-45-2026", "P16B-T05 RAP-45-2026");
  assert(formatRapNumber(45, 2026) === "RAP-45-2026", "P16B-T05 format");
}

console.log("\n=== P16B-T06 kolejny raport = RAP-46-2026 ===");
{
  let state = createEmptyRegistryState();
  state.baselineByYear = { "2026": 44 };
  state.repairVersion = RAP_BASELINE_REPAIR_VERSION;
  state = assignRapForJob(state, JOB_REAL, { now: new Date("2026-06-16T12:00:00Z") }).registry;
  const r46 = assignRapForJob(state, "job-next-p16b", { now: new Date("2026-06-16T12:01:00Z") });
  assert(r46.entry.rapNumber === "RAP-46-2026", "P16B-T06 RAP-46-2026");
  assert(getMaxSequenceForYear(r46.registry, 2026) === 46, "P16B-T06 max seq 46");
}

console.log("\n=== P16B-T07 brak przypisania 45/46 do testowych robot ===");
{
  let state = createEmptyRegistryState();
  state.baselineByYear = { "2026": 44 };
  state.repairVersion = RAP_BASELINE_REPAIR_VERSION;
  const repaired = applyRapRegistryBaselineRepairP16B(state, [], TEST_JOBS);
  assert(!repaired.state.entries.some((e) => e.jobId === JOB_KLE), "P16B-T07 brak wpisu Kleczkowska");
  assert(!repaired.state.entries.some((e) => e.jobId === JOB_BRO), "P16B-T07 brak wpisu Brochów");
}

console.log(`\n=== P16B SUMMARY: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
