/**
 * EM-CATALOG-001 — usuwanie RAP + Registry Guard + sync tombstone.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-delete-registry-guard.mjs
 */
import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import {
  assignRapForJob,
  assignRapForRegistryKey,
  createEmptyRegistryState,
  getMaxSequenceForYear,
  getRegistryEntryForKey,
} from "../src/lib/electrical-measurements/registry.ts";
import {
  mergeElectricalMeasurements,
  serializeElectricalMeasurementsForStorage,
} from "../src/lib/electrical-measurements/merge.ts";
import {
  createDetachedElectricalMeasurement,
  createEmptyElectricalMeasurement,
  touchElectricalMeasurement,
  upsertElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";
import { deleteElectricalMeasurementsFromBundle } from "../src/lib/electrical-measurements/delete-bundle.ts";
import {
  ELECTRICAL_MEASUREMENTS_DELETED_IDS_KEY,
  mergeDeletedElectricalMeasurementIds,
  saveDeletedElectricalMeasurementIds,
} from "../src/lib/electrical-measurements/deleted-ids.ts";
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
  isDetachedMeasurement,
  isLinkedMeasurement,
  resolveMeasurementExportJob,
} from "../src/lib/electrical-measurements/link-status.ts";
import {
  createTestElectricalMeasurement,
  isTestMeasurement,
} from "../src/lib/electrical-measurements/test-report.ts";

const PUBLIC_DIR = path.resolve("public");
const JOB_LINKED = "job-del-linked";
const JOB = {
  id: JOB_LINKED,
  address: "Wrocław, ul. Delete 1",
  flatNumber: "2",
  notes: "Zakres",
  client: "Klient",
};

if (typeof globalThis.localStorage === "undefined") {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
  };
}

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

function resetTombstones() {
  localStorage.removeItem(ELECTRICAL_MEASUREMENTS_DELETED_IDS_KEY);
}

let registry = createEmptyRegistryState();
registry = { ...registry, baselineByYear: { 2026: 44 } };

const linkedAssign = assignRapForJob(registry, JOB_LINKED);
let linked = createEmptyElectricalMeasurement(JOB_LINKED, linkedAssign.entry.rapNumber);
registry = linkedAssign.registry;

const detachedDraft = createDetachedElectricalMeasurement("Wrocław, ul. Detached Del", "1", "");
const detachedAssign = assignRapForRegistryKey(registry, detachedDraft.id);
let detached = touchElectricalMeasurement(detachedDraft, { reportNumber: detachedAssign.entry.rapNumber });
registry = detachedAssign.registry;

let measurements = upsertElectricalMeasurement(
  upsertElectricalMeasurement([], linked),
  detached,
);
const testRap = createTestElectricalMeasurement(JOB_LINKED, measurements);
measurements = upsertElectricalMeasurement(measurements, testRap);

console.log("=== T1 Usuń linked RAP ===");
resetTombstones();
{
  const linkedId = linked.id;
  const rapNo = linked.reportNumber;
  const result = deleteElectricalMeasurementsFromBundle(measurements, registry, [linkedId]);
  assert(!result.measurements.some((m) => m.id === linkedId), "T1 brak raportu w danych");
  assert(isLinkedMeasurement(linked), "T1 fixture linked");
  assert(getRegistryEntryForKey(result.registry, JOB_LINKED)?.status === "CANCELLED", "T1 registry CANCELLED");
  assert(getRegistryEntryForKey(result.registry, JOB_LINKED)?.rapNumber === rapNo, "T1 numer w registry");
  measurements = result.measurements;
  registry = result.registry;
}

console.log("\n=== T2 Usuń detached RAP ===");
resetTombstones();
{
  const detachedId = detached.id;
  const rapNo = detached.reportNumber;
  const regKey = detached.id;
  const result = deleteElectricalMeasurementsFromBundle(measurements, registry, [detachedId]);
  assert(!result.measurements.some((m) => m.id === detachedId), "T2 brak detached");
  assert(getRegistryEntryForKey(result.registry, regKey)?.status === "CANCELLED", "T2 registry CANCELLED");
  assert(getRegistryEntryForKey(result.registry, regKey)?.rapNumber === rapNo, "T2 numer w registry");
  measurements = result.measurements;
  registry = result.registry;
}

console.log("\n=== T3 Usuń TEST-RAP ===");
resetTombstones();
{
  const testId = testRap.id;
  const beforeRegistryLen = registry.entries.length;
  const result = deleteElectricalMeasurementsFromBundle(measurements, registry, [testId]);
  assert(!result.measurements.some((m) => m.id === testId), "T3 brak TEST");
  assert(result.registry.entries.length === beforeRegistryLen, "T3 brak zmian registry dla TEST");
  assert(isTestMeasurement(testRap), "T3 fixture test");
  measurements = result.measurements;
}

console.log("\n=== T4 Usuń wiele RAP ===");
resetTombstones();
{
  const aAssign = assignRapForJob(registry, "job-bulk-a");
  registry = aAssign.registry;
  const bAssign = assignRapForJob(registry, "job-bulk-b");
  registry = bAssign.registry;
  let bulk = [
    createEmptyElectricalMeasurement("job-bulk-a", aAssign.entry.rapNumber),
    createEmptyElectricalMeasurement("job-bulk-b", bAssign.entry.rapNumber),
  ];
  const ids = bulk.map((m) => m.id);
  const result = deleteElectricalMeasurementsFromBundle(bulk, registry, ids);
  assert(result.measurements.length === 0, "T4 wszystkie usunięte");
  assert(result.deletedIds.length === 2, "T4 dwa tombstone");
  assert(getRegistryEntryForKey(result.registry, "job-bulk-a")?.status === "CANCELLED", "T4 A cancelled");
  assert(getRegistryEntryForKey(result.registry, "job-bulk-b")?.status === "CANCELLED", "T4 B cancelled");
}

console.log("\n=== T5 Registry Guard RAP-45/46/47 → delete 46 → nowy RAP-48 ===");
{
  let reg = createEmptyRegistryState();
  reg = { ...reg, baselineByYear: { 2026: 44 } };
  const now = new Date("2026-06-16T12:00:00Z");
  const r45 = assignRapForJob(reg, "job-r45", { now });
  reg = r45.registry;
  const r46 = assignRapForJob(reg, "job-r46", { now: new Date("2026-06-16T12:01:00Z") });
  reg = r46.registry;
  const r47 = assignRapForJob(reg, "job-r47", { now: new Date("2026-06-16T12:02:00Z") });
  reg = r47.registry;
  assert(r45.entry.rapNumber === "RAP-45-2026", "T5 RAP-45");
  assert(r46.entry.rapNumber === "RAP-46-2026", "T5 RAP-46");
  assert(r47.entry.rapNumber === "RAP-47-2026", "T5 RAP-47");

  let ms = [
    createEmptyElectricalMeasurement("job-r45", r45.entry.rapNumber),
    createEmptyElectricalMeasurement("job-r46", r46.entry.rapNumber),
    createEmptyElectricalMeasurement("job-r47", r47.entry.rapNumber),
  ];
  const m46 = ms.find((m) => m.jobId === "job-r46");
  resetTombstones();
  const deleted = deleteElectricalMeasurementsFromBundle(ms, reg, [m46.id]);
  ms = deleted.measurements;
  reg = deleted.registry;
  assert(getMaxSequenceForYear(reg, 2026) === 47, "T5 max seq nadal 47");
  assert(getRegistryEntryForKey(reg, "job-r46")?.status === "CANCELLED", "T5 RAP-46 cancelled");

  const r48 = assignRapForJob(reg, "job-r48-new", { now: new Date("2026-06-16T12:03:00Z") });
  assert(r48.entry.rapNumber === "RAP-48-2026", "T5 następny RAP-48-2026");
  assert(r48.entry.rapNumber !== "RAP-46-2026", "T5 nigdy RAP-46 ponownie");
}

console.log("\n=== T6 Cloud Sync delete (tombstone) ===");
resetTombstones();
{
  const m = createEmptyElectricalMeasurement("job-sync-del", "RAP-99-2026");
  const local = serializeElectricalMeasurementsForStorage([m]);
  saveDeletedElectricalMeasurementIds([m.id]);
  const cloud = serializeElectricalMeasurementsForStorage([m]);
  const merged = mergeElectricalMeasurements(local, cloud, [m.id]);
  assert(merged.length === 0, "T6 merge bez usuniętego");
}

console.log("\n=== T7 Merge po delete ===");
resetTombstones();
{
  const keep = createEmptyElectricalMeasurement("job-keep", "RAP-50-2026");
  const gone = createEmptyElectricalMeasurement("job-gone", "RAP-51-2026");
  const tomb = mergeDeletedElectricalMeasurementIds([], [gone.id]);
  const local = serializeElectricalMeasurementsForStorage([keep]);
  const cloud = serializeElectricalMeasurementsForStorage([keep, gone]);
  const merged = mergeElectricalMeasurements(local, cloud, tomb);
  assert(merged.length === 1 && merged[0].id === keep.id, "T7 tylko surviving");
  assert(!merged.some((m) => m.id === gone.id), "T7 gone nie wraca");
}

console.log("\n=== T8 Brak odtworzenia po refresh ===");
resetTombstones();
{
  const m = createEmptyElectricalMeasurement("job-refresh", "RAP-52-2026");
  saveDeletedElectricalMeasurementIds([m.id]);
  const cloud = serializeElectricalMeasurementsForStorage([m]);
  const local = serializeElectricalMeasurementsForStorage([]);
  const merged = mergeElectricalMeasurements(local, cloud, mergeDeletedElectricalMeasurementIds([], [m.id]));
  assert(merged.length === 0, "T8 refresh bez ghost");
}

console.log("\n=== T9 Eksport DOCX po delete ===");
resetTombstones();
{
  let reg = createEmptyRegistryState();
  reg = { ...reg, baselineByYear: { 2026: 44 } };
  const a = assignRapForJob(reg, "job-docx-a");
  reg = a.registry;
  const b = assignRapForJob(reg, "job-docx-b");
  reg = b.registry;
  let ms = [
    createEmptyElectricalMeasurement("job-docx-a", a.entry.rapNumber),
    createEmptyElectricalMeasurement("job-docx-b", b.entry.rapNumber),
  ];
  const del = deleteElectricalMeasurementsFromBundle(ms, reg, [ms[1].id]);
  ms = del.measurements;
  const rows = buildMeasurementCatalogRows(ms, del.registry, [JOB]).filter((r) => r.measurement);
  assert(rows.length === 1, "T9 jeden wiersz katalogu");
  const row = rows[0];
  const exportJob = resolveMeasurementExportJob(row.measurement, [JOB]);
  const docx = await generateEmDocxBytes(
    "protokol",
    { measurement: row.measurement, job: exportJob },
    undefined,
    (kind) => loadEmDocxTemplateBytesFromFs(kind, PUBLIC_DIR),
  );
  assert(docx.length > 5000, "T9 DOCX surviving");
}

console.log("\n=== T10 Eksport ZIP po delete ===");
resetTombstones();
{
  let reg = createEmptyRegistryState();
  const detachedD = createDetachedElectricalMeasurement("Wrocław, ZIP test", "3", "");
  const da = assignRapForRegistryKey(reg, detachedD.id);
  reg = da.registry;
  let m = touchElectricalMeasurement(detachedD, { reportNumber: da.entry.rapNumber });
  let ms = [m];
  const rows = buildMeasurementCatalogRows(ms, reg, []).filter((r) => r.measurement);
  const packable = catalogRowsWithDocuments(rows);
  assert(packable.length === 1, "T10 packable row");
  const zipBytes = await buildSingleRapZipBytes(
    packable[0],
    resolveMeasurementExportJob(m, []),
    (kind) => loadEmDocxTemplateBytesFromFs(kind, PUBLIC_DIR),
  );
  assert(zipBytes.length > 10000, "T10 ZIP bytes");
  const del = deleteElectricalMeasurementsFromBundle(ms, reg, [m.id]);
  const afterRows = buildMeasurementCatalogRows(del.measurements, del.registry, []).filter((r) => r.measurement);
  assert(afterRows.length === 0, "T10 brak ZIP po delete");
}

console.log("\n=== T11 Brak regresji EM-UX-002 ===");
{
  const uxSrc = fs.readFileSync(path.join("src/app/WmPrintView.tsx"), "utf8");
  const detachedSrc = fs.readFileSync(path.join("src/lib/electrical-measurements/link-status.ts"), "utf8");
  assert(uxSrc.includes("ElectricalMeasurementNewDialog"), "T11 Nowy pomiar");
  assert(detachedSrc.includes("detached"), "T11 link-status detached");
  assert(isDetachedMeasurement(createDetachedElectricalMeasurement("A", "1")), "T11 detached helper");
}

console.log("\n=== T12 Brak regresji EM-CATALOG-002 ===");
{
  const catalogSrc = fs.readFileSync(path.join("src/app/MeasurementCatalogPanel.tsx"), "utf8");
  assert(catalogSrc.includes('variant="catalog-edit"'), "T12 catalog-edit");
  assert(catalogSrc.includes("Edytuj"), "T12 Edytuj");
  assert(catalogSrc.includes("Usuń zaznaczone"), "T12 bulk delete UI");
  assert(catalogSrc.includes("deleteElectricalMeasurementsFromBundle"), "T12 delete bundle");
}

console.log(`\n=== WYNIK: ${passed} PASS, ${failed} FAIL ===`);
if (failed > 0) process.exit(1);
