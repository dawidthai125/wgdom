/**
 * EM-UX-002 — samodzielne RAP bez roboty.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-independent-rap.mjs
 */
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import {
  assignRapForJob,
  assignRapForRegistryKey,
  createEmptyRegistryState,
} from "../src/lib/electrical-measurements/registry.ts";
import {
  mergeElectricalMeasurements,
  serializeElectricalMeasurementsForStorage,
  filterElectricalMeasurementsForJob,
  filterDetachedElectricalMeasurements,
} from "../src/lib/electrical-measurements/merge.ts";
import {
  createDetachedElectricalMeasurement,
  createEmptyElectricalMeasurement,
  touchElectricalMeasurement,
  upsertElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";
import {
  buildMeasurementCatalogRows,
  catalogRowsWithDocuments,
} from "../src/lib/electrical-measurements/measurement-catalog.ts";
import { buildSingleRapZipBytes } from "../src/lib/electrical-measurements/measurement-catalog-zip.ts";
import {
  generateEmDocxBytes,
  loadEmDocxTemplateBytesFromFs,
} from "../src/lib/electrical-measurements/generate-em-docx.ts";
import {
  getMeasurementRegistryKey,
  isDetachedMeasurement,
  isLinkedMeasurement,
  resolveMeasurementExportJob,
} from "../src/lib/electrical-measurements/link-status.ts";
import { normalizeElectricalMeasurements } from "../src/lib/electrical-measurements/normalize.ts";
import { mergeElectricalMeasurementRegistry } from "../src/lib/electrical-measurements/registry.ts";

const PUBLIC_DIR = path.resolve("public");

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

const LINKED_JOB = "job-linked-em-ux-002";
const JOB_FIXTURE = {
  id: LINKED_JOB,
  address: "Wrocław, ul. Powiązana 1",
  flatNumber: "12",
  notes: "Remont WM",
  client: "Klient A",
};

console.log("=== T1 Utworzenie samodzielnego RAP ===");
let registry = createEmptyRegistryState();
registry = {
  ...registry,
  baselineByYear: { 2026: 44 },
};

const draft = createDetachedElectricalMeasurement("Wrocław, ul. Samodzielna 5", "3", "");
const assigned = assignRapForRegistryKey(registry, draft.id);
const detached = touchElectricalMeasurement(draft, { reportNumber: assigned.entry.rapNumber });
let measurements = upsertElectricalMeasurement([], detached);

assert(isDetachedMeasurement(detached), "T1 detached flag");
assert(!detached.jobId, "T1 brak jobId");
assert(detached.manualAddress?.includes("Samodzielna"), "T1 manualAddress");
assert(/^RAP-\d+-2026$/.test(detached.reportNumber), "T1 numer RAP produkcyjny");
assert(assigned.entry.rapNumber === detached.reportNumber, "T1 registry sync");
registry = assigned.registry;

console.log("\n=== T2 Eksport DOCX ===");
const exportJob = resolveMeasurementExportJob(detached, []);
const protokolBytes = await generateEmDocxBytes(
  "protokol",
  { measurement: detached, job: exportJob },
  undefined,
  (kind) => loadEmDocxTemplateBytesFromFs(kind, PUBLIC_DIR),
);
assert(protokolBytes.length > 5000, "T2 DOCX protokol bytes");
const zipProbe = await JSZip.loadAsync(protokolBytes);
const docXml = await zipProbe.file("word/document.xml")?.async("string");
assert(docXml?.includes("Samodzielna"), "T2 ADDRESS w DOCX");

console.log("\n=== T3 Eksport ZIP ===");
const catalogRows = buildMeasurementCatalogRows(measurements, registry, [JOB_FIXTURE]);
const detachedRow = catalogRows.find((r) => r.id === detached.id);
assert(detachedRow != null, "T3 wiersz katalogu");
const zipBytes = await buildSingleRapZipBytes(
  detachedRow,
  exportJob,
  (kind) => loadEmDocxTemplateBytesFromFs(kind, PUBLIC_DIR),
);
assert(zipBytes.length > 10000, "T3 ZIP bytes");
const zip = await JSZip.loadAsync(zipBytes);
const names = Object.keys(zip.files);
assert(names.some((n) => n.endsWith(".docx")), "T3 ZIP zawiera DOCX");

console.log("\n=== T4 Widoczność w Katalogu Pomiarów ===");
assert(detachedRow?.address.includes("Samodzielna"), "T4 adres w katalogu");
assert(detachedRow?.jobName === "Samodzielny pomiar", "T4 etykieta zakresu");
assert(catalogRowsWithDocuments(catalogRows).some((r) => r.id === detached.id), "T4 packable row");

console.log("\n=== T5 Cloud Sync (normalize + merge) ===");
const localJson = serializeElectricalMeasurementsForStorage(measurements);
const cloudJson = serializeElectricalMeasurementsForStorage([
  ...measurements,
  touchElectricalMeasurement(detached, { technicianName: "Cloud merge" }),
]);
const merged = mergeElectricalMeasurements(localJson, cloudJson);
const mergedDetached = merged.find((m) => m.id === detached.id);
assert(mergedDetached?.technicianName === "Cloud merge", "T5 merge LWW");

const roundtrip = normalizeElectricalMeasurements(JSON.parse(JSON.stringify(merged)));
const rtDetached = roundtrip.find((m) => m.id === detached.id);
assert(rtDetached && isDetachedMeasurement(rtDetached), "T5 normalize roundtrip detached");
assert(!rtDetached.jobId, "T5 normalize bez jobId");

const regMerged = mergeElectricalMeasurementRegistry(registry, assigned.registry);
assert(getMeasurementRegistryKey(rtDetached) === detached.id, "T5 registry key = measurement.id");
assert(regMerged.entries.some((e) => e.jobId === detached.id), "T5 registry entry");

console.log("\n=== T6 Brak regresji raportów powiązanych z Robotami ===");
const linkedAssigned = assignRapForJob(regMerged, LINKED_JOB);
const linked = createEmptyElectricalMeasurement(LINKED_JOB, linkedAssigned.entry.rapNumber);
measurements = upsertElectricalMeasurement(merged, linked);
registry = linkedAssigned.registry;

const forJob = filterElectricalMeasurementsForJob(measurements, LINKED_JOB);
assert(forJob.length === 1, "T6 jeden raport na robotę");
assert(isLinkedMeasurement(forJob[0]), "T6 linked");
assert(isDetachedMeasurement(forJob[0]) === false, "T6 nie detached");

const detachedList = filterDetachedElectricalMeasurements(measurements);
assert(detachedList.length === 1, "T6 jeden detached");
assert(detachedList[0].id === detached.id, "T6 detached id");

const linkedRow = buildMeasurementCatalogRows(measurements, registry, [JOB_FIXTURE]).find(
  (r) => r.jobId === LINKED_JOB,
);
assert(linkedRow?.address.includes("Powiązana"), "T6 katalog linked address");

console.log("\n=== T7 UI wiring (statyczny) ===");
const wmSrc = fs.readFileSync(path.join("src/app/WmPrintView.tsx"), "utf8");
assert(wmSrc.includes("ElectricalMeasurementNewDialog"), "T7 dialog Nowy pomiar");
assert(wmSrc.includes("filterDetachedElectricalMeasurements"), "T7 lista samodzielnych");

console.log(`\n=== WYNIK: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
