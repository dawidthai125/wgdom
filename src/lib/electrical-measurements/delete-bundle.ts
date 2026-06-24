/**
 * EM-CATALOG-001 — usuwanie raportów + Registry Guard (CANCELLED, bez zwrotu numeru).
 */

import { addDeletedElectricalMeasurementIds } from "@/lib/electrical-measurements/deleted-ids";
import { getMeasurementRegistryKey } from "@/lib/electrical-measurements/link-status";
import { cancelRegistryForKey } from "@/lib/electrical-measurements/registry";
import { removeElectricalMeasurement } from "@/lib/electrical-measurements/report";
import { isTestMeasurement } from "@/lib/electrical-measurements/test-report";
import type {
  ElectricalMeasurement,
  ElectricalMeasurementRegistryState,
} from "@/lib/electrical-measurements/types";

export interface ElectricalMeasurementDeleteResult {
  measurements: ElectricalMeasurement[];
  registry: ElectricalMeasurementRegistryState;
  deletedIds: string[];
}

/** Usuń jeden lub wiele raportów — registry CANCELLED dla produkcyjnych RAP, tombstone dla sync. */
export function deleteElectricalMeasurementsFromBundle(
  measurements: ElectricalMeasurement[],
  registry: ElectricalMeasurementRegistryState,
  measurementIds: string[],
): ElectricalMeasurementDeleteResult {
  const ids = [...new Set(measurementIds.filter(Boolean))];
  if (ids.length === 0) {
    return { measurements, registry, deletedIds: [] };
  }

  let nextMeasurements = measurements;
  let nextRegistry = registry;
  const tombstoned: string[] = [];

  for (const id of ids) {
    const target = nextMeasurements.find((m) => m.id === id);
    if (!target) continue;

    nextMeasurements = removeElectricalMeasurement(nextMeasurements, id);
    tombstoned.push(id);

    if (!isTestMeasurement(target)) {
      const regKey = getMeasurementRegistryKey(target);
      if (regKey) {
        nextRegistry = cancelRegistryForKey(nextRegistry, regKey);
      }
    }
  }

  if (tombstoned.length > 0) {
    addDeletedElectricalMeasurementIds(tombstoned);
  }

  return {
    measurements: nextMeasurements,
    registry: nextRegistry,
    deletedIds: tombstoned,
  };
}
