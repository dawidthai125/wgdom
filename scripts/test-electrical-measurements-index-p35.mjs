/**
 * EM-P3.5 — Measurement Index Export — testy.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-index-p35.mjs
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";
import {
  assignRapForJob,
  createEmptyRegistryState,
} from "../src/lib/electrical-measurements/registry.ts";
import {
  buildMeasurementCatalogRows,
  MEASUREMENT_CATALOG_STATUS_LABELS,
} from "../src/lib/electrical-measurements/measurement-catalog.ts";
import {
  buildMultiRapArchiveZipBytes,
  buildSingleRapZipBytes,
  createFsCatalogZipTemplateLoader,
} from "../src/lib/electrical-measurements/measurement-catalog-zip.ts";
import {
  buildMeasurementIndexCsv,
  buildMeasurementIndexTxt,
  MEASUREMENT_INDEX_CSV_FILE,
  MEASUREMENT_INDEX_TXT_FILE,
  sortRowsForMeasurementIndex,
} from "../src/lib/electrical-measurements/measurement-index-export.ts";
import { createTestElectricalMeasurement } from "../src/lib/electrical-measurements/test-report.ts";
import {
  createEmptyElectricalMeasurement,
  touchElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";
import {
  buildWmPrintDeliveryZipBytes,
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

const JOB_A = "job-p35-a";
const JOB_B = "job-p35-b";
const JOB_T = "job-p35-t";

const JOBS = [
  { id: JOB_A, address: "ul. Kleczkowska 26", flatNumber: "3", notes: "WLZ", client: "WM" },
  { id: JOB_B, address: "Brochów", flatNumber: "m. Cyganka", notes: "", client: "WM" },
  { id: JOB_T, address: "Testowa 1", flatNumber: "2", notes: "", client: "WM" },
];

function makeReport(jobId, rapNumber, date) {
  return touchElectricalMeasurement(createEmptyElectricalMeasurement(jobId, rapNumber), {
    reportNumber: rapNumber,
    measurementDate: date,
    technicianName: "Dawid Thai Thanh",
  });
}

console.log("=== P35-T01 TXT export ===");
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
  const txt = buildMeasurementIndexTxt(rows);
  assert(txt.startsWith("WGDOM - REJESTR POMIARÓW"), "P35-T01 nagłówek");
  assert(txt.includes("RAP-46-2026"), "P35-T01 RAP-46");
  assert(txt.includes("RAP-45-2026"), "P35-T01 RAP-45");
  assert(txt.includes("Adres: ul. Kleczkowska 26 m.3"), "P35-T01 adres");
  assert(txt.includes("Status: AKTYWNY"), "P35-T01 status AKTYWNY");
  assert(txt.indexOf("RAP-46-2026") < txt.indexOf("RAP-45-2026"), "P35-T01 sort desc RAP");
}

console.log("\n=== P35-T02 CSV export ===");
{
  let reg = createEmptyRegistryState();
  reg = assignRapForJob(reg, JOB_A).registry;
  const measurements = [makeReport(JOB_A, "RAP-45-2026", "2026-06-16")];
  const rows = buildMeasurementCatalogRows(measurements, reg, JOBS);
  const csv = buildMeasurementIndexCsv(rows);
  assert(csv.startsWith("RAP;Data;Adres;Status"), "P35-T02 nagłówek CSV");
  assert(csv.includes("RAP-45-2026;2026-06-16;"), "P35-T02 wiersz RAP");
  assert(csv.includes(";AKTYWNY"), "P35-T02 status CSV");
}

console.log("\n=== P35-T03 status TESTOWY ===");
{
  const test = createTestElectricalMeasurement(JOB_T, []);
  const rows = buildMeasurementCatalogRows([test], createEmptyRegistryState(), JOBS);
  assert(rows[0].status === "TEST", "P35-T03 status TEST");
  const txt = buildMeasurementIndexTxt(rows);
  assert(txt.includes("Status: TESTOWY"), "P35-T03 label TESTOWY");
  assert(MEASUREMENT_CATALOG_STATUS_LABELS.TEST === "TESTOWY", "P35-T03 enum");
}

console.log("\n=== P35-T04 ZIP pojedynczy — INDEX ===");
{
  let reg = createEmptyRegistryState();
  reg = assignRapForJob(reg, JOB_A).registry;
  const m = makeReport(JOB_A, "RAP-45-2026", "2026-06-16");
  const row = buildMeasurementCatalogRows([m], reg, JOBS)[0];
  const bytes = await buildSingleRapZipBytes(row, JOBS[0], emLoader);
  const zip = await JSZip.loadAsync(bytes);
  assert(zip.file(MEASUREMENT_INDEX_TXT_FILE) != null, "P35-T04 INDEX-POMIARY.txt");
  assert(zip.file(MEASUREMENT_INDEX_CSV_FILE) != null, "P35-T04 INDEX-POMIARY.csv");
  const txt = await zip.file(MEASUREMENT_INDEX_TXT_FILE).async("string");
  assert(txt.includes("RAP-45-2026"), "P35-T04 txt zawiera RAP");
}

console.log("\n=== P35-T05 ZIP wielokrotny — INDEX + TEST ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  reg = assignRapForJob(reg, JOB_A).registry;
  reg = assignRapForJob(reg, JOB_B).registry;
  const test = createTestElectricalMeasurement(JOB_T, []);
  const measurements = [
    makeReport(JOB_A, "RAP-45-2026", "2026-06-16"),
    makeReport(JOB_B, "RAP-46-2026", "2026-06-17"),
    test,
  ];
  const rows = buildMeasurementCatalogRows(measurements, reg, JOBS);
  const selected = rows.filter((r) => r.measurement && r.status !== "CANCELLED");
  const bytes = await buildMultiRapArchiveZipBytes(selected, JOBS, emLoader);
  const zip = await JSZip.loadAsync(bytes);
  assert(zip.file(MEASUREMENT_INDEX_TXT_FILE) != null, "P35-T05 INDEX txt root");
  assert(zip.file(MEASUREMENT_INDEX_CSV_FILE) != null, "P35-T05 INDEX csv root");
  assert(zip.file("INDEX.txt") != null, "P35-T05 legacy INDEX.txt");
  const txt = await zip.file(MEASUREMENT_INDEX_TXT_FILE).async("string");
  assert(txt.includes("RAP-46-2026"), "P35-T05 RAP-46");
  assert(txt.includes("RAP-45-2026"), "P35-T05 RAP-45");
  assert(txt.includes("TEST-RAP-001"), "P35-T05 TEST-RAP widoczny");
  const sorted = sortRowsForMeasurementIndex(selected);
  assert(sorted[0].rapNumber === "RAP-46-2026", "P35-T05 sort pierwszy RAP-46");
}

console.log("\n=== P35-T06 ZIP odbiorowy — Pomiary/INDEX ===");
{
  let reg = createEmptyRegistryState();
  reg.baselineByYear = { "2026": 44 };
  reg = assignRapForJob(reg, JOB_A).registry;
  const prod = makeReport(JOB_A, "RAP-45-2026", "2026-06-16");
  const job = JOBS[0];
  const wmTemplate = {
    id: "tpl-p35",
    name: "Doc",
    kind: "generated",
    type: "pdf",
    enabled: true,
    sortOrder: 10,
    files: [
      {
        id: "f1",
        storagePath: "p",
        storageUrl: "https://example.com/a.pdf",
        originalFileName: "a.pdf",
        sortOrder: 10,
        uploadedAt: "2026-06-16T00:00:00Z",
      },
    ],
    createdAt: "2026-06-16T00:00:00Z",
    updatedAt: "2026-06-16T00:00:00Z",
  };
  const { bytes } = await buildWmPrintDeliveryZipBytes(
    job,
    [wmTemplate],
    [],
    { defaultCity: "Wrocław", zipNameSuffix: "ODBIOR_WM" },
    { dateMode: "today" },
    [wmTemplate.id],
    async () => new TextEncoder().encode("%PDF mock"),
    {
      includeMeasurements: true,
      measurements: [prod],
      registry: reg,
      measurementTemplateLoader: emLoader,
    },
  );
  const zip = await JSZip.loadAsync(bytes);
  const txtPath = `${WM_PRINT_ZIP_FOLDER_POMIARY}/${MEASUREMENT_INDEX_TXT_FILE}`;
  const csvPath = `${WM_PRINT_ZIP_FOLDER_POMIARY}/${MEASUREMENT_INDEX_CSV_FILE}`;
  assert(zip.file(txtPath) != null, "P35-T06 Pomiary/INDEX-POMIARY.txt");
  assert(zip.file(csvPath) != null, "P35-T06 Pomiary/INDEX-POMIARY.csv");
  const txt = await zip.file(txtPath).async("string");
  assert(txt.includes("RAP-45-2026"), "P35-T06 index w ZIP odbiorowym");
}

console.log("\n=== P35-T07 brak regresji P3 — TEST nie w odbiorowym ===");
{
  const reg = createEmptyRegistryState();
  const test = createTestElectricalMeasurement(JOB_T, []);
  const job = JOBS[2];
  const wmTemplate = {
    id: "tpl-p35b",
    name: "Doc",
    kind: "generated",
    type: "pdf",
    enabled: true,
    sortOrder: 10,
    files: [
      {
        id: "f1",
        storagePath: "p",
        storageUrl: "https://example.com/a.pdf",
        originalFileName: "a.pdf",
        sortOrder: 10,
        uploadedAt: "2026-06-16T00:00:00Z",
      },
    ],
    createdAt: "2026-06-16T00:00:00Z",
    updatedAt: "2026-06-16T00:00:00Z",
  };
  const { pomiaryCount, bytes } = await buildWmPrintDeliveryZipBytes(
    job,
    [wmTemplate],
    [],
    { defaultCity: "Wrocław", zipNameSuffix: "ODBIOR_WM" },
    { dateMode: "today" },
    [wmTemplate.id],
    async () => new TextEncoder().encode("%PDF mock"),
    {
      includeMeasurements: true,
      measurements: [test],
      registry: reg,
      measurementTemplateLoader: emLoader,
    },
  );
  assert(pomiaryCount === 0, "P35-T07 brak pomiarów TEST w odbiorowym");
  const zip = await JSZip.loadAsync(bytes);
  assert(zip.file(`${WM_PRINT_ZIP_FOLDER_POMIARY}/${MEASUREMENT_INDEX_TXT_FILE}`) == null, "P35-T07 brak INDEX");
}

console.log(`\n=== EM-P3.5: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
