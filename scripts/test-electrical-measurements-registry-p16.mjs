/**
 * EM-P1.6 — Measurement Registry & RAP numbering — testy.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-registry-p16.mjs
 */
import {
  assignRapForJob,
  allocateFirstRapForYear,
  cancelRegistryForJob,
  formatRapNumber,
  getMaxSequenceForYear,
  getRegistryEntryForJob,
  mergeElectricalMeasurementRegistry,
  migrateRegistryFromMeasurements,
  parseRapNumber,
  registryNeedsMigrationFromMeasurements,
} from "../src/lib/electrical-measurements/registry.ts";
import {
  createEmptyElectricalMeasurement,
  removeElectricalMeasurement,
  touchElectricalMeasurement,
  upsertElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";
import { normalizeElectricalMeasurementRegistry } from "../src/lib/electrical-measurements/registry.ts";

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

const JOB_A = "job-a-p16";
const JOB_B = "job-b-p16";

console.log("=== P16-T01 format / parse RAP ===");
{
  assert(formatRapNumber(45, 2026) === "RAP-45-2026", "P16-T01 format");
  const p = parseRapNumber("RAP-44-2026");
  assert(p?.sequence === 44 && p?.year === 2026, "P16-T01 parse");
}

console.log("\n=== P16-T02 pierwszy RAP dla roboty ===");
{
  let reg = [];
  const r1 = assignRapForJob(reg, JOB_A, { now: new Date("2026-06-16T10:00:00Z") });
  reg = r1.registry;
  assert(r1.entry.rapNumber.startsWith("RAP-") && r1.entry.rapNumber.endsWith("-2026"), "P16-T02 RAP rok 2026");
  assert(r1.entry.status === "ACTIVE", "P16-T02 ACTIVE");
}

console.log("\n=== P16-T03 kolejny RAP — inna robota ===");
{
  let reg = [];
  const a = assignRapForJob(reg, JOB_A, { now: new Date("2026-06-16T10:00:00Z") });
  reg = a.registry;
  const seqA = a.entry.sequence;
  const b = assignRapForJob(reg, JOB_B, { now: new Date("2026-06-16T10:01:00Z") });
  assert(b.entry.sequence === seqA + 1, "P16-T03 kolejny numer sekwencji");
}

console.log("\n=== P16-T04 reset roczny ===");
{
  let reg = [];
  const y2026 = assignRapForJob(reg, JOB_A, { now: new Date("2026-12-31T10:00:00Z") });
  reg = y2026.registry;
  const y2027 = assignRapForJob(reg, JOB_B, { now: new Date("2027-01-02T10:00:00Z") });
  assert(y2027.entry.year === 2027, "P16-T04 rok 2027");
  assert(y2027.entry.sequence === 1, "P16-T04 RAP-1-2027");
  assert(y2027.entry.rapNumber === "RAP-1-2027", "P16-T04 format RAP-1-2027");
}

console.log("\n=== P16-T05 ponowne utworzenie — ten sam RAP ===");
{
  let reg = [];
  const first = assignRapForJob(reg, JOB_A, { now: new Date("2026-06-16T10:00:00Z") });
  reg = first.registry;
  const rap = first.entry.rapNumber;
  reg = cancelRegistryForJob(reg, JOB_A);
  assert(getRegistryEntryForJob(reg, JOB_A)?.status === "CANCELLED", "P16-T05 CANCELLED po usunięciu");
  const again = assignRapForJob(reg, JOB_A, { now: new Date("2026-06-16T11:00:00Z") });
  assert(again.entry.rapNumber === rap, "P16-T05 ten sam RAP po recreate");
  assert(again.entry.status === "ACTIVE", "P16-T05 ACTIVE po recreate");
  assert(getMaxSequenceForYear(again.registry, 2026) === first.entry.sequence, "P16-T05 brak nowego numeru w puli");
}

console.log("\n=== P16-T06 smoke A/B — delete + recreate ===");
{
  let reg = [];
  let measurements = [];
  const createFor = (jobId) => {
    const { registry, entry } = assignRapForJob(reg, jobId, { now: new Date("2026-06-16T12:00:00Z") });
    reg = registry;
    const m = createEmptyElectricalMeasurement(jobId, entry.rapNumber);
    measurements = upsertElectricalMeasurement(measurements, m);
    return { m, entry };
  };

  const jobA = createFor(JOB_A);
  const rapA = jobA.entry.rapNumber;
  measurements = removeElectricalMeasurement(measurements, jobA.m.id);
  reg = cancelRegistryForJob(reg, JOB_A);
  const jobA2 = createFor(JOB_A);
  assert(jobA2.entry.rapNumber === rapA, "P16-T06 robota A — ten sam RAP");

  const jobB = createFor(JOB_B);
  const seqB = parseRapNumber(jobB.entry.rapNumber)?.sequence ?? 0;
  const seqA = parseRapNumber(rapA)?.sequence ?? 0;
  assert(seqB === seqA + 1, "P16-T06 robota B — następny RAP");
}

console.log("\n=== P16-T07 migracja legacy ===");
{
  const legacy = touchElectricalMeasurement(createEmptyElectricalMeasurement(JOB_A, "RAP-44-2026"), {
    reportNumber: "RAP-44-2026",
  });
  const migrated = migrateRegistryFromMeasurements([], [legacy]);
  assert(migrated.length === 1, "P16-T07 jeden wpis");
  assert(migrated[0].rapNumber === "RAP-44-2026", "P16-T07 RAP-44-2026");
  assert(migrated[0].jobId === JOB_A, "P16-T07 jobId");
  assert(registryNeedsMigrationFromMeasurements([], [legacy]), "P16-T07 needs migration");
  assert(!registryNeedsMigrationFromMeasurements(migrated, [legacy]), "P16-T07 po migracji OK");
}

console.log("\n=== P16-T08 merge sync ===");
{
  const local = [
    {
      jobId: JOB_A,
      rapNumber: "RAP-45-2026",
      year: 2026,
      sequence: 45,
      assignedAt: "2026-06-16T10:00:00.000Z",
      status: "ACTIVE",
    },
  ];
  const cloud = [
    {
      jobId: JOB_B,
      rapNumber: "RAP-46-2026",
      year: 2026,
      sequence: 46,
      assignedAt: "2026-06-16T11:00:00.000Z",
      status: "ACTIVE",
    },
  ];
  const merged = mergeElectricalMeasurementRegistry(local, cloud);
  assert(merged.length === 2, "P16-T08 merge 2 wpisy");
  assert(getMaxSequenceForYear(merged, 2026) === 46, "P16-T08 max seq po merge");
}

console.log("\n=== P16-T09 checklist — registry bez nowego numeru ===");
{
  let reg = [];
  const assigned = assignRapForJob(reg, JOB_A, { now: new Date("2026-06-16T10:00:00Z") });
  reg = assigned.registry;
  reg = cancelRegistryForJob(reg, JOB_A);
  const entry = getRegistryEntryForJob(reg, JOB_A);
  assert(entry?.status === "CANCELLED", "P16-T09 anulowany wpis zostaje");
  const recreated = assignRapForJob(reg, JOB_A);
  assert(recreated.entry.rapNumber === assigned.entry.rapNumber, "P16-T09 recreate używa istniejącego RAP");
}

console.log("\n=== P16-T10 normalize roundtrip ===");
{
  const raw = normalizeElectricalMeasurementRegistry([
    { jobId: JOB_A, rapNumber: "RAP-12-2026", assignedAt: "2026-01-01", status: "ACTIVE" },
    { jobId: "", rapNumber: "invalid" },
  ]);
  assert(raw.length === 1 && raw[0].sequence === 12, "P16-T10 normalize");
}

console.log(`\n=== EM-P1.6: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
