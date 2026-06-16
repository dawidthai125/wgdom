import { pushKeysToCloud } from "@/lib/cloud-sync";
import { normalizeElectricalMeasurements } from "@/lib/electrical-measurements/normalize";
import {
  ELECTRICAL_MEASUREMENTS_KEY,
  type ElectricalMeasurement,
} from "@/lib/electrical-measurements/types";

export { ELECTRICAL_MEASUREMENTS_KEY };

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
