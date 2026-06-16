/**
 * EM-P3 — WM Druk Measurement Integration — testy.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-integration-p3.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import {
  assignRapForJob,
  cancelRegistryForJob,
  createEmptyRegistryState,
} from "../src/lib/electrical-measurements/registry.ts";
import {
  getProductionMeasurementForJob,
  hasActiveProductionMeasurementForJob,
} from "../src/lib/electrical-measurements/measurement-catalog.ts";
import { measurementDocxFileNameForMeasurement } from "../src/lib/electrical-measurements/measurement-docx-names.ts";
import { EM_DOCX_DOCUMENT_KINDS } from "../src/lib/electrical-measurements/generate-em-docx.ts";
import { createFsCatalogZipTemplateLoader } from "../src/lib/electrical-measurements/measurement-catalog-zip.ts";
import {
  createTestElectricalMeasurement,
  isTestMeasurement,
} from "../src/lib/electrical-measurements/test-report.ts";
import {
  createEmptyElectricalMeasurement,
  touchElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";
import {
  buildWmPrintDeliveryZipBytes,
  buildWmPrintFilesForJob,
  WM_PRINT_ZIP_FOLDER_ODBIORY,
  WM_PRINT_ZIP_FOLDER_POMIARY,
} from "../src/lib/wm-print/generate-zip.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const emLoader = createFsCatalogZipTemplateLoader(PUBLIC_DIR);

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

const JOB = "job-p3-int";
const job = { id: JOB, address: "ul. Kleczkowska 26", flatNumber: "3" };

const wmTemplate = {
  id: "tpl-static",
  name: "TestDoc",
  kind: "generated",
  type: "pdf",
  enabled: true,
  sortOrder: 10,
  files: [
    {
      id: "f1",
      storagePath: "p1",
      storageUrl: "https://example.com/odbiory.pdf",
      originalFileName: "odbiory.pdf",
      sortOrder: 10,
      uploadedAt: "2026-06-16T00:00:00Z",
    },
  ],
  createdAt: "2026-06-16T00:00:00Z",
  updatedAt: "2026-06-16T00:00:00Z",
};

const wmSettings = { defaultCity: "Wrocław", zipNameSuffix: "ODBIOR_WM" };
const wmOpts = { dateMode: "today" };
const fetchBytes = async () => new TextEncoder().encode("%PDF-1.4 mock");

function makeProdReport(rapNumber) {
  return touchElectricalMeasurement(createEmptyElectricalMeasurement(JOB, rapNumber), {
    reportNumber: rapNumber,
    measurementDate: "2026-06-16",
    technicianName: "Dawid Thai Thanh",
  });
}

async function zipPaths(bytes) {
  const zip = await JSZip.loadAsync(bytes);
  return Object.keys(zip.files).filter((n) => !zip.files[n].dir);
}

console.log("=== P3-T01 lookup aktywny RAP ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  const assigned = assignRapForJob(reg, JOB, { now: new Date("2026-06-16T10:00:00Z") });
  reg = assigned.registry;
  const prod = makeProdReport("RAP-45-2026");
  const found = getProductionMeasurementForJob([prod], reg, JOB);
  assert(found?.reportNumber === "RAP-45-2026", "P3-T01 aktywny RAP");
  assert(hasActiveProductionMeasurementForJob([prod], reg, JOB), "P3-T01 hasActive");
}

console.log("\n=== P3-T02 TEST-RAP ignorowany ===");
{
  let reg = createEmptyRegistryState();
  const test = createTestElectricalMeasurement(JOB, []);
  assert(isTestMeasurement(test), "P3-T02 flags.test");
  const found = getProductionMeasurementForJob([test], reg, JOB);
  assert(found === null, "P3-T02 brak lookup dla TEST-RAP");
}

console.log("\n=== P3-T03 brak RAP ===");
{
  const reg = createEmptyRegistryState();
  assert(getProductionMeasurementForJob([], reg, JOB) === null, "P3-T03 brak pomiarów");
}

console.log("\n=== P3-T04 ANULOWANY registry ===");
{
  let reg = createEmptyRegistryState();
  reg = assignRapForJob(reg, JOB).registry;
  reg = cancelRegistryForJob(reg, JOB);
  const prod = makeProdReport("RAP-45-2026");
  assert(getProductionMeasurementForJob([prod], reg, JOB) === null, "P3-T04 anulowany pominięty");
}

console.log("\n=== P3-T05 scenariusz A — RAP + ZIP odbiorowy ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  reg = assignRapForJob(reg, JOB).registry;
  const prod = makeProdReport("RAP-45-2026");
  const { bytes, odbiorCount, pomiaryCount } = await buildWmPrintDeliveryZipBytes(
    job,
    [wmTemplate],
    [],
    wmSettings,
    wmOpts,
    [wmTemplate.id],
    fetchBytes,
    {
      includeMeasurements: true,
      measurements: [prod],
      registry: reg,
      measurementTemplateLoader: emLoader,
    },
  );
  assert(odbiorCount === 1, "P3-T05 jeden plik odbiorowy");
  assert(pomiaryCount === 5, "P3-T05 pięć DOCX pomiarów");
  const paths = await zipPaths(bytes);
  assert(paths.some((p) => p.startsWith(`${WM_PRINT_ZIP_FOLDER_ODBIORY}/`)), "P3-T05 folder Odbiory");
  assert(paths.some((p) => p.startsWith(`${WM_PRINT_ZIP_FOLDER_POMIARY}/`)), "P3-T05 folder Pomiary");
  for (const kind of EM_DOCX_DOCUMENT_KINDS) {
    const name = measurementDocxFileNameForMeasurement(prod, kind);
    assert(paths.includes(`${WM_PRINT_ZIP_FOLDER_POMIARY}/${name}`), `P3-T05 ${name}`);
  }
}

console.log("\n=== P3-T06 scenariusz B — tylko TEST-RAP ===");
{
  const reg = createEmptyRegistryState();
  const test = createTestElectricalMeasurement(JOB, []);
  const { bytes, pomiaryCount } = await buildWmPrintDeliveryZipBytes(
    job,
    [wmTemplate],
    [],
    wmSettings,
    wmOpts,
    [wmTemplate.id],
    fetchBytes,
    {
      includeMeasurements: true,
      measurements: [test],
      registry: reg,
      measurementTemplateLoader: emLoader,
    },
  );
  assert(pomiaryCount === 0, "P3-T06 zero pomiarów przy TEST-RAP");
  const paths = await zipPaths(bytes);
  assert(!paths.some((p) => p.includes(WM_PRINT_ZIP_FOLDER_POMIARY)), "P3-T06 brak folderu Pomiary");
  assert(paths.some((p) => p.startsWith(`${WM_PRINT_ZIP_FOLDER_ODBIORY}/`)), "P3-T06 tylko Odbiory");
}

console.log("\n=== P3-T07 scenariusz C — brak pomiarów ===");
{
  const reg = createEmptyRegistryState();
  const { bytes, pomiaryCount } = await buildWmPrintDeliveryZipBytes(
    job,
    [wmTemplate],
    [],
    wmSettings,
    wmOpts,
    [wmTemplate.id],
    fetchBytes,
    { includeMeasurements: true, measurements: [], registry: reg },
  );
  assert(pomiaryCount === 0, "P3-T07 brak pomiarów");
  const paths = await zipPaths(bytes);
  assert(!paths.some((p) => p.includes(WM_PRINT_ZIP_FOLDER_POMIARY)), "P3-T07 brak Pomiary");
}

console.log("\n=== P3-T08 checkbox OFF — brak Pomiary mimo RAP ===");
{
  let reg = createEmptyRegistryState();
  reg = assignRapForJob(reg, JOB).registry;
  const prod = makeProdReport("RAP-45-2026");
  const { pomiaryCount } = await buildWmPrintDeliveryZipBytes(
    job,
    [wmTemplate],
    [],
    wmSettings,
    wmOpts,
    [wmTemplate.id],
    fetchBytes,
    { includeMeasurements: false, measurements: [prod], registry: reg },
  );
  assert(pomiaryCount === 0, "P3-T08 includeMeasurements false");
}

console.log("\n=== P3-T09 regresja buildWmPrintFilesForJob ===");
{
  const files = await buildWmPrintFilesForJob(job, [wmTemplate], [], wmSettings, wmOpts, [wmTemplate.id], fetchBytes);
  assert(files.length === 1, "P3-T09 WM Druk files bez zmian");
  assert(!files[0].fileName.includes("/"), "P3-T09 płaska lista plików (API bez zmian)");
}

console.log(`\n=== EM-P3: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
