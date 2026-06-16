import { pushKeysToCloud } from "@/lib/cloud-sync";
import { mergeElectricalMeasurementRegistry, normalizeElectricalMeasurementRegistry } from "@/lib/electrical-measurements/registry";
import { normalizeElectricalMeasurements } from "@/lib/electrical-measurements/normalize";
import {
  ELECTRICAL_MEASUREMENT_REGISTRY_KEY,
  ELECTRICAL_MEASUREMENTS_KEY,
  type ElectricalMeasurement,
  type ElectricalMeasurementRegistryEntry,
} from "@/lib/electrical-measurements/types";

export { ELECTRICAL_MEASUREMENTS_KEY, ELECTRICAL_MEASUREMENT_REGISTRY_KEY };

export async function pushElectricalMeasurementsToCloud(
  measurements: ElectricalMeasurement[],
): Promise<void> {
  const normalized = normalizeElectricalMeasurements(measurements);
  try {
    localStorage.setItem(ELECTRICAL_MEASUREMENTS_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore quota */
  }
  await pushKeysToCloud([ELECTRICAL_MEASUREMENTS_KEY], [normalized]);
}

export async function pushElectricalMeasurementRegistryToCloud(
  registry: ElectricalMeasurementRegistryEntry[],
): Promise<void> {
  const normalized = normalizeElectricalMeasurementRegistry(registry);
  try {
    localStorage.setItem(ELECTRICAL_MEASUREMENT_REGISTRY_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore quota */
  }
  await pushKeysToCloud([ELECTRICAL_MEASUREMENT_REGISTRY_KEY], [normalized]);
}

export async function pushElectricalMeasurementsBundleToCloud(
  measurements: ElectricalMeasurement[],
  registry: ElectricalMeasurementRegistryEntry[],
): Promise<void> {
  const normMeasurements = normalizeElectricalMeasurements(measurements);
  const normRegistry = normalizeElectricalMeasurementRegistry(registry);
  try {
    localStorage.setItem(ELECTRICAL_MEASUREMENTS_KEY, JSON.stringify(normMeasurements));
    localStorage.setItem(ELECTRICAL_MEASUREMENT_REGISTRY_KEY, JSON.stringify(normRegistry));
  } catch {
    /* ignore quota */
  }
  await pushKeysToCloud(
    [ELECTRICAL_MEASUREMENTS_KEY, ELECTRICAL_MEASUREMENT_REGISTRY_KEY],
    [normMeasurements, normRegistry],
  );
}

export { mergeElectricalMeasurementRegistry, normalizeElectricalMeasurementRegistry };
