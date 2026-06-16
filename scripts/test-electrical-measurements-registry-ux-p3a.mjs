/**
 * EM-P3A — Measurement Registry UX — testy.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-registry-ux-p3a.mjs
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
  buildMeasurementCatalogRows,
  buildRapRegistryRows,
  catalogZipFolderName,
  filterMeasurementCatalogRows,
  filterRapRegistryRows,
  jobScopeLabel,
  matchesRapSearchQuery,
} from "../src/lib/electrical-measurements/measurement-catalog.ts";
import {
  buildSingleRapZipBytes,
  catalogSingleZipDownloadName,
  createFsCatalogZipTemplateLoader,
} from "../src/lib/electrical-measurements/measurement-catalog-zip.ts";
import {
  catalogAddressSlug,
  measurementZipDownloadName,
} from "../src/lib/electrical-measurements/measurement-docx-names.ts";
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

const JOB_A = "job-p3a-a";
const JOB_B = "job-p3a-b";

const JOBS = [
  {
    id: JOB_A,
    address: "ul. Kleczkowska 26",
    flatNumber: "3",
    notes: "Wymiana WLZ + rozdzielnia",
    client: "WM",
  },
  {
    id: JOB_B,
    address: "Brochów",
    flatNumber: "m. Cyganka",
    notes: "",
    client: "WM Klient",
  },
];

function makeReport(jobId, rapNumber, date) {
  return touchElectricalMeasurement(createEmptyElectricalMeasurement(jobId, rapNumber), {
    reportNumber: rapNumber,
    measurementDate: date,
    technicianName: "Dawid Thai Thanh",
    meterModel: "Sonel MPI-520",
    meterSerialNumber: "722453",
  });
}

console.log("=== P3A-T01 ZIP naming with address ===");
{
  const addr = "ul. Kleczkowska 26 m.3";
  const slug = catalogAddressSlug(addr);
  assert(slug.includes("Kleczkowska"), "P3A-T01 slug Kleczkowska");
  const zipName = measurementZipDownloadName("RAP-45-2026", addr);
  assert(zipName === `RAP-45-2026_${slug}.zip`, "P3A-T01 RAP-45-2026_ADRES.zip");
  assert(
    catalogSingleZipDownloadName("RAP-45-2026", addr) === zipName,
    "P3A-T01 catalogSingleZipDownloadName",
  );
  assert(
    catalogZipFolderName("RAP-45-2026", addr) === `RAP-45-2026_${slug}`,
    "P3A-T01 folder name",
  );
}

console.log("\n=== P3A-T02 ZIP bytes + address in download name ===");
{
  const m = makeReport(JOB_A, "RAP-45-2026", "2026-06-16");
  const row = buildMeasurementCatalogRows([m], createEmptyRegistryState(), JOBS)[0];
  assert(row.address.includes("Kleczkowska"), "P3A-T02 adres w wierszu");
  const bytes = await buildSingleRapZipBytes(row, JOBS[0], loader);
  const zip = await JSZip.loadAsync(bytes);
  assert(Object.keys(zip.files).filter((n) => !zip.files[n].dir).length === 5, "P3A-T02 pięć DOCX");
  const dl = catalogSingleZipDownloadName(row.rapNumber, row.address);
  assert(dl.includes("Kleczkowska"), "P3A-T02 nazwa ZIP z adresem");
}

console.log("\n=== P3A-T03 kolumna robota (jobName) ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  reg = assignRapForJob(reg, JOB_A).registry;
  const m = makeReport(JOB_A, "RAP-45-2026", "2026-06-16");
  const row = buildMeasurementCatalogRows([m], reg, JOBS)[0];
  assert(row.jobName === "Wymiana WLZ + rozdzielnia", "P3A-T03 jobName z notes");
  assert(jobScopeLabel(JOBS[1]) === "WM Klient", "P3A-T03 fallback client");
}

console.log("\n=== P3A-T04 wyszukiwanie RAP ===");
{
  assert(matchesRapSearchQuery("RAP-45-2026", 45, 2026, "45"), "P3A-T04 szukaj 45");
  assert(matchesRapSearchQuery("RAP-45-2026", 45, 2026, "RAP-45"), "P3A-T04 RAP-45");
  assert(matchesRapSearchQuery("RAP-45-2026", 45, 2026, "RAP-45-2026"), "P3A-T04 pełny numer");
  assert(!matchesRapSearchQuery("RAP-45-2026", 45, 2026, "46"), "P3A-T04 brak 46");
}

console.log("\n=== P3A-T05 filtry katalogu ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  reg = assignRapForJob(reg, JOB_A).registry;
  reg = assignRapForJob(reg, JOB_B).registry;
  const measurements = [
    makeReport(JOB_A, "RAP-45-2026", "2026-06-16"),
    makeReport(JOB_B, "RAP-46-2026", "2026-06-17"),
  ];
  const rows = buildMeasurementCatalogRows(measurements, reg, JOBS);
  const byRap = filterMeasurementCatalogRows(rows, { rapQuery: "RAP-45" });
  assert(byRap.length === 1 && byRap[0].rapNumber === "RAP-45-2026", "P3A-T05 filtr RAP");
  const byAddr = filterMeasurementCatalogRows(rows, { addressQuery: "broch" });
  assert(byAddr.length === 1, "P3A-T05 filtr adres");
  const byJob = filterMeasurementCatalogRows(rows, { jobQuery: "WLZ" });
  assert(byJob.length === 1 && byJob[0].jobId === JOB_A, "P3A-T05 filtr robota");
}

console.log("\n=== P3A-T06 rejestr RAP ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  reg = assignRapForJob(reg, JOB_A, { now: new Date("2026-06-16T10:00:00Z") }).registry;
  reg = assignRapForJob(reg, JOB_B).registry;
  reg = cancelRegistryForJob(reg, JOB_B);
  const measurements = [makeReport(JOB_A, "RAP-45-2026", "2026-06-16")];
  const regRows = buildRapRegistryRows(reg, measurements, JOBS);
  assert(regRows.length === 2, "P3A-T06 dwa wpisy registry");
  const active = regRows.find((r) => r.rapNumber === "RAP-45-2026");
  assert(active?.status === "ACTIVE", "P3A-T06 ACTIVE");
  assert(active?.jobName.includes("WLZ"), "P3A-T06 robota w rejestrze");
  assert(active?.date === "2026-06-16", "P3A-T06 data pomiaru");
  const cancelled = regRows.find((r) => r.jobId === JOB_B);
  assert(cancelled?.status === "CANCELLED", "P3A-T06 ANULOWANY");
}

console.log("\n=== P3A-T07 filtry rejestru ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  reg = assignRapForJob(reg, JOB_A).registry;
  reg = assignRapForJob(reg, JOB_B).registry;
  const measurements = [
    makeReport(JOB_A, "RAP-45-2026", "2026-06-16"),
    makeReport(JOB_B, "RAP-46-2026", "2026-06-17"),
  ];
  const rows = buildRapRegistryRows(reg, measurements, JOBS);
  const filtered = filterRapRegistryRows(rows, { rapQuery: "46", status: "ACTIVE" });
  assert(filtered.length === 1 && filtered[0].jobId === JOB_B, "P3A-T07 filtr RAP+status");
}

console.log("\n=== P3A-T08 deep-link jobId (model) ===");
{
  const m = makeReport(JOB_A, "RAP-45-2026", "2026-06-16");
  const row = buildMeasurementCatalogRows([m], createEmptyRegistryState(), JOBS)[0];
  assert(row.jobId === JOB_A, "P3A-T08 jobId do nawigacji");
}

console.log("\n=== P3A-T09 kompatybilność registry ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  const a = assignRapForJob(reg, JOB_A, { now: new Date("2026-06-16T10:00:00Z") });
  reg = a.registry;
  const m = makeReport(JOB_A, a.entry.rapNumber, "2026-06-16");
  const cat = buildMeasurementCatalogRows([m], reg, JOBS)[0];
  const regRow = buildRapRegistryRows(reg, [m], JOBS)[0];
  assert(cat.rapNumber === regRow.rapNumber, "P3A-T09 spójność RAP");
  assert(regRow.sequence === 45, "P3A-T09 seq 45");
}

console.log(`\n=== EM-P3A: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
