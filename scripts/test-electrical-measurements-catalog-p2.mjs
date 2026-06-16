/**
 * EM-P2 — Katalog Pomiarów — testy.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-catalog-p2.mjs
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
  buildCatalogIndexTxt,
  buildMeasurementCatalogRows,
  catalogAvailableYears,
  catalogIndexLine,
  catalogZipFolderName,
  filterMeasurementCatalogRows,
  MEASUREMENT_CATALOG_STATUS_LABELS,
  resolveMeasurementCatalogStatus,
} from "../src/lib/electrical-measurements/measurement-catalog.ts";
import {
  buildMultiRapArchiveZipBytes,
  buildSingleRapZipBytes,
  catalogDocxFileName,
  catalogMultiZipDownloadName,
  catalogSingleZipDownloadName,
  createFsCatalogZipTemplateLoader,
} from "../src/lib/electrical-measurements/measurement-catalog-zip.ts";
import { EM_DOCX_DOCUMENT_KINDS } from "../src/lib/electrical-measurements/generate-em-docx.ts";
import {
  createEmptyElectricalMeasurement,
  touchElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";

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

const JOB_A = "job-cat-a";
const JOB_B = "job-cat-b";
const JOB_C = "job-cat-c";

const JOBS = [
  { id: JOB_A, address: "ul. Kleczkowska 26", flatNumber: "3" },
  { id: JOB_B, address: "Brochów", flatNumber: "m. Cyganka" },
  { id: JOB_C, address: "Testowa 1", flatNumber: "2" },
];

function makeReport(jobId, rapNumber, date, tech = "Dawid Thai Thanh") {
  return touchElectricalMeasurement(createEmptyElectricalMeasurement(jobId, rapNumber), {
    reportNumber: rapNumber,
    measurementDate: date,
    technicianName: tech,
    meterModel: "Sonel MPI-520",
    meterSerialNumber: "722453",
  });
}

console.log("=== P2-T01 lista raportów ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  const r45 = assignRapForJob(reg, JOB_A, { now: new Date("2026-06-16T10:00:00Z") });
  reg = r45.registry;
  const r46 = assignRapForJob(reg, JOB_B, { now: new Date("2026-06-17T10:00:00Z") });
  reg = r46.registry;

  const measurements = [
    makeReport(JOB_A, "RAP-45-2026", "2026-06-16"),
    makeReport(JOB_B, "RAP-46-2026", "2026-06-17"),
  ];

  const rows = buildMeasurementCatalogRows(measurements, reg, JOBS);
  assert(rows.length === 2, "P2-T01 dwa raporty");
  assert(rows[0].rapNumber === "RAP-46-2026", "P2-T01 sort desc seq");
  assert(rows.some((r) => r.address.includes("Kleczkowska")), "P2-T01 adres A");
  assert(rows.every((r) => r.status === "ACTIVE"), "P2-T01 ACTIVE");
}

console.log("\n=== P2-T02 filtry ===");
{
  let reg = createEmptyRegistryState();
  const measurements = [
    makeReport(JOB_A, "RAP-45-2026", "2026-06-16"),
    makeReport(JOB_B, "RAP-46-2026", "2026-06-17"),
  ];
  reg = assignRapForJob(reg, JOB_A).registry;
  reg = assignRapForJob(reg, JOB_B).registry;
  const rows = buildMeasurementCatalogRows(measurements, reg, JOBS);

  const byYear = filterMeasurementCatalogRows(rows, { year: "2026" });
  assert(byYear.length === 2, "P2-T02 filtr rok");

  const byRap = filterMeasurementCatalogRows(rows, { rapQuery: "45" });
  assert(byRap.length === 1 && byRap[0].rapNumber === "RAP-45-2026", "P2-T02 filtr RAP");

  const byAddr = filterMeasurementCatalogRows(rows, { addressQuery: "broch" });
  assert(byAddr.length === 1, "P2-T02 filtr adres");

  const byStatus = filterMeasurementCatalogRows(rows, { status: "ACTIVE" });
  assert(byStatus.length === 2, "P2-T02 filtr ACTIVE");

  assert(catalogAvailableYears(rows).includes(2026), "P2-T02 lata");
}

console.log("\n=== P2-T03 szczegóły + status ANULOWANY ===");
{
  let reg = createEmptyRegistryState();
  reg = assignRapForJob(reg, JOB_C, { now: new Date("2026-06-18T10:00:00Z") }).registry;
  reg = cancelRegistryForJob(reg, JOB_C);
  const measurements = [];
  const rows = buildMeasurementCatalogRows(measurements, reg, JOBS);
  assert(rows.length === 1, "P2-T03 anulowany wpis registry");
  assert(rows[0].status === "CANCELLED", "P2-T03 ANULOWANY");
  assert(rows[0].measurement === null, "P2-T03 brak raportu");
  assert(MEASUREMENT_CATALOG_STATUS_LABELS.CANCELLED === "ANULOWANY", "P2-T03 label");
}

console.log("\n=== P2-T04 status TEST prep ===");
{
  const m = touchElectricalMeasurement(createEmptyElectricalMeasurement(JOB_A, "RAP-99-2026"), {
    flags: { test: true },
  });
  assert(resolveMeasurementCatalogStatus(m, "ACTIVE") === "TEST", "P2-T04 TESTOWY");
  assert(MEASUREMENT_CATALOG_STATUS_LABELS.TEST === "TESTOWY", "P2-T04 label TEST");
}

console.log("\n=== P2-T05 ZIP pojedynczy ===");
{
  const m = makeReport(JOB_A, "RAP-45-2026", "2026-06-16");
  const row = buildMeasurementCatalogRows([m], createEmptyRegistryState(), JOBS)[0];
  const job = JOBS[0];
  const bytes = await buildSingleRapZipBytes(row, job, loader);
  const zip = await JSZip.loadAsync(bytes);
  const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
  assert(names.length === 7, "P2-T05 pięć DOCX + INDEX-POMIARY txt/csv");
  assert(names.includes("RAP-45-2026-PROTOKOL.docx"), "P2-T05 PROTOKOL");
  assert(names.includes("RAP-45-2026-RCD.docx"), "P2-T05 RCD");
  assert(names.includes("INDEX-POMIARY.txt"), "P2-T05 INDEX-POMIARY.txt");
  assert(names.includes("INDEX-POMIARY.csv"), "P2-T05 INDEX-POMIARY.csv");
  assert(catalogSingleZipDownloadName("RAP-45-2026", row.address).includes("Kleczkowska"), "P2-T05 nazwa ZIP z adresem");
}

console.log("\n=== P2-T06 ZIP wielokrotny + INDEX ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  reg = assignRapForJob(reg, JOB_A).registry;
  reg = assignRapForJob(reg, JOB_B).registry;
  reg = assignRapForJob(reg, "job-extra").registry;

  const measurements = [
    makeReport(JOB_A, "RAP-45-2026", "2026-06-16"),
    makeReport(JOB_B, "RAP-46-2026", "2026-06-17"),
    makeReport("job-extra", "RAP-47-2026", "2026-06-18"),
  ];
  const rows = buildMeasurementCatalogRows(measurements, reg, [
    ...JOBS,
    { id: "job-extra", address: "Extra 5", flatNumber: "1" },
  ]);
  const selected = rows.filter((r) => ["RAP-45-2026", "RAP-46-2026"].includes(r.rapNumber));
  const bytes = await buildMultiRapArchiveZipBytes(selected, JOBS, loader);
  const zip = await JSZip.loadAsync(bytes);

  assert(zip.file("INDEX.txt") != null, "P2-T06 INDEX.txt");
  const index = await zip.file("INDEX.txt").async("string");
  assert(index.includes("RAP-45-2026"), "P2-T06 INDEX RAP-45");
  assert(index.includes("RAP-46-2026"), "P2-T06 INDEX RAP-46");
  assert(!index.includes("RAP-47-2026"), "P2-T06 INDEX bez RAP-47");

  const row45 = selected.find((r) => r.rapNumber === "RAP-45-2026");
  const row46 = selected.find((r) => r.rapNumber === "RAP-46-2026");
  const folderA = catalogZipFolderName("RAP-45-2026", row45?.address ?? "");
  assert(zip.file(`${folderA}/RAP-45-2026-PROTOKOL.docx`) != null, "P2-T06 folder A protokol");
  const folderB = catalogZipFolderName("RAP-46-2026", row46?.address ?? "");
  assert(zip.file(`${folderB}/RAP-46-2026-ADSC.docx`) != null, "P2-T06 folder B ADSC");
  assert(catalogMultiZipDownloadName(new Date("2026-06-16T12:00:00Z")) === "Pomiary-WGDOM-2026-06-16.zip", "P2-T06 nazwa archiwum");
}

console.log("\n=== P2-T07 struktura nazw DOCX ===");
{
  for (const kind of EM_DOCX_DOCUMENT_KINDS) {
    const name = catalogDocxFileName("RAP-45-2026", kind);
    assert(name.startsWith("RAP-45-2026-"), `P2-T07 prefix ${kind}`);
    assert(name.endsWith(".docx"), `P2-T07 ext ${kind}`);
  }
}

console.log("\n=== P2-T08 kompatybilność RAP registry ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  const a = assignRapForJob(reg, JOB_A, { now: new Date("2026-06-16T10:00:00Z") });
  reg = a.registry;
  const m = makeReport(JOB_A, a.entry.rapNumber, "2026-06-16");
  const rows = buildMeasurementCatalogRows([m], reg, JOBS);
  assert(rows[0].rapNumber === "RAP-45-2026", "P2-T08 RAP z registry");
  assert(rows[0].status === "ACTIVE", "P2-T08 ACTIVE");
}

console.log("\n=== P2-T09 INDEX line format ===");
{
  const line = catalogIndexLine({
    rapNumber: "RAP-45-2026",
    address: "Kleczkowska 26 m.3",
    measurementDate: "2026-06-16",
  });
  assert(line === "RAP-45-2026 | Kleczkowska 26 m.3 | 2026-06-16", "P2-T09 format linii");
  const index = buildCatalogIndexTxt([
    {
      id: "1",
      rapNumber: "RAP-45-2026",
      year: 2026,
      sequence: 45,
      measurementDate: "2026-06-16",
      address: "A",
      jobName: "A",
      jobTitle: "A",
      jobId: JOB_A,
      technicianName: "",
      meterModel: "",
      meterSerialNumber: "",
      status: "ACTIVE",
      measurement: null,
    },
  ]);
  assert(index.trim().startsWith("RAP-45-2026"), "P2-T09 INDEX build");
}

console.log(`\n=== EM-P2: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
