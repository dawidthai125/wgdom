/**
 * WM-SCHEMATY-V1 Faza 1C — import EM → schemat.
 * Uruchom: npx vite-node scripts/test-schematic-import-from-measurement.mjs
 */
import { parseElectricalMeasurement } from "../src/lib/electrical-measurements/normalize.ts";
import {
  importSchematicFromMeasurement,
  isTestSchematic,
} from "../src/lib/electrical-schematics/import-from-measurement.ts";

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

const BASE_MEASUREMENT = {
  id: "em-1",
  jobId: "job-1",
  reportNumber: "RAP-45-2026",
  measurementDate: "2026-06-20",
  technicianName: "Dawid Thai Thanh",
  meterModel: "Sonel MPI-520",
  meterSerialNumber: "722453",
  supplyType: "ydy-5x4",
  circuits: [
    {
      id: "c-em-1",
      type: "socket-3f",
      breakerType: "B",
      displayName: "Kuchenka Elektryczna",
      sortOrder: 2,
    },
    {
      id: "c-em-2",
      type: "socket-1f",
      breakerType: "B",
      displayName: "GN 230V Salon",
      sortOrder: 3,
    },
    {
      id: "c-em-3",
      type: "lighting-1f",
      breakerType: "B",
      displayName: "OŚWIETLENIE",
      sortOrder: 4,
    },
  ],
  rcds: [{ id: "rcd-1", symbol: "ΔI", deviceType: "P302" }],
  valueSet: {
    v: 1,
    seed: "secret",
    generatedAt: "2026-06-20T10:00:00.000Z",
    adscSupply: {
      zs: "0.5",
      za: "1",
      inAmps: "16",
      iaAmps: "2",
      breakerType: "B",
      breakerLabel: "S301",
      assessment: "POZYTYWNA",
    },
    adscByCircuitId: {},
    resistanceSupply: {
      l1l2: "1",
      l2l3: "1",
      l1l3: "1",
      l1l2Alt: "1",
      l1pe: "1",
      l2pe: "1",
      l3pe: "1",
      l1n: "1",
      l2n: "1",
      l3n: "1",
      npe: "1",
      ra: "1",
      uIso: "500",
      assessment: "Pozytywna",
    },
    resistanceByCircuitId: {},
    rcdByRcdId: {},
  },
  createdAt: "2026-06-20T10:00:00.000Z",
  updatedAt: "2026-06-20T10:00:00.000Z",
};

console.log("=== I01 — import ydy-5x4 → apartment-3f ===");
{
  const m = parseElectricalMeasurement(BASE_MEASUREMENT);
  assert(Boolean(m), "I01 parse measurement");
  const d = importSchematicFromMeasurement(m, { address: "WROCŁAW, TEST 1/2" });
  assert(d.layoutProfile === "apartment-3f-v1", "I01 layout 3f");
  assert(d.supply.phase === "3f", "I01 supply 3f");
  assert(d.supply.mainCableLabel === "YDYp 5x4mm²", "I01 cable 5x4");
  assert(d.linkStatus === "linked" && d.sourceMeasurementId === "em-1", "I01 linked");
  assert(d.sourceMeasurementRef === "RAP-45-2026", "I01 RAP ref");
  assert(d.status === "draft", "I01 draft");
  assert(d.jobId === "job-1", "I01 jobId");
}

console.log("\n=== I02 — circuits mapping + preset inference ===");
{
  const m = parseElectricalMeasurement(BASE_MEASUREMENT);
  const d = importSchematicFromMeasurement(m);
  assert(d.circuits.length === 3, "I02 three circuits");
  assert(d.circuits[0].presetId === "electric-stove-3p", "I02 stove preset");
  assert(d.circuits[0].name === "Kuchenka Elektryczna", "I02 stove name");
  assert(d.circuits[1].presetId === "socket-230v", "I02 socket preset");
  assert(d.circuits[1].name === "GN 230V Salon", "I02 salon name");
  assert(d.circuits[2].presetId === "lighting", "I02 lighting preset");
  assert(d.circuits[0].sortOrder === 1, "I02 renumbered sortOrder");
}

console.log("\n=== I03 — mainRcd from rcds[0] ===");
{
  const m = parseElectricalMeasurement(BASE_MEASUREMENT);
  const d = importSchematicFromMeasurement(m);
  assert(d.mainRcd.symbol === "ΔI", "I03 rcd symbol");
  assert(d.mainRcd.sensitivityMa === 30, "I03 30mA");
  assert(d.mainRcd.poles === 4, "I03 4P");
  assert(d.mainRcd.rcdType === "AC", "I03 AC");
}

console.log("\n=== I04 — ydy-3x4 → apartment-1f ===");
{
  const m = parseElectricalMeasurement({ ...BASE_MEASUREMENT, supplyType: "ydy-3x4" });
  const d = importSchematicFromMeasurement(m);
  assert(d.layoutProfile === "apartment-1f-v1", "I04 layout 1f");
  assert(d.supply.mainCableLabel === "YDYp 3x4mm²", "I04 cable 3x4");
  assert(d.mainRcd.poles === 2, "I04 RCD 2P");
}

console.log("\n=== I05 — no valueSet / technician leak ===");
{
  const m = parseElectricalMeasurement(BASE_MEASUREMENT);
  const d = importSchematicFromMeasurement(m);
  const json = JSON.stringify(d);
  assert(!json.includes("valueSet"), "I05 no valueSet");
  assert(!json.includes("722453"), "I05 no meter serial");
  assert(!json.includes("Sonel MPI-520"), "I05 no meter model");
  assert(!json.includes("Dawid Thai Thanh"), "I05 no technician");
}

console.log("\n=== I06 — TEST-RAP → draft + flags.test ===");
{
  const m = parseElectricalMeasurement({
    ...BASE_MEASUREMENT,
    reportNumber: "TEST-RAP-001",
    flags: { test: true },
  });
  const d = importSchematicFromMeasurement(m);
  assert(d.status === "draft", "I06 draft");
  assert(d.flags?.test === true, "I06 flags.test");
  assert(isTestSchematic(d), "I06 isTestSchematic");
}

console.log(`\n=== WYNIK: ${passed} PASS / ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
