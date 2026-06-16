/**
 * EM-P1.7 — globalne ustawienia domyślne pomiarów elektrycznych.
 */

import type { ElectricalMeasurementSettings } from "@/lib/electrical-measurements/types";

export const ELECTRICAL_MEASUREMENT_SETTINGS_KEY = "kw-electrical-measurement-settings";

export const DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS: ElectricalMeasurementSettings = {
  technicianName: "Dawid Thai Thanh",
  meterModel: "Sonel MPI-520",
  meterSerialNumber: "722453",
  updatedAt: "2026-06-16T00:00:00.000Z",
};

export function normalizeElectricalMeasurementSettings(raw: unknown): ElectricalMeasurementSettings {
  if (!raw || typeof raw !== "object") {
    return { ...DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS, updatedAt: new Date().toISOString() };
  }
  const s = raw as Partial<ElectricalMeasurementSettings>;
  const technicianName = String(s.technicianName ?? DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS.technicianName).trim();
  const meterModel = String(s.meterModel ?? DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS.meterModel).trim();
  const meterSerialNumber = String(
    s.meterSerialNumber ?? DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS.meterSerialNumber,
  ).trim();
  return {
    technicianName: technicianName || DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS.technicianName,
    meterModel: meterModel || DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS.meterModel,
    meterSerialNumber: meterSerialNumber || DEFAULT_ELECTRICAL_MEASUREMENT_SETTINGS.meterSerialNumber,
    updatedAt: String(s.updatedAt ?? new Date().toISOString()),
  };
}

export function mergeElectricalMeasurementSettings(
  local: unknown,
  cloud: unknown,
): ElectricalMeasurementSettings {
  const l = normalizeElectricalMeasurementSettings(local);
  const c = normalizeElectricalMeasurementSettings(cloud);
  if (!local || (typeof local === "object" && Object.keys(local as object).length === 0)) return c;
  if (!cloud || (typeof cloud === "object" && Object.keys(cloud as object).length === 0)) return l;
  return c.updatedAt >= l.updatedAt ? c : l;
}

export function touchElectricalMeasurementSettings(
  patch: Partial<Omit<ElectricalMeasurementSettings, "updatedAt">>,
  prev?: ElectricalMeasurementSettings,
): ElectricalMeasurementSettings {
  const base = normalizeElectricalMeasurementSettings(prev);
  return normalizeElectricalMeasurementSettings({
    ...base,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

/** Czy pola meta raportu są edytowalne (legacy = tak). */
export function isMeasurementMetaFieldsEditable(
  m: { metaFieldsOverridden?: boolean },
): boolean {
  return m.metaFieldsOverridden !== false;
}
