import { pushKeysToCloud } from "@/lib/cloud-sync";
import { getDeletedElectricalMeasurementIds, mergeDeletedElectricalMeasurementIds, saveDeletedElectricalMeasurementIds, ELECTRICAL_MEASUREMENTS_DELETED_IDS_KEY } from "@/lib/electrical-measurements/deleted-ids";
import {
  mergeElectricalMeasurementRegistry,
  normalizeElectricalMeasurementRegistryState,
} from "@/lib/electrical-measurements/registry";
import { normalizeElectricalMeasurements } from "@/lib/electrical-measurements/normalize";
import {
  mergeElectricalMeasurementSettings,
  normalizeElectricalMeasurementSettings,
} from "@/lib/electrical-measurements/settings";
import {
  ELECTRICAL_MEASUREMENT_REGISTRY_KEY,
  ELECTRICAL_MEASUREMENT_SETTINGS_KEY,
  ELECTRICAL_MEASUREMENTS_KEY,
  type ElectricalMeasurement,
  type ElectricalMeasurementRegistryState,
  type ElectricalMeasurementSettings,
} from "@/lib/electrical-measurements/types";

export {
  ELECTRICAL_MEASUREMENTS_KEY,
  ELECTRICAL_MEASUREMENT_REGISTRY_KEY,
  ELECTRICAL_MEASUREMENT_SETTINGS_KEY,
};

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
  registry: ElectricalMeasurementRegistryState,
): Promise<void> {
  const normalized = normalizeElectricalMeasurementRegistryState(registry);
  try {
    localStorage.setItem(ELECTRICAL_MEASUREMENT_REGISTRY_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore quota */
  }
  await pushKeysToCloud([ELECTRICAL_MEASUREMENT_REGISTRY_KEY], [normalized]);
}

export async function pushElectricalMeasurementSettingsToCloud(
  settings: ElectricalMeasurementSettings,
): Promise<void> {
  const normalized = normalizeElectricalMeasurementSettings(settings);
  try {
    localStorage.setItem(ELECTRICAL_MEASUREMENT_SETTINGS_KEY, JSON.stringify(normalized));
  } catch {
    /* ignore quota */
  }
  await pushKeysToCloud([ELECTRICAL_MEASUREMENT_SETTINGS_KEY], [normalized]);
}

export async function pushElectricalMeasurementsBundleToCloud(
  measurements: ElectricalMeasurement[],
  registry: ElectricalMeasurementRegistryState,
): Promise<void> {
  const normMeasurements = normalizeElectricalMeasurements(measurements);
  const normRegistry = normalizeElectricalMeasurementRegistryState(registry);
  try {
    localStorage.setItem(ELECTRICAL_MEASUREMENTS_KEY, JSON.stringify(normMeasurements));
    localStorage.setItem(ELECTRICAL_MEASUREMENT_REGISTRY_KEY, JSON.stringify(normRegistry));
  } catch {
    /* ignore quota */
  }
  await pushKeysToCloud(
    [ELECTRICAL_MEASUREMENTS_KEY, ELECTRICAL_MEASUREMENT_REGISTRY_KEY, ELECTRICAL_MEASUREMENTS_DELETED_IDS_KEY],
    [normMeasurements, normRegistry, getDeletedElectricalMeasurementIds()],
  );
}

export { mergeElectricalMeasurementRegistry, normalizeElectricalMeasurementRegistryState };
export {
  mergeElectricalMeasurementSettings,
  normalizeElectricalMeasurementSettings,
} from "@/lib/electrical-measurements/settings";
