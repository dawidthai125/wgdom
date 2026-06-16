/**
 * EM-P2.5 — Test Reports — testy.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-test-reports-p25.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import {
  assignRapForJob,
  createEmptyRegistryState,
  getRegistryEntryForJob,
} from "../src/lib/electrical-measurements/registry.ts";
import {
  buildMeasurementCatalogRows,
  filterMeasurementCatalogRows,
  MEASUREMENT_CATALOG_STATUS_LABELS,
} from "../src/lib/electrical-measurements/measurement-catalog.ts";
import {
  buildSingleRapZipBytes,
  createFsCatalogZipTemplateLoader,
} from "../src/lib/electrical-measurements/measurement-catalog-zip.ts";
import { generateEmDocxBytes, loadEmDocxTemplateBytesFromFs } from "../src/lib/electrical-measurements/generate-em-docx.ts";
import { measurementDocxFileNameForMeasurement } from "../src/lib/electrical-measurements/measurement-docx-names.ts";
import {
  createTestElectricalMeasurement,
  filterProductionMeasurements,
  isTestMeasurement,
  jobHasProductionMeasurement,
} from "../src/lib/electrical-measurements/test-report.ts";
import {
  createEmptyElectricalMeasurement,
  removeElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";
import { ensureRegistryWithMigration } from "../src/lib/electrical-measurements/registry.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const loader = createFsCatalogZipTemplateLoader(PUBLIC_DIR);

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

const JOB = "job-p25";
const JOBS = [{ id: JOB, address: "Testowa 1", flatNumber: "2" }];

console.log("=== P25-T01 create test report ===");
{
  let measurements = [];
  const created = createTestElectricalMeasurement(JOB, measurements);
  measurements = [created];
  assert(isTestMeasurement(created), "P25-T01 flags.test");
  assert(created.reportNumber === "TEST-RAP-001", "P25-T01 numer TEST-RAP-001");
  const second = createTestElectricalMeasurement(JOB, measurements);
  assert(second.reportNumber === "TEST-RAP-002", "P25-T02 kolejny TEST-RAP-002");
}

console.log("\n=== P25-T02 brak wpisu registry ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  const test = createTestElectricalMeasurement(JOB, []);
  const measurements = [test];
  reg = ensureRegistryWithMigration(reg, measurements);
  assert(getRegistryEntryForJob(reg, JOB) == null, "P25-T02 brak registry dla testu");
}

console.log("\n=== P25-T03 delete test — bez registry ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  const test = createTestElectricalMeasurement(JOB, []);
  let measurements = [test];
  measurements = removeElectricalMeasurement(measurements, test.id);
  assert(measurements.length === 0, "P25-T03 usunięty");
  assert(getRegistryEntryForJob(reg, JOB) == null, "P25-T03 registry bez zmian");
}

console.log("\n=== P25-T04 produkcyjny po teście = RAP-45-2026 ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  let measurements = [createTestElectricalMeasurement(JOB, [])];
  measurements = removeElectricalMeasurement(measurements, measurements[0].id);
  const assigned = assignRapForJob(reg, JOB, { now: new Date("2026-06-16T10:00:00Z") });
  reg = assigned.registry;
  const prod = createEmptyElectricalMeasurement(JOB, assigned.entry.rapNumber);
  measurements = [prod];
  assert(assigned.entry.rapNumber === "RAP-45-2026", "P25-T04 RAP-45-2026");
  assert(!isTestMeasurement(prod), "P25-T04 produkcyjny");
  assert(getRegistryEntryForJob(reg, JOB)?.rapNumber === "RAP-45-2026", "P25-T04 registry wpis");
}

console.log("\n=== P25-T05 katalog + filtr TESTOWY ===");
{
  let reg = createEmptyRegistryState();
  const test = createTestElectricalMeasurement(JOB, []);
  const prod = createEmptyElectricalMeasurement(JOB, "RAP-45-2026");
  const rows = buildMeasurementCatalogRows([test, prod], reg, JOBS);
  assert(rows.some((r) => r.status === "TEST"), "P25-T05 status TEST");
  assert(MEASUREMENT_CATALOG_STATUS_LABELS.TEST === "TESTOWY", "P25-T05 label");
  const filtered = filterMeasurementCatalogRows(rows, { status: "TEST" });
  assert(filtered.length === 1 && filtered[0].rapNumber === "TEST-RAP-001", "P25-T05 filtr TEST");
}

console.log("\n=== P25-T06 DOCX test naming ===");
{
  const test = createTestElectricalMeasurement(JOB, []);
  const name = measurementDocxFileNameForMeasurement(test, "protokol");
  assert(name === "TEST-RAP-001-PROTOKOL.docx", "P25-T06 PROTOKOL");
  const dane = measurementDocxFileNameForMeasurement(test, "dane-informacyjne");
  assert(dane === "TEST-RAP-001-DANE.docx", "P25-T06 DANE");
  const bytes = await generateEmDocxBytes("protokol", { measurement: test, job: JOBS[0] }, undefined, (k) =>
    loadEmDocxTemplateBytesFromFs(k, PUBLIC_DIR),
  );
  assert(bytes.length > 1000, "P25-T06 DOCX bytes");
}

console.log("\n=== P25-T07 ZIP test ===");
{
  const test = createTestElectricalMeasurement(JOB, []);
  const rows = buildMeasurementCatalogRows([test], createEmptyRegistryState(), JOBS);
  const bytes = await buildSingleRapZipBytes(rows[0], JOBS[0], loader);
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  assert(names.length === 5, "P25-T07 pięć plików");
  assert(names.includes("TEST-RAP-001-PROTOKOL.docx"), "P25-T07 ZIP protokol");
}

console.log("\n=== P25-T08 jobHasProductionMeasurement ===");
{
  const test = createTestElectricalMeasurement(JOB, []);
  assert(!jobHasProductionMeasurement([test], JOB), "P25-T08 tylko test");
  const prod = createEmptyElectricalMeasurement(JOB, "RAP-45-2026");
  assert(jobHasProductionMeasurement([test, prod], JOB), "P25-T08 z produkcyjnym");
  assert(filterProductionMeasurements([test, prod]).length === 1, "P25-T08 filter production");
}

console.log(`\n=== EM-P2.5: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
