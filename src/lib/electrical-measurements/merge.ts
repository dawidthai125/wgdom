import { normalizeElectricalMeasurements } from "@/lib/electrical-measurements/normalize";
import type { ElectricalMeasurement } from "@/lib/electrical-measurements/types";

export function mergeElectricalMeasurements(local: unknown, cloud: unknown): ElectricalMeasurement[] {
  const byId = new Map<string, ElectricalMeasurement>();
  for (const item of normalizeElectricalMeasurements(local)) byId.set(item.id, item);
  for (const item of normalizeElectricalMeasurements(cloud)) {
    const prev = byId.get(item.id);
    if (!prev || item.updatedAt >= prev.updatedAt) byId.set(item.id, item);
  }
  return [...byId.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function filterElectricalMeasurementsForJob(
  measurements: ElectricalMeasurement[],
  jobId: string,
): ElectricalMeasurement[] {
  if (!jobId) return [];
  return measurements
    .filter((m) => m.jobId === jobId)
    .sort((a, b) => b.measurementDate.localeCompare(a.measurementDate) || b.updatedAt.localeCompare(a.updatedAt));
}

/** Test helper — roundtrip przez JSON jak localStorage. */
export function serializeElectricalMeasurementsForStorage(
  measurements: ElectricalMeasurement[],
): ElectricalMeasurement[] {
  return normalizeElectricalMeasurements(JSON.parse(JSON.stringify(measurements)));
}

export function getElectricalMeasurementById(
  measurements: ElectricalMeasurement[],
  id: string,
): ElectricalMeasurement | undefined {
  return measurements.find((m) => m.id === id);
}
