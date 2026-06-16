/**
 * EM-P1.6C — Registry Repair V2 — testy.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-registry-repair-v2.mjs
 */
import {
  assignRapForJob,
  createEmptyRegistryState,
  formatRapNumber,
} from "../src/lib/electrical-measurements/registry.ts";
import {
  applyRapRegistryBaselineRepairP16C,
  collectCyganNowowiejRepairJobIds,
  getBaselineSequenceForYear,
  isCyganNowowiejRepairJob,
  measurementsHaveTestRapNumbers,
  nextRapSequencePreview,
  RAP_BASELINE_LAST_SEQUENCE_2026,
  RAP_BASELINE_REPAIR_VERSION,
  registryStateHasTestRapNumbers,
} from "../src/lib/electrical-measurements/registry-baseline-repair.ts";
import { buildMeasurementCatalogRows, buildRapRegistryRows } from "../src/lib/electrical-measurements/measurement-catalog.ts";
import { createEmptyElectricalMeasurement } from "../src/lib/electrical-measurements/report.ts";
import { applyRapRegistryBaselineRepairP16B } from "../src/lib/electrical-measurements/registry-baseline-repair.ts";

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

const JOB_BRO = "8a752b0d-2236-44cb-9100-f3f25a95ba76";
const JOB_CYGAN = "6a9319ac-6bae-49ff-9504-79527a7e692e";
const JOB_REAL = "job-real-p16c";

const PROD_JOBS = [
  { id: JOB_BRO, address: "Brochow m.Cyganka", flatNumber: "Cyganka" },
  { id: JOB_CYGAN, address: "Cygan Nowowiej", flatNumber: "" },
  { id: JOB_REAL, address: "Produkcyjna 1", flatNumber: "2" },
];

/** Stan wejściowy z audytu P0-EM-REGISTRY-AUDIT */
function prodAuditInput() {
  const state = createEmptyRegistryState();
  const measurements = [
    createEmptyElectricalMeasurement(JOB_BRO, "RAP-2-2026"),
    { ...createEmptyElectricalMeasurement(JOB_CYGAN, ""), reportNumber: "" },
  ];
  return { state, measurements };
}

console.log("=== P16C-T01 wykrywanie Cygan Nowowiej ===");
{
  assert(isCyganNowowiejRepairJob(PROD_JOBS[1]), "P16C-T01 Cygan Nowowiej");
  assert(!isCyganNowowiejRepairJob(PROD_JOBS[2]), "P16C-T01 inna robota — nie Cygan");
  const ids = collectCyganNowowiejRepairJobIds(PROD_JOBS);
  assert(ids.has(JOB_CYGAN) && !ids.has(JOB_REAL), "P16C-T01 collect Cygan ids");
}

console.log("\n=== P16C-T02 naprawa prod — usuwa RAP-2 i pusty Cygan ===");
{
  const { state, measurements } = prodAuditInput();
  const repaired = applyRapRegistryBaselineRepairP16C(state, measurements, PROD_JOBS);
  assert(repaired.changed, "P16C-T02 changed");
  assert(repaired.measurements.length === 0, "P16C-T02 measurements puste");
  assert(!measurementsHaveTestRapNumbers(repaired.measurements), "P16C-T02 brak RAP-2");
  assert(
    !repaired.measurements.some((m) => m.jobId === JOB_BRO),
    "P16C-T02 brak Brochów",
  );
  assert(
    !repaired.measurements.some((m) => m.jobId === JOB_CYGAN),
    "P16C-T02 brak Cygan",
  );
}

console.log("\n=== P16C-T03 registry baseline 44 + repairVersion 2 ===");
{
  const { state, measurements } = prodAuditInput();
  const repaired = applyRapRegistryBaselineRepairP16C(state, measurements, PROD_JOBS);
  assert(repaired.state.repairVersion === RAP_BASELINE_REPAIR_VERSION, "P16C-T03 repairVersion=2");
  assert(repaired.state.repairVersion === 2, "P16C-T03 repairVersion literal 2");
  assert(
    getBaselineSequenceForYear(repaired.state, 2026) === RAP_BASELINE_LAST_SEQUENCE_2026,
    "P16C-T03 baseline=44",
  );
  assert(repaired.state.entries.length === 0, "P16C-T03 registry entries puste");
  assert(!registryStateHasTestRapNumbers(repaired.state), "P16C-T03 brak test RAP w registry");
}

console.log("\n=== P16C-T04 nextRap = RAP-45-2026 (symulacja) ===");
{
  const { state, measurements } = prodAuditInput();
  const repaired = applyRapRegistryBaselineRepairP16C(state, measurements, PROD_JOBS);
  assert(nextRapSequencePreview(repaired.state, 2026) === 45, "P16C-T04 preview seq 45");
  const { entry } = assignRapForJob(repaired.state, JOB_REAL, { now: new Date("2026-06-16T18:00:00Z") });
  assert(entry.rapNumber === "RAP-45-2026", "P16C-T04 RAP-45-2026");
  assert(formatRapNumber(45, 2026) === "RAP-45-2026", "P16C-T04 format");
}

console.log("\n=== P16C-T05 katalog i rejestr puste po repair ===");
{
  const { state, measurements } = prodAuditInput();
  const repaired = applyRapRegistryBaselineRepairP16C(state, measurements, PROD_JOBS);
  const catalog = buildMeasurementCatalogRows(repaired.measurements, repaired.state, PROD_JOBS);
  const registryRows = buildRapRegistryRows(repaired.state, repaired.measurements, PROD_JOBS);
  assert(catalog.length === 0, "P16C-T05 katalog 0 raportów");
  assert(registryRows.length === 0, "P16C-T05 rejestr 0 wpisów");
}

console.log("\n=== P16C-T06 idempotentność repairVersion >= 2 ===");
{
  let state = createEmptyRegistryState();
  state.baselineByYear = { "2026": 44 };
  state.repairVersion = RAP_BASELINE_REPAIR_VERSION;
  const measurements = [createEmptyElectricalMeasurement(JOB_REAL, "RAP-45-2026")];
  const again = applyRapRegistryBaselineRepairP16C(state, measurements, PROD_JOBS);
  assert(!again.changed, "P16C-T06 drugi raz — skip");
  assert(again.measurements.length === 1, "P16C-T06 measurements nietknięte");
}

console.log("\n=== P16C-T07 upgrade z repairVersion 1 (P1.6B częściowy) ===");
{
  const { state, measurements } = prodAuditInput();
  state.repairVersion = 1;
  state.baselineByYear = { "2026": 44 };
  const repaired = applyRapRegistryBaselineRepairP16C(state, measurements, PROD_JOBS);
  assert(repaired.changed, "P16C-T07 v1→v2 changed");
  assert(repaired.state.repairVersion === 2, "P16C-T07 repairVersion=2");
  assert(repaired.measurements.length === 0, "P16C-T07 measurements wyczyszczone");
}

console.log("\n=== P16C-T08 regresja P1.6B — funkcja P16B nadal działa ===");
{
  const JOB_KLE = "job-kle-p16c";
  const jobs = [
    { id: JOB_KLE, address: "Kleczkowska 26", flatNumber: "3" },
    { id: JOB_BRO, address: "Brochów", flatNumber: "Cyganka" },
    { id: JOB_REAL, address: "Inna", flatNumber: "1" },
  ];
  let state = createEmptyRegistryState();
  const measurements = [
    createEmptyElectricalMeasurement(JOB_KLE, "RAP-1-2026"),
    createEmptyElectricalMeasurement(JOB_BRO, "RAP-2-2026"),
    createEmptyElectricalMeasurement(JOB_REAL, "RAP-40-2026"),
  ];
  const repaired = applyRapRegistryBaselineRepairP16B(state, measurements, jobs);
  assert(repaired.measurements.length === 1, "P16C-T08 P16B zostaje 1 raport produkcyjny");
  assert(repaired.measurements[0].jobId === JOB_REAL, "P16C-T08 P16B JOB_REAL");
}

console.log(`\n=== P16C SUMMARY: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
