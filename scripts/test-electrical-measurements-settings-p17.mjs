/**
 * EM-P1.7 — Measurement Defaults — testy.
 * Uruchom: npx vite-node scripts/test-electrical-measurements-settings-p17.mjs
 */
import {
  DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS,
  isMeasurementMetaFieldsEditable,
  mergeElectricalMeasurementSettings,
  normalizeElectricalMeasurementSettings,
  touchElectricalMeasurementSettings,
} from "../src/lib/electrical-measurements/settings.ts";
import {
  createEmptyElectricalMeasurement,
  touchElectricalMeasurement,
  upsertElectricalMeasurement,
} from "../src/lib/electrical-measurements/report.ts";
import { buildElectricalMeasurementDocxPayload } from "../src/lib/electrical-measurements/em-docx-payload.ts";
import { parseElectricalMeasurement } from "../src/lib/electrical-measurements/normalize.ts";

const JOB = { id: "job-p17", address: "Test", flatNumber: "" };

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

console.log("=== P17-T01 migracja — domyślne wartości ===");
{
  const s = normalizeElectricalMeasurementSettings(null);
  assert(s.technicianName === "Dawid Thai Thanh", "P17-T01 pomiarowiec");
  assert(s.meterModel === "Sonel MPI-520", "P17-T01 model");
  assert(s.meterSerialNumber === "722453", "P17-T01 numer");
}

console.log("\n=== P17-T02 zapis / odczyt ustawień ===");
{
  const saved = touchElectricalMeasurementSettings(
    { meterModel: "Sonel MPI-525" },
    DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS,
  );
  assert(saved.meterModel === "Sonel MPI-525", "P17-T02 zapis modelu");
  assert(saved.updatedAt.length > 10, "P17-T02 updatedAt");
}

console.log("\n=== P17-T03 nowy raport — podstawienie defaults ===");
{
  const settings = normalizeElectricalMeasurementSettings(null);
  const m = createEmptyElectricalMeasurement("job-x", "RAP-1-2026", settings);
  assert(m.technicianName === settings.technicianName, "P17-T03 technicianName");
  assert(m.meterModel === settings.meterModel, "P17-T03 meterModel");
  assert(m.meterSerialNumber === settings.meterSerialNumber, "P17-T03 meterSerialNumber");
  assert(m.metaFieldsOverridden === false, "P17-T03 metaFieldsOverridden false");
  assert(!isMeasurementMetaFieldsEditable(m), "P17-T03 pola zablokowane");
}

console.log("\n=== P17-T04 override dla raportu ===");
{
  const settings = normalizeElectricalMeasurementSettings(null);
  let m = createEmptyElectricalMeasurement("job-y", "RAP-2-2026", settings);
  m = touchElectricalMeasurement(m, {
    metaFieldsOverridden: true,
    meterModel: "Inny model",
  });
  assert(isMeasurementMetaFieldsEditable(m), "P17-T04 edytowalne po override");
  assert(m.meterModel === "Inny model", "P17-T04 lokalna zmiana modelu");
}

console.log("\n=== P17-T05 brak wpływu na stare raporty ===");
{
  const legacy = parseElectricalMeasurement({
    id: "old-1",
    jobId: "job-old",
    reportNumber: "RAP-99-2025",
    measurementDate: "2025-01-01",
    technicianName: "Stary Pomiarowiec",
    meterModel: "Stary model",
    meterSerialNumber: "111111",
    supplyType: "ydy-3x4",
    circuits: [],
    rcds: [],
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
  });
  assert(legacy != null && legacy.technicianName === "Stary Pomiarowiec", "P17-T05 legacy technician");
  assert(legacy != null && isMeasurementMetaFieldsEditable(legacy), "P17-T05 legacy edytowalny");
  const newSettings = touchElectricalMeasurementSettings({ technicianName: "Nowy globalny" });
  assert(newSettings.technicianName === "Nowy globalny", "P17-T05 global zmieniony");
  assert(legacy?.technicianName === "Stary Pomiarowiec", "P17-T05 legacy bez zmian");
}

console.log("\n=== P17-T06 DOCX używa danych raportu ===");
{
  const settings = normalizeElectricalMeasurementSettings(null);
  let m = createEmptyElectricalMeasurement("job-docx", "RAP-3-2026", settings);
  m = touchElectricalMeasurement(m, {
    metaFieldsOverridden: true,
    meterModel: "Override Model X",
  });
  const payload = buildElectricalMeasurementDocxPayload(m, JOB);
  assert(payload.scalars.METER_MODEL === "Override Model X", "P17-T06 DOCX METER_MODEL z raportu");
  assert(payload.scalars.TECHNICIAN === settings.technicianName, "P17-T06 DOCX TECHNICIAN z raportu");
}

console.log("\n=== P17-T07 merge sync (updatedAt LWW) ===");
{
  const local = touchElectricalMeasurementSettings(
    { meterSerialNumber: "111" },
    DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS,
  );
  const cloud = touchElectricalMeasurementSettings(
    { meterSerialNumber: "999" },
    { ...DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS, updatedAt: "2099-01-01T00:00:00.000Z" },
  );
  const merged = mergeElectricalMeasurementSettings(local, cloud);
  assert(merged.meterSerialNumber === "999", "P17-T07 cloud newer wins");
}

console.log("\n=== P17-T08 roundtrip normalize ===");
{
  const raw = touchElectricalMeasurementSettings({ technicianName: "Test User" });
  const again = normalizeElectricalMeasurementSettings(JSON.parse(JSON.stringify(raw)));
  assert(again.technicianName === "Test User", "P17-T08 roundtrip");
}

console.log(`\n=== EM-P1.7: ${passed} PASS, ${failed} FAIL ===`);
process.exit(failed > 0 ? 1 : 0);
