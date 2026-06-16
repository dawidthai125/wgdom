import type {
  BreakerType,
  CircuitType,
  ElectricalMeasurement,
  ElectricalMeasurementCircuit,
  ElectricalMeasurementRcd,
  ElectricalMeasurementSettings,
  RcdDeviceType,
  SupplyType,
} from "@/lib/electrical-measurements/types";
import { defaultCircuitDisplayName } from "@/lib/electrical-measurements/types";
import { applyGeneratedValuesToMeasurement } from "@/lib/electrical-measurements/measurement-value-engine";

export function localIsoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function nextCircuitSortOrder(circuits: ElectricalMeasurementCircuit[]): number {
  if (circuits.length === 0) return 2;
  return Math.max(...circuits.map((c) => c.sortOrder)) + 1;
}

function renumberCircuitSortOrder(circuits: ElectricalMeasurementCircuit[]): ElectricalMeasurementCircuit[] {
  const sorted = [...circuits].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted.map((c, i) => ({ ...c, sortOrder: i + 2 }));
}

export function createEmptyElectricalMeasurement(
  jobId: string,
  reportNumber = "",
  settings?: Pick<ElectricalMeasurementSettings, "technicianName" | "meterModel" | "meterSerialNumber">,
): ElectricalMeasurement {
  const now = new Date().toISOString();
  const base: ElectricalMeasurement = {
    id: crypto.randomUUID(),
    jobId,
    reportNumber,
    measurementDate: localIsoDate(),
    technicianName: settings?.technicianName ?? "",
    meterModel: settings?.meterModel ?? "",
    meterSerialNumber: settings?.meterSerialNumber ?? "",
    supplyType: "ydy-3x4",
    circuits: [],
    rcds: [],
    metaFieldsOverridden: settings ? false : undefined,
    createdAt: now,
    updatedAt: now,
  };
  return applyGeneratedValuesToMeasurement(base);
}

/** EM-P1.5 — ponowne losowanie (seed z id + numer raportu). */
export function recalculateElectricalMeasurementValues(m: ElectricalMeasurement): ElectricalMeasurement {
  return applyGeneratedValuesToMeasurement(m);
}

export function touchElectricalMeasurement(
  m: ElectricalMeasurement,
  patch: Partial<Omit<ElectricalMeasurement, "id" | "jobId" | "createdAt">>,
): ElectricalMeasurement {
  return {
    ...m,
    ...patch,
    circuits: patch.circuits ?? m.circuits,
    rcds: patch.rcds ?? m.rcds,
    updatedAt: new Date().toISOString(),
  };
}

export function upsertElectricalMeasurement(
  measurements: ElectricalMeasurement[],
  next: ElectricalMeasurement,
): ElectricalMeasurement[] {
  const idx = measurements.findIndex((m) => m.id === next.id);
  if (idx >= 0) {
    const copy = [...measurements];
    copy[idx] = { ...next, createdAt: measurements[idx].createdAt };
    return copy;
  }
  return [next, ...measurements];
}

export function removeElectricalMeasurement(
  measurements: ElectricalMeasurement[],
  id: string,
): ElectricalMeasurement[] {
  return measurements.filter((m) => m.id !== id);
}

export function addElectricalMeasurementCircuit(
  m: ElectricalMeasurement,
  type: CircuitType = "socket-1f",
  breakerType: BreakerType = "B",
): ElectricalMeasurement {
  const circuit: ElectricalMeasurementCircuit = {
    id: crypto.randomUUID(),
    type,
    breakerType,
    displayName: defaultCircuitDisplayName(type),
    sortOrder: nextCircuitSortOrder(m.circuits),
  };
  return touchElectricalMeasurement(m, { circuits: [...m.circuits, circuit] });
}

export function updateElectricalMeasurementCircuit(
  m: ElectricalMeasurement,
  circuitId: string,
  patch: Partial<Pick<ElectricalMeasurementCircuit, "type" | "breakerType" | "displayName" | "sortOrder">>,
): ElectricalMeasurement {
  return touchElectricalMeasurement(m, {
    circuits: m.circuits.map((c) => {
      if (c.id !== circuitId) return c;
      const next = { ...c, ...patch };
      if (patch.type && patch.type !== c.type && patch.displayName === undefined) {
        next.displayName = defaultCircuitDisplayName(patch.type);
      }
      return next;
    }),
  });
}

export function removeElectricalMeasurementCircuit(
  m: ElectricalMeasurement,
  circuitId: string,
): ElectricalMeasurement {
  return touchElectricalMeasurement(m, {
    circuits: renumberCircuitSortOrder(m.circuits.filter((c) => c.id !== circuitId)),
  });
}

export function addElectricalMeasurementRcd(
  m: ElectricalMeasurement,
  deviceType: RcdDeviceType = "P302",
): ElectricalMeasurement {
  const symbol = `RCD${m.rcds.length + 1}`;
  const rcd: ElectricalMeasurementRcd = {
    id: crypto.randomUUID(),
    symbol,
    deviceType,
  };
  return touchElectricalMeasurement(m, { rcds: [...m.rcds, rcd] });
}

export function updateElectricalMeasurementRcd(
  m: ElectricalMeasurement,
  rcdId: string,
  patch: Partial<Pick<ElectricalMeasurementRcd, "symbol" | "deviceType">>,
): ElectricalMeasurement {
  return touchElectricalMeasurement(m, {
    rcds: m.rcds.map((r) => (r.id === rcdId ? { ...r, ...patch } : r)),
  });
}

export function removeElectricalMeasurementRcd(
  m: ElectricalMeasurement,
  rcdId: string,
): ElectricalMeasurement {
  return touchElectricalMeasurement(m, {
    rcds: m.rcds.filter((r) => r.id !== rcdId),
  });
}

export function setElectricalMeasurementSupplyType(
  m: ElectricalMeasurement,
  supplyType: SupplyType,
): ElectricalMeasurement {
  return touchElectricalMeasurement(m, { supplyType });
}
