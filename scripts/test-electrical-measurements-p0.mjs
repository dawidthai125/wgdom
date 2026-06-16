/**
 * EM-P0 — Pomiary elektryczne — testy rdzenia lib.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-p0.mjs
 */
import { normalizeElectricalMeasurements } from "../src/lib/electrical-measurements/normalize.ts";
import {
  filterElectricalMeasurementsForJob,
  mergeElectricalMeasurements,
  serializeElectricalMeasurementsForStorage,
} from "../src/lib/electrical-measurements/merge.ts";
import { buildElectricalMeasurementPreview } from "../src/lib/electrical-measurements/preview.ts";
import {
  addElectricalMeasurementCircuit,
  addElectricalMeasurementRcd,
  createEmptyElectricalMeasurement,
  removeElectricalMeasurementCircuit,
  removeElectricalMeasurementRcd,
  touchElectricalMeasurement,
  upsertElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";
import { EM_DOCUMENT_COUNT } from "../src/lib/electrical-measurements/types.ts";

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

const JOB_A = "job-a";
const JOB_B = "job-b";

console.log("=== T01 normalize ===");
assert(normalizeElectricalMeasurements(null).length === 0, "T01 null → []");
assert(
  normalizeElectricalMeasurements([{ id: "x", jobId: JOB_A }, { foo: 1 }]).length === 1,
  "T01 odrzuca śmieci",
);

console.log("\n=== T02 create + update ===");
let m1 = createEmptyElectricalMeasurement(JOB_A);
m1 = touchElectricalMeasurement(m1, {
  reportNumber: "RAP-12-2026",
  technicianName: "Jan Kowalski",
  meterModel: "Fluke 1654B",
  meterSerialNumber: "SN-001",
});
assert(m1.reportNumber === "RAP-12-2026", "T02 reportNumber");
assert(m1.technicianName === "Jan Kowalski", "T02 technicianName");
assert(m1.meterModel === "Fluke 1654B", "T02 meterModel");
assert(m1.measurementDate.length === 10, "T02 measurementDate ISO date");

console.log("\n=== T03 multiple reports per job ===");
const m2 = touchElectricalMeasurement(createEmptyElectricalMeasurement(JOB_A), {
  reportNumber: "RAP-03-2028",
});
let store = upsertElectricalMeasurement([], m1);
store = upsertElectricalMeasurement(store, m2);
const forJob = filterElectricalMeasurementsForJob(store, JOB_A);
assert(forJob.length === 2, "T03 dwa raporty na jedną robotę");
assert(forJob.every((r) => r.jobId === JOB_A), "T03 oba mają ten sam jobId");
assert(filterElectricalMeasurementsForJob(store, JOB_B).length === 0, "T03 inna robota pusta");

console.log("\n=== T04 circuits ===");
let withCircuit = addElectricalMeasurementCircuit(m1, "socket-1f", "B");
withCircuit = addElectricalMeasurementCircuit(withCircuit, "lighting-1f", "C");
assert(withCircuit.circuits.length === 2, "T04 dwa obwody");
withCircuit = removeElectricalMeasurementCircuit(withCircuit, withCircuit.circuits[0].id);
assert(withCircuit.circuits.length === 1, "T04 delete circuit");

console.log("\n=== T05 RCD ===");
let withRcd = addElectricalMeasurementRcd(withCircuit, "P302");
withRcd = addElectricalMeasurementRcd(withRcd, "P304");
assert(withRcd.rcds.length === 2, "T05 dwa RCD");
assert(withRcd.rcds[0].symbol === "RCD1", "T05 auto symbol RCD1");
withRcd = removeElectricalMeasurementRcd(withRcd, withRcd.rcds[0].id);
assert(withRcd.rcds.length === 1, "T05 delete RCD");

console.log("\n=== T06 merge ===");
const localNewer = touchElectricalMeasurement(withRcd, { reportNumber: "LOKALNY" });
const local = [localNewer];
const cloud = [
  {
    ...withRcd,
    reportNumber: "CHMURA",
    updatedAt: "2020-01-01T00:00:00.000Z",
  },
];
const merged = mergeElectricalMeasurements(local, cloud);
assert(merged[0]?.reportNumber === "LOKALNY", "T06 newer updatedAt wins");
const mergedCloudWins = mergeElectricalMeasurements(
  [{ ...withRcd, reportNumber: "STARY", updatedAt: "2020-01-01T00:00:00.000Z" }],
  [{ ...withRcd, reportNumber: "NOWY", updatedAt: "2026-06-16T12:00:00.000Z" }],
);
assert(mergedCloudWins[0]?.reportNumber === "NOWY", "T06 cloud newer wins");

console.log("\n=== T07 preview ===");
const previewBase = touchElectricalMeasurement(
  addElectricalMeasurementRcd(
    addElectricalMeasurementCircuit(
      addElectricalMeasurementCircuit(createEmptyElectricalMeasurement(JOB_A), "socket-1f", "B"),
      "socket-3f",
      "C",
    ),
    "P302",
  ),
  { supplyType: "ydy-5x4" },
);
const preview = buildElectricalMeasurementPreview(previewBase);
assert(preview.summary.documentCount === EM_DOCUMENT_COUNT, "T07 documentCount = 5");
assert(preview.summary.circuitCount === 2, "T07 circuitCount");
assert(preview.summary.rcdCount === 1, "T07 rcdCount");
assert(preview.adscLines[0] === "1. Zasilanie", "T07 ADSC zasilanie");
assert(preview.adscLines.some((l) => l.includes("400V")), "T07 ADSC 400V");
assert(preview.resistanceLines[0].includes("5x4"), "T07 rezystancja zasilanie");
assert(preview.rcdLines[0] === "RCD1 → P302", "T07 RCD line");

console.log("\n=== T08 persistence roundtrip ===");
const persisted = serializeElectricalMeasurementsForStorage(store);
const reloaded = normalizeElectricalMeasurements(JSON.parse(JSON.stringify(persisted)));
assert(reloaded.length === store.length, "T08 reload count");
assert(reloaded.some((r) => r.reportNumber === "RAP-12-2026"), "T08 reload m1");
assert(reloaded.some((r) => r.reportNumber === "RAP-03-2028"), "T08 reload m2");

console.log(`\n=== WYNIK: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
