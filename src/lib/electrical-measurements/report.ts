import type {
  BreakerType,
  CircuitType,
  ElectricalMeasurement,
  ElectricalMeasurementCircuit,
  ElectricalMeasurementRcd,
  RcdDeviceType,
  SupplyType,
} from "@/lib/electrical-measurements/types";

export function localIsoDate(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function createEmptyElectricalMeasurement(jobId: string): ElectricalMeasurement {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    jobId,
    reportNumber: "",
    measurementDate: localIsoDate(),
    technicianName: "",
    meterModel: "",
    meterSerialNumber: "",
    supplyType: "ydy-3x4",
    circuits: [],
    rcds: [],
    createdAt: now,
    updatedAt: now,
  };
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
  };
  return touchElectricalMeasurement(m, { circuits: [...m.circuits, circuit] });
}

export function updateElectricalMeasurementCircuit(
  m: ElectricalMeasurement,
  circuitId: string,
  patch: Partial<Pick<ElectricalMeasurementCircuit, "type" | "breakerType">>,
): ElectricalMeasurement {
  return touchElectricalMeasurement(m, {
    circuits: m.circuits.map((c) => (c.id === circuitId ? { ...c, ...patch } : c)),
  });
}

export function removeElectricalMeasurementCircuit(
  m: ElectricalMeasurement,
  circuitId: string,
): ElectricalMeasurement {
  return touchElectricalMeasurement(m, {
    circuits: m.circuits.filter((c) => c.id !== circuitId),
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
