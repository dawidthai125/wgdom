/**
 * EM-CATALOG-002 — edycja RAP z Katalogu Pomiarów.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-catalog-edit.mjs
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
} from "../src/lib/electrical-measurements/merge.ts";
import {
  addElectricalMeasurementCircuit,
  createDetachedElectricalMeasurement,
  createEmptyElectricalMeasurement,
  touchElectricalMeasurement,
  upsertElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";
import {
  buildMeasurementCatalogRows,
} from "../src/lib/electrical-measurements/measurement-catalog.ts";
import {
  buildSingleRapZipBytes,
} from "../src/lib/electrical-measurements/measurement-catalog-zip.ts";
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
import {
  createTestElectricalMeasurement,
  isTestMeasurement,
} from "../src/lib/electrical-measurements/test-report.ts";
import { normalizeElectricalMeasurements } from "../src/lib/electrical-measurements/normalize.ts";

const PUBLIC_DIR = path.resolve("public");
const LINKED_JOB = "job-catalog-edit-linked";
const JOB = {
  id: LINKED_JOB,
  address: "Wrocław, ul. Katalogowa 10",
  flatNumber: "2",
  notes: "Zakres test",
  client: "Klient",
};

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

let registry = createEmptyRegistryState();
registry = { ...registry, baselineByYear: { 2026: 46 } };

// --- linked RAP ---
const linkedAssign = assignRapForJob(registry, LINKED_JOB);
let linked = createEmptyElectricalMeasurement(LINKED_JOB, linkedAssign.entry.rapNumber);
linked = addElectricalMeasurementCircuit(linked, "socket-1f", "B");
linked = touchElectricalMeasurement(linked, { technicianName: "Linked Tech" });
registry = linkedAssign.registry;

// --- detached RAP ---
const detachedDraft = createDetachedElectricalMeasurement("Wrocław, ul. Detached 7", "1", "");
const detachedAssign = assignRapForRegistryKey(registry, detachedDraft.id);
let detached = touchElectricalMeasurement(detachedDraft, {
  reportNumber: detachedAssign.entry.rapNumber,
  technicianName: "Detached Tech",
});
registry = detachedAssign.registry;

// --- TEST-RAP ---
let measurements = upsertElectricalMeasurement(
  upsertElectricalMeasurement([], linked),
  detached,
);
const testRap = createTestElectricalMeasurement(LINKED_JOB, measurements);
measurements = upsertElectricalMeasurement(measurements, testRap);

const linkedRapNo = linked.reportNumber;
const detachedRapNo = detached.reportNumber;
const testRapNo = testRap.reportNumber;
const registryCountBefore = registry.entries.length;

console.log("=== T1 Edycja linked RAP ===");
let editedLinked = touchElectricalMeasurement(linked, {
  technicianName: "Linked Edited",
  meterModel: "Model-X",
});
measurements = upsertElectricalMeasurement(measurements, editedLinked);
assert(isLinkedMeasurement(editedLinked), "T1 linked");
assert(editedLinked.jobId === LINKED_JOB, "T1 jobId zachowany");
assert(editedLinked.reportNumber === linkedRapNo, "T1 numer RAP bez zmian");
assert(editedLinked.technicianName === "Linked Edited", "T1 technician zaktualizowany");

console.log("\n=== T2 Edycja detached RAP ===");
let editedDetached = touchElectricalMeasurement(detached, {
  manualAddress: "Wrocław, ul. Detached Edited 99",
  manualFlatNumber: "5",
  meterSerialNumber: "SN-DET-1",
});
measurements = upsertElectricalMeasurement(measurements, editedDetached);
assert(isDetachedMeasurement(editedDetached), "T2 detached");
assert(!editedDetached.jobId, "T2 brak jobId");
assert(editedDetached.reportNumber === detachedRapNo, "T2 numer RAP bez zmian");
assert(editedDetached.manualAddress?.includes("Edited"), "T2 adres zaktualizowany");

console.log("\n=== T3 Edycja TEST-RAP ===");
let editedTest = touchElectricalMeasurement(testRap, {
  technicianName: "Test Edited",
  flags: { test: true },
});
measurements = upsertElectricalMeasurement(measurements, editedTest);
assert(isTestMeasurement(editedTest), "T3 test");
assert(editedTest.reportNumber === testRapNo, "T3 TEST numer bez zmian");
assert(editedTest.technicianName === "Test Edited", "T3 test technician");

console.log("\n=== T4 Numer RAP pozostaje bez zmian ===");
assert(registry.entries.length === registryCountBefore, "T4 brak nowych wpisów registry");
assert(
  registry.entries.every((e) => [LINKED_JOB, detached.id].includes(e.jobId)),
  "T4 registry keys bez zmian",
);
const nums = measurements.map((m) => m.reportNumber);
assert(nums.filter((n) => n === linkedRapNo).length === 1, "T4 jeden linked RAP no");
assert(nums.filter((n) => n === detachedRapNo).length === 1, "T4 jeden detached RAP no");

console.log("\n=== T5 Cloud sync merge ===");
const local = serializeElectricalMeasurementsForStorage(measurements);
const cloud = serializeElectricalMeasurementsForStorage(
  measurements.map((m) =>
    m.id === editedDetached.id
      ? touchElectricalMeasurement(m, { technicianName: "Cloud Wins" })
      : m,
  ),
);
const merged = mergeElectricalMeasurements(local, cloud);
const mergedDetached = merged.find((m) => m.id === detached.id);
assert(mergedDetached?.technicianName === "Cloud Wins", "T5 LWW merge");
assert(mergedDetached?.reportNumber === detachedRapNo, "T5 RAP no po merge");
assert(
  new Date(mergedDetached.updatedAt).getTime() >= new Date(editedDetached.updatedAt).getTime(),
  "T5 updatedAt świeższe",
);

console.log("\n=== T6 Eksport DOCX po edycji ===");
const exportDetached = resolveMeasurementExportJob(mergedDetached, [JOB]);
const docx = await generateEmDocxBytes(
  "protokol",
  { measurement: mergedDetached, job: exportDetached },
  undefined,
  (kind) => loadEmDocxTemplateBytesFromFs(kind, PUBLIC_DIR),
);
const docZip = await JSZip.loadAsync(docx);
const docXml = await docZip.file("word/document.xml")?.async("string");
assert(docXml?.includes("Edited"), "T6 DOCX po edycji adresu");

console.log("\n=== T7 Eksport ZIP po edycji ===");
const rows = buildMeasurementCatalogRows(merged, registry, [JOB]);
const detachedRow = rows.find((r) => r.id === detached.id);
const zipBytes = await buildSingleRapZipBytes(
  detachedRow,
  exportDetached,
  (kind) => loadEmDocxTemplateBytesFromFs(kind, PUBLIC_DIR),
);
assert(zipBytes.length > 10000, "T7 ZIP po edycji");

console.log("\n=== T8 Odświeżenie katalogu ===");
assert(detachedRow?.address.includes("Edited"), "T8 katalog adres po edycji");
assert(detachedRow?.technicianName === "Cloud Wins", "T8 katalog technician po merge");

console.log("\n=== T9 Brak regresji EM-UX-002 ===");
const uxSrc = fs.readFileSync(path.join("src/app/WmPrintView.tsx"), "utf8");
const catalogSrc = fs.readFileSync(path.join("src/app/MeasurementCatalogPanel.tsx"), "utf8");
assert(uxSrc.includes("ElectricalMeasurementNewDialog"), "T9 EM-UX-002 Nowy pomiar");
assert(catalogSrc.includes("JobElectricalMeasurementsPanel"), "T9 reuse edytora");
assert(catalogSrc.includes('variant="catalog-edit"'), "T9 catalog-edit variant");
assert(catalogSrc.includes("Edytuj"), "T9 przycisk Edytuj");

const rt = normalizeElectricalMeasurements(JSON.parse(JSON.stringify(merged)));
assert(rt.length === 3, "T9 trzy raporty po roundtrip");
assert(getMeasurementRegistryKey(rt.find((m) => m.id === detached.id)) === detached.id, "T9 registry key detached");

console.log(`\n=== WYNIK: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
